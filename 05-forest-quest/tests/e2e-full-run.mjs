import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { LEVELS, getLevel } from '../src/levels/level-data.js'

const BASE_URL = 'http://localhost:5173'
const OUT_DIR = path.resolve('output/playwright')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

ensureDir(OUT_DIR)

const bugs = []
const observations = []

function addBug(level, title, severity, fixed, detail) {
  bugs.push({ level, title, severity, fixed, detail })
}

function addObservation(level, text) {
  observations.push({ level, text })
}

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

async function waitForState(page, targetState, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const state = await page.evaluate(() => window.__gameInternals?.getState?.())
    if (state === targetState) return
    await page.waitForTimeout(100)
  }
  throw new Error(`Timeout waiting for state ${targetState}`)
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

async function getPlayerPos(page) {
  return page.evaluate(() => {
    const p = window.__gameInternals?.getPlayer?.()
    return p
      ? {
          x: p.mesh.position.x,
          y: p.mesh.position.y,
          z: p.mesh.position.z,
          onGround: p.onGround,
          vy: p.velocity.y,
        }
      : null
  })
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

async function getEnemies(page) {
  return page.evaluate(() => {
    const arr = window.__gameInternals?.getLevelEnemies?.() || []
    return arr.map((e) => ({
      type: e.type,
      state: e.state,
      hp: e.hp,
      phase: e.phase,
      x: e.mesh?.position?.x,
      y: e.mesh?.position?.y,
      z: e.mesh?.position?.z,
    }))
  })
}

async function getBoss(page) {
  return page.evaluate(() => {
    const b = window.__gameInternals?.getBoss?.()
    return b
      ? {
          hp: b.hp,
          maxHp: b.maxHp,
          phase: b.phase,
          state: b.state,
          activeRocks: b.activeRocks?.length ?? 0,
        }
      : null
  })
}

async function screenshot(page, name) {
  const p = path.join(OUT_DIR, name)
  await page.screenshot({ path: p })
  log(`Screenshot: ${name}`)
}

// ── L1: real walk ─────────────────────────────────────────
async function testL1(page) {
  log('=== L1 ===')
  await page.click('#overlay-title .btn-start')
  await waitForState(page, 'PLAYING')
  await page.waitForFunction(
    () => window.__gameInternals?._levelReady === true,
    { timeout: 15000 }
  )
  await page.waitForTimeout(1000)

  let lastX = -999
  let stuckFrames = 0
  let crystalsBefore = await page.evaluate(() => window.__gameInternals?.getCurrentCrystals?.() || 0)
  let maxVy = -999

  for (let i = 0; i < 300; i++) {
    await page.keyboard.down('KeyD')

    const pos = await getPlayerPos(page)
    if (!pos) break
    if (pos.vy > maxVy) maxVy = pos.vy

    // Reached portal area
    if (pos.x > 29 && pos.y > 4) {
      await page.waitForTimeout(800)
      break
    }

    // Detect stuck
    if (Math.abs(pos.x - lastX) < 0.03) {
      stuckFrames++
    } else {
      stuckFrames = 0
    }
    lastX = pos.x

    // Jump if on ground or stuck
    if (pos.onGround || stuckFrames > 8) {
      await page.keyboard.down('Space')
      await page.waitForTimeout(80)
      await page.keyboard.up('Space')
    }

    // Fall safety: teleport back to nearest platform
    if (pos.y < -5) {
      const platforms = [
        { x: 0, y: 0.25 },
        { x: 4, y: 0.75 },
        { x: 7, y: 1.25 },
        { x: 10, y: 1.75 },
        { x: 13, y: 2.25 },
        { x: 17, y: 2.75 },
        { x: 21, y: 3.75 },
        { x: 25, y: 4.25 },
        { x: 29, y: 4.75 },
      ]
      let nearest = platforms[0]
      for (const p of platforms) {
        if (p.x <= pos.x + 2 && p.x > nearest.x) nearest = p
      }
      await setPlayerPos(page, nearest.x, nearest.y + 0.5, 0)
      stuckFrames = 0
      await page.waitForTimeout(300)
    }

    await page.waitForTimeout(50)
  }

  await page.keyboard.up('KeyD')
  await page.waitForTimeout(1000)

  const crystals = await page.evaluate(() => window.__gameInternals?.getCurrentCrystals?.() || 0)
  const state = await page.evaluate(() => window.__gameInternals?.getState?.())

  addObservation(1, `maxVy=${maxVy.toFixed(2)}, crystals=${crystals}, finalState=${state}`)

  if (crystals <= crystalsBefore) {
    addBug(1, 'Did not collect any crystal', 'experience', false, `crystals=${crystals}`)
  }
  if (state !== 'LEVEL_COMPLETE') {
    addBug(1, 'L1 did not complete', 'blocking', false, `State=${state}`)
  }
  await screenshot(page, 'e2e-L1.png')
}

// ── L2: mushroom patrol ───────────────────────────────────
async function testL2(page) {
  log('=== L2 ===')
  await setLevelAndWait(page, 2)

  const enemies = await getEnemies(page)
  const mush = enemies.find((e) => e.type === 'mushroom')
  if (!mush) {
    addBug(2, 'Mushroom not spawned', 'blocking', false, 'No mushroom enemy found')
    await screenshot(page, 'e2e-L2.png')
    return
  }

  const x1 = mush.x
  await waitWithAnimate(page, 1200)
  const enemies2 = await getEnemies(page)
  const mush2 = enemies2.find((e) => e.type === 'mushroom')
  const x2 = mush2 ? mush2.x : x1

  addObservation(2, `mushroom x1=${x1.toFixed(3)} x2=${x2.toFixed(3)} delta=${(x2 - x1).toFixed(3)}`)

  if (Math.abs(x2 - x1) < 0.01) {
    addBug(2, 'Mushroom not patrolling', 'experience', false, `x1=${x1.toFixed(2)} x2=${x2.toFixed(2)}`)
  }

  await screenshot(page, 'e2e-L2.png')
}

// ── L3: sprite chase ──────────────────────────────────────
async function testL3(page) {
  log('=== L3 ===')
  await setLevelAndWait(page, 3)

  const enemies = await getEnemies(page)
  const sprite = enemies.find((e) => e.type === 'sprite')
  if (!sprite) {
    addBug(3, 'Sprite not spawned', 'blocking', false, 'No sprite enemy found')
    await screenshot(page, 'e2e-L3.png')
    return
  }

  // Teleport near sprite (within detect range 8)
  await setPlayerPos(page, sprite.x + 3, sprite.y + 0.5, sprite.z)
  await waitWithAnimate(page, 500)

  const s1 = await getEnemies(page).then((arr) => {
    const s = arr.find((e) => e.type === 'sprite')
    return s ? { x: s.x, z: s.z } : null
  })
  await waitWithAnimate(page, 1500)
  const s2 = await getEnemies(page).then((arr) => {
    const s = arr.find((e) => e.type === 'sprite')
    return s ? { x: s.x, z: s.z } : null
  })

  if (!s1 || !s2) {
    addBug(3, 'Sprite disappeared', 'blocking', false, 'Could not read sprite position')
  } else {
    const dist1 = Math.hypot(s1.x - (sprite.x + 3), s1.z - sprite.z)
    const dist2 = Math.hypot(s2.x - (sprite.x + 3), s2.z - sprite.z)
    addObservation(3, `sprite dist1=${dist1.toFixed(2)} dist2=${dist2.toFixed(2)}`)
    // Sprite should have moved toward player (dist1 < initial distance ~3)
    if (dist1 >= 2.5) {
      addBug(3, 'Sprite not chasing player', 'experience', false, `dist1=${dist1.toFixed(2)} (should be < 2.5)`)
    }
  }

  await screenshot(page, 'e2e-L3.png')
}

// ── L4: bouncy platform ───────────────────────────────────
async function testL4(page) {
  log('=== L4 ===')
  await setLevelAndWait(page, 4)

  // Teleport above first bouncy platform [0,4.0,0] and let fall onto it
  await setPlayerPos(page, 0, 5.5, 0)
  // Run exactly one animation frame to trigger bounce
  await page.evaluate(() => window.__gameInternals._forceAnimate(performance.now()))

  const pos = await getPlayerPos(page)
  const vyAfterBounce = pos ? pos.vy : -999
  addObservation(4, `bouncy vy=${vyAfterBounce.toFixed(2)} y=${pos ? pos.y.toFixed(2) : 'null'}`)

  if (vyAfterBounce <= 8) {
    addBug(4, 'Bouncy platform did not launch player high', 'blocking', false, `vy=${vyAfterBounce.toFixed(2)}`)
  }

  await screenshot(page, 'e2e-L4.png')
}

// ── L5: golem existence ───────────────────────────────────
async function testL5(page) {
  log('=== L5 ===')
  await setLevelAndWait(page, 5)

  const enemies = await getEnemies(page)
  const golem = enemies.find((e) => e.type === 'golem')
  if (!golem) {
    addBug(5, 'Golem not spawned', 'blocking', false, 'No golem enemy found')
  } else {
    addObservation(5, `golem state=${golem.state} hp=${golem.hp} pos=(${golem.x.toFixed(1)},${golem.y.toFixed(1)},${golem.z.toFixed(1)})`)
    if (golem.state !== 'ACTIVE') {
      addBug(5, 'Golem not active', 'blocking', false, `state=${golem.state}`)
    }
  }

  await screenshot(page, 'e2e-L5.png')
}

// ── L6: Boss ──────────────────────────────────────────────
async function testL6(page) {
  log('=== L6 ===')
  await setLevelAndWait(page, 6)

  const portalHidden = await page.evaluate(() => window.__gameInternals?.getPortalHidden?.())
  if (portalHidden !== true) {
    addBug(6, 'Portal not hidden at start', 'blocking', false, `portalHidden=${portalHidden}`)
  }

  const hpSequence = []
  let phaseSwitched = false
  let rocksInPhase2 = 0

  for (let i = 0; i < 8; i++) {
    // Keep player safe on high platform before each stomp
    await setPlayerPos(page, -8, 5, -8)
    await page.evaluate(() => {
      window.__gameInternals?.setPlayerHp?.(999)
      window.__gameInternals?.setPlayerInvuln?.(999)
    })
    await waitWithAnimate(page, 100)

    await page.evaluate(() => window.__gameInternals?.forceStompBoss?.())
    await waitWithAnimate(page, 600)
    const info = await getBoss(page)
    if (!info) {
      addBug(6, 'Boss disappeared during stomp', 'blocking', false, `stomp=${i + 1}`)
      break
    }
    hpSequence.push(info.hp)
    log(`  stomp ${i + 1}: hp=${info.hp}, phase=${info.phase}, state=${info.state}, rocks=${info.activeRocks}`)
    if (info.hp <= 4 && info.phase === 2) {
      phaseSwitched = true
      if (info.activeRocks > rocksInPhase2) rocksInPhase2 = info.activeRocks
    }
  }

  await waitWithAnimate(page, 2500)
  const bossInfo = await getBoss(page)
  addObservation(6, `boss hp sequence=[${hpSequence.join(',')}], phaseSwitched=${phaseSwitched}, maxRocks=${rocksInPhase2}, finalState=${bossInfo?.state}`)

  if (!bossInfo || bossInfo.hp !== 0) {
    addBug(6, 'Boss not killed after 8 stomps', 'blocking', false, `hp=${bossInfo?.hp}`)
  }

  if (!phaseSwitched) {
    addBug(6, 'Boss did not switch to phase 2', 'blocking', false, 'hp never went <=4 with phase=2')
  }

  const portalHiddenAfter = await page.evaluate(() => window.__gameInternals?.getPortalHidden?.())
  if (portalHiddenAfter !== false) {
    addBug(6, 'Portal not revealed after boss death', 'blocking', false, `portalHidden=${portalHiddenAfter}`)
  }

  if (bossInfo?.state !== 'DEAD') {
    addBug(6, 'Boss state not DEAD after death', 'blocking', false, `state=${bossInfo?.state}`)
  }

  if (rocksInPhase2 === 0) {
    addBug(6, 'No falling rocks in phase 2', 'experience', false, 'activeRocks remained 0')
  }

  await screenshot(page, 'e2e-L6-boss-dead.png')

  // Walk into portal from high platform
  await setPlayerPos(page, -8, 5, -8)
  await waitWithAnimate(page, 300)
  await page.keyboard.down('KeyW')
  await page.keyboard.down('KeyD')
  await waitWithAnimate(page, 2500)
  await page.keyboard.up('KeyW')
  await page.keyboard.up('KeyD')

  const l6State = await page.evaluate(() => window.__gameInternals?.getState?.())
  if (l6State !== 'LEVEL_COMPLETE') {
    addBug(6, 'L6 did not complete after entering portal', 'blocking', false, `State=${l6State}`)
  }
  await screenshot(page, 'e2e-L6-clear.png')
}

// ── Main ──────────────────────────────────────────────────
async function runTest() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (msg) => {
    if (msg.text().includes('[game]')) console.log('[BROWSER]', msg.text())
  })

  try {
    await page.goto(BASE_URL)
    await page.waitForTimeout(3000)
    await page.waitForFunction(() => !!window.__gameInternals?._forceAnimate, { timeout: 10000 })

    await testL1(page)
    await testL2(page)
    await testL3(page)
    await testL4(page)
    await testL5(page)
    await testL6(page)

    // Write JSON report
    const report = {
      date: new Date().toISOString(),
      bugs,
      observations,
    }
    fs.writeFileSync(path.join(OUT_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2))
    log('Report written to ' + path.join(OUT_DIR, 'e2e-report.json'))

    // Write markdown report
    const mdLines = [
      '# Phase 4-7 Verify Report',
      `Date: ${new Date().toISOString()}`,
      '',
      '## Observations',
      ...observations.map((o) => `- **L${o.level}**: ${o.text}`),
      '',
      '## Bugs Found',
      ...bugs.map((b) => `- **L${b.level}** \`${b.severity}\` ${b.title}${b.fixed ? ' (FIXED)' : ''}: ${b.detail}`),
      '',
      '## Summary',
      `- Blocking bugs: ${bugs.filter((b) => b.severity === 'blocking').length}`,
      `- Experience bugs: ${bugs.filter((b) => b.severity === 'experience').length}`,
      `- Acceptable bugs: ${bugs.filter((b) => b.severity === 'acceptable').length}`,
      `- Fixed in this step: ${bugs.filter((b) => b.fixed).length}`,
    ]
    fs.writeFileSync(path.join('docs', 'phase-4-7-verify-report.md'), mdLines.join('\n'))
    log('Markdown report written to docs/phase-4-7-verify-report.md')
  } catch (e) {
    console.error('E2E fatal error:', e.message)
    await screenshot(page, 'e2e-fatal-error.png')
    const report = { date: new Date().toISOString(), bugs, observations, fatalError: e.message }
    fs.writeFileSync(path.join(OUT_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2))
  } finally {
    await browser.close()
  }
}

runTest()
