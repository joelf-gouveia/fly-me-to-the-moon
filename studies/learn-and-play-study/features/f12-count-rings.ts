import * as THREE from 'three'
import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { groundRail, tangentOf } from '../../feature-ideas-study/features/path'
import { RING_COLOURS } from '../../../src/rings'
import { createBurst, overlay, pop } from './shared'

/**
 * F12 · Count and shape rings. A line of sparkle rings counts with the child: the first ring
 * has one dot, the next has two, to five. When the fairy flies through a ring, its number
 * shows large with the same dots, and one note of a rising scale plays. There is no score:
 * a ring that she does not take stays for the next pass.
 */
const SCALE = [523.25, 587.33, 659.25, 783.99, 1046.5]

/** The dots of a ring, as the dots of a dice, on a sprite over the ring. */
function dotTexture(count: number) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const places = [[[.5, .5]], [[.3, .5], [.7, .5]], [[.5, .28], [.28, .7], [.72, .7]], [[.3, .3], [.7, .3], [.3, .7], [.7, .7]], [[.28, .28], [.72, .28], [.5, .5], [.28, .72], [.72, .72]]][count - 1]
  ctx.fillStyle = '#3a1d4ecc'
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffd36e'; ctx.shadowColor = '#ffd36e'; ctx.shadowBlur = 14
  for (const [x, y] of places) { ctx.beginPath(); ctx.arc(x * size, y * size, size * 0.09, 0, Math.PI * 2); ctx.fill() }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export const countRings: Feature = {
  id: 'F12',
  create(lab) {
    const { earth, meadowLocal } = lab
    const heading = tangentOf(meadowLocal, 0.4)
    const stops: [number, number, number][] = [[-34, 0, 7], [-6, 0, 6], [18, -3, 7], [42, 2, 9], [66, 6, 8], [90, 3, 6.5], [112, -1, 7.5], [132, 0, 9]]
    const rail = groundRail(lab, earth, meadowLocal, heading, stops)
    lab.setRail(earth, rail)
    lab.setFollow(8.5, 2.6)
    const curve = new THREE.CatmullRomCurve3(rail.map(point => lab.surfacePoint(earth, point.dir, point.alt)), false, 'centripetal')
    const group = new THREE.Group()
    lab.scene.add(group)
    const geometry = new THREE.TorusGeometry(2.2, 0.16, 10, 48)
    const rings = groundRail(lab, earth, meadowLocal, heading, stops.slice(1, 6)).map((stop, index) => {
      const material = new THREE.MeshBasicMaterial({ color: RING_COLOURS[index], transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, fog: false })
      const ring = new THREE.Mesh(geometry, material)
      ring.position.copy(lab.surfacePoint(earth, stop.dir, stop.alt))
      let best = 0, bestDistance = Infinity
      for (let k = 0; k <= 200; k++) {
        const d = curve.getPointAt(k / 200).distanceTo(ring.position)
        if (d < bestDistance) { bestDistance = d; best = k / 200 }
      }
      ring.lookAt(ring.position.clone().add(curve.getTangentAt(best)))
      // The dots stand over the ring, so the child reads them before the fairy arrives.
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(index + 1), transparent: true, depthWrite: false, fog: false, toneMapped: false }))
      label.scale.setScalar(2.1)
      label.position.copy(ring.position).addScaledVector(lab.upAt(earth, ring.position), 3.6)
      group.add(ring, label)
      return { ring, material, label: label.material, takenAt: -1 }
    })
    const burst = createBurst(lab, 60)
    const colour = (index: number) => `#${new THREE.Color(RING_COLOURS[index]).getHexString()}`
    const root = overlay(lab, `
      <div class="f12-number"><b></b><span></span></div>
      <div class="lp-strip"><div class="lp-strip-title"><small>COUNT WITH ME</small></div>${rings.map((_, index) => `<div class="lp-slot f12-count" style="--ring:${colour(index)}">${index + 1}</div>`).join('')}</div>`)
    const number = root.querySelector<HTMLElement>('.f12-number')!, slots = [...root.querySelectorAll<HTMLElement>('.f12-count')]
    let last = -1, shown = -1, shownAt = -1

    return {
      duration: 9.5,
      still: 5.9,
      update(t, delta) {
        if (t < last) { rings.forEach(item => { item.takenAt = -1 }); shown = -1; shownAt = -1 }
        last = t
        for (const [index, item] of rings.entries()) {
          if (item.takenAt < 0 && lab.fairy.position.distanceTo(item.ring.position) < 2.5) {
            item.takenAt = t; shown = index; shownAt = t
            chime([SCALE[index]], 0.06)
            burst.fire(item.ring.position, t)
            number.querySelector('b')!.textContent = String(index + 1)
            number.querySelector('span')!.innerHTML = '<i></i>'.repeat(index + 1)
          }
          const age = item.takenAt < 0 ? -1 : t - item.takenAt
          item.ring.scale.setScalar(age < 0 ? 1 + Math.sin(t * 2.4 + index) * 0.04 : 1 + Math.min(age, 0.5) * 0.7)
          item.material.opacity = age < 0 ? 0.95 : Math.max(0, 0.95 - age * 2.4)
          item.label.opacity = age < 0 ? 1 : Math.max(0, 1 - age * 3)
          item.ring.rotation.z += delta * 0.6
          slots[index].classList.toggle('is-full', age >= 0)
          slots[index].style.transform = age >= 0 && age < 0.5 ? `scale(${1 + Math.sin(age * Math.PI * 2) * 0.3})` : ''
        }
        burst.update(t, delta)
        pop(number, shown < 0 ? -1 : t - shownAt, 0.9)
      },
      dispose() {
        lab.scene.remove(group)
        burst.dispose(); geometry.dispose()
        rings.forEach(item => { item.material.dispose(); item.label.map?.dispose(); item.label.dispose() })
      },
    }
  },
}
