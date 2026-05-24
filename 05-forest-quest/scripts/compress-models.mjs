#!/usr/bin/env node
/**
 * scripts/compress-models.mjs
 *
 * Compress every GLB in public/models/ in place:
 *   - Draco geometry compression
 *   - Resize textures to <= 1024px (cartoon stylized assets don't need 4K)
 *   - Re-encode textures to WebP
 *   - Standard cleanup (dedup, weld, prune)
 *
 * Originals are expected to already be backed up in ../_originals/.
 *
 * Run with:  node scripts/compress-models.mjs
 */
import { execSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'public/models'
const TEX_MAX = 1024
// meshoptimizer simplify ratio — how many triangles to KEEP. 0.05 = drop 95% of
// triangles. Cartoon stylized assets tolerate aggressive simplification because
// silhouettes are simple and meshoptimizer preserves them well.
const SIMPLIFY_RATIO = 0.05
const SIMPLIFY_ERROR = 0.001

const files = readdirSync(DIR).filter(f => f.endsWith('.glb'))
console.log(`Compressing ${files.length} GLB files`)
console.log(`  textures: ≤${TEX_MAX}px WebP`)
console.log(`  geometry: simplify ratio=${SIMPLIFY_RATIO} + Draco\n`)

let totalIn = 0
let totalOut = 0

for (const file of files) {
  const path = join(DIR, file)
  const sizeIn = statSync(path).size
  totalIn += sizeIn
  try {
    // Step 1: aggressive mesh decimation (meshoptimizer). Must run BEFORE
    // optimize, because optimize's bundled simplify uses a different (more
    // conservative) ratio that wouldn't shed enough triangles for Meshy output.
    execSync(
      `npx --yes gltf-transform simplify "${path}" "${path}" ` +
      `--ratio ${SIMPLIFY_RATIO} --error ${SIMPLIFY_ERROR}`,
      { stdio: 'pipe' }
    )
    // Step 2: textures (resize + webp) + final geometry cleanup + Draco bytes
    execSync(
      `npx --yes gltf-transform optimize "${path}" "${path}" ` +
      `--texture-size ${TEX_MAX} --texture-compress webp --compress draco --simplify false`,
      { stdio: 'pipe' }
    )
    const sizeOut = statSync(path).size
    totalOut += sizeOut
    const pct = ((1 - sizeOut / sizeIn) * 100).toFixed(1)
    const mb = (n) => (n / 1024 / 1024).toFixed(1) + 'MB'
    console.log(`  ✓ ${file.padEnd(28)} ${mb(sizeIn).padStart(7)} → ${mb(sizeOut).padStart(7)}  (-${pct}%)`)
  } catch (err) {
    totalOut += sizeIn
    console.error(`  ✗ ${file}  FAILED: ${err.message.split('\n')[0]}`)
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(1)
const pct = ((1 - totalOut / totalIn) * 100).toFixed(1)
console.log(`\nTotal: ${mb(totalIn)}MB → ${mb(totalOut)}MB  (-${pct}%)`)
