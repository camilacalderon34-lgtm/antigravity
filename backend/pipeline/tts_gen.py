"""Step 3 – TTS Generation using ElevenLabs API.

Uses PCM output format (pcm_44100) to avoid ffmpeg/pydub dependencies.
Audio is concatenated as numpy arrays and saved as WAV via soundfile.
"""

import numpy as np
import soundfile as sf
from pathlib import Path

from config import config
from models import Script, TTSResult

SAMPLE_RATE = 44100
SILENCE_SAMPLES = int(SAMPLE_RATE * 0.45)  # 450 ms gap between scenes


def generate_tts(script: Script, voice_id: str, job_dir: Path) -> TTSResult:
    """Generate voiceover for the full script scene-by-scene via ElevenLabs."""
    from elevenlabs.client import ElevenLabs

    client = ElevenLabs(api_key=config.ELEVENLABS_API_KEY)

    all_parts: list[np.ndarray] = []
    scene_timings: list[dict] = []
    elapsed = 0.0

    for i, scene in enumerate(script.scenes):
        print(f"[tts] Scene {i + 1}/{len(script.scenes)}: {len(scene.narration.split())} words")
        try:
            audio_bytes = b"".join(
                client.text_to_speech.convert(
                    text=scene.narration,
                    voice_id=voice_id,
                    model_id=config.ELEVENLABS_MODEL,
                    output_format="pcm_44100",
                )
            )
            # PCM 16-bit → float32 [-1, 1]
            samples = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        except Exception as e:
            print(f"[tts] Scene {i + 1} failed: {e}")
            samples = np.zeros(SAMPLE_RATE * 2, dtype=np.float32)

        duration = len(samples) / SAMPLE_RATE
        scene_timings.append({
            "scene_id": scene.scene_id,
            "start_time": round(elapsed, 2),
            "end_time": round(elapsed + duration, 2),
            "duration": round(duration, 2),
        })
        elapsed += duration

        all_parts.append(samples)
        if i < len(script.scenes) - 1:
            all_parts.append(np.zeros(SILENCE_SAMPLES, dtype=np.float32))
            elapsed += SILENCE_SAMPLES / SAMPLE_RATE

    final_audio = np.concatenate(all_parts) if all_parts else np.zeros(SAMPLE_RATE, dtype=np.float32)

    audio_path = job_dir / "voiceover.wav"
    sf.write(str(audio_path), final_audio, SAMPLE_RATE)
    print(f"[tts] Saved {len(final_audio) / SAMPLE_RATE:.1f}s voiceover → {audio_path}")

    return TTSResult(
        audio_path=str(audio_path),
        total_duration_seconds=round(len(final_audio) / SAMPLE_RATE, 2),
        scenes=scene_timings,
    )
