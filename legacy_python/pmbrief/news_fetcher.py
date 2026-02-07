from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

import requests

from .config import get_env_str


NEWSAPI_BASE = "https://newsapi.org/v2/everything"


def _iso_utc(dt: datetime) -> str:
	return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def fetch_news(interests: List[str], hours: int = 36, max_articles: int = 30) -> List[Dict]:
	"""
	Fetch recent news articles (last N hours) matching user interests using NewsAPI.
	Returns a list of unique articles, most recent first.
	"""
	api_key = get_env_str("NEWSAPI_KEY")
	if not api_key:
		raise RuntimeError("NEWSAPI_KEY not set")

	now = datetime.utcnow()
	start_time = now - timedelta(hours=hours)
	start_iso = _iso_utc(start_time)

	articles_by_url: Dict[str, Dict] = {}
	session = requests.Session()

	# Strategy: query per interest to maximize recall, then deduplicate by URL
	for interest in interests:
		q = interest.strip()
		if not q:
			continue
		params = {
			"q": q,
			"from": start_iso,
			"sortBy": "publishedAt",
			"language": "en",
			"pageSize": 100,
		}
		headers = {"X-Api-Key": api_key}
		try:
			resp = session.get(NEWSAPI_BASE, params=params, headers=headers, timeout=20)
			if resp.status_code == 429:
				# simple backoff
				time.sleep(2.0)
				resp = session.get(NEWSAPI_BASE, params=params, headers=headers, timeout=20)
			resp.raise_for_status()
			data = resp.json()
			for art in data.get("articles", []):
				url = art.get("url")
				if not url or url in articles_by_url:
					continue
				articles_by_url[url] = {
					"title": art.get("title", "").strip(),
					"description": (art.get("description") or "").strip(),
					"url": url,
					"publishedAt": art.get("publishedAt"),
					"source": (art.get("source") or {}).get("name"),
				}
		except Exception:
			# continue on errors per-interest
			continue

	# Sort by publishedAt desc, then trim to max_articles
	def sort_key(a: Dict) -> Tuple:
		return (a.get("publishedAt") or "",)

	all_articles = list(articles_by_url.values())
	all_articles.sort(key=sort_key, reverse=True)
	return all_articles[:max_articles]

