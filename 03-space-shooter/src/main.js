import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const PLAY_W = 14, PLAY_H = 20
const SHIP_SPEED = 18
const BULLET_SPEED = 28
const FIRE_RATE = 0.16
const CHARGED_RATE = 0.6
const ENEMY_BULLET_SPEED = 10
const INV_TIME = 1.5
const COMBO_WINDOW = 2

const LEVELS = [
  { label: 'Stardust Fields', duration: 30, waves: [
    { type: 'asteroid', count: 15, rate: 1.8 },
  ], boss: null },
  { label: 'Shadow Border', duration: 35, waves: [
    { type: 'asteroid', count: 8, rate: 2.0 },
    { type: 'imp', count: 10, rate: 1.4 },
  ], boss: { type: 'knight', hp: 30 } },
  { label: 'Mana Storm', duration: 35, waves: [
    { type: 'imp', count: 12, rate: 1.0 },
    { type: 'imp_fast', count: 6, rate: 1.5 },
  ], boss: { type: 'knight', hp: 50 } },
  { label: 'Dragon Corridor', duration: 40, waves: [
    { type: 'asteroid', count: 6, rate: 2.5 },
    { type: 'imp', count: 10, rate: 1.0 },
    { type: 'imp_fast', count: 8, rate: 1.2 },
  ], boss: { type: 'dragon', hp: 80 } },
  { label: 'The Final Battle', duration: 45, waves: [
    { type: 'imp', count: 8, rate: 0.8 },
    { type: 'imp_fast', count: 10, rate: 0.9 },
  ], boss: { type: 'dragon', hp: 120 } },
]

const ENEMY_DEFS = {
  asteroid: { hp: 1, speed: 3, score: 10, radius: 0.6, shoots: false, move: 'straight', dropChance: 0.05 },
  imp:      { hp: 2, speed: 2.5, score: 25, radius: 0.5, shoots: true, fireRate: 2.0, move: 'sine', dropChance: 0.12 },
  imp_fast: { hp: 1, speed: 5, score: 30, radius: 0.4, shoots: false, move: 'zigzag', dropChance: 0.1 },
  knight:   { hp: 30, speed: 1.5, score: 200, radius: 1.0, shoots: true, fireRate: 0.8, move: 'boss_knight', dropChance: 0 },
  dragon:   { hp: 80, speed: 1.0, score: 500, radius: 1.5, shoots: true, fireRate: 0.5, move: 'boss_dragon', dropChance: 0 },
}

let scene, camera, renderer, clock
let shipGroup, shipMesh
let mouseX = 0, mouseY = 0, mouseWorldX = 0, mouseWorldZ = 0, shipX = 0, shipY = -7
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const rayMouse = new THREE.Raycaster()
const mouseNDC = new THREE.Vector2()
const rayHit = new THREE.Vector3()
let score = 0, hp = 3, maxHp = 3, currentLevel = 0
let started = false, paused = false, bossActive = null
let invTimer = 0, comboCount = 0, comboTimer = 0
let fireTimer = 0, chargeTimer = 0, isCharging = false
let levelKills = 0, levelScore = 0
let shakeTimer = 0, shakeIntensity = 0
let spreadActive = 0, rapidActive = 0, shieldActive = 0

const playerBullets = []
const enemyBullets = []
const enemies = []
const powerups = []
const particles = []
const starLayers = []

const poolBullet = []
const poolEBullet = []

const gltfLoader = new GLTFLoader()
const templates = {}

const scoreEl = document.getElementById('score-display')
const levelLabelEl = document.getElementById('level-label')
const hpEl = document.getElementById('hp-display')
const hudEl = document.getElementById('hud')
const comboEl = document.getElementById('combo-display')
const powerupEl = document.getElementById('powerup-indicator')
const bossBarContainer = document.getElementById('boss-bar-container')
const bossNameEl = document.getElementById('boss-name')
const bossBarFill = document.getElementById('boss-bar-fill')
const levelTitle = document.getElementById('level-title')
const levelTitleText = document.getElementById('level-title-text')
const levelSubtitle = document.getElementById('level-subtitle')
const levelCompleteScreen = document.getElementById('level-complete')
const scoreBreakdown = document.getElementById('score-breakdown')
const levelTotalScore = document.getElementById('level-total-score')
const victoryScreen = document.getElementById('victory')
const victoryScore = document.getElementById('victory-score')
const gameOverScreen = document.getElementById('game-over')
const gameOverScore = document.getElementById('game-over-score')
const startScreen = document.getElementById('start-screen')
const floatContainer = document.getElementById('float-score-container')

function init() {
  clock = new THREE.Clock()
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)
  camera.position.set(0, 18, 12)
  camera.lookAt(0, 0, -2)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  document.body.prepend(renderer.domElement)

  const ambient = new THREE.AmbientLight(0x4422aa, 0.6)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xccaaff, 1.2)
  dir.position.set(3, 12, 5)
  dir.castShadow = true
  dir.shadow.mapSize.set(1024, 1024)
  dir.shadow.camera.left = -20
  dir.shadow.camera.right = 20
  dir.shadow.camera.top = 20
  dir.shadow.camera.bottom = -20
  dir.shadow.camera.near = 1
  dir.shadow.camera.far = 30
  scene.add(dir)
  const point = new THREE.PointLight(0x7744ff, 0.8, 30)
  point.position.set(0, 5, 0)
  scene.add(point)

  const groundGeo = new THREE.PlaneGeometry(50, 50)
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.5
  ground.receiveShadow = true
  scene.add(ground)

  createStarfield()
  createShip()
  loadModels()

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', e => { if (e.key === 'Shift') isCharging = true })
  window.addEventListener('keyup', e => { if (e.key === 'Shift') isCharging = false })

  document.getElementById('start-btn').onclick = () => {
    startScreen.classList.add('hidden')
    startGame()
  }
  document.getElementById('next-level-btn').onclick = () => {
    levelCompleteScreen.classList.add('hidden')
    startLevel(currentLevel + 1)
  }
  document.getElementById('victory-restart').onclick = fullRestart
  document.getElementById('game-over-retry').onclick = () => {
    gameOverScreen.classList.add('hidden')
    startLevel(currentLevel)
  }
  document.getElementById('game-over-restart').onclick = () => {
    gameOverScreen.classList.add('hidden')
    fullRestart()
  }

  animate()
}

function createStarfield() {
  const layers = [
    { count: 600, size: 1.5, speed: 0.3, color: 0xaaaaff, spread: 80 },
    { count: 300, size: 2.5, speed: 0.6, color: 0xddbbff, spread: 60 },
    { count: 100, size: 3.5, speed: 1.0, color: 0xffeeff, spread: 40 },
  ]
  layers.forEach(l => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(l.count * 3)
    for (let i = 0; i < l.count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * l.spread
      pos[i * 3 + 1] = -2
      pos[i * 3 + 2] = (Math.random() - 0.5) * l.spread - 10
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({ color: l.color, size: l.size * 0.04, sizeAttenuation: true, transparent: true, opacity: 0.7 })
    const pts = new THREE.Points(geo, mat)
    scene.add(pts)
    starLayers.push({ mesh: pts, speed: l.speed, spread: l.spread })
  })

  const nebulaGeo = new THREE.PlaneGeometry(60, 60)
  const nebulaMat = new THREE.MeshBasicMaterial({
    color: 0x2211aa,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
  })
  const nebula = new THREE.Mesh(nebulaGeo, nebulaMat)
  nebula.position.set(0, -2, -20)
  nebula.rotation.x = -Math.PI / 2
  scene.add(nebula)
}

function createShip() {
  shipGroup = new THREE.Group()

  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x8866ff, emissive: 0x4422aa, emissiveIntensity: 0.3, metalness: 0.6, roughness: 0.3 })
  )
  body.rotation.x = -Math.PI / 2
  shipGroup.add(body)

  const wingL = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xaa77ff, emissive: 0x5533cc, emissiveIntensity: 0.2, metalness: 0.5, roughness: 0.4 })
  )
  wingL.position.set(-0.5, 0, -0.3)
  wingL.rotation.z = 0.2
  shipGroup.add(wingL)

  const wingR = wingL.clone()
  wingR.position.set(0.5, 0, -0.3)
  wingR.rotation.z = -0.2
  shipGroup.add(wingR)

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2),
    new THREE.MeshStandardMaterial({ color: 0xddaaff, emissive: 0xbb88ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 })
  )
  crystal.position.set(0, 0.2, 0.4)
  shipGroup.add(crystal)

  shipMesh = shipGroup
  shipGroup.position.set(0, 0, shipY)
  shipGroup.traverse(c => { if (c.isMesh) c.castShadow = true })
  scene.add(shipGroup)
}

function loadModels() {
  function prep(gltf, h, rotY = 0) {
    const m = gltf.scene
    const box = new THREE.Box3().setFromObject(m)
    const s = h / box.getSize(new THREE.Vector3()).y
    m.scale.set(s, s, s)
    m.rotation.y = rotY
    box.setFromObject(m)
    m.position.y = -box.min.y
    m.traverse(c => {
      if (c.isMesh) {
        c.castShadow = true
        c.material = c.material.clone()
        if (c.material.metalness !== undefined) c.material.metalness = Math.min(c.material.metalness, 0.3)
        if (c.material.roughness !== undefined) c.material.roughness = Math.max(c.material.roughness, 0.4)
      }
    })
    return m
  }
  gltfLoader.load('./models/ship.glb', g => {
    templates.ship = prep(g, 1.8, -Math.PI / 2)
    while (shipGroup.children.length) shipGroup.remove(shipGroup.children[0])
    const clone = templates.ship.clone()
    shipGroup.add(clone)
  }, undefined, () => {})
  gltfLoader.load('./models/asteroid.glb', g => { templates.asteroid = prep(g, 1.2) }, undefined, () => {})
  gltfLoader.load('./models/imp.glb', g => { templates.imp = prep(g, 1.0) }, undefined, () => {})
  gltfLoader.load('./models/knight.glb', g => { templates.knight = prep(g, 2.0) }, undefined, () => {})
  gltfLoader.load('./models/dragon.glb', g => { templates.dragon = prep(g, 3.0) }, undefined, () => {})
  gltfLoader.load('./models/powerup.glb', g => { templates.powerup = prep(g, 0.6) }, undefined, () => {})
}

function startGame() {
  score = 0
  hp = maxHp
  started = true
  startLevel(0)
}

let waveTimers = []
let waveCounters = []
let levelTimer = 0
let bossSpawned = false

function startLevel(idx) {
  currentLevel = idx
  paused = false
  clearField()
  const lvl = LEVELS[idx]
  levelKills = 0
  levelScore = 0
  bossSpawned = false
  bossActive = null
  bossBarContainer.classList.add('hidden')
  invTimer = 0
  spreadActive = 0
  rapidActive = 0
  shieldActive = 0

  waveTimers = lvl.waves.map(() => 0)
  waveCounters = lvl.waves.map(w => w.count)
  levelTimer = 0

  hudEl.classList.remove('hidden')
  updateHUD()

  levelTitle.classList.remove('hidden')
  levelTitleText.textContent = `Level ${idx + 1}`
  levelSubtitle.textContent = lvl.label
  setTimeout(() => levelTitle.classList.add('hidden'), 2500)
}

function clearField() {
  enemies.forEach(e => scene.remove(e.mesh))
  enemies.length = 0
  playerBullets.forEach(b => scene.remove(b.mesh))
  playerBullets.length = 0
  enemyBullets.forEach(b => scene.remove(b.mesh))
  enemyBullets.length = 0
  powerups.forEach(p => scene.remove(p.mesh))
  powerups.length = 0
  particles.forEach(p => scene.remove(p.mesh))
  particles.length = 0
}

function onMouseMove(e) {
  mouseX = (e.clientX / innerWidth) * 2 - 1
  mouseY = -(e.clientY / innerHeight) * 2 + 1
  mouseNDC.set(mouseX, mouseY)
  rayMouse.setFromCamera(mouseNDC, camera)
  if (rayMouse.ray.intersectPlane(groundPlane, rayHit)) {
    mouseWorldX = rayHit.x
    mouseWorldZ = rayHit.z
  }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
}

function createBulletMesh() {
  const g = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xddaaff, transparent: true, opacity: 0.95 })
  )
  g.add(core)
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.3 })
  )
  g.add(glow)
  const trail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.01, 0.5, 4),
    new THREE.MeshBasicMaterial({ color: 0xaa66ff, transparent: true, opacity: 0.4 })
  )
  trail.rotation.x = Math.PI / 2
  trail.position.z = 0.3
  g.add(trail)
  return g
}

function createEnemyBulletMesh() {
  const g = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff6688, transparent: true, opacity: 0.95 })
  )
  g.add(core)
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.25 })
  )
  g.add(glow)
  return g
}

function fireBullet() {
  const spread = spreadActive > 0
  const angles = spread ? [-0.15, 0, 0.15] : [0]
  angles.forEach(a => {
    let b
    if (poolBullet.length > 0) {
      b = poolBullet.pop()
      b.mesh.visible = true
    } else {
      const mesh = createBulletMesh()
      b = { mesh, vx: 0, vz: 0 }
      scene.add(mesh)
    }
    b.mesh.position.set(shipGroup.position.x, 0.3, shipGroup.position.z - 0.8)
    b.vx = Math.sin(a) * BULLET_SPEED
    b.vz = -Math.cos(a) * BULLET_SPEED
    b.damage = 1
    playerBullets.push(b)
  })
}

function fireChargedBullet() {
  let b
  if (poolBullet.length > 0) {
    b = poolBullet.pop()
    b.mesh.visible = true
  } else {
    const mesh = createBulletMesh()
    b = { mesh, vx: 0, vz: 0 }
    scene.add(mesh)
  }
  b.mesh.position.set(shipGroup.position.x, 0.3, shipGroup.position.z - 0.8)
  b.mesh.scale.set(2, 2, 2)
  b.vx = 0
  b.vz = -BULLET_SPEED * 1.2
  b.damage = 3
  playerBullets.push(b)
}

function spawnEnemy(type, x, z) {
  const def = ENEMY_DEFS[type]
  let mesh
  if (templates[type]) {
    mesh = templates[type].clone()
  } else {
    mesh = createFallbackEnemy(type)
  }
  mesh.position.set(x, 0, z)
  scene.add(mesh)
  const e = {
    mesh, type, def,
    hp: type === 'knight' || type === 'dragon' ? def.hp : def.hp,
    maxHp: def.hp,
    fireTimer: Math.random() * (def.fireRate || 99),
    age: 0,
    startX: x,
    phase: 0,
    hitFlash: 0,
    _origEmissive: 0.3,
  }
  mesh.traverse(c => { if (c.isMesh) c.castShadow = true })
  if (type === 'knight' || type === 'dragon') {
    e.hp = LEVELS[currentLevel].boss.hp
    e.maxHp = e.hp
  }
  enemies.push(e)
  return e
}

function createFallbackEnemy(type) {
  const g = new THREE.Group()
  if (type === 'asteroid') {
    const m = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.6, 0),
      new THREE.MeshStandardMaterial({ color: 0x9944ff, emissive: 0x6622aa, emissiveIntensity: 0.3, roughness: 0.6 })
    )
    g.add(m)
  } else if (type === 'imp' || type === 'imp_fast') {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x662244, emissive: 0x441122, emissiveIntensity: 0.4 })
    )
    g.add(body)
    const wingL = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x993366, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    )
    wingL.position.set(-0.35, 0.1, 0)
    wingL.rotation.y = 0.5
    g.add(wingL)
    const wingR = wingL.clone()
    wingR.position.set(0.35, 0.1, 0)
    wingR.rotation.y = -0.5
    g.add(wingR)
    if (type === 'imp_fast') {
      body.material.color.set(0x882244)
      body.material.emissive.set(0x661133)
    }
  } else if (type === 'knight') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x333355, emissive: 0x221133, emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3 })
    )
    g.add(body)
    const helm = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x444466, metalness: 0.8, roughness: 0.2 })
    )
    helm.position.y = 1.1
    g.add(helm)
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.12),
      new THREE.MeshBasicMaterial({ color: 0xff2244 })
    )
    eye.position.set(0, 0.7, -0.41)
    g.add(eye)
  } else if (type === 'dragon') {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.8, 2.0, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0x442266, emissive: 0x331155, emissiveIntensity: 0.3 })
    )
    body.rotation.x = Math.PI / 2
    g.add(body)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x553377, emissive: 0x441166, emissiveIntensity: 0.4 })
    )
    head.position.set(0, 0, -1.5)
    g.add(head)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0xff00ff }))
    eyeL.position.set(-0.3, 0.2, -1.9)
    g.add(eyeL)
    const eyeR = eyeL.clone()
    eyeR.position.set(0.3, 0.2, -1.9)
    g.add(eyeR)
    const wingL = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x663388, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    )
    wingL.position.set(-1.5, 0.3, -0.5)
    wingL.rotation.y = 0.4
    g.add(wingL)
    const wingR = wingL.clone()
    wingR.position.set(1.5, 0.3, -0.5)
    wingR.rotation.y = -0.4
    g.add(wingR)
  }
  return g
}

function spawnPowerup(x, z) {
  let mesh
  if (templates.powerup) {
    mesh = templates.powerup.clone()
  } else {
    mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.25),
      new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8800, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
    )
  }
  mesh.position.set(x, 0.3, z)
  scene.add(mesh)
  const types = ['shield', 'rapid', 'spread', 'heal']
  powerups.push({ mesh, type: types[Math.floor(Math.random() * types.length)], age: 0 })
}

function spawnParticles(x, y, z, color, count) {
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 4, 4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    )
    mesh.position.set(x, y, z)
    scene.add(mesh)
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 4
    particles.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: (Math.random() - 0.3) * speed,
      vz: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.4,
      age: 0,
    })
  }
}

function showFloatScore(worldX, worldZ, text, cls) {
  const v = new THREE.Vector3(worldX, 0.5, worldZ)
  v.project(camera)
  const sx = (v.x * 0.5 + 0.5) * innerWidth
  const sy = (-v.y * 0.5 + 0.5) * innerHeight
  const el = document.createElement('div')
  el.className = 'float-score' + (cls ? ' ' + cls : '')
  el.textContent = text
  el.style.left = sx + 'px'
  el.style.top = sy + 'px'
  floatContainer.appendChild(el)
  setTimeout(() => el.remove(), 800)
}

function triggerShake(intensity) {
  shakeTimer = 0.15
  shakeIntensity = intensity
  document.body.classList.add('screen-shake')
  setTimeout(() => document.body.classList.remove('screen-shake'), 150)
}

function screenFlash(color) {
  const el = document.createElement('div')
  el.className = 'screen-flash'
  el.style.background = color
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 300)
}

function updateHUD() {
  scoreEl.textContent = `Score: ${score}`
  levelLabelEl.textContent = LEVELS[currentLevel]?.label || ''
  hpEl.innerHTML = ''
  for (let i = 0; i < maxHp; i++) {
    const s = document.createElement('span')
    s.className = 'hp-heart' + (i >= hp ? ' lost' : '')
    s.textContent = '\u2764'
    hpEl.appendChild(s)
  }
  if (comboCount > 1) {
    comboEl.classList.remove('hidden')
    comboEl.textContent = `${comboCount}x Combo`
  } else {
    comboEl.classList.add('hidden')
  }
  const puTexts = []
  if (shieldActive > 0) puTexts.push(`Shield ${shieldActive.toFixed(1)}s`)
  if (rapidActive > 0) puTexts.push(`Rapid ${rapidActive.toFixed(1)}s`)
  if (spreadActive > 0) puTexts.push(`Spread ${spreadActive.toFixed(1)}s`)
  if (puTexts.length) {
    powerupEl.classList.remove('hidden')
    powerupEl.textContent = puTexts.join(' | ')
  } else {
    powerupEl.classList.add('hidden')
  }
}

function updateBossBar() {
  if (bossActive) {
    bossBarContainer.classList.remove('hidden')
    bossNameEl.textContent = bossActive.type === 'dragon' ? 'Shadow Dragon' : 'Shadow Knight'
    bossBarFill.style.width = Math.max(0, (bossActive.hp / bossActive.maxHp) * 100) + '%'
  } else {
    bossBarContainer.classList.add('hidden')
  }
}

function updateShip(dt) {
  const tx = mouseWorldX
  const tz = mouseWorldZ
  const margin = 1.0
  const clampX = PLAY_W / 2 - margin
  const clampZmin = -PLAY_H / 2 + margin
  const clampZmax = PLAY_H / 2 - margin
  shipX += (tx - shipX) * Math.min(1, SHIP_SPEED * dt)
  shipY += (tz - shipY) * Math.min(1, SHIP_SPEED * dt)
  shipX = Math.max(-clampX, Math.min(clampX, shipX))
  shipY = Math.max(clampZmin, Math.min(clampZmax, shipY))
  shipGroup.position.x = shipX
  shipGroup.position.z = shipY

  const tiltZ = (tx - shipX) * -0.4
  shipGroup.rotation.z += (tiltZ - shipGroup.rotation.z) * 5 * dt
  const tiltX = (tz - shipY) * 0.15
  shipGroup.rotation.x += (tiltX - shipGroup.rotation.x) * 4 * dt

  shipGroup.position.y = Math.sin(clock.elapsedTime * 3) * 0.08

  if (invTimer > 0) {
    invTimer -= dt
    shipGroup.visible = Math.floor(invTimer * 10) % 2 === 0
  } else {
    shipGroup.visible = true
  }

  const rate = rapidActive > 0 ? FIRE_RATE * 0.5 : FIRE_RATE
  fireTimer += dt
  if (isCharging) {
    chargeTimer += dt
    if (chargeTimer >= CHARGED_RATE) {
      fireChargedBullet()
      chargeTimer = 0
    }
  } else {
    if (chargeTimer > 0.3) {
      fireChargedBullet()
      chargeTimer = 0
    } else {
      chargeTimer = 0
    }
    if (fireTimer >= rate) {
      fireBullet()
      fireTimer = 0
    }
  }
}

function updateBullets(dt) {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i]
    b.mesh.position.x += b.vx * dt
    b.mesh.position.z += b.vz * dt
    if (b.mesh.position.z < -PLAY_H / 2 - 2 || Math.abs(b.mesh.position.x) > PLAY_W) {
      b.mesh.visible = false
      b.mesh.scale.set(1, 1, 1)
      poolBullet.push(b)
      playerBullets.splice(i, 1)
    }
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i]
    b.mesh.position.x += b.vx * dt
    b.mesh.position.z += b.vz * dt
    if (b.mesh.position.z > PLAY_H / 2 + 2 || Math.abs(b.mesh.position.x) > PLAY_W || b.mesh.position.z < -PLAY_H / 2 - 2) {
      b.mesh.visible = false
      poolEBullet.push(b)
      enemyBullets.splice(i, 1)
    }
  }
}

function updateEnemies(dt) {
  const lvl = LEVELS[currentLevel]
  if (!bossSpawned) {
    lvl.waves.forEach((w, wi) => {
      if (waveCounters[wi] <= 0) return
      waveTimers[wi] += dt
      if (waveTimers[wi] >= w.rate) {
        waveTimers[wi] = 0
        waveCounters[wi]--
        const x = (Math.random() - 0.5) * (PLAY_W - 2)
        spawnEnemy(w.type, x, -PLAY_H / 2 - 2)
      }
    })
    if (waveCounters.every(c => c <= 0) && enemies.length === 0 && !bossSpawned) {
      if (lvl.boss) {
        bossSpawned = true
        const b = spawnEnemy(lvl.boss.type, 0, -PLAY_H / 2 - 3)
        bossActive = b
        triggerShake(4)
        screenFlash('rgba(255,0,100,0.3)')
      } else {
        levelComplete()
        return
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]
    e.age += dt
    const def = e.def
    const isBoss = e.type === 'knight' || e.type === 'dragon'

    if (e.def.move === 'straight') {
      e.mesh.position.z += def.speed * dt
    } else if (e.def.move === 'sine') {
      e.mesh.position.z += def.speed * dt
      e.mesh.position.x = e.startX + Math.sin(e.age * 2) * 2
    } else if (e.def.move === 'zigzag') {
      e.mesh.position.z += def.speed * dt
      e.mesh.position.x = e.startX + Math.sin(e.age * 5) * 1.5
    } else if (e.def.move === 'boss_knight') {
      const targetZ = -PLAY_H / 2 + 4
      if (e.mesh.position.z < targetZ) {
        e.mesh.position.z += def.speed * 2 * dt
      } else {
        e.mesh.position.x = Math.sin(e.age * 1.2) * (PLAY_W / 2 - 1.5)
        if (e.hp < e.maxHp * 0.5) {
          e.phase = 1
          if (Math.random() < 0.005) {
            e.mesh.position.z = shipGroup.position.z - 3
            triggerShake(2)
          }
        }
      }
    } else if (e.def.move === 'boss_dragon') {
      const targetZ = -PLAY_H / 2 + 5
      if (e.mesh.position.z < targetZ) {
        e.mesh.position.z += def.speed * 2 * dt
      } else {
        e.mesh.position.x = Math.sin(e.age * 0.8) * (PLAY_W / 2 - 2)
        e.mesh.position.z = targetZ + Math.sin(e.age * 0.5) * 1.5
        if (e.hp < e.maxHp * 0.5 && e.phase === 0) {
          e.phase = 1
          triggerShake(5)
          screenFlash('rgba(160,0,255,0.3)')
        }
      }
    }

    if (def.shoots && e.mesh.position.z > -PLAY_H / 2) {
      e.fireTimer += dt
      const rate = isBoss && e.phase === 1 ? def.fireRate * 0.6 : def.fireRate
      if (e.fireTimer >= rate) {
        e.fireTimer = 0
        enemyFire(e)
      }
    }

    if (!isBoss && e.mesh.position.z > PLAY_H / 2 + 2) {
      scene.remove(e.mesh)
      enemies.splice(i, 1)
      continue
    }

    if (e.mesh.rotation) {
      if (e.type === 'asteroid') {
        e.mesh.rotation.y += dt * 1.5
        e.mesh.rotation.x += dt * 0.7
      }
      if (e.type === 'imp' || e.type === 'imp_fast') {
        e.mesh.position.y = Math.sin(e.age * 5) * 0.15
      }
      if (e.type === 'knight') {
        e.mesh.position.y = Math.sin(e.age * 2) * 0.1
        e.mesh.rotation.z = Math.sin(e.age * 1.5) * 0.05
      }
      if (e.type === 'dragon') {
        e.mesh.rotation.y = Math.PI
        e.mesh.position.y = Math.sin(e.age * 1.5) * 0.2
        e.mesh.rotation.z = Math.sin(e.age * 1.0) * 0.08
      }
    }

    if (e.hitFlash > 0) {
      e.hitFlash -= dt
      e.mesh.traverse(c => {
        if (c.isMesh && c.material.emissiveIntensity !== undefined) {
          c.material.emissiveIntensity = e.hitFlash > 0 ? 1.5 : (e._origEmissive || 0.3)
        }
      })
    }
  }
}

function enemyFire(e) {
  const isBoss = e.type === 'knight' || e.type === 'dragon'
  if (e.type === 'imp' || e.type === 'imp_fast') {
    spawnEnemyBullet(e.mesh.position.x, e.mesh.position.z, 0, ENEMY_BULLET_SPEED)
  } else if (e.type === 'knight') {
    if (e.phase === 0) {
      for (let a = -0.2; a <= 0.2; a += 0.2) {
        spawnEnemyBullet(e.mesh.position.x, e.mesh.position.z, Math.sin(a) * ENEMY_BULLET_SPEED, Math.cos(a) * ENEMY_BULLET_SPEED)
      }
    } else {
      for (let a = -0.4; a <= 0.4; a += 0.2) {
        spawnEnemyBullet(e.mesh.position.x, e.mesh.position.z, Math.sin(a) * ENEMY_BULLET_SPEED, Math.cos(a) * ENEMY_BULLET_SPEED)
      }
    }
  } else if (e.type === 'dragon') {
    if (e.phase === 0) {
      const dx = shipGroup.position.x - e.mesh.position.x
      const dz = shipGroup.position.z - e.mesh.position.z
      const len = Math.sqrt(dx * dx + dz * dz) || 1
      for (let a = -0.15; a <= 0.15; a += 0.15) {
        const cos = Math.cos(a), sin = Math.sin(a)
        const vx = (dx / len * cos - dz / len * sin) * ENEMY_BULLET_SPEED
        const vz = (dx / len * sin + dz / len * cos) * ENEMY_BULLET_SPEED
        spawnEnemyBullet(e.mesh.position.x, e.mesh.position.z, vx, vz)
      }
    } else {
      const count = 12
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + e.age * 2
        spawnEnemyBullet(e.mesh.position.x, e.mesh.position.z, Math.sin(a) * ENEMY_BULLET_SPEED * 0.8, Math.cos(a) * ENEMY_BULLET_SPEED * 0.8)
      }
    }
  }
}

function spawnEnemyBullet(x, z, vx, vz) {
  let b
  if (poolEBullet.length > 0) {
    b = poolEBullet.pop()
    b.mesh.visible = true
  } else {
    const mesh = createEnemyBulletMesh()
    b = { mesh, vx: 0, vz: 0 }
    scene.add(mesh)
  }
  b.mesh.position.set(x, 0.3, z)
  b.vx = vx
  b.vz = vz
  enemyBullets.push(b)
}

function checkCollisions() {
  for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
    const b = playerBullets[bi]
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei]
      const dx = b.mesh.position.x - e.mesh.position.x
      const dz = b.mesh.position.z - e.mesh.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < e.def.radius + 0.15) {
        e.hp -= b.damage
        b.mesh.visible = false
        b.mesh.scale.set(1, 1, 1)
        poolBullet.push(b)
        playerBullets.splice(bi, 1)

        if (e.hp <= 0) {
          killEnemy(e, ei)
        } else {
          e.hitFlash = 0.1
          spawnParticles(e.mesh.position.x, 0.3, e.mesh.position.z, 0xbb88ff, 3)
          if (e === bossActive) updateBossBar()
        }
        break
      }
    }
  }

  if (invTimer <= 0 && shieldActive <= 0) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i]
      const dx = b.mesh.position.x - shipGroup.position.x
      const dz = b.mesh.position.z - shipGroup.position.z
      if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
        hitPlayer()
        b.mesh.visible = false
        poolEBullet.push(b)
        enemyBullets.splice(i, 1)
        break
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      const dx = e.mesh.position.x - shipGroup.position.x
      const dz = e.mesh.position.z - shipGroup.position.z
      if (Math.sqrt(dx * dx + dz * dz) < e.def.radius + 0.4) {
        hitPlayer()
        if (e.type !== 'knight' && e.type !== 'dragon') {
          killEnemy(e, i)
        }
        break
      }
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i]
    const dx = p.mesh.position.x - shipGroup.position.x
    const dz = p.mesh.position.z - shipGroup.position.z
    if (Math.sqrt(dx * dx + dz * dz) < 0.8) {
      collectPowerup(p)
      scene.remove(p.mesh)
      powerups.splice(i, 1)
    }
  }
}

function killEnemy(e, idx) {
  const pts = e.def.score * (1 + comboCount * 0.1)
  score += Math.floor(pts)
  levelScore += Math.floor(pts)
  levelKills++
  comboCount++
  comboTimer = COMBO_WINDOW

  spawnParticles(e.mesh.position.x, 0.3, e.mesh.position.z, e.type === 'asteroid' ? 0x9944ff : 0xff4466, 8)
  showFloatScore(e.mesh.position.x, e.mesh.position.z, `+${Math.floor(pts)}`)

  if (Math.random() < e.def.dropChance) {
    spawnPowerup(e.mesh.position.x, e.mesh.position.z)
  }

  if (e === bossActive) {
    bossActive = null
    bossBarContainer.classList.add('hidden')
    triggerShake(6)
    screenFlash('rgba(183,138,255,0.4)')
    spawnParticles(e.mesh.position.x, 0.5, e.mesh.position.z, 0xffaa44, 20)
    setTimeout(() => {
      if (enemies.length === 0) levelComplete()
    }, 500)
  }

  scene.remove(e.mesh)
  enemies.splice(idx, 1)
  updateHUD()
}

function hitPlayer() {
  hp--
  invTimer = INV_TIME
  triggerShake(3)
  screenFlash('rgba(255,50,80,0.3)')
  showFloatScore(shipGroup.position.x, shipGroup.position.z, '-1', 'damage')
  updateHUD()
  if (hp <= 0) {
    gameOver()
  }
}

function collectPowerup(p) {
  if (p.type === 'shield') {
    shieldActive = 3
    showFloatScore(p.mesh.position.x, p.mesh.position.z, 'Shield!', 'heal')
  } else if (p.type === 'rapid') {
    rapidActive = 5
    showFloatScore(p.mesh.position.x, p.mesh.position.z, 'Rapid Fire!', 'heal')
  } else if (p.type === 'spread') {
    spreadActive = 5
    showFloatScore(p.mesh.position.x, p.mesh.position.z, 'Spread!', 'heal')
  } else if (p.type === 'heal') {
    hp = Math.min(hp + 1, maxHp)
    showFloatScore(p.mesh.position.x, p.mesh.position.z, '+1 HP', 'heal')
  }
  spawnParticles(p.mesh.position.x, 0.3, p.mesh.position.z, 0xffaa44, 6)
  updateHUD()
}

function updatePowerups(dt) {
  if (shieldActive > 0) shieldActive -= dt
  if (rapidActive > 0) rapidActive -= dt
  if (spreadActive > 0) spreadActive -= dt
  if (comboTimer > 0) {
    comboTimer -= dt
    if (comboTimer <= 0) comboCount = 0
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i]
    p.age += dt
    p.mesh.position.z += 1.5 * dt
    p.mesh.position.y = 0.3 + Math.sin(p.age * 4) * 0.15
    p.mesh.rotation.y += dt * 3
    if (p.age > 8 || p.mesh.position.z > PLAY_H / 2 + 2) {
      scene.remove(p.mesh)
      powerups.splice(i, 1)
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.age += dt
    p.mesh.position.x += p.vx * dt
    p.mesh.position.y += p.vy * dt
    p.mesh.position.z += p.vz * dt
    p.mesh.material.opacity = 1 - p.age / p.life
    if (p.age >= p.life) {
      scene.remove(p.mesh)
      particles.splice(i, 1)
    }
  }
}

function updateStarfield(dt) {
  starLayers.forEach(l => {
    const pos = l.mesh.geometry.attributes.position.array
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 2] += l.speed * dt * 3
      if (pos[i + 2] > l.spread / 2) {
        pos[i + 2] = -l.spread / 2
        pos[i] = (Math.random() - 0.5) * l.spread
      }
    }
    l.mesh.geometry.attributes.position.needsUpdate = true
  })
}

function levelComplete() {
  paused = true
  if (currentLevel >= LEVELS.length - 1) {
    victoryScore.textContent = `Final Score: ${score}`
    victoryScreen.classList.remove('hidden')
  } else {
    scoreBreakdown.innerHTML = `
      <div class="breakdown-line"><span>Enemies Defeated</span><span>${levelKills}</span></div>
      <div class="breakdown-line"><span>Level Score</span><span>${levelScore}</span></div>
    `
    levelTotalScore.textContent = `Total: ${score}`
    levelCompleteScreen.classList.remove('hidden')
  }
}

function gameOver() {
  paused = true
  gameOverScore.textContent = `Score: ${score}`
  gameOverScreen.classList.remove('hidden')
}

function fullRestart() {
  victoryScreen.classList.add('hidden')
  gameOverScreen.classList.add('hidden')
  levelCompleteScreen.classList.add('hidden')
  score = 0
  hp = maxHp
  startLevel(0)
}

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  updateStarfield(dt)

  if (started && !paused) {
    updateShip(dt)
    updateBullets(dt)
    updateEnemies(dt)
    checkCollisions()
    updatePowerups(dt)
    updateParticles(dt)
    updateHUD()
    updateBossBar()
  }

  renderer.render(scene, camera)
}

init()
