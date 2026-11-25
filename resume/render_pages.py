"""Render resume.pdf to one PNG per page for the site's Resume page (images/resume-1.png, resume-2.png, ...)
and refresh the <img> list in resume.html between its resume-pages markers.

Usage:  python resume/render_pages.py        (requires: pip install pymupdf)
Run it after build_resume.py so the on-page resume always matches the PDF.
"""
import re
from pathlib import Path

import pymupdf  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
ZOOM = 3  # 3x the PDF's 72 dpi, about 216 dpi: crisp when the page is shown ~1100px wide


def render():
    for old in (ROOT / "images").glob("resume-*.png"):
        old.unlink()
    doc = pymupdf.open(ROOT / "resume.pdf")
    for i, page in enumerate(doc, 1):
        out = ROOT / "images" / f"resume-{i}.png"
        page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), alpha=False).save(out)
        print(f"Wrote {out.name}")
    imgs = "\n".join(
        f'        <img class="resume-page" src="images/resume-{i}.png" alt="Resume, page {i}">' for i in range(1, len(doc) + 1)
    )
    html = (ROOT / "resume.html").read_text()
    html = re.sub(
        r"<!-- resume-pages:start -->.*?<!-- resume-pages:end -->",
        lambda m: f"<!-- resume-pages:start -->\n{imgs}\n        <!-- resume-pages:end -->",
        html, flags=re.S,
    )
    (ROOT / "resume.html").write_text(html)
    print(f"{len(doc)} page(s)")


if __name__ == "__main__":
    render()
