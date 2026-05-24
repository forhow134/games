import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { buildFallback } from './fallback-builder.js'

// Shared Draco decoder — GLB files are Draco-compressed by scripts/compress-models.mjs.
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')

// Manifest cache (single fetch per session)
let manifestCache = null
let manifestPromise = null
// GLB cache: name → Promise<{ scene, animations } | null>. Promise resolves to
// null on load failure; callers keep the fallback.
const glbCache = new Map()

async function getManifest() {
  if (manifestCache) return manifestCache
  if (manifestPromise) return manifestPromise
  manifestPromise = fetch('/assets-manifest.json')
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
    .then(data => { manifestCache = data; return data })
  return manifestPromise
}

function findEntry(manifest, name) {
  const entry = manifest.assets?.find(a => a.name === name)
  if (!entry) throw new Error(`Asset "${name}" not found in manifest`)
  return entry
}

// Slab-like assets are EXPECTED to stretch (e.g. a 4×0.5×4 platform should be
// a thin wide slab even if the source GLB is cubic). Organic/decorative shapes
// must preserve aspect ratio or they look like deformed cartoons.
const NON_UNIFORM_CATEGORIES = new Set(['platform', 'trap'])

/**
 * Normalize a loaded GLB scene so its height matches the manifest target with
 * bottom-centre at the local origin. Matches the convention used by
 * fallback-builder.js (mesh.position.y = h/2 → bottom at y=0).
 *
 * Slab-like categories (platform, trap) use non-uniform per-axis scaling so
 * the bbox exactly matches `targetSize`. Everything else uses uniform scaling
 * keyed off height to preserve the GLB's natural aspect ratio — characters,
 * enemies, props, etc.
 *
 * Mutates obj.scale and obj.position in place. Caller passes a fresh clone so
 * the cached scene is untouched.
 */
function normalizeToManifestSize(obj, targetSize, category) {
  if (!targetSize) return
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(obj)
  const cur = new THREE.Vector3()
  box.getSize(cur)
  if (cur.x < 1e-4 || cur.y < 1e-4 || cur.z < 1e-4) return  // degenerate

  if (NON_UNIFORM_CATEGORIES.has(category)) {
    obj.scale.set(
      targetSize[0] / cur.x,
      targetSize[1] / cur.y,
      targetSize[2] / cur.z,
    )
  } else {
    // Uniform scale keyed to height so the model is exactly targetSize.h tall;
    // width/depth follow the GLB's natural aspect (typically close to but not
    // identical to targetSize.w / targetSize.d).
    const s = targetSize[1] / cur.y
    obj.scale.set(s, s, s)
  }

  obj.updateMatrixWorld(true)
  const scaledBox = new THREE.Box3().setFromObject(obj)
  const centre = new THREE.Vector3()
  scaledBox.getCenter(centre)
  obj.position.set(-centre.x, -scaledBox.min.y, -centre.z)
}

/**
 * Kick off a single GLB load per asset name (cached). Errors resolve to null
 * so the wrapper keeps its fallback children — game never hangs on bad assets.
 */
function loadGLB(name, entry) {
  if (!glbCache.has(name)) {
    glbCache.set(name, new Promise((resolve) => {
      const loader = new GLTFLoader()
      loader.setDRACOLoader(dracoLoader)
      loader.load(
        `/models/${entry.file}`,
        (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations || [] }),
        undefined,
        (err) => {
          console.warn(`[asset] GLB ${name} failed — keeping fallback: ${err.message}`)
          resolve(null)
        }
      )
    }))
  }
  return glbCache.get(name)
}

function buildWrapper(name, entry) {
  const wrapper = new THREE.Group()
  wrapper.name = `asset:${name}`
  wrapper.userData.assetName = name
  wrapper.userData.targetSize = entry.size
  wrapper.userData.glbReady = false
  // Initial children: fallback geometry built from manifest. Identical bbox
  // shape (bottom-centre at y=0, manifest.size dimensions) as the eventual
  // normalized GLB, so colliders set from this stay valid after the swap.
  wrapper.add(buildFallback(entry.fallback, entry.size, name))
  return wrapper
}

function disposeChildren(group) {
  while (group.children.length) {
    const c = group.children[0]
    group.remove(c)
    c.traverse(o => {
      if (o.isMesh) {
        o.geometry?.dispose()
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
        else o.material?.dispose()
      }
    })
  }
}

async function swapInGLB(wrapper, name, entry) {
  const glb = await loadGLB(name, entry)
  if (!glb) return
  // Wrapper may have been disposed/removed by a level change before GLB landed.
  // Detect via a sentinel set by the caller when disposing.
  if (wrapper.userData.disposed) return
  disposeChildren(wrapper)
  const cloned = SkeletonUtils.clone(glb.scene)
  normalizeToManifestSize(cloned, entry.size, entry.category)
  cloned.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
  })
  if (glb.animations.length) wrapper.userData.animations = glb.animations
  wrapper.add(cloned)
  wrapper.userData.glbReady = true
  if (typeof wrapper.userData.onUpgrade === 'function') {
    try { wrapper.userData.onUpgrade(wrapper) } catch (e) { console.warn(e) }
  }
}

/**
 * Non-blocking load: returns the wrapper *immediately* containing the fallback,
 * and hot-swaps in the GLB once it's downloaded and decoded. Game can start
 * before any GLB is on disk.
 */
export async function loadAsset(name) {
  const manifest = await getManifest()
  const entry = findEntry(manifest, name)
  const wrapper = buildWrapper(name, entry)
  // Fire-and-forget; callers that want to await GLB use loadAssetBlocking().
  swapInGLB(wrapper, name, entry)
  return wrapper
}

/**
 * Blocking load: waits for the GLB to fully load and swap in before resolving.
 * Used for player-fox — game start screen waits for the hero to be visible.
 * Still falls back to fallback geometry if the GLB fails.
 */
export async function loadAssetBlocking(name) {
  const manifest = await getManifest()
  const entry = findEntry(manifest, name)
  const wrapper = buildWrapper(name, entry)
  await swapInGLB(wrapper, name, entry)
  return wrapper
}

/**
 * Preload multiple assets in parallel (returns when GLBs are fully loaded).
 */
export async function preloadAssets(names) {
  const results = await Promise.all(
    names.map(async (name) => [name, await loadAssetBlocking(name)])
  )
  return new Map(results)
}
