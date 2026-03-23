// script.js — TruthLens Frontend Game Logic
// Communicates with Flask backend via fetch API

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let state = {
  playerName: "",
  questions: [],       // fetched from API (no answers)
  currentIndex: 0,
  score: 0,
  lastEntryId: null,
};

// ═══════════════════════════════════════
// SCREEN MANAGER
// ═══════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ═══════════════════════════════════════
// LANDING SCREEN
// ═══════════════════════════════════════
async function startGame() {
  const nameInput = document.getElementById("player-name");
  const name = nameInput.value.trim();

  if (!name) {
    document.getElementById("name-error").classList.remove("hidden");
    nameInput.focus();
    return;
  }

  document.getElementById("name-error").classList.add("hidden");
  state.playerName = name;
  state.score = 0;
  state.currentIndex = 0;

  // Show game screen with loading state
  showScreen("screen-game");
  showLoadingCard();

  try {
    // Fetch questions from backend
    const res = await fetch(`${API_BASE}/questions?limit=10`);
    if (!res.ok) throw new Error("Failed to fetch questions");
    const data = await res.json();
    state.questions = data.questions;
    loadQuestion();
  } catch (err) {
    showError("Could not connect to server. Make sure the backend is running.");
    console.error(err);
  }
}

// ═══════════════════════════════════════
// GAME SCREEN
// ═══════════════════════════════════════
function showLoadingCard() {
  document.getElementById("headline-text").textContent = "Loading questions...";
  document.getElementById("source-tag").textContent = "—";
  document.getElementById("answer-btns").classList.add("hidden");
  document.getElementById("feedback-panel").classList.add("hidden");
}

function loadQuestion() {
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;

  // Update HUD
  document.getElementById("q-counter").textContent = `${state.currentIndex + 1}/${total}`;
  document.getElementById("hud-score").textContent = state.score;
  document.getElementById("prog-fill").style.width = `${((state.currentIndex + 1) / total) * 100}%`;

  // Update card
  document.getElementById("card-label").textContent = `HEADLINE #${state.currentIndex + 1}`;
  document.getElementById("headline-text").textContent = q.headline;
  document.getElementById("source-tag").textContent = q.source;

  // Reset card border color
  const card = document.getElementById("q-card");
  card.style.borderColor = "";

  // Show answer buttons, hide feedback
  document.getElementById("answer-btns").classList.remove("hidden");
  document.getElementById("feedback-panel").classList.add("hidden");

  // Animate card
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "slideUp .35s ease both";
}

async function submitAnswer(userAnswer) {
  const q = state.questions[state.currentIndex];

  // Disable buttons immediately to prevent double-click
  document.getElementById("answer-btns").classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/check-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: q.id,
        user_answer: userAnswer
      })
    });

    if (!res.ok) throw new Error("Server error");
    const data = await res.json();

    // Update score
    if (data.is_correct) {
      state.score++;
      document.getElementById("hud-score").textContent = state.score;
    }

    showFeedback(data);

  } catch (err) {
    showError("Could not verify answer. Check backend connection.");
    document.getElementById("answer-btns").classList.remove("hidden");
    console.error(err);
  }
}

function showFeedback(data) {
  const panel = document.getElementById("feedback-panel");
  const card = document.getElementById("q-card");

  // Style card border
  card.style.borderColor = data.is_correct ? "#1a6b3c" : "#c0392b";

  // Set feedback content
  document.getElementById("fb-icon").textContent = data.is_correct ? "✅" : "❌";
  document.getElementById("fb-title").textContent = data.is_correct ? "Correct!" : "Incorrect!";
  document.getElementById("fb-title").style.color = data.is_correct ? "#1a6b3c" : "#c0392b";
  document.getElementById("fb-explain").textContent = data.explanation;

  // Correct answer label
  const label = document.getElementById("correct-label");
  label.textContent = `Correct answer: ${data.correct_answer.toUpperCase()}`;
  label.className = `correct-label ${data.correct_answer}`;

  // Change Next button text on last question
  const btnNext = document.getElementById("btn-next");
  const isLast = state.currentIndex === state.questions.length - 1;
  btnNext.textContent = isLast ? "See Results →" : "Next Question →";

  panel.classList.remove("hidden");
}

function nextQuestion() {
  state.currentIndex++;

  if (state.currentIndex >= state.questions.length) {
    submitFinalScore();
  } else {
    loadQuestion();
  }
}

// ═══════════════════════════════════════
// RESULTS SCREEN
// ═══════════════════════════════════════
async function submitFinalScore() {
  showScreen("screen-results");

  const total = state.questions.length;
  const score = state.score;
  const pct = score / total;

  // Animate score ring
  setTimeout(() => {
    const circumference = 314;
    const offset = circumference - (pct * circumference);
    document.getElementById("score-ring-fill").style.strokeDashoffset = offset;
  }, 200);

  // Set score text
  document.getElementById("final-score-num").textContent = score;

  // Set result message
  const { emoji, heading, msg } = getResultCopy(score, total);
  document.getElementById("trophy-icon").textContent = emoji;
  document.getElementById("result-heading").textContent = heading;
  document.getElementById("result-msg").textContent = msg;

  // Submit score to backend
  try {
    const res = await fetch(`${API_BASE}/submit-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: state.playerName,
        score: score,
        total: total
      })
    });
    if (res.ok) {
      const data = await res.json();
      state.lastEntryId = data.entry?.id;
    }
  } catch (err) {
    console.warn("Could not submit score to leaderboard:", err);
  }
}

function getResultCopy(score, total) {
  const pct = score / total;
  if (pct === 1)    return { emoji: "🏆", heading: "Perfect Score!", msg: "Flawless! You're a certified misinformation detector." };
  if (pct >= 0.8)   return { emoji: "🎯", heading: "Sharp Eye!", msg: "Excellent critical thinking. You caught most of them." };
  if (pct >= 0.6)   return { emoji: "🧠", heading: "Good Effort!", msg: "Solid performance. A bit more practice and you'll ace it." };
  if (pct >= 0.4)   return { emoji: "📰", heading: "Keep Digging!", msg: "Fake news can be tricky. Study the tips and try again." };
  return              { emoji: "🔍", heading: "Time to Learn!", msg: "Critical thinking is a skill — keep practising!" };
}

// ═══════════════════════════════════════
// LEADERBOARD SCREEN
// ═══════════════════════════════════════
async function viewLeaderboard() {
  showScreen("screen-leaderboard");
  document.getElementById("lb-table").innerHTML = '<div class="lb-loading">Loading...</div>';

  try {
    // Fetch leaderboard + stats in parallel
    const [lbRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/leaderboard`),
      fetch(`${API_BASE}/stats`)
    ]);

    const lbData   = await lbRes.json();
    const statsData = await statsRes.json();

    renderLeaderboard(lbData);
    renderStats(statsData);

  } catch (err) {
    document.getElementById("lb-table").innerHTML =
      '<div class="lb-loading">Could not load leaderboard. Is the server running?</div>';
    console.error(err);
  }
}

function renderLeaderboard(data) {
  const table = document.getElementById("lb-table");

  if (!data.leaderboard || data.leaderboard.length === 0) {
    table.innerHTML = '<div class="lb-loading">No scores yet. Be the first!</div>';
    return;
  }

  table.innerHTML = data.leaderboard.map(entry => `
    <div class="lb-row ${entry.rank <= 3 ? "top-3" : ""}">
      <div class="lb-rank">${getRankEmoji(entry.rank)}</div>
      <div>
        <div class="lb-player">${escapeHtml(entry.player_name)}</div>
        <div class="lb-player-date">${entry.timestamp}</div>
      </div>
      <div class="lb-score-badge">${entry.score}/${entry.total}</div>
    </div>
  `).join("");
}

function renderStats(stats) {
  const row = document.getElementById("lb-stats-row");
  if (!stats || stats.total_games_played === 0) {
    row.innerHTML = "";
    return;
  }
  row.innerHTML = `
    <span class="lb-stat-chip">🎮 <strong>${stats.total_games_played}</strong> games played</span>
    <span class="lb-stat-chip">📊 Avg score <strong>${stats.average_score}</strong></span>
    <span class="lb-stat-chip">🏆 <strong>${stats.perfect_scores}</strong> perfect scores</span>
    <span class="lb-stat-chip">✅ <strong>${stats.pass_rate_percent}%</strong> pass rate</span>
  `;
}

function getRankEmoji(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function backToResults() {
  showScreen("screen-results");
}

// ═══════════════════════════════════════
// PLAY AGAIN
// ═══════════════════════════════════════
function playAgain() {
  state.score = 0;
  state.currentIndex = 0;
  state.questions = [];
  showScreen("screen-landing");
  document.getElementById("player-name").value = state.playerName;
}

// ═══════════════════════════════════════
// ERROR HELPER
// ═══════════════════════════════════════
function showError(msg) {
  alert("⚠️ " + msg);
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ═══════════════════════════════════════
// ON LOAD — fetch mini leaderboard
// ═══════════════════════════════════════
window.addEventListener("DOMContentLoaded", async () => {
  // Allow Enter key to start game
  document.getElementById("player-name").addEventListener("keydown", e => {
    if (e.key === "Enter") startGame();
  });

  // Try to load mini leaderboard
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.leaderboard && data.leaderboard.length > 0) {
      const top3 = data.leaderboard.slice(0, 3);
      document.getElementById("mini-lb-list").innerHTML = top3.map(e => `
        <div class="mini-lb-row">
          <span class="mini-lb-name">${getRankEmoji(e.rank)} ${escapeHtml(e.player_name)}</span>
          <span class="mini-lb-score">${e.score}/${e.total}</span>
        </div>
      `).join("");
      document.getElementById("mini-leaderboard").classList.remove("hidden");
    }
  } catch (_) {
    // Server not running yet — silently skip mini leaderboard
  }
});