# smart-form-api — Portfolio Polish Design Spec

**Date:** 2026-03-30
**Goal:** Polish the project for public Upwork portfolio — repo goes public, client attracts both automation and AI integration clients.

---

## 1. Overview

Two artifacts need work: the **demo page** (`public/demo.html`) and the **README.md** (to be created). No backend code changes. No new features. Scope is presentation only.

After these changes the full recrutador journey is:
1. Upwork profile → clicks project link
2. GitHub repo → reads README, sees badges + GIF + architecture
3. Clicks live app link → lands on polished demo page → tests it

---

## 2. Demo Page Changes (`public/demo.html`)

### 2.1 Remove "Demo" branding
- Remove the `<div class="badge">Live Demo</div>` element entirely.
- Change `<title>` from `"Smart Form Filling API — Live Demo"` to `"Smart Form Filling API"`.

### 2.2 Replace expiring Greenhouse preset
The current "Full Application Form" preset points to `boards.greenhouse.io/embed/job_app?for=anthropic&token=5101832008`. This is a real job posting that will close and break the demo.

Replace with `https://demoqa.com/automation-practice-form` — a permanent practice form with 15+ fields (text, email, phone, date, gender radio, hobbies checkboxes, state dropdown, file upload). More impressive for automation-focused clients.

Update the preset button label to reflect the new URL (e.g., "Practice Form (15 fields)").

### 2.3 "How it works" section
Add a 3-step horizontal strip between the header and Step 1 card. Each step is a small card:

| Step | Label | Description |
|------|-------|-------------|
| 1 | POST /start | AI opens a browser, navigates to the URL, and returns every detected field |
| 2 | POST /respond | You send the values — the browser fills and submits the form autonomously |
| 3 | GET /jobs/:id | Poll for the async result, filled fields list, and timestamped screenshots |

Style: same dark palette, thin border, small monospace labels. No icons — text only, clean.

### 2.4 GitHub link in header
Add a small button top-right of the header, opening the public repo in a new tab. Style: `btn-ghost` variant, GitHub SVG icon (inline, 16px), text "View on GitHub".

### 2.5 Stack badges in footer
Add a footer below the last card with a single row of chips:
`Node.js` · `Express` · `Playwright` · `Claude AI` · `Railway`

Same chip style as the existing `.badge` class, but smaller and gray (not blue).

---

## 3. README.md (new file)

### 3.1 Header
```
# smart-form-api
Autonomous form-filling REST API powered by AI and a headless browser.
```
Badges row: Node.js 20 · Express · Playwright · Claude AI · Jest 68 tests · Railway · MIT

Live app link: `[Try the live app →](https://energetic-enthusiasm-production-bbde.up.railway.app/demo)`

### 3.2 What it does
Three-bullet explanation:
- `POST /start` — sends a URL, gets back a structured list of every form field the AI detected
- `POST /respond` — sends field values, the headless browser fills and submits the form
- `GET /jobs/:id` — polls for the async result with filled fields and before/after screenshots

### 3.3 Architecture
Mermaid diagram showing the module flow:

```
Client → POST /start → sessions.js → scanner.js (Claude Haiku)
       → POST /respond → filler.js (Playwright) → screenshotter.js
       → GET /jobs/:id → jobs.js
```

### 3.4 API Reference
Compact table for each endpoint: method, path, key request fields, key response fields, notes.

Endpoints: `POST /start`, `POST /respond`, `GET /jobs/:id`, `GET /demo`, `GET /screenshots/:filename`.

### 3.5 Quick Start
```bash
git clone https://github.com/GuilhermeDidier/smart-form-api
cd smart-form-api
npm install
npx playwright install chromium
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and BASE_URL=http://localhost:3000
npm start
# Open http://localhost:3000/demo
```

### 3.6 Tech Stack table
| Technology | Role |
|------------|------|
| Node.js 20 + Express | HTTP server and routing |
| Playwright | Headless browser — handles SPAs, React dropdowns, and dynamic content |
| Claude Haiku (Anthropic) | DOM analysis and field classification |
| Jest + Supertest | 68 unit + integration tests |
| Railway + Docker | Container deployment |

### 3.7 Screenshots / GIF placeholder
Section header `## Demo` with a note: *(GIF and screenshots go here after capture)*.

Capture flow for GIF: empty state → select "Practice Form" preset → click "Scan Page" → fields appear → click "Fill & Submit" → result card with screenshots.

### 3.8 License
MIT.

---

## 4. Media Capture Plan

After demo page is deployed, capture in this order:

1. **Screenshot 1** — page loaded, no action (shows "How it works" + Step 1)
2. **Screenshot 2** — after scan of demoqa practice form (fields grid visible)
3. **Screenshot 3** — result card after fill & submit (fields filled list + screenshots row)
4. **GIF** — full flow using ScreenToGif: empty → preset click → scan → fields → fill → result (~15s, 800px wide)

Insert Screenshot 1 and GIF into README under `## Demo`.

---

## 5. Out of Scope

- No backend code changes
- No new API endpoints
- No changes to `docs/` internal planning files (repo is going public but `docs/` is internal context — acceptable to leave)
- No changes to tests
