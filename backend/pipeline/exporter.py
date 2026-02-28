"""Step 7 – Export & Delivery: organise all deliverables into output directory."""

import json
import shutil
from pathlib import Path
from datetime import datetime

from models import (
    Script,
    TTSResult,
    FootageResult,
    EditBlueprint,
    EditResult,
    ExportResult,
)


def export_deliverables(
    job_id: str,
    title: str,
    script: Script,
    tts_result: TTSResult,
    footage_result: FootageResult,
    blueprint: EditBlueprint,
    edit_result: EditResult,
    output_base: Path,
) -> ExportResult:
    out_dir = output_base / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # ── 1. Final video ────────────────────────────────────────────────────────
    final_video_path = out_dir / "final_video.mp4"
    shutil.copy2(edit_result.video_path, final_video_path)

    # ── 2. Script ─────────────────────────────────────────────────────────────
    script_path = out_dir / "script.txt"
    script_lines = [f"# {title}", f"Generated: {datetime.utcnow().isoformat()}", ""]
    for scene in script.scenes:
        script_lines.append(f"## {scene.name}")
        script_lines.append(scene.narration)
        script_lines.append("")
    script_path.write_text("\n".join(script_lines), encoding="utf-8")

    # ── 3. Voiceover ─────────────────────────────────────────────────────────
    voiceover_dest = out_dir / "voiceover.mp3"
    shutil.copy2(tts_result.audio_path, voiceover_dest)

    # ── 4. Asset list ─────────────────────────────────────────────────────────
    asset_data = []
    for sa in footage_result.scenes:
        if sa.primary_asset:
            asset_data.append(
                {
                    "scene": sa.scene_name,
                    "type": sa.primary_asset.asset_type,
                    "source": sa.primary_asset.source,
                    "url": sa.primary_asset.url,
                    "license": sa.primary_asset.license,
                    "pexels_id": sa.primary_asset.pexels_id,
                }
            )
        for sec in sa.secondary_assets:
            asset_data.append(
                {
                    "scene": sa.scene_name + " (secondary)",
                    "type": sec.asset_type,
                    "source": sec.source,
                    "url": sec.url,
                    "license": sec.license,
                    "pexels_id": sec.pexels_id,
                }
            )
    asset_list_path = out_dir / "assets.json"
    asset_list_path.write_text(json.dumps(asset_data, indent=2), encoding="utf-8")

    # ── 5. Timeline ───────────────────────────────────────────────────────────
    timeline_data = {
        "title": title,
        "total_duration_seconds": blueprint.total_duration,
        "video_format": blueprint.video_format,
        "resolution": list(blueprint.resolution),
        "fps": blueprint.fps,
        "scenes": [
            {
                "scene_id": s.scene_id,
                "name": s.scene_name,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "duration": s.duration,
                "montage_type": s.montage_type,
                "pace": s.pace,
                "transition": s.transition,
                "has_video": s.primary_asset is not None and s.primary_asset.asset_type == "video",
                "narration_excerpt": s.narration_excerpt,
            }
            for s in blueprint.scenes
        ],
    }
    timeline_path = out_dir / "timeline.json"
    timeline_path.write_text(json.dumps(timeline_data, indent=2), encoding="utf-8")

    return ExportResult(
        final_video=str(final_video_path),
        script_file=str(script_path),
        voiceover_file=str(voiceover_dest),
        asset_list_file=str(asset_list_path),
        timeline_file=str(timeline_path),
        duration_seconds=edit_result.duration_seconds,
    )
