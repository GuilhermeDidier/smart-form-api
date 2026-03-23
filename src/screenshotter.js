require('dotenv').config()
const path = require('path')
const fs = require('fs')

// BASE_URL is owned exclusively by this module — no other module reads it
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots')

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

async function takeScreenshot(page, sessionId, step) {
  const filename = `${sessionId}_${step}.png`
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  await page.screenshot({ path: filepath, fullPage: false })
  return `${BASE_URL}/screenshots/${filename}`
}

function getScreenshotsDir() {
  return SCREENSHOTS_DIR
}

module.exports = { takeScreenshot, getScreenshotsDir }
