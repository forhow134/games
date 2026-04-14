// 游戏常量配置

export const TOWER_TYPES = {
  arrow: {
    id: 'arrow',
    cost: 30,
    damage: 10,
    range: 4,
    fireRate: 0.6,
    color: 0x8B4513,
    model: 'tower-arrow.glb'
  },
  magic: {
    id: 'magic',
    cost: 50,
    damage: 30,
    range: 6,
    fireRate: 1.2,
    color: 0x9932CC,
    model: 'tower-magic.glb'
  },
  cannon: {
    id: 'cannon',
    cost: 80,
    damage: 40,
    range: 3.5,
    fireRate: 1.5,
    splash: 2,
    color: 0x696969,
    model: 'tower-cannon.glb'
  },
  ice: {
    id: 'ice',
    cost: 60,
    damage: 5,
    range: 5,
    fireRate: 0.5,
    slow: 0.5,
    slowDuration: 2,
    color: 0x00CED1,
    model: 'tower-ice.glb'
  }
}

// 难度配置
export const DIFFICULTY_CONFIG = {
  easy: {
    enemyHpMult: 0.7,
    enemyDamageMult: 0.7,
    goldMult: 1.5,
    speedMult: 1.0
  },
  normal: {
    enemyHpMult: 1.0,
    enemyDamageMult: 1.0,
    goldMult: 1.0,
    speedMult: 1.0
  },
  hard: {
    enemyHpMult: 1.5,
    enemyDamageMult: 1.5,
    goldMult: 0.8,
    speedMult: 1.2
  },
  nightmare: {
    enemyHpMult: 2.0,
    enemyDamageMult: 2.0,
    goldMult: 0.5,
    speedMult: 1.4
  }
}

export const ENEMY_TYPES = {
  goblin: {
    id: 'goblin',
    baseHp: 20,
    speed: 3,
    baseReward: 5,
    baseDamage: 1,
    color: 0x32CD32,
    scale: 0.8,
    yOffset: 0.4,   // 模型底部离地高度（Meshy模型原点在中心，需抬起半身）
    flying: false,
    model: 'enemy-goblin.glb'
  },
  orc: {
    id: 'orc',
    baseHp: 50,
    speed: 2,
    baseReward: 10,
    baseDamage: 1,
    color: 0x228B22,
    scale: 1,
    yOffset: 0.5,
    flying: false,
    model: 'enemy-orc.glb'
  },
  troll: {
    id: 'troll',
    baseHp: 120,
    speed: 1,
    baseReward: 20,
    baseDamage: 2,
    color: 0x8B4513,
    scale: 1.3,
    yOffset: 0.65,
    flying: false,
    model: 'enemy-troll.glb'
  },
  boss: {
    id: 'boss',
    baseHp: 500,
    speed: 0.5,
    baseReward: 100,
    baseDamage: 5,
    color: 0xFFD700,
    scale: 1.8,
    yOffset: 0.9,
    flying: false,
    model: 'enemy-boss.glb'
  },
  bat: {
    id: 'bat',
    baseHp: 15,
    speed: 4,
    baseReward: 8,
    baseDamage: 1,
    color: 0x4a4a4a,
    scale: 0.6,
    yOffset: 0.8,   // 飞行单位，额外抬高
    flying: true,
    model: 'enemy-bat.glb'
  },
  golem: {
    id: 'golem',
    baseHp: 200,
    speed: 0.5,
    baseReward: 40,
    baseDamage: 3,
    color: 0x808080,
    scale: 1.5,
    yOffset: 0.75,
    flying: false,
    armor: 0.3,
    model: 'enemy-golem.glb'
  }
}

// 技能卡配置 (name and desc now come from i18n)
export const SKILL_CARDS = [
  { id: 'freeze', icon: '❄️', effect: 'freeze' },
  { id: 'gold2x', icon: '💰', effect: 'gold2x' },
  { id: 'repair', icon: '🔧', effect: 'repair' },
  { id: 'lightning', icon: '⚡', effect: 'lightning' },
  { id: 'shield', icon: '🛡️', effect: 'shield' }
]

// Roguelike随机事件 (name and desc now come from i18n)
export const RANDOM_EVENTS = [
  { id: 'merchant', icon: '🎁', effect: 'merchant' },
  { id: 'chest', icon: '📦', effect: 'chest' },
  { id: 'rush', icon: '⚠️', effect: 'rush' },
  { id: 'heal', icon: '💚', effect: 'heal' }
]

export const WAVES = [
  // 森林区 (1-5波)
  {
    id: 1,
    zone: 'forest',
    nameKey: 'waves.wave1',
    enemies: [
      { type: 'goblin', count: 8, interval: 1.5 }
    ]
  },
  {
    id: 2,
    zone: 'forest',
    nameKey: 'waves.wave2',
    enemies: [
      { type: 'goblin', count: 12, interval: 1.2 },
      { type: 'orc', count: 3, interval: 2 }
    ]
  },
  {
    id: 3,
    zone: 'forest',
    nameKey: 'waves.wave3',
    enemies: [
      { type: 'orc', count: 8, interval: 1.5 },
      { type: 'troll', count: 2, interval: 3 }
    ]
  },
  {
    id: 4,
    zone: 'forest',
    nameKey: 'waves.wave4',
    enemies: [
      { type: 'goblin', count: 15, interval: 0.8 },
      { type: 'orc', count: 10, interval: 1.2 },
      { type: 'troll', count: 4, interval: 2.5 }
    ]
  },
  {
    id: 5,
    zone: 'forest',
    nameKey: 'waves.wave5',
    enemies: [
      { type: 'orc', count: 12, interval: 1 },
      { type: 'troll', count: 6, interval: 2 },
      { type: 'boss', count: 1, interval: 1, delay: 5 }
    ]
  },
  // 山洞区 (6-10波)
  {
    id: 6,
    zone: 'cave',
    nameKey: 'waves.wave6',
    enemies: [
      { type: 'bat', count: 20, interval: 0.5 },
      { type: 'goblin', count: 5, interval: 2 }
    ]
  },
  {
    id: 7,
    zone: 'cave',
    nameKey: 'waves.wave7',
    enemies: [
      { type: 'golem', count: 4, interval: 3 },
      { type: 'bat', count: 10, interval: 0.8 }
    ]
  },
  {
    id: 8,
    zone: 'cave',
    nameKey: 'waves.wave8',
    enemies: [
      { type: 'orc', count: 10, interval: 1 },
      { type: 'golem', count: 3, interval: 4 },
      { type: 'bat', count: 15, interval: 0.6 }
    ]
  },
  {
    id: 9,
    zone: 'cave',
    nameKey: 'waves.wave9',
    enemies: [
      { type: 'golem', count: 6, interval: 2.5 },
      { type: 'troll', count: 5, interval: 2 }
    ]
  },
  {
    id: 10,
    zone: 'cave',
    nameKey: 'waves.wave10',
    enemies: [
      { type: 'bat', count: 25, interval: 0.4 },
      { type: 'golem', count: 5, interval: 3 },
      { type: 'boss', count: 1, interval: 1, delay: 8 }
    ]
  },
  // 火山区 (11-15波)
  {
    id: 11,
    zone: 'volcano',
    nameKey: 'waves.wave11',
    enemies: [
      { type: 'goblin', count: 20, interval: 0.5 },
      { type: 'orc', count: 15, interval: 0.8 },
      { type: 'bat', count: 20, interval: 0.5 }
    ]
  },
  {
    id: 12,
    zone: 'volcano',
    nameKey: 'waves.wave12',
    enemies: [
      { type: 'orc', count: 20, interval: 0.6 },
      { type: 'troll', count: 10, interval: 1.5 },
      { type: 'golem', count: 8, interval: 2 }
    ]
  },
  {
    id: 13,
    zone: 'volcano',
    nameKey: 'waves.wave13',
    enemies: [
      { type: 'bat', count: 40, interval: 0.3 },
      { type: 'goblin', count: 15, interval: 1 }
    ]
  },
  {
    id: 14,
    zone: 'volcano',
    nameKey: 'waves.wave14',
    enemies: [
      { type: 'golem', count: 10, interval: 2 },
      { type: 'troll', count: 15, interval: 1.2 },
      { type: 'orc', count: 25, interval: 0.5 }
    ]
  },
  {
    id: 15,
    zone: 'volcano',
    nameKey: 'waves.wave15',
    enemies: [
      { type: 'boss', count: 3, interval: 10, delay: 0 },
      { type: 'troll', count: 20, interval: 1 },
      { type: 'golem', count: 15, interval: 1.5 }
    ]
  }
]

// 游戏场景配置
export const GAME_CONFIG = {
  baseHp: 20,
  startingGold: 100,
  waveInterval: 10,
  pathWidth: 1.5
}

// 关卡配置
export const LEVEL_CONFIG = [
  // 森林区 (1-5): 单通道，地图20x20
  {
    id: 1,
    mapSize: 20,
    theme: 'forest',
    zone: 'forest',
    paths: [
      { id: 'main', points: [{x:-8,z:-8},{x:-8,z:-2},{x:-3,z:-2},{x:-3,z:4},{x:4,z:4},{x:4,z:-4},{x:8,z:-4},{x:8,z:6}] }
    ],
    pathDistribution: [100] // 100%走路径1
  },
  {
    id: 2,
    mapSize: 20,
    theme: 'forest',
    zone: 'forest',
    paths: [
      { id: 'main', points: [{x:-8,z:-6},{x:-4,z:-6},{x:-4,z:0},{x:0,z:0},{x:0,z:-6},{x:6,z:-6},{x:6,z:6}] }
    ],
    pathDistribution: [100]
  },
  {
    id: 3,
    mapSize: 20,
    theme: 'forest',
    zone: 'forest',
    paths: [
      { id: 'main', points: [{x:-8,z:-8},{x:-8,z:2},{x:-2,z:2},{x:-2,z:-2},{x:6,z:-2},{x:6,z:6},{x:2,z:6},{x:2,z:8},{x:8,z:8}] }
    ],
    pathDistribution: [100]
  },
  {
    id: 4,
    mapSize: 20,
    theme: 'forest',
    zone: 'forest',
    paths: [
      { id: 'main', points: [{x:-6,z:-8},{x:-6,z:-4},{x:0,z:-4},{x:0,z:4},{x:6,z:4},{x:6,z:-2},{x:8,z:-2}] }
    ],
    pathDistribution: [100]
  },
  {
    id: 5,
    mapSize: 22,
    theme: 'forest',
    zone: 'forest',
    paths: [
      { id: 'main', points: [{x:-9,z:-9},{x:-9,z:0},{x:-4,z:0},{x:-4,z:-4},{x:4,z:-4},{x:4,z:2},{x:9,z:2},{x:9,z:7}] }
    ],
    pathDistribution: [100]
  },
  // 山洞区 (6-10): 双通道，地图25x25
  {
    id: 6,
    mapSize: 25,
    theme: 'cave',
    zone: 'cave',
    paths: [
      { id: 'left', points: [{x:-10,z:-10},{x:-10,z:-2},{x:-6,z:-2},{x:-6,z:4},{x:0,z:4},{x:0,z:8},{x:8,z:8}] },
      { id: 'right', points: [{x:10,z:-10},{x:10,z:0},{x:6,z:0},{x:6,z:6},{x:0,z:6}] }
    ],
    pathDistribution: [50, 50]
  },
  {
    id: 7,
    mapSize: 25,
    theme: 'cave',
    zone: 'cave',
    paths: [
      { id: 'left', points: [{x:-10,z:-8},{x:-10,z:-4},{x:-5,z:-4},{x:-5,z:2},{x:0,z:2},{x:0,z:8},{x:8,z:8}] },
      { id: 'right', points: [{x:10,z:-8},{x:10,z:-2},{x:5,z:-2},{x:5,z:5},{x:0,z:5}] }
    ],
    pathDistribution: [50, 50]
  },
  {
    id: 8,
    mapSize: 25,
    theme: 'cave',
    zone: 'cave',
    paths: [
      { id: 'left', points: [{x:-11,z:-11},{x:-11,z:0},{x:-6,z:0},{x:-6,z:-5},{x:0,z:-5},{x:0,z:6},{x:8,z:6}] },
      { id: 'right', points: [{x:11,z:-11},{x:11,z:-4},{x:4,z:-4},{x:4,z:4},{x:0,z:4}] }
    ],
    pathDistribution: [50, 50]
  },
  {
    id: 9,
    mapSize: 25,
    theme: 'cave',
    zone: 'cave',
    paths: [
      { id: 'left', points: [{x:-10,z:-10},{x:-10,z:-3},{x:-4,z:-3},{x:-4,z:3},{x:0,z:3},{x:0,z:8},{x:8,z:8}] },
      { id: 'right', points: [{x:10,z:-10},{x:10,z:-5},{x:3,z:-5},{x:3,z:5},{x:0,z:5}] }
    ],
    pathDistribution: [50, 50]
  },
  {
    id: 10,
    mapSize: 26,
    theme: 'cave',
    zone: 'cave',
    paths: [
      { id: 'left', points: [{x:-11,z:-11},{x:-11,z:-4},{x:-5,z:-4},{x:-5,z:4},{x:0,z:4},{x:0,z:9},{x:9,z:9}] },
      { id: 'right', points: [{x:11,z:-11},{x:11,z:-6},{x:4,z:-6},{x:4,z:6},{x:0,z:6}] }
    ],
    pathDistribution: [50, 50]
  },
  // 火山区 (11-15): 三通道，地图30x30
  {
    id: 11,
    mapSize: 30,
    theme: 'volcano',
    zone: 'volcano',
    paths: [
      { id: 'left', points: [{x:-13,z:-13},{x:-13,z:-6},{x:-8,z:-6},{x:-8,z:0},{x:0,z:0},{x:0,z:10},{x:10,z:10}] },
      { id: 'middle', points: [{x:0,z:-13},{x:0,z:-5},{x:0,z:0}] },
      { id: 'right', points: [{x:13,z:-13},{x:13,z:-8},{x:8,z:-8},{x:8,z:2},{x:0,z:2}] }
    ],
    pathDistribution: [40, 30, 30]
  },
  {
    id: 12,
    mapSize: 30,
    theme: 'volcano',
    zone: 'volcano',
    paths: [
      { id: 'left', points: [{x:-13,z:-12},{x:-13,z:-4},{x:-7,z:-4},{x:-7,z:4},{x:0,z:4},{x:0,z:10},{x:10,z:10}] },
      { id: 'middle', points: [{x:-4,z:-13},{x:-4,z:-6},{x:0,z:-6},{x:0,z:0}] },
      { id: 'right', points: [{x:13,z:-12},{x:13,z:-5},{x:5,z:-5},{x:5,z:3},{x:0,z:3}] }
    ],
    pathDistribution: [35, 35, 30]
  },
  {
    id: 13,
    mapSize: 30,
    theme: 'volcano',
    zone: 'volcano',
    paths: [
      { id: 'left', points: [{x:-14,z:-14},{x:-14,z:-5},{x:-8,z:-5},{x:-8,z:2},{x:0,z:2},{x:0,z:10},{x:10,z:10}] },
      { id: 'middle', points: [{x:0,z:-14},{x:0,z:-8},{x:0,z:0}] },
      { id: 'right', points: [{x:14,z:-14},{x:14,z:-6},{x:6,z:-6},{x:6,z:4},{x:0,z:4}] }
    ],
    pathDistribution: [33, 34, 33]
  },
  {
    id: 14,
    mapSize: 30,
    theme: 'volcano',
    zone: 'volcano',
    paths: [
      { id: 'left', points: [{x:-13,z:-13},{x:-13,z:-4},{x:-6,z:-4},{x:-6,z:3},{x:0,z:3},{x:0,z:10},{x:10,z:10}] },
      { id: 'middle', points: [{x:-5,z:-13},{x:-5,z:-7},{x:0,z:-7},{x:0,z:0}] },
      { id: 'right', points: [{x:13,z:-13},{x:13,z:-5},{x:5,z:-5},{x:5,z:5},{x:0,z:5}] }
    ],
    pathDistribution: [33, 33, 34]
  },
  {
    id: 15,
    mapSize: 32,
    theme: 'volcano',
    zone: 'volcano',
    paths: [
      { id: 'left', points: [{x:-14,z:-14},{x:-14,z:-5},{x:-7,z:-5},{x:-7,z:4},{x:0,z:4},{x:0,z:11},{x:11,z:11}] },
      { id: 'middle', points: [{x:-6,z:-14},{x:-6,z:-8},{x:0,z:-8},{x:0,z:0}] },
      { id: 'right', points: [{x:14,z:-14},{x:14,z:-6},{x:6,z:-6},{x:6,z:6},{x:0,z:6}] }
    ],
    pathDistribution: [33, 33, 34]
  }
]

// 主题配色 - 调亮以便可见
export const THEME_CONFIG = {
  forest: {
    groundColor: 0x3D6B3D,
    pathColor: 0x8B7355,
    gridColor: 0x4a7a4a,
    fogColor: 0x2d4a2d,
    decorationColor: 0x228B22
  },
  cave: {
    groundColor: 0x4a4a5a,
    pathColor: 0x7a7a8a,
    gridColor: 0x5a5a6a,
    fogColor: 0x3a3a4a,
    decorationColor: 0x6a6a7a
  },
  volcano: {
    groundColor: 0x6a3a3a,
    pathColor: 0x9a6a4a,
    gridColor: 0x7a4a4a,
    fogColor: 0x5a2a2a,
    decorationColor: 0x9a3030
  }
}

// 路径控制点 (Catmull-Rom曲线) - 兼容旧代码
export const PATH_POINTS = LEVEL_CONFIG[0].paths[0].points
