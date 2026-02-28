"""Step 6 – Video Assembly: combine footage + voice into final video using MoviePy."""

import os
import shutil
from pathlib import Path
from typing import List, Optional

from config import config
from models import EditBlueprint, BlueprintScene, AssetItem, EditResult

# MoviePy imports — handle both 1.x and 2.x gracefully
try:
    from moviepy.editor import (
        VideoFileClip,
        AudioFileClip,
        ImageClip,
        concatenate_videoclips,
        CompositeAudioClip,
    )
    import moviepy.editor as mpy
    MOVIEPY_AVAILABLE = True
except ImportError:
    try:
        from moviepy import (
            VideoFileClip,
            AudioFileClip,
            ImageClip,
            concatenate_videoclips,
            CompositeAudioClip,
        )
        import moviepy as mpy
        MOVIEPY_AVAILABLE = True
    except ImportError:
        MOVIEPY_AVAILABLE = False


def _resize_clip(clip, target_w: int, target_h: int):
    """Resize clip to fill target resolution, cropping if needed."""
    clip_w, clip_h = clip.w, clip.h
    scale = max(target_w / clip_w, target_h / clip_h)
    new_w = int(clip_w * scale)
    new_h = int(clip_h * scale)
    clip = clip.resize((new_w, new_h))
    # Crop to exact size
    x1 = (new_w - target_w) // 2
    y1 = (new_h - target_h) // 2
    clip = clip.crop(x1=x1, y1=y1, x2=x1 + target_w, y2=y1 + target_h)
    return clip


def _make_image_clip(asset: AssetItem, duration: float, target_w: int, target_h: int):
    """Create a video clip from a still image with subtle ken burns zoom."""
    from PIL import Image
    import numpy as np

    img = Image.open(asset.local_path).convert("RGB")
    # Upscale image slightly to allow zoom without black bars
    pad_w = int(target_w * 1.15)
    pad_h = int(target_h * 1.15)
    img = img.resize((pad_w, pad_h), Image.LANCZOS)
    img_array = np.array(img)

    def make_frame(t):
        progress = t / max(duration, 1)
        zoom = 1.0 + 0.08 * progress  # subtle 8% zoom over clip duration
        new_w = int(pad_w / zoom)
        new_h = int(pad_h / zoom)
        x1 = (pad_w - new_w) // 2
        y1 = (pad_h - new_h) // 2
        cropped = img_array[y1 : y1 + new_h, x1 : x1 + new_w]
        resized = Image.fromarray(cropped).resize((target_w, target_h), Image.LANCZOS)
        return np.array(resized)

    clip = mpy.VideoClip(make_frame, duration=duration)
    clip = clip.set_fps(config.DEFAULT_FPS)
    return clip


def _clip_for_scene(
    scene: BlueprintScene,
    target_w: int,
    target_h: int,
    fallback_color: tuple = (10, 10, 10),
) -> object:
    """Build a video clip for a scene, handling video, image, and fallback."""
    duration = scene.duration
    asset = scene.primary_asset

    if asset is None:
        # Solid black fallback
        clip = mpy.ColorClip(size=(target_w, target_h), color=fallback_color, duration=duration)
        return clip

    local = asset.local_path
    if not os.path.exists(local):
        clip = mpy.ColorClip(size=(target_w, target_h), color=fallback_color, duration=duration)
        return clip

    if asset.asset_type == "image":
        return _make_image_clip(asset, duration, target_w, target_h)

    # Video clip
    try:
        raw = VideoFileClip(local, audio=False)
        # Loop if shorter than needed
        if raw.duration < duration:
            loops = int(duration / raw.duration) + 1
            raw = concatenate_videoclips([raw] * loops)
        raw = raw.subclip(0, duration)
        raw = _resize_clip(raw, target_w, target_h)
        return raw
    except Exception as e:
        print(f"[editor] Error loading video {local}: {e}")
        # Try secondary asset
        for sec in scene.secondary_assets:
            if not os.path.exists(sec.local_path):
                continue
            try:
                raw2 = VideoFileClip(sec.local_path, audio=False)
                if raw2.duration < duration:
                    loops = int(duration / raw2.duration) + 1
                    raw2 = concatenate_videoclips([raw2] * loops)
                raw2 = raw2.subclip(0, duration)
                raw2 = _resize_clip(raw2, target_w, target_h)
                return raw2
            except Exception:
                pass
        return mpy.ColorClip(size=(target_w, target_h), color=fallback_color, duration=duration)


def assemble_video(
    blueprint: EditBlueprint,
    audio_path: str,
    job_dir: Path,
    add_background_music: bool = True,
) -> EditResult:
    if not MOVIEPY_AVAILABLE:
        raise RuntimeError(
            "MoviePy is not installed. Run: pip install moviepy"
        )

    target_w, target_h = blueprint.resolution
    fps = blueprint.fps
    temp_dir = job_dir / "temp_clips"
    temp_dir.mkdir(parents=True, exist_ok=True)

    # Build scene clips
    scene_clips = []
    for scene in blueprint.scenes:
        print(f"[editor] Building clip for scene: {scene.scene_name}")
        clip = _clip_for_scene(scene, target_w, target_h)
        scene_clips.append(clip)

    if not scene_clips:
        raise RuntimeError("No scene clips could be created.")

    # Concatenate
    print("[editor] Concatenating clips...")
    final_video = concatenate_videoclips(scene_clips, method="compose")

    # Load voiceover
    print("[editor] Loading voiceover...")
    voiceover = AudioFileClip(audio_path)

    # Trim / extend video to match audio duration
    audio_duration = voiceover.duration
    if final_video.duration > audio_duration:
        final_video = final_video.subclip(0, audio_duration)
    elif final_video.duration < audio_duration:
        # Extend last frame
        last_frame_duration = audio_duration - final_video.duration
        last_clip = mpy.ColorClip(
            size=(target_w, target_h),
            color=(10, 10, 10),
            duration=last_frame_duration,
        )
        final_video = concatenate_videoclips([final_video, last_clip], method="compose")

    # Optionally add background music
    audio_tracks = [voiceover]

    if add_background_music:
        # Use a generated low-frequency audio bed (no external music needed)
        # In production you'd load an actual royalty-free music file
        pass  # Skip music for now to keep it simple

    if len(audio_tracks) == 1:
        final_audio = audio_tracks[0]
    else:
        final_audio = CompositeAudioClip(audio_tracks)

    final_video = final_video.set_audio(final_audio)
    final_video = final_video.set_fps(fps)

    out_path = job_dir / "assembled_video.mp4"
    print(f"[editor] Rendering final video to {out_path} ...")
    final_video.write_videofile(
        str(out_path),
        fps=fps,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile=str(temp_dir / "temp_audio.m4a"),
        remove_temp=True,
        logger=None,
    )

    # Cleanup temp clips
    for clip in scene_clips:
        try:
            clip.close()
        except Exception:
            pass
    try:
        voiceover.close()
    except Exception:
        pass
    try:
        final_video.close()
    except Exception:
        pass

    return EditResult(
        video_path=str(out_path),
        duration_seconds=audio_duration,
    )
