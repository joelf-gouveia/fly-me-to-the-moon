import * as THREE from 'three'
import type { Feature } from '../lab'
import { surfaceRadius } from '../../../src/worlds'
import type { World } from '../../../src/worlds'
import { sampleResident } from '../../../src/creatures/spherical'
import type { SphericalResident } from '../../../src/creatures/spherical'
import { stickerById } from '../../../src/stickers'
import { chime } from './sound'
import '../../../src/sticker-book.css'
import './f1-search-stars.css'

/**
 * F1 · Search stars. After the hello sticker, each world has one small search task. On Earth
 * the task is "Find a duck on the water." When the fairy comes within 12 m of a duck, a gold
 * star pops up over the duck, a chime plays, and the sticker note shows the search star.
 * The test runs on each frame, so it also works in free flight.
 */
const FIND_DISTANCE = 12
/** The note stays as long as the sticker note of src/sticker-book.ts. */
const NOTE_HOLD = 6.5

// ---- Shared parts (F2 and F3 use them too) ---------------------------------------------------

export const backOut = (k: number) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2)

/**
 * The motion of the sticker note from the clip time: in with a bounce (as `sticker-on` of
 * src/sticker-book.css), then out with a fade after `hold` seconds. CSS animations run on the
 * clock of the page, not of the clip, so the note moves here.
 */
export function noteMotion(element: HTMLElement, age: number, hold = NOTE_HOLD) {
  if (age < 0 || age > hold + 0.6) { element.hidden = true; return }
  element.hidden = false
  const e = backOut(Math.min(age / 0.6, 1))
  element.style.transform = `scale(${1.4 - 0.4 * e}) rotate(${-8 * (1 - e)}deg)`
  element.style.opacity = String(Math.min(age / 0.3, 1) * (age > hold ? 1 - (age - hold) / 0.6 : 1))
}

/**
 * The clock of a resident: the time of sampleResident() that gives the pose of its model now.
 * The population keeps its own clock, so a clip finds it from the model. Then the place of
 * the resident at clip time t is sampleResident(resident, clock + t).
 */
export function residentClock(resident: SphericalResident, root: THREE.Object3D) {
  const normal = new THREE.Vector3(), forward = new THREE.Vector3()
  const seen = root.position.clone().normalize(), facing = new THREE.Vector3(0, 0, 1).applyQuaternion(root.quaternion)
  let best = 0, score = Infinity
  for (let time = 0; time < resident.cycle; time += 0.02) {
    sampleResident(resident, time, normal, forward)
    const value = normal.angleTo(seen) * 200 + (1 - forward.dot(facing)) * 0.5
    if (value < score) { score = value; best = time }
  }
  return best
}

/** The world position of a resident at `time` of its clock, on the water or on the ground. */
export function residentPlace(world: World, resident: SphericalResident, time: number, target = new THREE.Vector3()) {
  const forward = new THREE.Vector3()
  sampleResident(resident, time, target, forward)
  target.applyQuaternion(world.group.quaternion)
  const radius = resident.kind === 'duck' ? world.radius : surfaceRadius(world, target)
  return target.multiplyScalar(radius).add(world.group.position)
}

/** A five-point star as an SVG path, in a 24 × 24 box. */
function starPath() {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.9 : 11.2
    return `${(12 + Math.cos(angle) * r).toFixed(2)} ${(12.6 + Math.sin(angle) * r).toFixed(2)}`
  })
  return `M${points.join('L')}Z`
}
const GOLD_STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="f1-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4b8"/><stop offset=".55" stop-color="#ffd24a"/><stop offset="1" stop-color="#f2a01c"/></linearGradient></defs><path d="${starPath()}" fill="url(#f1-gold)" stroke="#c47a0c" stroke-width="1" stroke-linejoin="round"/></svg>`
const EMPTY_STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${starPath()}" fill="#fff8" stroke="#c9779f" stroke-width="1.4" stroke-dasharray="2.2 1.6" stroke-linejoin="round"/></svg>`

// ---- The feature --------------------------------------------------------------------------------

export const searchStars: Feature = {
  id: 'F1',
  create(lab) {
    const { earth } = lab
    const creatures = earth.creatures!
    const sticker = stickerById('earth')
    const picture = `<span class="planet-picture earth" style="--planet-color:#${new THREE.Color(earth.color).getHexString()}" aria-hidden="true">≈</span>`

    // The duck of the clip: one on calm water near a shore, away from the snow of the poles.
    const ducks = creatures.residents.map((resident, index) => ({ resident, index })).filter(item => item.resident.kind === 'duck')
    const landAround = (dir: THREE.Vector3) => {
      let land = 0, count = 0
      const across = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
      for (let a = 0; a < 16; a++) for (const metres of [20, 32, 45]) {
        const probe = lab.stepAlong(earth, dir, across.clone().applyAxisAngle(dir, a / 16 * Math.PI * 2), metres)
        if (earth.sample(probe.x, probe.y, probe.z).height > 0.6) land++
        count++
      }
      return land / count
    }
    const duck = ducks.filter(item => Math.abs(item.resident.route[0].y) < 0.7)
      .map(item => ({ ...item, score: -Math.abs(landAround(item.resident.route[0]) - 0.35) }))
      .sort((a, b) => b.score - a.score)[0] ?? ducks[0]
    const home = duck.resident.route[0].clone()
    lab.setSunElevation(earth, home, 32)

    // Make the duck models now, without a step of their clock, and read the clock of the duck.
    creatures.update(0, lab.surfacePoint(earth, home, 20))
    const model = creatures.group.getObjectByName(`creature-duck-${duck.index}`)
    const clock = model ? residentClock(duck.resident, model) : 0
    const duckAt = (t: number, target = new THREE.Vector3()) => residentPlace(earth, duck.resident, clock + t, target)

    // The path: over the water toward the duck, with the Sun behind the camera at the find.
    const pass = duckAt(6.6).sub(earth.group.position).applyQuaternion(earth.group.quaternion.clone().invert()).normalize()
    const sunLocal = lab.sun.group.position.clone().sub(earth.group.position).applyQuaternion(earth.group.quaternion.clone().invert()).normalize()
    const sunFlat = sunLocal.clone().addScaledVector(pass, -sunLocal.dot(pass)).normalize()
    const base = new THREE.Vector3().crossVectors(pass, Math.abs(pass.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize()
    let heading = base.clone(), best = -Infinity
    for (let step = 0; step < 24; step++) {
      const h = base.clone().applyAxisAngle(pass, step / 24 * Math.PI * 2)
      const s = new THREE.Vector3().crossVectors(pass, h).normalize()
      let water = 0
      for (let along = -60; along <= 16; along += 4) {
        const probe = lab.stepAlong(earth, pass, h, along)
        if (earth.sample(probe.x, probe.y, probe.z).height < -0.3) water++
      }
      const score = water / 20 * 2 + sunFlat.dot(s.clone().multiplyScalar(-1).addScaledVector(h, -0.6).normalize())
      if (score > best) { best = score; heading = h }
    }
    const side = new THREE.Vector3().crossVectors(pass, heading).normalize()
    const at = (along: number, across: number, alt: number) => {
      let dir = lab.stepAlong(earth, pass, heading, along)
      if (across) dir = lab.stepAlong(earth, dir, side, across)
      const normal = dir.applyQuaternion(earth.group.quaternion)
      return earth.group.position.clone().addScaledVector(normal, Math.max(surfaceRadius(earth, normal), earth.radius) + alt)
    }
    lab.setRailPoints(earth, [at(-60, 3, 10), at(-44, 3, 8.5), at(-28, 3, 6.5)], 0)
    lab.setRailPoints(earth, [at(-28, 3, 6.5), at(-19, 3, 5), at(-10, 3, 4)], 3.2)
    lab.setRailPoints(earth, [at(-10, 3, 4), at(-4, 2.8, 3.4), at(2, 3, 3.4), at(8, 4.4, 4), at(13, 7, 5)], 5.2)

    // ---- The gold star over the duck ----------------------------------------------------------
    const shape = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.24 : 0.56
      if (i) shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
      else shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
    }
    const starGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 2 })
    starGeometry.center()
    const starMaterial = new THREE.MeshStandardMaterial({ color: 0xffcf3f, emissive: 0xffa000, emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.3 })
    const pivot = new THREE.Group()
    pivot.name = 'f1-search-star'
    const star = new THREE.Mesh(starGeometry, starMaterial)
    pivot.add(star)
    const haloMaterial = new THREE.SpriteMaterial({ map: lab.softDisc('rgba(255,222,130,1)'), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    const halo = new THREE.Sprite(haloMaterial)
    pivot.add(halo)
    // Sparkles: they burst out of the star, then circle it and twinkle.
    const sparkleCount = 36
    const sparkleSeeds = Array.from({ length: sparkleCount }, () => ({ dir: new THREE.Vector3().randomDirection(), reach: 0.7 + Math.random() * 1.1, spin: 0.5 + Math.random() }))
    const sparklePositions = new Float32Array(sparkleCount * 3)
    const sparkleGeometry = new THREE.BufferGeometry()
    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3))
    const sparkleMaterial = new THREE.PointsMaterial({ size: 0.22, map: lab.softDisc('rgba(255,240,190,1)'), color: 0xfff0b8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial)
    sparkles.frustumCulled = false
    pivot.add(sparkles)
    pivot.visible = false
    lab.scene.add(pivot)

    // ---- The hint and the note (the real sticker note of src/sticker-book.ts) -------------------
    const host = document.createElement('div')
    host.className = 'sticker-book f1-note'
    host.innerHTML = `
      <div class="f1-hint" role="status" hidden><span class="f1-hint-art">${picture}<span class="f1-badge">${EMPTY_STAR}</span></span><div><small>CAN YOU FIND THIS?</small><p>${sticker.search.task}</p></div></div>
      <div id="sticker-toast" role="status" hidden><span class="sticker-toast-art">${picture}<span class="f1-badge">${GOLD_STAR}</span></span><div><small>SEARCH STAR</small><h2>${sticker.name}</h2><p>${sticker.search.found}</p><p class="sticker-toast-next"></p></div></div>`
    lab.overlay.append(host)
    const hint = host.querySelector<HTMLElement>('.f1-hint')!
    const toast = host.querySelector<HTMLElement>('#sticker-toast')!
    const badge = toast.querySelector<HTMLElement>('.f1-badge')!

    // ---- The camera: the follow camera, then a side view of the fairy and the duck --------------
    const camPosition = new THREE.Vector3(), camLook = new THREE.Vector3(), goal = new THREE.Vector3(), look = new THREE.Vector3()
    const forward = new THREE.Vector3(), fairyUp = new THREE.Vector3(), duckNow = new THREE.Vector3(), mid = new THREE.Vector3(), up = new THREE.Vector3()
    const sideWorld = side.clone().applyQuaternion(earth.group.quaternion), headingWorld = heading.clone().applyQuaternion(earth.group.quaternion)
    let shotLast = -1
    lab.setShot((camera, t) => {
      const fairy = lab.fairy
      forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
      fairyUp.copy(fairy.position).sub(earth.group.position).normalize()
      duckAt(t, duckNow)
      up.copy(duckNow).sub(earth.group.position).normalize()
      mid.copy(fairy.position).lerp(duckNow, 0.45)
      const w = THREE.MathUtils.smoothstep(t, 4.2, 6.4)
      goal.copy(fairy.position).addScaledVector(fairyUp, 2.6).addScaledVector(forward, -7.5)
        .lerp(mid.clone().addScaledVector(sideWorld, -9.5).addScaledVector(up, 3).addScaledVector(headingWorld, -4.5), w)
      look.copy(fairy.position).addScaledVector(forward, 12).lerp(mid.clone().addScaledVector(up, 1.1), w)
      if (shotLast < 0 || t < shotLast) { camPosition.copy(goal); camLook.copy(look) }
      else {
        const k = 1 - Math.exp(-(t - shotLast) * 4)
        camPosition.lerp(goal, k); camLook.lerp(look, k)
      }
      shotLast = t
      camera.position.copy(camPosition)
      camera.up.copy(fairyUp)
      camera.lookAt(camLook)
    })

    // ---- The search: a test on each frame ----------------------------------------------------------
    let found: { model: THREE.Object3D; at: number } | null = null, last = -1
    const spot = new THREE.Vector3(), normal = new THREE.Vector3(), toCamera = new THREE.Vector3()
    function search(t: number) {
      if (found || lab.nearest !== earth) return
      for (const child of creatures.group.children) {
        if (!child.visible || child.userData.species !== 'duck') continue
        if (child.getWorldPosition(spot).distanceTo(lab.fairy.position) > FIND_DISTANCE) continue
        found = { model: child, at: t }
        // A rising chime, brighter than the sticker chime: the search star.
        chime([783.99, 987.77, 1174.66, 1567.98], 0.05)
        return
      }
    }

    return {
      duration: 10,
      still: 6.4,
      update(t) {
        if (t < last) { found = null; shotLast = -1 }
        last = t
        search(t)
        hint.hidden = !!found || t < 0.5
        if (!hint.hidden) noteMotion(hint, t - 0.5, 1e9)
        noteMotion(toast, found ? t - found.at : -1)
        if (!found) { pivot.visible = false; return }
        const age = t - found.at
        // The star rises out of the duck, grows with a bounce, then floats and turns.
        found.model.getWorldPosition(spot)
        normal.copy(spot).sub(earth.group.position).normalize()
        const grow = backOut(Math.min(age / 0.7, 1))
        pivot.visible = true
        pivot.position.copy(spot).addScaledVector(normal, 0.5 + 1.5 * Math.min(age / 0.7, 1) + Math.sin(age * 2.2) * 0.12)
        pivot.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, normal)
        star.scale.setScalar(Math.max(0.01, grow) * 1.4)
        // The star turns once as it pops, then faces the camera with a soft rock.
        toCamera.copy(lab.camera.position).sub(pivot.position).applyQuaternion(pivot.quaternion.clone().invert())
        const settle = Math.min(age / 1.1, 1)
        star.rotation.y = Math.atan2(toCamera.x, toCamera.z) + (1 - settle) ** 2 * Math.PI * 2 + Math.sin(age * 1.7) * 0.45
        halo.scale.setScalar(2.6 + Math.sin(age * 5) * 0.25)
        haloMaterial.opacity = 0.5 * Math.min(age / 0.3, 1)
        for (const [i, seed] of sparkleSeeds.entries()) {
          const reach = seed.reach * Math.min(age / 0.8, 1) ** 0.6
          const turn = age * seed.spin
          const x = seed.dir.x * Math.cos(turn) - seed.dir.z * Math.sin(turn), z = seed.dir.x * Math.sin(turn) + seed.dir.z * Math.cos(turn)
          sparklePositions.set([x * reach, seed.dir.y * reach * 0.8, z * reach], i * 3)
        }
        sparkleGeometry.attributes.position.needsUpdate = true
        sparkleMaterial.size = 0.16 + Math.abs(Math.sin(age * 6)) * 0.12
        // The gold star on the sticker picture pops a little after the note.
        const badgeGrow = backOut(THREE.MathUtils.clamp((age - 0.35) / 0.5, 0, 1))
        badge.style.transform = `scale(${Math.max(0, badgeGrow)}) rotate(${(1 - badgeGrow) * -40}deg)`
      },
      dispose() {
        lab.scene.remove(pivot)
        starGeometry.dispose(); starMaterial.dispose(); haloMaterial.map?.dispose(); haloMaterial.dispose()
        sparkleGeometry.dispose(); sparkleMaterial.map?.dispose(); sparkleMaterial.dispose()
      },
    }
  },
}

