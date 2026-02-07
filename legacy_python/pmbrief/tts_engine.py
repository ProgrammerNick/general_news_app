from __future__ import annotations

import json
from pathlib import Path

from gtts import gTTS

from .config import get_env_str


def _use_gcloud() -> bool:
	return (get_env_str("TTS_PROVIDER", "gtts") or "gtts").lower() == "gcloud"


def synthesize_to_mp3(text: str, out_path: Path) -> Path:
	out_path = Path(out_path)
	out_path.parent.mkdir(parents=True, exist_ok=True)

	if _use_gcloud():
		try:
			from google.cloud import texttospeech
			creds_json = get_env_str("GOOGLE_TTS_SERVICE_ACCOUNT_JSON")
			if creds_json:
				# Use JSON creds string if provided
				from google.oauth2.service_account import Credentials

				info = json.loads(creds_json)
				creds = Credentials.from_service_account_info(info)
				client = texttospeech.TextToSpeechClient(credentials=creds)
			else:
				# Otherwise rely on GOOGLE_APPLICATION_CREDENTIALS file path
				client = texttospeech.TextToSpeechClient()

			input_text = texttospeech.SynthesisInput(text=text)
			voice_name = get_env_str("AUDIO_VOICE", "en-US-Neural2-C")
			voice_params = texttospeech.VoiceSelectionParams(
				language_code="-".join(voice_name.split("-")[:2]),
				name=voice_name,
			)
			audio_config = texttospeech.AudioConfig(
				audio_encoding=texttospeech.AudioEncoding.MP3
			)
			response = client.synthesize_speech(
				input=input_text, voice=voice_params, audio_config=audio_config
			)
			out_path.write_bytes(response.audio_content)
			return out_path
		except Exception:
			# Fallback to gTTS on any error
			pass

	# gTTS fallback/default
	tts = gTTS(text=text, lang="en")
	tts.save(str(out_path))
	return out_path

