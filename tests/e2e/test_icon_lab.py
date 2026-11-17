"""The Icon Lab page: /icon-lab/"""
import pytest

URL = "/icon-lab/"

# Finds the right answer for the icon on screen, using the page's own icon lists.
ANSWER = """async () => {
  const m = await import('/icon-lab/icon-logic.js');
  const icon = document.querySelector('#game-icon i');
  const item = [...m.UI_ICONS, ...m.DEV_EASY, ...m.DEV_HARD].find(i => icon.classList.contains(i.icon));
  return [...document.querySelectorAll('.game-opt')].findIndex(b => b.lastChild.textContent === item.label);
}"""


@pytest.fixture
def lab(page, context, base_url):
    # No CDN in tests: the icon fonts just don't draw, everything else still works.
    context.route("https://cdn.jsdelivr.net/**", lambda r: r.abort())
    page.goto(f"{base_url}{URL}")
    page.wait_for_selector(".game-level")
    return page


def play_round(page, right=True):
    k = page.evaluate(ANSWER)
    page.click(f".game-opt[data-k='{k if right else (k + 1) % 4}']")
    page.wait_for_selector("#game-next")


def test_hub_look_back_link_and_no_errors(lab, context, base_url):
    assert lab.locator("link[href$='assets/hub.css']").count() == 1
    assert lab.locator(".il-toolbar a", has_text="Activities Hub").evaluate("a => a.href") == f"{base_url}/"
    for cdn in ["bootstrap-icons@1.13.2", "devicon@2.18.0"]:
        link = lab.locator(f"link[href*='{cdn}']")
        assert link.get_attribute("integrity").startswith("sha384-")
        assert link.get_attribute("crossorigin") == "anonymous"
    lab.wait_for_timeout(300)
    assert context.console_errors == []


def test_tinkerer_checks_size_contrast_and_label(lab):
    lab.fill("#tk-size", "12")
    lab.dispatch_event("#tk-size", "input")
    assert "Too small" in lab.inner_text("#tk-target")
    lab.click(".tk-swatch[aria-label='Lime']")
    assert "Too faint" in lab.inner_text("#tk-contrast")
    assert 'aria-label="Like"' in lab.inner_text("#tk-code")
    lab.fill("#tk-size", "48")
    lab.dispatch_event("#tk-size", "input")
    lab.click(".tk-swatch[aria-label='Purple']")
    assert "Great" in lab.inner_text("#tk-target")
    assert "Passes" in lab.inner_text("#tk-contrast")
    lab.check("#tk-label")
    code = lab.inner_text("#tk-code")
    assert "aria-label" not in code and "Like\n</button>" in code
    assert lab.get_attribute("#tk-button", "aria-label") is None
    lab.click("#tk-icons .chip:has-text('Delete')")
    assert "bi-trash" in lab.inner_text("#tk-code")


def test_screen_reader_demo(lab):
    rows = lab.locator(".sr-row")
    assert rows.count() == 5
    assert lab.locator(".sr-row.bad").count() == 2
    assert rows.first.locator(".sr-hears q").inner_text() == "button"
    rows.nth(1).locator("button").click()
    lab.wait_for_selector(".toast:has-text('Search, button')")


def test_easy_game_all_right_saves_best(lab):
    lab.click(".game-level[data-diff='easy']")
    for i in range(10):
        assert lab.inner_text("#game-round") == f"{i + 1} / 10"
        assert lab.locator("#game-icon i.bi").count() == 1  # easy = app icons only
        play_round(lab)
        assert "✅" in lab.inner_text("#game-feedback")
        assert "aria-label=" in lab.inner_text("#game-feedback pre")
        lab.click("#game-next")
    assert lab.inner_text("#game-final") == "10 / 10 on Easy"
    assert lab.inner_text("#game-stars") == "⭐⭐⭐"
    assert lab.locator("#game-missed li").count() == 0
    lab.click("#game-change")
    assert "Best: 10/10" in lab.inner_text(".game-level[data-diff='easy']")


def test_wrong_answers_are_shown_and_listed(lab):
    lab.click(".game-level[data-diff='medium']")
    dev_rounds = 0
    for _ in range(10):
        dev_rounds += lab.locator("#game-icon i[class*='devicon-'].colored").count()
        play_round(lab, right=False)
        assert lab.locator(".game-opt.wrong").count() == 1
        assert lab.locator(".game-opt.right").count() == 1
        assert lab.inner_text("#game-streak") == "0"
        lab.click("#game-next")
    assert dev_rounds == 3
    assert lab.inner_text("#game-final") == "0 / 10 on Medium"
    assert lab.locator("#game-missed li").count() == 10


def test_hard_mode_has_more_dev_logos_without_colour(lab):
    lab.click(".game-level[data-diff='hard']")
    dev_rounds = 0
    for _ in range(10):
        icon = lab.locator("#game-icon i")
        if "devicon-" in icon.get_attribute("class"):
            dev_rounds += 1
            assert "colored" not in icon.get_attribute("class")
        play_round(lab)
        lab.keyboard.press("Enter")
    assert dev_rounds == 6
    assert lab.inner_text("#game-final") == "10 / 10 on Hard"


def test_keyboard_numbers_answer(lab):
    lab.click(".game-level[data-diff='easy']")
    lab.keyboard.press("3")
    lab.wait_for_selector("#game-next")
    assert lab.locator(".game-opt:disabled").count() == 4
    lab.keyboard.press("2")  # already answered: ignored
    assert lab.locator(".game-opt.wrong").count() <= 1


def test_hub_tiles_link_to_new_pages(page, base_url):
    page.goto(f"{base_url}/")
    assert page.locator("a.tile[href='/icon-lab/']").count() == 1
    assert page.locator("a.tile[href='/flexbox-exercise/flexbox_starter.html']").count() == 1
