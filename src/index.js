require('dotenv').config()
const express = require('express')
const path = require('path')
const { getScreenshotsDir } = require('./screenshotter')
const routes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Serve screenshots statically
app.use('/screenshots', express.static(getScreenshotsDir()))

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
