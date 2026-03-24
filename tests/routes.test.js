jest.mock('../src/sessions')
jest.mock('../src/scanner')
jest.mock('../src/filler')
jest.mock('../src/screenshotter')
jest.mock('../src/jobs')

const sessions = require('../src/sessions')
const { scanPage } = require('../src/scanner')
const { fillForm } = require('../src/filler')
const { takeScreenshot } = require('../src/screenshotter')
const jobs = require('../src/jobs')

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

describe('POST /respond — async', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jobs.createJob.mockReturnValue('job-uuid-1')
    jobs.getJob.mockReturnValue({ status: 'processing', result: null, error: null })
    jobs.resolveJob.mockImplementation(() => {})
    jobs.failJob.mockImplementation(() => {})
  })

  test('returns 400 when session_id is missing', async () => {
    const res = await request(app).post('/respond').send({ values: [] })
    expect(res.status).toBe(400)
  })

  test('returns 400 when values is missing', async () => {
    const res = await request(app).post('/respond').send({ session_id: 'abc' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/values/)
  })

  test('returns 404 when session not found', async () => {
    sessions.getSession.mockReturnValue(null)
    const res = await request(app).post('/respond').send({ session_id: 'bad', values: [] })
    expect(res.status).toBe(404)
  })

  test('returns 500 when session has crashed', async () => {
    sessions.getSession.mockReturnValue({ crashed: true })
    const res = await request(app).post('/respond').send({ session_id: 'abc', values: [] })
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/crashed/)
  })

  test('returns 409 when session already has an active job', async () => {
    sessions.getSession.mockReturnValue({
      crashed: false,
      activeJobId: 'existing-job-id',
      lastAnalysis: null
    })
    const res = await request(app).post('/respond').send({ session_id: 'abc', values: [] })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/job already in progress/)
  })

  test('returns HTTP 202 with job_id immediately for valid request', async () => {
    const mockSession = {
      crashed: false,
      activeJobId: null,
      lastAnalysis: { context: 'form', fields: [], submit_selector: 'button' },
      scanCount: 0,
      consecutiveUnknownCount: 0,
      page: { waitForLoadState: jest.fn().mockResolvedValue(undefined) }
    }
    sessions.getSession.mockReturnValue(mockSession)
    sessions.touchSession.mockImplementation(() => {})
    fillForm.mockResolvedValue({ filled: [], skipped: [] })
    takeScreenshot.mockResolvedValue('https://host/s/abc.png')
    scanPage.mockResolvedValue({ context: 'success' })
    sessions.deleteSession.mockResolvedValue(true)

    const res = await request(app).post('/respond').send({
      session_id: 'abc123',
      values: [{ id: 'email', value: 'test@x.com' }]
    })

    expect(res.status).toBe(202)
    expect(res.body.type).toBe('processing')
    expect(res.body.job_id).toBe('job-uuid-1')
    expect(res.body.session_id).toBe('abc123')
  })

  test('fillForm rejection causes failJob to be called', async () => {
    const mockSession = {
      crashed: false,
      activeJobId: null,
      lastAnalysis: { context: 'form', fields: [], submit_selector: 'button' },
      scanCount: 0,
      consecutiveUnknownCount: 0,
      page: { waitForLoadState: jest.fn().mockResolvedValue(undefined) }
    }
    sessions.getSession.mockReturnValue(mockSession)
    sessions.touchSession.mockImplementation(() => {})
    fillForm.mockRejectedValue(new Error('playwright crash'))
    takeScreenshot.mockResolvedValue('https://host/s/abc.png')

    await request(app).post('/respond').send({
      session_id: 'abc123',
      values: []
    })

    // The background promise rejects and the call-site .catch handles it.
    // setTimeout(0) flushes the microtask queue; 50ms is a safe margin.
    await new Promise(r => setTimeout(r, 50))
    expect(jobs.failJob).toHaveBeenCalledWith('job-uuid-1', 'playwright crash')
  })

  test('activeJobId is cleared on session after job completes', async () => {
    const mockSession = {
      crashed: false,
      activeJobId: null,
      lastAnalysis: { context: 'form', fields: [], submit_selector: 'button' },
      scanCount: 0,
      consecutiveUnknownCount: 0,
      page: { waitForLoadState: jest.fn().mockResolvedValue(undefined) }
    }
    sessions.getSession.mockReturnValue(mockSession)
    sessions.touchSession.mockImplementation(() => {})
    fillForm.mockResolvedValue({ filled: [], skipped: [] })
    takeScreenshot.mockResolvedValue('https://host/s/abc.png')
    scanPage.mockResolvedValue({ context: 'success' })
    sessions.deleteSession.mockResolvedValue(true)

    await request(app).post('/respond').send({ session_id: 'abc123', values: [] })
    // The background promise rejects and the call-site .catch handles it.
    // setTimeout(0) flushes the microtask queue; 50ms is a safe margin.
    await new Promise(r => setTimeout(r, 50))

    expect(mockSession.activeJobId).toBeNull()
  })
})

describe('GET /jobs/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 404 for unknown job_id', async () => {
    jobs.getJob.mockReturnValue(null)
    const res = await request(app).get('/jobs/unknown-id')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/)
  })

  test('returns processing state while job is running', async () => {
    jobs.getJob.mockReturnValue({ status: 'processing', result: null, error: null })
    const res = await request(app).get('/jobs/job-uuid-1')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('processing')
    expect(res.body.job_id).toBe('job-uuid-1')
  })

  test('returns result payload when job is done', async () => {
    const result = {
      session_id: 'abc123',
      type: 'result',
      status: 'success',
      fields_filled: [{ field: 'Email', value: 'test@x.com' }],
      screenshots: ['https://host/s/abc.png']
    }
    jobs.getJob.mockReturnValue({ status: 'done', result, error: null })
    const res = await request(app).get('/jobs/job-uuid-1')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('result')
    expect(res.body.job_id).toBe('job-uuid-1')
    expect(res.body.fields_filled).toHaveLength(1)
  })

  test('returns error payload (HTTP 200) when job failed', async () => {
    jobs.getJob.mockReturnValue({ status: 'error', result: null, error: 'session expired during execution' })
    const res = await request(app).get('/jobs/job-uuid-1')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('error')
    expect(res.body.error).toBe('session expired during execution')
    expect(res.body.job_id).toBe('job-uuid-1')
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
