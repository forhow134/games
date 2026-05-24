import * as THREE from 'three'
import { loadAsset } from '../loaders/asset-loader.js'
import { MushroomEnemy } from '../enemies/enemy-mushroom.js'
import { SpriteEnemy } from '../enemies/enemy-sprite.js'
import { GolemEnemy } from '../enemies/enemy-golem.js'
import { Enemy } from '../enemies/enemy-base.js'
import { BossGiant } from '../enemies/enemy-boss.js'

/**
 * Load a level into the scene.
 * @param {THREE.Scene} scene
 * @param {number} levelId
 * @returns {Promise<{
 *   playerStart: THREE.Vector3,
 *   platformColliders: THREE.Box3[],
 *   platformMeshes: THREE.Object3D[],
 *   movingPlatforms: { mesh: THREE.Object3D, motion: object, basePos: THREE.Vector3, collider: THREE.Box3 }[],
 *   hazards: { mesh: THREE.Object3D, type: string, damage: number, cycle?: object, collider: THREE.Box3 }[],
 *   crystals: { mesh: THREE.Object3D, collider: THREE.Box3, collected: boolean }[],
 *   portal: { mesh: THREE.Object3D, collider: THREE.Box3, hiddenUntilBossDefeated?: boolean },
 *   enemies: Enemy[],
 *   cleanup: () => void
 * }>}
 */
/**
 * Apply a per-instance size override on top of the asset's intrinsic manifest
 * size. asset-loader normalizes every wrapper to its manifest.size (bottom-
 * centre at origin), so when def.size differs we scale the wrapper by the
 * ratio. This lets a level reuse a 4×0.5×4 platform asset and stretch it
 * into a 20×0.5×20 arena floor without per-asset assets.
 */
function applySize(obj, targetSize) {
  const baseSize = obj.userData?.targetSize
  if (!targetSize || !baseSize) return
  obj.scale.set(
    targetSize[0] / baseSize[0],
    targetSize[1] / baseSize[1],
    targetSize[2] / baseSize[2],
  )
}

export async function loadLevel(scene, levelId) {
  const { getLevel } = await import('./level-data.js')
  const level = getLevel(levelId)
  if (!level) throw new Error(`Level ${levelId} not found`)

  // Unload previous level if any
  if (scene.userData.currentLevelGroup) {
    scene.userData.currentLevelGroup.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material?.dispose()
        }
      }
    })
    scene.remove(scene.userData.currentLevelGroup)
    scene.userData.currentLevelGroup = null
  }

  const group = new THREE.Group()
  group.name = `level-${levelId}`
  scene.add(group)
  scene.userData.currentLevelGroup = group

  const platformColliders = []
  const platformMeshes = []
  const movingPlatforms = []
  const hazards = []
  const crystals = []
  const enemies = []

  // Platforms
  for (const def of level.platforms) {
    const plat = await loadAsset(def.asset)
    applySize(plat, def.size)
    plat.position.set(...def.pos)
    plat.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    if (def.motion) {
      plat.userData.motion = def.motion
      plat.userData.basePos = new THREE.Vector3(...def.pos)
      plat.userData.isMovingPlatform = true
    }
    if (def.asset === 'platform-bouncy') {
      plat.userData.isBouncy = true
    }
    group.add(plat)
    const box = new THREE.Box3().setFromObject(plat)
    platformColliders.push(box)
    platformMeshes.push(plat)
    if (def.motion) {
      movingPlatforms.push({
        mesh: plat,
        motion: def.motion,
        basePos: new THREE.Vector3(...def.pos),
        collider: box,
      })
    }
  }

  // Hazards
  for (const def of level.hazards || []) {
    const assetName = def.type === 'spike' ? 'trap-spike' : 'trap-fire'
    const haz = await loadAsset(assetName)
    applySize(haz, def.size)
    haz.position.set(...def.pos)
    haz.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    group.add(haz)
    const box = new THREE.Box3().setFromObject(haz)
    hazards.push({
      mesh: haz,
      type: def.type,
      damage: def.damage,
      cycle: def.cycle,
      collider: box,
    })
  }

  // Crystals
  for (const def of level.crystals || []) {
    const cry = await loadAsset('crystal')
    cry.position.set(...def.pos)
    cry.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    cry.userData.isCrystal = true
    cry.userData.collected = false
    cry.userData.baseY = def.pos[1]
    group.add(cry)
    const box = new THREE.Box3().setFromObject(cry)
    crystals.push({ mesh: cry, collider: box, collected: false })
  }

  // Decor (visual only, no collision)
  for (const def of level.decor || []) {
    const deco = await loadAsset(def.asset)
    deco.position.set(...def.pos)
    if (def.scale) {
      deco.scale.setScalar(def.scale)
    }
    deco.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    group.add(deco)
  }

  // Boss placeholder (L6)
  if (level.boss) {
    const bossMesh = await loadAsset(level.boss.asset)
    bossMesh.position.set(...level.boss.pos)
    bossMesh.userData.isBossPlaceholder = true
    bossMesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    group.add(bossMesh)
  }

  // Enemies
  for (const def of level.enemies || []) {
    let enemy
    if (def.type === 'mushroom') {
      enemy = new MushroomEnemy(scene, def)
    } else if (def.type === 'sprite') {
      enemy = new SpriteEnemy(scene, def)
    } else if (def.type === 'golem') {
      enemy = new GolemEnemy(scene, def)
    } else if (def.type === 'boss') {
      enemy = new BossGiant(scene, def)
    } else {
      enemy = new Enemy(scene, def)
    }
    // Pass the level group so the enemy's mesh disposes with the level —
    // otherwise scene-attached enemy meshes pile up across retries (and old
    // colliders from dead/dying enemies linger in the scene graph).
    await enemy.load(group)
    enemies.push(enemy)
  }

  // Portal — face the player's approach direction so the swirling vortex side
  // is visible when the player walks toward it. GLTF convention: model's
  // "front" is local +Z; rotating around Y by atan2(toPlayer.x, toPlayer.z)
  // aligns +Z with the vector from portal back to player start.
  const portalMesh = await loadAsset('portal-finish')
  portalMesh.position.set(...level.portal.pos)
  const portalPos = new THREE.Vector3(...level.portal.pos)
  const startPos = new THREE.Vector3(...level.playerStart)
  const toPlayer = startPos.sub(portalPos)
  toPlayer.y = 0
  if (toPlayer.lengthSq() < 0.01) toPlayer.set(-1, 0, 0)  // boss arena fallback
  portalMesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z)
  portalMesh.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  group.add(portalMesh)
  const portalCollider = new THREE.Box3().setFromObject(portalMesh)

  const cleanup = () => {
    if (group.parent) {
      group.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material?.dispose()
          }
        }
      })
      scene.remove(group)
    }
    for (const e of enemies) {
      e.dispose(scene)
    }
    enemies.length = 0
    scene.userData.currentLevelGroup = null
  }

  return {
    playerStart: new THREE.Vector3(...level.playerStart),
    platformColliders,
    platformMeshes,
    movingPlatforms,
    hazards,
    crystals,
    enemies,
    portal: {
      mesh: portalMesh,
      collider: portalCollider,
      hiddenUntilBossDefeated: level.portal.hiddenUntilBossDefeated || false,
    },
    cleanup,
  }
}
