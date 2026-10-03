import * as THREE from 'three'
import type { Feature } from '../lab'
import { surfaceRadius } from '../../../src/worlds'
import { chime } from './sound'
import { residentClock, residentPlace } from './f1-search-stars'

/**
 * F3 · Creature hello. On Blossom Haven, a fairytale creature says hello when the fairy flies
 * close: it hops twice, turns toward her, two or three pink hearts float up, and a soft chime
 * plays. Each creature says hello once in 8 s. The test runs on each frame, so it also works
 * in free flight.
 */
const HELLO_DISTANCE = 4.5
const HELLO_AGAIN = 8
const HEART_LIFE = 2

/** A pink heart on a canvas, for the sprites. */
function heartTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const heart = new Path2D('M64 112 C20 80 6 56 14 34 C22 12 52 10 64 34 C76 10 106 12 114 34 C122 56 108 80 64 112 Z')
  const fill = ctx.createLinearGradient(0, 10, 0, 112)
  fill.addColorStop(0, '#ffb3d6'); fill.addColorStop(1, '#ff5c9f')
  ctx.shadowColor = '#ffffffaa'; ctx.shadowBlur = 10
  ctx.fillStyle = fill
  ctx.fill(heart)
  ctx.shadowBlur = 0
  ctx.lineWidth = 5; ctx.strokeStyle = '#fff2f8'
  ctx.stroke(heart)
  ctx.fillStyle = '#ffffffb0'
  ctx.beginPath(); ctx.ellipse(40, 36, 11, 7, -0.6, 0, Math.PI * 2); ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

type Hello = { model: THREE.Object3D; at: number; hearts: THREE.Sprite[]; drift: number[] }

export const creatureHello: Feature = {
  id: 'F3',
  create(lab) {
    const { home } = lab
    const creatures = home.creatures!
    const centre = home.group.position
    const anchor = new THREE.Vector3(0, -1, -0.12).normalize()
    // The cottage is at the pole of Blossom Haven, so a turn on the axis gives it no sun. The
    // clip tips the world instead: the Sun is 50° up over the cottage field. dispose() puts it back.
    const pose = home.group.quaternion.clone()
    const toSun = lab.sun.group.position.clone().sub(centre).normalize()
    const field = anchor.clone().applyQuaternion(home.group.quaternion)
    const away = field.clone().addScaledVector(toSun, -field.dot(toSun)).normalize()
    const sunny = toSun.clone().multiplyScalar(Math.sin(THREE.MathUtils.degToRad(50))).addScaledVector(away, Math.cos(THREE.MathUtils.degToRad(50)))
    home.group.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(field, sunny))
    home.group.updateMatrixWorld(true)

    // Make the models near the cottage now, without a step of their clock.
    creatures.update(0, lab.surfacePoint(home, anchor, 20))
    const candidates = creatures.residents.flatMap((resident, index) => {
      if (resident.kind === 'duck' || resident.route[0].angleTo(anchor) * home.radius > 40) return []
      const model = creatures.group.getObjectByName(`creature-${resident.kind}-${index}`)
      return model ? [{ resident, index, model, clock: residentClock(resident, model) }] : []
    })
    type Candidate = typeof candidates[number]
    const placeOf = (item: Candidate, t: number) => residentPlace(home, item.resident, item.clock + t)

    // Three creatures of different kinds in a gentle line, 7 to 14 m apart, away from the cottage.
    const cottage = lab.homeCottagePosition(home)
    let trio: Candidate[] = candidates.slice(0, 3), best = -Infinity
    for (const a of candidates) for (const b of candidates) for (const c of candidates) {
      if (a === b || b === c || a === c) continue
      const kinds = new Set([a.resident.kind, b.resident.kind, c.resident.kind]).size
      const pa = placeOf(a, 3), pb = placeOf(b, 5), pc = placeOf(c, 7)
      const ab = pb.distanceTo(pa), bc = pc.distanceTo(pb)
      const turn = pb.clone().sub(pa).normalize().angleTo(pc.clone().sub(pb).normalize())
      const clear = Math.min(...[pa, pb, pc, pa.clone().lerp(pb, 0.5), pb.clone().lerp(pc, 0.5)].map(point => point.distanceTo(cottage)))
      // Other creatures near the path say hello too, and crowd the picture.
      const line1 = new THREE.Line3(pa, pb), line2 = new THREE.Line3(pb, pc), near = new THREE.Vector3()
      const crowd = candidates.filter(other => other !== a && other !== b && other !== c).filter(other => {
        const place = placeOf(other, 5)
        return Math.min(line1.closestPointToPoint(place, true, near).distanceTo(place), line2.closestPointToPoint(place, true, near).distanceTo(place)) < 6
      }).length
      const score = kinds * 6 - Math.abs(ab - 10) - Math.abs(bc - 10) - turn * 6 - Math.max(0, 11 - clear) * 3 - crowd * 2.5
      if (score > best) { best = score; trio = [a, b, c] }
    }

    // The path: the fairy passes each creature on her right, 2 m up, at times that follow the
    // arc length of the rail. The creatures walk, so the path and the times are found together.
    const DURATION = 10, SIDE = 1.7, ALT = 2.3
    const lift = (point: THREE.Vector3, alt: number) => {
      const normal = point.clone().sub(centre).normalize()
      return centre.clone().addScaledVector(normal, surfaceRadius(home, normal) + alt)
    }
    const flat = (vector: THREE.Vector3, at: THREE.Vector3) => {
      const up = at.clone().sub(centre).normalize()
      return vector.clone().addScaledVector(up, -vector.dot(up)).normalize()
    }
    let times = [2.4, 5, 7.6], points: THREE.Vector3[] = []
    for (let pass = 0; pass < 5; pass++) {
      const spots = trio.map((item, k) => placeOf(item, times[k]))
      const ways = [flat(spots[1].clone().sub(spots[0]), spots[0]), flat(spots[2].clone().sub(spots[0]), spots[1]), flat(spots[2].clone().sub(spots[1]), spots[2])]
      const right = spots.map((spot, k) => ways[k].clone().cross(spot.clone().sub(centre).normalize()).normalize())
      const passes = spots.map((spot, k) => spot.clone().addScaledVector(right[k], -SIDE))
      points = [
        lift(passes[0].clone().addScaledVector(ways[0], -11), 4),
        lift(passes[0].clone().addScaledVector(ways[0], -5), 2.8),
        ...passes.map(point => lift(point, ALT)),
        lift(passes[2].clone().addScaledVector(ways[2], 6), 2.8),
        lift(passes[2].clone().addScaledVector(ways[2], 11), 3.6),
      ]
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
      const lengths = curve.getLengths(400), total = lengths[400]
      times = [2, 3, 4].map(i => lengths[Math.round(i / (points.length - 1) * 400)] / total * DURATION)
    }
    lab.setRailPoints(home, points, 0)
    // The picture: a little after the hello of the second creature.
    const rail = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    let helloTime = times[1]
    for (let t = times[1]; t > 0; t -= 0.05) {
      if (rail.getPointAt(t / DURATION).distanceTo(placeOf(trio[1], t)) > HELLO_DISTANCE) break
      helloTime = t
    }

    // ---- The camera: behind the fairy and to her left, so the creatures on her right show beside her ---
    const goal = new THREE.Vector3(), look = new THREE.Vector3(), camPosition = new THREE.Vector3(), camLook = new THREE.Vector3()
    const forward = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3()
    let shotLast = -1
    lab.setShot((camera, t) => {
      const fairy = lab.fairy.position
      forward.set(0, 0, -1).applyQuaternion(lab.fairy.quaternion)
      up.copy(fairy).sub(centre).normalize()
      forward.addScaledVector(up, -forward.dot(up)).normalize()
      right.crossVectors(forward, up)
      goal.copy(fairy).addScaledVector(forward, -4.8).addScaledVector(right, -4.2).addScaledVector(up, 3.8)
      // Look between the fairy and the creature of the next hello, so both stay in the picture.
      const next = trio.reduce((a, b, k) => Math.abs(times[k] - t - 0.4) < Math.abs(times[trio.indexOf(a)] - t - 0.4) ? b : a)
      look.copy(fairy).addScaledVector(forward, 1.2).addScaledVector(up, -0.6).lerp(placeOf(next, t), 0.35)
      if (shotLast < 0 || t < shotLast) { camPosition.copy(goal); camLook.copy(look) }
      else {
        const k = 1 - Math.exp(-(t - shotLast) * 3.5)
        camPosition.lerp(goal, k); camLook.lerp(look, k)
      }
      shotLast = t
      camera.position.copy(camPosition)
      camera.up.copy(up)
      camera.lookAt(camLook)
    })

    // ---- The hello -------------------------------------------------------------------------------------
    const texture = heartTexture()
    const heartGroup = new THREE.Group()
    heartGroup.name = 'f3-hearts'
    lab.scene.add(heartGroup)
    const hellos: Hello[] = []
    const lastHello = new Map<string, number>()
    const spot = new THREE.Vector3(), normal = new THREE.Vector3(), toFairy = new THREE.Vector3(), side = new THREE.Vector3()
    const basis = new THREE.Matrix4(), facing = new THREE.Quaternion(), fairyLocal = new THREE.Vector3()

    function startHello(model: THREE.Object3D, t: number) {
      lastHello.set(model.name, t)
      const count = 2 + (model.name.length % 2)
      const hearts = Array.from({ length: count }, () => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }))
        heartGroup.add(sprite)
        return sprite
      })
      hellos.push({ model, at: t, hearts, drift: hearts.map((_, i) => (i - (count - 1) / 2) * 0.42) })
      chime([1046.5, 1318.51], 0.035)
    }
    function endHello(hello: Hello) {
      hello.hearts.forEach(sprite => { heartGroup.remove(sprite); sprite.material.dispose() })
    }

    /**
     * Runs after creatures.update() of the population. The lab calls the update of the feature
     * before the update of the creatures, and that update sets the place of each model again.
     * So the hop and the turn go here, after the population has moved the models.
     */
    function afterCreatures() {
      const t = lab.time
      home.group.updateMatrixWorld()
      fairyLocal.copy(lab.fairy.position)
      home.group.worldToLocal(fairyLocal)
      for (let i = hellos.length - 1; i >= 0; i--) {
        const hello = hellos[i], age = t - hello.at, root = hello.model
        if (age < 0 || age > HEART_LIFE || !root.parent) { endHello(hello); hellos.splice(i, 1); continue }
        normal.copy(root.position).normalize()
        // Turn toward the fairy, and back again after the hello.
        const turn = THREE.MathUtils.smoothstep(age, 0, 0.3) * (1 - THREE.MathUtils.smoothstep(age, 1.5, 2))
        toFairy.copy(fairyLocal).sub(root.position).addScaledVector(normal, -fairyLocal.clone().sub(root.position).dot(normal))
        if (turn > 0 && toFairy.lengthSq() > 0.01) {
          toFairy.normalize()
          side.crossVectors(normal, toFairy).normalize()
          basis.makeBasis(side, normal, toFairy)
          facing.setFromRotationMatrix(basis)
          root.quaternion.slerp(facing, turn)
        }
        // Two small hops along the ground normal.
        const base = root.position.clone()
        if (age < 0.9) root.position.addScaledVector(normal, Math.abs(Math.sin(age / 0.45 * Math.PI)) * (age < 0.45 ? 0.55 : 0.35) * root.scale.x)
        // The hearts float up from the head, sway, and fade.
        home.group.localToWorld(base)
        spot.copy(base).sub(centre).normalize()
        for (const [k, sprite] of hello.hearts.entries()) {
          const life = age - 0.12 - k * 0.2
          if (life < 0) { sprite.visible = false; continue }
          sprite.visible = true
          const rise = 0.9 * root.scale.x + 0.15 + life * 0.85
          sprite.position.copy(base).addScaledVector(spot, rise)
          sideOf(spot, sprite.position, hello.drift[k] + Math.sin(life * 4 + k) * 0.18)
          sprite.scale.setScalar(0.32 + Math.min(life, 0.4) * 0.6)
          sprite.material.opacity = Math.min(life / 0.15, 1) * (1 - THREE.MathUtils.smoothstep(life, HEART_LIFE - 0.9, HEART_LIFE - 0.3))
          sprite.material.rotation = Math.sin(life * 3 + k) * 0.25
        }
      }
    }
    /** Moves a point to the side, at right angles to the view and to the up direction. */
    function sideOf(upward: THREE.Vector3, point: THREE.Vector3, metres: number) {
      const view = point.clone().sub(lab.camera.position)
      point.addScaledVector(view.cross(upward).normalize(), metres)
    }
    const update = creatures.update
    creatures.update = (delta, camera) => { update(delta, camera); afterCreatures() }

    let last = -1
    return {
      duration: DURATION,
      still: helloTime + 0.8,
      update(t) {
        if (t < last) { hellos.splice(0).forEach(endHello); lastHello.clear(); shotLast = -1 }
        last = t
        if (lab.nearest !== home) return
        for (const model of creatures.group.children) {
          if (!model.visible || !model.userData.fairytale) continue
          const before = lastHello.get(model.name)
          if (before !== undefined && t - before < HELLO_AGAIN) continue
          if (model.getWorldPosition(spot).distanceTo(lab.fairy.position) < HELLO_DISTANCE) startHello(model, t)
        }
      },
      dispose() {
        creatures.update = update
        hellos.splice(0).forEach(endHello)
        lab.scene.remove(heartGroup)
        texture.dispose()
        home.group.quaternion.copy(pose)
        home.group.updateMatrixWorld(true)
      },
    }
  },
}

