import * as THREE from 'three'
import { groundHeight, seededRandom } from '../terrain'
import type { PlanetKind } from '../terrain'
import type { World } from '../worlds'
import { JETS, jetGlsl, WIND_SCALE } from './data'
import { createShell } from './shell'
import { frameAt, skyOf, spherePlaces } from './common'
import type { Sky, SkyPart } from './common'

/**
 * The sky of Mars (option B of the living worlds study, docs/living-worlds-study.md): thin wisps of
 * water ice in patches high in the butterscotch sky, and dust devils that turn and walk slowly over
 * the low plains. A real dust devil on Mars was about 2 km tall and 60 m wide. Each new visit gives
 * new places for the dust devils.
 */
const f = (value: number) => value.toFixed(4)

export const DUST_DEVILS = { count: 20, points: 600, near: 220 } as const

export function marsSky(world: World, sun: THREE.Vector3): Sky {
  const height = world.cloudHeight, radius = world.radius + height
  const wisps = createShell(world, sun, {
    height, order: 2, night: 0.25, segments: world.mobile ? 64 : 96,
    body: /* glsl */`
      ${jetGlsl(JETS.mars)}
      vec4 lwLayer(vec3 d, float time, float above) {
        float lat = degrees(asin(clamp(d.y, -1.0, 1.0)));
        vec3 q = lwTurn(d, -lwJet(lat) * ${f(WIND_SCALE)} / (${f(radius)} * max(0.15, cos(radians(lat)))) * time);
        // Patches of thin streaks: most of the sky is clear.
        float area = smoothstep(0.55, 0.75, lwFbm(q * 3.0 + 11.0));
        float streak = lwFbm(vec3(q.x * 16.0, q.y * 60.0, q.z * 16.0) + lwFbm(q * 8.0) * 1.2);
        return vec4(vec3(0.96, 0.95, 0.98), area * smoothstep(0.45, 0.8, streak) * 0.42);
      }`,
  })
  const devils = dustDevils(world, sun)
  const parts: SkyPart[] = [{ name: 'mars-wisps', update: frame => wisps.update(frame.time, frame.camera.position), dispose: () => wisps.dispose() }, devils]
  return skyOf(world, parts, [wisps.mesh])
}

/**
 * Dust devils: each one a column of dust points that turns and walks in a straight line on the ground.
 * The warm ground of the day makes them: a dust devil grows in the morning and goes at dusk, so the
 * night side has none.
 * The points move on the CPU, so only the dust devils within 220 m of the camera move. A phone gets
 * half the dust devils, with half the points. With reduced motion they stand still.
 */
function dustDevils(world: World, sun: THREE.Vector3): SkyPart {
  const random = seededRandom(world.seed + 131)
  const count = world.mobile ? DUST_DEVILS.count / 2 : DUST_DEVILS.count, perDevil = world.mobile ? DUST_DEVILS.points / 2 : DUST_DEVILS.points
  // Low, flat ground: the plains, where the warm ground lifts the dust.
  const sites = spherePlaces(count * 8, world.seed + 131, 0.9).filter(dir => world.sample(dir.x, dir.y, dir.z).height < 1).slice(0, count)
  const devils = sites.map((dir, i) => ({ dir, height: 30 + random() * 16, width: 4 + random() * 3, spin: 2.2 + random(), heading: random() * Math.PI * 2, speed: 1.2 + random() * 1.2, seed: i }))
  const points = new Float32Array(devils.length * perDevil * 3)
  const particles = Array.from({ length: devils.length * perDevil }, () => ({ h: Math.pow(random(), 0.8), a: random() * Math.PI * 2, r: 0.6 + random() * 0.5 }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
  const material = new THREE.PointsMaterial({ size: 4, map: dustTexture(), color: 0xd9a277, transparent: true, opacity: 0.22, depthWrite: false })
  const mesh = new THREE.Points(geometry, material)
  mesh.frustumCulled = false
  mesh.name = 'mars-dust-devils'
  world.surface.add(mesh)
  const centre = new THREE.Vector3(), heading = new THREE.Vector3(), dir = new THREE.Vector3()
  const cameraLocal = new THREE.Vector3(), inverse = new THREE.Matrix4(), toSun = new THREE.Vector3()
  const shown = new Set<number>()
  let moving = 0, first = true
  return {
    name: 'mars-dust-devils',
    devils: () => moving,
    update({ time, camera, still }) {
      inverse.copy(world.group.matrixWorld).invert()
      cameraLocal.copy(camera.position).applyMatrix4(inverse)
      toSun.copy(sun).applyMatrix4(inverse).normalize()
      moving = 0
      devils.forEach((devil, d) => {
        // The devil walks in a straight line on the ground, slowly, and turns about its axis.
        const frame = frameAt(devil.dir)
        heading.copy(frame.east).multiplyScalar(Math.cos(devil.heading)).addScaledVector(frame.north, Math.sin(devil.heading))
        dir.copy(devil.dir).addScaledVector(heading, devil.speed * time / world.radius).normalize()
        if (!first && dir.clone().multiplyScalar(world.radius).distanceTo(cameraLocal) > DUST_DEVILS.near) return
        // The height of the Sun at the dust devil: full in the day, none at night.
        const day = THREE.MathUtils.smoothstep(dir.dot(toSun), 0.05, 0.3)
        if (day < 0.02) {
          // At night the dust devil is gone: its points go to the middle of the world, under the ground.
          if (shown.delete(d) || first) points.fill(0, d * perDevil * 3, (d + 1) * perDevil * 3)
          return
        }
        if (still && !first && shown.has(d)) return
        shown.add(d)
        moving++
        centre.copy(dir).multiplyScalar(world.radius + groundHeight(world.kind as PlanetKind, world.sample(dir.x, dir.y, dir.z)))
        const local = frameAt(dir)
        for (let i = 0; i < perDevil; i++) {
          const p = particles[d * perDevil + i]
          // A funnel: thin at the ground, wide at the top; the low part turns faster.
          const r = devil.width * (0.18 + 0.82 * Math.pow(p.h, 1.4)) * p.r * day
          const a = p.a + time * devil.spin * (1.6 - p.h)
          const sway = Math.sin(time * 0.7 + devil.seed + p.h * 2.2) * p.h * 2.5
          const index = (d * perDevil + i) * 3
          const x = Math.cos(a) * r + sway * day, z = Math.sin(a) * r, y = p.h * devil.height * day
          points[index] = centre.x + local.east.x * x + local.north.x * z + local.up.x * y
          points[index + 1] = centre.y + local.east.y * x + local.north.y * z + local.up.y * y
          points[index + 2] = centre.z + local.east.z * x + local.north.z * z + local.up.z * y
        }
      })
      first = false
      geometry.attributes.position.needsUpdate = true
    },
    dispose() { world.surface.remove(mesh); geometry.dispose(); material.map?.dispose(); material.dispose() },
  }
}

/** A soft round speck of dust. */
function dustTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  // Soft to the edge, with no hard core, so the specks of a column join into one cloud of dust.
  gradient.addColorStop(0, 'rgba(214,160,110,1)')
  gradient.addColorStop(0.45, 'rgba(214,160,110,0.45)')
  gradient.addColorStop(1, 'rgba(214,160,110,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
