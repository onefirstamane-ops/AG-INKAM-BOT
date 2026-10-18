
import os
import sqlite3
from datetime import datetime, date
from flask import Flask, request, jsonify

app = Flask(__name__)

DATABASE = os.getenv("DATABASE_PATH", "ag_inkam.db")


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT DEFAULT '',
                balance INTEGER DEFAULT 0,
                last_daily TEXT DEFAULT ''
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS task_completions (
                user_id INTEGER NOT NULL,
                task_id TEXT NOT NULL,
                completed_at TEXT NOT NULL,
                PRIMARY KEY (user_id, task_id)
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                invited_user INTEGER PRIMARY KEY,
                referrer_id INTEGER NOT NULL
            )
        """)


def get_user_id(data):
    value = data.get("user_id")
    try:
        user_id = int(value)
        return user_id if user_id > 0 else None
    except (TypeError, ValueError):
        return None


@app.get("/")
def home():
    return jsonify({
        "name": "AG INKAM BOT API",
        "status": "online",
        "note": "Use the documented API endpoints."
    })


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.post("/api/user")
def user():
    data = request.get_json(silent=True) or {}
    user_id = get_user_id(data)

    if user_id is None:
        return jsonify({"error": "Valid user_id required"}), 400

    username = str(data.get("username", ""))[:64]

    with get_db() as db:
        db.execute(
            """INSERT INTO users (user_id, username)
               VALUES (?, ?)
               ON CONFLICT(user_id)
               DO UPDATE SET username = excluded.username""",
            (user_id, username)
        )
        row = db.execute(
            "SELECT user_id, username, balance, last_daily FROM users WHERE user_id = ?",
            (user_id,)
        ).fetchone()

    return jsonify(dict(row))


@app.get("/api/balance")
def balance():
    user_id = request.args.get("user_id", type=int)

    if not user_id or user_id < 1:
        return jsonify({"error": "Valid user_id required"}), 400

    with get_db() as db:
        row = db.execute(
            "SELECT balance FROM users WHERE user_id = ?",
            (user_id,)
        ).fetchone()

    if row is None:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user_id": user_id, "balance": row["balance"]})


@app.post("/api/daily")
def daily():
    data = request.get_json(silent=True) or {}
    user_id = get_user_id(data)

    if user_id is None:
        return jsonify({"error": "Valid user_id required"}), 400

    today = date.today().isoformat()
    bonus = 5

    with get_db() as db:
        row = db.execute(
            "SELECT last_daily FROM users WHERE user_id = ?",
            (user_id,)
        ).fetchone()

        if row is None:
            return jsonify({"error": "Register user first"}), 404

        if row["last_daily"] == today:
            return jsonify({"error": "Daily bonus already claimed"}), 409

        db.execute(
            "UPDATE users SET balance = balance + ?, last_daily = ? WHERE user_id = ?",
            (bonus, today, user_id)
        )
        updated = db.execute(
            "SELECT balance FROM users WHERE user_id = ?",
            (user_id,)
        ).fetchone()

    return jsonify({
        "success": True,
        "bonus": bonus,
        "balance": updated["balance"]
    })


@app.post("/api/task/complete")
def complete_task():
    data = request.get_json(silent=True) or {}
    user_id = get_user_id(data)
    task_id = str(data.get("task_id", ""))[:50]

    # Fixed server-side task list: clients cannot choose arbitrary rewards.
    tasks = {
        "task_1": 5,
        "task_2": 5,
        "task_3": 5,
    }

    if user_id is None or task_id not in tasks:
        return jsonify({"error": "Invalid user or task"}), 400

    reward = tasks[task_id]

    with get_db() as db:
        if not db.execute(
            "SELECT 1 FROM users WHERE user_id = ?", (user_id,)
        ).fetchone():
            return jsonify({"error": "Register user first"}), 404

        try:
            db.execute(
                "INSERT INTO task_completions VALUES (?, ?, ?)",
                (user_id, task_id, datetime.utcnow().isoformat())
            )
        except sqlite3.IntegrityError:
            return jsonify({"error": "Task already completed"}), 409

        db.execute(
            "UPDATE users SET balance = balance + ? WHERE user_id = ?",
            (reward, user_id)
        )
        updated = db.execute(
            "SELECT balance FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()

    return jsonify({
        "success": True,
        "reward": reward,
        "balance": updated["balance"]
    })


@app.post("/api/referral")
def referral():
    data = request.get_json(silent=True) or {}
    user_id = get_user_id(data)
    referrer_id = data.get("referrer_id")

    try:
        referrer_id = int(referrer_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Valid referrer_id required"}), 400

    if user_id is None or referrer_id < 1 or user_id == referrer_id:
        return jsonify({"error": "Invalid referral"}), 400

    with get_db() as db:
        users = db.execute(
            "SELECT user_id FROM users WHERE user_id IN (?, ?)",
            (user_id, referrer_id)
        ).fetchall()

        if len(users) != 2:
            return jsonify({"error": "Both users must register first"}), 404

        try:
            db.execute(
                "INSERT INTO referrals (invited_user, referrer_id) VALUES (?, ?)",
                (user_id, referrer_id)
            )
        except sqlite3.IntegrityError:
            return jsonify({"error": "Referral already processed"}), 409

        # Referral is recorded, but no reward is issued until
        # referral verification rules are implemented.
        return jsonify({
            "success": True,
            "message": "Referral recorded; pending verification."
        })


init_db()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=False
    )
