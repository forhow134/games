import * as THREE from 'three'
import { CAMERA as CAM_CFG } from './constants.js'

export class ThirdPersonCamera {
  constructor(camera, target) {
    this.camera = camera
    this.target = target
    this.yaw = 0
    this.pitch = 0.4
    // Time since last manual drag input; starts at Infinity so auto-follow is on by default
    this._noInputTimer = Infinity
  }

  /** Call whenever the user manually drags the camera */
  onManualInput() {
    this._noInputTimer = 0
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3|null} playerVelocity
   */
  update(dt, playerVelocity) {
    if (!this.target) return

    const cfg = CAM_CFG

    // ── Auto-follow: align camera behind player's movement direction ──
    this._noInputTimer += dt
    if (playerVelocity && this._noInputTimer > cfg.autoFollowDelay) {
      const hvel = new THREE.Vector3(playerVelocity.x, 0, playerVelocity.z)
      if (hvel.lengthSq() > 1.0) {
        // Target yaw puts camera directly behind player's direction of travel.
        // base_h(yaw) = (-d·sin yaw, -d·cos yaw) must equal -hvel·d, so
        // yaw = atan2(hvel.x, hvel.z).
        const targetYaw = Math.atan2(hvel.x, hvel.z)
        let diff = targetYaw - this.yaw
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        this.yaw += diff * Math.min(cfg.autoFollowSpeed * dt, Math.abs(diff))
      }
    }

    // ── Clamp pitch ────────────────────────────────────────
    this.pitch = Math.max(cfg.pitchMin, Math.min(cfg.pitchMax, this.pitch))

    // ── Compute desired camera position (spherical coords) ─
    const off = cfg.offset
    const dist = Math.sqrt(off[0] * off[0] + off[1] * off[1] + off[2] * off[2])

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.yaw
    )
    // base: camera sits behind-and-above target
    const base = new THREE.Vector3(0, Math.sin(this.pitch) * dist, -Math.cos(this.pitch) * dist)
    base.applyQuaternion(yawQuat)

    const targetPos = this.target.position.clone()
    const desiredPos = targetPos.clone().add(base)

    this.camera.position.lerp(desiredPos, cfg.lerp)

    const lookAt = targetPos.clone().add(new THREE.Vector3(0, cfg.lookAtHeight, 0))
    this.camera.lookAt(lookAt)
  }
}
