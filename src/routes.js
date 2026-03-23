const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { createSession, getSession, touchSession, deleteSession, getActiveSessions } = require('./sessions')
const { scanPage } = require('./scanner')
const { fillForm } = require('./filler')
const { takeScreenshot } = require('./screenshotter')

const router = express.Router()

// ─── POST /start ────────────────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url is required' })

  const sessionId = uuidv4()
  let session

  try {
    session = await createSession(sessionId)
    const { page } = session

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    const screenshotUrl = await takeScreenshot(page, sessionId, 'page_loaded')
    const analysis = await scanPage(page, 0)

    // Email contact — close session immediately
    if (analysis.context === 'email_contact') {
      await deleteSession(sessionId)
      return res.json({
        session_id: sessionId,
        type: 'action_required',
        action: 'send_email',
        details: analysis.details,
        screenshots: [screenshotUrl]
      })
    }

    session.lastAnalysis = analysis
    session.scanCount = 1

    return res.json({
      session_id: sessionId,
      type: 'data_request',
      context: analysis.context,
      fields: analysis.fields,
      screenshots: [screenshotUrl]
    })
  } catch (err) {
    await deleteSession(sessionId).catch(() => {})
    const status = err.code === 'RATE_LIMIT' ? 503 : err.code === 'AUTH_ERROR' ? 500 : 500
    return res.status(status).json({ error: err.message })
  }
})

// ─── POST /respond ───────────────────────────────────────────────────────────
router.post('/respond', async (req, res) => {
  const { session_id, values } = req.body

  if (!session_id) return res.status(400).json({ error: 'session_id is required' })
  if (!values) return res.status(400).json({ error: 'values is required' })

  let session = getSession(session_id)
  if (!session) return res.status(404).json({ error: 'session not found or already closed' })
  if (session.crashed) return res.status(500).json({ error: 'browser session crashed' })

  touchSession(session_id)

  try {
    const { page, lastAnalysis } = session
    const screenshots = []

    // Fill and submit
    const { filled, skipped } = await fillForm(page, values, lastAnalysis)

    // Guard 1: session may have expired during fillForm (race condition)
    if (!getSession(session_id)) {
      return res.status(404).json({ error: 'session expired during execution' })
    }

    screenshots.push(await takeScreenshot(page, session_id, 'form_filled'))

    // Wait for navigation
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Guard 2: session may have expired during waitForLoadState
    if (!getSession(session_id)) {
      return res.status(404).json({ error: 'session expired during execution' })
    }

    screenshots.push(await takeScreenshot(page, session_id, `after_submit_${Date.now()}`))

    const analysis = await scanPage(page, session.scanCount)

    // Guard 3: session may have expired during async Claude call
    if (!getSession(session_id)) {
      return res.status(404).json({ error: 'session expired during execution' })
    }

    session.scanCount += 1

    // Track consecutive unknown scans; reset on any other context
    if (analysis.context === 'unknown') {
      session.consecutiveUnknownCount = (session.consecutiveUnknownCount || 0) + 1
    } else {
      session.consecutiveUnknownCount = 0
    }

    // ── Success ──
    if (analysis.context === 'success') {
      await deleteSession(session_id)
      return res.json({
        session_id,
        type: 'result',
        status: 'success',
        fields_filled: filled,
        fields_skipped: skipped,
        screenshots
      })
    }

    // ── Email contact mid-flow ──
    if (analysis.context === 'email_contact') {
      await deleteSession(session_id)
      return res.json({
        session_id,
        type: 'action_required',
        action: 'send_email',
        details: analysis.details,
        screenshots
      })
    }

    // ── Failed after 3 consecutive unknown scans ──
    if (session.consecutiveUnknownCount >= 3) {
      await deleteSession(session_id)
      return res.json({
        session_id,
        type: 'result',
        status: 'failed',
        error: 'Page state could not be classified after 3 consecutive attempts',
        fields_filled: filled,
        fields_skipped: skipped,
        screenshots
      })
    }

    // ── Next step ──
    session.lastAnalysis = analysis
    return res.json({
      session_id,
      type: 'data_request',
      context: analysis.context,
      fields: analysis.fields,
      screenshots
    })
  } catch (err) {
    const status = err.code === 'RATE_LIMIT' ? 503 : 500
    return res.status(status).json({ error: err.message })
  }
})

// ─── DELETE /session/:id ─────────────────────────────────────────────────────
router.delete('/session/:id', async (req, res) => {
  const closed = await deleteSession(req.params.id)
  if (!closed) return res.status(404).json({ error: 'session not found or already closed' })
  return res.json({ session_id: req.params.id, closed: true })
})

// ─── GET /health ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    sessions: getActiveSessions(),
    uptime: Math.floor(process.uptime())
  })
})

module.exports = router
