#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import process from 'process'

const root = process.cwd()
const contentDir = path.join(root, 'packages', 'content')

const loadIndex = async (filename) => {
  const filePath = path.join(contentDir, filename)
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

const assetBase = (() => {
  const value = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || process.env.ASSETS_BASE_URL || ''
  return value ? value.replace(/\/+$/, '') : ''
})()

if (!assetBase) {
  console.error('NEXT_PUBLIC_ASSETS_BASE_URL (or ASSETS_BASE_URL) must be set to validate assets.')
  process.exit(1)
}

const resolveUrl = (relative) => {
  const cleaned = relative.replace(/^\/+/, '')
  if (assetBase.endsWith('/assets') && cleaned.startsWith('assets/')) {
    return `${assetBase}/${cleaned.slice('assets/'.length)}`
  }
  return `${assetBase}/${cleaned}`
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function checkUrl(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return { ok: response.ok, status: response.status }
    } catch (error) {
      if (attempt === 0) {
        await sleep(100 * (attempt + 1))
      } else {
        return { ok: false, status: 0, error: error.message }
      }
    }
  }
  return { ok: false, status: 0 }
}

async function validateIndex(label, index) {
  const entries = Object.entries(index)
  const failures = []
  let checked = 0
  const concurrency = 20
  const queue = [...entries]

  async function worker() {
    while (queue.length) {
      const [key, relative] = queue.shift()
      const url = resolveUrl(relative)
      const result = await checkUrl(url)
      checked += 1
      if (!result.ok) {
        failures.push({ key, url, status: result.status, error: result.error })
        console.error(`[${label}] Missing: ${key} -> ${url} (status ${result.status || 'ERR'})`)
      } else if (checked % 100 === 0) {
        console.log(`[${label}] Checked ${checked}/${entries.length}`)
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, entries.length) }, () => worker())
  await Promise.all(workers)
  return failures
}

async function main() {
  const [audioIndex, imageIndex] = await Promise.all([
    loadIndex('audio.index.json'),
    loadIndex('images.index.json')
  ])

  console.log(`Validating assets against ${assetBase} ...`)

  const [audioFailures, imageFailures] = await Promise.all([
    validateIndex('audio', audioIndex),
    validateIndex('images', imageIndex)
  ])

  const totalFailures = audioFailures.length + imageFailures.length
  if (totalFailures === 0) {
    console.log('✅ All referenced assets are available in R2')
  } else {
    console.error(`❌ Missing ${totalFailures} assets. See log above.`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Validation failed:', error)
  process.exit(1)
})
