import * as THREE from 'three'
import { byHr } from '../../src/star-map'
import { STAR_SKY_RADIUS, starDirection } from '../../src/stars'

/** The game sky before the star map change, frozen for the study's comparison:
 * 3,000 seeded random stars, 22 catalog stars and three line pictures. */
export const beforePictureIds = ['orion', 'big-dipper', 'cassiopeia'] as const
export const beforeCatalogHr = [2491, 2004, 1713, 1948, 1903, 1852, 1790, 2061, 7557, 7001, 5191, 4554, 5054, 4905, 4295, 168, 4660, 21, 403, 264, 4301, 542] as const
export const beforePictures = [
  { name: 'Orion', paths: [[2061, 1790, 1852, 1713, 2004, 1948, 2061], [1852, 1903, 1948]] },
  { name: 'Big Dipper', paths: [[4301, 4295, 4554, 4660, 4301], [4660, 4905, 5054, 5191]] },
  { name: 'Cassiopeia', paths: [[21, 168, 264, 403, 542]] },
] as const

function softStarTexture() {
  const size = 32, pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1)
    const i = (y * size + x) * 4
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
    pixels[i + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - radius), 2))
  }
  const texture = new THREE.DataTexture(pixels, size, size)
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

export function createLegacySky(scene: THREE.Scene) {
  const group = new THREE.Group()
  group.name = 'legacy-star-sky'
  scene.add(group)
  const texture = softStarTexture()
  const resources: Array<{ dispose(): void }> = [texture]
  let seed = 144
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
  function points(name: string, positions: number[], colors: number[], size: number, opacity: number) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({
      size, sizeAttenuation: false, map: texture, vertexColors: true,
      transparent: true, opacity, depthWrite: false, depthTest: true, fog: false,
    })
    const object = new THREE.Points(geometry, material)
    object.name = name
    group.add(object)
    resources.push(geometry, material)
  }
  const positions: number[] = [], colors: number[] = [], color = new THREE.Color()
  for (let i = 0; i < 3000; i++) {
    const direction = starDirection(random() * 360, THREE.MathUtils.radToDeg(Math.asin(random() * 2 - 1)))
    positions.push(...direction.multiplyScalar(STAR_SKY_RADIUS).toArray())
    color.setHSL(0.52 + random() * 0.2, 0.12 + random() * 0.2, 0.48 + random() * 0.35)
    colors.push(color.r, color.g, color.b)
  }
  points('decorative-stars', positions, colors, 2.8, 0.72)
  for (let bucket = 0; bucket < 3; bucket++) {
    const starPositions: number[] = [], starColors: number[] = []
    for (const hr of beforeCatalogHr) {
      const star = byHr.get(hr)!
      if ((star.magnitude < 1 ? 0 : star.magnitude < 2.5 ? 1 : 2) !== bucket) continue
      starPositions.push(...starDirection(star.ra, star.dec).multiplyScalar(STAR_SKY_RADIUS).toArray())
      color.set(star.bv > 0.8 ? 0xffd4a3 : star.bv < -0.05 ? 0xc0dbff : 0xf2f0ff)
      starColors.push(color.r, color.g, color.b)
    }
    points(`catalog-stars-${bucket}`, starPositions, starColors, [10, 8, 6][bucket], 1)
  }
  const pictureGroup = new THREE.Group()
  pictureGroup.name = 'star-pictures'
  group.add(pictureGroup)
  for (const picture of beforePictures) {
    const vertices: number[] = []
    for (const path of picture.paths) for (let i = 1; i < path.length; i++) {
      const start = byHr.get(path[i - 1])!, end = byHr.get(path[i])!
      const a = starDirection(start.ra, start.dec), b = starDirection(end.ra, end.dec)
      for (let step = 0; step < 8; step++) for (const t of [step / 8, (step + 1) / 8]) {
        vertices.push(...a.clone().lerp(b, t).normalize().multiplyScalar(STAR_SKY_RADIUS - 20).toArray())
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    const material = new THREE.LineBasicMaterial({ color: 0xcbd7ff, transparent: true, opacity: 0.28, depthWrite: false, depthTest: true, fog: false })
    const lines = new THREE.LineSegments(geometry, material)
    lines.name = picture.name
    pictureGroup.add(lines)
    resources.push(geometry, material)
  }
  return {
    group,
    stars: group.children.filter(child => child !== pictureGroup),
    pictures: pictureGroup,
    dispose() { scene.remove(group); for (const resource of resources) resource.dispose() },
  }
}
