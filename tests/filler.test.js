const { fillForm } = require('../src/filler')

function makePage(overrides = {}) {
  return {
    fill: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    selectOption: jest.fn().mockResolvedValue(undefined),
    check: jest.fn().mockResolvedValue(undefined),
    uncheck: jest.fn().mockResolvedValue(undefined),
    setInputFiles: jest.fn().mockResolvedValue(undefined),
    keyboard: { press: jest.fn().mockResolvedValue(undefined) },
    waitForTimeout: jest.fn().mockResolvedValue(undefined),
    $: jest.fn().mockResolvedValue(null),
    ...overrides
  }
}

const analysis = {
  context: 'form',
  fields: [
    { id: 'name', label: 'Name', selector: '[name="name"]', type: 'text', required: true, options: [] },
    { id: 'email', label: 'Email', selector: '[name="email"]', type: 'email', required: true, options: [] },
    { id: 'country', label: 'Country', selector: '[name="country"]', type: 'select', required: true, options: ['Canada', 'USA'] },
    { id: 'agree', label: 'Agree', selector: '[name="agree"]', type: 'checkbox', required: false, options: [] }
  ],
  submit_selector: 'button[type="submit"]'
}

describe('fillForm', () => {
  beforeEach(() => jest.clearAllMocks())

  test('fills text field', async () => {
    const page = makePage()
    const values = [{ id: 'name', value: 'John Doe' }]
    const result = await fillForm(page, values, analysis)
    expect(page.fill).toHaveBeenCalledWith('[name="name"]', 'John Doe')
    expect(result.filled).toHaveLength(1)
    expect(result.filled[0].field).toBe('Name')
  })

  test('fills email field', async () => {
    const page = makePage()
    await fillForm(page, [{ id: 'email', value: 'test@example.com' }], analysis)
    expect(page.fill).toHaveBeenCalledWith('[name="email"]', 'test@example.com')
  })

  test('fills native select', async () => {
    const page = makePage()
    await fillForm(page, [{ id: 'country', value: 'Canada' }], analysis)
    expect(page.selectOption).toHaveBeenCalledWith('[name="country"]', 'Canada')
  })

  test('falls back to React-Select and only matches visible options', async () => {
    const mockEl = { click: jest.fn().mockResolvedValue(undefined) }
    const page = makePage({
      selectOption: jest.fn().mockRejectedValue(new Error('not a native <select>')),
      $: jest.fn().mockImplementation((sel) =>
        sel.includes(':visible') && sel.includes('Canada') ? mockEl : null
      )
    })
    await fillForm(page, [{ id: 'country', value: 'Canada' }], analysis)
    expect(mockEl.click).toHaveBeenCalled()
  })

  test('checks checkbox when value is true', async () => {
    const page = makePage()
    await fillForm(page, [{ id: 'agree', value: 'true' }], analysis)
    expect(page.check).toHaveBeenCalledWith('[name="agree"]')
  })

  test('unchecks checkbox when value is false', async () => {
    const page = makePage()
    await fillForm(page, [{ id: 'agree', value: 'false' }], analysis)
    expect(page.uncheck).toHaveBeenCalledWith('[name="agree"]')
  })

  test('skips field when id not in analysis and adds to skipped', async () => {
    const page = makePage()
    const result = await fillForm(page, [{ id: 'nonexistent', value: 'x' }], analysis)
    expect(page.fill).not.toHaveBeenCalled()
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].reason).toMatch(/not found in analysis/)
  })

  test('fills multiple fields and returns all filled', async () => {
    const page = makePage()
    const values = [
      { id: 'name', value: 'Jane' },
      { id: 'email', value: 'jane@example.com' }
    ]
    const result = await fillForm(page, values, analysis)
    expect(result.filled).toHaveLength(2)
    expect(page.fill).toHaveBeenCalledTimes(2)
  })

  test('adds to skipped on fill error and continues', async () => {
    const page = makePage({ fill: jest.fn().mockRejectedValue(new Error('selector not found')) })
    const result = await fillForm(page, [{ id: 'name', value: 'John' }], analysis)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].reason).toMatch(/selector not found/)
    expect(result.filled).toHaveLength(0)
  })

  test('submits using submit_selector', async () => {
    const page = makePage()
    await fillForm(page, [], analysis)
    expect(page.click).toHaveBeenCalledWith('button[type="submit"]')
  })

  test('falls back to Enter key when submit selector fails', async () => {
    const page = makePage({ click: jest.fn().mockRejectedValue(new Error('not found')) })
    await fillForm(page, [], analysis)
    expect(page.keyboard.press).toHaveBeenCalledWith('Enter')
  })
})
