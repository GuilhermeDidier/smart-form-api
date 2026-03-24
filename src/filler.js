const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { v4: uuidv4 } = require('uuid')

async function fillForm(page, values, analysis) {
  const filled = []
  const skipped = []

  for (const valueEntry of values) {
    const field = analysis?.fields?.find((f) => f.id === valueEntry.id)

    if (!field) {
      skipped.push({ field: valueEntry.id, reason: 'not found in analysis fields' })
      continue
    }

    try {
      await fillField(page, field, valueEntry.value)
      filled.push({ field: field.label || field.id, value: valueEntry.value })
    } catch (err) {
      skipped.push({ field: field.label || field.id, reason: err.message })
    }
  }

  // Submit form
  if (analysis?.submit_selector) {
    try {
      await page.click(analysis.submit_selector)
    } catch {
      // Fallback: Enter key
      try {
        await page.keyboard.press('Enter')
      } catch (err) {
        skipped.push({ field: '__submit__', reason: `Submit failed: ${err.message}` })
      }
    }
  }

  return { filled, skipped }
}

async function fillField(page, field, value) {
  const { selector, type } = field

  switch (type) {
    case 'text':
    case 'email':
    case 'password':
    case 'tel':
    case 'number':
    case 'search':
    case 'url':
    case 'textarea':
      await page.fill(selector, String(value))
      break

    case 'select':
      await fillSelect(page, selector, value)
      break

    case 'radio':
      await page.click(`${selector}[value="${value}"]`).catch(() =>
        page.click(`input[type="radio"][value="${value}"]`)
      )
      break

    case 'checkbox': {
      const checked = value === true || value === 'true' || value === '1' || value === 1
      if (checked) {
        await page.check(selector)
      } else {
        await page.uncheck(selector)
      }
      break
    }

    case 'file':
      await fillFile(page, selector, value)
      break

    default:
      await page.fill(selector, String(value))
  }
}

async function fillSelect(page, selector, value) {
  try {
    // Try native <select> first
    await page.selectOption(selector, String(value))
  } catch {
    // React/custom dropdown fallback
    await page.click(selector)
    await page.waitForTimeout(500)

    const optionSelectors = [
      `[role="option"]:visible:has-text("${value}")`,
      `li:visible:has-text("${value}")`,
      `[class*="option"]:visible:has-text("${value}")`,
      `[class*="item"]:visible:has-text("${value}")`
    ]

    for (const optSel of optionSelectors) {
      const el = await page.$(optSel)
      if (el) {
        await el.click()
        return
      }
    }

    throw new Error(`Could not select option "${value}" — no matching element found`)
  }
}

async function fillFile(page, selector, value) {
  if (!value || !value.startsWith('http')) {
    // Treat as local path
    await page.setInputFiles(selector, value)
    return
  }

  const ext = path.extname(value.split('?')[0]) || '.bin'
  const tmpPath = path.join(require('os').tmpdir(), `upload_${uuidv4()}${ext}`)

  try {
    await downloadFile(value, tmpPath)
    try {
      await page.setInputFiles(selector, tmpPath)
    } catch (err) {
      throw new Error(`file input error: ${err.message}`)
    }
  } finally {
    fs.unlink(tmpPath, () => {}) // always clean up, even on error
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const timeout = setTimeout(() => reject(new Error('file download timeout')), 10000)

    const request = protocol.get(url, (res) => {
      clearTimeout(timeout)
      if (res.statusCode >= 400) {
        return reject(new Error(`file download failed: ${res.statusCode}`))
      }
      const file = fs.createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', reject)
    })

    request.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

module.exports = { fillForm }
