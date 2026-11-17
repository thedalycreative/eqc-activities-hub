from conftest import rows


def open_page(page, base_url):
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(f"{base_url}/class-games/emoji.html")


def fill_basics(page):
    page.fill("input[name=name]", "Sam")
    page.select_option("select[name=category]", "Movie")
    page.fill("input[name=answer]", "The Lion King")


def add_emojis(page, n):
    page.click("#add-emoji")
    buttons = page.locator("emoji-picker").locator("button.emoji[role=menuitem]")
    buttons.first.wait_for()
    for i in range(n):
        buttons.nth(i).click()
    page.click("#sheet-done")


def test_clue_is_not_typeable(page, base_url):
    open_page(page, base_url)
    clue = page.locator("#clue")
    assert clue.evaluate("el => el.tagName") not in ("INPUT", "TEXTAREA")
    assert clue.get_attribute("contenteditable") is None
    assert page.locator("input[name=clue], textarea[name=clue]").count() == 0


def test_categories(page, base_url):
    open_page(page, base_url)
    options = page.locator("select[name=category] option").all_inner_texts()
    assert options == ["Movie", "Book", "TV show", "Song", "Word", "Place", "Other"]


def test_pick_emojis_and_submit(page, base_url):
    open_page(page, base_url)
    fill_basics(page)
    add_emojis(page, 2)
    assert page.locator("#clue .chip").count() == 2
    page.click("#back-emoji")
    assert page.locator("#clue .chip").count() == 1
    add_emojis(page, 1)
    assert page.locator("#clue .chip").count() == 2
    page.click("#submit")
    page.wait_for_selector("text=On the noticeboard!")
    saved = list(rows(page, "emoji").values())
    assert len(saved) == 1
    assert saved[0]["answer"] == "The Lion King"
    assert saved[0]["contributor"] == "Sam"
    assert saved[0]["category"] == "Movie"
    assert saved[0]["revealed"] is False
    assert len(saved[0]["clue"]) >= 2
    page.click("#again")
    assert page.locator("#clue .chip").count() == 0
    assert page.input_value("input[name=answer]") == ""
    assert page.input_value("input[name=name]") == "Sam"  # name is kept for the next one


def test_submit_requires_one_emoji(page, base_url):
    open_page(page, base_url)
    fill_basics(page)
    page.click("#submit")
    assert "Add at least one emoji" in page.inner_text(".error-box")
    assert rows(page, "emoji") == {}


def test_max_twelve_emojis(page, base_url):
    open_page(page, base_url)
    add_emojis(page, 13)
    assert page.locator("#clue .chip").count() == 12


def test_emoji_double_submit_creates_one_card(page, base_url):
    open_page(page, base_url)
    fill_basics(page)
    add_emojis(page, 1)
    page.dblclick("#submit")
    page.wait_for_selector("text=On the noticeboard!")
    page.wait_for_timeout(300)
    assert len(rows(page, "emoji")) == 1


def test_emoji_page_has_no_console_errors(page, context, base_url):
    open_page(page, base_url)
    add_emojis(page, 1)
    assert context.console_errors == []
