import * as THREE from 'three'
import { surfaceRadius } from '../../../src/worlds'
import type { World } from '../../../src/worlds'
import { updatePlanetLooks } from '../../../src/planet-paint'
import { sceneryObstacles } from '../../../src/rings'
import type { Species } from '../../../src/creatures/habitat'
import type { Lab } from '../../feature-ideas-study/lab'
import { backOut, residentClock, residentPlace } from '../../feature-ideas-study/features/f1-search-stars'
import './features.css'

/** The parts that the ten features of this study share: the overlay, the pictures and the pass of a creature. */
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
export const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
export const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * The layer of a feature over the 3D view. The sizes of its parts are in `em`, and 1 em is
 * 16 px in the 1280 px wide clip, so the layer has the same proportions in the smaller live view.
 */
export function overlay(lab: Lab, html: string) {
  const root = document.createElement('div')
  root.className = 'lp-root'
  root.innerHTML = `<div class="lp-scale">${html}</div>`
  lab.overlay.append(root)
  return root
}

/**
 * Shows a part with a bounce at `age` 0, and hides it with a fade after `hold` seconds. The
 * clip time moves the part: a CSS animation runs on the clock of the page, not of the clip.
 */
export function pop(element: HTMLElement, age: number, hold = 1e9, extra = '') {
  if (age < 0 || age > hold + 0.5) { element.style.visibility = 'hidden'; return }
  element.style.visibility = 'visible'
  const grow = backOut(Math.min(age / 0.5, 1))
  element.style.opacity = String(Math.min(age / 0.25, 1) * (age > hold ? 1 - (age - hold) / 0.5 : 1))
  element.style.transform = `${extra} scale(${0.6 + 0.4 * grow})`
}

/** A copy of the middle of the 3D view as a picture. `wide` keeps the 16:9 shape; the default is a square. */
export function grab(lab: Lab, size = 256, wide = false) {
  const source = lab.renderer.domElement
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = wide ? Math.round(size * source.height / source.width) : size
  const side = Math.min(source.width, source.height)
  const ctx = canvas.getContext('2d')!
  if (wide) ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  else ctx.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.86)
}

/**
 * A picture of a world from space, from the engine of the game: the camera looks at the day
 * side, and the world fills `fill` of the picture. Call it from update(), not from create():
 * the frame of the clip draws after it, so the view shows no trace of it.
 */
export function worldPicture(lab: Lab, world: World, fill = 0.9, size = 256) {
  const { scene, renderer, sun } = lab
  const camera = new THREE.PerspectiveCamera(30, lab.camera.aspect, 1, 400000)
  const centre = world.group.position
  const toSun = world === sun ? new THREE.Vector3(0, 0, 1) : sun.group.position.clone().sub(centre).normalize()
  const direction = toSun.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.6).add(new THREE.Vector3(0, 0.22, 0)).normalize()
  const distance = world.radius / Math.sin(Math.atan(fill * Math.tan(THREE.MathUtils.degToRad(15))))
  camera.position.copy(centre).addScaledVector(direction, distance)
  camera.lookAt(centre)
  camera.updateMatrixWorld()
  const fog = scene.fog as THREE.FogExp2, background = scene.background as THREE.Color
  const savedDensity = fog.density, savedBackground = background.clone(), fairyShown = lab.fairy.visible
  fog.density = 0
  background.set(0x02030f)
  lab.fairy.visible = false
  lab.stars.update(camera.position, 0, renderer.getPixelRatio())
  updatePlanetLooks(lab.worlds, camera.position)
  renderer.render(scene, camera)
  const picture = grab(lab, size)
  fog.density = savedDensity
  background.copy(savedBackground)
  lab.fairy.visible = fairyShown
  updatePlanetLooks(lab.worlds, lab.camera.position)
  return picture
}

/** A picture of one model on a plain colour, for a card of a book. The model must have no parent. */
export function portrait(lab: Lab, model: THREE.Object3D, colour = 0xffe9f3, yaw = 0.7, size = 256) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(colour)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a48f, 2.4))
  const key = new THREE.DirectionalLight(0xfff1dd, 2.2)
  key.position.set(2, 3, 4)
  scene.add(key)
  const holder = new THREE.Group()
  holder.add(model)
  holder.rotation.y = yaw
  scene.add(holder)
  holder.updateMatrixWorld(true)
  // The box of the parts that show: a hidden effect of a model can reach far from its body.
  const box = new THREE.Box3()
  holder.traverseVisible(object => { if (object instanceof THREE.Mesh) box.expandByObject(object) })
  const centre = box.getCenter(new THREE.Vector3()), extent = box.getSize(new THREE.Vector3())
  const camera = new THREE.PerspectiveCamera(30, lab.camera.aspect, 0.05, 200)
  const reach = Math.max(extent.x, extent.y, extent.z) * 0.62
  camera.position.copy(centre).add(new THREE.Vector3(0, reach * 0.35, reach / Math.tan(THREE.MathUtils.degToRad(15))))
  camera.lookAt(centre)
  lab.renderer.render(scene, camera)
  const picture = grab(lab, size)
  holder.remove(model)
  key.dispose()
  return picture
}

/**
 * The fairy flies past one creature of a world, and the camera turns to a side view of the two.
 * The creature walks or swims on its own clock, so the path goes to the place of the creature at
 * the time `passAt`. The heading keeps the path over the right ground, away from the trees, with
 * the Sun behind the camera.
 */
export function creaturePass(lab: Lab, world: World, kinds: Species[], passAt: number, options: { sun?: number; alt?: number; view?: number } = {}) {
  const creatures = world.creatures!
  const water = kinds.includes('duck')
  const centre = world.group.position
  const all = creatures.residents.map((resident, index) => ({ resident, index }))
  // The first kind of the list that lives away from the poles, nearest to the meadow.
  const pick = kinds.flatMap(kind => all.filter(item => item.resident.kind === kind && Math.abs(item.resident.route[0].y) < 0.7)
    .sort((a, b) => a.resident.route[0].angleTo(lab.meadowLocal) - b.resident.route[0].angleTo(lab.meadowLocal)).slice(0, 1))[0] ?? all[0]
  const home = pick.resident.route[0].clone()
  lab.setSunElevation(world, home, options.sun ?? 34)
  // Make the models now, without a step of their clock, and read the clock of the creature.
  creatures.update(0, lab.surfacePoint(world, home, 20))
  const model = creatures.group.getObjectByName(`creature-${pick.resident.kind}-${pick.index}`) ?? null
  const clock = model ? residentClock(pick.resident, model) : 0
  const placeAt = (t: number, target = new THREE.Vector3()) => residentPlace(world, pick.resident, clock + t, target)

  const unspin = world.group.quaternion.clone().invert()
  const pass = placeAt(passAt).sub(centre).applyQuaternion(unspin).normalize()
  const sunLocal = lab.sun.group.position.clone().sub(centre).applyQuaternion(unspin).normalize()
  const sunFlat = sunLocal.clone().addScaledVector(pass, -sunLocal.dot(pass)).normalize()
  const base = new THREE.Vector3().crossVectors(pass, Math.abs(pass.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize()
  const obstacles = water ? [] : sceneryObstacles(world).filter(item => item.normal.angleTo(pass) * world.radius < 90)
  const low = options.alt ?? 3.2, view = options.view ?? 9.5
  let heading = base.clone(), best = -Infinity
  for (let step = 0; step < 24; step++) {
    const h = base.clone().applyAxisAngle(pass, step / 24 * Math.PI * 2)
    const s = new THREE.Vector3().crossVectors(pass, h).normalize()
    let right = 0, blocked = 0
    for (let along = -60; along <= 16; along += 4) {
      // The fairy flies 3 m to the side of the creature.
      const probe = lab.stepAlong(world, lab.stepAlong(world, pass, h, along), s, 3)
      const height = world.sample(probe.x, probe.y, probe.z).height
      if (water ? height < -0.3 : height > 0.5) right++
      blocked += obstacles.filter(item => item.normal.angleTo(probe) * world.radius < item.radius + 2.5).length
    }
    // The side view: no tree at the camera, and none between the camera and the creature.
    const eye = lab.stepAlong(world, lab.stepAlong(world, pass, h, -view * 0.47), s, 1.4 - view)
    for (const part of [0, 0.3, 0.6]) {
      const probe = eye.clone().lerp(pass, part).normalize()
      blocked += obstacles.filter(item => item.normal.angleTo(probe) * world.radius < item.radius + 3).length * 4
    }
    const score = right / 20 * 2 - blocked * 0.5 + sunFlat.dot(s.clone().multiplyScalar(-1).addScaledVector(h, -0.6).normalize())
    if (score > best) { best = score; heading = h }
  }
  const side = new THREE.Vector3().crossVectors(pass, heading).normalize()
  const at = (along: number, across: number, alt: number) => {
    let dir = lab.stepAlong(world, pass, heading, along)
    if (across) dir = lab.stepAlong(world, dir, side, across)
    const normal = dir.applyQuaternion(world.group.quaternion)
    return centre.clone().addScaledVector(normal, Math.max(surfaceRadius(world, normal), world.radius) + alt)
  }
  // Four rails, each slower than the one before, so she is next to the creature at `passAt`. Then she climbs away.
  lab.setRailPoints(world, [at(-60, 3, low + 6.5), at(-44, 3, low + 5), at(-28, 3, low + 3)], 0)
  lab.setRailPoints(world, [at(-28, 3, low + 3), at(-19, 3, low + 1.6), at(-10, 3, low + 0.6)], passAt - 3.9)
  lab.setRailPoints(world, [at(-10, 3, low + 0.6), at(-4, 2.8, low), at(2, 3, low), at(8, 4.4, low + 0.6), at(13, 7, low + 1.6)], passAt - 1.9)
  lab.setRailPoints(world, [at(13, 7, low + 1.6), at(22, 11, low + 3.4), at(36, 15, low + 6), at(54, 17, low + 9)], passAt + 2.7)

  // The camera: the follow camera, then a side view of the fairy and the creature.
  const camPosition = new THREE.Vector3(), camLook = new THREE.Vector3(), goal = new THREE.Vector3(), look = new THREE.Vector3()
  const forward = new THREE.Vector3(), fairyUp = new THREE.Vector3(), now = new THREE.Vector3(), mid = new THREE.Vector3(), up = new THREE.Vector3()
  const sideWorld = side.clone().applyQuaternion(world.group.quaternion), headingWorld = heading.clone().applyQuaternion(world.group.quaternion)
  let shotLast = -1
  lab.setShot((camera, t) => {
    const fairy = lab.fairy
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    fairyUp.copy(fairy.position).sub(centre).normalize()
    placeAt(t, now)
    up.copy(now).sub(centre).normalize()
    mid.copy(fairy.position).lerp(now, 0.45)
    const w = THREE.MathUtils.smoothstep(t, passAt - 2.4, passAt - 0.2)
    goal.copy(fairy.position).addScaledVector(fairyUp, 2.6).addScaledVector(forward, -7.5)
      .lerp(mid.clone().addScaledVector(sideWorld, -view).addScaledVector(up, view * 0.32).addScaledVector(headingWorld, -view * 0.47), w)
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
  return {
    kind: pick.resident.kind as Species,
    placeAt,
    /** The distance from the fairy to the creature at the clip time `t`. */
    distance: (t: number) => placeAt(t, now).distanceTo(lab.fairy.position),
    restart() { shotLast = -1 },
  }
}

/**
 * Tips a world so that the Sun is `elevation` degrees up at the local direction `dir`. The cottage
 * of Blossom Haven is at the pole, on the axis of the spin, so a turn on the axis gives it no Sun.
 * The game does not do this. Call the result in dispose() to put the world back.
 */
export function tipToSun(lab: Lab, world: World, dir: THREE.Vector3, elevation: number) {
  const saved = world.group.quaternion.clone()
  const toSun = lab.sun.group.position.clone().sub(world.group.position).normalize()
  const normal = dir.clone().normalize().applyQuaternion(saved)
  const away = normal.clone().addScaledVector(toSun, -normal.dot(toSun)).normalize()
  const angle = THREE.MathUtils.degToRad(elevation)
  const goal = toSun.clone().multiplyScalar(Math.sin(angle)).addScaledVector(away, Math.cos(angle))
  world.group.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(normal, goal))
  world.group.updateMatrixWorld(true)
  return () => { world.group.quaternion.copy(saved); world.group.updateMatrixWorld(true) }
}

/** A burst of sparkles at a world position: one point cloud, for the features that need a small celebration. */
export function createBurst(lab: Lab, count = 70, colour = 0xfff0c0) {
  const positions = new Float32Array(count * 3).fill(1e6), velocities = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ size: 0.32, map: lab.softDisc('rgba(255,240,205,1)'), color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  lab.scene.add(points)
  let firedAt = -1
  return {
    fire(place: THREE.Vector3, t: number, speed = 4) {
      firedAt = t
      for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.4 + Math.random() * 0.8))
        positions.set([place.x, place.y, place.z], i * 3)
        velocities.set([v.x, v.y, v.z], i * 3)
      }
    },
    update(t: number, delta: number) {
      if (firedAt < 0 || t < firedAt || t - firedAt > 1.8) { if (positions[0] < 1e5) positions.fill(1e6); firedAt = -1 }
      else for (let i = 0; i < positions.length; i++) { positions[i] += velocities[i] * delta; velocities[i] *= 1 - delta * 1.5 }
      material.opacity = firedAt < 0 ? 0 : 1 - clamp01((t - firedAt - 0.9) / 0.9)
      geometry.attributes.position.needsUpdate = true
    },
    dispose() { lab.scene.remove(points); geometry.dispose(); material.map?.dispose(); material.dispose() },
  }
}
