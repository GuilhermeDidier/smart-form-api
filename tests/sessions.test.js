// sessions.js manages Playwright browsers — mock chromium to avoid real browser launch
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn()
  }
}))

const { chromium } = require('playwright')
const { createSession, getSession, touchSession, deleteSession, getActiveSessions } = require('../src/sessions')

function makeMockBrowser() {
  const mockPage = {
    on: jest.fn(),
    goto: jest.fn(),
    waitForLoadState: jest.fn()
  }
  const mockContext = { newPage: jest.fn().mockResolvedValue(mockPage) }
  const mockBrowser = { newContext: jest.fn().mockResolvedValue(mockContext), close: jest.fn().mockResolvedValue(undefined) }
  return { mockBrowser, mockContext, mockPage }
}

describe('sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clean up any sessions left from previous tests
    // (sessions module is a singleton — use deleteSession)
  })

  test('createSession returns session with page and default fields', async () => {
    const { mockBrowser, mockPage } = makeMockBrowser()
    chromium.launch.mockResolvedValue(mockBrowser)

    const session = await createSession('test-id-1')

    expect(session.page).toBe(mockPage)
    expect(session.lastAnalysis).toBeNull()
    expect(session.scanCount).toBe(0)
    expect(session.crashed).toBe(false)
    expect(session.consecutiveUnknownCount).toBe(0)

    await deleteSession('test-id-1')
  })

  test('createSession registers crash handler on page', async () => {
    const { mockBrowser, mockPage } = makeMockBrowser()
    chromium.launch.mockResolvedValue(mockBrowser)

    await createSession('test-id-2')

    expect(mockPage.on).toHaveBeenCalledWith('crash', expect.any(Function))
    await deleteSession('test-id-2')
  })

  test('getSession returns null for unknown id', () => {
    expect(getSession('nonexistent')).toBeNull()
  })

  test('getSession returns session after createSession', async () => {
    const { mockBrowser } = makeMockBrowser()
    chromium.launch.mockResolvedValue(mockBrowser)

    await createSession('test-id-3')
    expect(getSession('test-id-3')).not.toBeNull()
    await deleteSession('test-id-3')
  })

  test('deleteSession closes browser and removes from map', async () => {
    const { mockBrowser } = makeMockBrowser()
    chromium.launch.mockResolvedValue(mockBrowser)

    await createSession('test-id-4')
    const result = await deleteSession('test-id-4')

    expect(result).toBe(true)
    expect(mockBrowser.close).toHaveBeenCalled()
    expect(getSession('test-id-4')).toBeNull()
  })

  test('deleteSession returns false for unknown id', async () => {
    const result = await deleteSession('nonexistent-id')
    expect(result).toBe(false)
  })

  test('getActiveSessions returns correct count', async () => {
    const { mockBrowser: b1 } = makeMockBrowser()
    const { mockBrowser: b2 } = makeMockBrowser()
    chromium.launch.mockResolvedValueOnce(b1).mockResolvedValueOnce(b2)

    const before = getActiveSessions()
    await createSession('test-id-5')
    await createSession('test-id-6')
    expect(getActiveSessions()).toBe(before + 2)

    await deleteSession('test-id-5')
    await deleteSession('test-id-6')
    expect(getActiveSessions()).toBe(before)
  })
})
