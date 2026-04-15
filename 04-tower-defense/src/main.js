import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'
import { TOWER_TYPES, ENEMY_TYPES, WAVES, GAME_CONFIG, PATH_POINTS, DIFFICULTY_CONFIG, LEVEL_CONFIG, THEME_CONFIG, RANDOM_EVENTS } from './constants.js'
import { t, setLocale, getLocale, onLocaleChange } from './i18n/index.js'

// 游戏状态
let scene, camera, renderer, clock, controls
let raycaster, mouse
let groundPlane

// 多通道路径
let pathCurves = [] // 存储所有路径曲线
let pathMeshes = [] // 存储所有路径mesh
let pathDecorationPositions = [] // 路径装饰物的 XZ 坐标，用于敌人跳越障碍检测
let currentLevelConfig = null
let basePosition = { x: 0, z: 0 } // 基地位置

// 相机震动
let cameraShake = { intensity: 0, duration: 0 }
let cameraOriginalPosition = null

// 相机视角切换
let cameraTransition = null
let currentCameraView = 'default'

// 游戏对象数组
const towers = []
const enemies = []
const projectiles = []
const particles = []

// 游戏状态变量
let gold = GAME_CONFIG.startingGold
let baseHp = GAME_CONFIG.baseHp
let currentWave = 0
let waveActive = false
let enemiesToSpawn = []
let spawnTimer = 0
let gameActive = false
let currentDifficulty = 'normal'

// 玩家选择
let selectedTowerType = null
let selectedTower = null

// 塔放置预览
let previewMesh = null
let previewType = null

// 技能卡状态
let skillCardActive = false
let selectedSkillCard = null

// 引导状态
let tutorialStep = 0
let tutorialOverlay = null

// 模型模板
const modelTemplates = {}

// 配置 GLTFLoader 支持 Draco 压缩
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

// UI元素 - 延迟初始化
let ui = {}

function initUI() {
  ui = {
    hud: document.getElementById('hud'),
    gold: document.getElementById('gold-display'),
    baseHp: document.getElementById('base-hp'),
    waveInfo: document.getElementById('wave-info'),
    waveName: document.getElementById('wave-name'),
    enemiesRemaining: document.getElementById('enemies-remaining'),
    startWaveBtn: document.getElementById('start-wave-btn'),
    towerPanel: document.getElementById('tower-panel'),
    towerCards: document.querySelectorAll('.tower-card'),
    towerInfoPanel: document.getElementById('tower-info-panel'),
    selectedTowerDetails: document.getElementById('selected-tower-details'),
    sellTowerBtn: document.getElementById('sell-tower-btn'),
    upgradeTowerBtn: document.getElementById('upgrade-tower-btn'),
    closeInfoBtn: document.getElementById('close-info-btn'),
    waveTitle: document.getElementById('wave-title'),
    waveTitleText: document.getElementById('wave-title-text'),
    waveSubtitle: document.getElementById('wave-subtitle'),
    victory: document.getElementById('victory'),
    victoryScore: document.getElementById('victory-score'),
    gameOver: document.getElementById('game-over'),
    gameOverScore: document.getElementById('game-over-score'),
    startScreen: document.getElementById('start-screen'),
    difficultyScreen: document.getElementById('difficulty-screen'),
    difficultyCards: document.querySelectorAll('.difficulty-card'),
    difficultyStartBtn: document.getElementById('difficulty-start-btn'),
    tutorialOverlay: document.getElementById('tutorial-overlay'),
    tutorialStepText: document.getElementById('tutorial-step-text'),
    tutorialHint: document.getElementById('tutorial-hint'),
    tutorialNextBtn: document.getElementById('tutorial-next-btn'),
    tutorialSkipBtn: document.getElementById('tutorial-skip-btn'),
    skillCardPanel: document.getElementById('skill-card-panel'),
    skillCardList: document.getElementById('skill-card-list'),
    skillCardSkipBtn: document.getElementById('skill-card-skip-btn'),
    waveCompleteModal: document.getElementById('wave-complete-modal'),
    modalWaveName: document.getElementById('modal-wave-name'),
    modalHp: document.getElementById('modal-hp'),
    modalGold: document.getElementById('modal-gold'),
    modalNextWave: document.getElementById('modal-next-wave'),
    modalContinueBtn: document.getElementById('modal-continue-btn'),
    modalMenuBtn: document.getElementById('modal-menu-btn'),
    floatContainer: document.getElementById('float-text-container')
  }
}

// 初始化
function init() {
  // 初始化UI元素 - 必须在DOM准备好后
  initUI()
  
  clock = new THREE.Clock()
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1f0d)
  scene.fog = new THREE.Fog(0x0d1f0d, 30, 100)

  // 相机 - 俯视角
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(0, 20, 20)
  camera.lookAt(0, 0, 0)

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  document.body.prepend(renderer.domElement)

  // 相机控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.25    // 提高阻尼：0.05→0.25，松手后约 0.3s 停止
  controls.rotateSpeed = 0.6       // 降低旋转灵敏度，减少滑过头
  controls.zoomSpeed = 0.8         // 缩放稍微柔和
  controls.screenSpacePanning = false
  controls.minDistance = 5
  controls.maxDistance = 50
  controls.maxPolarAngle = Math.PI / 2.2
  controls.minPolarAngle = Math.PI / 6
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE, // 默认左键旋转，建造模式下动态切换为 null
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  }
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,   // 单指旋转
    TWO: THREE.TOUCH.DOLLY_PAN // 双指缩放/平移
  }
  controls.enabled = false // 游戏开始前禁用

  // 禁用右键菜单，确保右键拖拽旋转正常
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())

  // 光照 - 增强亮度
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  // 半球光补充照明
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x666666, 0.4)
  scene.add(hemiLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(10, 30, 10)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 100
  dirLight.shadow.camera.left = -30
  dirLight.shadow.camera.right = 30
  dirLight.shadow.camera.top = 30
  dirLight.shadow.camera.bottom = -30
  scene.add(dirLight)

  // 初始关卡配置（用于开始界面预览）
  loadLevelPreview(1)

  // 事件监听
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerdown', onPointerDown)

  // 键盘视角切换快捷键
  window.addEventListener('keydown', (e) => {
    // 避免在输入框中触发
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    if (!gameActive) return
    if (e.key === '1') switchCameraView('top')
    else if (e.key === '2') switchCameraView('default')
    else if (e.key === '3') switchCameraView('low')
    else if (e.key === 'v' || e.key === 'V') {
      const views = ['top', 'default', 'low']
      const idx = views.indexOf(currentCameraView)
      switchCameraView(views[(idx + 1) % views.length])
    }
    // ESC 取消建造模式，恢复左键旋转
    else if (e.key === 'Escape') {
      if (selectedTowerType) {
        selectedTowerType = null
        clearTowerPreview()
        ui.towerCards.forEach(card => card.classList.remove('selected'))
        updateControlsMode()
      }
    }
  })

  // 初始化语言切换
  initLanguageSwitch()

  // UI事件
  ui.startBtn = document.getElementById('start-btn')
  ui.startBtn?.addEventListener('click', showDifficultyScreen)
  ui.startWaveBtn?.addEventListener('click', showSkillCardSelection)
  ui.sellTowerBtn?.addEventListener('click', sellSelectedTower)
  ui.upgradeTowerBtn?.addEventListener('click', upgradeSelectedTower)
  ui.closeInfoBtn?.addEventListener('click', closeTowerInfo)
  document.getElementById('victory-restart')?.addEventListener('click', restartGame)
  document.getElementById('game-over-retry')?.addEventListener('click', restartGame)
  document.getElementById('game-over-restart')?.addEventListener('click', backToMenu)

  // 难度选择事件
  ui.difficultyCards.forEach(card => {
    card.addEventListener('click', () => selectDifficulty(card.dataset.difficulty))
  })
  ui.difficultyStartBtn?.addEventListener('click', startGameWithDifficulty)

  // 引导事件
  ui.tutorialNextBtn?.addEventListener('click', nextTutorialStep)
  ui.tutorialSkipBtn?.addEventListener('click', skipTutorial)

  // 技能卡事件
  ui.skillCardSkipBtn?.addEventListener('click', () => {
    ui.skillCardPanel.classList.add('hidden')
    startNextWave()
  })

  // 波次完成弹窗事件
  ui.modalContinueBtn?.addEventListener('click', () => {
    ui.waveCompleteModal.classList.add('hidden')
    showSkillCardSelection()
  })
  ui.modalMenuBtn?.addEventListener('click', () => {
    ui.waveCompleteModal.classList.add('hidden')
    backToMenu()
  })

  // 塔选择卡片
  ui.towerCards.forEach(card => {
    card.addEventListener('click', () => selectTowerType(card.dataset.type))
  })

  // 加载模型
  loadModels()

  // 开始动画循环
  animate()
}

// 初始化语言切换
function initLanguageSwitch() {
  const langBtns = document.querySelectorAll('.lang-btn')
  const currentLang = getLocale()
  
  // 设置当前语言按钮状态
  langBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang)
    btn.addEventListener('click', () => {
      setLocale(btn.dataset.lang)
      langBtns.forEach(b => b.classList.toggle('active', b === btn))
    })
  })
  
  // 监听语言变化，更新UI
  onLocaleChange(() => {
    updateAllUIText()
  })
  
  // 初始化UI文本
  updateAllUIText()
}

// 更新所有UI文本
function updateAllUIText() {
  // 更新带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n
    el.textContent = t(key)
  })
  
  // 更新塔选择面板中的塔信息
  updateTowerPanelText()
  
  // 更新游戏中的动态文本
  if (gameActive) {
    updateUI()
  }
}

// 更新塔选择面板文本
function updateTowerPanelText() {
  const towerCards = document.querySelectorAll('.tower-card')
  towerCards.forEach(card => {
    const type = card.dataset.type
    const nameEl = card.querySelector('.tower-name')
    const descEl = card.querySelector('.tower-desc')
    if (nameEl) nameEl.textContent = t(`towers.${type}.name`)
    if (descEl) descEl.textContent = t(`towers.${type}.desc`)
  })
}

// 加载关卡配置（动态创建地图）
function loadLevelPreview(levelNum) {
  const config = LEVEL_CONFIG[levelNum - 1] || LEVEL_CONFIG[0]
  loadLevelConfig(config)
}

function loadLevelConfig(config) {
  // 清除旧的场景元素
  clearLevelElements()

  currentLevelConfig = config
  const theme = THEME_CONFIG[config.theme]
  const mapSize = config.mapSize

  // 更新场景主题
  scene.background = new THREE.Color(theme.fogColor)
  scene.fog = new THREE.Fog(theme.fogColor, mapSize * 1.5, mapSize * 4)

  // 创建地面
  createGround(mapSize, theme)

  // 先计算神殿位置（所有路径终点的质心），确保路径能延伸到城堡
  {
    let sumX = 0, sumZ = 0
    config.paths.forEach(path => {
      const last = path.points[path.points.length - 1]
      sumX += last.x
      sumZ += last.z
    })
    basePosition = {
      x: sumX / config.paths.length,
      z: sumZ / config.paths.length
    }
  }

  // 创建路径（将 basePosition 传入，路径末端延伸至城堡）
  createPaths(config.paths, theme, basePosition)

  // 创建神殿
  createTemple(basePosition)

  // 装饰（根据主题）
  createDecorations(config.theme, mapSize)

  // 更新相机范围
  updateCameraForMapSize(mapSize)
}

// 清除所有游戏对象（restartGame用）
function clearAllGameObjects() {
  towers.forEach(t => scene.remove(t.mesh))
  towers.length = 0

  enemies.forEach(e => scene.remove(e.mesh))
  enemies.length = 0

  projectiles.forEach(p => scene.remove(p.mesh))
  projectiles.length = 0

  particles.forEach(p => scene.remove(p.mesh))
  particles.length = 0

  clearTowerPreview()
}

// 清除关卡元素（换关卡用，保留塔和金币）
function clearLevelElements() {
  // 清除地面
  if (groundPlane) {
    scene.remove(groundPlane)
    groundPlane = null
  }

  // 清除网格
  scene.children
    .filter(child => child.name === 'gridHelper')
    .forEach(child => scene.remove(child))

  // 清除路径
  pathMeshes.forEach(mesh => scene.remove(mesh))
  pathMeshes = []
  pathCurves = []
  pathDecorationPositions = []

  // 清除出生点标记
  scene.children
    .filter(child => child.userData.type === 'spawnMarker')
    .forEach(child => scene.remove(child))

  // 清除装饰
  scene.children
    .filter(child => child.userData.type === 'tree' || child.userData.type === 'rock')
    .forEach(child => scene.remove(child))

  // 清除神殿
  scene.children
    .filter(child => child.userData.type === 'temple')
    .forEach(child => scene.remove(child))

  // 清除敌人（换关卡时清，但不清塔）
  enemies.forEach(e => {
    if (e.healthBarGroup) scene.remove(e.healthBarGroup)
    scene.remove(e.mesh)
  })
  enemies.length = 0

  // 清除投射物
  projectiles.forEach(p => scene.remove(p.mesh))
  projectiles.length = 0

  // 清除粒子
  particles.forEach(p => scene.remove(p.mesh))
  particles.length = 0
}

// 创建地面
function createGround(mapSize, theme) {
  // 使用有厚度的 BoxGeometry 替代无厚度的 PlaneGeometry，
  // 防止低角度观察时模型底部穿透地面
  const GROUND_THICKNESS = 2.0
  const geometry = new THREE.BoxGeometry(mapSize, GROUND_THICKNESS, mapSize)
  const material = new THREE.MeshStandardMaterial({
    color: theme.groundColor,
    roughness: 0.85,
    metalness: 0.05,
  })
  groundPlane = new THREE.Mesh(geometry, material)
  groundPlane.position.y = -GROUND_THICKNESS / 2  // 顶面齐平 y=0
  groundPlane.receiveShadow = true
  scene.add(groundPlane)

  // 网格辅助线 — 淡化为视觉参考线，不喧宾夺主
  const gridDivisions = Math.floor(mapSize / 2)
  const gridHelper = new THREE.GridHelper(mapSize, gridDivisions, 0x000000, 0x000000)
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.12
  gridHelper.position.y = 0.01
  gridHelper.name = 'gridHelper'
  scene.add(gridHelper)
}

// 创建多条路径
function createPaths(pathConfigs, theme, targetPos = null) {
  pathCurves = []
  pathMeshes = []

  pathConfigs.forEach((pathConfig, index) => {
    // 创建曲线路径，若有 targetPos 则延伸末端到城堡位置
    const rawPoints = pathConfig.points.map(p => new THREE.Vector3(p.x, 0, p.z))

    // 若 targetPos 存在且末端不等于 targetPos，则追加城堡位置作为最终控制点
    if (targetPos) {
      const lastRaw = rawPoints[rawPoints.length - 1]
      const tgt = new THREE.Vector3(targetPos.x, 0, targetPos.z)
      if (lastRaw.distanceTo(tgt) > 0.5) {
        rawPoints.push(tgt)
      }
    }

    const curve = new THREE.CatmullRomCurve3(rawPoints)
    curve.curveType = 'catmullrom'
    curve.tension = 0.5
    pathCurves.push({ id: pathConfig.id, curve })

    // 创建平面路径 - 使用曲线上采样点
    const pathWidth = GAME_CONFIG.pathWidth
    const segments = 100
    const curvePoints = curve.getSpacedPoints(segments)

    // 创建路径形状顶点
    const vertices = []
    const uvs = []
    const indices = []

    for (let i = 0; i < curvePoints.length; i++) {
      const point = curvePoints[i]
      const tangent = curve.getTangentAt(i / segments)

      // 计算垂直于切线的方向
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()

      // 左右边界点
      const leftPoint = point.clone().add(normal.clone().multiplyScalar(pathWidth / 2))
      const rightPoint = point.clone().sub(normal.clone().multiplyScalar(pathWidth / 2))

      vertices.push(leftPoint.x, 0.02, leftPoint.z)
      vertices.push(rightPoint.x, 0.02, rightPoint.z)

      uvs.push(0, i / segments)
      uvs.push(1, i / segments)
    }

    // 创建索引
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const a = i * 2
      const b = i * 2 + 1
      const c = i * 2 + 2
      const d = i * 2 + 3

      indices.push(a, b, c)
      indices.push(b, d, c)
    }

    // 创建几何体
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    // 路径材质
    const pathMaterial = new THREE.MeshBasicMaterial({
      color: 0xEEBB88,
      side: THREE.DoubleSide
    })
    const pathMesh = new THREE.Mesh(geometry, pathMaterial)
    pathMesh.receiveShadow = true
    scene.add(pathMesh)
    pathMeshes.push(pathMesh)

    // 添加路径边框线
    const edgesGeometry = new THREE.EdgesGeometry(geometry)
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xAAAAAA, linewidth: 1 })
    const edgesMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial)
    scene.add(edgesMesh)
    pathMeshes.push(edgesMesh)

    // 路径起点 - 大型闪烁绿色光圈
    const startMarker = createSpawnMarker(rawPoints[0], 0x00FF00, 'spawnMarker')
    scene.add(startMarker)

    // 路径终点不再放红色标记（城堡本身即终点，避免视觉重复）

    // 沿曲线放置路径 3D 装饰模型
    placePath3DModels(curve, pathMeshes)
  })
}

// 沿路径曲线放置 3D 路径模型
function placePath3DModels(curve, pathMeshList) {
  const straightTemplate = modelTemplates['path-straight']
  const cornerTemplate = modelTemplates['path-corner']

  // 如果两者都是空 Group（fallback），则跳过不放置
  const hasStraight = straightTemplate && straightTemplate.children.length > 0
  const hasCorner = cornerTemplate && cornerTemplate.children.length > 0
  if (!hasStraight && !hasCorner) return

  const pathLength = curve.getLength()
  const spacing = GAME_CONFIG.pathWidth * 1.1 // 间距略大于路径宽，避免重叠
  const count = Math.floor(pathLength / spacing)

  for (let i = 0; i <= count; i++) {
    const t = i / count

    // 跳过路径末端 15%：该区域是城堡位置，避免石块堆叠在城堡脚下形成"底座"
    if (t > 0.85) continue
    const pos = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t)

    // 检测当前位置是否为急弯：比较前后切线角度差
    const tPrev = Math.max(0, t - 0.04)
    const tNext = Math.min(1, t + 0.04)
    const tPrevVec = curve.getTangentAt(tPrev)
    const tNextVec = curve.getTangentAt(tNext)
    const dot = Math.max(-1, Math.min(1, tPrevVec.dot(tNextVec)))
    const angleDiff = Math.acos(dot) // 弧度

    const isCorner = angleDiff > 0.25 // ~14°以上视为弯道

    // 选择对应模型模板
    let template = null
    if (isCorner && hasCorner) {
      template = cornerTemplate
    } else if (!isCorner && hasStraight) {
      template = straightTemplate
    } else if (hasStraight) {
      template = straightTemplate
    } else if (hasCorner) {
      template = cornerTemplate
    }
    if (!template) continue

    const pathModel = template.clone()
    pathModel.position.set(pos.x, 0.02, pos.z)

    // 按切线方向旋转模型，使其与路径走向对齐
    const angle = Math.atan2(tangent.x, tangent.z)
    pathModel.rotation.y = angle

    // 缩放到路径宽度
    const scale = GAME_CONFIG.pathWidth * 0.7
    pathModel.scale.setScalar(scale)

    pathModel.traverse(child => {
      if (child.isMesh) {
        child.receiveShadow = true
        child.castShadow = true
      }
    })
    pathModel.userData.type = 'pathDecoration'
    pathDecorationPositions.push({ x: pos.x, z: pos.z }) // 记录位置用于跳越检测
    scene.add(pathModel)
    pathMeshList.push(pathModel)
  }
}

// 创建出生点标记（动态光圈）
function createSpawnMarker(position, color, type) {
  const group = new THREE.Group()
  group.userData.type = type

  // 出生点使用 portal 模型
  if (type === 'spawnMarker' && modelTemplates['portal']) {
    const mesh = modelTemplates['portal'].clone()
    mesh.scale.setScalar(1.2)
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
      }
    })
    group.add(mesh)
  } else {
    // Fallback 或终点标记: 程序化几何体
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.05, 32),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      })
    )
    disk.position.y = 0.03
    group.add(disk)

    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshBasicMaterial({ color: color })
    )
    center.position.y = 0.3
    group.add(center)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.08, 8, 32),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6 })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.1
    ring.userData.isAnimated = true
    ring.userData.startTime = Date.now()
    group.add(ring)
  }

  group.position.copy(position)
  group.position.y = 0

  return group
}

// 更新标记动画
function updateSpawnMarkers() {
  scene.children.forEach(child => {
    if (child.userData.type === 'spawnMarker' || child.userData.type === 'endMarker') {
      child.children.forEach(subChild => {
        if (subChild.userData.isAnimated) {
          const elapsed = (Date.now() - subChild.userData.startTime) / 1000
          const scale = 1 + Math.sin(elapsed * 3) * 0.2
          subChild.scale.set(scale, scale, scale)
          subChild.material.opacity = 0.4 + Math.sin(elapsed * 3) * 0.3
        }
      })
      // 让标记始终面向相机
      child.rotation.y += 0.01
    }
  })
}

// 创建神殿
function createTemple(basePos) {
  const templeGroup = new THREE.Group()
  templeGroup.userData = { type: 'temple' }

  if (modelTemplates['temple']) {
    const mesh = modelTemplates['temple'].clone()
    mesh.scale.setScalar(1.5)
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    templeGroup.add(mesh)
  } else {
    // Fallback: 程序化几何体
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.8, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x808080 })
    )
    base.position.y = 0.25
    base.castShadow = true
    templeGroup.add(base)

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.2, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0x332200 })
    )
    body.position.y = 1.5
    body.castShadow = true
    templeGroup.add(body)

    const top = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 1, 6),
      new THREE.MeshStandardMaterial({ color: 0xFF6347 })
    )
    top.position.y = 3
    top.castShadow = true
    templeGroup.add(top)

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    )
    core.position.y = 1.5
    templeGroup.add(core)
  }

  // 点光源
  const light = new THREE.PointLight(0x00ffff, 1, 5)
  light.position.y = 1.5
  templeGroup.add(light)

  templeGroup.position.set(basePos.x, 1.0, basePos.z)
  scene.add(templeGroup)
}

// 创建装饰
function createDecorations(theme, mapSize) {
  const positions = []
  const halfSize = mapSize / 2 - 2

  // 生成随机位置（增加密度至 25 个点）
  for (let i = 0; i < 25; i++) {
    positions.push({
      x: (Math.random() - 0.5) * halfSize * 2,
      z: (Math.random() - 0.5) * halfSize * 2
    })
  }

  positions.forEach(pos => {
    if (isTooCloseToAnyPath(pos)) return
    if (Math.abs(pos.x) < 2 && pos.z > 0) return // 基地附近不放装饰（从3缩小到2）

    if (theme === 'forest') {
      createTree(pos.x, pos.z)
    } else if (theme === 'cave') {
      createRock(pos.x, pos.z)
    } else {
      createLavaRock(pos.x, pos.z)
    }
  })
}

// 检查是否太靠近任何路径
function isTooCloseToAnyPath(pos) {
  const point = new THREE.Vector3(pos.x, 0, pos.z)
  for (const pathData of pathCurves) {
    const pathPoints = pathData.curve.getSpacedPoints(50)
    for (const pathPoint of pathPoints) {
      if (point.distanceTo(pathPoint) < GAME_CONFIG.pathWidth + 1) {
        return true
      }
    }
  }
  return false
}

// 检查是否太靠近路径（兼容旧代码）
function isTooCloseToPath(pos) {
  return isTooCloseToAnyPath(pos)
}

// 更新相机以适应地图大小
function updateCameraForMapSize(mapSize) {
  const distance = mapSize * 1.2
  camera.position.set(0, distance, distance)
  camera.lookAt(0, 0, 0)

  // 重置视角状态
  currentCameraView = 'default'
  cameraTransition = null
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === 'default')
  })

  // 更新阴影范围
  const dirLight = scene.children.find(child => child.isDirectionalLight)
  if (dirLight) {
    dirLight.shadow.camera.left = -mapSize / 2
    dirLight.shadow.camera.right = mapSize / 2
    dirLight.shadow.camera.top = mapSize / 2
    dirLight.shadow.camera.bottom = -mapSize / 2
    dirLight.shadow.camera.far = mapSize * 2
  }
}

// 创建树木
function createTree(x, z) {
  const treeGroup = new THREE.Group()
  treeGroup.userData.type = 'tree'

  if (modelTemplates['tree-pine']) {
    const mesh = modelTemplates['tree-pine'].clone()
    mesh.position.y = 0.1 // 微抬，防止底座嵌入地面
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    treeGroup.add(mesh)
  } else {
    // Fallback: 程序化几何体
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    )
    trunk.position.y = 0.75
    trunk.castShadow = true
    treeGroup.add(trunk)

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 2.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x228B22 })
    )
    leaves.position.y = 2.5
    leaves.castShadow = true
    treeGroup.add(leaves)
  }

  treeGroup.position.set(x, 0, z)
  treeGroup.rotation.y = Math.random() * Math.PI * 2
  const scale = 0.8 + Math.random() * 0.4
  treeGroup.scale.set(scale, scale, scale)
  scene.add(treeGroup)
}

// 创建岩石（山洞主题）
function createRock(x, z) {
  const rockGroup = new THREE.Group()
  rockGroup.userData.type = 'rock'

  if (modelTemplates['rock-cave']) {
    const mesh = modelTemplates['rock-cave'].clone()
    mesh.position.y = 0.1
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    rockGroup.add(mesh)
  } else {
    // Fallback: 程序化几何体
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5, 0),
      new THREE.MeshStandardMaterial({ color: 0x5a5a6a })
    )
    rock.position.y = 0.3
    rock.castShadow = true
    rockGroup.add(rock)
  }

  rockGroup.position.set(x, 0, z)
  const scale = 0.5 + Math.random() * 0.5
  rockGroup.scale.set(scale, scale, scale)
  scene.add(rockGroup)
}

// 创建熔岩岩石（火山主题）
function createLavaRock(x, z) {
  const rockGroup = new THREE.Group()
  rockGroup.userData.type = 'rock'

  if (modelTemplates['rock-lava']) {
    const mesh = modelTemplates['rock-lava'].clone()
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    rockGroup.add(mesh)
  } else {
    // Fallback: 程序化几何体
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.6, 0),
      new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    )
    rock.position.y = 0.4
    rock.castShadow = true
    rockGroup.add(rock)

    // 熔岩发光效果
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4500 })
    )
    glow.position.y = 0.5
    rockGroup.add(glow)
  }

  rockGroup.position.set(x, 0, z)
  const scale = 0.6 + Math.random() * 0.4
  rockGroup.scale.set(scale, scale, scale)
  scene.add(rockGroup)
}

// 加载模型
function loadModels() {
  // 这里加载Meshy生成的模型
  // 如果模型不存在，会使用程序化几何体作为fallback

  const modelsToLoad = [
    // 塔模型
    { name: 'tower-arrow', path: './models/tower-arrow.glb', fallback: createArrowTowerFallback },
    { name: 'tower-magic', path: './models/tower-magic.glb', fallback: createMagicTowerFallback },
    { name: 'tower-cannon', path: './models/tower-cannon.glb', fallback: createCannonTowerFallback },
    { name: 'tower-ice', path: './models/tower-ice.glb', fallback: createIceTowerFallback },
    // 敌人模型
    { name: 'enemy-goblin', path: './models/enemy-goblin.glb', fallback: createGoblinFallback },
    { name: 'enemy-orc', path: './models/enemy-orc.glb', fallback: createOrcFallback },
    { name: 'enemy-troll', path: './models/enemy-troll.glb', fallback: createTrollFallback },
    { name: 'enemy-boss', path: './models/enemy-boss.glb', fallback: createBossFallback },
    { name: 'enemy-bat', path: './models/enemy-bat.glb', fallback: createBatFallback },
    { name: 'enemy-golem', path: './models/enemy-golem.glb', fallback: createGolemFallback },
    // 建筑与特效
    { name: 'temple', path: './models/temple.glb', fallback: createTempleFallback },
    { name: 'portal', path: './models/portal.glb', fallback: createPortalFallback },
    // 森林装饰
    { name: 'tree-pine', path: './models/tree-pine.glb', fallback: createTreeModelFallback },
    { name: 'rock-forest', path: './models/rock-forest.glb', fallback: createRockModelFallback },
    // 洞穴装饰
    { name: 'stalagmite', path: './models/stalagmite.glb', fallback: createStalagmiteFallback },
    { name: 'rock-cave', path: './models/rock-cave.glb', fallback: createRockModelFallback },
    { name: 'mushroom-cave', path: './models/mushroom-cave.glb', fallback: createMushroomFallback },
    // 火山装饰
    { name: 'rock-lava', path: './models/rock-lava.glb', fallback: createLavaRockFallback },
    { name: 'volcano-small', path: './models/volcano-small.glb', fallback: createVolcanoFallback },
    // 路径装饰模型
    { name: 'path-straight', path: './models/path-straight.glb', fallback: createPathStraightFallback },
    { name: 'path-corner', path: './models/path-corner.glb', fallback: createPathCornerFallback }
  ]

  // 跟踪加载进度，全部完成后重新渲染关卡预览（使用真实 GLB 模型）
  let loadedCount = 0
  const total = modelsToLoad.length

  function onModelReady() {
    loadedCount++
    if (loadedCount === total) {
      // 所有模型加载完毕，重新渲染第一关预览（替换掉 fallback 版本）
      console.log('All models loaded, refreshing level preview...')
      loadLevelPreview(1)
    }
  }

  modelsToLoad.forEach(({ name, path, fallback }) => {
    gltfLoader.load(
      path,
      (gltf) => {
        const model = gltf.scene

        // ── 归一化模型尺寸（仅基于 Mesh 几何体，排除骨骼/Armature）────────
        // Box3.setFromObject(model) 会把 Bone/Armature 节点也纳入计算，
        // 导致有骨骼动画的角色模型 BoundingBox 虚大（如 goblin 的 Armature
        // 延伸数百单位），归一化后缩到肉眼不可见。
        // 改为：只遍历 isMesh 子节点计算可见几何体的实际范围。
        model.updateMatrixWorld(true)
        const box = new THREE.Box3()
        let hasMesh = false
        model.traverse(child => {
          if (child.isMesh) {
            const meshBox = new THREE.Box3().setFromObject(child)
            if (!meshBox.isEmpty()) {
              box.union(meshBox)
              hasMesh = true
            }
          }
        })
        if (hasMesh) {
          const size = new THREE.Vector3()
          box.getSize(size)
          const maxDim = Math.max(size.x, size.y, size.z)
          if (maxDim > 0) {
            model.scale.multiplyScalar(1 / maxDim)
          }
          console.log(`Loaded model: ${name} (mesh maxDim=${maxDim.toFixed(3)})`)
        } else {
          console.log(`Loaded model: ${name} (no mesh found, skip normalize)`)
        }
        // ───────────────────────────────────────────────────────────────────

        modelTemplates[name] = model
        onModelReady()
      },
      undefined,
      () => {
        console.log(`Using fallback for: ${name}`)
        modelTemplates[name] = fallback()
        onModelReady()
      }
    )
  })
}

// Fallback几何体创建函数
function createArrowTowerFallback() {
  const group = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 1, 6),
    new THREE.MeshStandardMaterial({ color: TOWER_TYPES.arrow.color })
  )
  base.position.y = 0.5
  base.castShadow = true
  group.add(base)
  return group
}

function createMagicTowerFallback() {
  const group = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 1.5, 6),
    new THREE.MeshStandardMaterial({ color: TOWER_TYPES.magic.color })
  )
  base.position.y = 0.75
  base.castShadow = true
  group.add(base)
  return group
}

function createCannonTowerFallback() {
  const group = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1, 0.8),
    new THREE.MeshStandardMaterial({ color: TOWER_TYPES.cannon.color })
  )
  base.position.y = 0.5
  base.castShadow = true
  group.add(base)
  return group
}

function createIceTowerFallback() {
  const group = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: TOWER_TYPES.ice.color })
  )
  base.position.y = 0.6
  base.castShadow = true
  group.add(base)
  return group
}

function createGoblinFallback() {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshStandardMaterial({ color: ENEMY_TYPES.goblin.color })
  )
  body.position.y = 0.3
  body.castShadow = true
  group.add(body)
  return group
}

function createOrcFallback() {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 8, 8),
    new THREE.MeshStandardMaterial({ color: ENEMY_TYPES.orc.color })
  )
  body.position.y = 0.4
  body.castShadow = true
  group.add(body)
  return group
}

function createTrollFallback() {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 8, 8),
    new THREE.MeshStandardMaterial({ color: ENEMY_TYPES.troll.color })
  )
  body.position.y = 0.6
  body.castShadow = true
  group.add(body)
  return group
}

function createBossFallback() {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 8, 8),
    new THREE.MeshStandardMaterial({ color: ENEMY_TYPES.boss.color })
  )
  body.position.y = 0.8
  body.castShadow = true
  group.add(body)
  return group
}

function createBatFallback() {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 6, 6),
    new THREE.MeshStandardMaterial({ color: ENEMY_TYPES.bat.color })
  )
  body.position.y = 0.25
  body.castShadow = true
  group.add(body)
  // 翅膀
  const wingGeo = new THREE.BoxGeometry(0.6, 0.05, 0.3)
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
  const leftWing = new THREE.Mesh(wingGeo, wingMat)
  leftWing.position.set(-0.3, 0.3, 0)
  group.add(leftWing)
  const rightWing = new THREE.Mesh(wingGeo, wingMat)
  rightWing.position.set(0.3, 0.3, 0)
  group.add(rightWing)
  return group
}

function createGolemFallback() {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1.2, 0.8),
    new THREE.MeshStandardMaterial({ color: ENEMY_TYPES.golem.color })
  )
  body.position.y = 0.6
  body.castShadow = true
  group.add(body)
  return group
}

// 神殿 Fallback
function createTempleFallback() {
  const templeGroup = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.8, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x808080 })
  )
  base.position.y = 0.25
  base.castShadow = true
  templeGroup.add(base)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.2, 2, 6),
    new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0x332200 })
  )
  body.position.y = 1.5
  body.castShadow = true
  templeGroup.add(body)
  return templeGroup
}

// 传送门 Fallback
function createPortalFallback() {
  const group = new THREE.Group()
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.1, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0x00FF00, emissive: 0x003300 })
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.8
  group.add(ring)
  return group
}

// 树木 Fallback
function createTreeModelFallback() {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  )
  trunk.position.y = 0.75
  trunk.castShadow = true
  group.add(trunk)
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 2.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x228B22 })
  )
  leaves.position.y = 2.5
  leaves.castShadow = true
  group.add(leaves)
  return group
}

// 岩石 Fallback
function createRockModelFallback() {
  const group = new THREE.Group()
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x5a5a6a })
  )
  rock.position.y = 0.3
  rock.castShadow = true
  group.add(rock)
  return group
}

// 钟乳石 Fallback
function createStalagmiteFallback() {
  const group = new THREE.Group()
  const stalagmite = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 1.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a6a7a })
  )
  stalagmite.position.y = 0.75
  stalagmite.castShadow = true
  group.add(stalagmite)
  return group
}

// 蘑菇 Fallback
function createMushroomFallback() {
  const group = new THREE.Group()
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc })
  )
  stem.position.y = 0.15
  group.add(stem)
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x9966ff, emissive: 0x330066 })
  )
  cap.position.y = 0.35
  cap.scale.y = 0.6
  group.add(cap)
  return group
}

// 熔岩岩石 Fallback
function createLavaRockFallback() {
  const group = new THREE.Group()
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  )
  rock.position.y = 0.4
  rock.castShadow = true
  group.add(rock)
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4500 })
  )
  glow.position.y = 0.5
  group.add(glow)
  return group
}

// 火山 Fallback
function createVolcanoFallback() {
  const group = new THREE.Group()
  const volcano = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3a3a })
  )
  volcano.position.y = 1
  volcano.castShadow = true
  group.add(volcano)
  return group
}

// 路径直线段 Fallback（返回空Group，不影响程序化路径渲染）
function createPathStraightFallback() {
  return new THREE.Group()
}

// 路径转角 Fallback（返回空Group）
function createPathCornerFallback() {
  return new THREE.Group()
}

// 显示难度选择界面
function showDifficultyScreen() {
  ui.startScreen.classList.add('hidden')
  ui.difficultyScreen.classList.remove('hidden')
}

// 选择难度
function selectDifficulty(difficulty) {
  currentDifficulty = difficulty
  ui.difficultyCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.difficulty === difficulty)
  })
}

// 根据难度开始游戏
function startGameWithDifficulty() {
  ui.difficultyScreen.classList.add('hidden')
  ui.hud.classList.remove('hidden')
  ui.towerPanel.classList.remove('hidden')

  gold = GAME_CONFIG.startingGold
  baseHp = GAME_CONFIG.baseHp
  currentWave = 0
  waveActive = false
  gameActive = true

  // 启用相机控制
  if (controls) controls.enabled = true

  // 绑定相机视角按钮（游戏开始时才有效）
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.onclick = () => switchCameraView(btn.dataset.view)
  })
  // 恢复默认视角
  currentCameraView = 'default'

  updateUI()
  showWaveTitle(t('waveTitles.forest'), t('waveTitles.forestDesc'))

  // 检查是否需要显示新手引导
  if (!localStorage.getItem('td_tutorial_done')) {
    startTutorial()
  }
}

// 开始游戏（兼容旧代码）
function startGame() {
  showDifficultyScreen()
}

// 新手引导
function startTutorial() {
  tutorialStep = 1
  showTutorialStep()
}

function showTutorialStep() {
  const steps = {
    1: { text: t('tutorial.step1'), hint: t('tutorial.step1Hint') },
    2: { text: t('tutorial.step2'), hint: t('tutorial.step2Hint') },
    3: { text: t('tutorial.step3'), hint: t('tutorial.step3Hint') }
  }

  if (tutorialStep <= 3) {
    ui.tutorialStepText.textContent = steps[tutorialStep].text
    ui.tutorialHint.textContent = steps[tutorialStep].hint
    ui.tutorialOverlay.classList.remove('hidden')

    // 根据步骤高亮对应元素
    if (tutorialStep === 1) {
      ui.towerPanel.style.boxShadow = '0 0 20px #90ee90'
    } else if (tutorialStep === 2) {
      ui.towerPanel.style.boxShadow = ''
    }
  }
}

function nextTutorialStep() {
  tutorialStep++
  if (tutorialStep > 3) {
    skipTutorial()
  } else {
    showTutorialStep()
  }
}

function skipTutorial() {
  ui.tutorialOverlay.classList.add('hidden')
  ui.towerPanel.style.boxShadow = ''
  localStorage.setItem('td_tutorial_done', 'true')
}

// 技能卡选择
function showSkillCardSelection() {
  if (waveActive || currentWave >= WAVES.length) {
    // 无尽模式不显示技能卡
    startNextWave()
    return
  }

  // 生成3张随机技能卡
  const skillCards = generateSkillCards()
  ui.skillCardList.innerHTML = ''

  skillCards.forEach((card, index) => {
    const cardEl = document.createElement('div')
    cardEl.className = 'skill-card'
    cardEl.innerHTML = `
      <div class="skill-icon">${card.icon}</div>
      <div class="skill-name">${t(`skillCards.${card.id}.name`)}</div>
      <div class="skill-desc">${t(`skillCards.${card.id}.desc`)}</div>
    `
    cardEl.addEventListener('click', () => selectSkillCard(card))
    ui.skillCardList.appendChild(cardEl)
  })

  ui.skillCardPanel.classList.remove('hidden')
  skillCardActive = true
}

function generateSkillCards() {
  const allSkills = [
    { id: 'freeze', icon: '❄️', effect: 'freeze' },
    { id: 'gold2x', icon: '💰', effect: 'gold2x' },
    { id: 'repair', icon: '🔧', effect: 'repair' },
    { id: 'lightning', icon: '⚡', effect: 'lightning' },
    { id: 'shield', icon: '🛡️', effect: 'shield' }
  ]

  // 随机选3张
  const shuffled = allSkills.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

function selectSkillCard(card) {
  selectedSkillCard = card
  ui.skillCardPanel.classList.add('hidden')
  skillCardActive = false

  // 应用技能卡效果
  applySkillCardEffect(card)

  // 开始波次
  startNextWave()
}

function applySkillCardEffect(card) {
  switch (card.effect) {
    case 'repair':
      baseHp = Math.min(baseHp + 10, GAME_CONFIG.baseHp)
      showFloatText(0, 0, '+10 HP', 'heal')
      updateUI()
      break
    case 'shield':
      // 护盾效果在敌人攻击基地时检查
      break
  }
}

// 显示波次标题
function showWaveTitle(title, subtitle) {
  ui.waveTitleText.textContent = title
  ui.waveSubtitle.textContent = subtitle
  ui.waveTitle.classList.remove('hidden')
  setTimeout(() => {
    ui.waveTitle.classList.add('hidden')
  }, 2500)
}

// 显示波次完成弹窗
function showWaveCompleteModal() {
  const waveNum = currentWave
  const waveName = currentWave > 0 && currentWave <= WAVES.length
    ? t(WAVES[currentWave - 1].nameKey)
    : t('waves.endless', { n: currentWave - WAVES.length })
  const nextWaveNum = waveNum + 1
  const nextWaveName = nextWaveNum <= WAVES.length
    ? t(WAVES[nextWaveNum - 1].nameKey)
    : nextWaveNum > LEVEL_CONFIG.length ? t('game.endlessMode') : t('game.waveComplete', { n: nextWaveNum }).replace('Complete!', '').trim()

  ui.modalWaveName.textContent = t('game.waveComplete', { n: waveNum })
  ui.modalHp.textContent = `${baseHp}/${GAME_CONFIG.baseHp} HP`
  ui.modalGold.textContent = `${gold}`
  ui.modalNextWave.textContent = nextWaveName

  ui.waveCompleteModal.classList.remove('hidden')
}

// 开始下一波
function startNextWave() {
  if (waveActive) return

  currentWave++
  waveActive = true
  enemiesToSpawn = []

  // 加载对应关卡的地图配置
  const levelConfig = LEVEL_CONFIG[Math.min(currentWave - 1, LEVEL_CONFIG.length - 1)]
  if (currentWave <= LEVEL_CONFIG.length) {
    loadLevelConfig(levelConfig)
  }

  let wave
  if (currentWave <= WAVES.length) {
    wave = WAVES[currentWave - 1]
  } else {
    // 无尽模式：生成强化波次
    wave = generateEndlessWave(currentWave)
  }

  // 获取路径分配配置
  const pathDist = levelConfig ? levelConfig.pathDistribution : [100]
  const pathCount = pathDist.length

  // 准备敌人队列（根据路径分配）
  let pathIndex = 0
  wave.enemies.forEach(group => {
    for (let i = 0; i < group.count; i++) {
      // 根据分配比例决定走哪条路径
      const roll = Math.random() * 100
      let cumulative = 0
      pathIndex = 0
      for (let p = 0; p < pathDist.length; p++) {
        cumulative += pathDist[p]
        if (roll < cumulative) {
          pathIndex = p
          break
        }
      }

      enemiesToSpawn.push({
        type: group.type,
        pathIndex: pathIndex,
        delay: i * group.interval + (group.delay || 0)
      })
    }
  })

  // 按延迟排序
  enemiesToSpawn.sort((a, b) => a.delay - b.delay)

  spawnTimer = 0
  ui.startWaveBtn.disabled = true
  ui.startWaveBtn.textContent = t('game.waveInProgress')

  // 闪电技能卡效果：波次开始时秒杀1个敌人
  if (selectedSkillCard && selectedSkillCard.effect === 'lightning' && enemies.length > 0) {
    const target = enemies[0]
    target.hp = 0
    killEnemy(target)
    showFloatText(target.mesh.position.x, target.mesh.position.z, `⚡${t('messages.lightningKill')}`, 'damage')
  }

  const waveName = wave.nameKey ? t(wave.nameKey) : wave.name
  showWaveTitle(`${t('common.wave')} ${currentWave}`, waveName)
  updateUI()
}

// 生成无尽模式波次
function generateEndlessWave(waveNum) {
  const endlessIndex = waveNum - WAVES.length
  const scaling = 1 + (endlessIndex * 0.1) // 每波增加10%难度

  const enemyTypes = ['goblin', 'orc', 'troll', 'bat', 'golem', 'boss']
  const baseCounts = {
    goblin: 15,
    orc: 10,
    troll: 5,
    bat: 20,
    golem: 5,
    boss: 1
  }

  const enemies = []
  enemyTypes.forEach(type => {
    const count = Math.floor(baseCounts[type] * scaling)
    if (count > 0) {
      enemies.push({
        type,
        count,
        interval: Math.max(0.3, 1.5 / scaling)
      })
    }
  })

  return {
    id: waveNum,
    zone: 'endless',
    name: t('waves.endless', { n: endlessIndex + 1 }),
    nameKey: 'waves.endless',
    enemies
  }
}

// 生成敌人
function spawnEnemy(type, pathIndex = 0) {
  const enemyDef = ENEMY_TYPES[type]
  const diffConfig = DIFFICULTY_CONFIG[currentDifficulty]

  // 获取对应路径的起点
  const pathData = pathCurves[pathIndex]
  if (!pathData) {
    console.warn(`Path ${pathIndex} not found, using path 0`)
    return
  }

  const startPoint = pathData.curve.getPointAt(0)

  let mesh
  if (modelTemplates[`enemy-${type}`]) {
    // SkeletonUtils.clone 正确处理 SkinnedMesh 骨骼绑定
    mesh = skeletonClone(modelTemplates[`enemy-${type}`])

    // clone 后修复材质：确保所有子 Mesh 可见、材质独立、不透明
    mesh.traverse(child => {
      if (child.isMesh) {
        child.visible = true
        // 独立克隆材质，避免多个敌人共享同一材质对象导致状态污染
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        const clonedMats = mats.map(m => {
          const c = m.clone()
          // 修复 opacity=0 或 alphaTest 导致不可见的情况
          if (c.opacity < 0.1) c.opacity = 1
          c.transparent = c.opacity < 1
          c.depthWrite = true
          c.side = THREE.DoubleSide  // 防止法线反转导致面剔除变透明
          c.needsUpdate = true
          return c
        })
        child.material = Array.isArray(child.material) ? clonedMats : clonedMats[0]
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  } else {
    // 按敌人类型使用对应 fallback，而非统一使用哥布林 fallback
    const fallbackMap = {
      goblin: createGoblinFallback,
      orc: createOrcFallback,
      troll: createTrollFallback,
      boss: createBossFallback,
      bat: createBatFallback,
      golem: createGolemFallback
    }
    mesh = (fallbackMap[type] || createGoblinFallback)()
  }

  mesh.position.copy(startPoint)
  // loadModels 已将模型归一化到 1 单位，再乘 scale * 1.3 得到合适大小
  // 注意：必须用 multiplyScalar 而非 setScalar，否则会覆盖模板里已归一化的 scale
  const MODEL_SCALE_MULT = 1.3
  mesh.scale.multiplyScalar(enemyDef.scale * MODEL_SCALE_MULT)
  scene.add(mesh)

  // 应用难度系数计算实际属性
  const hp = Math.floor(enemyDef.baseHp * diffConfig.enemyHpMult)
  // 每个个体速度加入 ±15% 随机偏移，避免同类型敌人步调完全一致
  const speedVariation = 0.85 + Math.random() * 0.3
  const speed = enemyDef.speed * diffConfig.speedMult * speedVariation
  const damage = Math.max(1, Math.floor(enemyDef.baseDamage * diffConfig.enemyDamageMult))
  const reward = Math.floor(enemyDef.baseReward * diffConfig.goldMult)

  const enemy = {
    mesh,
    type,
    def: enemyDef,
    pathIndex, // 记录走哪条路径
    pathCurve: pathData.curve, // 记录路径曲线
    hp: hp,
    maxHp: hp,
    speed: speed,
    damage: damage,
    reward: reward,
    pathProgress: 0,
    slowed: 0,
    id: Math.random()
  }

  enemies.push(enemy)

  // 敌人生成特效
  createSpawnEffect(startPoint, enemyDef.color)

  // 血条
  createHealthBar(enemy)
}

// 创建血条
function createHealthBar(enemy) {
  const barGroup = new THREE.Group()

  const bgGeo = new THREE.PlaneGeometry(0.8, 0.1)
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const bg = new THREE.Mesh(bgGeo, bgMat)

  const fillGeo = new THREE.PlaneGeometry(0.78, 0.08)
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const fill = new THREE.Mesh(fillGeo, fillMat)
  fill.position.z = 0.01

  barGroup.add(bg)
  barGroup.add(fill)

  // 直接加入 scene，避免被 enemy.mesh 的超大 scale（如 100+）放大位置和尺寸
  const worldY = enemy.mesh.position.y + (enemy.def.yOffset || 0.5) + enemy.def.scale * 0.5
  barGroup.position.copy(enemy.mesh.position)
  barGroup.position.y = worldY
  barGroup.lookAt(camera.position)
  scene.add(barGroup)

  enemy.healthBar = fill
  enemy.healthBarGroup = barGroup // 保存引用，方便后续移除
}

// 更新血条
function updateHealthBar(enemy) {
  if (enemy.healthBar) {
    const ratio = enemy.hp / enemy.maxHp
    enemy.healthBar.scale.x = Math.max(0.01, ratio)
    enemy.healthBar.position.x = -0.39 * (1 - ratio)

    // 颜色变化
    if (ratio > 0.5) {
      enemy.healthBar.material.color.setHex(0x00ff00)
    } else if (ratio > 0.25) {
      enemy.healthBar.material.color.setHex(0xffff00)
    } else {
      enemy.healthBar.material.color.setHex(0xff0000)
    }
  }
}

// 创建塔
function createTower(type, position) {
  const towerDef = TOWER_TYPES[type]

  if (gold < towerDef.cost) {
    showFloatText(position.x, position.z, t('messages.notEnoughGold'), 'damage')
    return false
  }

  // 检查位置是否有效
  if (isTooCloseToPath({ x: position.x, z: position.z })) {
    showFloatText(position.x, position.z, t('messages.tooCloseToPath'), 'damage')
    return false
  }

  if (isPositionOccupied(position)) {
    showFloatText(position.x, position.z, t('messages.alreadyBuilt'), 'damage')
    return false
  }

  gold -= towerDef.cost

  let mesh
  // GLB 模型归一化后为 1 世界单位，需乘倍率使塔与敌人比例匹配
  const TOWER_SCALE_MULT = 3.0
  if (modelTemplates[`tower-${type}`]) {
    mesh = modelTemplates[`tower-${type}`].clone()
    mesh.scale.multiplyScalar(TOWER_SCALE_MULT)
  } else {
    mesh = createArrowTowerFallback()
    mesh.scale.multiplyScalar(TOWER_SCALE_MULT)
  }

  mesh.position.copy(position)
  mesh.position.y = 0.1  // 微抬塔模型，防止底座嵌入地面
  scene.add(mesh)

  // 给塔添加自发光，确保可见
  mesh.traverse(child => {
    if (child.isMesh && child.material) {
      if (child.material.emissive) {
        child.material.emissive.setHex(0x222222)
      }
      if (child.material.emissiveIntensity !== undefined) {
        child.material.emissiveIntensity = 0.5
      }
    }
  })

  const tower = {
    mesh,
    type,
    def: towerDef,
    fireTimer: 0,
    position: position.clone(),
    level: 1
  }

  towers.push(tower)

  // 建造特效
  createBuildEffect(position)
  showFloatText(position.x, position.z, `-${towerDef.cost}`, 'damage')

  updateUI()
  return true
}

// 检查位置是否被占用
function isPositionOccupied(position) {
  for (const tower of towers) {
    if (tower.position.distanceTo(position) < 1) {
      return true
    }
  }
  return false
}

// 创建建造特效
function createBuildEffect(position) {
  for (let i = 0; i < 10; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x90ee90 })
    )
    particle.position.copy(position)
    particle.position.y = 0.5

    const angle = (i / 10) * Math.PI * 2
    const speed = 2 + Math.random() * 2

    scene.add(particle)
    particles.push({
      mesh: particle,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, 3, Math.sin(angle) * speed),
      life: 0.5
    })
  }
}

// 选择塔类型
function selectTowerType(type) {
  if (selectedTowerType === type) {
    selectedTowerType = null
  } else {
    selectedTowerType = type
  }

  // 切换相机模式：建造时左键放塔，否则左键旋转
  updateControlsMode()

  // 更新UI
  ui.towerCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.type === selectedTowerType)
  })

  // 关闭塔信息面板
  closeTowerInfo()
}

// 选择塔（查看信息）
function selectTower(tower) {
  selectedTower = tower
  selectedTowerType = null
  updateControlsMode() // 取消建造模式，恢复左键旋转

  ui.towerCards.forEach(card => card.classList.remove('selected'))

  // 显示信息面板
  const upgradeBtn = ui.upgradeTowerBtn
  const upgradeCost = getTowerUpgradeCost(tower)

  const towerName = t(`towers.${tower.type}.name`)
  ui.selectedTowerDetails.innerHTML = `
    <div style="margin-bottom: 8px;"><strong>${towerName}</strong> Lv.${tower.level}</div>
    <div style="font-size: 12px; color: #aaa; margin-bottom: 4px;">${t('towerInfo.damage')}: ${getTowerDamage(tower)}</div>
    <div style="font-size: 12px; color: #aaa; margin-bottom: 4px;">${t('towerInfo.range')}: ${getTowerRange(tower)}</div>
    <div style="font-size: 12px; color: #aaa; margin-bottom: 4px;">${t('towerInfo.fireRate')}: ${(1/getTowerFireRate(tower)).toFixed(1)}${t('towerInfo.perSecond')}</div>
  `

  if (tower.level < 3) {
    ui.sellTowerBtn.textContent = `${t('common.sell')} (+${Math.floor(tower.def.cost * 0.5)})`
    upgradeBtn.textContent = `${t('common.upgrade')} (+${upgradeCost})`
    upgradeBtn.classList.remove('hidden')
  } else {
    ui.sellTowerBtn.textContent = `${t('common.sell')} (+${Math.floor(tower.def.cost * 0.5)})`
    upgradeBtn.classList.add('hidden')
  }
  ui.towerInfoPanel.classList.remove('hidden')
}

// 获取塔的实际属性（考虑等级）
function getTowerDamage(tower) {
  const base = tower.def.damage
  if (tower.level === 2) return Math.floor(base * 1.3)
  if (tower.level === 3) return Math.floor(base * 1.6)
  return base
}

function getTowerRange(tower) {
  const base = tower.def.range
  if (tower.level === 2) return (base * 1.1).toFixed(1)
  if (tower.level === 3) return (base * 1.2).toFixed(1)
  return base
}

function getTowerFireRate(tower) {
  const base = tower.def.fireRate
  if (tower.level === 3) return base * 0.8
  return base
}

function getTowerUpgradeCost(tower) {
  const base = tower.def.cost
  if (tower.level === 1) return Math.floor(base * 0.5)
  if (tower.level === 2) return Math.floor(base * 0.8)
  return 0
}

// 升级塔
function upgradeSelectedTower() {
  if (!selectedTower || selectedTower.level >= 3) return

  const cost = getTowerUpgradeCost(selectedTower)
  if (gold < cost) {
    showFloatText(selectedTower.position.x, selectedTower.position.z, t('messages.notEnoughGold'), 'damage')
    return
  }

  gold -= cost
  selectedTower.level++

  // 升级特效
  createUpgradeEffect(selectedTower.position)

  // 更新塔外观（发光增强）
  updateTowerAppearance(selectedTower)

  showFloatText(selectedTower.position.x, selectedTower.position.z, t('messages.upgraded'), 'heal')
  updateUI()
  selectTower(selectedTower) // 刷新面板
}

// 创建升级特效
function createUpgradeEffect(position) {
  for (let i = 0; i < 20; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd700 })
    )
    particle.position.copy(position)
    particle.position.y = 0.5

    const angle = (i / 20) * Math.PI * 2
    const speed = 3 + Math.random() * 2

    scene.add(particle)
    particles.push({
      mesh: particle,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, 4, Math.sin(angle) * speed),
      life: 0.6
    })
  }
}

// 更新塔外观（根据等级增加发光）
function updateTowerAppearance(tower) {
  tower.mesh.traverse(child => {
    if (child.isMesh && child.material && child.material.emissive) {
      child.material.emissive.setHex(0x333333 * tower.level)
    }
  })
}

// 出售塔
function sellSelectedTower() {
  if (!selectedTower) return

  const sellPrice = Math.floor(selectedTower.def.cost * 0.5)
  gold += sellPrice

  scene.remove(selectedTower.mesh)
  towers.splice(towers.indexOf(selectedTower), 1)

  showFloatText(selectedTower.position.x, selectedTower.position.z, `+${sellPrice}`, 'gold')

  selectedTower = null
  ui.towerInfoPanel.classList.add('hidden')
  updateUI()
}

// 关闭塔信息
function closeTowerInfo() {
  selectedTower = null
  ui.towerInfoPanel.classList.add('hidden')
}

// 显示浮动文字
function showFloatText(x, z, text, type) {
  const worldPos = new THREE.Vector3(x, 1, z)
  worldPos.project(camera)

  const screenX = (worldPos.x * 0.5 + 0.5) * window.innerWidth
  const screenY = (-worldPos.y * 0.5 + 0.5) * window.innerHeight

  const el = document.createElement('div')
  el.className = `float-text ${type}`
  el.textContent = text
  el.style.left = `${screenX}px`
  el.style.top = `${screenY}px`

  ui.floatContainer.appendChild(el)
  setTimeout(() => el.remove(), 1000)
}

// 更新UI
function updateUI() {
  ui.gold.textContent = `💰 ${gold}`
  ui.baseHp.textContent = `❤️ ${baseHp}/${GAME_CONFIG.baseHp}`
  ui.waveInfo.textContent = `${t('common.wave')} ${currentWave} / ${WAVES.length}`

  const waveName = currentWave > 0 && currentWave <= WAVES.length
    ? t(WAVES[currentWave - 1].nameKey)
    : t('game.ready')
  ui.waveName.textContent = waveName

  ui.enemiesRemaining.innerHTML = `<span data-i18n="common.enemies">${t('common.enemies')}</span>: ${enemies.length}`

  // 更新塔卡片状态
  ui.towerCards.forEach(card => {
    const type = card.dataset.type
    const cost = TOWER_TYPES[type].cost
    card.classList.toggle('disabled', gold < cost)
  })
}

// 鼠标/触摸事件
function onPointerMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  // 更新塔放置预览
  if (selectedTowerType && gameActive) {
    updateTowerPreview()
  }
}

function onPointerDown(event) {
  if (!gameActive) return

  // 左键点击
  if (event.button !== 0) return

  // 检查是否点击在UI上
  if (event.target.closest('#tower-panel') ||
      event.target.closest('#tower-info-panel') ||
      event.target.closest('.hud-btn') ||
      event.target.closest('#skill-card-panel') ||
      event.target.closest('#tutorial-overlay') ||
      event.target.closest('#difficulty-screen')) {
    return
  }

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(groundPlane)

  if (intersects.length > 0) {
    const point = intersects[0].point

    if (selectedTowerType) {
      // 建造模式 - 尝试建造
      const buildSuccess = createTower(selectedTowerType, point)
      if (buildSuccess) {
        // 建造成功后清除预览和选中
        clearTowerPreview()
        selectedTowerType = null
        ui.towerCards.forEach(card => card.classList.remove('selected'))
        updateControlsMode() // 恢复左键旋转模式
      }
    } else {
      // 选择模式 - 检查是否点击了塔
      let clickedTower = null
      for (const tower of towers) {
        const distance = point.distanceTo(tower.position)
        if (distance < 0.8) {
          clickedTower = tower
          break
        }
      }

      if (clickedTower) {
        selectTower(clickedTower)
      } else {
        closeTowerInfo()
      }
    }
  }
}

// 更新塔放置预览
function updateTowerPreview() {
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(groundPlane)

  if (intersects.length === 0) {
    clearTowerPreview()
    return
  }

  const point = intersects[0].point
  const towerDef = TOWER_TYPES[selectedTowerType]

  // 检查建造条件
  const tooCloseToPath = isTooCloseToPath({ x: point.x, z: point.z })
  const positionOccupied = isPositionOccupied(point)
  const notEnoughGold = gold < towerDef.cost

  // 确定预览颜色和状态
  let previewColor
  let canBuild = !tooCloseToPath && !positionOccupied && !notEnoughGold

  if (notEnoughGold) {
    previewColor = 0x888888 // 灰色 - 钱不够
  } else if (tooCloseToPath || positionOccupied) {
    previewColor = 0xff4444 // 红色 - 不能建
  } else {
    previewColor = 0x44ff44 // 绿色 - 可以建
  }

  // 创建或更新预览mesh
  if (!previewMesh) {
    previewMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
      new THREE.MeshBasicMaterial({
        color: previewColor,
        transparent: true,
        opacity: 0.5
      })
    )
    scene.add(previewMesh)
  }

  previewMesh.material.color.setHex(previewColor)
  previewMesh.position.set(point.x, 0.5, point.z)

  // 存储预览位置用于建造
  previewType = selectedTowerType
}

// 清除塔放置预览
function clearTowerPreview() {
  if (previewMesh) {
    scene.remove(previewMesh)
    previewMesh = null
  }
  previewType = null
}

// 窗口调整
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// 游戏结束
function gameOver() {
  gameActive = false
  waveActive = false
  ui.gameOver.classList.remove('hidden')
  ui.gameOverScore.textContent = t('game.surviveScore', { n: currentWave - 1 })
}

// 游戏胜利
function victory() {
  gameActive = false
  waveActive = false
  ui.victory.classList.remove('hidden')
  ui.victoryScore.textContent = t('game.victoryScore', { hp: baseHp, gold: gold })
}

// 重新开始
function restartGame() {
  // 清理所有游戏对象
  clearAllGameObjects()

  // 隐藏UI
  ui.victory.classList.add('hidden')
  ui.gameOver.classList.add('hidden')
  ui.towerInfoPanel.classList.add('hidden')
  ui.waveCompleteModal.classList.add('hidden')

  // 重置游戏状态
  gold = GAME_CONFIG.startingGold
  baseHp = GAME_CONFIG.baseHp
  currentWave = 0
  waveActive = false
  gameActive = true
  selectedSkillCard = null
  lastWaveForEvent = 0

  // 重置游戏状态扩展
  gameState.endlessMode = false
  gameState.merchantActive = false
  gameState.chestMonsterActive = false
  gameState.rushMode = false

  ui.startWaveBtn.disabled = false
  ui.startWaveBtn.textContent = t('game.startWave')

  // 启用相机控制
  if (controls) controls.enabled = true

  // 重新加载第一关地图
  loadLevelPreview(1)

  updateUI()
}

// 返回主菜单
function backToMenu() {
  restartGame()
  ui.hud.classList.add('hidden')
  ui.towerPanel.classList.add('hidden')
  ui.towerInfoPanel.classList.add('hidden')
  ui.gameOver.classList.add('hidden')
  ui.startScreen.classList.remove('hidden')
  
  // 禁用相机控制
  if (controls) controls.enabled = false
}

// 主动画循环
function animate() {
  requestAnimationFrame(animate)

  const dt = Math.min(clock.getDelta(), 0.1)

  if (gameActive) {
    updateGame(dt)
  }

  // 更新相机震动
  updateCameraShake(dt)

  // 更新相机视角过渡动画
  updateCameraTransition(dt)

  // 更新控制器
  if (controls) {
    controls.update()
  }

  // 更新出生点标记动画
  updateSpawnMarkers()

  renderer.render(scene, camera)
}

// 相机震动更新
function updateCameraShake(dt) {
  if (cameraShake.duration > 0) {
    cameraShake.duration -= dt

    if (!cameraOriginalPosition) {
      cameraOriginalPosition = camera.position.clone()
    }

    const shakeX = (Math.random() - 0.5) * cameraShake.intensity
    const shakeY = (Math.random() - 0.5) * cameraShake.intensity
    camera.position.x = cameraOriginalPosition.x + shakeX
    camera.position.z = cameraOriginalPosition.z + shakeY
  } else if (cameraOriginalPosition) {
    // 恢复相机位置
    camera.position.copy(cameraOriginalPosition)
    cameraOriginalPosition = null
  }
}

// 触发相机震动
function triggerCameraShake(intensity = 0.3, duration = 0.2) {
  cameraShake.intensity = intensity
  cameraShake.duration = duration
}

// 根据当前是否在建造模式切换鼠标左键行为
function updateControlsMode() {
  if (!controls) return
  // 建造模式：左键用于点击放塔（不旋转）
  // 浏览模式：左键拖拽旋转视角
  controls.mouseButtons.LEFT = selectedTowerType ? null : THREE.MOUSE.ROTATE
}

// ---- 相机视角切换系统 ----

// 平滑插值（ease-in-out）
function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

// 获取各视角预设（根据当前地图大小动态计算）
function getCameraPresets() {
  const mapSize = currentLevelConfig ? currentLevelConfig.mapSize : 20
  const dist = mapSize * 0.9
  return {
    top: {
      position: new THREE.Vector3(0, mapSize * 1.6, 0.5),
      target: new THREE.Vector3(0, 0, 0)
    },
    default: {
      position: new THREE.Vector3(0, dist, dist),
      target: new THREE.Vector3(0, 0, 0)
    },
    low: {
      position: new THREE.Vector3(0, dist * 0.28, dist * 0.85),
      target: new THREE.Vector3(0, 0, 0)
    }
  }
}

// 切换到指定视角（平滑过渡）
function switchCameraView(viewName) {
  const presets = getCameraPresets()
  const preset = presets[viewName]
  if (!preset) return

  currentCameraView = viewName

  cameraTransition = {
    fromPos: camera.position.clone(),
    toPos: preset.position.clone(),
    toTarget: preset.target.clone(),
    progress: 0,
    duration: 0.45
  }

  // 更新按钮激活状态
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName)
  })
}

// 每帧更新相机过渡动画（在 animate 中调用）
function updateCameraTransition(dt) {
  if (!cameraTransition) return

  cameraTransition.progress += dt / cameraTransition.duration

  if (cameraTransition.progress >= 1) {
    camera.position.copy(cameraTransition.toPos)
    if (controls) {
      controls.target.copy(cameraTransition.toTarget)
      controls.update()
    }
    cameraTransition = null
    return
  }

  const t = smoothstep(Math.min(cameraTransition.progress, 1))
  camera.position.lerpVectors(cameraTransition.fromPos, cameraTransition.toPos, t)
  if (controls) {
    controls.target.copy(cameraTransition.toTarget)
    controls.update()
  }
}

// 基地受伤屏幕闪烁
function triggerBaseDamageFlash() {
  const flash = document.createElement('div')
  flash.id = 'damage-flash'
  flash.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(255,0,0,0.4) 100%);
    pointer-events: none;
    z-index: 1000;
    animation: damageFlash 0.3s ease-out forwards;
  `
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 300)
}

// 添加闪烁动画样式
const style = document.createElement('style')
style.textContent = `
  @keyframes damageFlash {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }
`
document.head.appendChild(style)

// 游戏更新逻辑
function updateGame(dt) {
  // 生成敌人
  if (waveActive && enemiesToSpawn.length > 0) {
    spawnTimer += dt

    while (enemiesToSpawn.length > 0 && enemiesToSpawn[0].delay <= spawnTimer) {
      const enemyData = enemiesToSpawn.shift()
      spawnEnemy(enemyData.type, enemyData.pathIndex)
    }
  }

  // 检查波次结束
  if (waveActive && enemiesToSpawn.length === 0 && enemies.length === 0) {
    waveActive = false

    if (currentWave >= WAVES.length && !gameState.endlessMode) {
      // 通关了所有波次，进入无尽模式
      gameState.endlessMode = true
      showWaveTitle(`🎉 ${t('game.enterEndless')}`, t('game.enterEndlessDesc'))
      // 保存最高波次
      const bestWave = localStorage.getItem('td_best_wave') || 0
      if (currentWave > bestWave) {
        localStorage.setItem('td_best_wave', currentWave)
      }
      // 无尽模式不弹窗，直接继续
      ui.startWaveBtn.disabled = false
      ui.startWaveBtn.textContent = t('game.endlessMode')
    } else if (gameState.endlessMode) {
      // 无尽模式
      ui.startWaveBtn.disabled = false
      ui.startWaveBtn.textContent = t('game.endlessMode')
    } else {
      // 普通关卡，显示完成弹窗
      ui.startWaveBtn.disabled = false
      ui.startWaveBtn.textContent = t('game.startWave')
      showWaveCompleteModal()
    }
  }

  // 更新敌人
  updateEnemies(dt)

  // 更新塔
  updateTowers(dt)

  // 更新投射物
  updateProjectiles(dt)

  // 更新粒子
  updateParticles(dt)

  // 更新血条朝向
  enemies.forEach(enemy => {
    if (enemy.healthBarGroup) {
      // 血条直接在 scene 中，需要每帧手动同步到敌人世界坐标上方
      const yOffset = (enemy.def.yOffset || 0.5) + enemy.def.scale * 0.5
      enemy.healthBarGroup.position.copy(enemy.mesh.position)
      enemy.healthBarGroup.position.y = enemy.mesh.position.y + yOffset
      enemy.healthBarGroup.lookAt(camera.position)
    }
  })

  // 检查随机事件（波次刚结束时）
  checkRandomEvent()
}

// 随机事件检测
let lastWaveForEvent = 0
function checkRandomEvent() {
  if (currentWave > lastWaveForEvent && currentWave > 0) {
    lastWaveForEvent = currentWave

    // 10%概率触发随机事件
    if (Math.random() < 0.1 && !gameState.endlessMode) {
      triggerRandomEvent()
    }
  }
}

// 触发随机事件
function triggerRandomEvent() {
  const events = RANDOM_EVENTS
  const event = events[Math.floor(Math.random() * events.length)]

  showWaveTitle(t(`events.${event.id}.name`), t(`events.${event.id}.desc`))

  // 显示事件通知
  showEventNotification(event)
}

function showEventNotification(event) {
  // 事件效果会在对应逻辑中处理
  switch (event.effect) {
    case 'merchant':
      // 商人事件：所有塔半价（暂时只显示提示）
      showFloatText(0, 0, t('messages.merchantArrived'), 'heal')
      gameState.merchantActive = true
      break
    case 'chest':
      // 宝箱怪会在下一波生成
      gameState.chestMonsterActive = true
      break
    case 'rush':
      // 紧急波次：下一波立即开始
      gameState.rushMode = true
      break
    case 'heal':
      // 治疗之泉：所有敌人回血20%
      enemies.forEach(enemy => {
        enemy.hp = Math.min(enemy.hp * 1.2, enemy.maxHp)
        updateHealthBar(enemy)
      })
      showFloatText(0, 0, t('messages.enemyHealed'), 'damage')
      break
  }
}

// 游戏状态扩展
const gameState = {
  endlessMode: false,
  merchantActive: false,
  chestMonsterActive: false,
  rushMode: false
}

// 更新敌人
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]

    // 应用减速效果
    let currentSpeed = enemy.speed
    if (enemy.slowed > 0) {
      currentSpeed *= 0.5
      enemy.slowed -= dt
    }

    // 冰冻技能卡效果：所有敌人移速-50%
    if (selectedSkillCard && selectedSkillCard.effect === 'freeze') {
      currentSpeed *= 0.5
    }

    // 沿路径移动（使用敌人各自的路径曲线）
    const moveDistance = currentSpeed * dt
    const pathLength = enemy.pathCurve.getLength()
    const progressDelta = moveDistance / pathLength

    enemy.pathProgress += progressDelta

    if (enemy.pathProgress >= 1) {
      // 到达终点
      // 检查护盾效果
      if (selectedSkillCard && selectedSkillCard.effect === 'shield' && !enemy.shielded) {
        enemy.shielded = true
        showFloatText(0, 0, t('messages.shieldBlock'), 'heal')
      } else {
        baseHp -= enemy.damage
        // 基地受伤反馈
        triggerBaseDamageFlash()
        // BOSS攻击时震动更强烈
        if (enemy.type === 'boss') {
          triggerCameraShake(0.5, 0.3)
        } else {
          triggerCameraShake(0.2, 0.15)
        }
      }
      if (enemy.healthBarGroup) scene.remove(enemy.healthBarGroup)
      scene.remove(enemy.mesh)
      enemies.splice(i, 1)
      updateUI()

      if (baseHp <= 0) {
        gameOver()
      }
      continue
    }

    // 更新位置（使用敌人各自的路径曲线）
    const pos = enemy.pathCurve.getPointAt(enemy.pathProgress)
    enemy.mesh.position.set(pos.x, 0, pos.z)

    // 更新面朝方向：使敌人头部朝向前进方向
    if (enemy.pathProgress < 0.98) {
      const lookT = Math.min(enemy.pathProgress + 0.02, 1)
      const nextPos = enemy.pathCurve.getPointAt(lookT)
      const dx = nextPos.x - pos.x
      const dz = nextPos.z - pos.z
      // atan2(dx, dz) 使 +Z 轴对准前进方向
      // Meshy 导出的模型通常面向 +Z，所以此处不加 Math.PI
      // 如果游戏中模型仍然背对前进方向，可在此加 + Math.PI
      enemy.mesh.rotation.y = Math.atan2(dx, dz)
    }

    // 飞行单位上下浮动
    if (enemy.def.flying) {
      const baseY = enemy.def.yOffset || 0.8
      enemy.mesh.position.y = baseY + Math.sin(Date.now() * 0.005 + enemy.id) * 0.2
    } else {
      // 地面单位：检测周边路径装饰物，遇障碍跳跃
      const baseY = enemy.def.yOffset || 0.5
      const distTraveled = enemy.pathProgress * enemy.pathCurve.getLength()
      const walkCycle = distTraveled * 2.5
      const walkBob = Math.abs(Math.sin(walkCycle * Math.PI)) * 0.07

      // 计算到最近装饰物的距离，近则触发跳跃
      const HOP_RADIUS = 1.1  // 触发跳跃的检测半径（世界单位）
      const HOP_HEIGHT = 0.9  // 最大跳跃高度（世界单位）
      let hopAmount = 0
      const ex = enemy.mesh.position.x
      const ez = enemy.mesh.position.z
      for (const dp of pathDecorationPositions) {
        const dx = ex - dp.x
        const dz = ez - dp.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < HOP_RADIUS) {
          const t = 1 - dist / HOP_RADIUS
          const h = Math.sin(t * Math.PI) * HOP_HEIGHT
          if (h > hopAmount) hopAmount = h
        }
      }

      enemy.mesh.position.y = baseY + Math.max(walkBob, hopAmount)
    }

    // 更新血条
    updateHealthBar(enemy)
  }
}

// 更新塔
function updateTowers(dt) {
  towers.forEach(tower => {
    tower.fireTimer += dt

    const fireRate = getTowerFireRate(tower)
    if (tower.fireTimer >= fireRate) {
      // 寻找目标
      const target = findTarget(tower)

      if (target) {
        fireProjectile(tower, target)
        tower.fireTimer = 0
      }
    }
  })
}

// 寻找目标
function findTarget(tower) {
  let closestEnemy = null
  let closestDistance = Infinity

  const range = getTowerRange(tower)
  enemies.forEach(enemy => {
    const distance = tower.position.distanceTo(enemy.mesh.position)
    if (distance <= range && distance < closestDistance) {
      closestDistance = distance
      closestEnemy = enemy
    }
  })

  return closestEnemy
}

// 发射投射物
function fireProjectile(tower, target) {
  const startPos = tower.position.clone()
  startPos.y = 1

  const projectile = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: tower.def.color })
  )
  projectile.position.copy(startPos)
  scene.add(projectile)

  const targetPos = target.mesh.position.clone()

  projectiles.push({
    mesh: projectile,
    target: target,
    startPos: startPos,
    targetPos: targetPos,
    speed: 15,
    damage: getTowerDamage(tower), // 使用实际伤害
    towerType: tower.type,
    def: tower.def
  })
}

// 更新投射物
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i]

    // 检查目标是否还存在
    if (!enemies.includes(proj.target)) {
      scene.remove(proj.mesh)
      projectiles.splice(i, 1)
      continue
    }

    // 更新目标位置（追踪）
    proj.targetPos = proj.target.mesh.position.clone()

    // 移动投射物
    const direction = new THREE.Vector3().subVectors(proj.targetPos, proj.mesh.position)
    direction.y = 0
    const distance = direction.length()

    if (distance < 0.3) {
      // 命中
      hitEnemy(proj)
      scene.remove(proj.mesh)
      projectiles.splice(i, 1)
      continue
    }

    direction.normalize()
    const moveDistance = Math.min(proj.speed * dt, distance)
    proj.mesh.position.add(direction.multiplyScalar(moveDistance))
    proj.mesh.position.y = 1 + Math.sin(proj.mesh.position.distanceTo(proj.startPos) * 2) * 0.3
  }
}

// 命中敌人
function hitEnemy(proj) {
  const target = proj.target

  if (!enemies.includes(target)) return

  // 伤害计算
  if (proj.def.splash) {
    // 溅射伤害
    enemies.forEach(enemy => {
      if (enemy.mesh.position.distanceTo(target.mesh.position) <= proj.def.splash) {
        damageEnemy(enemy, proj.damage)
      }
    })
    createExplosion(target.mesh.position, proj.def.splash)
  } else {
    damageEnemy(target, proj.damage)
  }

  // 减速效果
  if (proj.def.slow) {
    target.slowed = proj.def.slowDuration
    showFloatText(target.mesh.position.x, target.mesh.position.z, t('messages.slowed'), 'heal')
  }
}

// 对敌人造成伤害
function damageEnemy(enemy, damage) {
  enemy.hp -= damage
  updateHealthBar(enemy)

  // 受击闪烁
  enemy.mesh.traverse(child => {
    if (child.isMesh && child.material) {
      const originalColor = child.material.color.getHex()
      child.material.color.setHex(0xffffff)
      setTimeout(() => {
        if (child.material) {
          child.material.color.setHex(originalColor)
        }
      }, 100)
    }
  })

  if (enemy.hp <= 0) {
    killEnemy(enemy)
  }
}

// 击杀敌人
function killEnemy(enemy) {
  const index = enemies.indexOf(enemy)
  if (index > -1) {
    // 计算金币（考虑技能卡效果）
    let reward = enemy.reward
    if (selectedSkillCard && selectedSkillCard.effect === 'gold2x') {
      reward *= 2
    }

    gold += reward
    showFloatText(enemy.mesh.position.x, enemy.mesh.position.z, `+${reward}`, 'gold')

    // 死亡特效
    createExplosion(enemy.mesh.position, 0.5, enemy.def.color)

    // Boss死亡时更强烈的震动
    if (enemy.type === 'boss') {
      triggerCameraShake(0.8, 0.4)
      showWaveTitle(t('messages.bossKilled'), `+${reward} ${t('common.gold')}`)
    }

    if (enemy.healthBarGroup) scene.remove(enemy.healthBarGroup)
    scene.remove(enemy.mesh)
    enemies.splice(index, 1)
    updateUI()
  }
}

// 创建爆炸特效
function createExplosion(position, radius, color = 0xffaa00) {
  const particleCount = Math.floor(radius * 10)

  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 4, 4),
      new THREE.MeshBasicMaterial({ color: color })
    )
    particle.position.copy(position)
    particle.position.x += (Math.random() - 0.5) * radius
    particle.position.z += (Math.random() - 0.5) * radius

    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 3

    scene.add(particle)
    particles.push({
      mesh: particle,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, 3 + Math.random() * 2, Math.sin(angle) * speed),
      life: 0.3 + Math.random() * 0.3
    })
  }
}

// 敌人生成特效 - 绿色扩散圆环
function createSpawnEffect(position, color) {
  // 创建扩散的圆环
  const ringGeo = new THREE.TorusGeometry(0.5, 0.1, 8, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00FF00,
    transparent: true,
    opacity: 1
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.copy(position)
  ring.position.y = 0.5
  ring.rotation.x = Math.PI / 2
  scene.add(ring)

  // 添加到粒子系统，动画扩散后消失
  particles.push({
    mesh: ring,
    velocity: new THREE.Vector3(0, 0, 0),
    life: 0.5,
    isSpawnRing: true,
    startScale: 1
  })

  // 添加中心闪光
  const flashGeo = new THREE.SphereGeometry(0.4, 16, 16)
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0x00FF00,
    transparent: true,
    opacity: 0.8
  })
  const flash = new THREE.Mesh(flashGeo, flashMat)
  flash.position.copy(position)
  flash.position.y = 0.5
  scene.add(flash)

  particles.push({
    mesh: flash,
    velocity: new THREE.Vector3(0, 0, 0),
    life: 0.4,
    isSpawnFlash: true
  })
}

// 更新粒子
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt

    if (p.isSpawnRing) {
      // 生成特效圆环扩散
      const progress = 1 - (p.life / 0.5)
      const scale = 1 + progress * 3
      p.mesh.scale.set(scale, scale, scale)
      p.mesh.material.opacity = 1 - progress
    } else if (p.isSpawnFlash) {
      // 生成特效闪光淡出
      p.mesh.material.opacity = p.life / 0.4
      p.mesh.scale.setScalar(p.life / 0.4 * 1.5)
    } else {
      // 普通粒子
      p.velocity.y -= 9.8 * dt // 重力
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt))
    }

    if (p.life <= 0) {
      scene.remove(p.mesh)
      particles.splice(i, 1)
    }
  }
}

// 启动游戏
init()
