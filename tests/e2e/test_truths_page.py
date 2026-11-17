from conftest import rows


def fill(page, base_url):
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(f"{base_url}/class-games/truths.html")
    page.fill("input[name=name]", "Jo")
    page.fill("input[name=truth1]", "I can juggle")
    page.fill("input[name=truth2]", "I have a dog")


def test_truths_uses_ai_lie(page, base_url, ai_mock):
    ai_mock["body"] = {"text": "I once lived in Darwin."}
    fill(page, base_url)
    page.click("#submit")
    page.wait_for_selector("text=On the noticeboard!")
    saved = list(rows(page, "truths").values())
    assert len(saved) == 1
    card = saved[0]
    assert card["name"] == "Jo"
    assert card["lieSource"] == "ai"
    assert card["revealed"] is False
    assert [i["text"] for i in card["items"] if i["isLie"]] == ["I once lived in Darwin."]
    assert sorted(i["text"] for i in card["items"] if not i["isLie"]) == ["I can juggle", "I have a dog"]
    assert ai_mock["calls"][0] == {"task": "lie", "truths": ["I can juggle", "I have a dog"]}
    assert "Darwin" not in page.inner_text("body")


def test_cooking_message_shows_while_waiting(page, base_url, context):
    fill(page, base_url)
    context.unroute("**/api/ai")
    context.route("**/api/ai", lambda r: page.wait_for_timeout(800) or r.fulfill(status=200, content_type="application/json", body='{"text":"I hate tea."}'))
    page.click("#submit")
    page.wait_for_selector("text=The AI is cooking up your lie… 🤫")
    page.wait_for_selector("text=On the noticeboard!")


def test_truths_falls_back_when_ai_fails(page, base_url, ai_mock):
    ai_mock["status"] = 502
    ai_mock["body"] = {"error": "down"}
    fill(page, base_url)
    page.click("#submit")
    page.wait_for_selector("text=On the noticeboard!")
    card = list(rows(page, "truths").values())[0]
    assert card["lieSource"] == "bank"
    assert len([i for i in card["items"] if i["isLie"]]) == 1


def test_truths_double_submit_creates_one_card(page, base_url):
    fill(page, base_url)
    page.dblclick("#submit")
    page.wait_for_selector("text=On the noticeboard!")
    page.wait_for_timeout(300)
    assert len(rows(page, "truths")) == 1


def test_truths_needs_both(page, base_url):
    fill(page, base_url)
    page.fill("input[name=truth2]", "   ")
    page.click("#submit")
    assert "Write two true things" in page.inner_text(".error-box")
    assert rows(page, "truths") == {}


def test_add_another_keeps_name(page, base_url):
    fill(page, base_url)
    page.click("#submit")
    page.click("#again")
    assert page.input_value("input[name=name]") == "Jo"
    assert page.input_value("input[name=truth1]") == ""
