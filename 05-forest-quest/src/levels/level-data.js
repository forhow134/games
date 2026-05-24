export const LEVELS = [
  {
    id: 1,
    nameKey: 'level.1.name',
    theme: 'forest-entry',
    playerStart: [0, 2, 0],
    platforms: [
      // Starting ground
      { pos: [0, 0, 0], size: [4, 0.5, 4], asset: 'platform-wood' },
      // First small step
      { pos: [4, 0.5, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Slight rise
      { pos: [7, 1.0, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Gap requiring single jump
      { pos: [10, 1.5, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Mid platform with side branch
      { pos: [13, 2.0, 0], size: [3, 0.5, 3], asset: 'platform-wood' },
      // Branch platform left
      { pos: [13, 2.0, -3], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Higher step
      { pos: [17, 2.5, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Double-jump gap
      { pos: [21, 3.5, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Pre-final platform
      { pos: [25, 4.0, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Final high platform near portal
      { pos: [29, 4.5, 0], size: [3, 0.5, 3], asset: 'platform-wood' },
    ],
    crystals: [
      { pos: [4, 1.8, 0] },
      { pos: [7, 2.3, 0] },
      { pos: [10, 2.8, 0.8] },
      { pos: [13, 2.8, 0] },
      { pos: [13, 2.8, -3] },
      { pos: [17, 3.3, 0] },
      { pos: [21, 4.3, 0] },
      { pos: [25, 4.8, 0] },
      { pos: [29, 5.3, 0] },
      { pos: [30, 5.3, 2] },
    ],
    enemies: [],
    hazards: [],
    portal: { pos: [30, 5.5, 0], unlock: 'complete' },
  },
  {
    id: 2,
    nameKey: 'level.2.name',
    theme: 'forest-deep',
    playerStart: [0, 2, 0],
    platforms: [
      // Start
      { pos: [0, 0, 0], size: [4, 0.5, 4], asset: 'platform-wood' },
      // Static mid-left
      { pos: [4, 0.5, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Static mid
      { pos: [8, 1.0, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Static right
      { pos: [14, 1.5, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Static high
      { pos: [20, 2.5, 0], size: [2, 0.5, 2], asset: 'platform-wood' },
      // Static pre-portal
      { pos: [30, 3.5, 0], size: [3, 0.5, 3], asset: 'platform-wood' },
      // Moving platforms bridging gaps
      { pos: [6, 1.5, 0], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'vertical', range: 2, speed: 1.5, phase: 0 } },
      { pos: [11, 2.0, 0], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'horizontal', range: 3, speed: 1.2, phase: 0 } },
      { pos: [17, 2.0, 0], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'vertical', range: 2.5, speed: 1.8, phase: 1.5 } },
      { pos: [24, 3.0, 0], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'horizontal', range: 4, speed: 1.0, phase: 0.5 } },
      { pos: [27, 3.5, 0], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'vertical', range: 1.5, speed: 2.0, phase: 2.0 } },
    ],
    crystals: [
      { pos: [4, 1.8, 0] },
      { pos: [8, 2.3, 0] },
      { pos: [6, 3.0, 0] },   // on moving vertical
      { pos: [11, 3.0, 0] },  // on moving horizontal
      { pos: [14, 2.3, 0] },
      { pos: [17, 3.5, 0] },  // on moving vertical
      { pos: [20, 3.3, 0] },
      { pos: [24, 4.0, 0] },  // on moving horizontal
      { pos: [27, 4.5, 0] },  // on moving vertical
      { pos: [30, 4.3, 0] },
    ],
    enemies: [
      { type: 'mushroom', pos: [4, 1.5, 0], patrolRange: 2, detectRange: 0, damage: 1, hp: 1, stompable: true },
      { type: 'mushroom', pos: [14, 2.5, 0], patrolRange: 2, detectRange: 0, damage: 1, hp: 1, stompable: true },
    ],
    hazards: [],
    portal: { pos: [32, 4.0, 0], unlock: 'complete' },
  },
  {
    id: 3,
    nameKey: 'level.3.name',
    theme: 'canyon',
    playerStart: [0, 2, 0],
    platforms: [
      // Start
      { pos: [0, 0, 0], size: [4, 0.5, 4], asset: 'platform-stone' },
      // Narrow bridge 1
      { pos: [4, 0.5, 0], size: [1, 0.5, 2], asset: 'platform-stone' },
      // Mid platform
      { pos: [7, 1.0, 0], size: [3, 0.5, 3], asset: 'platform-stone' },
      // Narrow bridge 2
      { pos: [10, 1.0, 0], size: [1, 0.5, 2], asset: 'platform-stone' },
      // Lower platform with trap nearby
      { pos: [13, 0.5, 0], size: [2, 0.5, 2], asset: 'platform-stone' },
      // Rising narrow
      { pos: [16, 1.5, 0], size: [1, 0.5, 2], asset: 'platform-stone' },
      // Wide mid-high
      { pos: [20, 2.0, 0], size: [3, 0.5, 3], asset: 'platform-stone' },
      // Narrow bridge 3
      { pos: [24, 2.0, 0], size: [1, 0.5, 2], asset: 'platform-stone' },
      // Pre-final
      { pos: [28, 2.5, 0], size: [2, 0.5, 2], asset: 'platform-stone' },
      // Final platform near portal
      { pos: [32, 3.0, 0], size: [3, 0.5, 3], asset: 'platform-stone' },
    ],
    crystals: [
      { pos: [4, 1.8, 0] },
      { pos: [7, 2.3, 0] },
      { pos: [10, 2.3, 0] },
      { pos: [13, 1.8, 0] },
      { pos: [16, 2.8, 0] },
      { pos: [20, 3.3, 0] },
      { pos: [24, 3.3, 0] },
      { pos: [28, 3.8, 0] },
      { pos: [32, 4.3, 0] },
      { pos: [34, 4.3, 2] },
    ],
    enemies: [
      { type: 'mushroom', pos: [8, 2, 5], patrolRange: 3, detectRange: 0, damage: 1, hp: 1, stompable: true },
      { type: 'mushroom', pos: [20, 2, 10], patrolRange: 4, detectRange: 0, damage: 1, hp: 1, stompable: true },
      { type: 'sprite', pos: [15, 4, 8], patrolRange: 0, detectRange: 8, damage: 1, hp: 1, stompable: false },
    ],
    hazards: [
      // Spike on narrow bridge 1 edge
      { type: 'spike', pos: [4, 0.5, 1.5], size: [1.5, 0.4, 0.8], damage: 1, active: true },
      // Spike on narrow bridge 2 edge
      { type: 'spike', pos: [10, 1.0, -1.5], size: [1.5, 0.4, 0.8], damage: 1, active: true },
      // Spike near lower platform
      { type: 'spike', pos: [13, 0.5, 1.5], size: [1.5, 0.4, 0.8], damage: 1, active: true },
      // Spike on narrow bridge 3
      { type: 'spike', pos: [24, 2.0, 1.5], size: [1.5, 0.4, 0.8], damage: 1, active: true },
      // Fire wall near mid platform
      { type: 'fire', pos: [7, 1.0, -2.5], size: [0.6, 0.8, 0.6], damage: 1, active: true, cycle: { onMs: 2000, offMs: 2000, phase: 0 } },
      // Fire wall near rising narrow
      { type: 'fire', pos: [16, 1.5, 2.0], size: [0.6, 0.8, 0.6], damage: 1, active: true, cycle: { onMs: 2000, offMs: 2000, phase: 1000 } },
      // Fire wall near pre-final
      { type: 'fire', pos: [28, 2.5, -2.0], size: [0.6, 0.8, 0.6], damage: 1, active: true, cycle: { onMs: 2000, offMs: 2000, phase: 500 } },
    ],
    portal: { pos: [35, 3.5, 0], unlock: 'complete' },
  },
  {
    id: 4,
    nameKey: 'level.4.name',
    theme: 'cave-entry',
    playerStart: [0, 2, 0],
    // L4 — vertical climb built around bouncy platforms. The path is a
    // staircase folded through space: every platform sits at a unique (x,z),
    // so nothing is ever directly overhead to block a jump or a bounce.
    platforms: [
      // Ground start
      { pos: [0, 0, 0], size: [4, 0.5, 4], asset: 'platform-stone' },
      // Bounce 1 — hop here from the start platform
      { pos: [0, 0.5, -3], size: [2.5, 0.5, 2.5], asset: 'platform-bouncy' },
      // Landing 1
      { pos: [0, 5.0, -6], size: [3, 0.5, 3], asset: 'platform-stone' },
      // Bounce 2
      { pos: [3, 5.5, -6], size: [2.5, 0.5, 2.5], asset: 'platform-bouncy' },
      // Landing 2
      { pos: [6, 10.0, -6], size: [3, 0.5, 3], asset: 'platform-stone' },
      // Bounce 3
      { pos: [6, 10.5, -3], size: [2.5, 0.5, 2.5], asset: 'platform-bouncy' },
      // Landing 3
      { pos: [6, 15.0, 0], size: [3, 0.5, 3], asset: 'platform-stone' },
      // Bounce 4 — final launch to the top
      { pos: [3, 15.5, 0], size: [2.5, 0.5, 2.5], asset: 'platform-bouncy' },
      // Top landing before portal
      { pos: [0, 20.0, 0], size: [4, 0.5, 4], asset: 'platform-stone' },
    ],
    crystals: [
      { pos: [0, 1.3, 0] },       // start platform
      { pos: [0, 2.0, -3] },      // above bounce 1
      { pos: [0, 3.2, -4.5] },    // mid-air on the bounce-1 arc
      { pos: [0, 6.3, -6] },      // landing 1
      { pos: [3, 6.8, -6] },      // above bounce 2
      { pos: [4.5, 8.2, -6] },    // mid-air on the bounce-2 arc
      { pos: [6, 11.3, -6] },     // landing 2
      { pos: [6, 12.5, -1.5] },   // mid-air on the bounce-3 arc
      { pos: [6, 16.3, 0] },      // landing 3
      { pos: [0, 21.0, 0] },      // top platform
    ],
    enemies: [],
    hazards: [],
    portal: { pos: [0, 20.5, 0], unlock: 'complete' },
  },
  {
    id: 5,
    nameKey: 'level.5.name',
    theme: 'cave-depth',
    playerStart: [0, 2, 0],
    platforms: [
      // Start ground
      { pos: [0, 0, 0], size: [4, 0.5, 4], asset: 'platform-stone' },
      // First static step
      { pos: [5, 0.5, 0], size: [2, 0.5, 2], asset: 'platform-stone' },
      // Moving horizontal 1
      { pos: [9, 1.0, 0], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'horizontal', range: 3, speed: 1.2, phase: 0 } },
      // Static mid
      { pos: [14, 1.5, 0], size: [2, 0.5, 2], asset: 'platform-stone' },
      // Moving vertical 1
      { pos: [14, 3.5, 2.5], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'vertical', range: 2, speed: 1.5, phase: 1 } },
      // Bouncy to upper route
      { pos: [10, 2.0, 0], size: [2, 0.5, 2], asset: 'platform-bouncy' },
      // Upper static
      { pos: [10, 5.0, 0], size: [2, 0.5, 2], asset: 'platform-stone' },
      // Moving horizontal 2 (high)
      { pos: [14, 5.5, 0], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'horizontal', range: 3, speed: 1.0, phase: 0.5 } },
      // Far static
      { pos: [20, 5.0, 0], size: [2, 0.5, 2], asset: 'platform-stone' },
      // Moving vertical 2
      { pos: [20, 7.0, 2], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'vertical', range: 2.5, speed: 1.8, phase: 2 } },
      // Bouncy to high platform
      { pos: [24, 4.0, 0], size: [2, 0.5, 2], asset: 'platform-bouncy' },
      // High static
      { pos: [28, 7.0, 0], size: [2, 0.5, 2], asset: 'platform-stone' },
      // Pre-portal static
      { pos: [34, 4.0, 0], size: [3, 0.5, 3], asset: 'platform-stone' },
      // Moving horizontal 3 leading to portal
      { pos: [38, 4.5, 0], size: [2, 0.25, 2], asset: 'platform-moving', motion: { type: 'horizontal', range: 2, speed: 1.3, phase: 1.5 } },
    ],
    crystals: [
      { pos: [5, 1.8, 0] },
      { pos: [9, 2.5, 0] },       // on moving horizontal 1
      { pos: [14, 2.3, 0] },
      { pos: [10, 3.0, 0] },      // above bouncy (needs bounce + air control)
      { pos: [14, 5.0, 2.5] },    // on moving vertical 1
      { pos: [20, 6.0, 0] },
      { pos: [24, 5.5, 0] },      // above bouncy 2
      { pos: [28, 8.0, 0] },      // high platform
      { pos: [34, 5.3, 0] },
      { pos: [38, 5.5, 0] },      // on moving horizontal 3
    ],
    enemies: [
      { type: 'golem', pos: [10, 1, 5], patrolRange: 0, detectRange: 5, damage: 1, hp: 2, stompable: true },
      { type: 'sprite', pos: [20, 5, 10], patrolRange: 0, detectRange: 8, damage: 1, hp: 1, stompable: false },
      { type: 'sprite', pos: [30, 6, 15], patrolRange: 0, detectRange: 8, damage: 1, hp: 1, stompable: false },
      { type: 'golem', pos: [35, 1, 20], patrolRange: 0, detectRange: 5, damage: 1, hp: 2, stompable: true },
      { type: 'mushroom', pos: [25, 2, 18], patrolRange: 3, detectRange: 0, damage: 1, hp: 1, stompable: true },
    ],
    hazards: [
      // Spike near start side
      { type: 'spike', pos: [2, 0.5, 2.5], size: [1.5, 0.4, 0.8], damage: 1, active: true },
      // Spike under mid gap
      { type: 'spike', pos: [7, 0.5, -2], size: [1.5, 0.4, 0.8], damage: 1, active: true },
      // Spike near moving vertical 1
      { type: 'spike', pos: [16, 1.5, 2.5], size: [1.5, 0.4, 0.8], damage: 1, active: true },
      // Fire wall left of upper route
      { type: 'fire', pos: [8, 2.0, -2], size: [0.6, 0.8, 0.6], damage: 1, active: true, cycle: { onMs: 2000, offMs: 2000, phase: 0 } },
      // Fire wall near far static
      { type: 'fire', pos: [22, 5.0, -2], size: [0.6, 0.8, 0.6], damage: 1, active: true, cycle: { onMs: 2000, offMs: 2000, phase: 1000 } },
    ],
    decor: [
      { asset: 'stalagmite', pos: [3, 0, 2], scale: 1 },
      { asset: 'stalagmite', pos: [12, 0, -2], scale: 1.2 },
      { asset: 'stalagmite', pos: [18, 0, 3], scale: 0.8 },
      { asset: 'stalagmite', pos: [26, 0, -3], scale: 1.1 },
      { asset: 'stalagmite', pos: [32, 0, 2], scale: 0.9 },
    ],
    portal: { pos: [40, 4.5, 0], unlock: 'complete' },
  },
  {
    id: 6,
    nameKey: 'level.6.name',
    theme: 'boss-arena',
    // Spawn at the arena edge, away from the Boss at [0, 0.5, 0]
    playerStart: [0, 2, -7],
    platforms: [
      // Main arena floor (large)
      { pos: [0, 0, 0], size: [20, 0.5, 20], asset: 'platform-stone' },
      // Four outer high platforms (escape / dodge spots)
      { pos: [-8, 3, -8], size: [4, 0.5, 4], asset: 'platform-stone' },
      { pos: [8, 3, -8], size: [4, 0.5, 4], asset: 'platform-stone' },
      { pos: [-8, 3, 8], size: [4, 0.5, 4], asset: 'platform-stone' },
      { pos: [8, 3, 8], size: [4, 0.5, 4], asset: 'platform-stone' },
    ],
    crystals: [
      { pos: [-6, 1, -6] },
      { pos: [6, 1, -6] },
      { pos: [-6, 1, 6] },
      { pos: [6, 1, 6] },
      { pos: [0, 1, 0] },
    ],
    enemies: [
      { type: 'boss', pos: [0, 0.5, 0], patrolRange: 0, detectRange: 0, damage: 1, hp: 8, stompable: true },
    ],
    hazards: [
      // Fire traps along walls for atmosphere
      { type: 'fire', pos: [-9, 0.5, 0], size: [0.6, 0.8, 0.6], damage: 1, active: true, cycle: { onMs: 3000, offMs: 1500, phase: 0 } },
      { type: 'fire', pos: [9, 0.5, 0], size: [0.6, 0.8, 0.6], damage: 1, active: true, cycle: { onMs: 3000, offMs: 1500, phase: 1500 } },
      { type: 'fire', pos: [0, 0.5, -9], size: [0.6, 0.8, 0.6], damage: 1, active: true, cycle: { onMs: 3000, offMs: 1500, phase: 750 } },
    ],
    decor: [
      { asset: 'rock-boulder', pos: [-5, 0, -5], scale: 1.5 },
      { asset: 'rock-boulder', pos: [5, 0, 5], scale: 1.2 },
      { asset: 'rock-boulder', pos: [-5, 0, 5], scale: 1.3 },
      { asset: 'rock-boulder', pos: [5, 0, -5], scale: 1.0 },
      { asset: 'rock-boulder', pos: [0, 0, -7], scale: 1.4 },
    ],
    boss: { pos: [0, 0.5, 0], asset: 'boss-stone-giant' },
    portal: { pos: [0, 1, 0], unlock: 'complete', hiddenUntilBossDefeated: true },
  },
]

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id)
}
