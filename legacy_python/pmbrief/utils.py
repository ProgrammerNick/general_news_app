from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Iterable, List


def parse_interests(raw: str) -> List[str]:
	parts = [p.strip() for p in re.split(r"[,\n]+", raw) if p.strip()]
	# Deduplicate preserving order
	seen = set()
	result: List[str] = []
	for p in parts:
		if p.lower() in seen:
			continue
		seen.add(p.lower())
		result.append(p)
	return result


def timestamp_string() -> str:
	return datetime.utcnow().strftime("%Y%m%d_%H%M%S")


def write_text(path: Path, content: str) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	path.write_text(content, encoding="utf-8")

