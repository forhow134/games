import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const BASE_URL = 'http://localhost:5173'
const OUT_DIR = path.resolve('posts/05-forest-quest/assets/gifs')
const TMP_DIR = path.resolve('posts/05-forest-quest/assets/.gif-tmp')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

ensureDir(OUT_DIR)
ensureDir(TMP_DIR)

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

async function recordFrames(page, name, durationMs, fps = 15) {
  const folder = path.join(TMP_DIR, name)
  ensureDir(folder)
  // clean previous
  fs.readdirSync(folder).forEach((f) => fs.unlinkSync(path.join(folder, f)))

  const interval = 1000 / fps
  const totalFrames = Math.floor((durationMs / 1000) * fps)
  log(`Recording ${totalFrames} frames for ${name} @ ${fps}fps`)

  for (let i = 0; i < totalFrames; i++) {
    await page.evaluate(() => window.__gameInternals._forceAnimate(performance.now()))
    const framePath = path.join(folder, `frame-${String(i).padStart(4, '0')}.png`)
    await page.screenshot({ path: framePath, fullPage: false })
    await page.waitForTimeout(interval)
  }

  const gifPath = path.join(OUT_DIR, `${name}.gif`)
  const palettePath = path.join(folder, 'palette.png')

  // Generate optimized palette and GIF via ffmpeg
  const ffmpegCmd = [
    'ffmpeg',
    '-y',
    '-framerate', String(fps),
    '-i', `"${path.join(folder, 'frame-%04d.png')}"`,
    '-vf', `"fps=${fps},scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer"`,
    '-loop', '0',
    `"${gifPath}"`,
  ].join(' ')

  log(`Running: ${ffmpegCmd}`)
  execSync(ffmpegCmd, { stdio: 'inherit' })

  const stats = fs.statSync(gifPath)
  log(`Created ${gifPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)

  // If > 3MB, re-encode with lower fps / colors
  if (stats.size > 3 * 1024 * 1024) {
    log('GIF > 3MB, re-encoding with 10fps / 48 colors...')
    const reCmd = [
      'ffmpeg',
      '-y',
      '-framerate', '10',
      '-i', `"${path.join(folder, 'frame-%04d.png')}"`,
      '-vf', '"fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48[p];[s1][p]paletteuse=dither=bayer"',
      '-loop', '0',
      `"${gifPath}"`,
    ].join(' ')
    execSync(reCmd, { stdio: 'inherit' })
    const stats2 = fs.statSync(gifPath)
    log(`Re-encoded ${gifPath} (${(stats2.size / 1024 / 1024).toFixed(2)} MB)`)
  }

  // cleanup frames
  fs.readdirSync(folder).forEach((f) => fs.unlinkSync(path.join(folder, f)))
  fs.rmdirSync(folder)
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

    // ── gif-01-platform-jump (L2 moving platforms) ──────────
    log('=== gif-01-platform-jump ===')
    await setLevelAndWait(page, 2)
    await setPlayerPos(page, 6, 3, 0)
    await setCamera(page, { x: 6, y: 8, z: 14 }, { x: 12, y: 2, z: 0 })
    await waitWithAnimate(page, 500)
    await recordFrames(page, 'gif-01-platform-jump', 8000, 15)

    // ── gif-02-enemy-stomp (L2 stomp mushroom) ──────────────
    log('=== gif-02-enemy-stomp ===')
    await setLevelAndWait(page, 2)
    // Place player above first mushroom
    await setPlayerPos(page, 4, 4, 0)
    await setCamera(page, { x: 0, y: 6, z: 10 }, { x: 4, y: 1, z: 0 })
    await waitWithAnimate(page, 300)
    await recordFrames(page, 'gif-02-enemy-stomp', 6000, 15)

    // ── gif-03-boss-fight (L6 phase switch + rocks) ─────────
    log('=== gif-03-boss-fight ===')
    await setLevelAndWait(page, 6)
    await setPlayerPos(page, -6, 1, 6)
    await page.evaluate(() => {
      const b = window.__gameInternals?.getBoss?.()
      if (b) {
        b.hp = 5
        b.phase = 1
        b.state = 'ACTIVE'
        b.invulnTimer = 0
      }
      window.__gameInternals?.setPlayerHp?.(999)
      window.__gameInternals?.setPlayerInvuln?.(999)
    })
    await setCamera(page, { x: -12, y: 8, z: 14 }, { x: 0, y: 2, z: 0 })
    await waitWithAnimate(page, 500)
    // Trigger stomp to push into phase 2 during recording
    await page.evaluate(() => window.__gameInternals?.forceStompBoss?.())
    await recordFrames(page, 'gif-03-boss-fight', 9000, 15)

    // ── gif-04-level-clear (enter portal → LEVEL_COMPLETE) ──
    log('=== gif-04-level-clear ===')
    await setLevelAndWait(page, 1)
    // collect all crystals instantly
    await page.evaluate(() => {
      const cs = window.__gameInternals?._levelCrystals || []
      cs.forEach((c) => { c.collected = true; c.mesh.visible = false })
    })
    await setPlayerPos(page, 29, 6, 0)
    await setCamera(page, { x: 22, y: 9, z: 12 }, { x: 30, y: 4, z: 0 })
    await waitWithAnimate(page, 500)
    await recordFrames(page, 'gif-04-level-clear', 8000, 15)

    log('All GIFs done.')
  } catch (e) {
    console.error('GIF fatal error:', e.message)
  } finally {
    await browser.close()
  }
}

run()
