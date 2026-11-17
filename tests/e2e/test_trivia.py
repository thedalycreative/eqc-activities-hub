import re
import time

from conftest import rows, unlock


def setup_game(context, base_url, seconds=20, count=5):
    unlock(context)
    host = context.new_page()
    host.goto(f"{base_url}/quiz.html")
    host.locator(".cat-chip:has-text('HTML') input").check()
    host.locator(f"input[name=count][value='{count}']").check()
    host.click(f".time-chip[data-seconds='{seconds}']")
    host.click("#create")
    host.wait_for_url(re.compile(r"mode=presenter&code="))
    host.wait_for_selector(".lobby .qr svg")
    code = host.url.split("code=")[1][:4]
    return host, code


def join(context, base_url, code, name):
    p = context.new_page()
    p.set_viewport_size({"width": 390, "height": 844})
    p.goto(f"{base_url}/quiz.html?mode=player&code={code}")
    p.fill("input[name=name]", name)
    p.click("#join")
    p.wait_for_selector("text=You're in!")
    return p


def quiz_state(page, code):
    return rows(page, f"quiz-{code}")["state"]


def test_setup_has_timer_choice(page, base_url):
    page.goto(f"{base_url}/quiz.html")
    chips = page.locator(".time-chip")
    assert chips.all_inner_texts() == ["20s", "30s", "60s"]
    assert page.locator(".time-chip[data-seconds='60']").get_attribute("aria-pressed") == "true"
    page.locator(".cat-chip:has-text('HTML') input").check()
    page.click("#create")
    assert page.locator(".pin-pad").is_visible()


def test_lobby_shows_qr_and_players(context, base_url):
    host, code = setup_game(context, base_url)
    assert f"quiz.html?mode=player&code={code}" in host.inner_text(".lobby")
    join(context, base_url, code, "Jo")
    join(context, base_url, code, "Sam")
    host.wait_for_function("document.querySelectorAll('.lobby-chip').length === 2")


def test_player_sees_shapes_and_feedback(context, base_url):
    host, code = setup_game(context, base_url, seconds=20)
    p1 = join(context, base_url, code, "Jo")
    p2 = join(context, base_url, code, "Sam")
    host.wait_for_function("document.querySelectorAll('.lobby-chip').length === 2")
    host.click("#start-game")
    for p in (p1, p2):
        p.wait_for_selector(".answer-btn")
        for shape in ("tri", "dia", "cir", "sq"):
            assert p.locator(f".answer-btn.shape-{shape}").count() == 1
    st = quiz_state(host, code)
    assert st["seconds"] == 20
    correct = st["questions"][0]["correct"]
    wrong = (correct + 1) % 4
    p1.locator(".answer-btn").nth(correct).click()
    p1.wait_for_selector("text=Locked in!")
    p2.locator(".answer-btn").nth(wrong).click()
    p1.wait_for_selector(".feedback.correct")
    assert re.search(r"\+\d", p1.inner_text(".feedback .points"))
    p2.wait_for_selector(".feedback.wrong:has-text('So close!')")
    host.wait_for_selector(".answer-bar")
    assert host.locator(".answer-bar").count() == 4
    counts = [int(c) for c in host.locator(".answer-bar .count").all_inner_texts()]
    assert counts[correct] == 1 and counts[wrong] == 1
    assert "correct" in host.locator(".answer-bar").nth(correct).get_attribute("class")
    assert context.console_errors == []


def test_leaderboard_between_questions(context, base_url):
    host, code = setup_game(context, base_url)
    p1 = join(context, base_url, code, "Jo")
    p2 = join(context, base_url, code, "Sam")
    host.wait_for_function("document.querySelectorAll('.lobby-chip').length === 2")
    host.click("#start-game")
    p1.wait_for_selector(".answer-btn")
    correct = quiz_state(host, code)["questions"][0]["correct"]
    p1.locator(".answer-btn").nth(correct).click()
    p2.wait_for_selector(".answer-btn")
    p2.locator(".answer-btn").nth((correct + 1) % 4).click()
    host.wait_for_selector("#show-leaderboard")
    host.click("#show-leaderboard")
    host.wait_for_selector(".lb-row")
    first = host.locator(".lb-row").first
    assert "Jo" in first.inner_text()
    assert int(re.sub(r"\D", "", first.locator(".sc").inner_text())) > 0
    host.click("#next")
    p1.wait_for_selector(".answer-btn:not([disabled])")
    assert quiz_state(host, code)["questionIndex"] == 1


def test_final_podium(context, base_url):
    host, code = setup_game(context, base_url, count=5)
    for name in ("Jo", "Sam", "Ali"):
        join(context, base_url, code, name)
    host.wait_for_function("document.querySelectorAll('.lobby-chip').length === 3")
    host.click("#start-game")
    for i in range(5):
        host.wait_for_selector("#reveal")
        host.click("#reveal")
        host.click("#show-leaderboard")
        host.click("#next")
    host.wait_for_selector(".podium")
    host.wait_for_function("document.querySelectorAll('.podium-place.show').length === 3")
    steps = {p: host.get_attribute(f".podium-place[data-place='{p}']", "data-step") for p in ("1", "2", "3")}
    assert steps == {"3": "1", "2": "2", "1": "3"}
    assert host.locator(".final-list .lb-row").count() == 3
    assert quiz_state(host, code)["status"] == "finished"


def test_old_state_without_seconds(page, base_url):
    page.goto(f"{base_url}/quiz.html?mode=presenter&code=ABCD")
    page.evaluate("""() => {
        const q = { category: 'HTML', question: 'Old question?', answers: ['a', 'b', 'c', 'd'], correct: 0, explanation: 'x' };
        const db = { rows: { 'quiz-ABCD': { state: { status: 'question', game: 'trivia', categories: ['HTML'], questions: [q],
                     questionIndex: 0, questionStartedAt: Date.now(), scores: {} } } },
                     sessions: { ABCD: { code: 'ABCD', game: 'trivia', status: 'lobby' } }, players: {} };
        localStorage.setItem('fake-db', JSON.stringify(db));
    }""")
    page.reload()
    page.wait_for_selector(".timer-ring")
    assert int(page.inner_text(".timer-ring .num")) in (59, 60)
