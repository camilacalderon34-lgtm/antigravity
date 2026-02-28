"""Step 1 – Prompt Analysis: extract structure, tone, visual elements via Claude."""

import json
import re
from anthropic import Anthropic
from config import config
from models import PromptAnalysis, TalkingPoint

client = Anthropic(api_key=config.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are a professional video script analyst.
Given a video title and a user prompt, extract structured editorial information.
Always respond with valid JSON matching the schema exactly — no extra keys, no markdown."""

USER_TEMPLATE = """Analyze the following video request and return a JSON object.

Title: {title}
Type: {video_type}
Target duration: {duration} minutes
Language: {language}

User Prompt:
{prompt}

Return ONLY this JSON structure (no markdown, no explanation):
{{
  "topic": "concise description of the main subject",
  "talking_points": [
    {{
      "index": 1,
      "title": "point title",
      "content": "what this point covers",
      "visual_keywords": ["keyword1", "keyword2", "keyword3"]
    }}
  ],
  "tone": "one of: serious | mysterious | urgent | educational | entertaining | neutral",
  "style": "one of: documentary | top10 | mystery | news | educational",
  "estimated_duration_minutes": {duration},
  "visual_elements": ["specific visual element 1", "specific visual element 2"],
  "language": "{language}"
}}

Rules:
- Extract 4–10 talking points based on the prompt and target duration
- visual_keywords must be concrete, searchable terms (e.g. "NASA spacecraft", not "space stuff")
- visual_elements should list key visuals needed across the whole video
- Do NOT invent facts not present in the prompt"""


def analyze_prompt(
    title: str,
    prompt: str,
    video_type: str,
    target_duration: int,
    language: str,
) -> PromptAnalysis:
    user_msg = USER_TEMPLATE.format(
        title=title,
        prompt=prompt,
        video_type=video_type,
        duration=target_duration,
        language=language,
    )

    response = client.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = response.content[0].text.strip()
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)

    talking_points = [TalkingPoint(**tp) for tp in data["talking_points"]]

    return PromptAnalysis(
        topic=data["topic"],
        talking_points=talking_points,
        tone=data["tone"],
        style=data["style"],
        estimated_duration_minutes=float(data["estimated_duration_minutes"]),
        visual_elements=data.get("visual_elements", []),
        language=data.get("language", language),
    )
