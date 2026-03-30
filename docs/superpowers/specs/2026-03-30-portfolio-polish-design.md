# smart-form-api — Portfolio Polish Design Spec

**Date:** 2026-03-30
**Goal:** Polish the project for public Upwork portfolio — repo goes public, client attracts both automation and AI integration clients.

---

## 1. Overview

Two artifacts need work: the **demo page** (`public/demo.html`) and the **README.md** (to be created). No backend code changes. No new features. Scope is presentation only.

After these changes the full recruiter journey is:
1. Upwork profile → clicks project link
2. GitHub repo (`https://github.com/GuilhermeDidier/smart-form-api`) → reads README, sees badges + GIF + architecture
3. Clicks live app link → lands on polished demo page → tests it

---

## 2. Demo Page Changes (`public/demo.html`)

### 2.1 Remove "Demo" branding
- Remove the `<div class="badge">Live Demo</div>` element entirely.
- Change `<title>` from `"Smart Form Filling API — Live Demo"` to `"Smart Form Filling API"`.

### 2.2 Replace expiring Greenhouse preset
The current "Full Application Form" preset points to `boards.greenhouse.io/embed/job_app?for=anthropic&token=5101832008`. This is a real job posting that will close and break the demo.

Replace with `https://demoqa.com/automation-practice-form` — a permanent practice form with 15+ fields (text, email, phone, date, gender radio, hobbies checkboxes, state dropdown, file upload). More impressive for automation-focused clients.

Exact changes:
- In `PRESET_URLS`, change `form` value to `'https://demoqa.com/automation-practice-form'`. Keep the key as `form` — do not rename it, as it is referenced by the `setPreset('form', this)` call and `id="presetForm"`.
- Change the button label text from `"Full Application Form"` to `"Practice Form (15+ fields)"`.

### 2.3 "How it works" section
Add a new `<div class="how-it-works">` block immediately after the `<header>` element and before the first `.card` (Step 1). It contains three `.hiw-step` cards in a horizontal flexbox row.

Content of the three steps:

| Step | Endpoint label | Description |
|------|---------------|-------------|
| 1 | POST /start | AI opens a browser, navigates to the URL, and returns every detected field |
| 2 | POST /respond | You send the values — the browser fills and submits the form autonomously |
| 3 | GET /jobs/:id | Poll for the async result, filled-fields list, and timestamped screenshots |

CSS for the new elements (add to the `<style>` block):
```css
.how-it-works {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
}
@media (max-width: 600px) { .how-it-works { flex-direction: column; } }

.hiw-step {
  flex: 1;
  background: #161b27;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 16px;
}

.hiw-endpoint {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: #58a6ff;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.hiw-desc {
  font-size: 12px;
  color: #8b949e;
  line-height: 1.5;
}
```

### 2.4 GitHub link in header
Add a `<div class="header-actions">` wrapper inside `<header>`, positioned top-right using `position: absolute` on the header (add `position: relative` to the existing `header` selector).

Button: `btn-ghost` class, links to `https://github.com/GuilhermeDidier/smart-form-api`, `target="_blank" rel="noopener"`.

Inline GitHub SVG icon (16×16, `currentColor` fill), followed by text `"View on GitHub"`.

CSS addition:
```css
header { position: relative; }
.header-actions { position: absolute; top: 0; right: 0; }
```

### 2.5 Stack badges in footer
Add a `<footer>` element after the closing `</div>` of `.container`, with a row of five `.stack-chip` spans:
`Node.js` · `Express` · `Playwright` · `Claude AI` · `Railway`

CSS:
```css
footer {
  text-align: center;
  margin-top: 40px;
  padding-bottom: 40px;
}

.stack-chip {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 10px;
  background: #161b27;
  color: #8b949e;
  border: 1px solid #21262d;
  margin: 0 4px;
}
```

---

## 3. README.md (new file, project root)

### 3.1 Header
```markdown
# smart-form-api

Autonomous form-filling REST API powered by AI and a headless browser.
```

Shields.io badges (static, no external API calls needed):
- `Node.js 20` (green)
- `Express 4` (gray)
- `Playwright` (green)
- `Claude AI` (orange)
- `68 tests passing` (brightgreen)
- `Railway` (purple)
- `MIT License` (blue)

Live app link line: `**[Try the live app →](https://energetic-enthusiasm-production-bbde.up.railway.app/demo)**`

### 3.2 What it does
Short paragraph + three bullet points:
- `POST /start` — sends a URL, gets back a structured list of every form field the AI detected
- `POST /respond` — sends field values, the headless browser fills and submits the form
- `GET /jobs/:id` — polls for the async result with filled fields and before/after screenshots

### 3.3 Architecture
Use a plain fenced code block (not Mermaid — GitHub renders Mermaid inconsistently with some themes):

```
┌─────────┐   POST /start    ┌──────────────┐   analyzeDOM   ┌───────────────┐
│  Client │ ───────────────► │  sessions.js │ ─────────────► │  scanner.js   │
│         │   POST /respond  │  (stateful)  │                │  (Claude AI)  │
│         │ ───────────────► │              │ ─────────────► │  filler.js    │
│         │   GET /jobs/:id  │              │                │  (Playwright) │
│         │ ───────────────► │   jobs.js    │ ─────────────► │  screenshotter│
└─────────┘                  └──────────────┘                └───────────────┘
```

### 3.4 API Reference
Table with columns: Method | Path | Description | Key fields

Rows:
| Method | Path | Description | Key fields |
|--------|------|-------------|------------|
| POST | `/start` | Open browser, navigate, detect fields | `url` → `session_id`, `type`, `fields[]` |
| POST | `/respond` | Fill & submit form with provided values | `session_id`, `values[]` → `job_id` |
| GET | `/jobs/:id` | Poll async result | → `type`, `status`, `fields_filled[]`, `screenshots[]` |
| GET | `/demo` | Interactive demo UI | — |
| GET | `/screenshots/:filename` | Serve captured screenshots | — |

Response types: `data_request` (more fields needed), `action_required` (email-only page), `result` (done).

### 3.5 Quick Start
`.env.example` already exists in the repo. Quick Start:

```bash
git clone https://github.com/GuilhermeDidier/smart-form-api
cd smart-form-api
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env: add your ANTHROPIC_API_KEY and set BASE_URL=http://localhost:3000
npm start
# Open http://localhost:3000/demo
```

### 3.6 Tech Stack table
| Technology | Role |
|------------|------|
| Node.js 20 + Express 4 | HTTP server and routing |
| Playwright 1.50 | Headless browser — handles SPAs, React dropdowns, and dynamic content |
| Claude Haiku (Anthropic) | DOM analysis and field classification |
| Jest 29 + Supertest | 68 unit + integration tests |
| Railway + Docker | Container deployment with auto-scaling |

### 3.7 Demo section
```markdown
## Demo
```
Placeholder comment: `<!-- Insert GIF here after capture -->` and `<!-- Insert screenshot here after capture -->`.

After media is captured, embed GIF as `![demo](docs/demo.gif)` and screenshot as `![screenshot](docs/screenshot-result.png)`.

### 3.8 License
```markdown
## License
MIT
```

---

## 4. Media Capture Plan

After the demo page changes are deployed to Railway, capture in this order:

1. **Screenshot 1** — page loaded, no action (shows "How it works" strip + Step 1 card)
2. **Screenshot 2** — after scanning demoqa practice form (fields grid visible, 15+ fields)
3. **Screenshot 3** — result card after fill & submit (fields filled list + inline screenshots)
4. **GIF** — full flow: empty state → click "Practice Form" preset → click "Scan Page" (wait for fields) → click "Fill & Submit" → result card appears

GIF capture settings (ScreenToGif, Windows):
- Capture window: 800px wide, crop to content height
- Frame rate: 10 fps
- Duration: aim for ~15–20s; trim dead wait time in the editor
- Export: GIF with 256 colors, optimize frames; target < 5 MB
- Save as: `docs/demo.gif`

Screenshot format: PNG, 1280px wide browser window.
Save as: `docs/screenshot-1-home.png`, `docs/screenshot-2-fields.png`, `docs/screenshot-3-result.png`.

After capture, update README section 3.7 with real image embeds.

---

## 5. Out of Scope

- No backend code changes
- No new API endpoints
- No changes to tests
- `docs/superpowers/` internal planning files: leave as-is (no sensitive data; acceptable for a public repo)
- `.env.example` already exists — no changes needed
