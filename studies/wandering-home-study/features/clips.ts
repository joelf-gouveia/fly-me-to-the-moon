import * as THREE from 'three'
import type { Feature, Lab } from '../../feature-ideas-study/lab'
import { homeCottageNormal } from '../../../src/worlds'
import type { World } from '../../../src/worlds'
import { homeAtSize, moonSlot, sizeById } from '../numbers'
import type { SizeId } from '../numbers'
import { createNovae } from './nova'
import type { NovaLook } from './nova'
import { createCaption, createLayer, createTag, fixedShot, ramp } from './kit'
import { keepHome, moonPathLine, moonPoint, poseFairy, resizeHome, sizeRing } from './home'

/**
 * The six clips of the wandering home study. Each one runs in the lab of the feature ideas study
 * (studies/feature-ideas-study/lab.ts), with the real worlds of the game. The lab does not turn
 * the planets on their orbits, so a clip moves Blossom Haven itself: a hop is a nova at the old
 * place, a nova at the new place, and the move at the peak of the flash (0.25 s after the start).
 */
const NAMES: Record<NovaLook, string> = { blossom: 'A · Blossom nova', star: 'B · Star nova', glow: 'C · Brighter glow' }
const PEAK = 0.25

/** The direction from a place to the Sun (the Sun of the game is at the origin). */
const toSun = (from: THREE.Vector3) => from.clone().multiplyScalar(-1).normalize()
const byKind = (lab: Lab, kind: string) => lab.worlds.find(world => world.kind === kind) as World

/**
 * A, B and C: the same hop with each look. The fairy waits in space 900 m from the home, on its
 * day side. The home leaves in a nova in front of her, and a second nova 5.7 km away shows where
 * it arrives: the clip shows the size of a near nova and of a far one.
 */
function novaClip(look: NovaLook): Feature {
  return {
    id: look,
    create(lab) {
      const restore = keepHome(lab)
      const home = lab.home, start = home.group.position.clone()
      const sun = toSun(start), up = new THREE.Vector3(0, 1, 0)
      const side = new THREE.Vector3().crossVectors(sun, up).normalize()
      const eye = start.clone().addScaledVector(side.clone().multiplyScalar(0.75).addScaledVector(sun, 0.66).normalize(), 900)
      const view = start.clone().sub(eye).normalize(), right = new THREE.Vector3().crossVectors(view, up).normalize()
      const arrival = start.clone().addScaledVector(view, 5000).addScaledVector(right, 1500).addScaledVector(up, 420)
      poseFairy(lab, eye, start.clone().addScaledVector(right, 140).addScaledVector(up, -60), up)
      lab.setFollow(9, 2.4)
      const novae = createNovae(lab.scene, look)
      const { layer, fit } = createLayer(lab)
      const caption = createCaption(layer, [
        [0.3, 1.9, `<b>${NAMES[look]}</b> Blossom Haven, 900 m from the fairy`],
        [2.1, 5.6, `<b>${NAMES[look]}</b> The hop: a nova where it leaves, and one 5.7 km away where it arrives`],
        [5.8, 8.5, `<b>${NAMES[look]}</b> The new place, far away`],
      ])
      let fired = false, moved = false, last = 0
      return {
        duration: 8.5, still: 2.9,
        update(t) {
          fit()
          if (t < last) { fired = moved = false; home.group.position.copy(start); novae.dispose() }
          if (!fired && t >= 2) { fired = true; novae.fire(start, home.radius); novae.fire(arrival, home.radius, false) }
          if (!moved && t >= 2 + PEAK) { moved = true; home.group.position.copy(arrival); home.group.updateMatrixWorld(true) }
          novae.update(Math.max(0, t - last), lab.camera)
          last = t
          caption(t)
        },
        dispose() { novae.dispose(); layer.remove(); restore() },
      }
    },
  }
}

/**
 * S: Blossom Haven arrives as a moon of Saturn, then goes around it. Saturn holds a moon home of
 * each size (numbers.ts). The second half of the clip is 13 times faster: half a turn of a path
 * of 4 minutes, the length of one stay.
 */
const moonOfSaturn: Feature = {
  id: 'S',
  create(lab) {
    const restore = keepHome(lab)
    const home = lab.home, saturn = byKind(lab, 'saturn')
    const centre = saturn.group.position.clone(), sun = toSun(centre), up = new THREE.Vector3(0, 1, 0)
    const side = new THREE.Vector3().crossVectors(sun, up).normalize()
    const distance = moonSlot('saturn', sizeById('today').base).distance
    // The path starts on the side of Saturn in front of the camera, and goes half a turn.
    const turn0 = Math.atan2(sun.z, sun.x) + 0.55
    const eye = centre.clone().addScaledVector(sun.clone().multiplyScalar(0.8).addScaledVector(side, 0.45).addScaledVector(up, 0.42).normalize(), 4600)
    poseFairy(lab, eye, centre.clone().addScaledVector(up, -250), up)
    lab.setFollow(9, 2.6)
    const novae = createNovae(lab.scene, 'blossom')
    const line = moonPathLine(saturn, distance, home.color)
    line.visible = false
    lab.scene.add(line)
    const { layer, fit } = createLayer(lab)
    const tag = createTag(layer)
    const caption = createCaption(layer, [
      [0.2, 1.0, '<b>S · A moon of Saturn</b> Saturn, 4.6 km from the fairy'],
      [1.0, 4.2, `<b>S · A moon of Saturn</b> Blossom Haven arrives on a path ${Math.round(distance).toLocaleString('en')} m from Saturn`],
      [4.4, 13, '<b>S · A moon of Saturn</b> 13 times faster: half a turn in one stay of 2 minutes'],
    ])
    const at = new THREE.Vector3()
    const turnAt = (t: number) => turn0 + ramp(t, 4.4, 13) * Math.PI
    let fired = false, last = 0
    const away = home.group.position.clone()
    return {
      duration: 13, still: 3.2,
      update(t) {
        fit()
        if (t < last) { fired = false; home.group.position.copy(away); novae.dispose() }
        moonPoint(saturn, distance, turnAt(t), at)
        if (!fired && t >= 1) { fired = true; novae.fire(at, home.radius) }
        if (t >= 1 + PEAK) home.group.position.copy(at)
        home.group.updateMatrixWorld(true)
        line.visible = t > 4
        ;(line.material as THREE.LineBasicMaterial).opacity = 0.34 * ramp(t, 4, 5)
        tag(t >= 4.4 ? 'TIME × 13' : null)
        novae.update(Math.max(0, t - last), lab.camera)
        last = t
        caption(t)
      },
      dispose() { novae.dispose(); lab.scene.remove(line); line.geometry.dispose(); layer.remove(); restore() },
    }
  },
}

/**
 * Z: one place in space, and four hops that change the size: Ceres, Earth, Jupiter and back. The
 * gold circle is the size of today. The camera stands still 2.6 km from the home.
 */
const STEPS: [time: number, size: SizeId][] = [[0, 'today'], [2.5, 'ceres'], [5.5, 'earth'], [8.5, 'jupiter'], [11.5, 'today']]
const sizes: Feature = {
  id: 'Z',
  create(lab) {
    const restore = keepHome(lab)
    const home = lab.home, centre = home.group.position.clone(), sun = toSun(centre), up = new THREE.Vector3(0, 1, 0)
    const side = new THREE.Vector3().crossVectors(sun, up).normalize()
    const eye = centre.clone().addScaledVector(sun.clone().multiplyScalar(0.72).addScaledVector(side, 0.62).addScaledVector(up, 0.18).normalize(), 2600)
    lab.setShot(fixedShot(eye, centre))
    // The fairy waits behind the camera, out of the view.
    poseFairy(lab, eye.clone().addScaledVector(eye.clone().sub(centre).normalize(), 40), centre, up)
    const novae = createNovae(lab.scene, 'blossom')
    const ring = sizeRing(homeAtSize(sizeById('today').base).radius)
    ring.position.copy(centre)
    lab.scene.add(ring)
    const { layer, fit } = createLayer(lab)
    const tag = createTag(layer)
    const caption = createCaption(layer, [[0.2, 14, '<b>Z · The sizes</b> The gold circle is Blossom Haven today']])
    let step = 0, fired = 0, last = 0
    return {
      duration: 14, still: 9.4,
      update(t) {
        fit()
        if (t < last) { step = fired = 0; resizeHome(home, sizeById('today').base); novae.dispose() }
        const next = STEPS[step + 1]
        if (next && t >= next[0] && fired <= step) { fired = step + 1; novae.fire(centre, Math.max(home.radius, homeAtSize(sizeById(next[1]).base).radius)) }
        if (next && t >= next[0] + PEAK) { step++; resizeHome(home, sizeById(next[1]).base) }
        const size = sizeById(STEPS[step][1]), info = homeAtSize(size.base)
        tag(`${size.id === 'today' ? 'BLOSSOM HAVEN TODAY' : `AS BIG AS ${size.name.toUpperCase()}`}<small>radius ${Math.round(info.radius)} m</small>`)
        ring.quaternion.copy(lab.camera.quaternion)
        novae.update(Math.max(0, t - last), lab.camera)
        last = t
        caption(t)
      },
      dispose() { novae.dispose(); lab.scene.remove(ring); ring.geometry.dispose(); layer.remove(); restore() },
    }
  },
}

/**
 * H: the hop with the fairy on the home. She flies over the cottage meadow. The hop takes her
 * with the home: a pink flash in her sky, petals that rise from the ground, and then a home as big
 * as Earth on a path around Saturn. Saturn rises in front of her and the Sun is behind her.
 */
const onBoard: Feature = {
  id: 'H',
  create(lab) {
    const restore = keepHome(lab)
    const home = lab.home
    const saturn = byKind(lab, 'saturn')
    // Her path on the ground: from near the cottage, along a great circle, in the local frame of the home.
    const cottage = homeCottageNormal()
    const startDir = cottage.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.22).normalize()
    const heading = new THREE.Vector3().crossVectors(startDir, new THREE.Vector3(1, 0, 0)).normalize()
    const axis = new THREE.Vector3().crossVectors(startDir, heading).normalize()
    lab.setSunElevation(home, startDir, 32)
    const quaternion0 = home.group.quaternion.clone()
    const before = home.group.position.clone()
    const ALT = 8, SPEED = 11
    const novae = createNovae(lab.scene, 'blossom')
    const { layer, fit } = createLayer(lab)
    const flash = document.createElement('div')
    flash.className = 'wh-flash'
    layer.append(flash)
    const tag = createTag(layer)
    const caption = createCaption(layer, [
      [0.3, 3.8, '<b>H · On board</b> She flies over the flower cottage'],
      [4.0, 7.8, '<b>H · On board</b> The hop takes her with it: the home grows to the size of Earth'],
      [8.0, 13, '<b>H · On board</b> Now a moon of Saturn'],
    ])
    const earthSize = sizeById('earth').base
    const distance = moonSlot('saturn', earthSize).distance
    const local = new THREE.Vector3(), forward = new THREE.Vector3(), up = new THREE.Vector3(), next = new THREE.Vector3()
    let hopped = false, fired = false, last = 0
    /** Her local direction after `metres` of flight on a home of `radius`: the angle grows slower on a bigger home. */
    const along = (t: number) => {
      const before = Math.min(t, 4 + PEAK) * SPEED / homeAtSize(sizeById('today').base).radius
      const after = Math.max(0, t - 4 - PEAK) * SPEED / homeAtSize(earthSize).radius
      return before + after
    }
    /** Her rail from `from` to `to` seconds, on the home as it is now. The lab moves her on it and gives her speed. */
    function railPoints(from: number, to: number) {
      return Array.from({ length: 25 }, (_, k) => lab.surfacePoint(home, local.copy(startDir).applyAxisAngle(axis, along(from + (to - from) * k / 24)), ALT))
    }
    function place(t: number) {
      local.copy(startDir).applyAxisAngle(axis, along(t))
      const world = lab.surfacePoint(home, local, ALT)
      up.copy(local).applyQuaternion(home.group.quaternion)
      forward.copy(heading).applyAxisAngle(axis, along(t)).applyQuaternion(home.group.quaternion)
      poseFairy(lab, world, world.clone().add(forward), up)
    }
    /** The new place: Saturn low in front of her (it rises as she flies), and the Sun 42° up behind her. */
    function hop(t: number) {
      resizeHome(home, earthSize)
      local.copy(startDir).applyAxisAngle(axis, along(t))
      const localForward = heading.clone().applyAxisAngle(axis, along(t))
      // The world frame that she must have: forward F and up U. In her frame the Sun is -F cos 42° + U sin 42°.
      const sunDir = toSun(saturn.group.position), sun = THREE.MathUtils.degToRad(42), rise = THREE.MathUtils.degToRad(-5)
      const sideways = new THREE.Vector3(0, 1, 0).addScaledVector(sunDir, -sunDir.y).normalize()
      const U = sunDir.clone().multiplyScalar(Math.sin(sun)).addScaledVector(sideways, Math.cos(sun))
      const F = sunDir.clone().multiplyScalar(-Math.cos(sun)).addScaledVector(sideways, Math.sin(sun))
      // Saturn at the elevation `rise` from her place (h metres over the middle of the home), and `distance` from the middle.
      const view = F.clone().multiplyScalar(Math.cos(rise)).addScaledVector(U, Math.sin(rise))
      const h = homeAtSize(earthSize).radius + ALT
      const far = -h * Math.sin(rise) + Math.sqrt(h * h * Math.sin(rise) ** 2 - h * h + distance * distance)
      next.copy(saturn.group.position).addScaledVector(U, -h).addScaledVector(view, -far)
      // Turn the home so that her local up and forward become U and F.
      const from = new THREE.Matrix4().makeBasis(localForward, local, new THREE.Vector3().crossVectors(localForward, local))
      const to = new THREE.Matrix4().makeBasis(F, U, new THREE.Vector3().crossVectors(F, U))
      home.group.quaternion.setFromRotationMatrix(to.multiply(from.transpose()))
      home.group.position.copy(next)
      home.group.updateMatrixWorld(true)
    }
    // The Moon of the game has no fog, so it shows from the ground of Earth (createMoonMaterial() in src/moon.ts).
    // A planet in the sky of a moon home needs the same: the fog of the air of the home paints it pink.
    const fogged: (THREE.Material & { fog: boolean })[] = []
    saturn.group.traverse(object => {
      const materials = object instanceof THREE.Mesh ? (Array.isArray(object.material) ? object.material : [object.material]) : []
      for (const material of materials as (THREE.Material & { fog?: boolean })[]) if (material.fog) { material.fog = false; material.needsUpdate = true; fogged.push(material as THREE.Material & { fog: boolean }) }
    })
    lab.setRailPoints(home, railPoints(0, 4 + PEAK), 0, 4 + PEAK)
    return {
      duration: 13, still: 9,
      update(t) {
        fit()
        if (t < last) { hopped = fired = false; resizeHome(home, sizeById('today').base); home.group.position.copy(before); home.group.quaternion.copy(quaternion0); home.group.updateMatrixWorld(true); novae.dispose() }
        if (!fired && t >= 4) { fired = true; novae.fire(home.group.position.clone(), home.radius) }
        if (!hopped && t >= 4 + PEAK) {
          hopped = true
          hop(t)
          lab.setRailPoints(home, railPoints(4 + PEAK, 13), 4 + PEAK, 13)
          // The lab places her on the new rail from the next frame; this frame she is there already.
          place(t)
          lab.snapCamera()
        }
        tag(t >= 4 + PEAK ? 'AS BIG AS EARTH<small>a moon of Saturn</small>' : 'BLOSSOM HAVEN TODAY')
        novae.update(Math.max(0, t - last), lab.camera)
        flash.style.opacity = String(novae.flash * 0.5)
        last = t
        caption(t)
      },
      dispose() { novae.dispose(); layer.remove(); restore(); fogged.forEach(material => { material.fog = true; material.needsUpdate = true }) },
    }
  },
}

/** The clips of the wandering home study, in the order of the page. */
export const FEATURES: Record<string, Feature> = {
  A: novaClip('blossom'),
  B: novaClip('star'),
  C: novaClip('glow'),
  S: moonOfSaturn,
  Z: sizes,
  H: onBoard,
}
