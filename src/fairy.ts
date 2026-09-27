import * as THREE from 'three'
import { lookColors, wingOptions } from './customization'
import type { FairyLook, WingStyle } from './customization'
import { buildHairStyles, hairMotion } from './fairy-hair'
import { buildBody, createJoints, poseTargets, storybookBody } from './fairy-body'

export const directions = [
  {
    id: 'petal', name: 'Petal glide', mood: 'Gentle & readable',
    normal: 18, boost: 52, wingWidth: 1.12, rate: 3.2, fastRate: 6.5,
    description: 'An upright, floating cruise that becomes a forward-reaching glide. Her back and separate legs stay visible in both states.',
    normalNote: 'Chest lifted, arms softly open, one knee trailing. Broad wings frame a clear center line.',
    boostNote: 'A decisive forward lean, straighter legs and arms swept closer to the hips. The wing stroke gets quicker and tighter.',
    tradeoff: 'Best rear readability. The boost is graceful rather than a headfirst dive.',
  },
  {
    id: 'swimmer', name: 'Sky dancer', mood: 'Expressive & playful',
    normal: 32, boost: 66, wingWidth: 1.02, rate: 2.5, fastRate: 5.2,
    description: 'A more expressive pose with open arms and staggered legs. A reaching gesture adds a clear sense of acceleration.',
    normalNote: 'Arms open further; alternating knee bends and a soft body sway suggest buoyancy.',
    boostNote: 'Hands reach diagonally forward, feet stretch back, and the whole silhouette lengthens.',
    tradeoff: 'Strong personality, but hands and wings can overlap from a directly rear camera.',
  },
  {
    id: 'dart', name: 'Pixie dart', mood: 'Swift & insect-like',
    normal: 48, boost: 80, wingWidth: 0.86, rate: 4.5, fastRate: 8,
    description: 'A compact, fast-flying fairy with narrow wings and a pronounced horizontal boost.',
    normalNote: 'A deeper lean and compact arms make even her normal flight feel alert and quick.',
    boostNote: 'Almost horizontal, legs together, rapid small wingbeats and a long dust trail.',
    tradeoff: 'Strongest speed cue, weakest rear body readability. Try raising the camera to 30–35°.',
  },
] as const

export type Direction = typeof directions[number]
// body: false leaves out the body below the head, for the body study (src/body-study).
export function createFairyRig({ withTrail = true, body: withBody = true } = {}) {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.name = 'fairy-flight-root'
  body.name = 'fairy-body'
  root.add(body)
  const makeMaterial = (color: number) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    return material
  }
  const skin = makeMaterial(0xefba9f)
  const dress = makeMaterial(0xc97497)
  const petals = makeMaterial(0xe99db6)
  const tights = makeMaterial(0x9b92bc)
  const shoes = makeMaterial(0x6e486e)
  const hair = makeMaterial(0x493745)
  const gold = makeMaterial(0xe6c087)
  const materials = { skin, dress, petals, tights, shoes, hair, gold }

  // The head turns about the top of the neck. The head frame inside the pivot
  // holds the head, the hair cap, the ears, the hair and the face in body
  // coordinates, so every hair style keeps its place on the cap.
  const headPivot = new THREE.Group()
  headPivot.name = 'fairy-head-pivot'
  headPivot.position.set(0, 0.9, 0)
  const headFrame = new THREE.Group()
  headFrame.name = 'fairy-head'
  headFrame.position.set(0, -0.9, 0)
  headPivot.add(headFrame)
  body.add(headPivot)
  function ellipsoid(parent: THREE.Group, material: THREE.Material, scale: number[], position: number[], name = '') {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material)
    mesh.name = name
    mesh.scale.set(scale[0], scale[1], scale[2])
    mesh.position.set(position[0], position[1], position[2])
    parent.add(mesh)
    return mesh
  }
  ellipsoid(headFrame, skin, [0.23, 0.26, 0.21], [0, 1.12, -0.015], 'head')
  ellipsoid(headFrame, hair, [0.24, 0.21, 0.19], [0, 1.22, 0.07], 'hair-cap')
  const hairStyles = buildHairStyles(headFrame, hair, gold)
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.17, 5), skin)
    ear.name = 'ear'
    ear.position.set(side * 0.235, 1.1, 0)
    ear.rotation.z = side * -1.0
    headFrame.add(ear)
  }

  // The Storybook body of the body study: one bodice, capsule limbs with fixed
  // bones, floating arms, a petal skirt, a face and a bow that holds the wings.
  const targets = createJoints()
  const storybook = withBody ? buildBody(body, { pivot: headPivot, frame: headFrame }, materials, storybookBody, skyDancer) : undefined
  // Live joint positions in the body frame, left side first. pose() moves them.
  // Without a body they are the pose targets.
  const joints = storybook?.joints ?? targets

  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0xb2e3e3, emissive: 0x295353, emissiveIntensity: 0.2,
    transparent: true, opacity: 0.57, depthWrite: false, side: THREE.DoubleSide, roughness: 0.45,
  })
  const wingEdge = new THREE.LineBasicMaterial({ color: 0xb0e0d7, transparent: true, opacity: 0.9 })
  const wings: { pivot: THREE.Group; side: number; lower: boolean }[] = []
  const wingStyles = {} as Record<WingStyle, THREE.Group>
  for (const { id: style } of wingOptions) {
    const group = new THREE.Group()
    group.name = `wings-${style}`
    group.visible = style === 'petal'
    wingStyles[style] = group
    body.add(group)
  for (const side of [-1, 1]) {
    for (const lower of [false, true]) {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      if (style === 'luna') {
        shape.bezierCurveTo(0.2, lower ? -0.2 : 0.8, 0.65, lower ? -1 : 1.5, 0.96, lower ? -0.85 : 1.4)
        shape.bezierCurveTo(1.2, lower ? -0.65 : 0.8, 0.4, lower ? -0.1 : 0.15, 0, 0)
      } else if (style === 'flutter') {
        shape.bezierCurveTo(0.25, lower ? -0.1 : 0.8, 1.3, lower ? -0.1 : 1.1, 1.17, lower ? -0.65 : 0.5)
        shape.bezierCurveTo(1, lower ? -1 : -0.25, 0.17, lower ? -0.55 : -0.1, 0, 0)
      } else if (!lower) {
        shape.bezierCurveTo(0.34, 0.65, 0.94, 1.15, 1.26, 0.99)
        shape.bezierCurveTo(1.65, 0.63, 1.05, -0.09, 0, 0)
      } else {
        shape.bezierCurveTo(0.5, 0.06, 1.03, -0.15, 0.83, -0.64)
        shape.bezierCurveTo(0.53, -0.85, 0.13, -0.51, 0, 0)
      }
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.19, 0.61, 0.17)
      const leaf = new THREE.Group()
      leaf.scale.x = side
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 20), wingMaterial)
      leaf.add(mesh)
      const edgePoints = shape.getPoints(48).map(p => new THREE.Vector3(p.x, p.y, 0.004))
      leaf.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(edgePoints), wingEdge))
      const vein = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(0.6, lower ? -0.14 : 0.24, 0.006), new THREE.Vector3(lower ? 0.77 : 1.24, lower ? -0.59 : 0.94, 0.006))
      if (style === 'petal') leaf.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vein.getPoints(18)), wingEdge))
      pivot.add(leaf)
      group.add(pivot)
      wings.push({ pivot, side, lower })
    }
  }

  }

  function applyLook(look: FairyLook) {
    for (const [name, group] of Object.entries(hairStyles.groups)) group.visible = name === look.hair
    for (const [name, group] of Object.entries(wingStyles)) group.visible = name === look.wings
    const colors = lookColors(look)
    skin.color.setHex(colors.skin)
    dress.color.setHex(colors.dress)
    petals.color.setHex(colors.dress).lerp(new THREE.Color(0xffe2ee), 0.28)
    hair.color.setHex(colors.hair)
    // Leggings and shoes are a deep, muted shade of the dress.
    const shade = shoes.color.setHex(colors.dress).getHSL({ h: 0, s: 0, l: 0 })
    shoes.color.setHSL(shade.h, shade.s * 0.45, shade.l * 0.32)
    tights.color.copy(shoes.color).lerp(dress.color, 0.32)
    wingMaterial.color.setHex(colors.wings)
    wingMaterial.emissive.setHex(colors.wings).multiplyScalar(0.12)
    wingEdge.color.setHex(colors.wings).lerp(new THREE.Color(0x587d81), 0.25)
    dustMaterial.color.setHex(colors.sparkle)
  }

  const trailPositions = new Float32Array(48 * 3)
  const trailGeometry = new THREE.BufferGeometry()
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
  const dustMaterial = new THREE.PointsMaterial({ color: 0xf3d49c, size: 0.026, transparent: true, opacity: 0.65, depthWrite: false })
  const dust = new THREE.Points(trailGeometry, dustMaterial)
  dust.frustumCulled = false
  if (withTrail) root.add(dust)
  const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: 0xf3efdf, side: THREE.DoubleSide })
  const originals = new Map<THREE.Mesh | THREE.Line, THREE.Material | THREE.Material[]>()
  body.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) originals.set(object, object.material)
  })

  function setSilhouette(enabled: boolean) {
    originals.forEach((material, object) => {
      if (object instanceof THREE.Line) object.visible = !enabled
      else object.material = enabled ? silhouetteMaterial : material
    })
    dust.visible = withTrail && !enabled
  }

  function pose(preset: Direction, boost: number, time: number, leanOverride?: number, wingPhase?: number) {
    const lean = leanOverride ?? THREE.MathUtils.lerp(preset.normal, preset.boost, boost)
    body.rotation.x = -THREE.MathUtils.degToRad(lean)
    body.rotation.z = Math.sin(time * 1.5) * (preset.id === 'swimmer' ? 0.04 : 0.015) * (1 - boost)
    body.position.y = Math.sin(time * 2.3) * 0.035 * (1 - boost * 0.7)
    const wingBeat = wingPhase ?? time * Math.PI * 2 * THREE.MathUtils.lerp(preset.rate, preset.fastRate, boost)
    wings.forEach(({ pivot, side, lower }) => {
      pivot.rotation.y = side * (0.2 + Math.sin(wingBeat + (lower ? -0.45 : 0)) * THREE.MathUtils.lerp(0.55, 0.35, boost))
      pivot.rotation.z = side * (lower ? -0.03 : 0.05) + side * Math.sin(wingBeat - 0.2) * 0.045
      pivot.scale.set(preset.wingWidth, 1, 1)
    })
    poseTargets(preset, boost, time, targets)
    storybook?.update(boost, time, wingBeat, lean, targets)
    for (let i = 0; withTrail && i < 48; i++) {
      const progress = ((i / 48 + time * (0.17 + boost * 0.27)) % 1)
      trailPositions[i*3] = Math.sin(i * 7.3) * 0.21 * progress
      trailPositions[i*3+1] = -0.75 - progress * 0.26
      trailPositions[i*3+2] = 0.55 + progress * (0.8 + boost * 2)
    }
    trailGeometry.attributes.position.needsUpdate = true
    animateHair(time, boost, hairMotion.gentle)
  }
  // Swings the long hair styles; pose() already applies the gentle game amount.
  // A strand hangs from the head, so the root of each strand turns back by the
  // head lift: the long hair keeps the line of the body.
  function animateHair(time: number, boost: number, amount: number) {
    hairStyles.animate(time, boost, amount)
    const lift = storybook?.lift ?? 0
    for (const group of Object.values(hairStyles.groups)) {
      for (const child of group.children) if (child instanceof THREE.Group) child.rotation.x -= lift
    }
  }
  // joints, targets and materials are read access for studies (src/body-study).
  return { root, pose, setSilhouette, applyLook, animateHair, joints, targets, materials }
}


export const skyDancer = directions[1]

// The visual rig is a child of the flight root: posing never alters steering.
// Integrate the wing phase so changing speed cannot jump the wings mid-stroke.
export function createSkyDancerAnimation(rig: ReturnType<typeof createFairyRig>) {
  let boost = 0, target = 0, transitionStart = 0, transitionTime = 0
  let time = 0, phase = 0
  rig.pose(skyDancer, 0, 0, undefined, 0)
  return {
    get boost() { return boost },
    get phase() { return phase },
    update(delta: number, boosted: boolean) {
      if (delta <= 0) return
      if (Number(boosted) !== target) {
        transitionStart = boost
        transitionTime = 0
        target = Number(boosted)
      }
      const duration = target ? 0.25 : 0.4
      transitionTime = Math.min(duration, transitionTime + delta)
      const progress = THREE.MathUtils.smoothstep(transitionTime, 0, duration)
      boost = THREE.MathUtils.lerp(transitionStart, target, progress)
      time += delta
      phase = (phase + delta * Math.PI * 2 * THREE.MathUtils.lerp(skyDancer.rate, skyDancer.fastRate, boost)) % (Math.PI * 2)
      rig.pose(skyDancer, boost, time, undefined, phase)
    },
  }
}
