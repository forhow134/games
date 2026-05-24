import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5173'
const OUT_DIR = path.resolve('posts/05-forest-quest/assets/screenshots')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

ensureDir(OUT_DIR)

function log(msg) {
  console.log(msg)
}

async function waitWithAnimate(page, ms) {
  const steps = Math.max(1, Math.floor(ms / 50))
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.__gameInternals._forceAnimate(performance.now()))
    await page.waitForTimeout(50)
  }
}

async function setLevelAndWait(page, levelId) {
  await page.evaluate((id) => window.__gameInternals?.setLevel?.(id), levelId)
  await page.waitForFunction(
    (id) => window.__gameInternals?.getCurrentLevelId?.() === id,
    levelId,
    { timeout: 10000 }
  )
  await page.waitForFunction(
    () => window.__gameInternals?._levelReady === true,
    { timeout: 15000 }
  )
  await waitWithAnimate(page, 500)
}

async function setPlayerPos(page, x, y, z) {
  await page.evaluate(
    (pos) => {
      const p = window.__gameInternals?.getPlayer?.()
      if (p) {
        p.mesh.position.set(pos.x, pos.y, pos.z)
        p.velocity.set(0, 0, 0)
        p.onGround = false
      }
    },
    { x, y, z }
  )
}

async function screenshot(page, name) {
  const p = path.join(OUT_DIR, name)
  await page.screenshot({ path: p, fullPage: false })
  log(`Screenshot: ${name}`)
}

async function setCamera(page, pos, lookAt) {
  await page.evaluate(
    ({ p, t }) => {
      const cam = window.__gameInternals?.getScene?.()?.getObjectByProperty('isCamera', true)
      if (!cam) return
      cam.position.set(p.x, p.y, p.z)
      cam.lookAt(t.x, t.y, t.z)
      cam.updateProjectionMatrix()
    },
    { p: pos, t: lookAt }
  )
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  })
  page.on('console', (msg) => {
    if (msg.text().includes('[game]')) console.log('[BROWSER]', msg.text())
  })

  try {
    await page.goto(BASE_URL)
    await page.waitForTimeout(3000)
    await page.waitForFunction(() => !!window.__gameInternals?._forceAnimate, { timeout: 10000 })

    // ── shot-01-title ───────────────────────────────────────
    log('=== shot-01-title ===')
    await page.evaluate(() => {
      if (window.__gameInternals?.getState?.() !== 'MENU') {
        // reload to menu if not already
        location.reload()
      }
    })
    await page.waitForTimeout(2000)
    await waitWithAnimate(page, 1000)
    await screenshot(page, 'shot-01-title.png')

    // ── shot-07-level-select (do before entering levels) ────
    log('=== shot-07-level-select ===')
    await page.evaluate(() => {
      // unlock all for nice grid
      const save = window.__gameInternals?.getSaveState?.()
      if (save) {
        for (let i = 1; i <= 6; i++) save.levels[i] = { unlocked: true, bestStars: i % 3 + 1, bestTime: 60 + i * 10 }
      }
      window.__gameInternals?.setState?.('LEVEL_SELECT')
    })
    await page.waitForTimeout(800)
    await waitWithAnimate(page, 800)
    await screenshot(page, 'shot-07-level-select.png')

    // ── shot-02-L1-overview ─────────────────────────────────
    log('=== shot-02-L1-overview ===')
    await setLevelAndWait(page, 1)
    await setPlayerPos(page, 10, 3, 2)
    await setCamera(page, { x: 5, y: 12, z: 18 }, { x: 15, y: 2, z: 0 })
    await waitWithAnimate(page, 1000)
    await screenshot(page, 'shot-02-L1-overview.png')

    // ── shot-03-L3-chase ────────────────────────────────────
    log('=== shot-03-L3-chase ===')
    await setLevelAndWait(page, 3)
    // Teleport player near sprite so it chases
    const spriteInfo = await page.evaluate(() => {
      const arr = window.__gameInternals?.getLevelEnemies?.() || []
      const s = arr.find((e) => e.type === 'sprite')
      return s ? { x: s.mesh.position.x, y: s.mesh.position.y, z: s.mesh.position.z } : null
    })
    if (spriteInfo) {
      await setPlayerPos(page, spriteInfo.x + 4, spriteInfo.y + 0.5, spriteInfo.z)
      await waitWithAnimate(page, 1200)
    }
    await setCamera(page, { x: spriteInfo.x - 6, y: 7, z: 12 }, { x: spriteInfo.x + 2, y: 1, z: spriteInfo.z })
    await waitWithAnimate(page, 800)
    await screenshot(page, 'shot-03-L3-chase.png')

    // ── shot-04-L4-bouncy-air ───────────────────────────────
    log('=== shot-04-L4-bouncy-air ===')
    await setLevelAndWait(page, 4)
    await setPlayerPos(page, 0, 5.5, 0)
    await page.evaluate(() => window.__gameInternals._forceAnimate(performance.now()))
    await waitWithAnimate(page, 200)
    await setCamera(page, { x: -8, y: 8, z: 10 }, { x: 0, y: 6, z: 0 })
    await waitWithAnimate(page, 500)
    await screenshot(page, 'shot-04-L4-bouncy-air.png')

    // ── shot-05-L6-boss-phase1 ──────────────────────────────
    log('=== shot-05-L6-boss-phase1 ===')
    await setLevelAndWait(page, 6)
    await setPlayerPos(page, -5, 1, 5)
    await page.evaluate(() => {
      const b = window.__gameInternals?.getBoss?.()
      if (b) {
        b.mesh.position.set(0, 0.5, 0)
        b.phase = 1
        b.hp = 8
        b.state = 'ACTIVE'
      }
    })
    await setCamera(page, { x: -10, y: 6, z: 12 }, { x: 0, y: 2, z: 0 })
    await waitWithAnimate(page, 1000)
    await screenshot(page, 'shot-05-L6-boss-phase1.png')

    // ── shot-06-L6-portal-reveal ────────────────────────────
    log('=== shot-06-L6-portal-reveal ===')
    await setLevelAndWait(page, 6)
    await page.evaluate(() => {
      const b = window.__gameInternals?.getBoss?.()
      if (b) {
        b.hp = 0
        b.state = 'DEAD'
      }
      window.__gameInternals?.damageBoss?.(99)
    })
    await setPlayerPos(page, 3, 1, 3)
    await setCamera(page, { x: -8, y: 5, z: 10 }, { x: 0, y: 1.5, z: 0 })
    await waitWithAnimate(page, 1500)
    await screenshot(page, 'shot-06-L6-portal-reveal.png')

    log('All screenshots done.')
  } catch (e) {
    console.error('Screenshot fatal error:', e.message)
    await screenshot(page, 'shot-error.png')
  } finally {
    await browser.close()
  }
}

run()
