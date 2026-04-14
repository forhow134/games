import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const ISLAND_RADIUS = 18
const PLAYER_SPEED = 8
const COLLECT_DIST = 1.5
const PLAYER_RADIUS = 0.4
const ROCK_COLLISION_RADIUS = 0.7
const TREE_COLLISION_RADIUS = 0.5
const ENEMY_SPEED_FACTOR = 0.4
const SHADOW_SPEED_FACTOR = 0.3
const ENEMY_COLLISION_RADIUS = 0.6
const INVINCIBLE_DURATION = 1.5
const COMBO_WINDOW = 5
const MAGNET_RANGE = 4

const LEVELS = [
  { gems: 5,  enemies: 0, shadows: 0, timeLimit: 60, gemBonus: 100, powerUps: 1, label: 'Calm Shores' },
  { gems: 7,  enemies: 2, shadows: 0, timeLimit: 55, gemBonus: 150, powerUps: 1, label: 'Misty Woods' },
  { gems: 10, enemies: 3, shadows: 1, timeLimit: 50, gemBonus: 200, powerUps: 2, label: 'Skull Cove' },
  { gems: 12, enemies: 4, shadows: 2, timeLimit: 45, gemBonus: 250, powerUps: 2, label: "Dragon's Peak" },
  { gems: 15, enemies: 5, shadows: 3, timeLimit: 40, gemBonus: 300, powerUps: 3, label: 'The Abyss' },
]

let scene, camera, renderer, clock
let player, gems = [], decorations = [], enemies = [], powerUps = []
let collected = 0, started = false
const keys = {}
let walkCycle = 0, isWalking = false, walkBlend = 0

let currentLevel = 0, score = 0, timeRemaining = 60
let health = 3
let combo = 0, comboTimer = 0
let isInvincible = false, invincibleTimer = 0
let hasShield = false, speedBoostTimer = 0, magnetTimer = 0
let levelGemScore = 0, levelComboScore = 0

let camAngle = Math.PI, camPitch = 0.5
let isMouseDown = false, lastMouseX = 0, lastMouseY = 0
const CAM_DIST = 14
const CAM_MIN_PITCH = 0.15, CAM_MAX_PITCH = 1.2

function damp(a, b, dt, lambda = 8) {
  return a + (b - a) * (1 - Math.exp(-lambda * dt))
}

const hud = document.getElementById('hud')
const healthEl = document.getElementById('health')
const scoreEl = document.getElementById('score-display')
const levelLabelEl = document.getElementById('level-label')
const gemCountEl = document.getElementById('gem-count')
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
const gameOverScreen = document.getElementById('game-over')
const gameOverScore = document.getElementById('game-over-score')
const gameOverRestart = document.getElementById('game-over-restart')
const victoryScreen = document.getElementById('victory')
const victoryScore = document.getElementById('victory-score')
const victoryRestart = document.getElementById('victory-restart')

const gltfLoader = new GLTFLoader()

function init() {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0x87ceeb, 30, 50)

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  document.body.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(10, 15, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  scene.add(sun)

  createIsland()
  createPlayer()

  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true)
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false)
  window.addEventListener('resize', onResize)

  renderer.domElement.addEventListener('mousedown', e => {
    isMouseDown = true
    lastMouseX = e.clientX
    lastMouseY = e.clientY
  })
  window.addEventListener('mouseup', () => isMouseDown = false)
  window.addEventListener('mousemove', e => {
    if (!isMouseDown) return
    const dx = e.clientX - lastMouseX
    const dy = e.clientY - lastMouseY
    camAngle -= dx * 0.005
    camPitch = Math.max(CAM_MIN_PITCH, Math.min(CAM_MAX_PITCH, camPitch + dy * 0.005))
    lastMouseX = e.clientX
    lastMouseY = e.clientY
  })
  renderer.domElement.addEventListener('wheel', e => e.preventDefault(), { passive: false })
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())

  startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden')
    startLevel(0)
  })
  nextLevelBtn.addEventListener('click', () => {
    levelCompleteScreen.classList.add('hidden')
    startLevel(currentLevel + 1)
  })
  gameOverRestart.addEventListener('click', fullRestart)
  victoryRestart.addEventListener('click', fullRestart)

  animate()
}

function createIsland() {
  const geo = new THREE.CircleGeometry(ISLAND_RADIUS, 48)
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a8c3f })
  const ground = new THREE.Mesh(geo, mat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const beachGeo = new THREE.RingGeometry(ISLAND_RADIUS - 1.5, ISLAND_RADIUS, 48)
  const beachMat = new THREE.MeshStandardMaterial({ color: 0xdec9a3 })
  const beach = new THREE.Mesh(beachGeo, beachMat)
  beach.rotation.x = -Math.PI / 2
  beach.position.y = 0.01
  beach.receiveShadow = true
  scene.add(beach)

  const waterGeo = new THREE.PlaneGeometry(200, 200)
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2389da, transparent: true, opacity: 0.7 })
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.y = -0.15
  scene.add(water)
}

function createRainbowMaterial() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#ff0000')
  grad.addColorStop(0.17, '#ff8800')
  grad.addColorStop(0.33, '#ffff00')
  grad.addColorStop(0.5, '#00ff44')
  grad.addColorStop(0.67, '#0088ff')
  grad.addColorStop(0.83, '#8800ff')
  grad.addColorStop(1, '#ff00ff')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(canvas)
  return new THREE.MeshStandardMaterial({ map: tex, emissive: 0x222222, emissiveIntensity: 0.3 })
}

function createFallbackPlayer() {
  const group = new THREE.Group()
  const mat = createRainbowMaterial()
  const upperLimbGeo = new THREE.CapsuleGeometry(0.08, 0.22, 4, 8)
  const lowerLimbGeo = new THREE.CapsuleGeometry(0.07, 0.22, 4, 8)

  const hips = new THREE.Group()
  hips.position.y = 0.55
  group.add(hips)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.3, 4, 8), mat)
  torso.position.y = 0.2
  torso.castShadow = true
  hips.add(torso)

  const chest = new THREE.Group()
  chest.position.y = 0.4
  hips.add(chest)

  const headPivot = new THREE.Group()
  headPivot.position.y = 0.2
  chest.add(headPivot)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat.clone())
  head.position.y = 0.12
  head.castShadow = true
  headPivot.add(head)

  function createArm(side) {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.28, 0.1, 0)
    const upper = new THREE.Mesh(upperLimbGeo, mat)
    upper.position.y = -0.15
    upper.castShadow = true
    shoulder.add(upper)
    const elbow = new THREE.Group()
    elbow.position.y = -0.3
    shoulder.add(elbow)
    const lower = new THREE.Mesh(lowerLimbGeo, mat)
    lower.position.y = -0.15
    lower.castShadow = true
    elbow.add(lower)
    return { shoulder, elbow }
  }

  function createLeg(side) {
    const hip = new THREE.Group()
    hip.position.set(side * 0.12, 0, 0)
    const upper = new THREE.Mesh(upperLimbGeo, mat)
    upper.position.y = -0.15
    upper.castShadow = true
    hip.add(upper)
    const knee = new THREE.Group()
    knee.position.y = -0.3
    hip.add(knee)
    const lower = new THREE.Mesh(lowerLimbGeo, mat)
    lower.position.y = -0.15
    lower.castShadow = true
    knee.add(lower)
    return { hip, knee }
  }

  const leftArm = createArm(1)
  const rightArm = createArm(-1)
  chest.add(leftArm.shoulder, rightArm.shoulder)

  const leftLeg = createLeg(1)
  const rightLeg = createLeg(-1)
  hips.add(leftLeg.hip, rightLeg.hip)

  group.userData.anim = {
    type: 'fallback',
    baseY: 0,
    hips, chest, headPivot,
    leftShoulder: leftArm.shoulder, rightShoulder: rightArm.shoulder,
    leftElbow: leftArm.elbow, rightElbow: rightArm.elbow,
    leftHip: leftLeg.hip, rightHip: rightLeg.hip,
    leftKnee: leftLeg.knee, rightKnee: rightLeg.knee
  }
  group.userData.groundY = 0

  return group
}

function createPlayer() {
  player = createFallbackPlayer()
  scene.add(player)

  gltfLoader.load('./models/character.glb', gltf => {
    const model = gltf.scene
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const s = 1.5 / size.y
    model.scale.set(s, s, s)
    box.setFromObject(model)
    model.position.y = -box.min.y

    model.traverse(c => {
      if (c.isMesh) {
        c.castShadow = true
        c.material = c.material.clone()
        c.material.emissive = new THREE.Color(0x3a1a00)
        c.material.emissiveIntensity = 0.15
        c.material.needsUpdate = true
      }
    })

    if (gltf.animations && gltf.animations.length > 0) {
      const mx = new THREE.AnimationMixer(model)
      const walkClip = gltf.animations.find(a => /walk|run/i.test(a.name)) || gltf.animations[0]
      const idleClip = gltf.animations.find(a => /idle|stand/i.test(a.name))
      const wa = mx.clipAction(walkClip)
      const ia = idleClip ? mx.clipAction(idleClip) : null
      wa.play()
      wa.setEffectiveWeight(0)
      if (ia) { ia.play(); ia.setEffectiveWeight(1) }
      model.userData.anim = { type: 'gltf-mixer', mixer: mx, walkAction: wa, idleAction: ia }
    } else {
      const bones = {}
      model.traverse(c => {
        if (c.isBone) {
          const n = c.name.toLowerCase()
          if (/hip|pelvis/.test(n)) bones.hips = c
          if (/leftupleg|left_up_leg|lefthip/.test(n)) bones.leftHip = c
          if (/rightupleg|right_up_leg|righthip/.test(n)) bones.rightHip = c
          if (/leftarm|left_arm|leftshoulder/.test(n)) bones.leftShoulder = c
          if (/rightarm|right_arm|rightshoulder/.test(n)) bones.rightShoulder = c
        }
      })
      if (bones.hips && bones.leftHip && bones.rightHip) {
        model.userData.anim = { type: 'gltf-procedural', ...bones }
      } else {
        model.userData.anim = { type: 'gltf-basic' }
      }
    }

    const pos = player.position.clone()
    const rot = player.rotation.y
    scene.remove(player)
    player = model
    player.position.x = pos.x
    player.position.z = pos.z
    player.rotation.y = rot
    player.userData.groundY = model.position.y
    scene.add(player)
  }, undefined, err => {
    console.error('character.glb FAILED:', err)
  })
}

function getRandomPosition(minR, maxR, existingPositions, minSep) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const angle = Math.random() * Math.PI * 2
    const r = minR + Math.random() * (maxR - minR)
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r
    let valid = true
    for (const p of existingPositions) {
      const dx = x - p.x, dz = z - p.z
      if (Math.sqrt(dx * dx + dz * dz) < minSep) { valid = false; break }
    }
    if (valid) return { x, z }
  }
  const angle = Math.random() * Math.PI * 2
  const r = minR + Math.random() * (maxR - minR)
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r }
}

function createFallbackGem(isGolden) {
  const color = isGolden ? 0xffd700 : 0x00ffcc
  const emissive = isGolden ? 0xffaa00 : 0x00ffaa
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(isGolden ? 0.55 : 0.4, 0),
    new THREE.MeshStandardMaterial({
      color, emissive,
      emissiveIntensity: isGolden ? 0.8 : 0.6,
      transparent: true, opacity: 0.85,
    })
  )
  return gem
}

function addGemGlow(gem, isGolden) {
  const color = isGolden ? 0xffd700 : 0x00ffcc
  const light = new THREE.PointLight(color, isGolden ? 3 : 2, 5)
  light.position.set(0, 0.5, 0)
  gem.add(light)
}

function createGems(count, levelIdx) {
  const positions = decorations.map(d => ({ x: d.position.x, z: d.position.z }))
  const goldenIndex = levelIdx >= 1 ? Math.floor(Math.random() * count) : -1

  for (let i = 0; i < count; i++) {
    const isGolden = i === goldenIndex
    const pos = getRandomPosition(3, ISLAND_RADIUS - 3, positions, 2)
    positions.push(pos)
    const gem = createFallbackGem(isGolden)
    gem.position.set(pos.x, 0.6, pos.z)
    gem.castShadow = true
    gem.userData.collected = false
    gem.userData.baseY = 0.6
    gem.userData.isGolden = isGolden
    addGemGlow(gem, isGolden)
    scene.add(gem)
    gems.push(gem)
  }

  gltfLoader.load('./models/gem.glb', gltf => {
    gems.forEach((old, i) => {
      if (old.userData.isGolden) return
      const model = gltf.scene.clone()
      model.scale.set(0.5, 0.5, 0.5)
      model.position.copy(old.position)
      model.userData = { ...old.userData }
      model.userData.baseY = old.position.y
      model.traverse(c => {
        if (c.isMesh) {
          c.material = c.material.clone()
          c.material.emissive = new THREE.Color(0x00ffaa)
          c.material.emissiveIntensity = 0.4
        }
      })
      addGemGlow(model, false)
      scene.remove(old)
      scene.add(model)
      gems[i] = model
    })
  }, undefined, () => {})
}

function createDecorations(levelIdx) {
  const rockCount = 6 + levelIdx * 2
  const treeCount = 6 + levelIdx * 2
  const total = rockCount + treeCount
  const positions = []

  const rockGeo = new THREE.IcosahedronGeometry(0.6, 1)
  const posAttr = rockGeo.getAttribute('position')
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setX(i, posAttr.getX(i) + (Math.random() - 0.5) * 0.15)
    posAttr.setY(i, posAttr.getY(i) + (Math.random() - 0.5) * 0.15)
    posAttr.setZ(i, posAttr.getZ(i) + (Math.random() - 0.5) * 0.15)
  }
  rockGeo.computeVertexNormals()
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a9080, roughness: 0.9 })

  for (let i = 0; i < total; i++) {
    const pos = getRandomPosition(3, ISLAND_RADIUS - 3, positions, 2.5)
    positions.push(pos)

    if (i < rockCount) {
      const rock = new THREE.Mesh(rockGeo, rockMat)
      const s = 0.5 + Math.random() * 0.8
      rock.position.set(pos.x, 0.25 * s, pos.z)
      rock.rotation.set(Math.random(), Math.random(), 0)
      rock.scale.setScalar(s)
      rock.castShadow = true
      rock.userData.collisionRadius = ROCK_COLLISION_RADIUS * s
      scene.add(rock)
      decorations.push(rock)
    } else {
      const tree = new THREE.Group()
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.6, 6)
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c })
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 0.3
      trunk.castShadow = true

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6b30 })
      const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.0, 6), leafMat)
      leaf1.position.y = 1.0
      leaf1.castShadow = true
      const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 6), leafMat)
      leaf2.position.y = 1.5
      leaf2.castShadow = true
      const leaf3 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 6), leafMat)
      leaf3.position.y = 1.9
      leaf3.castShadow = true

      tree.add(trunk, leaf1, leaf2, leaf3)
      tree.position.set(pos.x, 0, pos.z)
      tree.userData.collisionRadius = TREE_COLLISION_RADIUS
      scene.add(tree)
      decorations.push(tree)
    }
  }

  gltfLoader.load('./models/rock.glb', gltf => {
    const template = gltf.scene
    const baseBox = new THREE.Box3().setFromObject(template)
    const baseSize = baseBox.getSize(new THREE.Vector3())
    const baseScale = 1.2 / baseSize.y
    template.scale.set(baseScale, baseScale, baseScale)
    baseBox.setFromObject(template)
    const baseYOffset = -baseBox.min.y

    decorations.forEach((old, i) => {
      if (i >= rockCount) return
      const model = template.clone()
      const s = old.scale.x
      model.scale.set(baseScale * s, baseScale * s, baseScale * s)
      model.position.copy(old.position)
      model.position.y = baseYOffset * s
      model.rotation.copy(old.rotation)
      model.userData = { ...old.userData }
      model.traverse(c => { if (c.isMesh) c.castShadow = true })
      scene.remove(old)
      scene.add(model)
      decorations[i] = model
    })
  }, undefined, () => {})

  gltfLoader.load('./models/tree.glb', gltf => {
    const template = gltf.scene
    const box = new THREE.Box3().setFromObject(template)
    const size = box.getSize(new THREE.Vector3())
    const targetHeight = 2.5
    const s = targetHeight / size.y
    template.scale.set(s, s, s)
    box.setFromObject(template)
    const yOffset = -box.min.y

    decorations.forEach((old, i) => {
      if (i < rockCount) return
      const model = template.clone()
      model.position.copy(old.position)
      model.position.y = yOffset
      model.userData = { ...old.userData }
      model.traverse(c => { if (c.isMesh) c.castShadow = true })
      scene.remove(old)
      scene.add(model)
      decorations[i] = model
    })
  }, undefined, () => {})
}

function createCrabEnemy(pos) {
  const group = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bodyMat)
  body.scale.set(1.2, 0.6, 1)
  body.position.y = 0.25
  body.castShadow = true
  group.add(body)

  const legMat = new THREE.MeshStandardMaterial({ color: 0xaa2222 })
  for (let s = -1; s <= 1; s += 2) {
    for (let j = 0; j < 3; j++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 4), legMat)
      leg.position.set(s * (0.25 + j * 0.1), 0.1, (j - 1) * 0.15)
      leg.rotation.z = s * 0.6
      group.add(leg)
    }
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), bodyMat)
    claw.position.set(s * 0.5, 0.3, 0.25)
    claw.castShadow = true
    group.add(claw)
  }

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5 })
  for (let s = -1; s <= 1; s += 2) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4), legMat)
    stalk.position.set(s * 0.12, 0.45, 0.1)
    group.add(stalk)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat)
    eye.position.set(s * 0.12, 0.55, 0.1)
    group.add(eye)
  }

  group.position.set(pos.x, 0, pos.z)

  const wp1 = { x: pos.x, z: pos.z }
  const a2 = Math.random() * Math.PI * 2
  const d2 = 3 + Math.random() * 4
  const wp2x = Math.max(-ISLAND_RADIUS + 2, Math.min(ISLAND_RADIUS - 2, pos.x + Math.cos(a2) * d2))
  const wp2z = Math.max(-ISLAND_RADIUS + 2, Math.min(ISLAND_RADIUS - 2, pos.z + Math.sin(a2) * d2))
  const wp2 = { x: wp2x, z: wp2z }

  group.userData.type = 'crab'
  group.userData.collisionRadius = ENEMY_COLLISION_RADIUS
  group.userData.waypoints = [wp1, wp2]
  group.userData.waypointIndex = 0
  group.userData.speed = PLAYER_SPEED * ENEMY_SPEED_FACTOR

  return group
}

function createShadowEnemy(pos) {
  const group = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x220033, emissive: 0x440066, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.7
  })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), bodyMat)
  body.position.y = 0.6
  body.castShadow = true
  group.add(body)

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0,
    transparent: true, opacity: 0.5
  })
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), coreMat)
  core.position.y = 0.6
  group.add(core)

  const light = new THREE.PointLight(0x8800ff, 1.5, 4)
  light.position.y = 0.6
  group.add(light)

  group.position.set(pos.x, 0, pos.z)
  group.userData.type = 'shadow'
  group.userData.collisionRadius = ENEMY_COLLISION_RADIUS * 0.8
  group.userData.speed = PLAYER_SPEED * SHADOW_SPEED_FACTOR
  group.userData.chasing = false

  return group
}

function createEnemies(crabCount, shadowCount) {
  const positions = [
    ...decorations.map(d => ({ x: d.position.x, z: d.position.z })),
    ...gems.map(g => ({ x: g.position.x, z: g.position.z })),
    { x: 0, z: 0 }
  ]

  for (let i = 0; i < crabCount; i++) {
    const pos = getRandomPosition(5, ISLAND_RADIUS - 3, positions, 3)
    positions.push(pos)
    const crab = createCrabEnemy(pos)
    scene.add(crab)
    enemies.push(crab)
  }

  for (let i = 0; i < shadowCount; i++) {
    const pos = getRandomPosition(8, ISLAND_RADIUS - 3, positions, 3)
    positions.push(pos)
    const shadow = createShadowEnemy(pos)
    scene.add(shadow)
    enemies.push(shadow)
  }
}

function createPowerUpItem(type, pos) {
  let mesh
  if (type === 'speed') {
    mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.6 })
    )
  } else if (type === 'shield') {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x4488ff, emissive: 0x2266ff, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.7
      })
    )
  } else {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0x8800cc, emissiveIntensity: 0.6 })
    )
  }

  mesh.position.set(pos.x, 0.8, pos.z)
  mesh.castShadow = true
  mesh.userData.type = type
  mesh.userData.collected = false
  mesh.userData.baseY = 0.8

  const light = new THREE.PointLight(
    type === 'speed' ? 0xffcc00 : type === 'shield' ? 0x4488ff : 0xaa00ff,
    1.5, 4
  )
  light.position.set(0, 0.3, 0)
  mesh.add(light)

  return mesh
}

function createPowerUpsForLevel(count, levelIdx) {
  const positions = [
    ...decorations.map(d => ({ x: d.position.x, z: d.position.z })),
    ...gems.map(g => ({ x: g.position.x, z: g.position.z })),
    ...enemies.map(e => ({ x: e.position.x, z: e.position.z })),
  ]

  const types = ['speed', 'shield']
  if (levelIdx >= 2) types.push('magnet')

  for (let i = 0; i < count; i++) {
    const pos = getRandomPosition(4, ISLAND_RADIUS - 4, positions, 3)
    positions.push(pos)
    const type = types[Math.floor(Math.random() * types.length)]
    const pu = createPowerUpItem(type, pos)
    scene.add(pu)
    powerUps.push(pu)
  }
}

function clearLevelObjects() {
  gems.forEach(g => scene.remove(g))
  gems = []
  enemies.forEach(e => scene.remove(e))
  enemies = []
  powerUps.forEach(p => scene.remove(p))
  powerUps = []
  decorations.forEach(d => scene.remove(d))
  decorations = []
}

function startLevel(levelIdx) {
  currentLevel = levelIdx
  const cfg = LEVELS[levelIdx]
  clearLevelObjects()

  collected = 0
  timeRemaining = cfg.timeLimit
  health = 3
  combo = 0
  comboTimer = 0
  isInvincible = false
  invincibleTimer = 0
  hasShield = false
  speedBoostTimer = 0
  magnetTimer = 0
  levelGemScore = 0
  levelComboScore = 0
  walkCycle = 0
  walkBlend = 0

  player.position.set(0, player.userData?.groundY ?? 0, 0)
  player.rotation.y = 0

  createDecorations(levelIdx)
  createGems(cfg.gems, levelIdx)
  createEnemies(cfg.enemies, cfg.shadows)
  createPowerUpsForLevel(cfg.powerUps, levelIdx)

  updateHUD()
  hud.classList.remove('hidden')

  levelTitleText.textContent = `Level ${levelIdx + 1} - ${cfg.label}`
  levelTitleScreen.classList.remove('hidden')
  started = false
  setTimeout(() => {
    levelTitleScreen.classList.add('hidden')
    started = true
  }, 2000)
}

function completeLevel() {
  started = false
  const cfg = LEVELS[currentLevel]
  const timeBonus = Math.round(timeRemaining * 10)
  score += timeBonus

  scoreBreakdown.innerHTML = `
    <div class="breakdown-line"><span>Gems:</span><span>+${levelGemScore}</span></div>
    <div class="breakdown-line"><span>Combo Bonus:</span><span>+${levelComboScore}</span></div>
    <div class="breakdown-line"><span>Time Bonus:</span><span>+${timeBonus}</span></div>
  `
  levelTotalScore.textContent = `Total Score: ${score}`

  if (currentLevel >= LEVELS.length - 1) {
    victoryScore.textContent = `Final Score: ${score}`
    victoryScreen.classList.remove('hidden')
  } else {
    levelCompleteScreen.classList.remove('hidden')
  }
}

function gameOver() {
  started = false
  gameOverScore.textContent = `Score: ${score}`
  gameOverScreen.classList.remove('hidden')
}

function fullRestart() {
  gameOverScreen.classList.add('hidden')
  victoryScreen.classList.add('hidden')
  levelCompleteScreen.classList.add('hidden')
  score = 0
  startLevel(0)
}

function updateHUD() {
  const cfg = LEVELS[currentLevel]
  healthEl.textContent = '\u2764\uFE0F'.repeat(health) + '\u{1F5A4}'.repeat(Math.max(0, 3 - health))
  scoreEl.textContent = `Score: ${score}`
  levelLabelEl.textContent = `Level ${currentLevel + 1} - ${cfg.label}`
  gemCountEl.textContent = `Gems: ${collected} / ${cfg.gems}`

  const mins = Math.floor(timeRemaining / 60)
  const secs = Math.floor(timeRemaining % 60)
  timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`
  if (timeRemaining <= 10) {
    timerEl.classList.add('warning')
  } else {
    timerEl.classList.remove('warning')
  }

  if (combo > 1) {
    comboEl.textContent = `Combo x${combo}!`
    comboEl.classList.remove('hidden')
  } else {
    comboEl.classList.add('hidden')
  }
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

function resolveDecorationCollisions() {
  for (const deco of decorations) {
    const dx = player.position.x - deco.position.x
    const dz = player.position.z - deco.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const minDist = PLAYER_RADIUS + (deco.userData.collisionRadius || 0.5)
    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist
      player.position.x += (dx / dist) * overlap
      player.position.z += (dz / dist) * overlap
    }
  }
}

function updatePlayer(dt) {
  if (!started) return
  const forward = new THREE.Vector3(-Math.sin(camAngle), 0, -Math.cos(camAngle))
  const right = new THREE.Vector3(-forward.z, 0, forward.x)

  const dir = new THREE.Vector3()
  if (keys['w'] || keys['arrowup']) dir.add(forward)
  if (keys['s'] || keys['arrowdown']) dir.sub(forward)
  if (keys['a'] || keys['arrowleft']) dir.sub(right)
  if (keys['d'] || keys['arrowright']) dir.add(right)

  const speed = speedBoostTimer > 0 ? PLAYER_SPEED * 1.5 : PLAYER_SPEED

  if (dir.length() > 0) {
    dir.normalize()
    player.position.x += dir.x * speed * dt
    player.position.z += dir.z * speed * dt
    player.rotation.y = Math.atan2(dir.x, dir.z)
    isWalking = true
    walkCycle += dt * 10
  } else {
    isWalking = false
  }

  walkCycle %= Math.PI * 200
  walkBlend = damp(walkBlend, isWalking ? 1 : 0, dt)
  animateWalk(dt, clock.elapsedTime)

  resolveDecorationCollisions()

  const dist = Math.sqrt(player.position.x ** 2 + player.position.z ** 2)
  if (dist > ISLAND_RADIUS - 1) {
    const angle = Math.atan2(player.position.z, player.position.x)
    player.position.x = Math.cos(angle) * (ISLAND_RADIUS - 1)
    player.position.z = Math.sin(angle) * (ISLAND_RADIUS - 1)
  }

  if (isInvincible) {
    invincibleTimer -= dt
    player.visible = Math.floor(invincibleTimer * 10) % 2 === 0
    if (invincibleTimer <= 0) {
      isInvincible = false
      player.visible = true
    }
  }

  if (speedBoostTimer > 0) speedBoostTimer -= dt
  if (magnetTimer > 0) magnetTimer -= dt
  if (comboTimer > 0) {
    comboTimer -= dt
    if (comboTimer <= 0) combo = 0
  }
}

function animateWalk(dt, time) {
  const anim = player.userData.anim
  if (!anim) {
    const baseY = player.userData?.groundY ?? 0
    player.position.y = baseY + Math.abs(Math.sin(walkCycle)) * 0.08 * walkBlend
    player.rotation.z = Math.sin(walkCycle) * 0.06 * walkBlend
    return
  }

  const wc = walkCycle
  const wb = walkBlend
  const PI = Math.PI

  if (anim.type === 'gltf-mixer') {
    anim.mixer.update(dt)
    anim.walkAction.setEffectiveWeight(wb)
    if (anim.idleAction) anim.idleAction.setEffectiveWeight(1 - wb)
    return
  }

  if (anim.type === 'gltf-procedural') {
    if (anim.leftHip) anim.leftHip.rotation.x = Math.sin(wc) * 0.5 * wb
    if (anim.rightHip) anim.rightHip.rotation.x = Math.sin(wc + PI) * 0.5 * wb
    if (anim.leftShoulder) anim.leftShoulder.rotation.x = -Math.sin(wc) * 0.4 * wb
    if (anim.rightShoulder) anim.rightShoulder.rotation.x = -Math.sin(wc + PI) * 0.4 * wb
    if (anim.hips) anim.hips.rotation.z = Math.sin(wc) * 0.05 * wb
    const baseY = player.userData.groundY ?? 0
    player.position.y = baseY + Math.abs(Math.sin(wc * 2)) * 0.08 * wb
    return
  }

  if (anim.type === 'gltf-basic') {
    const baseY = player.userData.groundY ?? 0
    player.position.y = baseY + Math.abs(Math.sin(wc * 2)) * 0.08 * wb
    return
  }

  if (anim.type === 'fallback') {
    const a = anim
    const breathe = (1 - wb)
    a.leftHip.rotation.x = Math.sin(wc) * 0.5 * wb
    a.rightHip.rotation.x = Math.sin(wc + PI) * 0.5 * wb
    a.leftKnee.rotation.x = -Math.max(0, Math.sin(wc - 0.4)) * 0.5 * wb
    a.rightKnee.rotation.x = -Math.max(0, Math.sin(wc + PI - 0.4)) * 0.5 * wb
    a.leftShoulder.rotation.x = -Math.sin(wc) * 0.4 * wb
    a.rightShoulder.rotation.x = -Math.sin(wc + PI) * 0.4 * wb
    a.leftElbow.rotation.x = -Math.max(0, Math.sin(wc + PI + 0.3)) * 0.3 * wb
    a.rightElbow.rotation.x = -Math.max(0, Math.sin(wc + 0.3)) * 0.3 * wb
    a.hips.rotation.z = Math.sin(wc) * 0.05 * wb
    a.hips.position.y = 0.55 + Math.abs(Math.sin(wc * 2)) * 0.08 * wb
    a.chest.rotation.y = -Math.sin(wc) * 0.04 * wb
    a.chest.position.y = 0.4 + Math.sin(time * 2) * 0.01 * breathe
    a.headPivot.rotation.x = Math.sin(wc * 2) * 0.03 * wb
  }
}

function updateGems(dt, time) {
  const cfg = LEVELS[currentLevel]
  gems.forEach(gem => {
    if (gem.userData.collected) return
    gem.rotation.y += dt * 2
    gem.position.y = gem.userData.baseY + Math.sin(time * 3) * 0.15

    let collectDist = COLLECT_DIST
    if (magnetTimer > 0) {
      const dx = player.position.x - gem.position.x
      const dz = player.position.z - gem.position.z
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < MAGNET_RANGE && d > 0) {
        const pull = dt * 6
        gem.position.x += (dx / d) * pull
        gem.position.z += (dz / d) * pull
      }
      collectDist = COLLECT_DIST * 1.5
    }

    const dx = player.position.x - gem.position.x
    const dz = player.position.z - gem.position.z
    if (Math.sqrt(dx * dx + dz * dz) < collectDist) {
      gem.userData.collected = true
      gem.visible = false
      collected++

      const multiplier = gem.userData.isGolden ? 3 : 1
      const comboMult = 1 + combo * 0.5
      const baseScore = Math.round(cfg.gemBonus * multiplier * comboMult)
      score += baseScore
      levelGemScore += cfg.gemBonus * multiplier
      levelComboScore += baseScore - cfg.gemBonus * multiplier

      combo++
      comboTimer = COMBO_WINDOW

      timeRemaining = Math.min(timeRemaining + 3, cfg.timeLimit + 15)

      showFloatScore(baseScore, false)
      updateHUD()

      if (collected >= cfg.gems) {
        completeLevel()
      }
    }
  })
}

function updateEnemies(dt, time) {
  enemies.forEach(enemy => {
    if (enemy.userData.type === 'crab') {
      const wp = enemy.userData.waypoints[enemy.userData.waypointIndex]
      const dx = wp.x - enemy.position.x
      const dz = wp.z - enemy.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 0.3) {
        enemy.userData.waypointIndex = (enemy.userData.waypointIndex + 1) % 2
      } else {
        const s = enemy.userData.speed * dt
        enemy.position.x += (dx / dist) * s
        enemy.position.z += (dz / dist) * s
        enemy.rotation.y = Math.atan2(dx, dz)
      }
      enemy.position.y = Math.sin(time * 4) * 0.03
    }

    if (enemy.userData.type === 'shadow') {
      const dx = player.position.x - enemy.position.x
      const dz = player.position.z - enemy.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < 8) enemy.userData.chasing = true
      if (dist > 12) enemy.userData.chasing = false

      if (enemy.userData.chasing && dist > 0.5) {
        const s = enemy.userData.speed * dt
        enemy.position.x += (dx / dist) * s
        enemy.position.z += (dz / dist) * s
      }
      enemy.position.y = 0.2 + Math.sin(time * 2 + enemy.position.x) * 0.15
      enemy.children[0].material.opacity = 0.5 + Math.sin(time * 3) * 0.2
    }

    if (!isInvincible) {
      const dx = player.position.x - enemy.position.x
      const dz = player.position.z - enemy.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const minDist = PLAYER_RADIUS + (enemy.userData.collisionRadius || 0.6)
      if (dist < minDist) {
        if (hasShield) {
          hasShield = false
          isInvincible = true
          invincibleTimer = INVINCIBLE_DURATION
          showFloatScore('Shield!', false)
        } else {
          health--
          score = Math.max(0, score - 50)
          showFloatScore(-50, true)
          isInvincible = true
          invincibleTimer = INVINCIBLE_DURATION
          combo = 0
          comboTimer = 0
          updateHUD()
          if (health <= 0) {
            gameOver()
          }
        }
      }
    }
  })
}

function updatePowerUps(dt, time) {
  powerUps.forEach(pu => {
    if (pu.userData.collected) return
    pu.rotation.y += dt * 3
    pu.position.y = pu.userData.baseY + Math.sin(time * 2.5) * 0.15

    const dx = player.position.x - pu.position.x
    const dz = player.position.z - pu.position.z
    if (Math.sqrt(dx * dx + dz * dz) < COLLECT_DIST) {
      pu.userData.collected = true
      pu.visible = false
      if (pu.userData.type === 'speed') {
        speedBoostTimer = 5
        showFloatScore('Speed!', false)
      } else if (pu.userData.type === 'shield') {
        hasShield = true
        showFloatScore('Shield!', false)
      } else if (pu.userData.type === 'magnet') {
        magnetTimer = 5
        showFloatScore('Magnet!', false)
      }
    }
  })
}

function updateTimer(dt) {
  if (!started) return
  timeRemaining -= dt
  if (timeRemaining <= 0) {
    timeRemaining = 0
    gameOver()
  }
  updateHUD()
}

function updateCamera() {
  const cx = player.position.x + Math.sin(camAngle) * Math.cos(camPitch) * CAM_DIST
  const cy = player.position.y + Math.sin(camPitch) * CAM_DIST
  const cz = player.position.z + Math.cos(camAngle) * Math.cos(camPitch) * CAM_DIST
  camera.position.set(cx, cy, cz)
  camera.lookAt(player.position.x, 1, player.position.z)
}

function onResize() {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
}

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const time = clock.elapsedTime

  updatePlayer(dt)
  updateGems(dt, time)
  updateEnemies(dt, time)
  updatePowerUps(dt, time)
  updateTimer(dt)
  updateCamera()

  renderer.render(scene, camera)
}

init()
