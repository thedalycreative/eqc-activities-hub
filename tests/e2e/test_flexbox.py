"""The Flexbox Practice page: /flexbox-exercise/flexbox_starter.html"""

URL = "/flexbox-exercise/flexbox_starter.html"


def open_page(page, base_url):
    page.goto(f"{base_url}{URL}")
    page.wait_for_selector("#park-cars .park-car")


def css(page, selector, prop):
    return page.eval_on_selector(selector, f"el => getComputedStyle(el).getPropertyValue('{prop}')")


def pick(page, root, prop, value):
    page.click(f"{root} .chip[data-prop='{prop}'][data-value='{value}']")


def test_hub_look_back_link_and_no_errors(page, context, base_url):
    open_page(page, base_url)
    assert page.locator("link[href$='assets/hub.css']").count() == 1
    assert "Baloo 2" in page.evaluate("getComputedStyle(document.body).fontFamily")
    back = page.locator(".fl-toolbar a", has_text="Activities Hub")
    assert back.evaluate("a => a.href") == f"{base_url}/"
    assert page.locator(".fl-toolbar .mute-btn").count() == 1
    page.wait_for_timeout(300)
    assert context.console_errors == []


def test_exercises_one_and_two_start_without_flexbox(page, base_url):
    """They're for live typing: students see the broken layout first."""
    open_page(page, base_url)
    assert css(page, ".ex1-container", "display") == "block"
    assert css(page, ".navbar", "display") == "block"
    style = page.inner_text("head style")
    assert "👇 type here" in style
    assert style.count("display: flex") == 1  # only exercise 3's .cards


def test_exercise_three_dropdowns_still_work(page, base_url):
    open_page(page, base_url)
    assert page.locator(".flex-card").count() == 5
    assert page.locator(".cards .card").count() == 0  # renamed so hub.css's .card can't break the row
    page.select_option("#justify", "center")
    assert css(page, ".cards", "justify-content") == "center"
    page.click("#resetFlex")
    assert css(page, ".cards", "justify-content") == "flex-start"


def test_playground_moves_boxes_and_writes_the_css(page, base_url):
    open_page(page, base_url)
    pick(page, "#pg-props", "justify-content", "space-between")
    assert css(page, "#pg-container", "justify-content") == "space-between"
    assert "justify-content: space-between;" in page.inner_text("#pg-code")
    assert page.inner_text("#pg-code .hl") == "space-between"
    assert "equal gaps" in page.inner_text("#pg-explain")
    assert "main axis →" in page.inner_text("#pg-axis-x")
    pick(page, "#pg-props", "flex-direction", "column")
    assert "main axis ↓" in page.inner_text("#pg-axis-y")
    page.click("#pg-more")
    assert page.locator(".pg-box").count() == 6
    page.click("#pg-reset")
    assert page.locator(".pg-box").count() == 5
    assert css(page, "#pg-container", "flex-direction") == "row"


def test_park_the_cars_level_one(page, base_url):
    open_page(page, base_url)
    assert page.inner_text("#park-title") == "Level 1 of 10"
    pick(page, "#park-props", "justify-content", "flex-end")
    assert page.locator("#park-win").is_hidden()
    assert "Not parked yet" in page.inner_text("#park-status")
    pick(page, "#park-props", "justify-content", "center")
    page.wait_for_selector("#park-win:not([hidden])")
    assert page.locator(".park-level.done").count() == 1
    page.click("#park-next")
    assert page.inner_text("#park-title") == "Level 2 of 10"


def test_every_level_can_be_won_and_progress_is_saved(page, base_url):
    open_page(page, base_url)
    targets = page.evaluate("import('/flexbox-exercise/flex-logic.js').then(m => m.LEVELS.map(l => l.target))")
    for i, target in enumerate(targets):
        page.click(f".park-level[data-level='{i}']")
        for prop, value in target.items():
            pick(page, "#park-props", prop, value)
        page.wait_for_selector("#park-win:not([hidden])")
    assert "boss" in page.inner_text("#park-win-text")
    page.reload()
    page.wait_for_selector("#park-cars .park-car")
    assert page.locator(".park-level.done").count() == 10
    assert page.inner_text("#park-title") == "Level 10 of 10"


def test_resource_links(page, base_url):
    open_page(page, base_url)
    hrefs = page.eval_on_selector_all(".fl-tiles a", "els => els.map(e => e.href)")
    assert "https://flexboxfroggy.com/" in hrefs
    assert "https://flexbox.malven.co/" in hrefs
