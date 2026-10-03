import * as THREE from 'three'
import type { Feature } from '../lab'
import { chime } from './sound'
import { groundRail, tangentOf } from './path'

/**
 * F4 · Sparkle rings. A short line of glowing rings over the meadow. The fairy flies through a
 * ring: a burst of sparkles, a two-note chime, and a longer trail for a few seconds. A ring
 * comes back after 30 s. There is no score and no fail.
 */
const RING_COLOURS = [0xff8fc8, 0xc59bff, 0x7fe3c4, 0xffd36e, 0x8fc9ff, 0xff9fb0]

export const sparkleRings: Feature = {
  id: 'F4',
  create(lab) {
    const { earth, meadowLocal } = lab
    const heading = tangentOf(meadowLocal, 0.4)
    const stops: [number, number, number][] = [[-30, 0, 7], [0, 0, 6], [22, -3, 7], [44, 2, 9], [66, 6, 8], [88, 3, 6], [110, -2, 7], [135, 0, 9]]
    lab.setRail(earth, groundRail(lab, earth, meadowLocal, heading, stops))
    lab.setFollow(7.5, 2.4)

    // The rings sit on the rail, at right angles to it, so the fairy flies through each one.
    const ringStops = groundRail(lab, earth, meadowLocal, heading, stops.slice(1, 7))
    const ringGeometry = new THREE.TorusGeometry(2.2, 0.16, 10, 48)
    const group = new THREE.Group()
    lab.scene.add(group)
    const curve = new THREE.CatmullRomCurve3(groundRail(lab, earth, meadowLocal, heading, stops).map(point => lab.surfacePoint(earth, point.dir, point.alt)), false, 'centripetal')
    const rings = ringStops.map((stop, index) => {
      // Candy colours: pink, lilac, mint and gold, bright in the sun and at night.
      const material = new THREE.MeshBasicMaterial({ color: RING_COLOURS[index % RING_COLOURS.length], transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, fog: false })
      const ring = new THREE.Mesh(ringGeometry, material)
      ring.position.copy(lab.surfacePoint(earth, stop.dir, stop.alt))
      // Face the ring along the path: its axis is the tangent of the rail at the closest point.
      let best = 0, bestDistance = Infinity
      for (let k = 0; k <= 200; k++) {
        const d = curve.getPointAt(k / 200).distanceTo(ring.position)
        if (d < bestDistance) { bestDistance = d; best = k / 200 }
      }
      ring.lookAt(ring.position.clone().add(curve.getTangentAt(best)))
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: lab.softDisc('rgba(255,220,250,1)'), color: material.color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }))
      halo.scale.setScalar(6.5)
      ring.add(halo)
      group.add(ring)
      return { ring, material, halo: halo.material, takenAt: -1 }
    })

    // The burst: 60 sparkles for each ring, fired outward from the ring centre.
    const burstCount = 60
    const burstGeometry = new THREE.BufferGeometry()
    const burstPositions = new Float32Array(rings.length * burstCount * 3)
    const burstVelocities = new Float32Array(rings.length * burstCount * 3)
    burstGeometry.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3))
    const burstMaterial = new THREE.PointsMaterial({ size: 0.35, map: lab.softDisc('rgba(255,236,200,1)'), color: 0xffe3f6, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })
    const bursts = new THREE.Points(burstGeometry, burstMaterial)
    bursts.frustumCulled = false
    group.add(bursts)
    const hide = () => burstPositions.fill(1e6)
    hide()

    const { trailMaterial } = lab
    let trailUntil = -1, last = -1

    return {
      duration: 9,
      update(t, delta) {
        if (t < last) { rings.forEach(item => { item.takenAt = -1 }); hide(); trailUntil = -1 }
        last = t
        for (const [index, item] of rings.entries()) {
          const age = item.takenAt < 0 ? -1 : t - item.takenAt
          if (item.takenAt < 0 && lab.fairy.position.distanceTo(item.ring.position) < 2.4) {
            item.takenAt = t; trailUntil = t + 4
            chime([659.25, 987.77], 0.05)
            const base = index * burstCount * 3
            for (let i = 0; i < burstCount; i++) {
              const v = new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 5)
              burstPositions.set([item.ring.position.x, item.ring.position.y, item.ring.position.z], base + i * 3)
              burstVelocities.set([v.x, v.y, v.z], base + i * 3)
            }
          }
          // A taken ring grows and fades; it comes back after 30 s.
          if (age >= 0 && age < 30) {
            item.ring.scale.setScalar(1 + Math.min(age, 0.5) * 0.7)
            item.material.opacity = Math.max(0, 0.95 - age * 2.4)
          } else {
            if (age >= 30) item.takenAt = -1
            item.ring.scale.setScalar(1 + Math.sin(t * 2.4 + index) * 0.04)
            item.material.opacity = 0.95
          }
          item.halo.opacity = item.material.opacity * 0.28
          item.ring.rotation.z += delta * 0.6
        }
        for (let i = 0; i < burstPositions.length; i += 3) {
          if (burstPositions[i] > 1e5) continue
          const owner = rings[Math.floor(i / 3 / burstCount)]
          if (owner.takenAt < 0 || t - owner.takenAt > 1.6) { burstPositions[i] = 1e6; continue }
          burstPositions[i] += burstVelocities[i] * delta
          burstPositions[i + 1] += burstVelocities[i + 1] * delta
          burstPositions[i + 2] += burstVelocities[i + 2] * delta
          burstVelocities[i] *= 1 - delta * 1.6; burstVelocities[i + 1] *= 1 - delta * 1.6; burstVelocities[i + 2] *= 1 - delta * 1.6
        }
        burstGeometry.attributes.position.needsUpdate = true
        burstMaterial.opacity = 0.9
        // The longer trail: bigger points for 4 s after a ring.
        trailMaterial.size = t < trailUntil ? 0.42 : 0.2
      },
      dispose() {
        trailMaterial.size = 0.2
        lab.scene.remove(group)
        ringGeometry.dispose(); burstGeometry.dispose(); burstMaterial.dispose()
        rings.forEach(item => { item.material.dispose(); item.halo.dispose() })
      },
    }
  },
}
