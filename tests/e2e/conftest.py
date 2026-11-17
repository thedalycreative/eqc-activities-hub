"""Shared browser-test fixtures.

Every page is served from the repo root by a tiny HTTP server. The real
Supabase store is swapped for tests/e2e/fake-store.js, and /api/ai is answered
by whatever the test puts in the ai_mock dict.
"""
import functools
import http.server
import json
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = 8765
BASE = f"http://localhost:{PORT}"
FAKE_STORE = (Path(__file__).parent / "fake-store.js").read_text()
PIN_HASH = "a1fb4e703a9ef1fa4936801721ff285a97ac85330856674412e054892afe6972"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="session")
def base_url():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("localhost", PORT), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield BASE
    server.shutdown()


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


@pytest.fixture
def ai_mock():
    return {"status": 200, "body": {"text": "I once lived in Darwin."}, "calls": []}


@pytest.fixture
def motion():
    """Tests run with reduced motion so animations finish instantly."""
    return "reduce"


@pytest.fixture
def context(browser, base_url, ai_mock, motion):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion=motion)
    ctx.set_default_timeout(6000)
    ctx.console_errors = []

    def fake_store(route):
        route.fulfill(status=200, content_type="application/javascript", body=FAKE_STORE)

    def ai(route):
        try:
            ai_mock["calls"].append(json.loads(route.request.post_data or "{}"))
        except ValueError:
            ai_mock["calls"].append({})
        route.fulfill(status=ai_mock["status"], content_type="application/json", body=json.dumps(ai_mock["body"]))

    ctx.route("**/activity-store.js", fake_store)
    ctx.route("**/api/ai", ai)
    ctx.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("https://fonts.gstatic.com/**", lambda r: r.abort())

    def watch(page):
        page.on("console", lambda m: m.type == "error" and "net::ERR_FAILED" not in m.text and ctx.console_errors.append(m.text))
        page.on("pageerror", lambda e: ctx.console_errors.append(str(e)))

    ctx.on("page", watch)
    yield ctx
    ctx.close()


@pytest.fixture
def page(context):
    return context.new_page()


def unlock(context):
    """Pretend the trainer already entered the PIN on this computer."""
    context.add_init_script(f"try {{ localStorage.setItem('eqc-trainer', '{PIN_HASH}') }} catch (e) {{}}")


def seed(page, activity, items):
    """Put rows straight into the fake database. The page must already be on the site."""
    page.evaluate(
        """([activity, items]) => {
            const db = JSON.parse(localStorage.getItem('fake-db') || '{"rows":{},"sessions":{},"players":{}}');
            db.rows[activity] = { ...(db.rows[activity] || {}), ...items };
            localStorage.setItem('fake-db', JSON.stringify(db));
            window.dispatchEvent(new StorageEvent('storage', { key: 'fake-db' }));
        }""",
        [activity, items],
    )


def rows(page, activity):
    return page.evaluate(
        "a => (JSON.parse(localStorage.getItem('fake-db') || '{\"rows\":{}}').rows[a] || {})", activity
    )


def db(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('fake-db') || '{\"rows\":{},\"sessions\":{},\"players\":{}}')")
