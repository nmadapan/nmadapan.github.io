"""Build resume.pdf (ATS-friendly, selectable text) from the data below.

Usage:  python resume/build_resume.py        (requires: pip install reportlab)
Output: resume.pdf at the repo root, which the site's "Download Resume" button links to.
"""
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Flowable, KeepTogether, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

OUT = Path(__file__).resolve().parent.parent / "resume.pdf"

NAME = "Naveen Madapana"
LINKS = [
    ("naveen.madapana@gmail.com", "mailto:naveen.madapana@gmail.com"),
    ("Website", "https://nmadapan.github.io"),
    ("LinkedIn", "https://www.linkedin.com/in/nmadapan/"),
    ("GitHub", "https://github.com/nmadapan"),
    ("Scholar", "https://scholar.google.com/citations?user=X6gXGR4AAAAJ&hl=en"),
]

SUMMARY = [
    "AI/ML research engineer with a decade of experience taking GenAI and 3D vision from research to production.",
    "Drawn to ambiguous, high-stakes problems where rigorous science and solid engineering must come together.",
    "Motivated by using technology to solve real-world problems and empower people's lives.",
]

# (category, skills) -- first draft; resume only, not on the website
SKILLS = [
    ("Generative AI", "Multimodal LLMs, vision language models, diffusion models, fine-tuning (LoRA / PEFT), evals"),
    ("Computer Vision", "3D face analysis, face recognition, anti-spoofing, zero-shot video classification"),
    ("ML Engineering", "Contrastive and self-supervised learning; distributed training; model optimization and quantization; on-device and low-latency inference; experiment design and evaluation; security and robustness"),
    ("Tools & Languages", "Python, PyTorch, C/C++, Java, Docker, Git, Linux, algorithms and data structures"),
    ("Soft Skills", "Strategic communication, leadership, coaching, XF collaboration, technical roadmapping, ownership"),
]

# (label, text)
HOBBIES = [
    ("Court sports", "Badminton, tennis, and basketball: fast, competitive games that keep me active and social"),
    ("Running", "5K, 10K, and half marathons: steady training toward race day builds consistency, patience, and focus"),
]

# (organization, role, dates, location, [bullets])
EXPERIENCE = [
    ("Apple", "Senior AI/ML Research Engineer", "Mar 2023 – Present", "Cupertino, CA", [
        "Led the **end-to-end model lifecycle**, from data to model development to production, and coached engineers",
        "Delivered face recognition, identity security, and intelligence ML for IDs in Apple Wallet, Apple HomeView, and "
        "Face Unlock on iPhone Duo, using face analysis and vision language models",
        "Built **Safety AI**, including a selfie-based assurance system, to create a safe and trusted Apple ecosystem for kids",
    ]),
    ("Amazon Lab126", "Senior Applied Scientist", "Feb 2022 – Jan 2023", "Sunnyvale, CA", [
        "Built **generative AI** and 3D morphable models for photorealistic talking avatars with emotion, lip sync, and head motion",
        "Delivered low-latency on-device avatars in Alexa video calling with engineering teams on data specs and quantization",
    ]),
    ("Meta Reality Labs", "Research Intern, Mixed Reality", "May – Aug 2021", "Seattle, WA", [
        "Built intent-to-interact models from physiological data, integrated into **Meta Quest** with a demo of future use cases",
    ]),
    ("KAIST, Cognitive Neuro-Robotics Lab", "Research Intern, Robotics", "May – Jul 2015", "South Korea", [
        "Generated visuomotor data for object manipulation, grasping, and obstacle avoidance on the iCub and NAO humanoids",
        "Developed deep models coordinating vision, attention, and motor control for object manipulation (Humanoids 2015)",
    ]),
]

# (institution, degree, dates, lab line, [bullets])
EDUCATION = [
    ("Purdue University", "Ph.D., Computer Vision and Machine Learning", "2016 – 2021",
     "Intelligent Systems and Assistive Technologies Lab · Advisor: Dr. Juan Wachs", [
         "Served as teaching assistant for 3D computer vision and generative AI courses with 100+ students",
         "Developed **zero-shot and one-shot recognition** models for objects, activities, and gestures from few or no examples",
         "Applied sim-to-real transfer to surgical robots (suturing, needle threading) and 3D manipulation of deformable objects",
         "Built touchless gesture and voice systems, deployed in neurosurgery rooms, to browse and manipulate MRI scans",
     ]),
    ("IIT Guwahati", "Bachelors in Computer Science and Mechanical Engineering", "2012 – 2016",
     "Mechatronics & Robotics Lab · Advisor: Dr. S. K. Dwivedy", [
         "Worked as a research scholar on robotics and control systems for the NAO humanoid, including bipedal walking",
         "Developed object manipulation behaviors and static-gesture control, letting users command the robot with hand poses",
     ]),
]

# (title, venue, year) -- venue abbreviated so each paper fits on one line
PUBLICATIONS = [
    ("One-shot image recognition using prototypical encoders with reduced hubness", "WACV", "2021"),
    ("Agreement study using gesture description analysis", "IEEE THMS", "2020"),
    ("Gesture agreement assessment using description vectors", "IEEE FG", "2020"),
    ("Database of gesture attributes: zero shot learning for gesture recognition", "IEEE FG", "2019"),
    ("DESK: a robotic activity dataset for dexterous surgical skills transfer to medical robots", "arXiv", "2019"),
    ("Hard zero shot learning for gesture recognition", "ICPR", "2018"),
    ("ZSGL: zero shot gestural learning", "ACM ICMI", "2017"),
    ("Achieving \u201csynergy\u201d in cognitive behavior of humanoids via deep learning of dynamic visuo-motor-attentional coordination",
     "IEEE-RAS Humanoids", "2015"),
]


NAVY = colors.HexColor("#14213d")
# Three colors, each with one job:
#   NAVY   what you did   – name, role/degree and paper titles
#   TEAL   structure      – section headings, links, bullets, list numbers
#   COPPER where and when – organizations, dates, years (also the small header accent)
TEAL = colors.HexColor("#0b7285")
COPPER = colors.HexColor("#b45f2a")
LINK = colors.HexColor("#2a7ba6")  # a blue-leaning teal, used only for the italic contact links
INK = colors.HexColor("#242a36")
MUTED = colors.HexColor("#6a7283")
HAIRLINE = colors.HexColor("#d9dde5")

# Typography: Iowan Old Style (serif) for name, roles and summary; Avenir Next (sans) for everything else.
# Both ship with macOS; elsewhere the script falls back to the built-in Times and Helvetica.
SERIF, SERIF_BOLD, SERIF_ITALIC = "Times-Roman", "Times-Bold", "Times-Italic"
SANS, SANS_MED, SANS_BOLD, SANS_ITALIC = "Helvetica", "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"
_SYS = Path("/System/Library/Fonts")
_IOWAN = _SYS / "Supplemental" / "Iowan Old Style.ttc"
_AVENIR = _SYS / "Avenir Next.ttc"
if _IOWAN.exists() and _AVENIR.exists():
    for name, path, idx in [
        ("IowanOldStyle-Roman", _IOWAN, 0), ("IowanOldStyle-Bold", _IOWAN, 1), ("IowanOldStyle-Italic", _IOWAN, 2),
        ("AvenirNext-Regular", _AVENIR, 7), ("AvenirNext-Medium", _AVENIR, 5),
        ("AvenirNext-DemiBold", _AVENIR, 2), ("AvenirNext-Italic", _AVENIR, 4),
        ("AvenirNext-BoldItalic", _AVENIR, 1),
    ]:
        pdfmetrics.registerFont(TTFont(name, str(path), subfontIndex=idx))
    pdfmetrics.registerFontFamily("AvenirNext-Regular", normal="AvenirNext-Regular", bold="AvenirNext-DemiBold",
                                  italic="AvenirNext-Italic", boldItalic="AvenirNext-BoldItalic")
    SERIF, SERIF_BOLD, SERIF_ITALIC = "IowanOldStyle-Roman", "IowanOldStyle-Bold", "IowanOldStyle-Italic"
    SANS, SANS_MED, SANS_BOLD, SANS_ITALIC = "AvenirNext-Regular", "AvenirNext-Medium", "AvenirNext-DemiBold", "AvenirNext-Italic"

PAGE_W, PAGE_H = letter
MARGIN_X = 0.65 * inch
TOP_BLOCK = 1.3 * inch  # space reserved for the header drawn on the canvas
DATE_COL = 1.28 * inch

base = ParagraphStyle("base", fontName=SANS, fontSize=9.2, leading=12.2, textColor=INK, alignment=TA_LEFT)
S = {
    "summary": ParagraphStyle("summary", parent=base, fontName=SERIF, fontSize=9.8, leading=15.6, spaceAfter=1),
    "role": ParagraphStyle("role", parent=base, fontName=SERIF_BOLD, fontSize=10.6, leading=13, textColor=NAVY),
    "org": ParagraphStyle("org", parent=base, fontName=SANS_ITALIC, fontSize=8.8, leading=11.5, textColor=MUTED),
    "date": ParagraphStyle("date", parent=base, fontName=SANS, fontSize=8.5, leading=13, textColor=MUTED, alignment=2),
    "bullet": ParagraphStyle("bullet", parent=base, fontSize=9, leading=13.4),
    "skilllabel": ParagraphStyle("skilllabel", parent=base, fontName=SANS_MED, fontSize=8.5, leading=11.6, textColor=COPPER),
    "skills": ParagraphStyle("skills", parent=base, fontSize=9, leading=11.6),
    "pub": ParagraphStyle("pub", parent=base, fontName=SERIF, fontSize=9.3, leading=12, textColor=NAVY),
    "pubnum": ParagraphStyle("pubnum", parent=base, fontName=SERIF_BOLD, fontSize=9.3, leading=12, textColor=TEAL),
    "venue": ParagraphStyle("venue", parent=base, fontName=SERIF_ITALIC, fontSize=9, leading=12, textColor=MUTED, alignment=2),
}


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;")


def emph(text):
    """Escape text, then turn word markers into bold (kept to a few key terms)."""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", esc(text))


def header(canvas, doc):
    """Name and contact links over a navy hairline with a short accent."""
    canvas.saveState()
    top = PAGE_H
    canvas.setFillColor(NAVY)
    canvas.setFont(SERIF_BOLD, 29)
    canvas.drawString(MARGIN_X, top - 0.78 * inch, NAME)

    # Contact line beneath the name: email at the left, profile links at the right, dot-separated
    size, gap = 9, 13
    canvas.setFont(SANS_ITALIC, size)

    def draw_group(items, x, y, direction):
        """Draw italic link labels separated by gray dots; direction=-1 right-aligns the group ending at x."""
        widths = [stringWidth(t, SANS_ITALIC, size) for t, _ in items]
        dot_w = stringWidth("·", SANS_ITALIC, size)
        total = sum(widths) + (len(items) - 1) * (dot_w + 2 * gap)
        if direction < 0:
            x -= total
        for i, ((text, url), w) in enumerate(zip(items, widths)):
            if i:
                canvas.setFillColor(MUTED)
                canvas.drawString(x + gap, y, "·")
                x += dot_w + 2 * gap
            canvas.setFillColor(LINK)
            canvas.drawString(x, y, text)
            canvas.linkURL(url, (x, y - 2, x + w, y + 9), relative=0)
            x += w

    y = top - 1.04 * inch
    draw_group(LINKS[:1], MARGIN_X, y, 1)
    draw_group(LINKS[1:], PAGE_W - MARGIN_X, y, -1)

    rule_y = top - 1.2 * inch
    canvas.setStrokeColor(NAVY)
    canvas.setLineWidth(0.8)
    canvas.line(MARGIN_X, rule_y, PAGE_W - MARGIN_X, rule_y)
    canvas.setStrokeColor(COPPER)
    canvas.setLineWidth(2.4)
    canvas.line(MARGIN_X, rule_y, MARGIN_X + 46, rule_y)
    canvas.restoreState()


class Section(Flowable):
    """Letter-spaced teal heading followed by a hairline running to the right margin."""

    FONT_SIZE = 8.2

    def __init__(self, title):
        super().__init__()
        self.title = title.upper()
        self.height = 22

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        c = self.canv
        t = c.beginText(0, 6)
        t.setFont(SANS_BOLD, self.FONT_SIZE)
        t.setFillColor(TEAL)
        t.setCharSpace(1.6)
        t.textOut(self.title)
        t.setCharSpace(0)
        c.drawText(t)
        x = stringWidth(self.title, SANS_BOLD, self.FONT_SIZE) + 1.6 * len(self.title) + 10
        c.setStrokeColor(HAIRLINE)
        c.setLineWidth(0.7)
        c.line(x, 9, self.width, 9)


def section(title):
    return [Spacer(1, 7), Section(title), Spacer(1, 3)]


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(emph(b), S["bullet"]), leftIndent=10) for b in items],
        bulletType="bullet", start="•", leftIndent=10, bulletFontSize=9, bulletOffsetY=-0.5, bulletColor=TEAL,
    )


def plain_table(rows, col_widths, bottom=0):
    """Borderless, zero-padded, top-aligned table; `bottom` is the space under each row."""
    table = Table(rows, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), bottom)]))
    return table


def entry(org, role, dates, where, items, width, extra=""):
    """Full-width row: role and company on the left; dates and location far right; then optional detail and bullets."""
    meta_plain = f"{dates} · {where}" if where else dates
    meta_w = stringWidth(meta_plain, SANS_MED, 8.5) + 10
    title = f"{esc(role)} <font name='{SERIF}' color='#b45f2a'>· {esc(org)}</font>"
    meta = f"<font name='{SANS_MED}' color='#b45f2a'>{esc(dates)}</font>" + (f" <font color='#6a7283'>· {esc(where)}</font>" if where else "")
    first = plain_table([[Paragraph(title, S["role"]), Paragraph(meta, S["date"])]], [width - meta_w, meta_w])
    parts = [first]
    if extra:
        parts.append(Paragraph(esc(extra), S["org"]))
    parts += [Spacer(1, 4), bullets(items), Spacer(1, 7)]
    return KeepTogether(parts)


def labeled_rows(items, width):
    """Copper label in a left column, text on the right (used for skills and hobbies)."""
    rows = [[Paragraph(esc(label), S["skilllabel"]), Paragraph(esc(text), S["skills"])] for label, text in items]
    return plain_table(rows, [DATE_COL, width - DATE_COL], bottom=5)


def publications(width):
    """One row per paper: number, title on the left, venue and year right-aligned."""
    rows = [[Paragraph(f"{i}.", S["pubnum"]), Paragraph(esc(title), S["pub"]),
             Paragraph(f"{esc(venue)} · <font name='{SERIF}' color='#b45f2a'>{esc(year)}</font>", S["venue"])]
            for i, (title, venue, year) in enumerate(PUBLICATIONS, 1)]
    return plain_table(rows, [16, width - 16 - 128, 128], bottom=5)


def build():
    doc = SimpleDocTemplate(
        str(OUT), pagesize=letter, leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=TOP_BLOCK - 0.06 * inch,
        bottomMargin=0.38 * inch, title=f"{NAME} – Resume", author=NAME,
    )
    width = doc.width - 12  # SimpleDocTemplate frames carry 6pt padding per side

    story = section("Summary") + [Paragraph(esc(line), S["summary"]) for line in SUMMARY]
    story += section("Experience")
    for org, role, d, where, b in EXPERIENCE:
        company, _, lab = org.partition(", ")
        story.append(entry(company, role, d, where, b, width, lab))
    story += section("Education")
    for inst, deg, d, lab, b in EDUCATION:
        story.append(entry(inst, deg, d, "", b, width, lab))
    story.append(KeepTogether(section("Skills & Technologies") + [labeled_rows(SKILLS, width)]))
    story.append(KeepTogether(section("Selected Publications") + [publications(width)]))
    story += section("Hobbies") + [labeled_rows(HOBBIES, width)]

    doc.build(story, onFirstPage=header, onLaterPages=header)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
