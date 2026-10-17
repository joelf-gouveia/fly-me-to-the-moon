import * as THREE from 'three'

/**
 * The nova of a hop of Blossom Haven: look B of the wandering home study (docs/wandering-home-study.md).
 * A white flash with four spikes, a shell of light that grows and turns blue and violet, and a few
 * sparkles. The parts are in units of the home radius. A nova far away keeps NOVA_MIN_PIXELS on the
 * screen, so the child sees it from across the system. With reduced motion only a soft glow shows:
 * no shell, no spikes and no sparkles.
 */
export const NOVA_SECONDS = 4.2
/** The smallest nova on the screen, in CSS pixels: the flash is about 2.6 times this. */
export const NOVA_MIN_PIXELS = 14
/** The flash peaks at this time after the start. The hop moves the home at the peak. */
export const NOVA_PEAK = 0.15

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
/** Up in `rise` seconds, then down to 0 at `end`. */
const fade = (age: number, rise: number, end: number) => ramp(age, 0, rise) * (1 - ramp(age, rise, end)) ** 1.5

function spikeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!, c = 128
  for (const angle of [0, Math.PI / 2]) {
    ctx.save()
    ctx.translate(c, c)
    ctx.rotate(angle)
    const gradient = ctx.createLinearGradient(-c, 0, c, 0)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(-c, -2.5, 256, 5)
    ctx.restore()
  }
  const middle = ctx.createRadialGradient(c, c, 0, c, c, c * 0.25)
  middle.addColorStop(0, 'rgba(255,255,255,1)')
  middle.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = middle
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

type Burst = {
  centre: THREE.Vector3; radius: number; age: number; still: boolean; root: THREE.Group
  core: THREE.Sprite; spikes: THREE.Sprite; shell: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  sparkles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>; directions: Float32Array; speeds: Float32Array
}

/** `disc` is a soft round texture (makeSoftDiscTexture() in src/main.ts). */
export function createHopNova(scene: THREE.Scene, disc: THREE.Texture) {
  const spikes = spikeTexture()
  const shellGeometry = new THREE.SphereGeometry(1, 48, 32)
  const bursts: Burst[] = []
  const SPARKLES = 70

  function make(centre: THREE.Vector3, radius: number, still: boolean): Burst {
    const root = new THREE.Group()
    root.name = 'hop-nova'
    root.position.copy(centre)
    const sprite = (map: THREE.Texture, color: number) => {
      const object = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))
      object.renderOrder = 5
      return object
    }
    const core = sprite(disc, 0xe8f2ff), spike = sprite(spikes, 0xf4f8ff)
    const shell = new THREE.Mesh(shellGeometry, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { age: { value: 0 }, fade: { value: 0 } },
      vertexShader: `varying vec3 vNormal; varying vec3 vView;
        void main() { vec4 world = modelMatrix * vec4(position, 1.0); vNormal = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - world.xyz); gl_Position = projectionMatrix * viewMatrix * world; }`,
      // The edge is bright, as a shell of gas seen from the side. White, then blue, then violet.
      fragmentShader: `uniform float age; uniform float fade; varying vec3 vNormal; varying vec3 vView;
        void main() {
          float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.2);
          vec3 colour = mix(vec3(1.0, 0.97, 0.92), mix(vec3(0.55, 0.8, 1.0), vec3(0.75, 0.55, 1.0), clamp(age / 4.0, 0.0, 1.0)), clamp(age / 1.2, 0.0, 1.0));
          gl_FragColor = vec4(colour * (0.15 + rim), (0.15 + rim) * fade);
        }`,
    }))
    shell.renderOrder = 4
    const directions = new Float32Array(SPARKLES * 3), speeds = new Float32Array(SPARKLES), direction = new THREE.Vector3()
    for (let i = 0; i < SPARKLES; i++) {
      direction.randomDirection()
      directions.set([direction.x, direction.y, direction.z], i * 3)
      speeds[i] = 0.55 + Math.random() * 0.45
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKLES * 3), 3))
    const sparkles = new THREE.Points(geometry, new THREE.PointsMaterial({ map: disc, color: 0xdce9ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))
    sparkles.frustumCulled = false
    sparkles.renderOrder = 6
    root.add(shell, core, spike, sparkles)
    scene.add(root)
    return { centre: centre.clone(), radius, age: 0, still, root, core, spikes: spike, shell, sparkles, directions, speeds }
  }

  function remove(burst: Burst) {
    scene.remove(burst.root)
    burst.core.material.dispose(); burst.spikes.material.dispose(); burst.shell.material.dispose()
    burst.sparkles.geometry.dispose(); burst.sparkles.material.dispose()
  }

  return {
    /** A nova at `centre` for a home of `radius` metres. `still` is reduced motion: a soft glow only. */
    fire(centre: THREE.Vector3, radius: number, still: boolean) { bursts.push(make(centre, radius, still)) },
    /** `viewHeight` is the height of the view in CSS pixels, for the smallest size. */
    update(delta: number, camera: THREE.PerspectiveCamera, viewHeight: number) {
      const perRadian = viewHeight / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      for (const burst of [...bursts]) {
        burst.age += delta
        const age = burst.age, r = burst.radius
        if (age > NOVA_SECONDS) { remove(burst); bursts.splice(bursts.indexOf(burst), 1); continue }
        const floor = (pixels: number) => camera.position.distanceTo(burst.centre) * pixels / perRadian
        // Reduced motion: one soft glow of the size of the home, with no growth.
        burst.core.scale.setScalar(Math.max((burst.still ? 3 : 3.6 + 1.6 * ramp(age, 0, NOVA_PEAK)) * r, floor(NOVA_MIN_PIXELS * 2.6)))
        burst.core.material.opacity = burst.still ? 0.45 * fade(age, 0.4, 2.4) : fade(age, 0.12, 1.7)
        burst.spikes.visible = burst.shell.visible = burst.sparkles.visible = !burst.still
        if (burst.still) continue
        burst.spikes.scale.setScalar(Math.max(11 * r, floor(NOVA_MIN_PIXELS * 6)))
        burst.spikes.material.opacity = 0.9 * fade(age, 0.12, 1.3)
        burst.spikes.material.rotation = 0.12 * age
        const u = clamp01(age / 4)
        burst.shell.scale.setScalar(Math.max((1.4 + 5 * (1 - (1 - u) ** 2.5)) * r, floor(5)))
        burst.shell.material.uniforms.age.value = age
        burst.shell.material.uniforms.fade.value = 0.85 * ramp(age, 0, 0.12) * (1 - u) ** 1.3
        const positions = burst.sparkles.geometry.attributes.position as THREE.BufferAttribute
        const out = 1 - (1 - u) ** 2.4
        for (let i = 0; i < SPARKLES; i++) {
          const d = (1.05 + 5.5 * out * burst.speeds[i]) * r
          positions.setXYZ(i, burst.directions[i * 3] * d, burst.directions[i * 3 + 1] * d, burst.directions[i * 3 + 2] * d)
        }
        positions.needsUpdate = true
        burst.sparkles.material.size = Math.max(Math.min(0.05 * r, 8), floor(3))
        burst.sparkles.material.opacity = 0.8 * (1 - ramp(age, 1.8, 4))
      }
    },
    /** The light of the newest flash now, from 0 to 1: the sky glow when the fairy is on the home. */
    get flash() { return bursts.reduce((most, burst) => Math.max(most, (burst.still ? 0.45 : 1) * fade(burst.age, 0.12, 1.7)), 0) },
    get count() { return bursts.length },
  }
}
