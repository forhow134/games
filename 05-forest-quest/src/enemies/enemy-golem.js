import * as THREE from 'three'
import { Enemy } from './enemy-base.js'

export class GolemEnemy extends Enemy {
  constructor(scene, config) {
    super(scene, config)
    this.basePos = new THREE.Vector3(...config.pos)
    this.detectRange = config.detectRange ?? 5
    this.speed = config.speed ?? 4
    this.phase = 'IDLE' // IDLE | CHARGING | COOLDOWN
    this.phaseTimer = 0
    this.chargeDir = new THREE.Vector3()
  }

  _behavior(dt, player, elapsedTime) {
    if (!this.mesh || !player?.mesh) return
    const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position)
    toPlayer.y = 0
    const dist = toPlayer.length()

    if (this.phase === 'IDLE') {
      if (dist < this.detectRange && dist > 0.5) {
        this.phase = 'CHARGING'
        this.phaseTimer = 2.0
        toPlayer.normalize()
        this.chargeDir.copy(toPlayer)
      }
    } else if (this.phase === 'CHARGING') {
      this.mesh.position.x += this.chargeDir.x * this.speed * dt
      this.mesh.position.z += this.chargeDir.z * this.speed * dt
      this.phaseTimer -= dt
      if (this.phaseTimer <= 0) {
        this.phase = 'COOLDOWN'
        this.phaseTimer = 2.0
      }
    } else if (this.phase === 'COOLDOWN') {
      this.phaseTimer -= dt
      if (this.phaseTimer <= 0) {
        this.phase = 'IDLE'
      }
    }
  }
}
