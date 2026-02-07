import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv


def load_env() -> None:
	# Load .env from project root if present
	load_dotenv(override=False)


def get_env_str(name: str, default: Optional[str] = None) -> Optional[str]:
	val = os.getenv(name)
	if val is None or val == "":
		return default
	return val


def get_bool(name: str, default: bool = False) -> bool:
	val = os.getenv(name)
	if val is None:
		return default
	val_norm = val.strip().lower()
	return val_norm in ("1", "true", "yes", "y", "on")


def ensure_dirs() -> dict:
	# Resolve directories from env or defaults
	data_dir = Path(get_env_str("DATA_DIR", "data"))
	vector_dir = Path(get_env_str("VECTORSTORE_DIR", str(data_dir / "vectorstore")))
	summaries_dir = Path(get_env_str("SUMMARIES_DIR", str(data_dir / "summaries")))
	tmp_dir = Path(get_env_str("TMP_DIR", str(data_dir / "tmp")))
	for p in (data_dir, vector_dir, summaries_dir, tmp_dir):
		p.mkdir(parents=True, exist_ok=True)
	return {
		"data_dir": data_dir,
		"vector_dir": vector_dir,
		"summaries_dir": summaries_dir,
		"tmp_dir": tmp_dir,
	}


def app_name() -> str:
	return get_env_str("APP_NAME", "Personalized Morning Brief") or "Personalized Morning Brief"


def model_name() -> str:
	return get_env_str("MODEL_NAME", "gemini-1.5-flash") or "gemini-1.5-flash"


def embedding_model_name() -> str:
	return get_env_str("EMBEDDING_MODEL", "text-embedding-004") or "text-embedding-004"


def get_generation_settings() -> dict:
	return {
		"max_articles": int(get_env_str("MAX_ARTICLES", "30") or "30"),
		"lookback_hours": int(get_env_str("NEWS_LOOKBACK_HOURS", "36") or "36"),
		"brief_target_words": int(get_env_str("BRIEF_TARGET_WORDS", "1200") or "1200"),
	}

