import json
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
GAME_PAGES = ["/", "/quiz.html", "/class-games/emoji.html", "/class-games/truths.html",
              "/class-games/battle.html?code=ABCD", "/class-games/picker.html"]


def test_removed_pages_gone():
    for path in ["dashboard.html", "game-dashboard.html", "play.html", "slot-pick/index.html", "class-games/prompts.html"]:
        assert not (ROOT / path).exists(), path
    cfg = json.loads((ROOT / "vercel.json").read_text())
    redirects = {r["source"]: (r["destination"], r["permanent"]) for r in cfg["redirects"]}
    expected = {
        "/dashboard.html": "/", "/game-dashboard.html": "/", "/play.html": "/",
        "/slot-pick/": "/#picker", "/slot-pick/:path*": "/#picker",
        "/class-games/prompts.html": "/class-games/battle.html",
        "/yearbook-wall/wall/": "/yearbook-wall/wall.html", "/yearbook-wall/build/": "/yearbook-wall/build.html",
        "/flexbox-exercise/": "/flexbox-exercise/flexbox_starter.html",
    }
    for source, dest in expected.items():
        assert redirects.get(source) == (dest, False), source
    assert cfg["trailingSlash"] is True


def test_no_links_to_removed_pages():
    out = subprocess.run(
        ["grep", "-rlE", r"dashboard\.html|game-dashboard|play\.html|slot-pick", "--include=*.html", "--include=*.js", "."],
        cwd=ROOT, capture_output=True, text=True).stdout.split()
    allowed = {"./class-games/index.html", "./class-games/score.html"}
    offenders = [f for f in out if not f.startswith(("./tests/", "./docs/", "./.superpowers/")) and f not in allowed]
    assert offenders == []


@pytest.mark.parametrize("path", GAME_PAGES)
def test_every_game_page_uses_hub_style(page, base_url, path):
    page.goto(f"{base_url}{path}")
    assert page.locator("link[href$='assets/hub.css']").count() == 1
    font = page.evaluate("getComputedStyle(document.body).fontFamily")
    assert "Baloo 2" in font
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    assert bg not in ("rgb(255, 255, 255)", "rgba(0, 0, 0, 0)") or "gradient" in page.evaluate("getComputedStyle(document.body).backgroundImage")


@pytest.mark.parametrize("path", GAME_PAGES)
def test_no_console_errors(page, context, base_url, path):
    page.goto(f"{base_url}{path}")
    page.wait_for_timeout(600)
    assert context.console_errors == []


CLONES = ["apple", "nib-health", "skywings", "forbidden-forrest"]
GITHUB_TREE = "https://github.com/thedalycreative/eqc-activities-hub/tree/main/bootstrap-clone-{}"


def test_clone_sites_are_not_deployed():
    """They copy real brands (logos, titles, log-in buttons), which got the site flagged as phishing."""
    ignored = (ROOT / ".vercelignore").read_text().split()
    cfg = json.loads((ROOT / "vercel.json").read_text())
    redirects = {r["source"]: r["destination"] for r in cfg["redirects"]}
    for name in CLONES:
        assert f"bootstrap-clone-{name}" in ignored, name
        assert redirects.get(f"/bootstrap-clone-{name}") == GITHUB_TREE.format(name)
        assert redirects.get(f"/bootstrap-clone-{name}/:path*") == GITHUB_TREE.format(name)


def test_clone_tiles_point_to_github(page, base_url):
    page.goto(f"{base_url}/")
    hrefs = page.eval_on_selector_all("#clones .tile", "els => els.map(e => e.href)")
    assert hrefs == [GITHUB_TREE.format(n) for n in CLONES]
    assert page.locator("#clones a[href$='#bootstrap-clone-sites-get-one-on-your-computer']").count() == 1
    assert page.locator("#clones .tile .external").count() == 4
