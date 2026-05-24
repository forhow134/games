import * as THREE from 'three'

/**
 * Build a fallback THREE.Group from a manifest fallback descriptor.
 *
 * @param {object} fallback — manifest fallback block
 * @param {number[]} size   — manifest size [w, h, d] (used for simple geometries)
 * @param {string} [name]   — asset name (for debugging)
 * @returns {THREE.Group}
 */
export function buildFallback(fallback, size, name = 'unnamed') {
  const group = new THREE.Group()
  group.name = `fallback:${name}`

  if (fallback.geometry === 'composite') {
    if (Array.isArray(fallback.parts)) {
      for (const part of fallback.parts) {
        const mesh = buildPrimitive(part)
        if (mesh && part.offset) {
          mesh.position.set(part.offset[0], part.offset[1], part.offset[2])
        }
        if (mesh) group.add(mesh)
      }
    }
  } else {
    const mesh = buildPrimitive({ geometry: fallback.geometry, size, color: fallback.color })
    if (mesh) group.add(mesh)
  }

  // Ensure origin convention: bottom-centre at y=0
  // Simple geometries already respect this; composites rely on manifest offsets.
  return group
}

function buildPrimitive({ geometry, size, color }) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color || '#888888'),
    flatShading: true,
    roughness: 0.8,
  })

  let geo
  switch (geometry) {
    case 'box': {
      const [w, h, d] = size || [1, 1, 1]
      geo = new THREE.BoxGeometry(w, h, d)
      // BoxGeometry is centred; shift mesh up so bottom is at y=0
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = h / 2
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }
    case 'sphere': {
      const r = Array.isArray(size) ? size[0] : size || 0.5
      geo = new THREE.SphereGeometry(r, 16, 12)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = r
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }
    case 'cylinder': {
      const [radius, height] = size || [0.5, 1]
      geo = new THREE.CylinderGeometry(radius, radius, height, 16)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = height / 2
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }
    case 'cone': {
      const [radius, height] = size || [0.5, 1]
      geo = new THREE.ConeGeometry(radius, height, 16)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = height / 2
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }
    default:
      console.warn(`[fallback] unknown geometry "${geometry}"`)
      return null
  }
}
