from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from pmbrief.config import ensure_dirs, get_generation_settings, load_env
from pmbrief.db import (
	get_engine,
	init_db,
	load_profile,
	save_feedback,
	save_profile,
)
from pmbrief.news_fetcher import fetch_news
from pmbrief.rag_store import RAGStore
from pmbrief.summarizer import extract_section_titles, generate_brief
from pmbrief.tts_engine import synthesize_to_mp3
from pmbrief.utils import timestamp_string, write_text


class ProfileIn(BaseModel):
	interests: List[str] = Field(default_factory=list)


class FeedbackIn(BaseModel):
	summary_id: str
	rating: Optional[int] = Field(default=None, ge=1, le=5)
	likes: str = ""
	dislikes: str = ""


class GenerateIn(BaseModel):
	interests: Optional[List[str]] = None
	no_audio: bool = False


app = FastAPI(title="Personalized Morning Brief API", version="0.1.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],  # dev-friendly; lock down for prod
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
	load_env()
	dirs = ensure_dirs()
	engine = get_engine()
	init_db(engine)
	# Serve generated audio files
	app.mount("/audio", StaticFiles(directory=str(dirs["summaries_dir"])), name="audio")


@app.get("/health")
def health():
	return {"ok": True}


@app.get("/profile")
def get_profile():
	return load_profile()


@app.post("/profile")
def set_profile(body: ProfileIn):
	save_profile(body.interests)
	return load_profile()


@app.post("/brief/generate")
def generate(body: GenerateIn):
	load_env()
	dirs = ensure_dirs()
	settings = get_generation_settings()

	profile = load_profile()
	interests = body.interests if body.interests is not None else profile.get("interests", [])
	if not interests:
		raise HTTPException(status_code=400, detail="No interests provided or saved.")

	articles = fetch_news(
		interests=interests,
		hours=settings["lookback_hours"],
		max_articles=settings["max_articles"],
	)
	if not articles:
		articles = fetch_news(interests=interests, hours=48, max_articles=settings["max_articles"])
	if not articles:
		raise HTTPException(status_code=404, detail="No recent articles found.")

	vs = RAGStore(Path(dirs["vector_dir"]))
	vs.load()
	rag_docs = vs.retrieve(", ".join(interests), k=6)
	rag_context = "\n".join([d.page_content for d in rag_docs])

	summary_text, summary_id = generate_brief(
		articles=articles,
		interests=interests,
		rag_context=rag_context,
		target_words=settings["brief_target_words"],
	)
	if not summary_text:
		raise HTTPException(status_code=500, detail="Summary generation failed.")

	ts = timestamp_string()
	txt_path = Path(dirs["summaries_dir"]) / f"brief_{ts}.txt"
	write_text(txt_path, summary_text)
	vs.add_texts(
		[summary_text],
		metadatas=[{"type": "summary", "summary_id": summary_id, "timestamp": ts}],
	)
	vs.save()

	mp3_filename = f"brief_{ts}.mp3"
	mp3_path = Path(dirs["summaries_dir"]) / mp3_filename
	if not body.no_audio:
		synthesize_to_mp3(summary_text, mp3_path)

	return {
		"summary_id": summary_id,
		"text": summary_text,
		"sections": extract_section_titles(summary_text),
		"audio_url": f"/audio/{mp3_filename}" if (not body.no_audio) else None,
		"articles_used": articles,
	}


@app.post("/feedback")
def feedback(body: FeedbackIn):
	save_feedback(
		rating=body.rating,
		likes=body.likes,
		dislikes=body.dislikes,
		summary_id=body.summary_id,
	)
	# Also embed feedback into RAG so future briefs learn
	dirs = ensure_dirs()
	vs = RAGStore(Path(dirs["vector_dir"]))
	vs.load()
	texts = []
	if body.likes:
		texts.append(f"USER_FEEDBACK_LIKES: {body.likes}")
	if body.dislikes:
		texts.append(f"USER_FEEDBACK_DISLIKES: {body.dislikes}")
	if texts:
		vs.add_texts(texts, metadatas=[{"type": "feedback", "summary_id": body.summary_id}] * len(texts))
		vs.save()
	return {"ok": True}

