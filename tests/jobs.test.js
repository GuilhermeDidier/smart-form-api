const { createJob, getJob, resolveJob, failJob } = require('../src/jobs')

describe('jobs store', () => {
  test('createJob returns a job_id and job starts as processing', () => {
    const jobId = createJob()
    const job = getJob(jobId)
    expect(jobId).toBeDefined()
    expect(job).not.toBeNull()
    expect(job.status).toBe('processing')
    expect(job.result).toBeNull()
    expect(job.error).toBeNull()
  })

  test('getJob returns null for unknown id', () => {
    expect(getJob('not-a-real-id')).toBeNull()
  })

  test('resolveJob sets status to done and stores result', () => {
    const jobId = createJob()
    const result = { type: 'result', status: 'success' }
    resolveJob(jobId, result)
    const job = getJob(jobId)
    expect(job.status).toBe('done')
    expect(job.result).toEqual(result)
  })

  test('failJob sets status to error and stores message', () => {
    const jobId = createJob()
    failJob(jobId, 'something went wrong')
    const job = getJob(jobId)
    expect(job.status).toBe('error')
    expect(job.error).toBe('something went wrong')
  })

  test('resolveJob on expired/missing job is a no-op (does not throw)', () => {
    expect(() => resolveJob('ghost-id', { type: 'result' })).not.toThrow()
  })

  test('failJob on expired/missing job is a no-op (does not throw)', () => {
    expect(() => failJob('ghost-id', 'error')).not.toThrow()
  })
})
