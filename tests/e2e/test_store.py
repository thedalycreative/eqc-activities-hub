"""Tests for the real activity-store.js, with Supabase swapped for tests/e2e/fake-supabase.js."""
from pathlib import Path

import pytest

FAKE_SB = (Path(__file__).parent / "fake-supabase.js").read_text()


@pytest.fixture
def store_page(browser, base_url):
    ctx = browser.new_context()
    ctx.set_default_timeout(4000)
    ctx.route("https://esm.sh/@supabase/supabase-js@2", lambda r: r.fulfill(body=FAKE_SB, content_type="application/javascript"))
    page = ctx.new_page()
    page.add_init_script("""window.__sb = { tables: { activity_items: [
        { activity: 'emoji', item_id: 'a', payload: { n: 1 } } ], game_sessions: [], game_players: [] },
        channels: [], delays: [], selects: 0 };""")
    page.goto(f"{base_url}/tests/e2e/fixtures/store.html")
    page.wait_for_function("window.ready && window.got.length >= 1")
    yield page
    ctx.close()


def last(page):
    return page.evaluate("window.got[window.got.length - 1]")


def add_row_quietly(page, item_id):
    page.evaluate("id => window.__sb.tables.activity_items.push({ activity: 'emoji', item_id: id, payload: {} })", item_id)


def test_listen_refetches_when_the_tab_wakes(store_page):
    add_row_quietly(store_page, "b")  # a change whose event was missed while the phone slept
    store_page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    store_page.wait_for_function("JSON.stringify(window.got[window.got.length - 1]) === JSON.stringify(['a','b'])")


def test_listen_refetches_after_a_reconnect(store_page):
    add_row_quietly(store_page, "b")
    store_page.evaluate("window.__sbResubscribe()")
    store_page.wait_for_function("JSON.stringify(window.got[window.got.length - 1]) === JSON.stringify(['a','b'])")


def test_a_delete_on_another_screen_reaches_this_one(store_page):
    store_page.evaluate("""() => {
        window.__sb.tables.activity_items = [];
        window.__sbEmit('DELETE', { old: { activity: 'emoji', item_id: 'a' } });
    }""")
    store_page.wait_for_function("window.got[window.got.length - 1].length === 0")


def test_this_screens_own_delete_shows_without_an_event(store_page):
    store_page.evaluate("window.store.removeAt('emoji/a')")
    store_page.wait_for_function("window.got[window.got.length - 1].length === 0")


def test_a_slow_old_answer_does_not_overwrite_a_newer_one(store_page):
    store_page.evaluate("""async () => {
        window.__sb.delays.push(400, 10);
        window.__sbEmit('INSERT', { new: { activity: 'emoji', item_id: 'x' } });   // slow fetch sees only 'a'
        await new Promise(r => setTimeout(r, 50));
        window.__sb.tables.activity_items.push({ activity: 'emoji', item_id: 'b', payload: {} });
        window.__sbEmit('INSERT', { new: { activity: 'emoji', item_id: 'b' } });   // quick fetch sees 'a','b'
    }""")
    store_page.wait_for_timeout(700)
    assert last(store_page) == ["a", "b"]
