from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import (
	TEXT,
	TIMESTAMP,
	Integer,
	String,
	create_engine,
	text as sql_text,
)
from sqlalchemy.exc import SQLAlchemyError

from .config import get_env_str, ensure_dirs


def get_engine():
	db_url = get_env_str("DATABASE_URL")
	if not db_url:
		return None
	try:
		engine = create_engine(db_url, pool_pre_ping=True)
		return engine
	except Exception:
		return None


def init_db(engine) -> None:
	if engine is None:
		return
	try:
		with engine.begin() as conn:
			conn.execute(
				sql_text(
					"""
					CREATE TABLE IF NOT EXISTS user_profile (
						id INTEGER PRIMARY KEY,
						interests TEXT,
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
					)
					"""
				)
			)
			conn.execute(
				sql_text(
					"""
					CREATE TABLE IF NOT EXISTS feedback (
						id SERIAL PRIMARY KEY,
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
						rating INTEGER,
						likes TEXT,
						dislikes TEXT,
						summary_id TEXT
					)
					"""
				)
			)
	except SQLAlchemyError:
		# Fail silently; app will fallback to JSON
		pass


# -------- JSON fallback paths --------
def _profile_path() -> Path:
	dirs = ensure_dirs()
	return Path(dirs["data_dir"]) / "profile.json"


def _feedback_path() -> Path:
	dirs = ensure_dirs()
	return Path(dirs["data_dir"]) / "feedback.jsonl"


# -------- Profile (interests) --------
def load_profile() -> Dict[str, Any]:
	engine = get_engine()
	if engine:
		try:
			with engine.begin() as conn:
				row = conn.execute(
					sql_text("SELECT id, interests FROM user_profile WHERE id = 1")
				).first()
				if row:
					interests = json.loads(row[1]) if row[1] else []
					return {"id": 1, "interests": interests}
		except SQLAlchemyError:
			pass
	# JSON fallback
	path = _profile_path()
	if path.exists():
		try:
			return json.loads(path.read_text(encoding="utf-8"))
		except Exception:
			return {"id": 1, "interests": []}
	return {"id": 1, "interests": []}


def save_profile(interests: List[str]) -> None:
	engine = get_engine()
	if engine:
		try:
			with engine.begin() as conn:
				conn.execute(
					sql_text(
						"""
						INSERT INTO user_profile (id, interests)
						VALUES (1, :interests::text)
						ON CONFLICT (id) DO UPDATE SET interests = EXCLUDED.interests
						"""
					),
					{"interests": json.dumps(interests)},
				)
				return
		except SQLAlchemyError:
			pass
	# JSON fallback
	path = _profile_path()
	data = {"id": 1, "interests": interests}
	try:
		path.write_text(json.dumps(data, indent=2), encoding="utf-8")
	except Exception:
		pass


# -------- Feedback --------
def save_feedback(rating: Optional[int], likes: str, dislikes: str, summary_id: str) -> None:
	engine = get_engine()
	if engine:
		try:
			with engine.begin() as conn:
				conn.execute(
					sql_text(
						"""
						INSERT INTO feedback (rating, likes, dislikes, summary_id)
						VALUES (:rating, :likes, :dislikes, :summary_id)
						"""
					),
					{
						"rating": rating,
						"likes": likes,
						"dislikes": dislikes,
						"summary_id": summary_id,
					},
				)
				return
		except SQLAlchemyError:
			pass
	# JSON fallback (append line-delimited JSON)
	path = _feedback_path()
	record = {
		"created_at": datetime.utcnow().isoformat() + "Z",
		"rating": rating,
		"likes": likes,
		"dislikes": dislikes,
		"summary_id": summary_id,
	}
	try:
		with path.open("a", encoding="utf-8") as f:
			f.write(json.dumps(record) + "\n")
	except Exception:
		pass

