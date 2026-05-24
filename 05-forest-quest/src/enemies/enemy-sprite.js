import * as THREE from 'three'
import { Enemy } from './enemy-base.js'

export class SpriteEnemy extends Enemy {
  constructor(scene, config) {
    super(scene, config)
    this.basePos = new THREE.Vector3(...config.pos)
    this.detectRange = config.detectRange ?? 8
    this.speed = config.speed ?? 2.5
    this.baseY = config.pos[1]
  }

  _behavior(dt, player, elapsedTime) {
    if (!this.mesh || !player?.mesh) return
    const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position)
    toPlayer.y = 0
    const dist = toPlayer.length()

    if (dist < this.detectRange && dist > 0.3) {
      toPlayer.normalize()
      this.mesh.position.x += toPlayer.x * this.speed * dt
      this.mesh.position.z += toPlayer.z * this.speed * dt
    } else if (dist >= this.detectRange) {
      const toBase = new THREE.Vector3().subVectors(this.basePos, this.mesh.position)
      toBase.y = 0
      const dBase = toBase.length()
      if (dBase > 0.2) {
        toBase.normalize()
        this.mesh.position.x += toBase.x * this.speed * dt
        this.mesh.position.z += toBase.z * this.speed * dt
      }
    }

    // Sine bob
    this.mesh.position.y = this.baseY + Math.sin(elapsedTime * 3) * 0.2
  }
}
