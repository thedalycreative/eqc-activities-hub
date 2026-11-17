from conftest import rows, unlock

CHALLENGE = "Get the AI to write a 1-star review of the Moon"


def open_lobby(context, base_url, seconds=60):
    unlock(context)
    stage = context.new_page()
    stage.goto(f"{base_url}/")
    stage.click("[data-game='battle']")
    stage.select_option("#battle-challenge", CHALLENGE)
    stage.click(f".time-chip[data-seconds='{seconds}']")
    stage.click("#battle-open")
    stage.wait_for_selector(".battle-code")
    code = stage.inner_text(".battle-code").strip()
    return stage, code


def join(context, base_url, code, name):
    phone = context.new_page()
    phone.set_viewport_size({"width": 390, "height": 844})
    phone.goto(f"{base_url}/class-games/battle.html?code={code}&as={name}")
    phone.fill("input[name=name]", name)
    phone.click("#join")
    phone.wait_for_selector("text=You're in!")
    return phone


def start_round(stage, phones):
    stage.wait_for_function(f"document.querySelectorAll('.lobby-chip').length === {len(phones)}")
    stage.click("#battle-start-round")
    for p in phones:
        p.wait_for_selector(f".challenge:has-text('{CHALLENGE}')")


def submit(phone, prompt):
    phone.fill("textarea[name=prompt]", prompt)
    phone.click("#try")
    phone.wait_for_selector(".reply:has-text('No air. Zero stars.')")
    phone.click("#submit-entry")
    phone.wait_for_selector("text=Submitted!")


def state(page, code):
    return rows(page, f"battle-{code}").get("state", {})


def two_player_round(context, base_url, ai_mock, seconds=60):
    ai_mock["body"] = {"text": "No air. Zero stars."}
    stage, code = open_lobby(context, base_url, seconds)
    jo = join(context, base_url, code, "Jo")
    sam = join(context, base_url, code, "Sam")
    start_round(stage, [jo, sam])
    submit(jo, "Write a grumpy review of the moon")
    submit(sam, "Pretend you are a disappointed tourist on the moon")
    stage.wait_for_function("document.querySelectorAll('.battle-card').length === 2")
    return stage, code, jo, sam


def test_full_round(context, base_url, ai_mock):
    stage, code, jo, sam = two_player_round(context, base_url, ai_mock)
    assert len(code) == 4
    assert "2 of 2 in" in stage.inner_text(".battle-count")
    cards_text = " ".join(stage.locator(".battle-card").all_inner_texts())
    assert "Jo" not in cards_text and "Sam" not in cards_text
    stage.click("#battle-start-voting")
    jo.wait_for_selector(".vote-card")
    assert jo.locator(".vote-card").count() == 1
    jo.locator(".vote-card").click()
    jo.wait_for_selector(".vote-card.voted")
    stage.wait_for_selector(".battle-card .stars:has-text('1')")
    stage.click("#battle-reveal")
    winner = stage.locator(".battle-card.winner")
    winner.wait_for()
    assert "Sam" in winner.inner_text()
    assert "Pretend you are a disappointed tourist on the moon" in winner.inner_text()
    first = stage.locator(".battle-lb .lb-row").first.inner_text()
    assert "Sam" in first and "1" in first
    assert state(stage, code)["status"] == "reveal"
    sam.wait_for_selector("text=You got ⭐ 1")
    assert context.console_errors == []


def test_lobby_shows_qr_and_link(context, base_url):
    stage, code = open_lobby(context, base_url)
    assert stage.locator(".battle-stage .qr svg").count() == 1
    assert f"/class-games/battle.html?code={code}" in stage.inner_text(".battle-stage")


def test_try_limit(context, base_url, ai_mock):
    ai_mock["body"] = {"text": "No air. Zero stars."}
    stage, code = open_lobby(context, base_url)
    jo = join(context, base_url, code, "Jo")
    start_round(stage, [jo])
    jo.fill("textarea[name=prompt]", "moon review")
    for n in range(3):
        jo.click("#try")
        jo.wait_for_selector(f".tries:has-text('{n + 1}/3 tries')")
    assert jo.locator("#try").is_disabled()
    assert jo.locator("#submit-entry").is_enabled()


def test_trainer_can_hide_card(context, base_url, ai_mock):
    stage, code, jo, sam = two_player_round(context, base_url, ai_mock)
    sam_key = [k for k, v in rows(stage, f"battle-{code}").items() if k.startswith("entry-") and v["name"] == "Sam"][0]
    stage.locator(f".battle-card[data-key='{sam_key}'] .battle-hide").click()
    stage.wait_for_function("document.querySelectorAll('.battle-card').length === 1")
    stage.click("#battle-start-voting")
    jo.wait_for_selector("text=No other entries to vote on")
    assert jo.locator(".vote-card").count() == 0


def test_battle_ai_error_keeps_prompt(context, base_url, ai_mock):
    stage, code = open_lobby(context, base_url)
    jo = join(context, base_url, code, "Jo")
    start_round(stage, [jo])
    ai_mock["status"] = 502
    ai_mock["body"] = {"error": "busy"}
    jo.fill("textarea[name=prompt]", "my clever prompt")
    jo.click("#try")
    jo.wait_for_selector(".ai-error:has-text('The AI is busy — try again')")
    assert jo.input_value("textarea[name=prompt]") == "my clever prompt"
    assert "0/3 tries" in jo.inner_text(".tries")


def test_battle_resumes_after_reload(context, base_url, ai_mock):
    stage, code, jo, sam = two_player_round(context, base_url, ai_mock)
    stage.click("#battle-start-voting")
    stage.wait_for_selector("#battle-reveal")
    stage.reload()
    stage.wait_for_selector(".battle-stage #battle-reveal")
    assert stage.locator(".battle-card").count() == 2


def test_round_timer_moves_to_voting(context, base_url, ai_mock):
    stage, code = open_lobby(context, base_url, seconds=60)
    jo = join(context, base_url, code, "Jo")
    start_round(stage, [jo])
    stage.evaluate("() => { const real = Date.now; Date.now = () => real() + 61000; }")
    stage.wait_for_function(
        f"JSON.parse(localStorage.getItem('fake-db')).rows['battle-{code}'].state.status === 'voting'")
    stage.wait_for_selector("#battle-reveal")


def test_end_battle_podium(context, base_url, ai_mock):
    stage, code, jo, sam = two_player_round(context, base_url, ai_mock)
    stage.click("#battle-start-voting")
    jo.wait_for_selector(".vote-card")
    jo.locator(".vote-card").click()
    stage.wait_for_selector(".battle-card .stars:has-text('1')")
    stage.click("#battle-reveal")
    stage.wait_for_selector(".battle-card.winner")
    stage.click("#battle-end")
    stage.wait_for_selector(".podium")
    assert "Sam" in stage.inner_text(".podium [data-place='1']")
    assert state(stage, code)["status"] == "finished"
    assert stage.evaluate("localStorage.getItem('eqc-battle-code')") is None
    jo.wait_for_selector("text=Game over")


def test_wrong_code_on_phone(context, base_url):
    phone = context.new_page()
    phone.goto(f"{base_url}/class-games/battle.html?code=ZZZZ")
    phone.fill("input[name=name]", "Jo")
    phone.click("#join")
    phone.wait_for_selector(".error-box:has-text('code')")


def test_rescanning_the_qr_keeps_the_same_player(context, base_url):
    stage, code = open_lobby(context, base_url)
    first = context.new_page()
    first.goto(f"{base_url}/class-games/battle.html?code={code}")
    first.fill("input[name=name]", "Jo")
    first.click("#join")
    first.wait_for_selector("text=You're in!")
    again = context.new_page()
    again.goto(f"{base_url}/class-games/battle.html?code={code}")
    again.wait_for_selector("text=You're in!")
    stage.wait_for_function("document.querySelectorAll('.lobby-chip').length === 1")
