import * as THREE from 'three'
import { seededRandom } from '../../../src/terrain'
import { surfaceRadius } from '../../../src/worlds'
import type { World } from '../../../src/worlds'
import { JETS, jetGlsl, WIND_SCALE } from './data'
import { createShell } from './shell'
import { frameAt, hidePuffs, parts, placesNear } from './common'
import type { SkyPart } from './common'

/**
 * The sky of Mars in the study. Today: 70 white puffs. Option A: no puffs, and thin wisps of water
 * ice high in the butterscotch sky, in patches. Option B adds dust devils: tall turning columns of
 * dust that walk over the plains (a real one was about 2 km tall and 60 m wide).
 */
const f = (value: number) => value.toFixed(4)

export function marsSky(world: World, sun: THREE.Vector3, option: 'A' | 'B', near: THREE.Vector3, softDisc: (color?: string) => THREE.Texture): SkyPart {
  const height = world.cloudHeight, radius = world.radius + height
  const wisps = createShell(world, sun, {
    height, order: 2, night: 0.25,
    body: /* glsl */`
      ${jetGlsl(JETS.mars)}
      vec4 lwLayer(vec3 d, float time, float above) {
        float lat = degrees(asin(clamp(d.y, -1.0, 1.0)));
        vec3 q = lwTurn(d, -lwJet(lat) * ${f(WIND_SCALE)} / (${f(radius)} * max(0.15, cos(radians(lat)))) * time);
        // Patches of thin streaks: most of the sky is clear.
        float area = smoothstep(0.55, 0.75, lwFbm(q * 3.0 + 11.0));
        float streak = lwFbm(vec3(q.x * 16.0, q.y * 60.0, q.z * 16.0) + lwFbm(q * 8.0) * 1.2);
        float amount = area * smoothstep(0.45, 0.8, streak);
        return vec4(vec3(0.96, 0.95, 0.98), amount * 0.42);
      }`,
  })
  const list: SkyPart[] = [hidePuffs(world), { update: (time, camera) => wisps.update(time, camera), dispose: () => wisps.dispose() }]
  if (option === 'B') list.push(dustDevils(world, near, softDisc))
  const sky = parts(list)
  return {
    calls: sky.calls,
    update(time, camera) {
      wisps.mesh.visible = camera.distanceTo(world.group.position) - world.radius < world.atmosphere * 1.2
      sky.update(time, camera)
    },
    dispose: sky.dispose,
  }
}

/** Dust devils: each one a column of dust points that turns and walks slowly over the ground. */
export function dustDevils(world: World, near: THREE.Vector3, softDisc: (color?: string) => THREE.Texture, count = 5): SkyPart {
  const random = seededRandom(131)
  const perDevil = 900
  const devils = placesNear(near, 120, world.radius, count, 131).map((dir, i) => ({
    dir, height: 30 + random() * 16, width: 4 + random() * 3, spin: 2.2 + random(), heading: random() * Math.PI * 2, speed: 1.2 + random() * 1.2, seed: i,
  }))
  const points = new Float32Array(count * perDevil * 3)
  const particles = Array.from({ length: count * perDevil }, () => ({ h: Math.pow(random(), 0.8), a: random() * Math.PI * 2, r: 0.6 + random() * 0.5 }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
  const material = new THREE.PointsMaterial({ size: 3.2, map: softDisc('rgba(214,160,110,1)'), color: 0xd9a277, transparent: true, opacity: 0.16, depthWrite: false, sizeAttenuation: true })
  const mesh = new THREE.Points(geometry, material)
  mesh.frustumCulled = false
  world.surface.add(mesh)
  const centre = new THREE.Vector3(), normal = new THREE.Vector3()
  return {
    calls: 1,
    update(time) {
      devils.forEach((devil, d) => {
        // The devil walks in a straight line on the ground, slowly.
        const frame = frameAt(devil.dir)
        const walk = devil.speed * time / world.radius
        const heading = frame.east.clone().multiplyScalar(Math.cos(devil.heading)).addScaledVector(frame.north, Math.sin(devil.heading))
        const dir = devil.dir.clone().addScaledVector(heading, walk).normalize()
        normal.copy(dir).applyQuaternion(world.group.quaternion)
        const ground = surfaceRadius(world, normal) - world.radius
        centre.copy(dir).multiplyScalar(world.radius + ground)
        const local = frameAt(dir)
        for (let i = 0; i < perDevil; i++) {
          const p = particles[d * perDevil + i]
          // A funnel: thin at the ground, wide at the top; the low part turns faster.
          const r = devil.width * (0.18 + 0.82 * Math.pow(p.h, 1.4)) * p.r
          const a = p.a + time * devil.spin * (1.6 - p.h)
          const sway = Math.sin(time * 0.7 + devil.seed + p.h * 2.2) * p.h * 2.5
          const index = (d * perDevil + i) * 3
          const x = Math.cos(a) * r + sway, z = Math.sin(a) * r, y = p.h * devil.height
          points[index] = centre.x + local.east.x * x + local.north.x * z + local.up.x * y
          points[index + 1] = centre.y + local.east.y * x + local.north.y * z + local.up.y * y
          points[index + 2] = centre.z + local.east.z * x + local.north.z * z + local.up.z * y
        }
      })
      geometry.attributes.position.needsUpdate = true
    },
    dispose() { world.surface.remove(mesh); geometry.dispose(); material.map?.dispose(); material.dispose() },
  }
}
