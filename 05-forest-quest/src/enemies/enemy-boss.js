import * as THREE from 'three'
import { Enemy } from './enemy-base.js'
import { loadAsset } from '../loaders/asset-loader.js'

export class BossGiant extends Enemy {
  constructor(scene, config) {
    super(scene, config)
    this.hp = config.hp ?? 8
    this.maxHp = this.hp
    this.phase = 1
    this.stompable = config.stompable !== false
    this.activeRocks = []
    this.rockTimer = 0
    this.dyingTimer = 0
    this.groundY = config.pos[1]
    this.arenaRange = 8
    // Grace period after spawn: the Boss stays put so the player has time
    // to take in the arena before the chase begins.
    this.spawnGrace = 2.0
  }

  async load(parent) {
    // Prefer the real GLB; fall back to a built-in primitive when absent.
    // asset-loader returns the fallback wrapper immediately and swaps GLB in
    // async — for the boss specifically we keep the custom sizing path below
    // by checking `userData.glbReady` is also `false` initially (will populate
    // post-swap), so the local fallback branch fires until then.
    const loaded = await loadAsset('boss-stone-giant')
    const isFallback = !loaded?.userData?.glbReady

    if (loaded && !isFallback) {
      // Real GLB — normalise to the tuned ~3m battle height so the
      // head-stomp weak point stays reachable with a double jump.
      const box = new THREE.Box3().setFromObject(loaded)
      const size = new THREE.Vector3()
      box.getSize(size)
      if (size.y > 0.01) loaded.scale.setScalar(3.0 / size.y)
      loaded.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      this.mesh = loaded
      this.crystalMesh = null // GLB carries its own weak-point geometry
    } else {
      // Built-in primitive: large grey box + yellow crystal weak point.
      const group = new THREE.Group()

      const bodyGeo = new THREE.BoxGeometry(2, 2.5, 1.5)
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      body.position.y = 1.25
      body.castShadow = true
      body.receiveShadow = true
      group.add(body)

      const crystalGeo = new THREE.OctahedronGeometry(0.4)
      const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xaa8800, emissiveIntensity: 0.5 })
      const crystal = new THREE.Mesh(crystalGeo, crystalMat)
      crystal.position.y = 2.7
      crystal.castShadow = true
      group.add(crystal)
      this.crystalMesh = crystal

      this.mesh = group
    }

    this.mesh.position.set(...this.config.pos)
    ;(parent || this.scene).add(this.mesh)
  }

  update(dt, player, elapsedTime) {
    if (this.state === 'DEAD') {
      this._updateRocks(dt, player)
      return
    }
    if (this.state === 'DYING') {
      this.dyingTimer -= dt
      if (this.mesh) {
        const s = Math.max(0.01, this.dyingTimer / 2.0)
        this.mesh.scale.setScalar(s)
      }
      if (this.dyingTimer <= 0) {
        this.state = 'DEAD'
        this.dispose(this.scene)
        return
      }
      this._updateRocks(dt, player)
      return
    }

    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt
      if (this.mesh) {
        this.mesh.visible = Math.floor(elapsedTime * 10) % 2 === 0
      }
    } else {
      if (this.mesh) this.mesh.visible = true
    }

    this._behavior(dt, player, elapsedTime)
    this._updateRocks(dt, player)
    this.getCollider()
  }

  _behavior(dt, player, elapsedTime) {
    if (!this.mesh || !player?.mesh) return

    if (this.spawnGrace > 0) {
      this.spawnGrace -= dt
    }

    if (this.phase === 1) {
      if (this.spawnGrace <= 0) {
        const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        if (dist > 0.5 && dist < 20) {
          toPlayer.normalize()
          this.mesh.position.x += toPlayer.x * 3.5 * dt
          this.mesh.position.z += toPlayer.z * 3.5 * dt
        }
      }
      this.mesh.position.y = this.groundY
    } else if (this.phase === 2) {
      this.rockTimer -= dt
      if (this.rockTimer <= 0) {
        this._spawnRock()
        this.rockTimer = 2.5
      }
    }

    // Crystal pulse
    if (this.crystalMesh) {
      this.crystalMesh.rotation.y += dt * 2
      const pulse = 1 + Math.sin(elapsedTime * 3) * 0.1
      this.crystalMesh.scale.setScalar(pulse)
    }
  }

  _spawnRock() {
    const geo = new THREE.SphereGeometry(0.3, 8, 8)
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555 })
    const rock = new THREE.Mesh(geo, mat)
    const x = this.mesh.position.x + (Math.random() - 0.5) * 14
    const z = this.mesh.position.z + (Math.random() - 0.5) * 14
    rock.position.set(x, 12, z)
    rock.castShadow = true
    this.scene.add(rock)
    this.activeRocks.push({ mesh: rock, velocity: new THREE.Vector3(0, 0, 0) })
  }

  _updateRocks(dt, player) {
    const playerBox = (player?.mesh && player.mesh.updateWorldMatrix) ? new THREE.Box3().setFromObject(player.mesh) : null
    for (let i = this.activeRocks.length - 1; i >= 0; i--) {
      const r = this.activeRocks[i]
      r.velocity.y -= 9.8 * dt
      r.mesh.position.addScaledVector(r.velocity, dt)

      let hit = false
      if (r.mesh.position.y <= this.groundY + 0.3) {
        hit = true
      }
      if (playerBox && player?.mesh) {
        const rockBox = new THREE.Box3().setFromObject(r.mesh)
        if (rockBox.intersectsBox(playerBox)) {
          hit = true
          if (typeof window !== 'undefined' && window.__gameInternals?.damagePlayer) {
            window.__gameInternals.damagePlayer(1)
          }
        }
      }

      if (hit) {
        this.scene.remove(r.mesh)
        r.mesh.geometry.dispose()
        r.mesh.material.dispose()
        this.activeRocks.splice(i, 1)
      }
    }
  }

  takeHit(fromStomp = false) {
    if (this.state !== 'ACTIVE') return
    if (this.invulnTimer > 0) return
    this.hp--
    this.invulnTimer = 0.5
    if (this.hp <= 0) {
      this.state = 'DYING'
      this.dyingTimer = 2.0
    } else if (this.hp <= 4 && this.phase === 1) {
      this.phase = 2
      this.rockTimer = 1.0
    }
  }

  dispose(scene) {
    for (const r of this.activeRocks) {
      if (r.mesh.parent) r.mesh.parent.remove(r.mesh)
      r.mesh.geometry?.dispose()
      r.mesh.material?.dispose()
    }
    this.activeRocks = []
    if (this.mesh) {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh)
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
  }

  getCollider() {
    if (this.mesh) {
      this.collider.setFromObject(this.mesh)
    }
    return this.collider
  }
}
