const { analyzePageWithClaude } = require('../src/claude')

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }))
})

const Anthropic = require('@anthropic-ai/sdk')

describe('analyzePageWithClaude', () => {
  let mockCreate

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate = jest.fn()
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate }
    }))
  })

  test('parses valid JSON response from Claude', async () => {
    const validResponse = { context: 'form', fields: [], submit_selector: 'button[type="submit"]' }
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify(validResponse) }]
    })

    const result = await analyzePageWithClaude({ url: 'https://example.com', inputs: [] })
    expect(result).toEqual(validResponse)
  })

  test('strips markdown fences and parses JSON', async () => {
    const validResponse = { context: 'login', fields: [], submit_selector: '#login-btn' }
    mockCreate.mockResolvedValue({
      content: [{ text: '```json\n' + JSON.stringify(validResponse) + '\n```' }]
    })

    const result = await analyzePageWithClaude({ url: 'https://example.com', inputs: [] })
    expect(result).toEqual(validResponse)
  })

  test('retries once on invalid JSON, succeeds on second attempt', async () => {
    const validResponse = { context: 'success' }
    mockCreate
      .mockResolvedValueOnce({ content: [{ text: 'not json at all' }] })
      .mockResolvedValueOnce({ content: [{ text: JSON.stringify(validResponse) }] })

    const result = await analyzePageWithClaude({ url: 'https://example.com', inputs: [] })
    expect(result).toEqual(validResponse)
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  test('throws ScannerError after two failed JSON parses', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: 'still not json' }] })

    await expect(analyzePageWithClaude({ url: 'https://example.com', inputs: [] }))
      .rejects.toMatchObject({ code: 'SCANNER_ERROR' })
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  test('wraps Claude 429 as rate limit error', async () => {
    const error = new Error('Rate limit')
    error.status = 429
    mockCreate.mockRejectedValue(error)

    await expect(analyzePageWithClaude({ url: 'https://example.com', inputs: [] }))
      .rejects.toMatchObject({ code: 'RATE_LIMIT' })
  })

  test('wraps Claude 401 as auth error', async () => {
    const error = new Error('Unauthorized')
    error.status = 401
    mockCreate.mockRejectedValue(error)

    await expect(analyzePageWithClaude({ url: 'https://example.com', inputs: [] }))
      .rejects.toMatchObject({ code: 'AUTH_ERROR' })
  })

  test('parses account_creation context correctly', async () => {
    const validResponse = {
      context: 'account_creation',
      fields: [
        { id: 'email', label: 'Email', selector: '[name="email"]', type: 'email', required: true, options: [] },
        { id: 'password', label: 'Password', selector: '[name="password"]', type: 'password', required: true, options: [] }
      ],
      submit_selector: 'button[type="submit"]'
    }
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify(validResponse) }]
    })

    const result = await analyzePageWithClaude({ url: 'https://example.com', inputs: [] })
    expect(result.context).toBe('account_creation')
    expect(result.fields).toHaveLength(2)
  })

  test('passes through attachments in email_contact details', async () => {
    const validResponse = {
      context: 'email_contact',
      details: {
        to: 'hr@company.com',
        subject: 'Application',
        body: 'Please find attached.',
        attachments: ['cv.pdf', 'cover_letter.pdf']
      }
    }
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify(validResponse) }]
    })

    const result = await analyzePageWithClaude({ url: 'https://example.com', inputs: [] })
    expect(result.context).toBe('email_contact')
    expect(result.details.attachments).toEqual(['cv.pdf', 'cover_letter.pdf'])
  })
})
