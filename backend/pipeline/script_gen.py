"""Step 2 – Script Generation: create a narration script segmented by scenes."""

import json
import re
from anthropic import Anthropic
from config import config
from models import Script, Scene, PromptAnalysis

client = Anthropic(api_key=config.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are an expert video scriptwriter.
Write narration scripts that are compelling, natural-sounding for text-to-speech,
and precisely structured by scenes.
Always respond with valid JSON matching the schema exactly."""

USER_TEMPLATE = """Write a complete narration script for the following video.

Title: {title}
Topic: {topic}
Tone: {tone}
Style: {style}
Target duration: {duration} minutes
Language: {language}

Talking Points:
{talking_points}

Requirements:
- Structure: Hook → Context → [One scene per talking point] → Conclusion
- Natural TTS flow: no stage directions, no [PAUSE], no NARRATOR:, no timestamps
- Match the tone ({tone}) and style ({style})
- Smooth transitions between scenes
- Engaging hook and strong conclusion

Return ONLY this JSON (no markdown):
{{
  "full_text": "Complete narration as a single string (all scenes joined)",
  "scenes": [
    {{
      "scene_id": "scene_1",
      "name": "Hook",
      "narration": "The narration text for this scene only",
      "word_count": 75,
      "estimated_duration_seconds": 30,
      "visual_keywords": ["keyword1", "keyword2"]
    }}
  ],
  "total_word_count": 1500,
  "estimated_duration_minutes": {duration}
}}

Scene naming guide:
- scene_1: Hook (attention-grabbing opening)
- scene_2: Context / Background
- scene_3..N-1: One scene per talking point
- scene_N: Conclusion

Word count per scene should be proportional to talking point importance.
At {wpm} words per minute average narration speed."""

MODIFY_SYSTEM_PROMPT = """You are an expert video scriptwriter.
You will receive an existing narration script and a modification instruction.
Apply the modification while preserving the overall structure, tone, and style.
Always respond with valid JSON matching the schema exactly."""

MODIFY_TEMPLATE = """Here is an existing video narration script in JSON format:

{current_script}

Modification instruction: {instruction}

Rewrite the script applying the modification instruction exactly.
Return ONLY the same JSON schema (no markdown):
{{
  "full_text": "Complete narration as a single string",
  "scenes": [
    {{
      "scene_id": "scene_1",
      "name": "Hook",
      "narration": "...",
      "word_count": 75,
      "estimated_duration_seconds": 30,
      "visual_keywords": ["keyword1"]
    }}
  ],
  "total_word_count": 1500,
  "estimated_duration_minutes": 10
}}"""


def _parse_script_json(raw: str) -> Script:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)
    scenes = []
    for sd in data["scenes"]:
        scenes.append(
            Scene(
                scene_id=sd["scene_id"],
                name=sd["name"],
                narration=sd["narration"],
                word_count=sd.get("word_count", len(sd["narration"].split())),
                estimated_duration_seconds=sd.get("estimated_duration_seconds", 30),
                visual_keywords=sd.get("visual_keywords", []),
            )
        )
    full_text = data.get("full_text") or "\n\n".join(s.narration for s in scenes)
    return Script(
        full_text=full_text,
        scenes=scenes,
        total_word_count=data.get("total_word_count", len(full_text.split())),
        estimated_duration_minutes=float(data.get("estimated_duration_minutes", 10)),
    )


def generate_script(
    title: str,
    analysis: PromptAnalysis,
    target_duration: int,
) -> Script:
    talking_points_text = "\n".join(
        f"{tp.index}. {tp.title}: {tp.content}"
        for tp in analysis.talking_points
    )

    user_msg = USER_TEMPLATE.format(
        title=title,
        topic=analysis.topic,
        tone=analysis.tone,
        style=analysis.style,
        duration=target_duration,
        language=analysis.language,
        talking_points=talking_points_text,
        wpm=config.NARRATION_WPM,
    )

    response = client.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    return _parse_script_json(response.content[0].text)


def modify_script(current_script: Script, instruction: str) -> Script:
    """Modify an existing script based on a user instruction using Claude."""
    user_msg = MODIFY_TEMPLATE.format(
        current_script=json.dumps(current_script.model_dump(), indent=2),
        instruction=instruction,
    )

    response = client.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=8192,
        system=MODIFY_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    return _parse_script_json(response.content[0].text)
