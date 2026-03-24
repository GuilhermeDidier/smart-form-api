require('dotenv').config()
const express = require('express')
const path = require('path')
const fs = require('fs')
const { getScreenshotsDir } = require('./screenshotter')
const routes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Serve demo page
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/demo.html'))
})

// Serve screenshots via explicit route (avoids Railway nginx interception of static files)
app.get('/screenshots/:filename', (req, res) => {
  const { filename } = req.params
  if (!/^[\w-]+\.png$/.test(filename)) {
    return res.status(400).json({ error: 'invalid filename' })
  }
  const filepath = path.join(getScreenshotsDir(), filename)
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'screenshot not found' })
  }
  res.sendFile(filepath)
})

// Routes
app.use('/', routes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Smart Form API running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app
