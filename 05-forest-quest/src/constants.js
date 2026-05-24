/**
 * Game constants — physics, colors, level configs
 * Sourced from DESIGN.md §5 Physics Parameters
 */

// ── Physics ───────────────────────────────────────────────
export const GRAVITY = 25.0
export const JUMP_V0 = 10.0
export const JUMP_V1 = 8.0
export const WALK_SPEED = 5.0
export const RUN_MULT = 1.6
export const AIR_CONTROL = 0.6
export const MAX_FALL_SPEED = 20.0
export const GROUND_FRICTION = 12.0
export const TURN_SPEED = 12.0
export const MAX_JUMPS = 2

// ── Player / Camera grouped configs (Phase 3-2) ───────────
export const PLAYER = {
  moveSpeed: 6,
  runMultiplier: 1.6,
  jumpV0: 10,
  jumpV1: 8,
  gravity: 25,
  maxFallSpeed: 30,
  groundCheckDist: 0.05,
  turnLerp: 0.2,
  bouncyImpulse: 18,
  stompImpulse: 8,
  coyoteTime: 0.12,
  jumpBufferTime: 0.1,
  airControl: 0.7,
  edgeAssist: 0.3,
}

export const CAMERA = {
  offset: [0, 5, -8],
  lerp: 0.1,
  lookAtHeight: 1.2,
  dragSensitivity: 0.007,
  pitchMin: -0.3,
  pitchMax: 1.2,
  autoFollowDelay: 1.5,
  autoFollowSpeed: 2.5,
}

// ── Collision / sizing ────────────────────────────────────
export const PLAYER_AABB = { w: 0.4, h: 0.8, d: 0.4 }
export const PLATFORM_COLLISION_THICKNESS = 0.2
export const FALL_BOUND = -15.0

// ── Camera ────────────────────────────────────────────────
export const CAM_DIST = 10.0
export const CAM_HEIGHT = 3.5
export const CAM_LERP = 0.12
export const CAM_FOV_BASE = 60
export const CAM_FOV_RUN = 63
export const CAM_NEAR = 0.1
export const CAM_FAR = 500

// ── Colors (low-poly palette) ─────────────────────────────
export const FOREST_GREEN = 0x6B8E5A
export const SKY_BLUE = 0xB8D8FF
export const CRYSTAL_CYAN = 0x00B4D8
export const PORTAL_PURPLE = 0x7B2CBF
export const FOX_ORANGE = 0xFF8A3D
export const MUSHROOM_RED = 0xE63946
export const WOOD_BROWN = 0xD4A373

// ── Audio event hooks ( Phase 4-5 placeholders ) ──────────
export const AUDIO_EVENTS = Object.freeze({
  onJump: 'onJump',
  onCollect: 'onCollect',
  onHurt: 'onHurt',
  onBossEnter: 'onBossEnter',
  onLevelComplete: 'onLevelComplete',
})

// ── Save / storage ────────────────────────────────────────
export const SAVE_KEY = 'forest_quest_save'
export const LOCALE_KEY = 'forest-quest-locale'
