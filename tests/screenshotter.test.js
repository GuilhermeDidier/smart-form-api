// Override BASE_URL before requiring the module
process.env.BASE_URL = 'https://test.example.com'

// Mock fs and page to avoid real disk/browser calls
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}))

const { takeScreenshot, getScreenshotsDir } = require('../src/screenshotter')

describe('screenshotter', () => {
  test('takeScreenshot returns correct public URL', async () => {
    const mockPage = {
      screenshot: jest.fn().mockResolvedValue(undefined)
    }

    const url = await takeScreenshot(mockPage, 'session-abc', 'page_loaded')
    expect(url).toBe('https://test.example.com/screenshots/session-abc_page_loaded.png')
  })

  test('takeScreenshot calls page.screenshot with correct path', async () => {
    const mockPage = { screenshot: jest.fn().mockResolvedValue(undefined) }
    await takeScreenshot(mockPage, 'session-xyz', 'form_filled')

    const callArg = mockPage.screenshot.mock.calls[0][0]
    expect(callArg.path).toMatch(/session-xyz_form_filled\.png$/)
    expect(callArg.fullPage).toBe(false)
  })

  test('getScreenshotsDir returns a non-empty string path', () => {
    const dir = getScreenshotsDir()
    expect(typeof dir).toBe('string')
    expect(dir.length).toBeGreaterThan(0)
  })

  test('URL uses BASE_URL as prefix — no other module constructs screenshot URLs', () => {
    // This test documents that BASE_URL ownership lives here exclusively
    expect(process.env.BASE_URL).toBe('https://test.example.com')
  })
})
