# nmadapan.github.io

Naveen Madapana's personal site, plus a generated resume. The site is plain static HTML and CSS (no framework, no build step) hosted on GitHub Pages from `master`. The resume is a PDF built from a Python script.

**The rule to remember:** the website is where content changes first. The resume is a separate, shorter rendering of the same content, so any change to the website text has to be carried over to the resume by hand (see [Keeping the resume in sync](#keeping-the-resume-in-sync)).

## Repo layout

```
index.html            Home: intro, Impact, Education & Experience, Hobbies, Contact
research.html         Selected research cards + full Publications list
blog.html             Blog index, with an "Educational Blogs" group listing the posts
blog/                 One HTML file per post (blog/cross-entropy.html)
resume.html           Shows the resume page images + Download PDF / Open in new tab
resume.pdf            GENERATED resume (do not edit by hand)
images/projects/      Research card images
images/resume-N.png   GENERATED page images shown on resume.html
assets/css/site.css   All styles (dark glass theme)
assets/js/site.js     Highlights the current section tab while scrolling
assets/css/post.css   Styles for blog posts and the blog index cards (equations, callouts, figures, tables, code)
assets/js/xent.js     The interactive canvas figures in the cross-entropy post (plain JS, no libraries)
resume/
  build_resume.py     Builds resume.pdf (ReportLab). All resume text lives at the top of this file
  render_pages.py     Renders resume.pdf into images/resume-N.png and updates resume.html
  RESUME_RULES.md     Detailed design and content rules for the resume
.nojekyll             Tells GitHub Pages to serve the files as-is (no Jekyll)
```

## Website

### Pages and navigation
- **Top bar (page tabs):** the title "Hello World, Welcome!" at the left (it links home), and Home, Research, Blog, Resume (opens `resume.html`), Contact (goes to LinkedIn) at the right. The tab for the page you are on is underlined with a short blue-to-cyan line. The same `<nav>` block, `<head>`, and footer are copied into each HTML file, so a change to the nav has to be made in all four pages.
- **Section strip** (under the top bar, Home and Research only): a sticky strip with the page name (`HOME`, `RESEARCH`) and small bordered tabs that jump to sections. `assets/js/site.js` marks the section you are in. Home: Impact, Education & Experience, Hobbies, Contact. Research: Selected research, Publications. When a page loads, the strip unrolls down from the top bar and its tabs drop in one after another (CSS keyframes `panelOpen` and `tabDrop`; skipped when the visitor prefers reduced motion). Blog and Resume have no strip.
- The Resume page shows each page of the resume as an image, 1280px wide at most, so it reads without downloading. Page images are not selectable text; the PDF is.

### Design
- Dark theme with a soft purple/cyan background glow, frosted-glass cards, and a blue-to-cyan accent. Design tokens are the CSS variables at the top of `assets/css/site.css`. Later rules in the "Design overrides" section win over the base rules above them. Keep the `@media` blocks at the bottom of the file.
- **Highlights:** keywords are marked `<strong class="kw">…</strong>` (a soft amber marker). Use very few. Currently: generative AI, multimodal large language models, 3D computer vision, and Safety AI in the intro, plus end-to-end model lifecycle, Safety AI, generative AI, Meta Quest, and zero-shot and one-shot recognition in the timeline.
- **Cache busting:** the stylesheet link carries a version, `site.css?v=NN`. When you change the CSS, bump `NN` in all four pages, or browsers (Safari in particular) will show the old styles. If you version `site.js` the same way (`site.js?v=N`), bump it too.

### Content style
- Experience and education entries are bullet lists of short past-tense sentences. Fill the line width; avoid a single orphaned word on a wrapped line.
- Do not put a phone number on the site or the resume. The real email address is not on the site, and the resume shows only the pattern `{firstname}.{lastname}@gmail.com` (LinkedIn is the contact path).
- No Honors section, and no best-student-paper callouts.
- Facts that came from the user and should be kept: Amazon work was talking avatars in Alexa video calling; Purdue TA for 3D computer vision and generative AI courses (100+ students); "suturing and needle threading", "deformable objects", "surgeons"; IIT Guwahati work was on the NAO humanoid (robotics, control systems, bipedal walking, object manipulation, static-gesture control); Apple bullets use "coaching" engineers.

### Blog
- `blog.html` has an **Educational Blogs** group; each post is a card linking to a file in `blog/`. To add a post, copy `blog/cross-entropy.html` (paths use `../`), edit the content, and add a card to the group in `blog.html`.
- Posts share the site header with a section strip ("In this post"). Each post section needs an `id` matching a strip link so the scroll highlight works.
- Post style: every section opens with a green **In plain English** callout (analogy first), then the key math, then an interactive figure. Keep the visible text under about 2,200 words (a 9-minute read); put proofs, extra losses, and code in a few collapsible `<details class="deep">` panels, not in every section. Figures inside a collapsed panel redraw when it opens.
- Figures live in `assets/js/xent.js`, one block per figure keyed by canvas id (`v-info`, `v-coin`, `v-bern`, `v-three`, `v-kl`, `v-temp`, `v-focal`, `v-bce-*`). Math is written in plain Unicode/HTML, so no math library is needed. Bump the `?v=` on `post.css` and `xent.js` when you change them.

### Run it locally
```
python3 -m http.server 8765      # from the repo root, then open http://localhost:8765/
```

## Resume

`resume.pdf` is generated, not edited. All text and structure are data at the top of `resume/build_resume.py`: `SUMMARY`, `SKILLS`, `HOBBIES`, `EXPERIENCE`, `EDUCATION`, `PUBLICATIONS`, and `LINKS`.

### Build
```
python3 -m venv .venv && .venv/bin/pip install reportlab pymupdf
.venv/bin/python resume/build_resume.py     # writes resume.pdf
.venv/bin/python resume/render_pages.py     # writes images/resume-N.png and refreshes resume.html
```
Always run both. The first makes the PDF; the second makes the images the site actually displays. Then commit `resume.pdf`, `images/resume-*.png`, and `resume.html` together.

Notes:
- Fonts are Iowan Old Style (serif) and Avenir Next (sans), both from macOS. On other machines the script falls back to Times and Helvetica, so build it on the Mac to get the intended look. `.venv/` is not committed.
- The resume can be one or two pages. At the moment page 1 runs from Summary through Skills & Technologies, and page 2 holds Publications and Hobbies. The Publications section is kept together on one page.
- Check the render before committing: `sips -s format png resume.pdf --out /tmp/resume.png` shows page 1 on macOS.

### Design in one paragraph
Navy name and titles (what you did), teal for structure and section headings, copper for organizations, dates, and years (where and when). The header is the name plus one line: the email pattern `{firstname}.{lastname}@gmail.com` (plain text, not a link, and no phone number) at the left, Website · LinkedIn · GitHub · Scholar at the right, in italics in a slightly bluer teal with no underline. The summary is one flowing three-line paragraph, and Skills & Technologies has five rows (Generative AI, Computer Vision, ML Engineering, Tools & Languages, Soft Skills). Each role is `Role · Company` with dates and location at the far right. See `resume/RESUME_RULES.md` for the complete list of rules.

## Keeping the resume in sync

When you change the website, apply the matching change to the resume. The two are not word-for-word copies; the resume is tighter.

| Change on the website | What to do in `resume/build_resume.py` |
|---|---|
| Intro paragraphs on Home | `SUMMARY`: one flowing paragraph. Do not repeat anything from the entries below (no product or employer names). |
| An Experience or Education bullet (Home timeline) | The matching bullet in `EXPERIENCE` or `EDUCATION`. Shorten it so it fits one line, start with a past-tense verb. |
| A new job or degree | A new tuple: `(org, role, dates, location, [bullets])`. Education passes the lab and advisor line in the org field. |
| Publications on Research | `PUBLICATIONS`: title, abbreviated venue, year. No authors. Keep it to a short selection; the HFES, FG 2020 feature selection, PACS, and best-student-paper items are intentionally left out. |
| Hobbies cards | `HOBBIES`: label and one line of text. |
| Impact cards, Selected research cards, highlighted keywords | Not on the resume. |
| Skills & Technologies | Resume only. Edit `SKILLS` directly; there is no website equivalent. |

Differences worth knowing: on the resume the Apple "Delivered face recognition…" bullet comes first and "Led the end-to-end model lifecycle…" second (the website lists them the other way round), and the resume's bold phrases differ from the website's highlights.

Highlights: the resume bolds only a few phrases, marked `**like this**` in the data (Apple Wallet, Apple HomeView, iPhone Duo, Safety AI, generative AI, Meta Quest, zero-shot and one-shot recognition). Do not add more without being asked.

### Checklist after any website text change
1. Update the matching text in `build_resume.py` using the table above.
2. Run `build_resume.py`, then `render_pages.py`.
3. Look at the rendered pages: no orphaned single words, no dropped lines, the Publications block still on one page.
4. Commit and push.

## Open items
- KAIST and Apple were deliberately left as they are (the user said the rest can stay and Apple is good). If more bullets are added later, update both the website and the resume.
- The Amazon bullets say "Alexa video calling" and "Delivered" because it was not confirmed that the work shipped on Echo Show. The intro paragraph and Impact card still say "GenAI capabilities on Amazon Echo Show".
- The Blog page is an empty placeholder.
- A custom domain (for example a `.ai` or `.dev` name) is being considered. If one is bought: add a `CNAME` file at the repo root containing the domain, set it under Settings → Pages with Enforce HTTPS, then update the Website link in `LINKS` in `build_resume.py` (and rebuild) and this README.
- A larger redesign of the top panel (section tabs merged into the top bar as a second row, a pointer arrow, a centered title) was tried and reverted. It is saved only in a local git stash on the author's machine, not in the repo.
