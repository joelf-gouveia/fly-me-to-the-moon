import * as THREE from 'three'
import { softDotTexture } from './comet-sky'

/** A shooting star lives 0.8 s. A new one comes 2.5 to 6.5 s after the last one, at random. */
export const SHOOTING_STARS = { life: 0.8, gapMin: 2.5, gapMax: 6.5, distance: 700, pool: 4 } as const

export type SkyAtCamera = {
  /** The height of the air of the nearest world. 0 for a world with no air. */
  air: number
  /** The height of the camera above the ground of that world. */
  altitude: number
  /** `stars` of daylightAt(): 0 by day, 1 at night. */
  night: number
  /** `skyVisibility` of updateEnvironment() in src/main.ts. */
  visibility: number
  /** `starClarity` of the sky profile: the haze of Venus lets less of the sky through. */
  clarity: number
  reducedMotion: boolean
}

/**
 * How dark the sky is for shooting stars, from 0 to 1. Shooting stars come only inside the
 * air of a world, at night, in a dark sky. There are none by day, none in open space and
 * none with reduced motion. The visibility is divided by the clarity of the sky, so the
 * dark night of Venus counts as dark under its haze.
 */
export function shootingStarDark(sky: SkyAtCamera) {
  if (sky.reducedMotion || sky.air <= 0 || sky.altitude > sky.air) return 0
  const clear = sky.visibility / Math.max(sky.clarity, 0.05)
  return THREE.MathUtils.smoothstep(sky.night, 0.55, 0.9) * THREE.MathUtils.smoothstep(clear, 0.55, 0.9)
}

/** A new shooting star can start only in a sky darker than this. */
export const SHOOTING_STAR_DARK = 0.5

/** The time to the next shooting star. */
export function shootingStarGap(random: () => number) {
  return SHOOTING_STARS.gapMin + random() * (SHOOTING_STARS.gapMax - SHOOTING_STARS.gapMin)
}

/** The fade of a shooting star at age `age`: in fast, out slowly, 0 after its life. */
export function shootingStarFade(age: number) {
  if (age < 0 || age > SHOOTING_STARS.life) return 0
  const x = age / SHOOTING_STARS.life
  return THREE.MathUtils.smoothstep(x, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(x, 0.6, 1))
}

const meteorVertex = /* glsl */`
  attribute vec2 aStreak;
  varying vec2 vStreak;
  void main() { vStreak = aStreak; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const meteorFragment = /* glsl */`
  uniform float uAlpha;
  varying vec2 vStreak;
  void main() {
    // x: 0 at the end of the streak, 1 at the head. y: -1 to 1 across the streak.
    float across = 1.0 - smoothstep(0.0, 1.0, abs(vStreak.y));
    float along = pow(vStreak.x, 2.2);
    vec3 colour = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.97, 0.88), vStreak.x);
    gl_FragColor = vec4(colour, across * along * uAlpha);
    #include <colorspace_fragment>
  }`

type Meteor = { born: number; from: THREE.Vector3; toward: THREE.Vector3; travel: number }

/**
 * Shooting stars of F8: a thin bright streak with a glowing head. They are in the sky
 * around the camera, as the stars are, so they do not move with the fairy's flight.
 */
export function createShootingStars(scene: THREE.Scene, random: () => number = Math.random) {
  const dot = softDotTexture()
  const pool = Array.from({ length: SHOOTING_STARS.pool }, (_, index) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3))
    geometry.setAttribute('aStreak', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]), 2))
    geometry.setIndex([0, 2, 1, 1, 2, 3])
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uAlpha: { value: 0 } }, vertexShader: meteorVertex, fragmentShader: meteorFragment,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `shooting-star-${index}`
    mesh.frustumCulled = false
    mesh.visible = false
    // Drawn after the air shell, so the thin sky in front does not hide them.
    mesh.renderOrder = 5
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xfffaeb, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
    glow.renderOrder = 5
    glow.scale.setScalar(9)
    glow.visible = false
    scene.add(mesh, glow)
    return { mesh, material, glow, meteor: null as Meteor | null }
  })
  const head = new THREE.Vector3(), tail = new THREE.Vector3(), side = new THREE.Vector3(), view = new THREE.Vector3(), axis = new THREE.Vector3()
  const right = new THREE.Vector3(), up = new THREE.Vector3(), forward = new THREE.Vector3(), localUp = new THREE.Vector3()
  let next = -1, launched = 0, active = 0

  const along = (meteor: Meteor, s: number, camera: THREE.Vector3, target: THREE.Vector3) => {
    axis.crossVectors(meteor.from, meteor.toward).normalize()
    return target.copy(meteor.from).applyAxisAngle(axis, meteor.travel * s).multiplyScalar(SHOOTING_STARS.distance).add(camera)
  }

  /** Starts a shooting star in the upper part of the view, above the local horizon. */
  function launch(time: number, camera: THREE.PerspectiveCamera) {
    const slot = pool.find(item => !item.meteor) ?? pool[0]
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    forward.setFromMatrixColumn(camera.matrixWorld, 2).negate()
    const from = forward.clone().addScaledVector(right, (random() - 0.5) * 1.4).addScaledVector(up, 0.15 + random() * 0.35).normalize()
    // High above the horizon, so the streak ends before the ground can hide it.
    const height = from.dot(localUp)
    if (height < 0.3) from.addScaledVector(localUp, 0.3 - height).normalize()
    const toward = right.clone().multiplyScalar(random() < 0.5 ? -1 : 1).addScaledVector(localUp, -0.2 - random() * 0.25)
    toward.addScaledVector(from, -toward.dot(from)).normalize()
    slot.meteor = { born: time, from, toward, travel: 0.3 + random() * 0.2 }
    launched++
  }

  return {
    get stats() { return { active, launched } },
    /**
     * `time` is the time of active flight. `centre` is the centre of the nearest world, for
     * the local up. `dark` is shootingStarDark().
     */
    update(time: number, camera: THREE.PerspectiveCamera, centre: THREE.Vector3, dark: number) {
      localUp.copy(camera.position).sub(centre).normalize()
      if (dark > SHOOTING_STAR_DARK) {
        if (next < 0 || next - time > SHOOTING_STARS.gapMax) next = time + shootingStarGap(random)
        else if (time >= next) { launch(time, camera); next = time + shootingStarGap(random) }
      } else next = -1
      active = 0
      for (const item of pool) {
        const meteor = item.meteor
        const age = meteor ? time - meteor.born : -1
        const fade = meteor ? shootingStarFade(age) * dark : 0
        if (!meteor || age < 0 || age > SHOOTING_STARS.life || fade <= 0) {
          if (meteor && (age > SHOOTING_STARS.life || age < 0)) item.meteor = null
          item.mesh.visible = item.glow.visible = false
          continue
        }
        active++
        const x = age / SHOOTING_STARS.life
        // The head slows a little; the streak grows, then follows the head.
        const s = 1 - Math.pow(1 - x, 1.6)
        along(meteor, s, camera.position, head)
        along(meteor, Math.max(0, s - 0.5 * Math.min(1, x * 2.2)), camera.position, tail)
        view.copy(head).add(tail).multiplyScalar(0.5).sub(camera.position)
        side.copy(head).sub(tail).cross(view).normalize().multiplyScalar(2.2)
        const positions = item.mesh.geometry.attributes.position as THREE.BufferAttribute
        positions.setXYZ(0, tail.x - side.x, tail.y - side.y, tail.z - side.z)
        positions.setXYZ(1, tail.x + side.x, tail.y + side.y, tail.z + side.z)
        positions.setXYZ(2, head.x - side.x, head.y - side.y, head.z - side.z)
        positions.setXYZ(3, head.x + side.x, head.y + side.y, head.z + side.z)
        positions.needsUpdate = true
        item.material.uniforms.uAlpha.value = fade * 1.4
        item.glow.position.copy(head)
        item.glow.material.opacity = fade * 0.9
        item.mesh.visible = item.glow.visible = true
      }
    },
  }
}
export type ShootingStars = ReturnType<typeof createShootingStars>
