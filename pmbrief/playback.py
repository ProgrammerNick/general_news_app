from __future__ import annotations

import os
import sys
import time
from pathlib import Path


def play_audio(path: Path) -> None:
	"""
	Try playsound first; on Windows fallback to os.startfile.
	"""
	path = Path(path)
	try:
		from playsound import playsound
		playsound(str(path))
		return
	except Exception:
		pass

	# Windows fallback
	if sys.platform.startswith("win"):
		try:
			os.startfile(str(path))  # type: ignore[attr-defined]
			# Give it a moment to launch the default player
			time.sleep(1.0)
			return
		except Exception:
			pass
	# As a last resort, do nothing (user can open the file manually)
	return

