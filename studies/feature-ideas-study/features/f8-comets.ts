import * as THREE from 'three'
import type { Feature, Lab } from '../lab'
import { seededRandom } from '../../../src/terrain'
import { chime } from './sound'
import { groundRail, tangentOf } from './path'
import './f8-comets.css'

/**
 * F8 · Comets and shooting stars. Part 1: a comet near Earth, with an icy nucleus, a glowing
 * coma, a soft dust tail and a faint blue ion tail. Both tails point away from the Sun. The
 * fairy flies through the tail and sparkles. Part 2: the meadow at night, and shooting stars
 * cross the sky. Shooting stars come only when the sky is dark, also in free flight.
 */
const PART_TWO = 6
const DURATION = 12

// ---- The comet ------------------------------------------------------------------------------------
type TailOptions = { count: number; length: number; head: number; end: number; bend: number; colour: THREE.Color; size: [number, number]; opacity: number; flow: number }

const tailVertex = /* glsl */`
  attribute vec4 aSeed;
  uniform float uTime, uLength, uHead, uEnd, uBend, uScale, uFlow;
  uniform vec2 uSize;
  varying float vFade;
  void main() {
    // aSeed: x = start along the tail, y = angle, z = distance from the axis (0..1), w = speed.
    float u = fract(aSeed.x + uTime * uFlow * aSeed.w);
    float radius = mix(uHead, uEnd, pow(u, 0.75)) * aSeed.z;
    vec3 local = vec3(cos(aSeed.y) * radius, sin(aSeed.y) * radius + uBend * u * u * uLength, u * uLength);
    vec4 view = modelViewMatrix * vec4(local, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = min(mix(uSize.x, uSize.y, u) * uScale / max(-view.z, 1.0), 180.0);
    // Particles close to the camera fade out, so the inside of the tail is a soft haze, not a white wall.
    vFade = smoothstep(0.0, 0.04, u) * pow(1.0 - u, 1.35) * (1.0 - 0.6 * aSeed.z) * smoothstep(6.0, 55.0, -view.z);
  }`
const tailFragment = /* glsl */`
  uniform vec3 uColour;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float soft = pow(max(0.0, 1.0 - d), 2.0);
    gl_FragColor = vec4(uColour, soft * vFade * uOpacity);
  }`

function createTail(random: () => number, options: TailOptions) {
  const seeds = new Float32Array(options.count * 4)
  for (let i = 0; i < options.count; i++) {
    // More particles near the axis: the tail is bright in the middle and soft at the edge.
    seeds.set([random(), random() * Math.PI * 2, Math.pow(random(), 0.9), 0.75 + random() * 0.5], i * 4)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(options.count * 3), 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uLength: { value: options.length }, uHead: { value: options.head }, uEnd: { value: options.end },
      uBend: { value: options.bend }, uScale: { value: 600 }, uFlow: { value: options.flow }, uSize: { value: new THREE.Vector2(...options.size) },
      uColour: { value: options.colour }, uOpacity: { value: options.opacity },
    },
    vertexShader: tailVertex, fragmentShader: tailFragment,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return { points, material, geometry }
}

function createComet(lab: Lab, head: THREE.Vector3) {
  const random = seededRandom(0xc0e7)
  const group = new THREE.Group()
  group.position.copy(head)
  const nucleusGeometry = new THREE.IcosahedronGeometry(3, 2)
  // A lumpy, icy nucleus.
  const position = nucleusGeometry.attributes.position as THREE.BufferAttribute
  const point = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i)
    point.multiplyScalar(1 + Math.sin(point.x * 1.7) * 0.08 + Math.cos(point.y * 2.3 + point.z) * 0.07)
    position.setXYZ(i, point.x, point.y, point.z)
  }
  nucleusGeometry.computeVertexNormals()
  const nucleusMaterial = new THREE.MeshStandardMaterial({ color: 0xc9d6e2, roughness: 0.85, emissive: 0x6f8fb0, emissiveIntensity: 0.35, flatShading: true })
  const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial)
  group.add(nucleus)
  const sprite = (colour: string, scale: number, opacity: number) => {
    const material = new THREE.SpriteMaterial({ map: lab.softDisc(colour), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    const object = new THREE.Sprite(material)
    object.scale.setScalar(scale)
    group.add(object)
    return material
  }
  const comaOuter = sprite('rgba(150,205,255,1)', 70, 0.32)
  const comaInner = sprite('rgba(235,248,255,1)', 18, 0.85)
  // The tails live in a frame where +Z points away from the Sun.
  const tails = new THREE.Group()
  group.add(tails)
  const dust = createTail(random, { count: 5200, length: 330, head: 5, end: 70, bend: 0.12, colour: new THREE.Color(1.0, 0.9, 0.78), size: [6, 26], opacity: 0.17, flow: 0.07 })
  const ion = createTail(random, { count: 2200, length: 420, head: 2, end: 16, bend: 0, colour: new THREE.Color(0.38, 0.62, 1.0), size: [4, 12], opacity: 0.22, flow: 0.16 })
  tails.add(dust.points, ion.points)
  lab.scene.add(group)
  const away = new THREE.Vector3(), target = new THREE.Vector3()
  return {
    group, head, length: 330, headRadius: 5, endRadius: 70,
    /** The tail direction: away from the Sun. */
    away,
    update(t: number) {
      away.copy(head).sub(lab.sun.group.position).normalize()
      tails.lookAt(target.copy(head).add(away))
      nucleus.rotation.set(t * 0.13, t * 0.21, 0)
      const scale = lab.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(lab.camera.fov / 2)))
      for (const tail of [dust, ion]) { tail.material.uniforms.uTime.value = t; tail.material.uniforms.uScale.value = scale }
      comaOuter.opacity = 0.3 + Math.sin(t * 1.4) * 0.03
    },
    dispose() {
      lab.scene.remove(group)
      nucleusGeometry.dispose(); nucleusMaterial.dispose()
      for (const material of [comaOuter, comaInner]) { material.map?.dispose(); material.dispose() }
      for (const tail of [dust, ion]) { tail.geometry.dispose(); tail.material.dispose() }
    },
  }
}

// ---- Shooting stars -------------------------------------------------------------------------------
/** A shooting star: it starts in the direction `from` and moves `travel` radians toward `toward`. */
type Meteor = { born: number; from: THREE.Vector3; toward: THREE.Vector3; travel: number }
const METEOR_LIFE = 0.85, METEOR_DISTANCE = 700

const meteorVertex = /* glsl */`
  attribute vec2 aStreak;
  varying vec2 vStreak;
  void main() { vStreak = aStreak; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const meteorFragment = /* glsl */`
  uniform float uAlpha;
  varying vec2 vStreak;
  void main() {
    // x: 0 at the end of the tail, 1 at the head. y: -1 to 1 across the streak.
    float across = 1.0 - smoothstep(0.0, 1.0, abs(vStreak.y));
    float along = pow(vStreak.x, 2.2);
    vec3 colour = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.97, 0.88), vStreak.x);
    gl_FragColor = vec4(colour, across * along * uAlpha);
  }`

function createMeteors(lab: Lab) {
  const pool = Array.from({ length: 6 }, () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3))
    geometry.setAttribute('aStreak', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]), 2))
    geometry.setIndex([0, 2, 1, 1, 2, 3])
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uAlpha: { value: 0 } }, vertexShader: meteorVertex, fragmentShader: meteorFragment,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    // Drawn after the air shell, so the thin sky in front does not hide them.
    mesh.renderOrder = 5
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lab.softDisc('rgba(255,250,235,1)'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
    glow.renderOrder = 5
    glow.scale.setScalar(9)
    lab.scene.add(mesh, glow)
    return { mesh, material, glow, meteor: null as Meteor | null }
  })
  const head = new THREE.Vector3(), tail = new THREE.Vector3(), side = new THREE.Vector3(), view = new THREE.Vector3(), axis = new THREE.Vector3()
  const along = (meteor: Meteor, s: number, target: THREE.Vector3) => {
    axis.crossVectors(meteor.from, meteor.toward).normalize()
    return target.copy(meteor.from).applyAxisAngle(axis, meteor.travel * s).multiplyScalar(METEOR_DISTANCE).add(lab.camera.position)
  }
  return {
    /** Starts a shooting star at screen place (x, y) in the view of the camera, moving to (dx, dy). */
    launch(t: number, x: number, y: number, dx: number, dy: number, travel = 0.6) {
      const slot = pool.find(item => !item.meteor || t - item.meteor.born > METEOR_LIFE) ?? pool[0]
      const right = new THREE.Vector3().setFromMatrixColumn(lab.camera.matrixWorld, 0)
      const up = new THREE.Vector3().setFromMatrixColumn(lab.camera.matrixWorld, 1)
      const forward = new THREE.Vector3().setFromMatrixColumn(lab.camera.matrixWorld, 2).negate()
      const from = forward.clone().addScaledVector(right, x).addScaledVector(up, y).normalize()
      const toward = right.clone().multiplyScalar(dx).addScaledVector(up, dy)
      toward.addScaledVector(from, -toward.dot(from)).normalize()
      slot.meteor = { born: t, from, toward, travel }
    },
    clear() { pool.forEach(item => { item.meteor = null; item.material.uniforms.uAlpha.value = 0; item.glow.material.opacity = 0 }) },
    update(t: number, dark: number) {
      for (const item of pool) {
        const meteor = item.meteor
        const age = meteor ? t - meteor.born : -1
        if (!meteor || age < 0 || age > METEOR_LIFE) { item.material.uniforms.uAlpha.value = 0; item.glow.material.opacity = 0; continue }
        const x = age / METEOR_LIFE
        // The head slows a little; the tail grows and then follows the head.
        const s = 1 - Math.pow(1 - x, 1.6)
        along(meteor, s, head)
        along(meteor, Math.max(0, s - 0.5 * Math.min(1, x * 2.2)), tail)
        view.copy(head).add(tail).multiplyScalar(0.5).sub(lab.camera.position)
        side.copy(head).sub(tail).cross(view).normalize().multiplyScalar(2.2)
        const positions = item.mesh.geometry.attributes.position as THREE.BufferAttribute
        positions.setXYZ(0, tail.x - side.x, tail.y - side.y, tail.z - side.z)
        positions.setXYZ(1, tail.x + side.x, tail.y + side.y, tail.z + side.z)
        positions.setXYZ(2, head.x - side.x, head.y - side.y, head.z - side.z)
        positions.setXYZ(3, head.x + side.x, head.y + side.y, head.z + side.z)
        positions.needsUpdate = true
        item.mesh.geometry.computeBoundingSphere()
        const alpha = THREE.MathUtils.smoothstep(x, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(x, 0.6, 1)) * dark
        item.material.uniforms.uAlpha.value = alpha * 1.4
        item.glow.position.copy(head)
        item.glow.material.opacity = alpha * 0.9
      }
    },
    dispose() {
      for (const item of pool) {
        lab.scene.remove(item.mesh, item.glow)
        item.mesh.geometry.dispose(); item.material.dispose()
        item.glow.material.map?.dispose(); item.glow.material.dispose()
      }
    },
  }
}

/** The shooting stars of the clip: time, screen place, and direction. */
const CLIP_METEORS: [number, number, number, number, number][] = [
  [6.9, -0.6, 0.38, 0.85, -0.42],
  [8.0, 0.55, 0.45, -0.7, -0.55],
  [9.2, -0.3, 0.3, 0.92, -0.3],
  [10.4, 0.7, 0.2, -0.88, -0.4],
]

export const comets: Feature = {
  id: 'F8',
  create(lab) {
    const { earth, sun, meadowLocal } = lab
    const E = earth.group.position
    // Part 1: the fairy flies toward Earth and crosses the tail. The Sun is to the side, and the
    // comet is on the far side of Earth from the Moon.
    const away = E.clone().sub(sun.group.position).normalize()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const travel = new THREE.Vector3().crossVectors(worldUp, away).normalize()
    const cross = E.clone().addScaledVector(travel, -700).addScaledVector(worldUp, 330)
    const head = cross.clone().addScaledVector(away, -60)
    lab.setRailPoints(earth, [
      cross.clone().addScaledVector(travel, -175).addScaledVector(worldUp, -6),
      cross.clone().addScaledVector(travel, -60).addScaledVector(worldUp, 2),
      cross.clone().addScaledVector(travel, 60).addScaledVector(worldUp, 4),
    ], 0, PART_TWO)

    // Part 2: the night meadow. The rail is made with the night spin of Earth.
    const night = tangentOf(meadowLocal, 0.6)
    lab.setSunElevation(earth, meadowLocal, -25)
    lab.setRail(earth, groundRail(lab, earth, meadowLocal, night, [[0, 0, 5], [12, 0, 5.6], [24, 0, 5.2]]), PART_TWO, DURATION)
    lab.setSunElevation(earth, meadowLocal, 25)
    let spin = 25
    const setSpin = (elevation: number) => { if (spin !== elevation) { spin = elevation; lab.setSunElevation(earth, meadowLocal, elevation) } }

    const comet = createComet(lab, head)
    const meteors = createMeteors(lab)

    // The camera of the clip: behind the fairy. In part 2 it looks up at the sky.
    const back = new THREE.Vector3(), upward = new THREE.Vector3(), forward = new THREE.Vector3(), look = new THREE.Vector3()
    lab.setShot((camera, t) => {
      const { fairy } = lab
      forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
      upward.set(0, 1, 0).applyQuaternion(fairy.quaternion)
      if (t < PART_TWO) {
        camera.position.copy(fairy.position).addScaledVector(forward, -9).addScaledVector(upward, 2.4)
        look.copy(fairy.position).addScaledVector(forward, 30).addScaledVector(upward, 1.5)
        camera.fov = 58
      } else {
        back.copy(fairy.position).addScaledVector(forward, -7).addScaledVector(upward, 0.2)
        camera.position.copy(back)
        look.copy(fairy.position).addScaledVector(forward, 10).addScaledVector(upward, 7)
        camera.fov = 62
      }
      camera.up.copy(upward)
      camera.lookAt(look)
      camera.updateProjectionMatrix()
    })

    // Sparkles when the fairy is in the tail.
    const sparkleCount = 160
    const sparklePositions = new Float32Array(sparkleCount * 3).fill(1e6)
    const sparkleVelocity = new Float32Array(sparkleCount * 3)
    const sparkleBorn = new Float32Array(sparkleCount).fill(-10)
    const sparkleGeometry = new THREE.BufferGeometry()
    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3))
    const sparkleMaterial = new THREE.PointsMaterial({ size: 0.5, map: lab.softDisc('rgba(230,245,255,1)'), color: 0xf2f8ff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })
    const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial)
    sparkles.frustumCulled = false
    lab.scene.add(sparkles)

    // A caption and a soft fade between the two parts.
    const caption = document.createElement('p')
    caption.className = 'f8-caption'
    const fade = document.createElement('div')
    fade.className = 'f8-fade'
    lab.overlay.append(fade, caption)

    let random = seededRandom(0x5ea7), last = -1, cursor = 0, inTailSince = -1, chimed = false
    let nextFree = 0, clipIndex = 0
    const relative = new THREE.Vector3()
    const { trailMaterial } = lab

    return {
      duration: DURATION,
      still: 1.2,
      update(t, delta) {
        if (t < last) {
          random = seededRandom(0x5ea7); sparkleBorn.fill(-10); sparklePositions.fill(1e6)
          meteors.clear(); clipIndex = 0; inTailSince = -1; chimed = false; nextFree = 0
        }
        last = t
        const clip = lab.mode === 'clip'
        if (clip) setSpin(t < PART_TWO ? 25 : -25)
        comet.update(t)

        // Is the fairy inside the tail? Measure along the axis and away from it.
        relative.copy(lab.fairy.position).sub(comet.head)
        const u = relative.dot(comet.away)
        const off = relative.addScaledVector(comet.away, -u).length()
        const radius = THREE.MathUtils.lerp(comet.headRadius, comet.endRadius, Math.pow(THREE.MathUtils.clamp(u / comet.length, 0, 1), 0.75))
        const inside = u > 0 && u < comet.length && off < radius * 0.9
        if (inside && inTailSince < 0) inTailSince = t
        if (!inside) inTailSince = -1
        if (inside && !chimed) { chimed = true; chime([783.99, 1174.66], 0.045) }
        if (inside && delta > 0) {
          for (let k = 0; k < 6; k++) {
            const i = cursor++ % sparkleCount
            sparkleBorn[i] = t
            sparklePositions.set([lab.fairy.position.x + (random() - 0.5) * 1.6, lab.fairy.position.y + (random() - 0.5) * 1.6, lab.fairy.position.z + (random() - 0.5) * 1.6], i * 3)
            sparkleVelocity.set([(random() - 0.5) * 3 + comet.away.x * 4, (random() - 0.5) * 3 + comet.away.y * 4, (random() - 0.5) * 3 + comet.away.z * 4], i * 3)
          }
        }
        for (let i = 0; i < sparkleCount; i++) {
          if (t - sparkleBorn[i] > 1.3) { sparklePositions[i * 3] = 1e6; continue }
          for (let axis = 0; axis < 3; axis++) sparklePositions[i * 3 + axis] += sparkleVelocity[i * 3 + axis] * delta
        }
        sparkleGeometry.attributes.position.needsUpdate = true
        trailMaterial.size = inside ? 0.38 : 0.2

        // Shooting stars: the fixed list in the clip, and random ones in free flight at night.
        const world = lab.nearest
        const altitude = lab.camera.position.distanceTo(world.group.position) - world.radius
        const dark = world.atmosphere && altitude < world.atmosphere ? THREE.MathUtils.smoothstep(lab.skyVisibility, 0.55, 0.9) : 0
        if (clip) {
          while (clipIndex < CLIP_METEORS.length && t >= CLIP_METEORS[clipIndex][0]) {
            const [, x, y, dx, dy] = CLIP_METEORS[clipIndex++]
            if (dark > 0) meteors.launch(t, x, y, dx, dy)
          }
        } else if (dark > 0.5 && t >= nextFree) {
          if (nextFree > 0) meteors.launch(t, (random() - 0.5) * 1.4, 0.15 + random() * 0.35, random() < 0.5 ? -1 : 1, -0.3 - random() * 0.4, 0.3 + random() * 0.2)
          nextFree = t + 2.5 + random() * 4
        }
        meteors.update(t, dark)

        // The caption and the fade.
        const text = t < PART_TWO ? '☄  A comet: its tail points away from the Sun' : '✦  Shooting stars on a clear night'
        if (caption.textContent !== text && clip) caption.textContent = text
        caption.style.opacity = clip ? String(THREE.MathUtils.smoothstep(Math.abs(t - PART_TWO), 0.2, 0.6) * (1 - THREE.MathUtils.smoothstep(t, DURATION - 0.4, DURATION))) : '0'
        fade.style.opacity = clip ? String(Math.max(0, 1 - Math.abs(t - PART_TWO) / 0.35)) : '0'
      },
      dispose() {
        comet.dispose(); meteors.dispose()
        lab.scene.remove(sparkles)
        sparkleGeometry.dispose(); sparkleMaterial.map?.dispose(); sparkleMaterial.dispose()
        trailMaterial.size = 0.2
        caption.remove(); fade.remove()
        lab.setSunElevation(earth, meadowLocal, 25)
      },
    }
  },
}
