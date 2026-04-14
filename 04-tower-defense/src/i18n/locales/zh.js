/**
 * 中文翻译
 */
export default {
  // 通用UI元素
  common: {
    gold: '金币',
    hp: '生命',
    enemies: '敌人',
    wave: '波次',
    start: '开始',
    close: '关闭',
    upgrade: '升级',
    sell: '出售',
    restart: '再玩一次',
    retry: '重试',
    backToMenu: '返回主菜单',
    next: '下一步',
    skip: '跳过',
    continue: '继续',
  },

  // 塔选择面板
  towerPanel: {
    title: '选择防御塔',
    hint: '点击地图空地建造',
  },

  // 塔类型
  towers: {
    arrow: {
      name: '箭塔',
      desc: '快速射击，单体伤害'
    },
    magic: {
      name: '魔法塔',
      desc: '远程高伤，穿透攻击'
    },
    cannon: {
      name: '炮塔',
      desc: '范围溅射伤害'
    },
    ice: {
      name: '冰塔',
      desc: '减速敌人'
    },
  },

  // 塔信息面板
  towerInfo: {
    title: '防御塔信息',
    damage: '伤害',
    range: '射程',
    fireRate: '射速',
    perSecond: '/秒',
  },

  // 敌人类型
  enemies: {
    goblin: '哥布林',
    orc: '兽人战士',
    troll: '巨魔',
    boss: '哥布林王',
    bat: '蝙蝠',
    golem: '石头人',
  },

  // 波次名称
  waves: {
    wave1: '哥布林突袭',
    wave2: '兽人增援',
    wave3: '巨魔来袭',
    wave4: '大军压境',
    wave5: '第一关Boss',
    wave6: '蝙蝠群',
    wave7: '石头人入侵',
    wave8: '混合进攻',
    wave9: '石头人军团',
    wave10: '山洞Boss战',
    wave11: '全面进攻',
    wave12: '精英集结',
    wave13: '空中优势',
    wave14: '最终准备',
    wave15: '终极Boss战',
    endless: '无尽波次 {n}',
  },

  // 难度
  difficulty: {
    title: '选择难度',
    subtitle: '难度会影响敌人属性和金币收益',
    startBtn: '开始挑战',
    easy: {
      name: '简单',
      desc: '敌人弱化，金币加成'
    },
    normal: {
      name: '普通',
      desc: '标准难度'
    },
    hard: {
      name: '困难',
      desc: '敌人强化，移速加快'
    },
    nightmare: {
      name: '噩梦',
      desc: '极限挑战'
    },
  },

  // 技能卡
  skillCards: {
    title: '选择技能卡',
    skipBtn: '跳过（本波无技能）',
    freeze: {
      name: '冰冻全场',
      desc: '本波敌人移速-50%'
    },
    gold2x: {
      name: '金币双倍',
      desc: '本波金币奖励x2'
    },
    repair: {
      name: '紧急维修',
      desc: '恢复基地10HP'
    },
    lightning: {
      name: '闪电打击',
      desc: '波次开始时秒杀1个敌人'
    },
    shield: {
      name: '护盾',
      desc: '本波基地无敌1次'
    },
  },

  // 随机事件
  events: {
    merchant: {
      name: '神秘商人',
      desc: '随机塔半价'
    },
    chest: {
      name: '宝箱怪',
      desc: '击败获得50-100金币'
    },
    rush: {
      name: '紧急波次',
      desc: '连续2波无间隔'
    },
    heal: {
      name: '治疗之泉',
      desc: '所有敌人回血20%'
    },
  },

  // 游戏状态
  game: {
    victory: '胜利!',
    victoryDesc: '你成功守护了魔法森林!',
    gameOver: '失败',
    gameOverDesc: '神殿被攻陷了...',
    waveComplete: '第 {n} 关通过！',
    surviveScore: '存活波次: {n}',
    victoryScore: '剩余生命: {hp} | 剩余金币: {gold}',
    startWave: '开始波次',
    waveInProgress: '波次进行中...',
    endlessMode: '无尽模式',
    enterEndless: '进入无尽模式!',
    enterEndlessDesc: '挑战极限，存活更久',
    bestWave: '最高波次: {n}',
    ready: '准备就绪',
  },

  // 波次完成弹窗
  waveComplete: {
    survived: '存活',
    goldCollected: '金币',
    nextWave: '下一关',
    continueBtn: '继续挑战',
    menuBtn: '返回主菜单',
  },

  // 开始界面
  startScreen: {
    title: '魔法森林塔防',
    subtitle: 'Magic Forest TD',
    description: '守护神殿，抵御哥布林军团!\n点击空地建造防御塔，击败敌人获得金币',
    controls: {
      leftClick: '左键: 建造/选中塔',
      rightClick: '右键: 旋转视角',
      scroll: '滚轮: 缩放',
    },
    startBtn: '开始游戏',
  },

  // 新手引导
  tutorial: {
    step1: '欢迎来到魔法森林塔防！',
    step1Hint: '首先，选择左侧的防御塔',
    step2: '点击想要建造的塔类型',
    step2Hint: '然后在空地上点击建造',
    step3: '建造后，点击"开始波次"挑战',
    step3Hint: '击败敌人获得金币，保护神殿！',
    nextBtn: '下一步',
    skipBtn: '跳过引导',
  },

  // 浮动文字消息
  messages: {
    notEnoughGold: '金币不足!',
    tooCloseToPath: '离路径太近!',
    alreadyBuilt: '已有建筑!',
    upgraded: '升级!',
    slowed: '减速!',
    lightningKill: '闪电秒杀!',
    shieldBlock: '护盾抵挡!',
    merchantArrived: '神秘商人来访!',
    enemyHealed: '敌人回血了!',
    bossKilled: 'Boss击杀!',
  },

  // 波次标题
  waveTitles: {
    forest: '魔法森林',
    forestDesc: '守护神殿，抵御入侵',
    cave: '黑暗洞穴',
    caveDesc: '小心飞行敌人',
    volcano: '火山深渊',
    volcanoDesc: '最终挑战',
  },

  // 相机视角控制
  camera: {
    top: '俯视',
    default: '斜视',
    low: '低视',
    tooltip: '切换视角 (1/2/3)',
  },
}
