import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5173'
const OUT_DIR = path.resolve('posts/05-forest-quest/assets/models')

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

async function screenshot(page, name) {
  const p = path.join(OUT_DIR, name)
  await page.screenshot({ path: p, fullPage: false })
  log(`Screenshot: ${name}`)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  })

  try {
    await page.goto(BASE_URL)
    await page.waitForTimeout(3000)
    await page.waitForFunction(() => !!window.__gameInternals?._forceAnimate, { timeout: 10000 })

    const models = [
      { name: 'model-player-fox', asset: 'player-fox', note: '主角狐狸' },
      { name: 'model-enemy-mushroom', asset: 'enemy-mushroom', note: '蘑菇怪' },
      { name: 'model-enemy-sprite', asset: 'enemy-sprite', note: '小精灵' },
      { name: 'model-boss-stone-giant', asset: 'boss-stone-giant', note: 'Boss石巨人' },
    ]

    for (const m of models) {
      log(`=== ${m.name} ===`)
      await page.evaluate(async (assetName) => {
        const mod = await import('/node_modules/.vite/deps/three.js')
        const THREE = mod
        const scene = window.__gameInternals?.getScene?.()
        if (!scene) return

        // Clear previous showcase
        const old = scene.getObjectByName('showcase-group')
        if (old) scene.remove(old)

        const group = new THREE.Group()
        group.name = 'showcase-group'

        // Light grey background plane
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(30, 30),
          new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 1 })
        )
        plane.rotation.x = -Math.PI / 2
        plane.position.y = -0.01
        plane.receiveShadow = true
        group.add(plane)

        // Key light
        const key = new THREE.DirectionalLight(0xffffff, 1.2)
        key.position.set(5, 8, 5)
        key.castShadow = true
        key.shadow.mapSize.set(1024, 1024)
        group.add(key)

        // Fill light
        const fill = new THREE.DirectionalLight(0xddeeff, 0.5)
        fill.position.set(-5, 4, -2)
        group.add(fill)

        // Rim light
        const rim = new THREE.DirectionalLight(0xffeedd, 0.4)
        rim.position.set(0, 3, -6)
        group.add(rim)

        // Load asset via same loader
        const { loadAsset } = await import('/src/loaders/asset-loader.js')
        const mesh = await loadAsset(assetName)
        mesh.position.set(0, 0, 0)
        mesh.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        group.add(mesh)

        scene.add(group)

        // Position camera
        const cam = scene.getObjectByProperty('isCamera', true)
        if (cam) {
          cam.position.set(3, 2.5, 4)
          cam.lookAt(0, 1, 0)
          cam.updateProjectionMatrix()
        }
      }, m.asset)

      await page.waitForTimeout(1500)
      await waitWithAnimate(page, 1000)
      await screenshot(page, `${m.name}.png`)
    }

    log('All model showcase shots done.')
  } catch (e) {
    console.error('Model showcase fatal error:', e.message)
  } finally {
    await browser.close()
  }
}

run()
