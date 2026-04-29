"""Write globals.css from extracted template with /fonts/ URLs."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "_extracted_template.html").read_text(encoding="utf-8")
styles = re.findall(r"<style[^>]*>(.*?)</style>", html, re.DOTALL)
main = "\n\n".join(styles) if styles else ""


def rep(m: re.Match) -> str:
    u = m.group(1)
    return f"url('/fonts/{u}.woff2')"


out = re.sub(r'url\("([a-f0-9-]{36})"\)', rep, main)
dest = ROOT / "src" / "app" / "globals.css"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out, encoding="utf-8")
print("wrote", dest, "bytes", len(out.encode()))
