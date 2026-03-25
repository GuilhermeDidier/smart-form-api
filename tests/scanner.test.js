jest.mock('../src/claude', () => ({
  analyzePageWithClaude: jest.fn(),
  ApiError: class ApiError extends Error {
    constructor(msg, code) { super(msg); this.code = code }
  }
}))

const { analyzePageWithClaude } = require('../src/claude')
const { scanPage } = require('../src/scanner')

function makeMockPage(evaluateResult) {
  return {
    evaluate: jest.fn().mockResolvedValue(evaluateResult),
    url: jest.fn().mockReturnValue('https://example.com/apply'),
    title: jest.fn().mockResolvedValue('Apply Now')
  }
}

const baseSnapshot = {
  url: 'https://example.com/apply',
  title: 'Apply Now',
  forms: null,
  inputs: [{ tag: 'INPUT', type: 'text', name: 'email', id: 'email', placeholder: null, ariaLabel: 'Email', required: true, className: '', options: null }],
  labels: [{ htmlFor: 'email', text: 'Email Address' }],
  buttons: [{ text: 'Submit', type: 'submit', className: 'btn-primary' }],
  reactDropdowns: [],
  emailsOnPage: [],
  emailContexts: [],
  bodyText: 'Please fill in your email'
}

describe('scanPage', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns Claude analysis for a form page', async () => {
    const mockPage = makeMockPage(baseSnapshot)
    const claudeResult = {
      context: 'form',
      fields: [{ id: 'email', label: 'Email Address', selector: '[name="email"]', type: 'email', required: true, options: [] }],
      submit_selector: 'button[type="submit"]'
    }
    analyzePageWithClaude.mockResolvedValue(claudeResult)

    const result = await scanPage(mockPage, 0)
    expect(result.context).toBe('form')
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0].selector).toBe('[name="email"]')
  })

  test('returns email_contact context', async () => {
    const mockPage = makeMockPage(baseSnapshot)
    analyzePageWithClaude.mockResolvedValue({
      context: 'email_contact',
      details: { to: 'hr@company.com', subject: 'Application', body: 'Hello' }
    })

    const result = await scanPage(mockPage, 0)
    expect(result.context).toBe('email_contact')
    expect(result.details.to).toBe('hr@company.com')
  })

  test('returns success context', async () => {
    const mockPage = makeMockPage(baseSnapshot)
    analyzePageWithClaude.mockResolvedValue({ context: 'success' })

    const result = await scanPage(mockPage, 0)
    expect(result.context).toBe('success')
  })

  test('passes scanCount to pageInfo for additional_form detection', async () => {
    const mockPage = makeMockPage(baseSnapshot)
    analyzePageWithClaude.mockResolvedValue({ context: 'additional_form', fields: [], submit_selector: '' })

    await scanPage(mockPage, 2)
    const callArg = analyzePageWithClaude.mock.calls[0][0]
    expect(callArg.scanCount).toBe(2)
  })

  test('propagates Claude API errors', async () => {
    const mockPage = makeMockPage(baseSnapshot)
    const err = new Error('rate limit'); err.code = 'RATE_LIMIT'
    analyzePageWithClaude.mockRejectedValue(err)

    await expect(scanPage(mockPage, 0)).rejects.toMatchObject({ code: 'RATE_LIMIT' })
  })

  test('detects email_contact directly without Claude when no form and apply context found', async () => {
    const noFormSnapshot = {
      ...baseSnapshot,
      inputs: [],
      forms: null,
      emailsOnPage: ['jobs@company.com'],
      emailContexts: ['Please send your CV and candidature to jobs@company.com']
    }
    const mockPage = makeMockPage(noFormSnapshot)

    const result = await scanPage(mockPage, 0)
    expect(result.context).toBe('email_contact')
    expect(result.details.to).toBe('jobs@company.com')
    expect(analyzePageWithClaude).not.toHaveBeenCalled()
  })

  test('falls through to Claude when email context has no apply keywords', async () => {
    const noFormSnapshot = {
      ...baseSnapshot,
      inputs: [],
      forms: null,
      emailsOnPage: ['info@company.com'],
      emailContexts: ['Contact us at info@company.com for general inquiries']
    }
    const mockPage = makeMockPage(noFormSnapshot)
    analyzePageWithClaude.mockResolvedValue({ context: 'unknown' })

    const result = await scanPage(mockPage, 0)
    expect(result.context).toBe('unknown')
    expect(analyzePageWithClaude).toHaveBeenCalled()
  })

  // RC-1: mailto: links put email in href only — emailContexts may be empty but bodyText has context
  test('detects email_contact from bodyText when emailContexts is empty (mailto: link case)', async () => {
    const snapshot = {
      ...baseSnapshot,
      inputs: [],
      forms: null,
      emailsOnPage: ['jobs@company.com'],
      emailContexts: [],
      bodyText: 'We are hiring! Please send your CV and application to jobs@company.com. We look forward to hearing from you.'
    }
    const mockPage = makeMockPage(snapshot)

    const result = await scanPage(mockPage, 0)
    expect(result.context).toBe('email_contact')
    expect(result.details.to).toBe('jobs@company.com')
    expect(analyzePageWithClaude).not.toHaveBeenCalled()
  })

  // RC-2: page has only a nav search bar — should not block email_contact detection
  test('detects email_contact when only navigation search inputs are present', async () => {
    const snapshot = {
      ...baseSnapshot,
      inputs: [{ tag: 'INPUT', type: 'search', name: 'q', id: 'search', placeholder: 'Search jobs', ariaLabel: null, required: false, className: '', options: null }],
      forms: null,
      emailsOnPage: ['jobs@company.com'],
      emailContexts: ['Please send your CV to jobs@company.com to apply for this position']
    }
    const mockPage = makeMockPage(snapshot)

    const result = await scanPage(mockPage, 0)
    expect(result.context).toBe('email_contact')
    expect(result.details.to).toBe('jobs@company.com')
    expect(analyzePageWithClaude).not.toHaveBeenCalled()
  })

  // RC-3: missing keywords — "submit your application to"
  test('detects email_contact with "submit application" keywords', async () => {
    const snapshot = {
      ...baseSnapshot,
      inputs: [],
      forms: null,
      emailsOnPage: ['hr@company.com'],
      emailContexts: ['Interested candidates should submit their application to hr@company.com'],
      bodyText: ''
    }
    const mockPage = makeMockPage(snapshot)

    const result = await scanPage(mockPage, 0)
    expect(result.context).toBe('email_contact')
    expect(result.details.to).toBe('hr@company.com')
    expect(analyzePageWithClaude).not.toHaveBeenCalled()
  })
})
