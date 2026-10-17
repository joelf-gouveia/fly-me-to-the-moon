import * as THREE from 'three'
import { softDisc } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { NOVA_MIN_PIXELS } from '../numbers'
import { clamp01, ramp } from './kit'

/**
 * The three looks of the nova at a hop, as prototypes for the clips. Each look is a few sprites,
 * a ring or a shell, and points, with additive light. A nova has the size of the home (`radius`),
 * and a nova far away keeps NOVA_MIN_PIXELS on the screen, so it shows from across the system.
 *
 * - `blossom` (A): a pink and gold flash, two rings of light, and petals in the colours of the
 *   four magic seasons.
 * - `star` (B): a white flash with four spikes and a shell of light that grows, as a real nova.
 * - `glow` (C): the pink glow of today (createRelocationGlow() in src/relocation.ts), brighter,
 *   and a small puff of gold sparkles.
 */
export type NovaLook = 'blossom' | 'star' | 'glow'
export const NOVA_SECONDS: Record<NovaLook, number> = { blossom: 3.4, star: 4.2, glow: 2.6 }

/** Pixels on a screen of 720 px for one radian at the field of view of the game (58°). */
const PIXELS_PER_RADIAN = 360 / Math.tan(THREE.MathUtils.degToRad(29))

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d')!, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A petal: a soft white drop. The colour of each petal comes from its point. */
const petalTexture = () => canvasTexture(64, (ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size * 0.42, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.85)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.ellipse(size / 2, size / 2, size * 0.26, size * 0.44, 0.5, 0, Math.PI * 2)
  ctx.fill()
})

/** Four thin spikes and a small middle, as a bright star in a photograph. */
const spikeTexture = () => canvasTexture(256, (ctx, size) => {
  const c = size / 2
  for (const angle of [0, Math.PI / 2]) {
    ctx.save()
    ctx.translate(c, c)
    ctx.rotate(angle)
    const gradient = ctx.createLinearGradient(-c, 0, c, 0)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(-c, -2.5, size, 5)
    ctx.restore()
  }
  const middle = ctx.createRadialGradient(c, c, 0, c, c, c * 0.25)
  middle.addColorStop(0, 'rgba(255,255,255,1)')
  middle.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = middle
  ctx.fillRect(0, 0, size, size)
})

const SEASON_COLOURS = [0xffa8cf, 0xffe39a, 0x9fe3cf, 0xc9a8ff, 0xffffff]

type Part = { object: THREE.Object3D; update(age: number, distance: number, camera: THREE.Camera): void }
type Burst = { centre: THREE.Vector3; radius: number; age: number; parts: Part[]; root: THREE.Group }

export function createNovae(scene: THREE.Scene, look: NovaLook) {
  const disc = softDisc()
  const petals = petalTexture(), spikes = spikeTexture()
  const bursts: Burst[] = []
  const floor = (distance: number, pixels = NOVA_MIN_PIXELS) => distance * pixels / PIXELS_PER_RADIAN

  /** A sprite with additive light. `size(age)` is its diameter in units of the home radius. */
  function sprite(burst: Burst, map: THREE.Texture, color: number, size: (age: number) => number, opacity: (age: number) => number, minPixels = NOVA_MIN_PIXELS * 2.6, spin = 0): Part {
    const material = new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    const object = new THREE.Sprite(material)
    object.renderOrder = 5
    return {
      object,
      update(age, distance) {
        object.scale.setScalar(Math.max(size(age) * burst.radius, floor(distance, minPixels)))
        material.opacity = opacity(age)
        material.rotation = spin * age
        object.visible = material.opacity > 0.002
      },
    }
  }

  /** A ring of light that faces the camera and grows from `from` to `to` home radii. */
  function ring(burst: Burst, color: number, from: number, to: number, delay: number, seconds: number, opacity: number): Part {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })
    const object = new THREE.Mesh(new THREE.RingGeometry(0.955, 1, 160), material)
    object.renderOrder = 5
    return {
      object,
      update(age, distance, camera) {
        const u = ramp(age, delay, delay + seconds), grow = 1 - (1 - u) ** 3
        object.quaternion.copy(camera.quaternion)
        object.scale.setScalar(Math.max((from + (to - from) * grow) * burst.radius, floor(distance, 6)))
        material.opacity = age < delay ? 0 : opacity * (1 - u) ** 2.2
        object.visible = material.opacity > 0.002
      },
    }
  }

  /** Points that fly out from the middle and slow down: petals, or sparkles. */
  function flyOut(burst: Burst, count: number, map: THREE.Texture, colours: number[], reach: number, seconds: number, size: number, opacity: number, cap = 14): Part {
    const directions = new Float32Array(count * 3), speeds = new Float32Array(count), positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
    const direction = new THREE.Vector3(), color = new THREE.Color()
    for (let i = 0; i < count; i++) {
      direction.randomDirection()
      directions.set([direction.x, direction.y, direction.z], i * 3)
      speeds[i] = 0.55 + Math.random() * 0.45
      color.setHex(colours[i % colours.length])
      colors.set([color.r, color.g, color.b], i * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({ map, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    const object = new THREE.Points(geometry, material)
    object.frustumCulled = false
    object.renderOrder = 6
    return {
      object,
      update(age, distance) {
        const u = clamp01(age / seconds), out = (1 - (1 - u) ** 2.4) * reach * burst.radius
        for (let i = 0; i < count; i++) {
          const d = (1.05 + out / burst.radius * speeds[i]) * burst.radius
          positions[i * 3] = directions[i * 3] * d
          positions[i * 3 + 1] = directions[i * 3 + 1] * d - age * age * burst.radius * 0.04
          positions[i * 3 + 2] = directions[i * 3 + 2] * d
        }
        geometry.attributes.position.needsUpdate = true
        // A petal keeps the size of a petal: a big home does not get petals of 90 m.
        material.size = Math.max(Math.min(size * burst.radius, cap), floor(distance, 3))
        material.opacity = opacity * (1 - ramp(age, seconds * 0.45, seconds))
        object.visible = material.opacity > 0.002
      },
    }
  }

  /** The shell of a real nova: a sphere of light, bright at its edge, that grows and fades. */
  function shell(burst: Burst): Part {
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { age: { value: 0 }, fade: { value: 1 } },
      vertexShader: `varying vec3 vNormal; varying vec3 vView;
        void main() { vec4 world = modelMatrix * vec4(position, 1.0); vNormal = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - world.xyz); gl_Position = projectionMatrix * viewMatrix * world; }`,
      fragmentShader: `uniform float age; uniform float fade; varying vec3 vNormal; varying vec3 vView;
        void main() {
          float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.2);
          vec3 colour = mix(vec3(1.0, 0.97, 0.92), mix(vec3(0.55, 0.8, 1.0), vec3(0.75, 0.55, 1.0), clamp(age / 4.0, 0.0, 1.0)), clamp(age / 1.2, 0.0, 1.0));
          gl_FragColor = vec4(colour * (0.15 + rim), (0.15 + rim) * fade);
        }`,
    })
    const object = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material)
    object.renderOrder = 4
    return {
      object,
      update(age, distance) {
        const u = clamp01(age / 4), grow = 1 - (1 - u) ** 2.5
        object.scale.setScalar(Math.max((1.4 + 5 * grow) * burst.radius, floor(distance, 5)))
        material.uniforms.age.value = age
        material.uniforms.fade.value = 0.85 * ramp(age, 0, 0.12) * (1 - u) ** 1.3
        object.visible = material.uniforms.fade.value > 0.002
      },
    }
  }

  function makeParts(burst: Burst): Part[] {
    const fade = (rise: number, end: number, peak = 1) => (age: number) => peak * ramp(age, 0, rise) * (1 - ramp(age, rise, end)) ** 1.5
    if (look === 'blossom') return [
      sprite(burst, disc, 0xd9a6ff, age => 4.5 + age * 0.4, fade(0.5, 2.8, 0.28)),
      sprite(burst, disc, 0xffd6ec, age => 2.4 + 1.1 * ramp(age, 0, 0.4), fade(0.3, 1.8, 0.95)),
      ring(burst, 0xffc96e, 1.2, 4.4, 0.1, 1.7, 0.8),
      ring(burst, 0xff8fc6, 1.1, 3.3, 0.35, 1.6, 0.65),
      flyOut(burst, 160, petals, SEASON_COLOURS, 3.2, 3, 0.1, 1),
    ]
    if (look === 'star') return [
      shell(burst),
      sprite(burst, disc, 0xe8f2ff, age => 3.6 + 1.6 * ramp(age, 0, 0.15), fade(0.12, 1.7, 1)),
      sprite(burst, spikes, 0xf4f8ff, () => 11, fade(0.12, 1.3, 0.9), NOVA_MIN_PIXELS * 6, 0.12),
      flyOut(burst, 70, disc, [0xffffff, 0xcfe4ff], 5.5, 4, 0.05, 0.8, 8),
    ]
    return [
      sprite(burst, disc, 0xffacd5, () => 3.5, fade(0.25, 2.5, 0.55)),
      flyOut(burst, 48, disc, [0xffe39a, 0xffffff], 3, 2.2, 0.07, 0.9, 8),
    ]
  }

  return {
    /** A nova at `centre` for a home of `radius` metres. `sound` gives the chime of the look. */
    fire(centre: THREE.Vector3, radius: number, sound = true) {
      const root = new THREE.Group()
      root.position.copy(centre)
      scene.add(root)
      const burst: Burst = { centre: centre.clone(), radius, age: 0, parts: [], root }
      burst.parts = makeParts(burst)
      burst.parts.forEach(part => root.add(part.object))
      bursts.push(burst)
      if (sound) chime(look === 'blossom' ? [783.99, 1046.5, 1318.51, 1567.98] : look === 'star' ? [523.25, 1046.5] : [1046.5, 1318.51], 0.04)
    },
    update(delta: number, camera: THREE.Camera) {
      for (const burst of [...bursts]) {
        burst.age += delta
        const distance = camera.position.distanceTo(burst.centre)
        burst.parts.forEach(part => part.update(burst.age, distance, camera))
        if (burst.age > NOVA_SECONDS[look]) {
          scene.remove(burst.root)
          burst.root.traverse(object => {
            // A sprite shares one geometry with each sprite of three.js: only its material goes.
            if (object instanceof THREE.Mesh || object instanceof THREE.Points) object.geometry.dispose()
            if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Sprite) (object.material as THREE.Material).dispose()
          })
          bursts.splice(bursts.indexOf(burst), 1)
        }
      }
    },
    /** The brightness of the flash now, from 0 to 1, for the sky glow of a home with the fairy on it. */
    get flash() { return bursts.reduce((most, burst) => Math.max(most, ramp(burst.age, 0, 0.3) * (1 - ramp(burst.age, 0.3, 2))), 0) },
    dispose() {
      for (const burst of bursts) scene.remove(burst.root)
      bursts.length = 0
      disc.dispose(); petals.dispose(); spikes.dispose()
    },
  }
}
