/**
 * tests/verify-controls.mjs
 * Playwright script to verify three bug fixes:
 *   1. Mouse drag rotates camera (tpc.target was null)
 *   2. W key moves player toward platforms (+X direction)
 *   3. Camera auto-follow: camera yaw changes after sustained movement
 */

import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'
const PASS = '✅ PASS'
const FAIL = '❌ FAIL'

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  ${PASS}  ${msg}`)
    passed++
  } else {
    console.log(`  ${FAIL}  ${msg}`)
    failed++
  }
}

async function waitWithAnimate(page, ms) {
  const steps = Math.max(1, Math.floor(ms / 50))
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.__gameInternals._forceAnimate(performance.now()))
    await page.waitForTimeout(30)
  }
}

async function startLevel1(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => typeof window.__gameInternals !== 'undefined')

  // Click Start Adventure button
  await page.evaluate(() => window.__gameInternals?.setLevel?.(1))
  await page.waitForFunction(
    () => window.__gameInternals?._levelReady === true,
    { timeout: 15000 }
  )
  // Let a few frames run so player mesh and tpc.target are set
  await waitWithAnimate(page, 500)
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser error]', msg.text())
  })

  // ── Test 1: tpc.target is set (not null) ───────────────────────────────
  console.log('\n[Test 1] tpc.target should be set after level load')
  await startLevel1(page)
  const tpcHasTarget = await page.evaluate(() => {
    const tpc = window.__gameInternals?.getTpc?.()
    return tpc !== null && tpc !== undefined && tpc.target !== null && tpc.target !== undefined
  })
  assert(tpcHasTarget, 'tpc.target is not null after level load')

  // ── Test 2: Initial camera yaw is -PI/2 ────────────────────────────────
  console.log('\n[Test 2] Initial camera yaw should be -PI/2 (facing +X toward platforms)')
  const initialYaw = await page.evaluate(() => window.__gameInternals?.getTpcYaw?.())
  assert(
    Math.abs(initialYaw - (-Math.PI / 2)) < 0.05,
    `Initial tpc.yaw ≈ -PI/2 (got ${initialYaw?.toFixed(3)})`
  )

  // ── Test 3: Camera position reflects yaw (not stuck at origin) ─────────
  console.log('\n[Test 3] Camera should be positioned relative to player (not at 0,8,15)')
  const camPos = await page.evaluate(() => window.__gameInternals?.getCameraPos?.())
  const playerPos = await page.evaluate(() => window.__gameInternals?.getPlayerPos?.())
  // Camera should be offset from player (not identical, not at default 0,8,15)
  const camMovedFromDefault = camPos && !(
    Math.abs(camPos.x - 0) < 0.1 &&
    Math.abs(camPos.y - 8) < 0.1 &&
    Math.abs(camPos.z - 15) < 0.1
  )
  assert(camMovedFromDefault, `Camera moved from initGame default (x=${camPos?.x?.toFixed(2)}, y=${camPos?.y?.toFixed(2)}, z=${camPos?.z?.toFixed(2)})`)

  // ── Test 4: Mouse drag changes camera yaw ──────────────────────────────
  console.log('\n[Test 4] Mouse drag should change camera yaw')
  const yawBefore = await page.evaluate(() => window.__gameInternals?.getTpcYaw?.())
  const canvas = page.locator('#game')
  const box = await canvas.boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  // Simulate horizontal drag: 200px to the right
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 0; i < 10; i++) {
    await page.mouse.move(cx + i * 20, cy)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await waitWithAnimate(page, 200)

  const yawAfter = await page.evaluate(() => window.__gameInternals?.getTpcYaw?.())
  const yawDelta = Math.abs(yawAfter - yawBefore)
  assert(yawDelta > 0.05, `Camera yaw changed by ${yawDelta.toFixed(4)} rad after horizontal drag`)

  // ── Test 5: W key moves player in +X direction ─────────────────────────
  console.log('\n[Test 5] Pressing W should move player in +X direction (toward platforms)')
  // Re-start clean level
  await startLevel1(page)
  const posBefore = await page.evaluate(() => window.__gameInternals?.getPlayerPos?.())

  // Hold W for ~30 frames (simulate via keydown + animate)
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }))
  })
  await waitWithAnimate(page, 600)
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }))
  })
  await waitWithAnimate(page, 200)

  const posAfter = await page.evaluate(() => window.__gameInternals?.getPlayerPos?.())
  const deltaX = posAfter.x - posBefore.x
  const deltaZ = Math.abs(posAfter.z - posBefore.z)
  assert(deltaX > 1.0, `Player moved +X by ${deltaX.toFixed(3)} after pressing W (platforms are in +X)`)
  assert(deltaZ < 1.0, `Player Z drift is small (${deltaZ.toFixed(3)}) — direction is correct`)

  // ── Test 6: Auto-follow camera after sustained movement ────────────────
  console.log('\n[Test 6] Camera auto-follow should rotate yaw after sustained player movement')
  await startLevel1(page)
  // Manually rotate camera away from default (yaw = 0)
  await page.evaluate(() => {
    const tpc = window.__gameInternals?.getTpc?.()
    if (tpc) { tpc.yaw = 0; tpc._noInputTimer = 0 }
    window.__gameInternals._tpcYawOverrideTest = true
  })

  // Hold W for 3+ seconds so auto-follow kicks in (delay=1.5s)
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }))
  })
  await waitWithAnimate(page, 3000)
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }))
  })

  const yawAutoFollow = await page.evaluate(() => window.__gameInternals?.getTpcYaw?.())
  // After auto-follow, yaw should shift toward -PI/2 (behind player moving in +X)
  const shiftedTowardTarget = yawAutoFollow < -0.3  // should be closer to -PI/2
  assert(shiftedTowardTarget, `Auto-follow shifted yaw toward -PI/2: got ${yawAutoFollow?.toFixed(3)}`)

  // ── Summary ────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('─'.repeat(50))

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
})()
