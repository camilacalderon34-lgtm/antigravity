import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    PEXELS_API_KEY: str    = os.getenv("PEXELS_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")

    OUTPUT_DIR: Path = Path(os.getenv("OUTPUT_DIR", "outputs"))
    TEMP_DIR:   Path = Path(os.getenv("TEMP_DIR",   "temp"))

    DEFAULT_FPS: int = 30
    DEFAULT_VIDEO_FORMAT: str = "16:9"
    VIDEO_RESOLUTIONS: dict = {
        "16:9": (1920, 1080),
        "9:16": (1080, 1920),
    }

    # ElevenLabs TTS
    ELEVENLABS_MODEL: str = "eleven_turbo_v2_5"

    # Claude
    CLAUDE_MODEL: str = "claude-sonnet-4-6"

    # Pexels
    PEXELS_VIDEO_API: str = "https://api.pexels.com/videos/search"
    PEXELS_PHOTO_API: str = "https://api.pexels.com/v1/search"
    PEXELS_PER_PAGE:  int = 5

    # Words per minute for duration estimation
    NARRATION_WPM: int = 150


config = Config()

# ElevenLabs voices (voice_id → display info)
AVAILABLE_VOICES = [
    {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel",  "description": "Warm, calm — narration & docs", "gender": "female"},
    {"id": "29vD33N1CtxCmqQRPOHJ", "name": "Drew",    "description": "Well-rounded — storytelling",    "gender": "male"},
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah",   "description": "Soft, natural — journalism",     "gender": "female"},
    {"id": "TX3LPaxmHKxFdv7VOQHJ", "name": "Liam",    "description": "Crisp, clear — documentary",     "gender": "male"},
]
