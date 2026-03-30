# Portfolio Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish `public/demo.html` and create `README.md` so the project is ready for a public Upwork portfolio.

**Architecture:** Presentation-only changes — no backend code, no tests modified. Two files touched: `public/demo.html` (4 surgical edits) and a new `README.md` at the project root.

**Tech Stack:** HTML · CSS · Markdown · Railway CLI (for deploy)

**Spec:** `docs/superpowers/specs/2026-03-30-portfolio-polish-design.md`

---

## Files

| Action | Path | What changes |
|--------|------|-------------|
| Modify | `public/demo.html` | Remove Demo badge, replace preset URL/label, add How-it-works strip, add GitHub button, add footer chips |
| Create | `README.md` | Full portfolio README with badges, architecture, API reference, Quick Start, tech stack |

No tests are modified. These are visual/presentation changes verified by opening the page in a browser.

---

## Chunk 1: Demo Page (`public/demo.html`)

### Task 1: Remove "Demo" branding and replace Greenhouse preset

**Files:**
- Modify: `public/demo.html`

- [ ] **Step 1: Remove the Live Demo badge**

In `public/demo.html`, find and remove this element entirely (line ~33):
```html
<div class="badge">Live Demo</div>
```

- [ ] **Step 2: Update the page title**

Change line ~6:
```html
<title>Smart Form Filling API — Live Demo</title>
```
to:
```html
<title>Smart Form Filling API</title>
```

- [ ] **Step 3: Replace the Greenhouse preset URL**

In the `PRESET_URLS` object (line ~429), change:
```js
form:  'https://boards.greenhouse.io/embed/job_app?for=anthropic&token=5101832008'
```
to:
```js
form:  'https://demoqa.com/automation-practice-form'
```

- [ ] **Step 4: Update the preset button label**

Find the preset button with `id="presetForm"` (line ~371):
```html
<button class="btn btn-ghost" id="presetForm"  onclick="setPreset('form', this)">Full Application Form</button>
```
Change only the label text:
```html
<button class="btn btn-ghost" id="presetForm"  onclick="setPreset('form', this)">Practice Form (15+ fields)</button>
```

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000/demo` (or open the file directly). Confirm:
- No "Live Demo" badge visible in the header
- Tab title shows "Smart Form Filling API"
- "Practice Form (15+ fields)" button appears in presets
- Clicking the preset fills the URL input with `https://demoqa.com/automation-practice-form`

- [ ] **Step 6: Commit**

```bash
cd C:/Users/GUILHERME/smart-form-api
git add public/demo.html
git commit -m "feat: remove demo badge, replace Greenhouse preset with demoqa"
```

---

### Task 2: Add "How it works" section

**Files:**
- Modify: `public/demo.html`

- [ ] **Step 1: Add CSS for the How-it-works strip**

Inside the `<style>` block, add these rules before the closing `</style>` tag:

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

- [ ] **Step 2: Add the HTML strip after `</header>`**

Locate the closing `</header>` tag. Immediately after it (before the first `.card` div), insert:

```html
  <!-- How it works -->
  <div class="how-it-works">
    <div class="hiw-step">
      <div class="hiw-endpoint">POST /start</div>
      <div class="hiw-desc">AI opens a browser, navigates to the URL, and returns every detected field</div>
    </div>
    <div class="hiw-step">
      <div class="hiw-endpoint">POST /respond</div>
      <div class="hiw-desc">You send the values — the browser fills and submits the form autonomously</div>
    </div>
    <div class="hiw-step">
      <div class="hiw-endpoint">GET /jobs/:id</div>
      <div class="hiw-desc">Poll for the async result, filled-fields list, and timestamped screenshots</div>
    </div>
  </div>
```

- [ ] **Step 3: Verify in browser**

Reload the page. Confirm three horizontal cards appear between the header and Step 1. On a narrow window (< 600px), they stack vertically.

- [ ] **Step 4: Commit**

```bash
git add public/demo.html
git commit -m "feat: add How it works strip to demo page"
```

---

### Task 3: Add GitHub link in header

**Files:**
- Modify: `public/demo.html`

- [ ] **Step 1: Add positioning CSS to existing `header` selector**

Find the existing `header` rule in `<style>`:
```css
header { text-align: center; margin-bottom: 48px; }
```
Add `position: relative;` to it:
```css
header { text-align: center; margin-bottom: 48px; position: relative; }
```

Then add the `.header-actions` rule before `</style>`:
```css
.header-actions { position: absolute; top: 0; right: 0; }
```

- [ ] **Step 2: Add the GitHub button inside `<header>`**

Locate the opening `<header>` tag. As the first child inside it, insert:

```html
    <div class="header-actions">
      <a href="https://github.com/GuilhermeDidier/smart-form-api" target="_blank" rel="noopener" class="btn btn-ghost" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        View on GitHub
      </a>
    </div>
```

- [ ] **Step 3: Verify in browser**

Reload. The "View on GitHub" button should appear top-right of the header without shifting the centered title/subtitle. Clicking opens the GitHub repo in a new tab.

- [ ] **Step 4: Commit**

```bash
git add public/demo.html
git commit -m "feat: add GitHub link button to demo page header"
```

---

### Task 4: Add footer with stack chips

**Files:**
- Modify: `public/demo.html`

- [ ] **Step 1: Add footer CSS**

Before `</style>`, add:

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

- [ ] **Step 2: Add footer HTML**

Find the closing `</div>` of `.container` (the outermost container div). After that closing tag, before `<script>`, insert:

```html
<footer>
  <span class="stack-chip">Node.js</span>
  <span class="stack-chip">Express</span>
  <span class="stack-chip">Playwright</span>
  <span class="stack-chip">Claude AI</span>
  <span class="stack-chip">Railway</span>
</footer>
```

- [ ] **Step 3: Verify in browser**

Reload. Five gray chips should appear centered below the last card.

- [ ] **Step 4: Commit**

```bash
git add public/demo.html
git commit -m "feat: add stack chips footer to demo page"
```

---

## Chunk 2: README.md + Deploy

### Task 5: Create README.md

**Files:**
- Create: `README.md` (project root)

- [ ] **Step 1: Create the file**

Create `README.md` at the project root with this content:

```markdown
# smart-form-api

Autonomous form-filling REST API powered by AI and a headless browser.

![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Express](https://img.shields.io/badge/Express-4-gray)
![Playwright](https://img.shields.io/badge/Playwright-1.50-green)
![Claude AI](https://img.shields.io/badge/Claude-Haiku-orange)
![Tests](https://img.shields.io/badge/tests-68%20passing-brightgreen)
![Railway](https://img.shields.io/badge/deployed-Railway-purple)
![License](https://img.shields.io/badge/license-MIT-blue)

**[Try the live app →](https://energetic-enthusiasm-production-bbde.up.railway.app/demo)**

---

## What it does

Send a URL — the AI scans the page, detects every form field, and fills the form autonomously using a headless browser.

- `POST /start` — sends a URL, gets back a structured list of every form field the AI detected
- `POST /respond` — sends field values, the headless browser fills and submits the form
- `GET /jobs/:id` — polls for the async result with filled fields and before/after screenshots

---

## Demo

<!-- Insert GIF here after capture -->
<!-- Insert screenshot here after capture -->

---

## Architecture

```
┌─────────┐   POST /start    ┌──────────────┐   analyzeDOM   ┌───────────────┐
│  Client │ ───────────────► │  sessions.js │ ─────────────► │  scanner.js   │
│         │   POST /respond  │  (stateful)  │                │  (Claude AI)  │
│         │ ───────────────► │              │ ─────────────► │  filler.js    │
│         │   GET /jobs/:id  │              │                │  (Playwright) │
│         │ ───────────────► │   jobs.js    │ ─────────────► │  screenshotter│
└─────────┘                  └──────────────┘                └───────────────┘
```

---

## API Reference

| Method | Path | Description | Key fields |
|--------|------|-------------|------------|
| POST | `/start` | Open browser, navigate, detect fields | `url` → `session_id`, `type`, `fields[]` |
| POST | `/respond` | Fill & submit form with provided values | `session_id`, `values[]` → `job_id` |
| GET | `/jobs/:id` | Poll async result | → `type`, `status`, `fields_filled[]`, `screenshots[]` |
| GET | `/demo` | Interactive demo UI | — |
| GET | `/screenshots/:filename` | Serve captured screenshots | — |

**Response types:** `data_request` (more fields needed), `action_required` (email-only page), `result` (done).

---

## Quick Start

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

---

## Tech Stack

| Technology | Role |
|------------|------|
| Node.js 20 + Express 4 | HTTP server and routing |
| Playwright 1.50 | Headless browser — handles SPAs, React dropdowns, and dynamic content |
| Claude Haiku (Anthropic) | DOM analysis and field classification |
| Jest 29 + Supertest | 68 unit + integration tests |
| Railway + Docker | Container deployment with auto-scaling |

---

## License

MIT
```

- [ ] **Step 2: Verify the file renders correctly**

Open `README.md` in VS Code preview (Ctrl+Shift+V) or push to GitHub and check the rendered output. Confirm:
- Badges render in a row
- Live app link is clickable
- Architecture code block is monospaced and aligned
- API table renders correctly

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add portfolio README with badges, architecture, API reference, quick start"
```

---

### Task 6: Deploy to Railway

**Files:** No file changes — Railway reads the current branch.

- [ ] **Step 1: Verify Railway is linked**

```bash
cd C:/Users/GUILHERME/smart-form-api
railway status
```

Expected: shows project `energetic-enthusiasm`, service `energetic-enthusiasm`. If not linked, run `railway link` and select the correct project before proceeding.

- [ ] **Step 2: Deploy**

```bash
railway up
```

Wait for the build to complete (~2–3 minutes).

- [ ] **Step 3: Verify the live demo**

Open `https://energetic-enthusiasm-production-bbde.up.railway.app/demo` and confirm:
- No "Live Demo" badge in header
- "View on GitHub" button top-right works
- "Practice Form (15+ fields)" preset loads `demoqa.com`
- How-it-works strip shows 3 cards
- Stack chips appear in footer

- [ ] **Step 4: Make GitHub repo public**

On GitHub → `GuilhermeDidier/smart-form-api` → Settings → Danger Zone → Change repository visibility → Public.

---

### Task 7: Media capture (manual — do after deploy)

This task is done manually by the developer, not by an agent.

- [ ] **Screenshot 1** — page loaded, no action (captures How-it-works + Step 1)
  - Browser: 1280px wide, no zoom
  - Save as: `docs/screenshot-1-home.png`

- [ ] **Screenshot 2** — after scanning demoqa practice form (fields grid visible)
  - Save as: `docs/screenshot-2-fields.png`

- [ ] **Screenshot 3** — result card after fill & submit
  - Save as: `docs/screenshot-3-result.png`

- [ ] **GIF** — full flow (ScreenToGif):
  - Flow to record: empty state → click "Practice Form (15+ fields)" preset → click "Scan Page" (wait for fields grid to appear) → click "Fill & Submit" → result card appears with filled-fields list
  - Window: 800px wide
  - Frame rate: 10 fps, ~15–20s total; trim dead wait time in the editor
  - Export: GIF, 256 colors, optimize frames, < 5 MB
  - Save as: `docs/demo.gif`

- [ ] **Update README with real embeds**

Replace the placeholder comments in `README.md` `## Demo` section:
```markdown
## Demo

![demo](docs/demo.gif)

![screenshot](docs/screenshot-3-result.png)
```

- [ ] **Commit**

```bash
git add docs/demo.gif docs/screenshot-*.png README.md
git commit -m "docs: add demo GIF and screenshots to README"
git push
```
