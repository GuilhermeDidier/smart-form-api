const { chromium } = require('playwright')

const sessions = new Map()
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

async function createSession(sessionId) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  })

  const page = await context.newPage()

  const session = {
    browser,
    context,
    page,
    lastAnalysis: null,
    scanCount: 0,
    consecutiveUnknownCount: 0, // tracks consecutive "unknown" context scans
    crashed: false,
    timeout: null
  }

  // Crash handler — register immediately after page creation
  page.on('crash', () => {
    session.crashed = true
    deleteSession(sessionId).catch(() => {})
  })

  resetTimeout(sessionId, session)
  sessions.set(sessionId, session)

  return session
}

function resetTimeout(sessionId, session) {
  if (session.timeout) clearTimeout(session.timeout)
  session.timeout = setTimeout(() => {
    deleteSession(sessionId).catch(() => {})
  }, SESSION_TIMEOUT_MS)
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null
}

function touchSession(sessionId) {
  const session = sessions.get(sessionId)
  if (session) resetTimeout(sessionId, session)
}

async function deleteSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return false
  sessions.delete(sessionId)
  if (session.timeout) clearTimeout(session.timeout)
  await session.browser.close().catch(() => {})
  return true
}

function getActiveSessions() {
  return sessions.size
}

module.exports = { createSession, getSession, touchSession, deleteSession, getActiveSessions }
