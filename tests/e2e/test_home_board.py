from conftest import rows, seed, unlock

EMOJI = {
    "emoji-1": {"contributor": "Sam", "category": "Movie", "answer": "The Lion King",
                "clue": "🦁👑", "submittedAt": 1000, "revealed": False},
}
TRUTHS = {
    "truths-1": {"name": "Jo", "lieSource": "ai", "submittedAt": 2000, "revealed": False,
                 "items": [{"text": "I can juggle", "isLie": False},
                           {"text": "I once lived in Darwin", "isLie": True},
                           {"text": "I have a dog", "isLie": False}]},
}


def open_home(page, base_url):
    page.goto(f"{base_url}/")
    seed(page, "emoji", EMOJI)
    seed(page, "truths", TRUTHS)
    page.wait_for_function("document.querySelectorAll('#noticeboard .nb-card').length === 2")


def tap_pin(page):
    for d in "2468":
        page.locator(f".pin-pad [data-digit='{d}']").click()


def test_board_shows_seeded_cards(page, base_url):
    open_home(page, base_url)
    cards = page.locator("#noticeboard .nb-card")
    assert cards.count() == 2
    emoji = page.locator(".nb-card[data-kind='emoji']")
    assert "🦁👑" in emoji.inner_text()
    assert "The Lion King" not in page.inner_text("#noticeboard")
    assert "Darwin" in page.locator(".nb-card[data-kind='truths']").inner_text()


def test_newest_card_first(page, base_url):
    open_home(page, base_url)
    assert page.locator("#noticeboard .nb-card").first.get_attribute("data-kind") == "truths"


def test_filter_chips(page, base_url):
    open_home(page, base_url)
    page.click(".nb-filter[data-filter='emoji']")
    assert page.locator("#noticeboard .nb-card:visible").count() == 1
    page.click(".nb-filter[data-filter='truths']")
    assert page.locator("#noticeboard .nb-card:visible").get_attribute("data-kind") == "truths"
    page.click(".nb-filter[data-filter='all']")
    assert page.locator("#noticeboard .nb-card:visible").count() == 2


def test_reveal_needs_pin_then_flips(page, base_url):
    open_home(page, base_url)
    page.click(".nb-card[data-kind='emoji']")
    page.click(".spotlight .reveal-btn")
    assert page.locator(".pin-pad").is_visible()
    tap_pin(page)
    page.wait_for_selector(".spotlight .nb-answer:has-text('The Lion King')")
    page.wait_for_function("JSON.parse(localStorage.getItem('fake-db')).rows.emoji['emoji-1'].revealed === true")
    page.keyboard.press("Escape")
    # The card on the board stays revealed too.
    assert "The Lion King" in page.locator(".nb-card[data-kind='emoji']").inner_text()

    page.click(".nb-card[data-kind='truths']")
    page.click(".spotlight .reveal-btn")
    page.wait_for_selector(".spotlight .stamp.lie")
    stamps = page.locator(".spotlight .stamp")
    assert sorted(stamps.all_inner_texts()) == ["LIE!", "TRUE", "TRUE"]
    lie_item = page.locator(".spotlight .nb-item:has(.stamp.lie)")
    assert "Darwin" in lie_item.inner_text()


def test_clear_board(page, context, base_url):
    unlock(context)
    open_home(page, base_url)
    page.click("#nb-clear")
    page.click(".confirm-yes")
    page.wait_for_selector("#noticeboard .nb-empty")
    assert rows(page, "emoji") == {}
    assert rows(page, "truths") == {}


def test_delete_card(page, context, base_url):
    unlock(context)
    open_home(page, base_url)
    page.locator(".nb-card[data-kind='emoji'] .nb-delete").click()
    page.wait_for_function("document.querySelectorAll('#noticeboard .nb-card').length === 1")
    assert rows(page, "emoji") == {}


def test_board_escapes_html(page, base_url):
    page.goto(f"{base_url}/")
    seed(page, "emoji", {"emoji-x": {"contributor": "<img src=x onerror=alert(1)>", "category": "Movie",
                                      "answer": "<b>bold</b>", "clue": "😀", "submittedAt": 5, "revealed": True}})
    page.wait_for_selector("#noticeboard .nb-card")
    assert page.locator("#noticeboard img").count() == 0
    assert page.locator("#noticeboard b").count() == 0
    assert "<img src=x onerror=alert(1)>" in page.inner_text("#noticeboard")


def test_new_card_appears_live(page, base_url):
    open_home(page, base_url)
    seed(page, "emoji", {"emoji-2": {"contributor": "Ali", "category": "Song", "answer": "Shake It Off",
                                      "clue": "🫨📴", "submittedAt": 9000, "revealed": False}})
    page.wait_for_function("document.querySelectorAll('#noticeboard .nb-card').length === 3", timeout=2000)
    assert "🫨📴" in page.locator("#noticeboard .nb-card").first.inner_text()


def test_join_qr_modal(page, base_url):
    page.goto(f"{base_url}/")
    page.click("[data-game='emoji']")
    modal = page.locator(".modal")
    assert modal.locator("svg").count() >= 1
    assert "localhost:8765/class-games/emoji.html" in modal.inner_text()
    assert "Entries appear on the noticeboard below" in modal.inner_text()


def test_home_has_no_console_errors(page, context, base_url):
    open_home(page, base_url)
    assert context.console_errors == []
