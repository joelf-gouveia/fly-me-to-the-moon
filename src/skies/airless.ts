import * as THREE from 'three'
import { groundHeight } from '../terrain'
import type { PlanetKind } from '../terrain'
import type { World } from '../worlds'
import { glowTexture, skyOf, slotRandom } from './common'
import type { Sky } from './common'

/**
 * The sky of an airless world, the Moon or Mercury (option B of the living worlds study,
 * docs/living-worlds-study.md). The sky stays black and clear, with no clouds. Small stones from space
 * hit the night side and make a short spark of light: telescopes on Earth see these flashes on the
 * Moon. A spark lands 15 to 45 m in front of the camera, only on the night side, only when the camera
 * is lower than 80 m, and in about half of the slots of 2.5 s. None with reduced motion.
 */
export const SPARKS = { slot: 2.5, chance: 0.5, near: 15, far: 45, below: 80, life: 0.6 } as const

export function airlessSky(world: World, sun: THREE.Vector3): Sky {
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff0d8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  glow.name = `${world.kind}-spark`
  world.surface.add(glow)
  const inverse = new THREE.Matrix4(), cameraLocal = new THREE.Vector3(), ahead = new THREE.Vector3(), toSun = new THREE.Vector3()
  let slotOf = -1, place: THREE.Vector3 | null = null, at = 0, size = 0, shown = 0
  const spark = {
    name: `${world.kind}-sparks`,
    sparks: () => shown,
    update({ time, camera, still }: { time: number; camera: THREE.Camera; still: boolean }) {
      const slot = Math.floor(time / SPARKS.slot)
      if (slot !== slotOf) {
        slotOf = slot
        place = null
        inverse.copy(world.group.matrixWorld).invert()
        cameraLocal.copy(camera.position).applyMatrix4(inverse)
        const altitude = cameraLocal.length() - world.radius
        if (!still && altitude < SPARKS.below && slotRandom(slot, world.seed) < SPARKS.chance) {
          // A place in front of the camera and a little to the side, on the ground.
          camera.getWorldDirection(ahead).transformDirection(inverse)
          const up = cameraLocal.clone().normalize()
          ahead.addScaledVector(up, -ahead.dot(up)).normalize()
          const side = new THREE.Vector3().crossVectors(up, ahead)
          const reach = SPARKS.near + slotRandom(slot, world.seed + 1) * (SPARKS.far - SPARKS.near)
          const dir = cameraLocal.clone().addScaledVector(ahead, reach).addScaledVector(side, (slotRandom(slot, world.seed + 2) - 0.5) * reach).normalize()
          // Only on the night side: in the light of the Sun a spark does not show.
          toSun.copy(sun).applyMatrix4(inverse).normalize()
          if (dir.dot(toSun) < -0.03) {
            place = dir.multiplyScalar(world.radius + groundHeight(world.kind as PlanetKind, world.sample(dir.x, dir.y, dir.z)) + 0.4)
            at = slot * SPARKS.slot + slotRandom(slot, world.seed + 3) * (SPARKS.slot - SPARKS.life)
            size = 3.5 + slotRandom(slot, world.seed + 4) * 3
          }
        }
      }
      const age = time - at
      // A spark of a tenth of a second, and a glow that fades in half a second.
      const strength = place && !still && age >= 0 && age < SPARKS.life ? (age < 0.08 ? 1 : Math.exp(-(age - 0.08) * 7)) : 0
      if (place) glow.position.copy(place)
      glow.scale.setScalar(size * (strength > 0.99 ? 1.6 : 1))
      glow.material.opacity = strength
      shown = strength > 0 ? 1 : 0
    },
    dispose() { world.surface.remove(glow); glow.material.map?.dispose(); glow.material.dispose() },
  }
  return skyOf(world, [spark], [])
}
