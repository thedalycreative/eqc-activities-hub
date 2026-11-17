// Pure scoring rules for Trivia Live, so they can be tested away from the page.
// Answer rows live in activity "quiz-<CODE>" as answer-<playerId>-<questionIndex>:
//   { playerId, questionIndex, choice, elapsed, answeredAt }

// A right answer is worth 1000, plus up to 1000 more for speed.
export function scoreFor(answer, question, seconds = 60) {
  if (!answer || !question || question.correct !== answer.choice) return 0;
  return 1000 + Math.max(0, Math.round(1000 * (1 - answer.elapsed / (seconds * 1000))));
}

export const answerKey = (playerId, qIndex) => `answer-${playerId}-${qIndex}`;

const answersFor = (rows, qIndex) => Object.entries(rows || {})
  .filter(([k, v]) => k.startsWith('answer-') && v && v.questionIndex === qIndex)
  .map(([, v]) => v);

export function answerCounts(rows, qIndex, nChoices = 4) {
  const counts = Array(nChoices).fill(0);
  for (const a of answersFor(rows, qIndex)) if (a.choice >= 0 && a.choice < nChoices) counts[a.choice] += 1;
  return counts;
}

export function leaderboard(players, rows, questions, seconds, uptoIndex) {
  return Object.values(players || {})
    .map(p => {
      let score = 0;
      for (let i = 0; i <= uptoIndex; i++) score += scoreFor(rows?.[answerKey(p.id, i)], questions[i], seconds);
      return { id: p.id, name: p.name, score };
    })
    .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
}

export function rankShifts(prev, next) {
  const before = new Map(prev.map((p, i) => [p.id, i]));
  return Object.fromEntries(next.map(p => [p.id, before.has(p.id) ? before.get(p.id) : next.length]));
}

export function streakFor(playerId, rows, questions, uptoIndex) {
  let streak = 0;
  for (let i = uptoIndex; i >= 0; i--) {
    if (scoreFor(rows?.[answerKey(playerId, i)], questions[i]) > 0) streak += 1;
    else break;
  }
  return streak;
}
