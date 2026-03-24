require('dotenv').config()
const Anthropic = require('@anthropic-ai/sdk')

const MODEL = 'claude-haiku-4-5-20251001'

class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

function buildPrompt(pageInfo, isRetry = false) {
  const strictNote = isRetry
    ? '\nCRITICAL: Your previous response was not valid JSON. Return ONLY a raw JSON object. No markdown, no explanation, no code fences.'
    : ''

  return `You are a web automation agent. Analyze this page snapshot and return a JSON object describing the required user interaction.${strictNote}

Page snapshot:
${JSON.stringify(pageInfo, null, 2)}

Return ONLY raw JSON — no markdown fences, no explanation. Use exactly one of these shapes:

Shape 1 — interactive form (login, signup, job application, etc.):
{
  "context": "login" | "signup" | "form" | "additional_form",
  "fields": [
    {
      "id": "unique_id (name attr, id attr, or aria-label — no spaces)",
      "label": "visible label text",
      "selector": "CSS selector (prefer [name='x'] or [id='x'])",
      "type": "text|password|email|textarea|select|radio|checkbox|file",
      "required": true,
      "options": ["Canada", "USA"]
    }
  ],
  "submit_selector": "CSS selector for the primary submit/continue button"
}

Shape 2 — page requires sending an email to apply:
{
  "context": "email_contact",
  "details": { "to": "email@example.com", "subject": "text", "body": "text" }
}

Shape 3 — confirmation/success page (form already submitted):
{ "context": "success" }

Shape 4 — cannot classify with confidence:
{ "context": "unknown" }

Rules:
- Use "additional_form" if this is a multi-step flow and a previous step was already completed
- For native <select>, list all <option> texts in "options"
- For React/custom dropdowns ([role="combobox"]), list all visible option texts in "options"
- Only include fields that require user input (skip hidden, readonly)
- submit_selector must target the primary action button (Submit, Apply, Next, Continue)
- If the snapshot includes "emailsOnPage" with email addresses AND the page text or title indicates this is a job posting (no application form present), classify as "email_contact" using the most relevant email address (prefer the one that appears in context of "send CV", "apply", "candidature", etc.)`
}

function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

async function analyzePageWithClaude(pageInfo) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  for (let attempt = 1; attempt <= 2; attempt++) {
    let rawText
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 3000,
        messages: [{ role: 'user', content: buildPrompt(pageInfo, attempt === 2) }]
      })
      rawText = response.content[0].text
    } catch (err) {
      if (err.status === 429) throw new ApiError('AI service rate limit, retry after a moment', 'RATE_LIMIT')
      if (err.status === 401 || err.status === 403) throw new ApiError('AI service authentication error', 'AUTH_ERROR')
      throw new ApiError(`AI service error: ${err.message}`, 'AI_ERROR')
    }

    try {
      return JSON.parse(stripFences(rawText))
    } catch {
      if (attempt === 2) {
        throw new ApiError('Page analysis failed: AI returned invalid JSON after retry', 'SCANNER_ERROR')
      }
      // attempt 1 failed — loop continues to attempt 2 with stricter prompt
    }
  }
}

module.exports = { analyzePageWithClaude, ApiError }
