import * as THREE from 'three'
import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { groundRail } from '../../feature-ideas-study/features/path'
import { backOut } from '../../feature-ideas-study/features/f1-search-stars'
import { stickerById } from '../../../src/stickers'
import type { StickerId } from '../../../src/stickers'
import { createBurst, overlay, pop, ramp, smooth, tipToSun } from './shared'

/**
 * F17 · Cottage garden. Each new sticker gives a seed. The fairy brings the seed home, and a
 * flower of that world grows next to the flower cottage. The garden shows the progress of the
 * child with no number and no score. Blossom Haven keeps one landscape, so the garden has a
 * fixed place there.
 */
const COTTAGE = new THREE.Vector3(0, -1, 0)
/** The door of the cottage faces the local +z direction. */
const FRONT = new THREE.Vector3(0, 0, 1)
/** The flowers of the clip, in the order of the sticker book. The last one grows in the clip. */
export const GARDEN: StickerId[] = ['earth', 'moon', 'venus', 'mercury', 'saturn']
/** The place of each flower: metres in front of the door, and metres to the side. */
const BEDS: [number, number][] = [[7.4, 4.2], [9, 6.6], [9.8, 9.4], [9.6, 12.2], [8.4, 14.8]]
/** A bright colour for the petals of each flower. The sticker colours of the worlds are too soft for a flower. */
const PETALS: Partial<Record<StickerId, number>> = { earth: 0x4fb4ff, moon: 0xf1eefb, venus: 0xffb347, mercury: 0xd9a066, saturn: 0xffd75e }
const SEED_AT = 5.3, GROW_AT = 6.5

function createFlower(id: StickerId) {
  const colour = new THREE.Color(PETALS[id] ?? stickerById(id).color)
  const group = new THREE.Group()
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x7ccf8f, roughness: 0.7 })
  const petalMaterial = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, emissive: colour, emissiveIntensity: 0.18 })
  const heartMaterial = new THREE.MeshStandardMaterial({ color: stickerById(id).color, roughness: 0.5, emissive: stickerById(id).color, emissiveIntensity: 0.3 })
  const sphere = new THREE.SphereGeometry(1, 16, 12), stemGeometry = new THREE.CylinderGeometry(0.07, 0.1, 1.9, 8)
  const stem = new THREE.Mesh(stemGeometry, stemMaterial)
  stem.position.y = 0.95
  group.add(stem)
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(sphere, stemMaterial)
    leaf.scale.set(0.34, 0.06, 0.16); leaf.position.set(side * 0.3, 0.7 + side * 0.12, 0); leaf.rotation.z = side * 0.5
    group.add(leaf)
  }
  const head = new THREE.Group()
  head.position.y = 2
  head.rotation.x = 0.5
  for (let i = 0; i < 8; i++) {
    const petal = new THREE.Mesh(sphere, petalMaterial)
    const angle = i / 8 * Math.PI * 2
    petal.scale.set(0.3, 0.2, 0.09); petal.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0); petal.rotation.z = angle
    head.add(petal)
  }
  // The middle of the flower is the world: a small ball in its colour. Saturn keeps its ring.
  const heart = new THREE.Mesh(sphere, heartMaterial)
  heart.scale.setScalar(0.34); heart.position.z = 0.1
  head.add(heart)
  const extra: THREE.BufferGeometry[] = []
  if (id === 'saturn') {
    const ringGeometry = new THREE.TorusGeometry(0.52, 0.045, 8, 40)
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshStandardMaterial({ color: 0xf4e2b8, roughness: 0.4, emissive: 0xf4e2b8, emissiveIntensity: 0.3 }))
    ring.position.z = 0.12; ring.rotation.x = 1.15
    head.add(ring)
    extra.push(ringGeometry)
  }
  group.add(head)
  return { group, head, dispose() { [sphere, stemGeometry, ...extra].forEach(item => item.dispose()); [stemMaterial, petalMaterial, heartMaterial].forEach(item => item.dispose()) } }
}

export const cottageGarden: Feature = {
  id: 'F17',
  create(lab) {
    const { home } = lab
    const untip = tipToSun(lab, home, new THREE.Vector3(0.1, -1, 0.25), 38)
    const flight: [number, number, number][] = [[50, 24, 9], [40, 18, 8], [30, 12.5, 6], [21, 8.4, 4.4]]
    const hover: [number, number, number][] = [[21, 8.4, 4.4], [18.6, 7.4, 3.8], [16.8, 6.8, 3.5], [15.6, 6.4, 3.4]]
    lab.setRail(home, groundRail(lab, home, COTTAGE, FRONT, flight), 0, 4.4)
    lab.setRail(home, groundRail(lab, home, COTTAGE, FRONT, hover), 4.4)
    const place = (along: number, across: number, alt: number) => { const [point] = groundRail(lab, home, COTTAGE, FRONT, [[along, across, alt]]); return lab.surfacePoint(home, point.dir, point.alt) }

    const flowers = GARDEN.map((id, index) => {
      const flower = createFlower(id)
      const ground = place(BEDS[index][0], BEDS[index][1], 0)
      flower.group.position.copy(ground)
      flower.group.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, lab.upAt(home, ground))
      // Each flower turns its face to the path of the fairy.
      flower.group.rotateY(-0.5 + index * 0.1)
      lab.scene.add(flower.group)
      return { ...flower, ground }
    })
    const fresh = flowers[flowers.length - 1]
    const seedMaterial = new THREE.SpriteMaterial({ map: lab.softDisc('rgba(255,236,170,1)'), color: 0xffe9a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    const seed = new THREE.Sprite(seedMaterial)
    seed.scale.setScalar(0.9)
    lab.scene.add(seed)
    const burst = createBurst(lab, 70, 0xffe9c0)

    // The camera: the follow camera, then a view of the garden with the cottage behind it.
    const eye = place(23.5, 13.5, 4.4), aim = place(8.8, 9, 2.2), up = lab.upAt(home, aim)
    const goal = new THREE.Vector3(), look = new THREE.Vector3(), forward = new THREE.Vector3(), fairyUp = new THREE.Vector3()
    lab.setShot((camera, t) => {
      const w = smooth(ramp(t, 2.6, 5))
      forward.set(0, 0, -1).applyQuaternion(lab.fairy.quaternion)
      fairyUp.copy(lab.upAt(home, lab.fairy.position))
      goal.copy(lab.fairy.position).addScaledVector(fairyUp, 2.6).addScaledVector(forward, -7.5).lerp(eye, w)
      look.copy(lab.fairy.position).addScaledVector(forward, 12).lerp(aim, w)
      camera.position.copy(goal)
      camera.up.copy(fairyUp).lerp(up, w).normalize()
      camera.lookAt(look)
    })

    const colour = (id: StickerId) => `#${new THREE.Color(stickerById(id).color).getHexString()}`
    const root = overlay(lab, `
      <div class="lp-card"><div class="lp-art"><span>🌱</span></div><div><small>A SEED FROM SATURN</small><h2>A new flower</h2><p>Each sticker grows a flower at home.</p></div></div>
      <div class="lp-strip"><div class="lp-strip-title"><small>COTTAGE GARDEN</small><b id="f17-count"></b></div>${[...GARDEN, 'jupiter' as StickerId].map((id, index) => `<div class="lp-slot ${index < GARDEN.length - 1 ? 'is-full' : 'is-empty'}" style="background:${colour(id)}"><span>🌸</span></div>`).join('')}</div>`)
    const note = root.querySelector<HTMLElement>('.lp-card')!, count = root.querySelector<HTMLElement>('#f17-count')!
    const slot = root.querySelectorAll<HTMLElement>('.lp-slot')[GARDEN.length - 1]
    let last = -1, chimed = 0

    return {
      duration: 11,
      still: 8.6,
      update(t, delta) {
        if (t < last) chimed = 0
        last = t
        flowers.forEach((flower, index) => {
          const grown = flower === fresh ? backOut(ramp(t, GROW_AT, GROW_AT + 1.3)) : 1
          flower.group.scale.setScalar(Math.max(0.001, grown) * 1.5)
          flower.head.rotation.z = Math.sin(t * 1.3 + index) * 0.12
        })
        // The seed leaves the hand of the fairy and falls to its bed.
        const fall = smooth(ramp(t, SEED_AT, GROW_AT))
        seed.visible = t > SEED_AT && t < GROW_AT + 0.1
        seed.position.copy(lab.fairy.position).lerp(fresh.ground, fall).addScaledVector(up, Math.sin(fall * Math.PI) * 1.4)
        if (t >= SEED_AT && chimed < 1) { chimed = 1; chime([783.99], 0.04) }
        if (t >= GROW_AT && chimed < 2) { chimed = 2; chime([523.25, 659.25, 783.99, 1046.5], 0.05); burst.fire(fresh.ground.clone().addScaledVector(up, 2.6), t, 3.2) }
        burst.update(t, delta)
        pop(note, t - (SEED_AT - 0.4), 4.2)
        const done = t > GROW_AT + 0.6
        slot.classList.toggle('is-empty', !done)
        slot.classList.toggle('is-full', done)
        count.textContent = `${GARDEN.length - (done ? 0 : 1)} of 13`
      },
      dispose() {
        flowers.forEach(flower => { lab.scene.remove(flower.group); flower.dispose() })
        lab.scene.remove(seed)
        seedMaterial.map?.dispose(); seedMaterial.dispose()
        burst.dispose()
        untip()
      },
    }
  },
}
