import * as THREE from 'three'
import {
  PLAYER_AABB,
  PLAYER as PLAYER_CFG,
} from './constants.js'
import { loadAssetBlocking } from './loaders/asset-loader.js'

export class Player {
  constructor(scene) {
    this.scene = scene
    this.mesh = null
    this.velocity = new THREE.Vector3()
    this.onGround = false
    this.jumpCount = 0
    this.facing = 1 // 1 = right (positive X relative to camera), -1 = left
    this.targetAngle = 0
    this.groundPlatform = null
    this.lastPlatformPos = new THREE.Vector3()

    // Coyote time & jump buffer
    this.coyoteTimer = 0
    this.jumpBufferTimer = 0
    this.wasOnGround = false

    // Skeletal animation (populated in init() if GLB ships with AnimationClips)
    this.mixer = null
    this.actions = {}
    this.currentAction = null
  }

  async init() {
    // Player MUST have GLB ready before gameplay (controllable hero must look
    // correct from frame 1). Everything else uses non-blocking loadAsset().
    this.mesh = await loadAssetBlocking('player-fox')
    this.mesh.position.set(0, 2, 0)
    this.mesh.castShadow = true
    this.scene.add(this.mesh)
    this._setupAnimations()
  }

  _setupAnimations() {
    const clips = this.mesh.userData && this.mesh.userData.animations
    if (!clips || !clips.length) return

    this.mixer = new THREE.AnimationMixer(this.mesh)
    // Match by substring so it tolerates names like "Armature|Walk", "fox_walk_cycle", etc.
    const stateMatchers = [
      ['walk',  /walk/i],
      ['run',   /run|sprint/i],
      ['jump',  /jump|fall|air/i],
      ['idle',  /idle|stand|t.?pose|default/i],
    ]
    for (const clip of clips) {
      for (const [key, re] of stateMatchers) {
        if (re.test(clip.name) && !this.actions[key]) {
          this.actions[key] = this.mixer.clipAction(clip)
          break
        }
      }
    }
    // Fall back: use the first clip as idle if none matched the idle pattern
    if (!this.actions.idle && clips.length) {
      this.actions.idle = this.mixer.clipAction(clips[0])
    }
    this._playAction('idle')
  }

  _playAction(name) {
    const next = this.actions[name]
    if (!next || this.currentAction === next) return
    if (this.currentAction) this.currentAction.fadeOut(0.15)
    next.reset().fadeIn(0.15).play()
    this.currentAction = next
  }

  /**
   * @param {number} dt
   * @param {object} input
   * @param {THREE.Object3D[]} colliders
   */
  update(dt, input, colliders) {
    if (!this.mesh) return

    const cfg = PLAYER_CFG

    // ---- horizontal movement (world-space, relative to camera yaw) ----
    // Camera offset is [0,5,-8] meaning camera is BEHIND player (negative Z).
    // When yaw=0, camera looks from -Z toward origin, so forward is +Z.
    const speed = cfg.moveSpeed * (input.run ? cfg.runMultiplier : 1)
    const camYaw = input.camYaw || 0

    // forward = direction the camera is looking (from camera position toward
    // target). Must stay consistent with ThirdPersonCamera's yaw convention:
    // the camera sits at base_h(yaw) = (-d·sin yaw, -d·cos yaw) relative to
    // the player, so the look direction is -base_h normalised = (sin, cos).
    const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw))
    // right = forward rotated -90° about Y (screen right)
    const right = new THREE.Vector3(-Math.cos(camYaw), 0, Math.sin(camYaw))

    let targetVelX = 0
    let targetVelZ = 0

    if (input.forward) {
      targetVelX += forward.x * speed
      targetVelZ += forward.z * speed
    }
    if (input.back) {
      targetVelX -= forward.x * speed
      targetVelZ -= forward.z * speed
    }
    if (input.left) {
      targetVelX -= right.x * speed
      targetVelZ -= right.z * speed
    }
    if (input.right) {
      targetVelX += right.x * speed
      targetVelZ += right.z * speed
    }

    // air control reduction
    const controlFactor = this.onGround ? 1.0 : cfg.airControl
    targetVelX *= controlFactor
    targetVelZ *= controlFactor

    // lerp current velocity toward target (no instant direction switch)
    const lerpFactor = 1 - Math.exp(-10 * dt) // smooth ~10 tau
    this.velocity.x += (targetVelX - this.velocity.x) * lerpFactor
    this.velocity.z += (targetVelZ - this.velocity.z) * lerpFactor

    // ---- timers ----
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt

    // ---- jump (with coyote time + jump buffer) ----
    if (input.jumpPressed) {
      this.jumpBufferTimer = cfg.jumpBufferTime
    }

    const canJump = this.onGround || this.coyoteTimer > 0
    if (this.jumpBufferTimer > 0 && canJump && this.jumpCount < 2) {
      this.velocity.y = this.jumpCount === 0 ? cfg.jumpV0 : cfg.jumpV1
      this.jumpCount++
      this.onGround = false
      this.coyoteTimer = 0
      this.jumpBufferTimer = 0
    }

    // ---- gravity ----
    this.velocity.y -= cfg.gravity * dt
    if (this.velocity.y < -cfg.maxFallSpeed) {
      this.velocity.y = -cfg.maxFallSpeed
    }

    // ---- moving platform carry ----
    let platformDelta = new THREE.Vector3()
    if (this.groundPlatform && this.groundPlatform.userData.isMovingPlatform) {
      platformDelta.subVectors(this.groundPlatform.position, this.lastPlatformPos)
    }

    // ---- apply velocity ----
    const deltaPos = this.velocity.clone().multiplyScalar(dt)
    deltaPos.add(platformDelta)
    this.mesh.position.add(deltaPos)

    // ---- ground check (multi-ray downward) ----
    const groundHit = this._raycastGround(colliders)
    if (groundHit && this.velocity.y <= 0) {
      const hitObj = groundHit.object
      // Bouncy platform: impulse upward, do NOT set onGround
      if (hitObj.userData.isBouncy || this._isChildOfBouncy(hitObj)) {
        this.velocity.y = cfg.bouncyImpulse
        this.jumpCount = 1
        this.onGround = false
        this.groundPlatform = null
      } else {
        this.mesh.position.y = groundHit.point.y
        this.velocity.y = 0
        this.onGround = true
        this.jumpCount = 0
        this.groundPlatform = this._findParentPlatform(hitObj, colliders)
        if (this.groundPlatform) {
          this.lastPlatformPos.copy(this.groundPlatform.position)
        }
      }
    } else {
      this.onGround = false
      this.groundPlatform = null
    }

    // ---- simple AABB push-out against colliders ----
    this._resolveCollisions(colliders)

    // ---- edge assist: if near platform edge, nudge inward ----
    if (this.onGround && this.groundPlatform) {
      this._applyEdgeAssist(colliders, cfg.edgeAssist)
    }

    // ---- facing / rotation ----
    const moveDir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z)
    if (moveDir.lengthSq() > 0.01) {
      this.targetAngle = Math.atan2(moveDir.x, moveDir.z)
    }
    // lerp mesh rotation around Y
    const currentY = this.mesh.rotation.y
    let angleDiff = this.targetAngle - currentY
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
    this.mesh.rotation.y += angleDiff * cfg.turnLerp

    // ---- update coyote timer ----
    if (this.wasOnGround && !this.onGround) {
      this.coyoteTimer = cfg.coyoteTime
    }
    this.wasOnGround = this.onGround

    // ---- skeletal animation state ----
    if (this.mixer) {
      this.mixer.update(dt)
      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z)
      const runThreshold = cfg.moveSpeed * 1.2 // above walk-only speed → run if available
      if (!this.onGround) {
        this._playAction('jump')
      } else if (horizSpeed > runThreshold && this.actions.run) {
        this._playAction('run')
      } else if (horizSpeed > 0.5) {
        this._playAction('walk')
      } else {
        this._playAction('idle')
      }
    }

    // Fall-out-of-bounds is handled in game.js (FALL_BOUND → Game Over).
  }

  _isChildOfBouncy(hitObj) {
    let p = hitObj.parent
    while (p) {
      if (p.userData && p.userData.isBouncy) return true
      p = p.parent
    }
    return false
  }

  _findParentPlatform(hitObj, colliders) {
    for (const plat of colliders) {
      if (plat === hitObj || plat.children.includes(hitObj)) return plat
      // deep check
      let found = false
      plat.traverse((c) => { if (c === hitObj) found = true })
      if (found) return plat
    }
    return null
  }

  _raycastGround(colliders) {
    const offsets = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(PLAYER_AABB.w * 0.3, 0, 0),
      new THREE.Vector3(-PLAYER_AABB.w * 0.3, 0, 0),
      new THREE.Vector3(0, 0, PLAYER_AABB.d * 0.3),
      new THREE.Vector3(0, 0, -PLAYER_AABB.d * 0.3),
    ]

    const targets = colliders.length ? colliders : this.scene.children
    let bestHit = null

    for (const off of offsets) {
      const origin = this.mesh.position.clone().add(off)
      origin.y += 0.1 // start slightly above feet
      const direction = new THREE.Vector3(0, -1, 0)
      const ray = new THREE.Raycaster(origin, direction, 0, 2)
      const hits = ray.intersectObjects(targets, true)
      for (const hit of hits) {
        // Ignore self
        if (hit.object === this.mesh || this.mesh.children.includes(hit.object)) continue
        if (!bestHit || hit.distance < bestHit.distance) {
          bestHit = hit
        }
      }
    }
    return bestHit
  }

  _resolveCollisions(colliders) {
    if (!colliders.length) return
    const playerBox = new THREE.Box3()
    const halfW = PLAYER_AABB.w / 2
    const halfH = PLAYER_AABB.h / 2
    const halfD = PLAYER_AABB.d / 2
    playerBox.setFromCenterAndSize(
      this.mesh.position.clone().add(new THREE.Vector3(0, halfH, 0)),
      new THREE.Vector3(PLAYER_AABB.w, PLAYER_AABB.h, PLAYER_AABB.d)
    )

    const resolved = new Set()

    for (const obj of colliders) {
      if (resolved.has(obj)) continue

      // Compute world AABB for collider
      const colliderBox = new THREE.Box3().setFromObject(obj)
      if (!playerBox.intersectsBox(colliderBox)) continue

      resolved.add(obj)

      // Simple push-out: find smallest overlap axis
      const centerPlayer = new THREE.Vector3()
      playerBox.getCenter(centerPlayer)
      const centerCollider = new THREE.Vector3()
      colliderBox.getCenter(centerCollider)

      const overlapX = (PLAYER_AABB.w + (colliderBox.max.x - colliderBox.min.x)) / 2 - Math.abs(centerPlayer.x - centerCollider.x)
      const overlapY = (PLAYER_AABB.h + (colliderBox.max.y - colliderBox.min.y)) / 2 - Math.abs(centerPlayer.y - centerCollider.y)
      const overlapZ = (PLAYER_AABB.d + (colliderBox.max.z - colliderBox.min.z)) / 2 - Math.abs(centerPlayer.z - centerCollider.z)

      const onTop = centerPlayer.y > centerCollider.y + (colliderBox.max.y - colliderBox.min.y) / 2 - 0.2

      // Bouncy platforms: launch the player on top contact, and never cancel
      // vertical velocity against them — the push-out below would kill the
      // bounce that _raycastGround applied this same frame.
      if (obj.userData && obj.userData.isBouncy) {
        if (onTop && this.velocity.y <= 0) {
          this.velocity.y = PLAYER_CFG.bouncyImpulse
          this.jumpCount = 1
          this.onGround = false
          this.groundPlatform = null
        }
        continue
      }

      // If falling and Y overlap is smallest, snap to top
      if (this.velocity.y <= 0 && overlapY < overlapX && overlapY < overlapZ && onTop) {
        this.mesh.position.y = colliderBox.max.y
        this.velocity.y = 0
        this.onGround = true
        this.jumpCount = 0
        this.groundPlatform = obj
        this.lastPlatformPos.copy(obj.position)
        continue
      }

      // Ignore Y if we're clearly on top (prevents horizontal push when standing)
      if (overlapY < overlapX && overlapY < overlapZ && this.velocity.y > 0) {
        this.mesh.position.y += overlapY * Math.sign(centerPlayer.y - centerCollider.y)
        this.velocity.y = 0
      } else if (!onTop && overlapX < overlapZ) {
        // Side collision X
        const pushX = overlapX * Math.sign(centerPlayer.x - centerCollider.x)
        if (Math.abs(pushX) > 0.001) {
          this.mesh.position.x += pushX
          this.velocity.x = 0
        }
      } else if (!onTop) {
        // Side collision Z
        const pushZ = overlapZ * Math.sign(centerPlayer.z - centerCollider.z)
        if (Math.abs(pushZ) > 0.001) {
          this.mesh.position.z += pushZ
          this.velocity.z = 0
        }
      }
    }
  }

  _applyEdgeAssist(colliders, edgeAssistDist) {
    // If the current ground platform is small, check if we're near its edge
    if (!this.groundPlatform) return
    const platBox = new THREE.Box3().setFromObject(this.groundPlatform)
    const px = this.mesh.position.x
    const pz = this.mesh.position.z
    const margin = edgeAssistDist

    const leftDist = px - platBox.min.x
    const rightDist = platBox.max.x - px
    const nearDist = pz - platBox.min.z
    const farDist = platBox.max.z - pz

    const push = new THREE.Vector3()
    if (leftDist < margin && leftDist < rightDist) push.x += margin - leftDist
    if (rightDist < margin && rightDist < leftDist) push.x -= margin - rightDist
    if (nearDist < margin && nearDist < farDist) push.z += margin - nearDist
    if (farDist < margin && farDist < nearDist) push.z -= margin - farDist

    if (push.lengthSq() > 0) {
      push.multiplyScalar(0.15) // gentle nudge
      this.mesh.position.add(push)
    }
  }
}
