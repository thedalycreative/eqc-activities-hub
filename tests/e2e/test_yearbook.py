"""The Yearbook Wall: /yearbook-wall/wall.html and /yearbook-wall/build.html

The real Supabase backend is swapped for a tiny localStorage one, so tests never touch class data.
"""
import pytest

FAKE_BACKEND = """
const KEY = 'fake-yearbook';
const listeners = new Set();
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = v => { localStorage.setItem(KEY, JSON.stringify(v)); listeners.forEach(f => f()); };
const key = p => String(p).split('/').pop();
export const yearbookBackend = {
  db: {},
  ref: (_db, path) => path,
  async set(path, value) { if (value === null) return write({}); const all = read(); all[key(path)] = value; write(all); },
  async remove(path) { const all = read(); delete all[key(path)]; write(all); },
  async onValue(path, cb) { const load = () => cb({ val: () => read() }); listeners.add(load); load(); },
};
"""

OLD_CODE = """<!-- EQC tile: Old Timer -->
<div class="tile" data-name="Old Timer" data-slug="old-timer"
     data-bg="#a0c4ff" data-font-title="Bebas Neue" data-font-body="Inter"
     data-header-color="#111111" data-body-color="#1a1a1a" data-bio-size="l" data-bio="Hello &lt;b&gt;there&lt;/b&gt;">
  <h3 class="tile-name">Old Timer</h3>
  <div class="tile-tags">
    <span class="tag" data-category="know" data-bg="#d1e7ff" data-border="#2b6cb0" data-color="#1a3a5e">✓ HTML</span>
  </div>
  <div class="tile-facts">
    <div class="fact" data-truth="true">One</div>
    <div class="fact" data-truth="false">Two</div>
    <div class="fact" data-truth="true">Three</div>
  </div>
</div>"""


@pytest.fixture
def yb(context):
    context.route("**/yearbook-backend.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=FAKE_BACKEND))
    return context


def fill_tile(page, name="Alex"):
    page.fill("#f_name", name)
    page.fill("#f_bio", "I like pizza")
    for i, (text, truth) in enumerate([("I have a dog", "true"), ("I can juggle", "false"), ("I love HTML", "true")], 1):
        page.fill(f"#f_fact{i}", text)
        page.click(f".truth-toggle[data-fact='{i}'] [data-val='{truth}']")


def code(page):
    return page.input_value("#codeBody")


def test_landing_page_goes_to_the_wall(page, yb, base_url):
    page.goto(f"{base_url}/yearbook-wall/")
    page.wait_for_url("**/yearbook-wall/wall.html")
    page.goto(f"{base_url}/")
    assert page.locator("a.tile[href='/yearbook-wall/wall.html']").count() == 1


@pytest.mark.parametrize("path, current", [("wall.html", "🧱 The wall"), ("build.html", "✏️ Build your tile")])
def test_hub_nav_bar(page, yb, context, base_url, path, current):
    page.goto(f"{base_url}/yearbook-wall/{path}")
    nav = page.locator("nav.hub-nav")
    assert nav.count() == 1
    assert nav.locator(".hub-nav-back").evaluate("a => a.href") == f"{base_url}/"
    assert nav.locator("[aria-current='page']").inner_text() == current
    assert nav.evaluate("n => n.getBoundingClientRect().top") == 0  # flush with the top of the page
    assert nav.evaluate("n => getComputedStyle(n).backgroundImage").startswith("radial-gradient")
    # The rest of the page keeps its own plain look.
    assert page.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(255, 255, 255)"
    assert "Inter" in page.evaluate("getComputedStyle(document.body).fontFamily")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.wait_for_timeout(300)
    assert context.console_errors == []


def test_code_panel_is_plain_html(page, yb, base_url):
    page.goto(f"{base_url}/yearbook-wall/build.html")
    fill_tile(page)
    page.fill("#tagInput", "JavaScript")
    page.click("#tagAddBtn")
    c = code(page)
    assert "data-" not in c
    assert '<div class="tile" style="background-color: #f4d35e; color: #1a1a1a;">' in c
    assert '<h3 style="font-family: Inter, sans-serif; color: #111111;">Alex</h3>' in c
    assert '<p style="font-family: Inter, sans-serif; font-size: 15px;">I like pizza</p>' in c
    assert '<span style="background-color: #e3efd9; color: #1e4a28; border: 2px solid #4a9956;">📚 JavaScript</span>' in c
    assert '<li class="lie">I can juggle</li>' in c
    assert c.count('<li class="truth">') == 2


def test_editing_the_code_updates_the_preview_and_form(page, yb, base_url):
    page.goto(f"{base_url}/yearbook-wall/build.html")
    fill_tile(page)
    edited = (code(page)
              .replace("background-color: #f4d35e", "background-color: #ff5733")
              .replace("font-family: Inter, sans-serif; color: #111111;", "font-family: Arial, sans-serif; font-size: 24px; color: #ffffff;")
              .replace('<li class="lie">I can juggle</li>', '<li class="truth">I can juggle</li>')
              .replace('<li class="truth">I have a dog</li>', '<li class="lie">I have a dog</li>')
              .replace("font-size: 15px;", "font-size: 30px;"))
    page.fill("#codeBody", edited)
    page.wait_for_function("getComputedStyle(document.getElementById('previewTile')).backgroundColor === 'rgb(255, 87, 51)'")
    assert page.input_value("#f_bg_hex") == "#ff5733"
    assert "Arial" in page.eval_on_selector("#prevName", "el => el.style.fontFamily")
    assert page.input_value("#f_header_hex") == "#ffffff"
    assert page.eval_on_selector("#prevBio", "el => el.style.fontSize") == "30px"
    assert page.locator(".truth-toggle[data-fact='1'] [data-val='false'].active").count() == 1
    assert page.locator(".truth-toggle[data-fact='2'] [data-val='true'].active").count() == 1
    assert page.input_value("#codeBody") == edited  # your typing is never overwritten
    page.fill("#codeBody", edited.replace("background-color: #ff5733", "background-color: hotpink"))  # colour names work too
    page.wait_for_function("document.getElementById('f_bg_hex').value === '#ff69b4'")


def test_submit_shows_on_wall_and_edit_uses_plain_html(page, yb, base_url):
    page.goto(f"{base_url}/yearbook-wall/build.html")
    fill_tile(page, "Sam")
    page.click("#submitBtn")
    page.wait_for_selector(".submit-status.success")
    page.goto(f"{base_url}/yearbook-wall/wall.html")
    tile = page.locator(".wall .tile").first
    tile.wait_for()
    assert "Sam" in tile.inner_text()
    tile.hover()
    tile.locator(".tile-ctrl.edit").click()
    edit = page.input_value("#editArea")
    assert "data-" not in edit and 'style="background-color: #f4d35e;' in edit
    page.fill("#editArea", edit.replace("#f4d35e", "#bdb2ff"))
    page.click("#editSaveBtn")
    page.wait_for_function("getComputedStyle(document.querySelector('.wall .tile')).backgroundColor === 'rgb(189, 178, 255)'")


def test_paste_reads_old_code_and_blocks_unsafe_code(page, yb, base_url):
    page.goto(f"{base_url}/yearbook-wall/wall.html")
    page.click("#addManualBtn")
    page.fill("#pasteArea", OLD_CODE)
    page.click("#pasteAddBtn")
    tile = page.locator(".wall .tile", has_text="Old Timer")
    tile.wait_for()
    assert tile.evaluate("el => getComputedStyle(el).backgroundColor") == "rgb(160, 196, 255)"
    assert tile.locator(".tile-bio b").inner_text() == "there"
    assert "HTML" in tile.locator(".tile-tag").inner_text()

    sneaky = """<div class="tile" style="background-color: red">
      <img src="x" onerror="window.__pwned = 1">
      <h3 style="font-family: x'); color: blue">Sneaky</h3>
      <ul><li class="truth">a</li><li class="lie">b</li><li class="truth">c</li></ul>
    </div>"""
    page.click("#addManualBtn")
    page.fill("#pasteArea", sneaky)
    page.click("#pasteAddBtn")
    bad = page.locator(".wall .tile", has_text="Sneaky")
    bad.wait_for()
    page.wait_for_timeout(300)
    assert page.evaluate("window.__pwned") is None
    assert bad.locator(".tile-avatar img").count() == 0  # "x" isn't a real photo, so no picture
    assert "Inter" in bad.locator(".tile-name").evaluate("el => el.style.fontFamily")
    assert bad.evaluate("el => getComputedStyle(el).backgroundColor") == "rgb(255, 0, 0)"
