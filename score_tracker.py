"""
score_tracker.py — In-memory leaderboard and game statistics
For production: replace with SQLite or PostgreSQL database.
"""

import uuid
from datetime import datetime


class ScoreTracker:
    def __init__(self):
        self._scores = []   # list of score entry dicts

    # ── Add a new score ──────────────────────────────────────────
    def add_score(self, player_name: str, score: int, total: int) -> dict:
        entry = {
            "id":          str(uuid.uuid4())[:8],
            "player_name": player_name,
            "score":       score,
            "total":       total,
            "percentage":  round((score / total) * 100, 1) if total > 0 else 0,
            "timestamp":   datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        }
        self._scores.append(entry)
        return entry

    # ── Get the rank of an entry by its ID ───────────────────────
    def get_rank(self, entry_id: str) -> int:
        sorted_scores = sorted(self._scores, key=lambda x: x["score"], reverse=True)
        for rank, entry in enumerate(sorted_scores, start=1):
            if entry["id"] == entry_id:
                return rank
        return -1

    # ── Top N leaderboard entries ────────────────────────────────
    def get_leaderboard(self, limit: int = 10) -> list:
        sorted_scores = sorted(self._scores, key=lambda x: x["score"], reverse=True)
        top = sorted_scores[:limit]
        return [{"rank": i + 1, **entry} for i, entry in enumerate(top)]

    # ── Total number of games played ─────────────────────────────
    def total_players(self) -> int:
        return len(self._scores)

    # ── Aggregate statistics ─────────────────────────────────────
    def get_stats(self) -> dict:
        if not self._scores:
            return {
                "total_games_played": 0,
                "average_score":      0,
                "highest_score":      0,
                "lowest_score":       0,
                "perfect_scores":     0,
                "pass_rate_percent":  0
            }

        scores  = [e["score"] for e in self._scores]
        totals  = [e["total"] for e in self._scores]

        perfect = sum(1 for s, t in zip(scores, totals) if s == t)
        passing = sum(1 for s, t in zip(scores, totals) if t > 0 and s / t >= 0.6)

        return {
            "total_games_played": len(self._scores),
            "average_score":      round(sum(scores) / len(scores), 2),
            "highest_score":      max(scores),
            "lowest_score":       min(scores),
            "perfect_scores":     perfect,
            "pass_rate_percent":  round((passing / len(self._scores)) * 100, 1)
        }