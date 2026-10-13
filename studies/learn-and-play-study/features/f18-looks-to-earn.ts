import * as THREE from 'three'
import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { orientFlight } from '../../../src/flight'
import { createBurst, overlay, pop, ramp, smooth } from './shared'

/**
 * F18 · Looks to earn. A search star opens a new look that comes from its world. The clip shows
 * the star of Saturn ("Fly over the rings"): a gift opens, and the fairy gets the Ring trail, a
 * trail of small gold rings. Each look of today stays open from the start; only the new looks
 * are gifts.
 */
/** One new look for each world, as a first list for the design. */
export const GIFTS: { world: string; look: string; part: 'Trail' | 'Wings' | 'Hair' | 'Dress' }[] = [
  { world: 'Sun', look: 'Sunbeam trail', part: 'Trail' },
  { world: 'Mercury', look: 'Silver dress', part: 'Dress' },
  { world: 'Venus', look: 'Golden cloud wings', part: 'Wings' },
  { world: 'Earth', look: 'Rainbow trail', part: 'Trail' },
  { world: 'Moon', look: 'Moonlight wings', part: 'Wings' },
  { world: 'Mars', look: 'Red dust trail', part: 'Trail' },
  { world: 'Vesta', look: 'Pebble crown', part: 'Hair' },
  { world: 'Ceres', look: 'Salt sparkle dress', part: 'Dress' },
  { world: 'Jupiter', look: 'Storm swirl wings', part: 'Wings' },
  { world: 'Saturn', look: 'Ring trail', part: 'Trail' },
  { world: 'Uranus', look: 'Ice blue hair', part: 'Hair' },
  { world: 'Neptune', look: 'Deep sea dress', part: 'Dress' },
  { world: 'Blossom Haven', look: 'Soda bubble trail', part: 'Trail' },
]
const GIFT_AT = 3.4, TRAIL_AT = 4.6, RINGS = 44

export const looksToEarn: Feature = {
  id: 'F18',
  create(lab) {
    const saturn = lab.byKind('saturn')
    saturn.group.updateMatrixWorld(true)
    // The plane of the rings: the flat ring mesh of the planet gives its normal.
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(saturn.group.quaternion)
    saturn.group.traverse(object => {
      if (object instanceof THREE.Mesh && object.geometry.type === 'RingGeometry') normal.set(0, 1, 0).applyQuaternion(object.getWorldQuaternion(new THREE.Quaternion()))
    })
    const centre = saturn.group.position
    const toSun = lab.sun.group.position.clone().sub(centre).normalize()
    if (normal.dot(toSun) < 0) normal.negate()
    // A path over the day side of the rings, from the outer ring to the gap.
    const x = toSun.clone().addScaledVector(normal, -toSun.dot(normal)).normalize(), y = new THREE.Vector3().crossVectors(normal, x)
    const point = (angle: number, radius: number, height: number) => centre.clone().addScaledVector(x, Math.cos(angle) * radius * saturn.radius).addScaledVector(y, Math.sin(angle) * radius * saturn.radius).addScaledVector(normal, height)
    lab.setRailPoints(saturn, Array.from({ length: 9 }, (_, i) => point(-0.2 + i * 0.03, 1.95 - i * 0.04, 16 - Math.sin(i / 8 * Math.PI) * 6)))

    // The camera keeps the rings flat under the fairy: its up is the normal of the rings, not the line from the planet.
    const forward = new THREE.Vector3(), goal = new THREE.Vector3(), eye = new THREE.Vector3(), look = new THREE.Vector3()
    let shotLast = -1
    lab.setShot((camera, t) => {
      forward.set(0, 0, -1).applyQuaternion(lab.fairy.quaternion)
      goal.copy(lab.fairy.position).addScaledVector(forward, -8.5).addScaledVector(normal, 3.2)
      if (shotLast < 0 || t < shotLast) eye.copy(goal)
      else eye.lerp(goal, 1 - Math.exp(-(t - shotLast) * 6))
      shotLast = t
      look.copy(lab.fairy.position).addScaledVector(forward, 10)
      camera.position.copy(eye)
      camera.up.copy(normal)
      camera.lookAt(look)
    })

    // The Ring trail: small gold rings that she leaves behind. Each ring grows and fades.
    const geometry = new THREE.TorusGeometry(0.42, 0.045, 8, 28)
    const rings = Array.from({ length: RINGS }, () => {
      const material = new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.visible = false
      lab.scene.add(mesh)
      return { mesh, material, bornAt: -1 }
    })
    const burst = createBurst(lab, 80, 0xffe3a0)
    const savedSize = lab.trailMaterial.size

    const root = overlay(lab, `<div class="lp-card f18-gift"><div class="lp-art"><span>🎁</span></div><div><small>A GIFT FROM SATURN</small><h2>Ring trail</h2><p>Your search star opens a new look.</p><span class="lp-pill">NEW IN YOUR FAIRY</span></div></div>`)
    const note = root.querySelector<HTMLElement>('.lp-card')!, art = note.querySelector<HTMLElement>('.lp-art span')!
    const heading = new THREE.Vector3(), previous = new THREE.Vector3()
    let last = -1, next = 0, cursor = 0, chimed = 0

    return {
      duration: 10,
      still: 7,
      update(t, delta) {
        if (t < last) { rings.forEach(ring => { ring.bornAt = -1; ring.mesh.visible = false }); next = 0; chimed = 0; shotLast = -1 }
        last = t
        // She flies over the rings with her back to the sky of the rings.
        heading.copy(lab.fairy.position).sub(previous)
        if (lab.mode === 'clip' && heading.lengthSq() > 1e-8 && heading.lengthSq() < 4) orientFlight(lab.fairy.quaternion, heading.normalize(), normal)
        previous.copy(lab.fairy.position)
        if (t >= GIFT_AT && chimed < 1) { chimed = 1; chime([783.99, 987.77, 1174.66], 0.05) }
        if (t >= TRAIL_AT && chimed < 2) { chimed = 2; chime([1046.5, 1318.5, 1568], 0.05); burst.fire(lab.fairy.position, t, 5) }
        pop(note, t - GIFT_AT, 4.6)
        art.textContent = t > TRAIL_AT ? '💫' : '🎁'
        art.style.transform = `rotate(${Math.sin(t * 14) * 8 * (1 - smooth(ramp(t, GIFT_AT, TRAIL_AT)))}deg)`
        // After the gift opens, the old trail goes and the rings come.
        const on = t >= TRAIL_AT
        lab.trailMaterial.size = on ? 0 : savedSize
        if (on && t >= next && delta > 0) {
          next = t + 0.055
          const ring = rings[cursor++ % RINGS]
          ring.bornAt = t
          ring.mesh.position.copy(lab.fairy.position)
          ring.mesh.quaternion.copy(lab.fairy.quaternion)
          ring.mesh.visible = true
        }
        for (const ring of rings) {
          const age = ring.bornAt < 0 ? -1 : t - ring.bornAt
          if (age < 0 || age > 2.2) { ring.mesh.visible = false; continue }
          ring.mesh.scale.setScalar(0.5 + age * 0.9)
          ring.material.opacity = Math.min(1, age * 6) * (1 - age / 2.2) * 0.95
        }
        burst.update(t, delta)
      },
      dispose() {
        lab.trailMaterial.size = savedSize
        rings.forEach(ring => { lab.scene.remove(ring.mesh); ring.material.dispose() })
        geometry.dispose(); burst.dispose()
      },
    }
  },
}
