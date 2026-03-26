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

    // Extract paragraphs/text nodes that contain an email address in visible text
    const emailRegex = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/
    const textEmailContexts = Array.from(document.querySelectorAll('p, li, td, div'))
      .filter(el => !el.querySelector('p, li, td, div') && emailRegex.test(el.textContent))
      .map(el => el.textContent.trim().substring(0, 300))
      .filter(Boolean)

    // Also extract context from mailto: links — email may be in href only, not visible text
    const mailtoContexts = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
      .map(el => {
        const emailMatch = el.href.match(/mailto:([^\?&\s]+)/)
        if (!emailMatch) return null
        const email = emailMatch[1]
        const parent = el.closest('p, li, td, section, article') || el.parentElement
        const text = parent ? parent.textContent.trim().substring(0, 280) : el.textContent.trim()
        // Append email address if not already visible in text so the regex can find it
        return text.includes(email) ? text : `${text} ${email}`.trim().substring(0, 300)
      })
      .filter(Boolean)

    const emailContexts = [...new Set([...textEmailContexts, ...mailtoContexts])].slice(0, 5)

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

// Extract attachment hints from apply instructions.
// CV takes precedence over resume (else-if) — both won't appear together.
function _extractAttachments(text) {
  const attachments = []
  if (/\bcv\b|curriculum vitae/i.test(text)) attachments.push('cv.pdf')
  else if (/resume|résumé/i.test(text)) attachments.push('resume.pdf')
  if (/cover letter|lettre de motivation|lettre de pr[eé]sentation/i.test(text)) attachments.push('cover_letter.pdf')
  if (/portfolio/i.test(text)) attachments.push('portfolio.pdf')
  if (/references?|r[eé]f[eé]rences?/i.test(text)) attachments.push('references.pdf')
  return attachments
}

// Keywords indicating "send email to apply" instructions
const APPLY_EMAIL_KEYWORDS = /send|envo[iy]|candidature|apply|applying|cv|résumé|resume|motivation|postuler|candidat|submit|application|forward|attach/i

// Search emailContexts for an apply instruction containing an email address
function _findEmailApplyContext(snapshot) {
  const applyContext = snapshot.emailContexts.find((ctx) => APPLY_EMAIL_KEYWORDS.test(ctx))
  if (!applyContext) return null

  const emailMatch = applyContext.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/)
  if (!emailMatch) return null

  return {
    context: 'email_contact',
    details: {
      to: emailMatch[0],
      subject: `Application - ${snapshot.title}`,
      body: 'Please find my CV and cover letter attached as requested.',
      attachments: _extractAttachments(applyContext)
    }
  }
}

// Fallback: search bodyText for an email address near apply keywords
// Handles cases where emailContexts is empty (e.g. email only in mailto: href)
function _findEmailApplyInBodyText(snapshot) {
  if (!snapshot.bodyText || !snapshot.emailsOnPage.length) return null

  for (const email of snapshot.emailsOnPage) {
    const idx = snapshot.bodyText.indexOf(email)
    if (idx === -1) continue
    const nearby = snapshot.bodyText.substring(
      Math.max(0, idx - 200),
      Math.min(snapshot.bodyText.length, idx + 200)
    )
    if (APPLY_EMAIL_KEYWORDS.test(nearby)) {
      return {
        context: 'email_contact',
        details: {
          to: email,
          subject: `Application - ${snapshot.title}`,
          body: 'Please find my CV and cover letter attached as requested.',
          attachments: _extractAttachments(nearby)
        }
      }
    }
  }
  return null
}

// Pre-Claude detection: classify as email_contact without a Claude API call when possible.
function detectEmailContactFromSnapshot(snapshot) {
  // Strip cookie consent banner inputs — they appear on many sites and are not application fields.
  const appInputs = snapshot.inputs.filter((inp) => {
    const id = (inp.id || '').toLowerCase()
    const name = (inp.name || '').toLowerCase()
    return !id.includes('cookie') && !name.includes('cookie')
  })

  // Strict path: no application form inputs at all
  if (appInputs.length === 0 && !snapshot.forms) {
    const result = _findEmailApplyContext(snapshot) || _findEmailApplyInBodyText(snapshot)
    if (result) return result
  }

  // Relaxed path: page has only non-application inputs (search bar, newsletter subscription, etc.),
  // not actual application form fields.
  if (appInputs.length > 0 && appInputs.length <= 3 && !snapshot.forms) {
    const isAllNonApplicationInputs = appInputs.every((inp) => {
      const id = (inp.id || '').toLowerCase()
      const name = (inp.name || '').toLowerCase()
      const ariaLabel = (inp.ariaLabel || '').toLowerCase()
      return (
        inp.type === 'search' ||
        id.includes('search') || name.includes('search') || ariaLabel.includes('search') ||
        name.includes('newsletter') || id.includes('newsletter')
      )
    })
    if (isAllNonApplicationInputs) {
      const result = _findEmailApplyContext(snapshot) || _findEmailApplyInBodyText(snapshot)
      if (result) return result
    }
  }

  return null
}

async function scanPage(page, scanCount = 0) {
  const snapshot = await extractPageSnapshot(page, scanCount)
  const emailContact = detectEmailContactFromSnapshot(snapshot)
  if (emailContact) return emailContact
  return analyzePageWithClaude(snapshot)
}

module.exports = { scanPage }
