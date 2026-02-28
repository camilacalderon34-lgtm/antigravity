"""Step 5 – Edit Blueprint: build the timeline plan for assembly."""

import json
import re
from anthropic import Anthropic
from config import config
from models import (
    Script,
    TTSResult,
    FootageResult,
    EditBlueprint,
    BlueprintScene,
    AssetItem,
)

client = Anthropic(api_key=config.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are a professional video editor AI.
Given a script, voiceover timing, and sourced footage, create a detailed edit plan.
Always respond with valid JSON matching the schema exactly."""

USER_TEMPLATE = """Create an edit blueprint for this video.

Title: {title}
Total duration: {duration:.1f} seconds
Video format: {video_format}
Tone: {tone}
Style: {style}

Scene list:
{scenes_summary}

For each scene decide:
- montage_type: one of [b-roll, zoom-image, sequence, map, text-overlay]
- pace: one of [slow, medium, fast]
- transition: one of [cut, dissolve, fade]

Choose pace based on:
- Hook scenes → fast
- Emotional/dramatic → slow
- Information-heavy → medium
- Countdowns/lists → medium-fast

Return ONLY this JSON (no markdown):
{{
  "scenes": [
    {{
      "scene_id": "scene_1",
      "montage_type": "b-roll",
      "pace": "fast",
      "transition": "cut"
    }}
  ]
}}"""


def build_blueprint(
    title: str,
    script: Script,
    tts_result: TTSResult,
    footage_result: FootageResult,
    video_format: str,
    tone: str,
    style: str,
) -> EditBlueprint:
    resolution = config.VIDEO_RESOLUTIONS.get(video_format, (1920, 1080))
    tts_map = {s["scene_id"]: s for s in tts_result.scenes}
    footage_map = {s.scene_id: s for s in footage_result.scenes}

    scenes_summary_lines = []
    for scene in script.scenes:
        timing = tts_map.get(scene.scene_id, {})
        duration = timing.get("duration", 30.0)
        has_video = footage_map.get(scene.scene_id, None)
        has_video_flag = "video" if has_video and has_video.primary_asset else "image-only"
        scenes_summary_lines.append(
            f"- {scene.scene_id} ({scene.name}, {duration:.1f}s, {has_video_flag}): {scene.narration[:80]}..."
        )

    scenes_summary = "\n".join(scenes_summary_lines)

    user_msg = USER_TEMPLATE.format(
        title=title,
        duration=tts_result.total_duration_seconds,
        video_format=video_format,
        tone=tone,
        style=style,
        scenes_summary=scenes_summary,
    )

    try:
        response = client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        claude_data = json.loads(raw)
        claude_scenes = {s["scene_id"]: s for s in claude_data.get("scenes", [])}
    except Exception:
        claude_scenes = {}

    # Build blueprint scenes
    blueprint_scenes = []
    for scene in script.scenes:
        timing = tts_map.get(scene.scene_id, {"start_time": 0, "end_time": 30, "duration": 30})
        fa = footage_map.get(scene.scene_id)
        primary = fa.primary_asset if fa else None
        secondaries = fa.secondary_assets if fa else []

        cd = claude_scenes.get(scene.scene_id, {})

        bp_scene = BlueprintScene(
            scene_id=scene.scene_id,
            scene_name=scene.name,
            start_time=timing.get("start_time", 0),
            end_time=timing.get("end_time", 30),
            duration=timing.get("duration", 30),
            narration_excerpt=scene.narration[:150],
            primary_asset=primary,
            secondary_assets=secondaries,
            montage_type=cd.get("montage_type", "b-roll"),
            pace=cd.get("pace", "medium"),
            transition=cd.get("transition", "cut"),
        )
        blueprint_scenes.append(bp_scene)

    return EditBlueprint(
        total_duration=tts_result.total_duration_seconds,
        video_format=video_format,
        resolution=resolution,
        fps=config.DEFAULT_FPS,
        scenes=blueprint_scenes,
    )
