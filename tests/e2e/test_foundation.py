from conftest import PIN_HASH


def tap(page, digits):
    for d in digits:
        page.locator(f".pin-pad [data-digit='{d}']").click()


def test_pin_modal_unlocks(page, base_url):
    page.goto(f"{base_url}/tests/e2e/fixtures/foundation.html")
    page.click("#ask")
    tap(page, "1111")
    assert page.locator(".pin-pad").is_visible()
    assert page.inner_text("#out") == ""
    tap(page, "2468")
    page.wait_for_function("document.getElementById('out').textContent === 'true'")
    assert page.evaluate("localStorage.getItem('eqc-trainer')") == PIN_HASH
    assert page.locator(".pin-pad").count() == 0


def test_pin_modal_cancel_returns_false(page, base_url):
    page.goto(f"{base_url}/tests/e2e/fixtures/foundation.html")
    page.click("#ask")
    page.click(".pin-pad [data-act='cancel']")
    page.wait_for_function("document.getElementById('out').textContent === 'false'")


def test_sound_runs_in_browser(page, context, base_url):
    page.goto(f"{base_url}/tests/e2e/fixtures/foundation.html")
    page.click("#ask")  # a user gesture so audio is allowed
    page.keyboard.press("Escape")
    page.evaluate("""async () => {
        const s = await import('/assets/sound.js');
        ['tick','ding','buzz','drumroll','fanfare','pop','whoosh','lever','clunk'].forEach(s.play);
        s.startMusic('lobby'); await new Promise(r => setTimeout(r, 300));
        s.startMusic('think'); await new Promise(r => setTimeout(r, 300)); s.stopMusic();
        document.body.append(s.muteButton());
    }""")
    page.click(".mute-btn")
    assert page.inner_text(".mute-btn") == "🔇"
    assert context.console_errors == []
