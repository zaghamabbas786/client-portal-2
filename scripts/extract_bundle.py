"""Extract bundler manifest/template from standalone HTML."""
import json
import re
import sys
from pathlib import Path

html_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "Vivid Capital Portal _standalone_.html"
text = html_path.read_text(encoding="utf-8", errors="replace")

m = re.search(
    r'<script[^>]*type=["\']__bundler/manifest["\'][^>]*>(.*?)</script>',
    text,
    re.DOTALL,
)
print("manifest found", bool(m), "inner len", len(m.group(1)) if m else 0)
if m:
    man = json.loads(m.group(1))
    print("uuids", len(man))
    for k, v in list(man.items())[:3]:
        print(" ", k[:12], v.get("mime"), "compressed", v.get("compressed"), "b64", len(v.get("data", "")))

t = re.search(
    r'<script[^>]*type=["\']__bundler/template["\'][^>]*>(.*?)</script>',
    text,
    re.DOTALL,
)
print("template found", bool(t), "inner len", len(t.group(1)) if t else 0)
if t:
    tpl = json.loads(t.group(1))
    assert isinstance(tpl, str)
    out = Path(__file__).resolve().parents[1] / "_extracted_template.html"
    out.write_text(tpl, encoding="utf-8")
    print("wrote", out, "chars", len(tpl))
    print("start:\n", tpl[:2000])
