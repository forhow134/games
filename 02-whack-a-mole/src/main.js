import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const GRID = 3
const SPACING = 2.8
const ARENA_RADIUS = 13
const HOLE_RADIUS = 0.65
const MOLE_HIDDEN_Y = -1.6
const MOLE_SHOWN_Y = 0.2
const MOLE_SPEED = 6
const COMBO_WINDOW = 3

const LEVELS = [
  { duration: 35, spawnRate: 1.6, stayTime: 2.0, maxActive: 2, goldenChance: 0, bombChance: 0, label: 'Warm Up', minAccuracy: 25 },
  { duration: 35, spawnRate: 1.1, stayTime: 1.5, maxActive: 2, goldenChance: 0.1, bombChance: 0.08, label: 'Getting Busy', minAccuracy: 30 },
  { duration: 30, spawnRate: 0.8, stayTime: 1.2, maxActive: 3, goldenChance: 0.12, bombChance: 0.12, label: 'Speed Up', minAccuracy: 35 },
  { duration: 30, spawnRate: 0.6, stayTime: 0.9, maxActive: 3, goldenChance: 0.15, bombChance: 0.18, label: 'Watch Out', minAccuracy: 40 },
  { duration: 25, spawnRate: 0.45, stayTime: 0.7, maxActive: 4, goldenChance: 0.18, bombChance: 0.22, label: 'Frenzy!', minAccuracy: 45 },
]

let scene, camera, renderer, clock
const holes = []
let score = 0, hits = 0, totalSpawned = 0
let timeRemaining = 0, currentLevel = 0, started = false
let spawnTimer = 0, combo = 0, comboTimer = 0
let levelHitScore = 0, levelComboScore = 0
let levelStartScore = 0
let groundClip
const templates = {}

let camAngle = Math.PI, camPitch = 0.85
let lastMouseX = 0, lastMouseY = 0
let isPointerDown = false, isDragging = false, pointerStartX = 0, pointerStartY = 0
const CAM_DIST = 14
const CAM_MIN_PITCH = 0.3, CAM_MAX_PITCH = 1.3
const DRAG_THRESHOLD = 5

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const gltfLoader = new GLTFLoader()

function loadModels() {
  function prep(gltf, targetHeight, opts = {}) {
    const model = gltf.scene
    const box = new THREE.Box3().setFromObject(model)
    const s = targetHeight / box.getSize(new THREE.Vector3()).y
    model.scale.set(s, s, s)
    box.setFromObject(model)
    model.position.y = -box.min.y
    model.traverse(c => {
      if (c.isMesh) {
        c.castShadow = true
        c.material = c.material.clone()
        if (opts.clip) {
          c.material.clippingPlanes = [groundClip]
          c.material.clipShadows = true
        }
        if (c.material.metalness !== undefined) c.material.metalness = Math.min(c.material.metalness, 0.2)
        if (c.material.roughness !== undefined) c.material.roughness = Math.max(c.material.roughness, 0.4)
        if (opts.colorTint && c.material.color) {
          if (opts.stripMap) c.material.map = null
          c.material.color.lerp(new THREE.Color(opts.colorTint), opts.tintStrength || 0.5)
        }
        if (opts.emissiveTint) {
          c.material.emissive = new THREE.Color(opts.emissiveTint)
          c.material.emissiveIntensity = opts.emissiveIntensity || 0.15
        }
      }
    })
    return model
  }

  gltfLoader.load('./models/mole.glb', gltf => {
    templates.mole = prep(gltf, 1.2, { clip: true, stripMap: true, colorTint: 0xc48a5a, tintStrength: 0.6, emissiveTint: 0x7a4a20, emissiveIntensity: 0.3 })
  }, undefined, () => {})
  gltfLoader.load('./models/golden_mole.glb', gltf => {
    templates.golden = prep(gltf, 1.2, { clip: true, stripMap: true, colorTint: 0xffe14d, tintStrength: 0.7, emissiveTint: 0xcc9900, emissiveIntensity: 0.5 })
  }, undefined, () => {})
  gltfLoader.load('./models/bomb.glb', gltf => {
    templates.bomb = prep(gltf, 1.0, { clip: true, stripMap: true, colorTint: 0x555555, tintStrength: 0.4, emissiveTint: 0x880000, emissiveIntensity: 0.4 })
  }, undefined, () => {})
}

const hud = document.getElementById('hud')
const scoreEl = document.getElementById('score-display')
const levelLabelEl = document.getElementById('level-label')
const hitCountEl = document.getElementById('hit-count')
const timerEl = document.getElementById('timer')
const comboEl = document.getElementById('combo-display')
const floatContainer = document.getElementById('float-score-container')
const startScreen = document.getElementById('start-screen')
const startBtn = document.getElementById('start-btn')
const levelTitleScreen = document.getElementById('level-title')
const levelTitleText = document.getElementById('level-title-text')
const levelCompleteScreen = document.getElementById('level-complete')
const scoreBreakdown = document.getElementById('score-breakdown')
const levelTotalScore = document.getElementById('level-total-score')
const nextLevelBtn = document.getElementById('next-level-btn')
const victoryScreen = document.getElementById('victory')
const victoryScore = document.getElementById('victory-score')
const victoryRestart = document.getElementById('victory-restart')
const gameOverScreen = document.getElementById('game-over')
const gameOverScore = document.getElementById('game-over-score')
const gameOverRetry = document.getElementById('game-over-retry')

function init() {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080916)
  scene.fog = new THREE.Fog(0x080916, 20, 38)

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
  updateCamera()

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.localClippingEnabled = true
  document.body.appendChild(renderer.domElement)

  groundClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2)

  scene.add(new THREE.AmbientLight(0xc8d5ff, 0.7))
  const sun = new THREE.DirectionalLight(0xdfe8ff, 1.6)
  sun.position.set(-8, 14, -6)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -10
  sun.shadow.camera.right = 10
  sun.shadow.camera.top = 10
  sun.shadow.camera.bottom = -10
  scene.add(sun)
  const magentaLight = new THREE.PointLight(0xff2bd6, 2.2, 35)
  magentaLight.position.set(0, 7, 0)
  scene.add(magentaLight)
  const cyanLight = new THREE.PointLight(0x25d7ff, 1.6, 35)
  cyanLight.position.set(9, 5, 9)
  scene.add(cyanLight)

  createField()
  createAllHoles()
  createDecorations()
  loadModels()

  renderer.domElement.addEventListener('pointerdown', e => {
    if (e.button !== 0) return
    pointerStartX = lastMouseX = e.clientX
    pointerStartY = lastMouseY = e.clientY
    isDragging = false
    isPointerDown = true
  })
  window.addEventListener('pointermove', e => {
    if (!isPointerDown) return
    const dx = e.clientX - pointerStartX, dy = e.clientY - pointerStartY
    if (!isDragging && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) isDragging = true
    if (isDragging) {
      camAngle -= (e.clientX - lastMouseX) * 0.005
      camPitch = Math.max(CAM_MIN_PITCH, Math.min(CAM_MAX_PITCH, camPitch + (e.clientY - lastMouseY) * 0.005))
      updateCamera()
    }
    lastMouseX = e.clientX
    lastMouseY = e.clientY
  })
  window.addEventListener('pointerup', e => {
    if (e.button !== 0) return
    if (!isDragging && started) onWhackClick(e)
    isPointerDown = false
    isDragging = false
  })
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())
  window.addEventListener('resize', onResize)

  startBtn.addEventListener('click', () => { startScreen.classList.add('hidden'); startLevel(0) })
  nextLevelBtn.addEventListener('click', () => { levelCompleteScreen.classList.add('hidden'); startLevel(currentLevel + 1) })
  victoryRestart.addEventListener('click', fullRestart)
  gameOverRetry.addEventListener('click', () => { gameOverScreen.classList.add('hidden'); startLevel(currentLevel) })

  animate()
}

function createField() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshStandardMaterial({ color: 0x05070f, roughness: 0.95, metalness: 0.15 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const stage = new THREE.Mesh(
    new THREE.CircleGeometry(ARENA_RADIUS, 72),
    new THREE.MeshStandardMaterial({ color: 0x181c3a, roughness: 0.75, metalness: 0.4 })
  )
  stage.rotation.x = -Math.PI / 2
  stage.position.y = 0.01
  stage.receiveShadow = true
  scene.add(stage)

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(ARENA_RADIUS - 0.4, ARENA_RADIUS, 96),
    new THREE.MeshStandardMaterial({
      color: 0x25d7ff,
      emissive: 0x25d7ff,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.75
    })
  )
  outerRing.rotation.x = -Math.PI / 2
  outerRing.position.y = 0.02
  scene.add(outerRing)

  const centerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.7, 64),
    new THREE.MeshStandardMaterial({
      color: 0xff2bd6,
      emissive: 0xff2bd6,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.65
    })
  )
  centerRing.rotation.x = -Math.PI / 2
  centerRing.position.y = 0.03
  scene.add(centerRing)

  const gridExtent = 22
  const gridStep = 1.6
  const gridVertices = []
  for (let v = -gridExtent; v <= gridExtent; v += gridStep) {
    gridVertices.push(-gridExtent, 0.025, v, gridExtent, 0.025, v)
    gridVertices.push(v, 0.025, -gridExtent, v, 0.025, gridExtent)
  }
  const gridGeometry = new THREE.BufferGeometry()
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3))
  const grid = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({ color: 0x25d7ff, transparent: true, opacity: 0.2 })
  )
  scene.add(grid)

  const arenaWall = new THREE.Mesh(
    new THREE.CylinderGeometry(25, 25, 9, 56, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x140a2e,
      emissive: 0x1b1242,
      emissiveIntensity: 0.35,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.45
    })
  )
  arenaWall.position.y = 4.2
  scene.add(arenaWall)
}

const DECOR_SPOTS = [[-8, -6], [8, -6], [-8, 6], [8, 6], [0, -9], [0, 9], [-10, 0], [10, 0]]
const decorMeshes = []

function createDecorations() {
  const pillarGeo = new THREE.CylinderGeometry(0.16, 0.22, 2.8, 10)
  const tipGeo = new THREE.OctahedronGeometry(0.34)

  DECOR_SPOTS.forEach(([x, z], i) => {
    const wrap = new THREE.Group()
    const glowColor = i % 2 === 0 ? 0xff2bd6 : 0x25d7ff

    const pillar = new THREE.Mesh(
      pillarGeo,
      new THREE.MeshStandardMaterial({
        color: 0x1b183d,
        emissive: glowColor,
        emissiveIntensity: 0.4,
        roughness: 0.35,
        metalness: 0.7
      })
    )
    pillar.position.y = 1.4
    pillar.castShadow = true
    wrap.add(pillar)

    const tip = new THREE.Mesh(
      tipGeo,
      new THREE.MeshStandardMaterial({
        color: 0xf2f4ff,
        emissive: glowColor,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.15
      })
    )
    tip.position.y = 2.95
    wrap.add(tip)

    const light = new THREE.PointLight(glowColor, 1.5, 5)
    light.position.y = 2.4
    wrap.add(light)

    wrap.position.set(x, 0, z)
    scene.add(wrap)
    decorMeshes.push({ mesh: wrap, phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 0.5 })
  })
}

function updateDecorations(elapsed) {
  decorMeshes.forEach(({ mesh, phase, speed }) => {
    const wave = Math.sin(elapsed * speed + phase)
    mesh.rotation.y += 0.004 * speed
    mesh.scale.y = 0.92 + wave * 0.08
  })
}

function createAllHoles() {
  const offset = (GRID - 1) * SPACING / 2
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      createHole(c * SPACING - offset, r * SPACING - offset)
    }
  }
}

function createHole(x, z) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)

  const mound = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.05, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2550, emissive: 0x25d7ff, emissiveIntensity: 0.15, roughness: 0.6, metalness: 0.5 })
  )
  mound.position.y = 0.1
  mound.receiveShadow = true
  mound.castShadow = true
  group.add(mound)

  const pit = new THREE.Mesh(
    new THREE.CircleGeometry(HOLE_RADIUS, 24),
    new THREE.MeshStandardMaterial({ color: 0x060612 })
  )
  pit.rotation.x = -Math.PI / 2
  pit.position.y = 0.21
  group.add(pit)

  const mole = buildMole('normal')
  mole.position.y = MOLE_HIDDEN_Y
  group.add(mole)

  scene.add(group)
  holes.push({ group, mole, state: 'empty', type: 'normal', timer: 0, stayDuration: 0 })
}

function clippedMat(props) {
  return new THREE.MeshStandardMaterial({ ...props, clippingPlanes: [groundClip], clipShadows: true })
}

function buildMole(type) {
  const g = new THREE.Group()
  const bodyColor = type === 'golden' ? 0xffe14d : type === 'bomb' ? 0x555555 : 0xc48a5a
  const bodyEmissive = type === 'golden' ? 0xcc9900 : type === 'bomb' ? 0x660000 : 0x7a4a20

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.5, 8, 12), clippedMat({ color: bodyColor, emissive: bodyEmissive, emissiveIntensity: 0.3 }))
  body.position.y = 0.5
  body.castShadow = true
  g.add(body)

  if (type === 'bomb') {
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        clippedMat({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 })
      )
      eye.position.set(s * 0.18, 0.85, 0.3)
      g.add(eye)
    }
    const fuse = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4),
      clippedMat({ color: 0x888888 })
    )
    fuse.position.set(0, 1.1, 0)
    fuse.rotation.z = 0.3
    g.add(fuse)
    const spark = new THREE.PointLight(0xff4400, 2, 3)
    spark.position.set(0.08, 1.3, 0)
    g.add(spark)
  } else {
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), clippedMat({ color: 0xffffff }))
      eye.position.set(s * 0.18, 0.85, 0.3)
      g.add(eye)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), clippedMat({ color: 0x222222 }))
      pupil.position.set(s * 0.18, 0.86, 0.38)
      g.add(pupil)
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), clippedMat({ color: 0xff9999 }))
    nose.position.set(0, 0.73, 0.42)
    g.add(nose)
  }

  if (type === 'golden') {
    const glow = new THREE.PointLight(0xffd700, 2, 4)
    glow.position.set(0, 0.6, 0)
    g.add(glow)
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.25, 5),
      clippedMat({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.3 })
    )
    crown.position.set(0, 1.2, 0)
    g.add(crown)
  }

  g.userData.type = type
  return g
}

function cloneTemplate(key) {
  const tpl = templates[key]
  if (!tpl) return null
  const clone = tpl.clone()
  clone.traverse(c => {
    if (c.isMesh) {
      const src = c.material
      c.material = src.clone()
      c.material.clippingPlanes = [groundClip]
      c.material.clipShadows = true
      if (src.metalness !== undefined) c.material.metalness = Math.min(src.metalness, 0.2)
      if (src.roughness !== undefined) c.material.roughness = Math.max(src.roughness, 0.4)
    }
  })
  return clone
}

function setMoleType(hole, type) {
  hole.group.remove(hole.mole)

  const key = type === 'golden' ? 'golden' : type === 'bomb' ? 'bomb' : 'mole'
  const mole = cloneTemplate(key) || buildMole(type)

  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  hitbox.position.y = 0.55
  mole.add(hitbox)

  mole.position.y = MOLE_HIDDEN_Y
  hole.group.add(mole)
  hole.mole = mole
  hole.type = type
}

function spawnMole() {
  const cfg = LEVELS[currentLevel]
  const empty = holes.filter(h => h.state === 'empty')
  if (!empty.length) return
  if (holes.filter(h => h.state !== 'empty').length >= cfg.maxActive) return

  const hole = empty[Math.floor(Math.random() * empty.length)]
  let type = 'normal'
  const r = Math.random()
  if (r < cfg.bombChance) type = 'bomb'
  else if (r < cfg.bombChance + cfg.goldenChance) type = 'golden'

  setMoleType(hole, type)
  hole.state = 'rising'
  hole.timer = 0
  hole.stayDuration = cfg.stayTime * (0.7 + Math.random() * 0.6)
  totalSpawned++
}

function onWhackClick(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  for (const hole of holes) {
    if (hole.state !== 'rising' && hole.state !== 'up') continue
    const intersects = raycaster.intersectObject(hole.mole, true)
    if (intersects.length > 0 && intersects[0].point.y >= 0.0) {
      whackMole(hole)
      showHammerEffect(e.clientX, e.clientY)
      return
    }
  }
  showHammerEffect(e.clientX, e.clientY)
}

function whackMole(hole) {
  if (hole.type === 'bomb') {
    score = Math.max(0, score - 200)
    combo = 0
    comboTimer = 0
    showFloatScore(-200, true)
  } else {
    const base = hole.type === 'golden' ? 300 : 100
    const mult = 1 + combo * 0.5
    const points = Math.round(base * mult)
    score += points
    hits++
    levelHitScore += base
    levelComboScore += points - base
    combo++
    comboTimer = COMBO_WINDOW
    showFloatScore(points, false)
  }
  hole.state = 'hit'
  hole.timer = 0
  updateHUD()
}

function showHammerEffect(sx, sy) {
  const root = document.createElement('div')
  root.className = 'impact-root'
  root.style.left = sx + 'px'
  root.style.top = sy + 'px'
  root.style.setProperty('--swing-tilt', `${-55 + Math.random() * 20}deg`)

  const hammer = document.createElement('div')
  hammer.className = 'impact-hammer'

  const hammerHead = document.createElement('div')
  hammerHead.className = 'impact-hammer-head'
  hammer.appendChild(hammerHead)

  const hammerHandle = document.createElement('div')
  hammerHandle.className = 'impact-hammer-handle'
  hammer.appendChild(hammerHandle)

  const ring = document.createElement('div')
  ring.className = 'impact-ring'
  root.appendChild(ring)

  const flash = document.createElement('div')
  flash.className = 'impact-flash'
  root.appendChild(flash)

  for (let i = 0; i < 8; i++) {
    const spark = document.createElement('div')
    spark.className = 'impact-spark'
    const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.35
    const dist = 48 + Math.random() * 30
    spark.style.setProperty('--dx', `${Math.cos(angle) * dist}px`)
    spark.style.setProperty('--dy', `${Math.sin(angle) * dist}px`)
    spark.style.animationDelay = `${Math.random() * 0.03}s`
    root.appendChild(spark)
  }

  root.appendChild(hammer)
  floatContainer.appendChild(root)
  floatContainer.classList.add('impact-shake')
  setTimeout(() => floatContainer.classList.remove('impact-shake'), 120)
  setTimeout(() => root.remove(), 520)
}

function showFloatScore(amount, isDamage) {
  const el = document.createElement('div')
  el.className = 'float-score' + (isDamage ? ' damage' : '')
  el.textContent = isDamage ? `${amount}` : `+${amount}`
  el.style.left = '50%'
  el.style.top = '40%'
  floatContainer.appendChild(el)
  setTimeout(() => el.remove(), 1000)
}

function updateHoles(dt) {
  for (const hole of holes) {
    const m = hole.mole
    if (hole.state === 'rising') {
      m.rotation.y = camAngle
      m.position.y += MOLE_SPEED * dt
      if (m.position.y >= MOLE_SHOWN_Y) {
        m.position.y = MOLE_SHOWN_Y
        hole.state = 'up'
        hole.timer = 0
      }
    } else if (hole.state === 'up') {
      m.rotation.y = camAngle
      hole.timer += dt
      m.rotation.z = Math.sin(hole.timer * 8) * 0.08
      m.position.y = MOLE_SHOWN_Y + Math.sin(hole.timer * 4) * 0.05
      if (hole.timer >= hole.stayDuration) hole.state = 'falling'
    } else if (hole.state === 'falling') {
      m.position.y -= MOLE_SPEED * dt
      if (m.position.y <= MOLE_HIDDEN_Y) {
        m.position.y = MOLE_HIDDEN_Y
        m.rotation.z = 0
        hole.state = 'empty'
      }
    } else if (hole.state === 'hit') {
      hole.timer += dt
      if (hole.timer < 0.15) {
        m.scale.y = 1 - hole.timer * 4
        m.scale.x = m.scale.z = 1 + hole.timer * 3
      } else {
        m.scale.set(1, 1, 1)
        m.position.y -= MOLE_SPEED * 2 * dt
        if (m.position.y <= MOLE_HIDDEN_Y) {
          m.position.y = MOLE_HIDDEN_Y
          m.rotation.z = 0
          hole.state = 'empty'
        }
      }
    }
  }
}

function updateSpawner(dt) {
  if (!started) return
  spawnTimer += dt
  if (spawnTimer >= LEVELS[currentLevel].spawnRate) {
    spawnTimer -= LEVELS[currentLevel].spawnRate
    spawnMole()
  }
}

function updateTimer(dt) {
  if (!started) return
  timeRemaining -= dt
  if (comboTimer > 0) {
    comboTimer -= dt
    if (comboTimer <= 0) combo = 0
  }
  if (timeRemaining <= 0) {
    timeRemaining = 0
    completeLevel()
  }
  updateHUD()
}

function updateHUD() {
  const cfg = LEVELS[currentLevel]
  scoreEl.textContent = `Score: ${score}`
  levelLabelEl.textContent = `Level ${currentLevel + 1} - ${cfg.label}`
  hitCountEl.textContent = `Hits: ${hits}`
  const secs = Math.ceil(Math.max(0, timeRemaining))
  timerEl.textContent = `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
  timerEl.classList.toggle('warning', timeRemaining <= 5)
  if (combo > 1) {
    comboEl.textContent = `Combo x${combo}!`
    comboEl.classList.remove('hidden')
  } else {
    comboEl.classList.add('hidden')
  }
}

function startLevel(idx) {
  currentLevel = idx
  const cfg = LEVELS[idx]
  levelStartScore = score
  timeRemaining = cfg.duration
  hits = 0
  totalSpawned = 0
  spawnTimer = 0
  combo = 0
  comboTimer = 0
  levelHitScore = 0
  levelComboScore = 0

  holes.forEach(h => {
    h.state = 'empty'
    h.mole.position.y = MOLE_HIDDEN_Y
    h.mole.rotation.z = 0
    h.mole.scale.set(1, 1, 1)
  })

  updateHUD()
  hud.classList.remove('hidden')

  levelTitleText.textContent = `Level ${idx + 1} - ${cfg.label}`
  levelTitleScreen.classList.remove('hidden')
  started = false
  setTimeout(() => { levelTitleScreen.classList.add('hidden'); started = true }, 2000)
}

function completeLevel() {
  started = false
  const accuracy = totalSpawned > 0 ? Math.round(hits / totalSpawned * 100) : 0
  const cfg = LEVELS[currentLevel]

  if (accuracy < cfg.minAccuracy) {
    score = levelStartScore
    gameOverScore.textContent = `Accuracy: ${accuracy}% (Need ${cfg.minAccuracy}%)`
    gameOverScreen.classList.remove('hidden')
    return
  }

  const accuracyBonus = Math.round(accuracy * 5)
  score += accuracyBonus

  scoreBreakdown.innerHTML = `
    <div class="breakdown-line"><span>Hits:</span><span>${hits} / ${totalSpawned}</span></div>
    <div class="breakdown-line"><span>Hit Score:</span><span>+${levelHitScore}</span></div>
    <div class="breakdown-line"><span>Combo Bonus:</span><span>+${levelComboScore}</span></div>
    <div class="breakdown-line"><span>Accuracy (${accuracy}%):</span><span>+${accuracyBonus}</span></div>
  `
  levelTotalScore.textContent = `Total Score: ${score}`

  if (currentLevel >= LEVELS.length - 1) {
    victoryScore.textContent = `Final Score: ${score}`
    victoryScreen.classList.remove('hidden')
  } else {
    levelCompleteScreen.classList.remove('hidden')
  }
}

function fullRestart() {
  victoryScreen.classList.add('hidden')
  levelCompleteScreen.classList.add('hidden')
  gameOverScreen.classList.add('hidden')
  score = 0
  startLevel(0)
}

function updateCamera() {
  camera.position.set(
    Math.sin(camAngle) * Math.cos(camPitch) * CAM_DIST,
    Math.sin(camPitch) * CAM_DIST,
    Math.cos(camAngle) * Math.cos(camPitch) * CAM_DIST
  )
  camera.lookAt(0, 0, 0)
}

function onResize() {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
}

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  updateSpawner(dt)
  updateHoles(dt)
  updateTimer(dt)
  updateDecorations(clock.elapsedTime)
  renderer.render(scene, camera)
}

init()
