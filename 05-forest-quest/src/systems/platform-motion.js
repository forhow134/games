import * as THREE from 'three'

/**
 * Update moving platform positions each frame.
 * @param {Array<{mesh: THREE.Object3D, motion: object, basePos: THREE.Vector3, collider: THREE.Box3}>} movingPlatforms
 * @param {number} dt
 * @param {number} elapsedTime
 */
export function updateMovingPlatforms(movingPlatforms, dt, elapsedTime) {
  for (const mp of movingPlatforms) {
    const { mesh, motion, basePos, collider } = mp
    const t = elapsedTime * motion.speed + (motion.phase || 0)
    const offset = Math.sin(t) * motion.range

    if (motion.type === 'horizontal') {
      mesh.position.x = basePos.x + offset
    } else if (motion.type === 'vertical') {
      mesh.position.y = basePos.y + offset
    }

    // Sync collider to new mesh position
    if (collider) {
      collider.setFromObject(mesh)
    }
  }
}
