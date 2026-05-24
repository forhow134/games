import * as THREE from 'three'
import { loadAsset } from '../loaders/asset-loader.js'

export class Enemy {
  constructor(scene, config) {
    this.scene = scene
    this.type = config.type
    this.mesh = null
    this.config = config
    this.state = 'ACTIVE'
    this.hp = config.hp ?? 1
    this.invulnTimer = 0
    this.collider = new THREE.Box3()
    this.dyingTimer = 0
  }

  async load(parent) {
    this.mesh = await loadAsset(this.config.assetName || this._assetName())
    this.mesh.position.set(...this.config.pos)
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    // Add to the level group when one is provided so it disposes with the
    // level. Falling back to `scene` keeps legacy callers (tests) working.
    ;(parent || this.scene).add(this.mesh)
  }

  _assetName() {
    const map = {
      mushroom: 'enemy-mushroom',
      sprite: 'enemy-sprite',
      golem: 'enemy-golem-small',
    }
    return map[this.type] || 'enemy-mushroom'
  }

  update(dt, player, elapsedTime) {
    if (this.state === 'DEAD') return
    if (this.state === 'DYING') {
      this.dyingTimer -= dt
      if (this.mesh) {
        const s = Math.max(0.01, this.dyingTimer / 0.3)
        this.mesh.scale.setScalar(s)
      }
      if (this.dyingTimer <= 0) {
        this.state = 'DEAD'
        this.dispose(this.scene)
      }
      return
    }
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt
    }
    this._behavior(dt, player, elapsedTime)
    this.getCollider()
  }

  _behavior(dt, player, elapsedTime) {
    // override in subclass
  }

  takeHit(fromStomp = false) {
    if (this.state !== 'ACTIVE') return
    if (this.invulnTimer > 0) return
    this.hp--
    if (this.hp <= 0) {
      this.state = 'DYING'
      this.dyingTimer = 0.3
    } else {
      this.invulnTimer = 0.2
    }
  }

  dispose(scene) {
    if (!this.mesh) return
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh)
    }
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material?.dispose()
        }
      }
    })
    this.mesh = null
  }

  getCollider() {
    if (this.mesh) {
      this.collider.setFromObject(this.mesh)
    }
    return this.collider
  }
}
