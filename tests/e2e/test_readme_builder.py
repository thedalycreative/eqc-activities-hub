"""The README Builder page: /readme-builder/"""

URL = "/readme-builder/"
SECTION_COUNT = 17


def open_page(page, base_url):
    page.goto(f"{base_url}{URL}")
    page.wait_for_function("document.getElementById('rb-prompt').textContent.length > 0")


def prompt(page):
    return page.inner_text("#rb-prompt")


def test_uses_hub_style_without_errors(page, context, base_url):
    open_page(page, base_url)
    assert page.locator("link[href$='assets/hub.css']").count() == 1
    assert "Baloo 2" in page.evaluate("getComputedStyle(document.body).fontFamily")
    page.wait_for_timeout(300)
    assert context.console_errors == []


def test_checklist_and_cards_are_drawn(page, base_url):
    open_page(page, base_url)
    assert page.locator(".rb-check").count() == SECTION_COUNT
    assert page.locator("#rb-must .rb-card").count() == 5
    assert page.locator("#rb-must .rb-card").count() + page.locator("#rb-level .rb-card").count() == SECTION_COUNT
    assert page.inner_text("#rb-count") == f"{SECTION_COUNT} of {SECTION_COUNT} sections"
    links = page.eval_on_selector_all(".rb-see", "els => els.map(e => e.href)")
    assert all(h.startswith("https://github.com/thedalycreative/eqc-activities-hub/") for h in links)

REFERENCES = {
    "https://github.com/mhucka/readmine": "github.com/mhucka/readmine",
    "https://github.com/othneildrew/Best-README-Template": "github.com/othneildrew/Best-README-Template",
    "https://github.com/matiassingers/awesome-readme": "github.com/matiassingers/awesome-readme",
    "https://www.makeareadme.com/": "makeareadme.com",
    "https://readme.so/": "readme.so",
    "https://github.com/hackergrrl/art-of-readme": "github.com/hackergrrl/art-of-readme",
}


def test_reference_readmes_are_listed_with_their_addresses(page, base_url):
    open_page(page, base_url)
    assert page.inner_text("#g-examples") == "③ Great reference READMEs"
    for href, shown in REFERENCES.items():
        tile = page.locator(f".rb-examples a[href='{href}']")
        assert tile.count() == 1, href
        assert tile.locator(".rb-url").inner_text() == shown
    assert page.locator(".rb-examples .rb-url").count() == 8


def test_where_choice_changes_prompt_and_steps(page, base_url):
    open_page(page, base_url)
    assert "You’re in my project folder in VS Code" in prompt(page)
    assert page.locator(".rb-tip").is_hidden()
    page.click("text=AI chat website")
    assert "I’ll attach or paste my project files" in prompt(page)
    assert page.locator(".rb-tip").is_visible()
    assert page.locator(".rb-next[data-where='chat']").is_visible()
    assert page.locator(".rb-next[data-where='agent']").is_hidden()
    page.fill("input[name=github]", "https://github.com/alex/sky")
    assert "My project is on GitHub: https://github.com/alex/sky" in prompt(page)


def test_checklist_and_vibe_change_prompt(page, base_url):
    open_page(page, base_url)
    page.click("#rb-essentials")
    assert page.inner_text("#rb-count") == f"5 of {SECTION_COUNT} sections"
    assert "GIFs:" not in prompt(page)
    page.click(".rb-check:has(input[value=gifs])")
    assert "GIFs:" in prompt(page)
    page.click(".rb-check:has(input[value=title])", force=True)  # locked: can't be unticked
    assert page.is_checked("input[value=title]")
    assert "1. Title and one-line summary" in prompt(page)
    page.click("text=Clean & simple")
    assert "blob/main/README.md" in prompt(page)
    page.click("#rb-all")
    assert page.inner_text("#rb-count") == f"{SECTION_COUNT} of {SECTION_COUNT} sections"


def test_details_flow_into_prompt_and_are_remembered(page, base_url):
    open_page(page, base_url)
    page.fill("input[name=name]", "Skywings <Resorts>")
    page.fill("input[name=author]", "Alex")
    page.click("text=AI chat website")
    page.click("#rb-essentials")
    assert "- Name: Skywings <Resorts>" in prompt(page)  # shown as text, not HTML
    page.reload()
    page.wait_for_function("document.getElementById('rb-prompt').textContent.length > 0")
    assert page.input_value("input[name=name]") == "Skywings <Resorts>"
    assert page.is_checked("input[name=where][value=chat]")
    assert page.inner_text("#rb-count") == f"5 of {SECTION_COUNT} sections"


def test_copy_puts_prompt_on_clipboard(page, context, base_url):
    context.grant_permissions(["clipboard-read", "clipboard-write"], origin=base_url)
    open_page(page, base_url)
    page.fill("input[name=name]", "Copy Test")
    page.click("#rb-copy")
    page.wait_for_selector(".toast.good")
    assert page.evaluate("navigator.clipboard.readText()") == prompt(page)
    assert "Copy Test" in page.evaluate("navigator.clipboard.readText()")


def test_hub_tile_links_here(page, base_url):
    page.goto(f"{base_url}/")
    tile = page.locator("a.tile[href='/readme-builder/']")
    assert tile.count() == 1
    assert "README Builder" in tile.inner_text()
