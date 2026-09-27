import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { seededRandom } from '../../src/terrain'
import { PLANETS } from './model'
import type { PlanetId } from './model'

// The recipes, the bake, the ground painters and the rings of option B are in src/planet-paint.ts: the game uses them.

/** Option A: buildGasDeck() of before with two colours and a band count per planet, instead of one darkened colour. */
export function retuneDeckTexture(id: PlanetId, seed: number) {
  const width = 512, height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')!
  const pixels = ctx.createImageData(width, height)
  const noise = createNoise3D(seededRandom(seed))
  const palette = PLANETS[id].retune
  const zone = new THREE.Color(palette.zone), belt = new THREE.Color(palette.belt), color = new THREE.Color()
  const count = palette.bands ?? 30
  for (let y = 0; y < height; y++) {
    const lat = y / height * Math.PI
    for (let x = 0; x < width; x++) {
      const lon = x / width * Math.PI * 2
      const n = noise(Math.sin(lat) * Math.cos(lon) * 5, Math.cos(lat) * 5, Math.sin(lat) * Math.sin(lon) * 5)
      const band = Math.sin(lat * count + n * 2.5 * (palette.warp ?? 1))
      color.copy(zone).lerp(belt, (0.5 - band * 0.5) * palette.contrast).multiplyScalar(0.96 + n * 0.08).convertLinearToSRGB()
      const i = (y * width + x) * 4
      pixels.data[i] = color.r * 255; pixels.data[i + 1] = color.g * 255
      pixels.data[i + 2] = color.b * 255; pixels.data[i + 3] = 255
    }
  }
  ctx.putImageData(pixels, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}
