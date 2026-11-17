from conftest import rows, seed, unlock


def names(page):
    return {k: v for k, v in rows(page, "picker").items() if k.startswith("name-")}


def add(page, text):
    page.fill("#picker-names-input", text)
    page.click("#picker-add")


def home(page, base_url):
    page.goto(f"{base_url}/")
    page.wait_for_selector("#picker-root .picker-wrap")


def spin(page):
    before = page.evaluate("document.getElementById('picker-winner').dataset.spins || '0'")
    page.click("#picker-go")
    page.wait_for_function(f"document.getElementById('picker-winner').dataset.spins !== '{before}'")


def test_paste_list_adds_names(page, context, base_url):
    unlock(context)
    home(page, base_url)
    add(page, "Sam\nJo\nAli")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 3")
    saved = names(page)
    assert sorted(v["name"] for v in saved.values()) == ["Ali", "Jo", "Sam"]
    assert all(v["addedBy"] == "trainer" and v["picks"] == 0 for v in saved.values())
    assert all(k == v["id"] for k, v in saved.items())
    assert page.locator(".picker-name .tally").first.inner_text() == "picked 0× this round"
    add(page, "sam, Priya")  # duplicates are skipped
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 4")


def test_spin_picks_and_tallies(page, context, base_url):
    unlock(context)
    home(page, base_url)
    add(page, "Sam\nJo")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 2")
    spin(page)
    winner = page.inner_text("#picker-winner .winner-name")
    assert winner in ("Sam", "Jo")
    page.wait_for_function("Object.values(JSON.parse(localStorage.getItem('fake-db')).rows.picker).some(r => r.picks === 1)")
    picked = [v for v in names(page).values() if v["picks"] == 1]
    assert [v["name"] for v in picked] == [winner]


def test_fair_mode_cycles(page, context, base_url):
    unlock(context)
    home(page, base_url)
    add(page, "Sam\nJo")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 2")
    spin(page)
    page.wait_for_function("document.querySelectorAll('.picker-name.sat-out').length === 1")
    spin(page)
    page.wait_for_function("Object.values(JSON.parse(localStorage.getItem('fake-db')).rows.picker).filter(r => r.picks === 1).length === 2")
    spin(page)
    page.wait_for_selector(".toast:has-text(\"Everyone's had a turn!\")")


def test_claw_mode(page, context, base_url):
    unlock(context)
    home(page, base_url)
    add(page, "Sam\nJo\nAli")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 3")
    page.click(".mode-btn[data-mode='claw']")
    assert page.locator(".claw-cabinet").is_visible()
    assert page.locator(".claw-cabinet .capsule").count() == 3
    assert page.inner_text("#picker-go").startswith("Grab")
    spin(page)
    assert page.inner_text("#picker-winner .winner-name") in ("Sam", "Jo", "Ali")
    page.reload()
    page.wait_for_selector(".claw-cabinet")


def test_new_round_resets_tally(page, context, base_url):
    unlock(context)
    home(page, base_url)
    add(page, "Sam\nJo")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 2")
    spin(page)
    page.click("#picker-new-round")
    page.wait_for_function("Object.values(JSON.parse(localStorage.getItem('fake-db')).rows.picker).filter(r => r.id).every(r => r.picks === 0 && !r.pickedThisCycle)")


def test_remove_and_clear_names(page, context, base_url):
    unlock(context)
    home(page, base_url)
    add(page, "Sam\nJo")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 2")
    page.locator(".picker-name").first.locator(".picker-remove").click()
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 1")
    page.click("#picker-clear")
    page.click(".confirm-yes")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 0")
    assert names(page) == {}


def test_student_adds_self(context, base_url):
    unlock(context)
    home_page = context.new_page()
    home(home_page, base_url)
    phone = context.new_page()
    phone.set_viewport_size({"width": 390, "height": 844})
    phone.goto(f"{base_url}/class-games/picker.html")
    phone.fill("input[name=name]", "Zed")
    phone.click("#submit")
    phone.wait_for_selector("text=You're on the list")
    saved = list(names(phone).values())
    assert [(v["name"], v["addedBy"]) for v in saved] == [("Zed", "student")]
    home_page.wait_for_selector(".picker-name:has-text('Zed')")
    phone.click("#another")
    phone.fill("input[name=name]", "zed")
    phone.click("#submit")
    phone.wait_for_selector(".error-box:has-text('already on the list')")


def test_spin_locked_without_pin(page, base_url):
    home(page, base_url)
    add(page, "Sam")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 1")
    page.click("#picker-go")
    assert page.locator(".pin-pad").is_visible()


def test_spin_with_no_names(page, context, base_url):
    unlock(context)
    home(page, base_url)
    page.click("#picker-go")
    page.wait_for_selector(".toast:has-text('Add some names first')")


def test_picker_escapes_html(page, base_url):
    home(page, base_url)
    seed(page, "picker", {"name-x": {"id": "name-x", "name": "<img src=x onerror=alert(1)>", "picks": 0,
                                     "pickedThisCycle": False, "addedBy": "student"}})
    page.wait_for_selector(".picker-name")
    assert page.locator("#picker-root img").count() == 0
    assert "<img src=x onerror=alert(1)>" in page.inner_text(".picker-list")


def test_full_screen_keeps_popups_on_top(page, base_url):
    home(page, base_url)
    add(page, "Sam")
    page.wait_for_function("document.querySelectorAll('.picker-name').length === 1")
    page.click("#picker-full")
    page.click("#picker-go")  # trainer is locked, so the PIN pad should appear above the picker
    pad = page.locator(".pin-pad")
    pad.wait_for()
    box = pad.bounding_box()
    on_top = page.evaluate(
        "([x, y]) => !!document.elementFromPoint(x, y)?.closest('.pin-pad')",
        [box["x"] + box["width"] / 2, box["y"] + box["height"] / 2])
    assert on_top
