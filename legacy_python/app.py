from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import List

from colorama import Fore, Style
from tqdm import tqdm

from pmbrief.config import (
	ensure_dirs,
	get_env_str,
	get_generation_settings,
	load_env,
)
from pmbrief.db import init_db, load_profile, save_feedback, save_profile, get_engine
from pmbrief.news_fetcher import fetch_news
from pmbrief.playback import play_audio
from pmbrief.rag_store import RAGStore
from pmbrief.summarizer import extract_section_titles, generate_brief
from pmbrief.tts_engine import synthesize_to_mp3
from pmbrief.utils import parse_interests, timestamp_string, write_text


def onboard_interests(auto: bool) -> List[str]:
	profile = load_profile()
	interests: List[str] = profile.get("interests", [])
	if interests and auto:
		return interests
	if interests:
		print(f"{Fore.CYAN}Existing interests:{Style.RESET_ALL} {', '.join(interests)}")
		choice = input("Update interests? (y/N): ").strip().lower()
		if choice not in ("y", "yes"):
			return interests
	raw = input(
		"Enter your interests (comma-separated). Example: fixed income markets, software, M&A\n> "
	)
	interests = parse_interests(raw)
	save_profile(interests)
	return interests


def run_once(auto: bool, no_play: bool) -> None:
	load_env()
	dirs = ensure_dirs()
	engine = get_engine()
	init_db(engine)

	settings = get_generation_settings()

	# Onboard
	if auto and not load_profile().get("interests"):
		print(f"{Fore.CYAN}No saved interests found. Switching to interactive setup...{Style.RESET_ALL}")
		auto = False
	interests = load_profile().get("interests") if auto else onboard_interests(auto)
	if not interests:
		print(f"{Fore.RED}No interests provided. Exiting.{Style.RESET_ALL}")
		return

	# Fetch news
	print(f"{Fore.GREEN}Fetching recent news...{Style.RESET_ALL}")
	articles = fetch_news(
		interests=interests,
		hours=settings["lookback_hours"],
		max_articles=settings["max_articles"],
	)
	if not articles:
		print(f"{Fore.YELLOW}No recent articles found; expanding window to 48h...{Style.RESET_ALL}")
		articles = fetch_news(interests=interests, hours=48, max_articles=settings["max_articles"])
	if not articles:
		print(f"{Fore.RED}Still no articles found. Try adjusting interests or API key limits.{Style.RESET_ALL}")
		return

	# RAG load and retrieve
	vs = RAGStore(Path(dirs["vector_dir"]))
	vs.load()
	rag_docs = vs.retrieve(", ".join(interests), k=6)
	rag_context = "\n".join([d.page_content for d in rag_docs])

	# Generate brief with Gemini
	print(f"{Fore.GREEN}Generating your morning brief with Gemini...{Style.RESET_ALL}")
	summary_text, summary_id = generate_brief(
		articles=articles,
		interests=interests,
		rag_context=rag_context,
		target_words=settings["brief_target_words"],
	)
	if not summary_text:
		print(f"{Fore.RED}No summary generated. Check your GEMINI_API_KEY.{Style.RESET_ALL}")
		return

	# Persist: save text, add to vector store
	ts = timestamp_string()
	txt_path = Path(dirs["summaries_dir"]) / f"brief_{ts}.txt"
	write_text(txt_path, summary_text)
	vs.add_texts([summary_text], metadatas=[{"type": "summary", "summary_id": summary_id, "timestamp": ts}])
	vs.save()

	# TTS
	print(f"{Fore.GREEN}Synthesizing audio...{Style.RESET_ALL}")
	mp3_path = Path(dirs["summaries_dir"]) / f"brief_{ts}.mp3"
	synthesize_to_mp3(summary_text, mp3_path)
	print(f"{Fore.CYAN}Saved audio:{Style.RESET_ALL} {mp3_path}")

	# Playback
	if not no_play:
		print(f"{Fore.GREEN}Playing audio...{Style.RESET_ALL}")
		play_audio(mp3_path)

	# Feedback
	print(f"{Fore.CYAN}Feedback helps personalize future briefs.{Style.RESET_ALL}")
	try:
		rating_raw = input("Rate this brief (1-5, Enter to skip): ").strip()
		rating = int(rating_raw) if rating_raw else None
	except Exception:
		rating = None
	likes = input("What did you like or want MORE of? (comma-separated, Enter to skip): ").strip()
	dislikes = input("What did you want LESS of? (comma-separated, Enter to skip): ").strip()

	# Save feedback to DB/JSON
	save_feedback(rating=rating, likes=likes, dislikes=dislikes, summary_id=summary_id)

	# Add feedback to RAG
	feedback_docs = []
	if likes:
		feedback_docs.append(f"USER_FEEDBACK_LIKES: {likes}")
	if dislikes:
		feedback_docs.append(f"USER_FEEDBACK_DISLIKES: {dislikes}")
	if feedback_docs:
		vs.add_texts(feedback_docs, metadatas=[{"type": "feedback", "summary_id": summary_id}] * len(feedback_docs))
		vs.save()

	# Optionally adjust interests (simple heuristic)
	if likes:
		cur_interests = load_profile().get("interests", [])
		more = parse_interests(likes)
		augmented = cur_interests + [t for t in more if t.lower() not in {c.lower() for c in cur_interests}]
		if augmented != cur_interests:
			save_profile(augmented)
			print(f"{Fore.GREEN}Added liked topics to interests.{Style.RESET_ALL}")

	print(f"{Fore.GREEN}Done.{Style.RESET_ALL}")


def main():
	parser = argparse.ArgumentParser(prog="Personalized Morning Brief")
	parser.add_argument("--auto", action="store_true", help="Non-interactive; use saved interests.")
	parser.add_argument("--no-play", action="store_true", help="Skip audio playback.")
	parser.add_argument(
		"--loop", action="store_true", help="Run daily (simple 24h loop)."
	)
	args = parser.parse_args()

	if args.loop:
		while True:
			try:
				run_once(auto=args.auto, no_play=args.no_play)
			except KeyboardInterrupt:
				print("\nExiting loop.")
				sys.exit(0)
			# Sleep ~24 hours
			time.sleep(24 * 60 * 60)
	else:
		run_once(auto=args.auto, no_play=args.no_play)


if __name__ == "__main__":
	main()

