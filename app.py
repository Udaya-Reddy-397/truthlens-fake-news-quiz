"""
app.py — TruthLens Fake News Detector Backend
Flask REST API: serves questions, checks answers, tracks scores
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import random
from questions import questions
from score_tracker import ScoreTracker

app = Flask(__name__)
CORS(app)  # Allow the HTML frontend to call this API

tracker = ScoreTracker()


# ── GET /  — Health check ────────────────────────────────────────
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "running",
        "app": "TruthLens Fake News Detector API",
        "version": "1.0.0",
        "endpoints": {
            "GET  /questions?limit=10": "Get shuffled questions (answers hidden)",
            "POST /check-answer":       "Check a single answer",
            "POST /submit-score":       "Submit final score to leaderboard",
            "GET  /leaderboard":        "Get top 10 scores",
            "GET  /stats":              "Get overall game statistics"
        }
    })


# ── GET /questions  — Return questions without answers ───────────
@app.route("/questions", methods=["GET"])
def get_questions():
    limit = request.args.get("limit", 10, type=int)
    limit = max(1, min(limit, len(questions)))

    shuffled = random.sample(questions, limit)

    # Never send the answer or explanation to the client
    safe = [
        {
            "id":       q["id"],
            "index":    i + 1,
            "headline": q["headline"],
            "source":   q["source"]
        }
        for i, q in enumerate(shuffled)
    ]

    return jsonify({"total": len(safe), "questions": safe})


# ── POST /check-answer  — Validate a user's answer ───────────────
@app.route("/check-answer", methods=["POST"])
def check_answer():
    """
    Request body:
        { "question_id": "q1", "user_answer": "real" }

    Response:
        is_correct, correct_answer, explanation
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    question_id = data.get("question_id", "").strip()
    user_answer = data.get("user_answer", "").lower().strip()

    if not question_id or not user_answer:
        return jsonify({"error": "question_id and user_answer are required"}), 400

    if user_answer not in ("real", "fake"):
        return jsonify({"error": "user_answer must be 'real' or 'fake'"}), 400

    question = next((q for q in questions if q["id"] == question_id), None)
    if not question:
        return jsonify({"error": f"Question '{question_id}' not found"}), 404

    is_correct = user_answer == question["answer"]

    return jsonify({
        "question_id":    question_id,
        "user_answer":    user_answer,
        "correct_answer": question["answer"],
        "is_correct":     is_correct,
        "explanation":    question["explanation"],
        "headline":       question["headline"]
    })


# ── POST /submit-score  — Save a score to the leaderboard ────────
@app.route("/submit-score", methods=["POST"])
def submit_score():
    """
    Request body:
        { "player_name": "Alice", "score": 8, "total": 10 }
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    player_name = str(data.get("player_name", "")).strip()[:30]
    score       = data.get("score")
    total       = int(data.get("total", 10))

    if not player_name:
        return jsonify({"error": "player_name cannot be empty"}), 400

    if score is None:
        return jsonify({"error": "score is required"}), 400

    score = int(score)
    if not (0 <= score <= total):
        return jsonify({"error": f"score must be between 0 and {total}"}), 400

    entry = tracker.add_score(player_name, score, total)
    rank  = tracker.get_rank(entry["id"])

    return jsonify({
        "message": "Score submitted!",
        "entry":   entry,
        "rank":    rank
    }), 201


# ── GET /leaderboard  — Top 10 scores ────────────────────────────
@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    limit = request.args.get("limit", 10, type=int)
    return jsonify({
        "leaderboard":   tracker.get_leaderboard(limit),
        "total_players": tracker.total_players()
    })


# ── GET /stats  — Overall statistics ─────────────────────────────
@app.route("/stats", methods=["GET"])
def stats():
    return jsonify(tracker.get_stats())


# ── Run ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🚀 TruthLens API running at http://localhost:5000\n")
    app.run(debug=True, port=5000)