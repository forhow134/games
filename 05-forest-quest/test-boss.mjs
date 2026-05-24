import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', msg => {
    const type = msg.type()
    if (type === 'error' || type === 'warn') {
      console.log(`[${type}] ${msg.text()}`)
    }
  })
  page.on('pageerror', err => console.log('[pageerror]', err.message))

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Shot 17: L6 Phase 1
  await page.evaluate(() => {
    if (window.__gameInternals) window.__gameInternals.setLevel(6)
  })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'shot-17-boss-phase1.png' })
  console.log('shot-17 done')

  // Shot 18: damageBoss(4) -> Phase 2
  await page.evaluate(() => {
    if (window.__gameInternals) window.__gameInternals.damageBoss(4)
  })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'shot-18-boss-phase2.png' })
  console.log('shot-18 done')

  // Shot 19: damageBoss(4) -> dead, wait 2.5s for portal reveal
  await page.evaluate(() => {
    if (window.__gameInternals) window.__gameInternals.damageBoss(4)
  })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'shot-19-portal-revealed.png' })
  console.log('shot-19 done')

  // Collect console errors
  const errors = await page.evaluate(() => {
    if (window.__errors) return window.__errors
    return []
  })
  console.log('console errors count:', errors.length)

  await browser.close()
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
