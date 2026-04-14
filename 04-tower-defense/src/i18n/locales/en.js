/**
 * English translations
 */
export default {
  // Common UI elements
  common: {
    gold: 'Gold',
    hp: 'HP',
    enemies: 'Enemies',
    wave: 'Wave',
    start: 'Start',
    close: 'Close',
    upgrade: 'Upgrade',
    sell: 'Sell',
    restart: 'Play Again',
    retry: 'Retry',
    backToMenu: 'Main Menu',
    next: 'Next',
    skip: 'Skip',
    continue: 'Continue',
  },

  // Tower panel
  towerPanel: {
    title: 'Select Tower',
    hint: 'Click on empty ground to build',
  },

  // Tower types
  towers: {
    arrow: {
      name: 'Arrow Tower',
      desc: 'Fast attack, single target'
    },
    magic: {
      name: 'Magic Tower',
      desc: 'Long range, high damage'
    },
    cannon: {
      name: 'Cannon Tower',
      desc: 'Splash damage'
    },
    ice: {
      name: 'Ice Tower',
      desc: 'Slows enemies'
    },
  },

  // Tower info panel
  towerInfo: {
    title: 'Tower Info',
    damage: 'Damage',
    range: 'Range',
    fireRate: 'Fire Rate',
    perSecond: '/s',
  },

  // Enemy types
  enemies: {
    goblin: 'Goblin',
    orc: 'Orc Warrior',
    troll: 'Troll',
    boss: 'Goblin King',
    bat: 'Bat',
    golem: 'Golem',
  },

  // Wave names
  waves: {
    wave1: 'Goblin Raid',
    wave2: 'Orc Reinforcements',
    wave3: 'Troll Attack',
    wave4: 'Army Advancing',
    wave5: 'Forest Boss',
    wave6: 'Bat Swarm',
    wave7: 'Golem Invasion',
    wave8: 'Mixed Assault',
    wave9: 'Golem Legion',
    wave10: 'Cave Boss Battle',
    wave11: 'Full Offensive',
    wave12: 'Elite Forces',
    wave13: 'Air Superiority',
    wave14: 'Final Preparation',
    wave15: 'Ultimate Boss Battle',
    endless: 'Endless Wave {n}',
  },

  // Difficulty
  difficulty: {
    title: 'Select Difficulty',
    subtitle: 'Difficulty affects enemy stats and gold rewards',
    startBtn: 'Start Challenge',
    easy: {
      name: 'Easy',
      desc: 'Weakened enemies, bonus gold'
    },
    normal: {
      name: 'Normal',
      desc: 'Standard difficulty'
    },
    hard: {
      name: 'Hard',
      desc: 'Stronger enemies, faster movement'
    },
    nightmare: {
      name: 'Nightmare',
      desc: 'Extreme challenge'
    },
  },

  // Skill cards
  skillCards: {
    title: 'Select Skill Card',
    skipBtn: 'Skip (No skill this wave)',
    freeze: {
      name: 'Freeze All',
      desc: 'Enemy speed -50% this wave'
    },
    gold2x: {
      name: 'Double Gold',
      desc: 'Gold reward x2 this wave'
    },
    repair: {
      name: 'Emergency Repair',
      desc: 'Restore 10 HP to base'
    },
    lightning: {
      name: 'Lightning Strike',
      desc: 'Instantly kill 1 enemy at wave start'
    },
    shield: {
      name: 'Shield',
      desc: 'Base invincible once this wave'
    },
  },

  // Random events
  events: {
    merchant: {
      name: 'Mysterious Merchant',
      desc: 'Random tower at half price'
    },
    chest: {
      name: 'Mimic Chest',
      desc: 'Defeat to gain 50-100 gold'
    },
    rush: {
      name: 'Rush Wave',
      desc: 'Two waves with no break'
    },
    heal: {
      name: 'Healing Spring',
      desc: 'All enemies heal 20%'
    },
  },

  // Game states
  game: {
    victory: 'Victory!',
    victoryDesc: 'You defended the Magic Forest!',
    gameOver: 'Game Over',
    gameOverDesc: 'The temple was breached...',
    waveComplete: 'Wave {n} Complete!',
    surviveScore: 'Survived waves: {n}',
    victoryScore: 'Remaining HP: {hp} | Remaining Gold: {gold}',
    startWave: 'Start Wave',
    waveInProgress: 'Wave in progress...',
    endlessMode: 'Endless Mode',
    enterEndless: 'Entering Endless Mode!',
    enterEndlessDesc: 'Challenge your limits!',
    bestWave: 'Best Wave: {n}',
    ready: 'Ready',
  },

  // Wave complete modal
  waveComplete: {
    survived: 'Survived',
    goldCollected: 'Gold',
    nextWave: 'Next Wave',
    continueBtn: 'Continue',
    menuBtn: 'Main Menu',
  },

  // Start screen
  startScreen: {
    title: 'Magic Forest TD',
    subtitle: 'Tower Defense',
    description: 'Defend the temple against the goblin army!\nBuild towers on empty ground, defeat enemies to earn gold',
    controls: {
      leftClick: 'Left Click: Build/Select Tower',
      rightClick: 'Right Click: Rotate View',
      scroll: 'Scroll: Zoom',
    },
    startBtn: 'Start Game',
  },

  // Tutorial
  tutorial: {
    step1: 'Welcome to Magic Forest Tower Defense!',
    step1Hint: 'First, select a tower from the left panel',
    step2: 'Click on the tower type you want to build',
    step2Hint: 'Then click on empty ground to build',
    step3: 'After building, click "Start Wave" to begin',
    step3Hint: 'Defeat enemies to earn gold, protect the temple!',
    nextBtn: 'Next',
    skipBtn: 'Skip Tutorial',
  },

  // Float text messages
  messages: {
    notEnoughGold: 'Not enough gold!',
    tooCloseToPath: 'Too close to path!',
    alreadyBuilt: 'Space occupied!',
    upgraded: 'Upgraded!',
    slowed: 'Slowed!',
    lightningKill: 'Lightning Kill!',
    shieldBlock: 'Shield blocked!',
    merchantArrived: 'Mysterious Merchant arrived!',
    enemyHealed: 'Enemies healed!',
    bossKilled: 'Boss Killed!',
  },

  // Wave titles
  waveTitles: {
    forest: 'Magic Forest',
    forestDesc: 'Defend the temple, repel the invasion',
    cave: 'Dark Cave',
    caveDesc: 'Beware of flying enemies',
    volcano: 'Volcanic Depths',
    volcanoDesc: 'The final challenge',
  },

  // Camera view controls
  camera: {
    top: 'Top',
    default: 'ISO',
    low: 'Low',
    tooltip: 'Switch View (1/2/3)',
  },
}
