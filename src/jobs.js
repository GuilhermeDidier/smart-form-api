const { v4: uuidv4 } = require('uuid')

const jobs = new Map()
const JOB_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

function createJob() {
  const jobId = uuidv4()
  const timeoutHandle = setTimeout(() => {
    jobs.delete(jobId)
  }, JOB_TIMEOUT_MS)

  jobs.set(jobId, {
    status: 'processing',
    result: null,
    error: null,
    created_at: Date.now(),
    timeoutHandle
  })

  return jobId
}

function getJob(jobId) {
  return jobs.get(jobId) || null
}

function resolveJob(jobId, result) {
  const job = jobs.get(jobId)
  if (!job) {
    console.warn(`[jobs] resolveJob called on missing/expired job: ${jobId}`)
    return
  }
  clearTimeout(job.timeoutHandle)
  job.status = 'done'
  job.result = result
}

function failJob(jobId, errorMsg) {
  const job = jobs.get(jobId)
  if (!job) {
    console.warn(`[jobs] failJob called on missing/expired job: ${jobId}`)
    return
  }
  clearTimeout(job.timeoutHandle)
  job.status = 'error'
  job.error = errorMsg
}

module.exports = { createJob, getJob, resolveJob, failJob }
