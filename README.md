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
