from __future__ import annotations

import textwrap
import uuid
from datetime import datetime
from typing import Dict, List, Tuple

import google.generativeai as genai

from .config import app_name, get_env_str, model_name


INTRO_PROMPT = """You are the host of a concise, engaging audio morning brief called "{app_name}".
Audience: busy professionals on their morning commute.
Goal: a 5–10 minute spoken brief (~{target_words} words), focused, upbeat, and neutral in tone.

Guidelines:
- Start with a short highlights opener (10–20 seconds) summarizing key themes.
- Organize into clear SECTIONS with headers: "SECTION: <title>"
- For each section, cover 1–3 of the most relevant stories (titles/descriptions provided).
- Incorporate listener interests and the provided "RAG CONTEXT" to avoid repetition and emphasize preferences.
- Mention sources briefly ("via <Source>"); do not fabricate facts; stay within provided article titles/descriptions.
- Avoid stock tickers unless present; be careful with numbers.
- End with a brief outro suggesting what they might watch for today.

Output format:
- Uppercase "SECTION: <title>" lines for each section header.
- No markdown, no bullet characters. Natural spoken prose.
"""


def _format_articles(articles: List[Dict]) -> str:
	lines: List[str] = []
	for a in articles:
		title = a.get("title") or ""
		desc = a.get("description") or ""
		src = a.get("source") or ""
		url = a.get("url") or ""
		lines.append(f"- {title} — {desc} (via {src}) [{url}]")
	return "\n".join(lines)


def generate_brief(articles: List[Dict], interests: List[str], rag_context: str, target_words: int) -> Tuple[str, str]:
	"""
	Returns (summary_text, summary_id)
	"""
	api_key = get_env_str("GEMINI_API_KEY")
	if not api_key:
		raise RuntimeError("GEMINI_API_KEY not set")
	genai.configure(api_key=api_key)

	model = genai.GenerativeModel(model_name())
	prompt = INTRO_PROMPT.format(app_name=app_name(), target_words=target_words)

	interests_str = ", ".join(interests)
	articles_str = _format_articles(articles)

	full_prompt = f"""{prompt}

LISTENER INTERESTS:
{interests_str}

RAG CONTEXT (prior summaries and feedback, most relevant first):
{rag_context}

ARTICLES (last 24–48h):
{articles_str}

Please write ~{target_words} words total. Remember to produce 'SECTION: ' headers.
"""
	resp = model.generate_content(full_prompt)
	text = (resp.text or "").strip()
	summary_id = uuid.uuid4().hex
	return text, summary_id


def extract_section_titles(summary_text: str) -> List[str]:
	titles: List[str] = []
	for line in summary_text.splitlines():
		line_stripped = line.strip()
		if line_stripped.upper().startswith("SECTION:"):
			title = line_stripped.split(":", 1)[1].strip()
			titles.append(title)
	return titles

