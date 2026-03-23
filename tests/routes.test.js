jest.mock('../src/sessions')
jest.mock('../src/scanner')
jest.mock('../src/filler')
jest.mock('../src/screenshotter')

const sessions = require('../src/sessions')
const { scanPage } = require('../src/scanner')
const { fillForm } = require('../src/filler')
const { takeScreenshot } = require('../src/screenshotter')

// Import after mocks
const express = require('express')
const routes = require('../src/routes')

const app = express()
app.use(express.json())
app.use('/', routes)

const request = require('supertest')

describe('POST /start', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 400 when url is missing', async () => {
    const res = await request(app).post('/start').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/url is required/)
  })

  test('returns data_request on form page', async () => {
    const mockPage = { goto: jest.fn().mockResolvedValue(undefined), waitForLoadState: jest.fn().mockResolvedValue(undefined) }
    sessions.createSession.mockResolvedValue({ page: mockPage, lastAnalysis: null, scanCount: 0, crashed: false })
    sessions.getSession.mockReturnValue({ page: mockPage, lastAnalysis: null, scanCount: 0, crashed: false })
    sessions.deleteSession.mockResolvedValue(true)

    takeScreenshot.mockResolvedValue('https://host/screenshots/abc_page_loaded.png')
    scanPage.mockResolvedValue({
      context: 'form',
      fields: [{ id: 'email', label: 'Email', selector: '[name="email"]', type: 'email', required: true, options: [] }],
      submit_selector: 'button[type="submit"]'
    })

    const res = await request(app).post('/start').send({ url: 'https://example.com' })
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('data_request')
    expect(res.body.context).toBe('form')
    expect(res.body.session_id).toBeDefined()
    expect(res.body.fields).toHaveLength(1)
    expect(res.body.screenshots).toHaveLength(1)
  })

  test('returns action_required and closes session on email_contact', async () => {
    const mockPage = { goto: jest.fn().mockResolvedValue(undefined), waitForLoadState: jest.fn().mockResolvedValue(undefined) }
    sessions.createSession.mockResolvedValue({ page: mockPage, lastAnalysis: null, scanCount: 0, crashed: false })
    sessions.deleteSession.mockResolvedValue(true)
    takeScreenshot.mockResolvedValue('https://host/screenshots/abc_page_loaded.png')
    scanPage.mockResolvedValue({
      context: 'email_contact',
      details: { to: 'hr@co.com', subject: 'Application', body: 'Hello' }
    })

    const res = await request(app).post('/start').send({ url: 'https://example.com' })
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('action_required')
    expect(res.body.action).toBe('send_email')
    expect(sessions.deleteSession).toHaveBeenCalled()
  })
})

describe('POST /respond', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 400 when session_id or values missing', async () => {
    const res = await request(app).post('/respond').send({ session_id: 'abc' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/values/)
  })

  test('returns 404 when session not found', async () => {
    sessions.getSession.mockReturnValue(null)
    const res = await request(app).post('/respond').send({ session_id: 'bad', values: [] })
    expect(res.status).toBe(404)
  })

  test('returns result on success page after fill', async () => {
    const mockSession = {
      page: { waitForLoadState: jest.fn().mockResolvedValue(undefined) },
      lastAnalysis: { context: 'form', fields: [], submit_selector: 'button' },
      scanCount: 0,
      crashed: false
    }
    sessions.getSession.mockReturnValue(mockSession)
    sessions.touchSession.mockImplementation(() => {})
    sessions.deleteSession.mockResolvedValue(true)
    fillForm.mockResolvedValue({ filled: [{ field: 'Email', value: 'test@x.com' }], skipped: [] })
    takeScreenshot.mockResolvedValue('https://host/screenshots/abc_filled.png')
    scanPage.mockResolvedValue({ context: 'success' })

    const res = await request(app).post('/respond').send({
      session_id: 'abc123',
      values: [{ id: 'email', value: 'test@x.com' }]
    })

    expect(res.status).toBe(200)
    expect(res.body.type).toBe('result')
    expect(res.body.status).toBe('success')
    expect(res.body.fields_filled).toHaveLength(1)
    expect(sessions.deleteSession).toHaveBeenCalled()
  })

  test('returns 500 when session has crashed', async () => {
    sessions.getSession.mockReturnValue({ crashed: true })
    const res = await request(app).post('/respond').send({ session_id: 'abc', values: [] })
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/crashed/)
  })
})

describe('DELETE /session/:id', () => {
  test('returns 200 when session closed', async () => {
    sessions.deleteSession.mockResolvedValue(true)
    const res = await request(app).delete('/session/abc123')
    expect(res.status).toBe(200)
    expect(res.body.closed).toBe(true)
  })

  test('returns 404 when session not found', async () => {
    sessions.deleteSession.mockResolvedValue(false)
    const res = await request(app).delete('/session/notfound')
    expect(res.status).toBe(404)
  })
})

describe('GET /health', () => {
  test('returns ok with session count', async () => {
    sessions.getActiveSessions.mockReturnValue(3)
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.sessions).toBe(3)
    expect(res.body.uptime).toBeGreaterThanOrEqual(0)
  })
})
