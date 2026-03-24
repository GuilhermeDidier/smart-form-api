const { analyzePageWithClaude } = require('./claude')

async function extractPageSnapshot(page, scanCount) {
  const snapshot = await page.evaluate(() => {
    const cleanText = (el) => el?.textContent?.trim()?.substring(0, 120) || ''

    const forms = Array.from(document.querySelectorAll('form'))
      .slice(0, 3)
      .map((f) => {
        const clone = f.cloneNode(true)
        clone.querySelectorAll('script, style, svg').forEach((el) => el.remove())
        return clone.outerHTML.substring(0, 15000)
      })

    const inputs = Array.from(
      document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'
      )
    ).map((el) => ({
      tag: el.tagName,
      type: el.type || null,
      name: el.name || null,
      id: el.id || null,
      placeholder: el.placeholder || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      required: el.required || el.getAttribute('aria-required') === 'true',
      className: (el.className || '').substring(0, 80),
      options:
        el.tagName === 'SELECT'
          ? Array.from(el.options)
              .map((o) => o.text.trim())
              .filter(Boolean)
          : null
    }))

    const labels = Array.from(document.querySelectorAll('label')).map((l) => ({
      htmlFor: l.getAttribute('for') || null,
      text: cleanText(l)
    }))

    const buttons = Array.from(
      document.querySelectorAll('button, input[type="submit"], [role="button"]')
    )
      .slice(0, 10)
      .map((b) => ({
        text: cleanText(b),
        type: b.type || null,
        className: (b.className || '').substring(0, 80)
      }))

    const reactDropdowns = Array.from(
      document.querySelectorAll('[role="combobox"], [role="listbox"], [aria-haspopup="listbox"]')
    ).map((el) => ({
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label') || null,
      className: (el.className || '').substring(0, 80),
      text: cleanText(el)
    }))

    // Extract all email addresses visible on the page (plain text + mailto links)
    const bodyHtml = document.body?.innerHTML || ''
    const emailMatches = bodyHtml.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g) || []
    const emailsOnPage = [...new Set(emailMatches)].slice(0, 10)

    // Extract paragraphs/text nodes that contain an email address (provides apply context)
    const emailRegex = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/
    const emailContexts = Array.from(document.querySelectorAll('p, li, td, div'))
      .filter(el => !el.querySelector('p, li, td, div') && emailRegex.test(el.textContent))
      .map(el => el.textContent.trim().substring(0, 300))
      .filter(Boolean)
      .slice(0, 5)

    return {
      url: window.location.href,
      title: document.title,
      forms: forms.length ? forms : null,
      inputs,
      labels,
      buttons,
      reactDropdowns,
      emailsOnPage,
      emailContexts,
      bodyText: (document.body?.innerText || '').substring(0, 3000)
    }
  })

  snapshot.scanCount = scanCount
  return snapshot
}

async function scanPage(page, scanCount = 0) {
  const snapshot = await extractPageSnapshot(page, scanCount)
  return analyzePageWithClaude(snapshot)
}

module.exports = { scanPage }
