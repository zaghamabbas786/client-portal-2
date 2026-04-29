"""Decompress all manifest assets to portal2/unpacked/."""
import base64
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html_path = ROOT / "Vivid Capital Portal _standalone_.html"
out_dir = ROOT / "unpacked"
out_dir.mkdir(exist_ok=True)

text = html_path.read_text(encoding="utf-8", errors="replace")
m = re.search(
    r'<script[^>]*type=["\']__bundler/manifest["\'][^>]*>(.*?)</script>',
    text,
    re.DOTALL,
)
manifest = json.loads(m.group(1))

for uuid, entry in manifest.items():
    raw = base64.b64decode(entry["data"])
    if entry.get("compressed"):
        raw = gzip.decompress(raw)
    ext = ".bin"
    mt = entry.get("mime", "")
    if "javascript" in mt:
        ext = ".js"
    elif "woff2" in mt:
        ext = ".woff2"
    elif "css" in mt:
        ext = ".css"
    elif "html" in mt:
        ext = ".html"
    path = out_dir / f"{uuid}{ext}"
    path.write_bytes(raw)
    print(uuid[:8], mt, len(raw), "->", path.name)
