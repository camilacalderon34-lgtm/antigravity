"""Step 4 – Footage Sourcing: search and download visual assets from Pexels."""

import os
import re
import requests
from pathlib import Path
from typing import List, Optional
from config import config
from models import Script, TTSResult, AssetItem, SceneAssets, FootageResult

HEADERS = {"Authorization": config.PEXELS_API_KEY}


def _search_pexels_videos(query: str, per_page: int = 5) -> List[dict]:
    """Return a list of Pexels video objects matching the query."""
    try:
        r = requests.get(
            config.PEXELS_VIDEO_API,
            headers=HEADERS,
            params={"query": query, "per_page": per_page, "orientation": "landscape"},
            timeout=10,
        )
        r.raise_for_status()
        return r.json().get("videos", [])
    except Exception:
        return []


def _search_pexels_photos(query: str, per_page: int = 5) -> List[dict]:
    """Return a list of Pexels photo objects matching the query."""
    try:
        r = requests.get(
            config.PEXELS_PHOTO_API,
            headers=HEADERS,
            params={"query": query, "per_page": per_page},
            timeout=10,
        )
        r.raise_for_status()
        return r.json().get("photos", [])
    except Exception:
        return []


def _best_video_file(video: dict, target_w: int = 1920) -> Optional[dict]:
    """Pick the highest-quality video file closest to target width."""
    files = video.get("video_files", [])
    mp4_files = [f for f in files if f.get("file_type") == "video/mp4"]
    if not mp4_files:
        return None
    mp4_files.sort(key=lambda f: abs(f.get("width", 0) - target_w))
    return mp4_files[0]


def _download_file(url: str, dest: Path) -> bool:
    """Download a URL to dest path. Returns True on success."""
    try:
        # Remove query params that might cause issues
        clean_url = url.split("?")[0] if "player.vimeo" not in url else url
        r = requests.get(url, stream=True, timeout=30)
        r.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"[footage] Download failed {url}: {e}")
        return False


def _safe_filename(text: str, max_len: int = 40) -> str:
    return re.sub(r"[^\w\-]", "_", text)[:max_len]


def source_footage(
    script: Script,
    tts_result: TTSResult,
    job_dir: Path,
    video_format: str = "16:9",
) -> FootageResult:
    footage_dir = job_dir / "footage"
    footage_dir.mkdir(parents=True, exist_ok=True)

    tts_map = {s["scene_id"]: s for s in tts_result.scenes}
    scene_assets_list: List[SceneAssets] = []

    for scene in script.scenes:
        timing = tts_map.get(scene.scene_id, {})
        duration = timing.get("duration", 30.0)
        keywords = scene.visual_keywords or [scene.name]

        primary: Optional[AssetItem] = None
        secondaries: List[AssetItem] = []

        for kw_idx, keyword in enumerate(keywords[:3]):  # Try up to 3 keywords
            if primary is not None:
                break

            videos = _search_pexels_videos(keyword, per_page=3)
            for vid in videos:
                vf = _best_video_file(vid)
                if vf is None:
                    continue
                dl_url = vf.get("link", "")
                if not dl_url:
                    continue
                ext = ".mp4"
                fname = f"{scene.scene_id}_{_safe_filename(keyword)}_0{ext}"
                dest = footage_dir / fname
                if not dest.exists():
                    ok = _download_file(dl_url, dest)
                    if not ok:
                        continue
                if dest.exists():
                    primary = AssetItem(
                        asset_type="video",
                        url=dl_url,
                        local_path=str(dest),
                        duration=float(vid.get("duration", 0)),
                        width=vf.get("width", 1920),
                        height=vf.get("height", 1080),
                        source="pexels",
                        license="Pexels License",
                        pexels_id=vid.get("id"),
                        keywords_matched=[keyword],
                    )
                    break

            # Fallback to image if no video found
            if primary is None:
                photos = _search_pexels_photos(keyword, per_page=3)
                for photo in photos:
                    img_url = photo.get("src", {}).get("large2x") or photo.get("src", {}).get("original")
                    if not img_url:
                        continue
                    ext = ".jpg"
                    fname = f"{scene.scene_id}_{_safe_filename(keyword)}_img{ext}"
                    dest = footage_dir / fname
                    if not dest.exists():
                        ok = _download_file(img_url, dest)
                        if not ok:
                            continue
                    if dest.exists():
                        primary = AssetItem(
                            asset_type="image",
                            url=img_url,
                            local_path=str(dest),
                            width=photo.get("width", 1920),
                            height=photo.get("height", 1080),
                            source="pexels",
                            license="Pexels License",
                            pexels_id=photo.get("id"),
                            keywords_matched=[keyword],
                        )
                        break

        # Grab one secondary clip for variety
        if len(keywords) > 1:
            alt_kw = keywords[1] if len(keywords) > 1 else keywords[0]
            videos2 = _search_pexels_videos(f"{alt_kw} detail", per_page=2)
            for vid2 in videos2:
                vf2 = _best_video_file(vid2)
                if vf2 is None:
                    continue
                dl_url2 = vf2.get("link", "")
                if not dl_url2:
                    continue
                fname2 = f"{scene.scene_id}_{_safe_filename(alt_kw)}_1.mp4"
                dest2 = footage_dir / fname2
                if not dest2.exists():
                    ok2 = _download_file(dl_url2, dest2)
                    if not ok2:
                        continue
                if dest2.exists():
                    secondaries.append(
                        AssetItem(
                            asset_type="video",
                            url=dl_url2,
                            local_path=str(dest2),
                            duration=float(vid2.get("duration", 0)),
                            width=vf2.get("width", 1920),
                            height=vf2.get("height", 1080),
                            source="pexels",
                            license="Pexels License",
                            pexels_id=vid2.get("id"),
                            keywords_matched=[alt_kw],
                        )
                    )
                    break

        scene_assets_list.append(
            SceneAssets(
                scene_id=scene.scene_id,
                scene_name=scene.name,
                duration=duration,
                primary_asset=primary,
                secondary_assets=secondaries,
            )
        )

    return FootageResult(scenes=scene_assets_list)
