import * as THREE from 'three'
import { Enemy } from './enemy-base.js'

export class MushroomEnemy extends Enemy {
  constructor(scene, config) {
    super(scene, config)
    this.basePos = new THREE.Vector3(...config.pos)
    this.patrolRange = config.patrolRange ?? 3
    this.speed = config.speed ?? 1.5
    this.direction = 1
    this.traveled = 0
  }

  _behavior(dt, player, elapsedTime) {
    if (!this.mesh) return
    const move = this.speed * dt * this.direction
    this.mesh.position.x += move
    this.traveled += Math.abs(move)

    // Edge check: raycast downward to see if ground exists ahead
    const origin = this.mesh.position.clone()
    origin.y += 0.2
    origin.x += this.direction * 0.6
    const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0), 0, 2)
    const hits = ray.intersectObjects(this.scene.children, true)
    let hasGround = false
    for (const h of hits) {
      const obj = h.object
      if (obj.userData.isCrystal || obj.userData.isBossPlaceholder) continue
      if (obj === this.mesh || this.mesh.children.includes(obj)) continue
      hasGround = true
      break
    }

    if (this.traveled >= this.patrolRange || !hasGround) {
      this.direction *= -1
      this.traveled = 0
    }
  }
}
