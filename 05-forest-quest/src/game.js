import * as THREE from 'three'
import { loadLevel } from './levels/level-loader.js'
import { Player } from './player.js'
import { ThirdPersonCamera } from './camera-controller.js'
import {
  SKY_BLUE,
  FOREST_GREEN,
  CAM_FOV_BASE,
  CAM_NEAR,
  CAM_FAR,
  PLAYER as PLAYER_CFG,
  CAMERA as CAM_CFG,
  FALL_BOUND,
} from './constants.js'
import { loadSave, saveSave, resetSave, unlockLevel, recordLevelResult, isUnlocked } from './save.js'
import { t, onLocaleChange } from './i18n/index.js'

import { updateMovingPlatforms } from './systems/platform-motion.js'

let scene, camera, renderer
let player, tpc
let currentLevelId = null
let levelStartTime = 0
let saveState = null

let input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
  run: false,
  interact: false,
  camYaw: 0,
  camPitch: 0,
}
let colliders = []
let platformMeshes = []
let movingPlatforms = []
let lastTime = 0
let elapsedTime = 0

let levelCrystals = [] // { mesh, collider, collected }
let levelHazards = []  // { mesh, type, damage, cycle, collider }
let levelEnemies = []  // Enemy[]
let totalCrystals = 0
let currentCrystals = 0
let playerHp = 3
let playerInvulnTimer = 0
let playerBlinkTimer = 0
let playerStompTimer = 0

let portalHidden = false

const STATES = Object.freeze({
  MENU: 'MENU',
  LEVEL_SELECT: 'LEVEL_SELECT',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_OVER: 'GAME_OVER',
})

let state = STATES.MENU

// ── State Machine ─────────────────────────────────────────
export function getState() {
  return state
}

export function setState(newState, payload = {}) {
  const prev = state
  state = newState
  onStateChange(prev, newState, payload)
}

function onStateChange(from, to, payload) {
  // Expose state on the body so CSS can scope HUD widgets (e.g. the reset-
  // camera button is only useful and only shown during PLAYING).
  document.body.dataset.state = to
  updateOverlays(to, payload)

  if (to === STATES.PLAYING) {
    const levelId = payload?.levelId || currentLevelId || 1
    startLevel(levelId)
  }

  if (to === STATES.GAME_OVER) {
    if (player?.mesh) player.mesh.visible = false
  }

  if (to === STATES.LEVEL_SELECT) {
    if (player?.mesh) {
      player.mesh.visible = false
    }
  }

  if (to === STATES.MENU) {
    if (player?.mesh) {
      player.mesh.visible = false
    }
  }
}

// ── Overlays integration (populated by ui/overlays.js) ────
let overlayCallbacks = {}
export function registerOverlayCallbacks(cbs) {
  overlayCallbacks = cbs
}

function updateOverlays(to, payload) {
  if (overlayCallbacks.update) {
    overlayCallbacks.update(to, payload)
  }
}

export function refreshLevelSelect() {
  if (overlayCallbacks.refreshLevelSelect) {
    overlayCallbacks.refreshLevelSelect()
  }
}

// ── Scene Init ────────────────────────────────────────────
export function initGame() {
  saveState = loadSave()

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game'),
    antialias: true,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  scene = new THREE.Scene()
  scene.background = new THREE.Color(SKY_BLUE)

  camera = new THREE.PerspectiveCamera(
    CAM_FOV_BASE,
    window.innerWidth / window.innerHeight,
    CAM_NEAR,
    CAM_FAR
  )
  camera.position.set(0, 8, 15)
  camera.lookAt(0, 1, 0)

  // Lights
  const hemiLight = new THREE.HemisphereLight(SKY_BLUE, FOREST_GREEN, 0.6)
  scene.add(hemiLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(10, 20, 10)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(2048, 2048)
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 100
  dirLight.shadow.camera.left = -30
  dirLight.shadow.camera.right = 30
  dirLight.shadow.camera.top = 30
  dirLight.shadow.camera.bottom = -30
  scene.add(dirLight)

  // Resize
  window.addEventListener('resize', onWindowResize)

  // Input
  setupInput()

  // Build player (hidden until level start)
  player = new Player(scene)
  tpc = new ThirdPersonCamera(camera, null)
  tpc.yaw = input.camYaw
  player.init().then(() => {
    player.mesh.visible = false
    tpc.target = player.mesh
  })

  lastTime = performance.now()
  renderer.setAnimationLoop(animate)
  window.__gameInternals = window.__gameInternals || {}
  window.__gameInternals._forceAnimate = (t) => {
    const now = t || performance.now()
    if (now <= lastTime) {
      lastTime = now - 16
    }
    animate(now)
  }
  window.__gameInternals.getScene = () => scene
  window.__gameInternals.getRenderer = () => renderer
  window.__gameInternals.getPlayer = () => player
  window.__gameInternals.retryLevel = () => retryLevel()
  window.__gameInternals.getEnemies = () => levelEnemies
  window.__gameInternals.getEnemyDiag = () => levelEnemies.map(e => {
    const box = new THREE.Box3()
    if (e.mesh) box.setFromObject(e.mesh)
    return {
      type: e.type,
      state: e.state,
      pos: e.mesh ? e.mesh.position.toArray() : null,
      bboxMin: [box.min.x, box.min.y, box.min.z],
      bboxMax: [box.max.x, box.max.y, box.max.z],
      bboxSize: [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z],
    }
  })
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function animate(time) {
  const dt = Math.max(0, Math.min((time - lastTime) / 1000, 0.1))
  lastTime = time

  if (state === STATES.PLAYING) {
    elapsedTime += dt
    if (movingPlatforms.length > 0) {
      updateMovingPlatforms(movingPlatforms, dt, elapsedTime)
    }

    // Stomp check must happen BEFORE player.update() snaps player to ground
    const playerBoxPre = player ? new THREE.Box3().setFromObject(player.mesh) : null
    for (const enemy of levelEnemies) {
      if (enemy.state !== 'ACTIVE') continue
      const enemyBox = enemy.getCollider()
      if (playerBoxPre && playerBoxPre.intersectsBox(enemyBox)) {
        const stomp = player.velocity.y < -1 && player.mesh.position.y > enemyBox.max.y - 0.3 && enemy.config.stompable
        if (stomp) {
          enemy.takeHit(true)
          player.velocity.y = PLAYER_CFG.stompImpulse
          playerStompTimer = 0.15
        }
      }
    }

    if (player) player.update(dt, input, platformMeshes)
    if (tpc) tpc.update(dt, player ? player.velocity : null)

    // Crystal animations and collection
    const now = performance.now() / 1000
    for (const c of levelCrystals) {
      if (c.collected || !c.mesh.visible) continue
      c.mesh.rotation.y += dt * 2
      c.mesh.position.y = c.mesh.userData.baseY + Math.sin(now * 2) * 0.15

      const dist = player.mesh.position.distanceTo(c.mesh.position)
      if (dist < 1.5) {
        c.collected = true
        c.mesh.visible = false
        currentCrystals++
        updateHud()
      }
    }

    // Hazard collisions
    for (const h of levelHazards) {
      let active = h.active !== false
      if (active && h.cycle) {
        const cycleTime = (performance.now() + (h.cycle.phase || 0)) % (h.cycle.onMs + h.cycle.offMs)
        active = cycleTime < h.cycle.onMs
      }
      if (active) {
        const playerBox = new THREE.Box3().setFromObject(player.mesh)
        if (playerBox.intersectsBox(h.collider)) {
          damagePlayer(h.damage || 1)
        }
      }
    }

    // Enemy update + collisions
    const playerBox = new THREE.Box3().setFromObject(player.mesh)
    let boss = null
    for (const enemy of levelEnemies) {
      enemy.update(dt, player, elapsedTime)
      if (enemy.state !== 'ACTIVE') {
        if (enemy.type === 'boss') boss = enemy
        continue
      }
      const enemyBox = enemy.getCollider()
      if (playerBox.intersectsBox(enemyBox)) {
        // Skip if stomp was already handled pre-update
        const alreadyStomped = playerStompTimer > 0
        if (!alreadyStomped && playerInvulnTimer <= 0) {
          damagePlayer(enemy.config.damage || 1)
        }
      }
      if (enemy.type === 'boss') boss = enemy
    }

    // Boss defeated: reveal portal
    if (boss && boss.state === 'DEAD' && portalHidden) {
      portalHidden = false
      if (scene.userData.portal) {
        scene.userData.portal.visible = true
      }
    }

    // Portal flash when revealed
    if (!portalHidden && scene.userData.portal && boss && boss.state === 'DEAD') {
      const flash = Math.sin(elapsedTime * 6) * 0.5 + 0.5
      scene.userData.portal.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.emissive = new THREE.Color(0x00ffaa)
          child.material.emissiveIntensity = flash * 0.8
        }
      })
      const s = 1 + Math.sin(elapsedTime * 4) * 0.1
      scene.userData.portal.scale.setScalar(s)
    } else if (!portalHidden && scene.userData.portal && !boss) {
      // Reset portal visuals for non-boss levels
      scene.userData.portal.scale.setScalar(1)
    }

    // Update HUD every frame for boss HP bar
    if (currentLevelId === 6) {
      updateHud()
    }

    // Invulnerability blink
    if (playerInvulnTimer > 0) {
      playerInvulnTimer -= dt
      playerBlinkTimer -= dt
      if (playerBlinkTimer <= 0) {
        playerBlinkTimer = 0.075
        player.mesh.visible = !player.mesh.visible
      }
      if (playerInvulnTimer <= 0) {
        player.mesh.visible = true
      }
    }
    if (playerStompTimer > 0) {
      playerStompTimer -= dt
    }

    // Fall out of bounds → instant Game Over (DESIGN §9).
    // Skip while a level is still loading: the player mesh can still sit at
    // the previous level's fall position until startLevel repositions it.
    if (!isLoadingLevel && player?.mesh && player.mesh.position.y < FALL_BOUND) {
      setState(STATES.GAME_OVER, { reason: t('gameOver.reasonFell') })
    }

    // Check portal proximity
    if (player?.mesh && scene.userData.portal && !portalHidden) {
      const dist = player.mesh.position.distanceTo(scene.userData.portal.position)
      if (dist < 1.5) {
        completeLevel()
      }
    }
  }

  // Consume one-shot inputs
  input.jumpPressed = false

  renderer.render(scene, camera)
}

let isLoadingLevel = false
let pendingLevelId = null

// ── Level lifecycle ───────────────────────────────────────
async function startLevel(levelId) {
  if (isLoadingLevel) {
    pendingLevelId = levelId
    return
  }
  isLoadingLevel = true
  pendingLevelId = null
  window.__gameInternals = window.__gameInternals || {}
  window.__gameInternals._levelReady = false

  try {
    console.log('[game] startLevel called', levelId, 'current was', currentLevelId)
    currentLevelId = levelId
    elapsedTime = 0
    scene.userData.portal = null

    const levelData = await loadLevel(scene, levelId)

    // If a new level was requested while loading, abort
    if (pendingLevelId !== null) {
      console.log('[game] startLevel aborted', levelId, 'pending', pendingLevelId)
      return
    }

    colliders = levelData.platformColliders
    platformMeshes = levelData.platformMeshes
    movingPlatforms = levelData.movingPlatforms
    scene.userData.portal = levelData.portal.mesh
    levelCrystals = levelData.crystals
    levelHazards = levelData.hazards
    levelEnemies = levelData.enemies
    console.log('[game] levelEnemies set', levelEnemies.length, levelEnemies.map(e => e.type))
    window.__gameInternals = window.__gameInternals || {}
    window.__gameInternals._levelCrystals = levelCrystals
    totalCrystals = levelData.crystals.length
    currentCrystals = 0
    playerHp = 3
    playerInvulnTimer = 0
    playerBlinkTimer = 0
    playerStompTimer = 0
    if (player?.mesh) player.mesh.visible = true
    portalHidden = levelData.portal.hiddenUntilBossDefeated || false
    if (portalHidden) {
      levelData.portal.mesh.visible = false
    }

    // Position player
    player.mesh.position.copy(levelData.playerStart)
    player.velocity.set(0, 0, 0)
    player.mesh.rotation.set(0, 0, 0)
    player.mesh.visible = true
    player.onGround = false
    player.jumpCount = 0
    player.groundPlatform = null
    player.coyoteTimer = 0
    player.jumpBufferTimer = 0
    player.wasOnGround = false
    player.targetAngle = 0

    // Reset camera back to the default behind-the-player follow pose.
    resetCamera()

    levelStartTime = performance.now()
    updateHud()
    window.__gameInternals._levelReady = true
  } finally {
    isLoadingLevel = false
    if (pendingLevelId !== null && pendingLevelId !== currentLevelId) {
      startLevel(pendingLevelId)
    }
  }
}

function completeLevel() {
  if (state !== STATES.PLAYING) return
  const elapsed = (performance.now() - levelStartTime) / 1000

  // Star rating based on crystals collected
  let stars = 1
  if (currentCrystals >= 10) stars = 3
  else if (currentCrystals >= 7) stars = 2
  else if (currentCrystals >= 4) stars = 1
  else stars = 0

  recordLevelResult(saveState, currentLevelId, stars, elapsed, currentCrystals)

  // Unlock next level
  const nextId = currentLevelId + 1
  if (nextId <= 6) {
    unlockLevel(saveState, nextId)
  }

  setState(STATES.LEVEL_COMPLETE, {
    levelId: currentLevelId,
    stars,
    bestStars: saveState.levels[currentLevelId].bestStars,
    time: elapsed,
    bestTime: saveState.levels[currentLevelId].bestTime,
    crystals: currentCrystals,
    totalCrystals,
  })
}

function damagePlayer(amt) {
  if (playerInvulnTimer > 0) return
  playerHp -= amt
  console.log('[game] damagePlayer called', amt, 'hp now', playerHp)
  playerInvulnTimer = 0.6
  playerBlinkTimer = 0.075
  if (player?.mesh) player.mesh.visible = false
  updateHud()
  if (playerHp <= 0) {
    setState(STATES.GAME_OVER, { reason: t('gameOver.reasonHp') })
  }
}

function updateHud() {
  const heartsEl = document.getElementById('hud-hearts')
  if (heartsEl) {
    heartsEl.setAttribute('aria-label', t('hud.heartsLabel'))
    heartsEl.querySelectorAll('.heart').forEach((el, i) => {
      el.classList.toggle('empty', i >= playerHp)
    })
  }
  const crystalsEl = document.getElementById('hud-crystals')
  if (crystalsEl) {
    crystalsEl.textContent = `💎 ${currentCrystals}/${totalCrystals}`
  }
  const levelEl = document.getElementById('hud-level')
  if (levelEl) {
    levelEl.textContent = `${t('hud.level')} ${currentLevelId ?? 1}`
  }
  const bossEl = document.getElementById('hud-boss')
  const bossEnemy = levelEnemies.find(e => e.type === 'boss')
  if (bossEl) {
    const bossLabel = bossEl.querySelector('.boss-label')
    if (bossLabel) bossLabel.textContent = t('hud.boss')
    if (bossEnemy && bossEnemy.state !== 'DEAD') {
      bossEl.style.display = 'flex'
      const fill = bossEl.querySelector('.boss-fill')
      if (fill) {
        const pct = Math.max(0, bossEnemy.hp / bossEnemy.maxHp) * 100
        fill.style.width = `${pct}%`
      }
    } else {
      bossEl.style.display = 'none'
    }
  }
}

/**
 * Reset the third-person camera to the canonical follow pose: yaw=PI/2 so W
 * moves the player toward +X with the camera sitting behind at -X. Re-enables
 * auto-follow so subsequent player motion realigns the camera automatically.
 * Bound to: the HUD "📷" button, the "C" key, and called at every startLevel.
 */
export function resetCamera() {
  input.camYaw = Math.PI / 2
  input.camPitch = 0.4
  if (tpc) {
    tpc.yaw = Math.PI / 2
    tpc.pitch = 0.4
    tpc._noInputTimer = Infinity
  }
}

export function retryLevel() {
  if (currentLevelId) {
    setState(STATES.PLAYING, { levelId: currentLevelId })
  }
}

export function goToNextLevel() {
  const nextId = currentLevelId + 1
  if (nextId <= 6 && isUnlocked(saveState, nextId)) {
    setState(STATES.PLAYING, { levelId: nextId })
  } else {
    setState(STATES.LEVEL_SELECT)
  }
}

// ── Input handling ────────────────────────────────────────
function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (state === STATES.PLAYING) {
        setState(STATES.PAUSED)
        return
      } else if (state === STATES.PAUSED) {
        setState(STATES.PLAYING)
        return
      }
    }
    if (state !== STATES.PLAYING) return
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.forward = true
        break
      case 'KeyS':
      case 'ArrowDown':
        input.back = true
        break
      case 'KeyA':
      case 'ArrowLeft':
        input.left = true
        break
      case 'KeyD':
      case 'ArrowRight':
        input.right = true
        break
      case 'Space':
        if (!input.jump) {
          input.jumpPressed = true
        }
        input.jump = true
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        input.run = true
        break
      case 'KeyE':
        input.interact = true
        break
      case 'KeyC':
        // Recover from a stuck/disoriented camera angle without losing focus.
        resetCamera()
        break
    }
  })

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.forward = false
        break
      case 'KeyS':
      case 'ArrowDown':
        input.back = false
        break
      case 'KeyA':
      case 'ArrowLeft':
        input.left = false
        break
      case 'KeyD':
      case 'ArrowRight':
        input.right = false
        break
      case 'Space':
        input.jump = false
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        input.run = false
        break
      case 'KeyE':
        input.interact = false
        break
    }
  })

  // Mouse drag to rotate camera (any button)
  const canvas = renderer.domElement
  let _isDragging = false
  let _lastDragX = 0
  let _lastDragY = 0

  canvas.addEventListener('pointerdown', (e) => {
    _isDragging = true
    _lastDragX = e.clientX
    _lastDragY = e.clientY
    canvas.setPointerCapture(e.pointerId)
  })

  canvas.addEventListener('pointermove', (e) => {
    if (!_isDragging) return
    const dx = e.clientX - _lastDragX
    const dy = e.clientY - _lastDragY
    _lastDragX = e.clientX
    _lastDragY = e.clientY
    const sens = CAM_CFG.dragSensitivity
    input.camYaw -= dx * sens
    input.camPitch -= dy * sens
    if (tpc) {
      tpc.yaw = input.camYaw
      tpc.pitch = input.camPitch
      tpc.onManualInput()
    }
  })

  canvas.addEventListener('pointerup', () => {
    _isDragging = false
  })

  canvas.addEventListener('contextmenu', (e) => e.preventDefault())
}

// ── Exports for UI / console debugging ────────────────────
export function getSaveState() {
  return saveState
}

export function getCurrentLevelId() {
  return currentLevelId
}

export {
  STATES, t, onLocaleChange, isUnlocked, resetSave
}

// Locale change HUD refresh
onLocaleChange(() => {
  updateHud()
})

// Debug hook for automated testing
if (typeof window !== 'undefined') {
  window.__gameInternals = {
    completeLevel: () => completeLevel(),
    damagePlayer: (amt) => damagePlayer(amt),
    getState: () => state,
    getPlayerHp: () => playerHp,
    setPlayerHp: (v) => { playerHp = v; updateHud() },
    setPlayerInvuln: (v) => { playerInvulnTimer = v },
    setLevel: (id) => setState(STATES.PLAYING, { levelId: id }),
    getCurrentLevelId: () => currentLevelId,
    getBoss: () => levelEnemies.find(e => e.type === 'boss'),
    getLevelEnemies: () => levelEnemies,
    getScene: () => scene,
    getPlayer: () => player,
    getCurrentCrystals: () => currentCrystals,
    getTotalCrystals: () => totalCrystals,
    getPortalHidden: () => portalHidden,
    getCamera: () => camera,
    getTpc: () => tpc,
    getCameraPos: () => camera ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null,
    getTpcYaw: () => tpc ? tpc.yaw : null,
    getPlayerPos: () => player?.mesh ? { x: player.mesh.position.x, y: player.mesh.position.y, z: player.mesh.position.z } : null,
    forceStompBoss: () => {
      const b = levelEnemies.find(e => e.type === 'boss')
      if (b && b.state === 'ACTIVE') {
        b.takeHit(true)
      }
    },
    damageBoss: (amt) => {
      const b = levelEnemies.find(e => e.type === 'boss')
      if (b) {
        // Direct hp manipulation to bypass invulnTimer in takeHit()
        b.hp = Math.max(0, b.hp - amt)
        if (b.hp <= 0) {
          b.state = 'DYING'
          b.dyingTimer = 2.0
        } else if (b.hp <= 4 && b.phase === 1) {
          b.phase = 2
          b.rockTimer = 1.0
        }
        // clear falling rocks to avoid test insta-kill
        if (b.activeRocks) {
          for (const r of b.activeRocks) {
            if (r.mesh.parent) r.mesh.parent.remove(r.mesh)
            r.mesh.geometry?.dispose()
            r.mesh.material?.dispose()
          }
          b.activeRocks = []
        }
      }
      // Make player invincible and safe for test screenshots
      if (player && player.mesh) {
        player.mesh.position.set(0, 20, 0)
        player.velocity.set(0, 0, 0)
        playerInvulnTimer = 999
        playerHp = 999
      }
    },
  }
}
