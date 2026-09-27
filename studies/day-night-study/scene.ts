import * as THREE from 'three'
import { createCandyScene } from '../candy-planet-study/scene'
import { seededRandom } from '../../src/terrain'
import { sampleHour } from './model'
import type { NightStyle } from './model'

export function createDayNightScene(host: HTMLElement) {
  const garden = createCandyScene(host)
  const { scene, camera, renderer, light, ambient, fill, windowMaterial } = garden.environment
  renderer.domElement.setAttribute('aria-label', 'Blossom Haven lighting prototype: the same 3D garden at dawn, noon, sunset, and night. Drag to orbit and scroll to zoom.')
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMappingExposure = 1.05
  scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = !((object.material as THREE.Material).transparent)
      object.receiveShadow = true
    }
  })
  light.castShadow = true
  light.shadow.mapSize.set(1024, 1024)
  Object.assign(light.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 650 })
  light.shadow.normalBias = 0.18
  light.target.position.set(0, 110, 0)
  scene.add(light.target)
  fill.position.set(80, 200, 100)
  ambient.groundColor.setHex(0x756b91)

  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
    vertexShader: `varying vec3 direction;
      void main(){ direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 direction; uniform vec3 zenith; uniform vec3 horizon;
      void main(){ float h = smoothstep(-0.3,0.65,normalize(direction).y);
        gl_FragColor = vec4(mix(horizon,zenith,h),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMaterial)
  sky.renderOrder = -10
  sky.onBeforeRender = () => { sky.position.copy(camera.position); sky.updateMatrixWorld() }
  scene.add(sky)
  const random = seededRandom(20260926)
  const positions = []
  for (let i = 0; i < 1700; i++) {
    const y = random() * 2 - 1, angle = random() * Math.PI * 2, r = Math.sqrt(1 - y * y)
    positions.push(r * Math.cos(angle) * 850, y * 850, r * Math.sin(angle) * 850)
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const starMaterial = new THREE.PointsMaterial({ color: 0xd9e9ff, size: 1.8, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false })
  const stars = new THREE.Points(starGeometry, starMaterial)
  stars.onBeforeRender = () => { stars.position.copy(camera.position); stars.updateMatrixWorld() }
  scene.add(stars)
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4ad, fog: false })
  const sun = new THREE.Mesh(new THREE.SphereGeometry(13, 24, 16), sunMaterial)
  scene.add(sun)
  const zenithNight = new THREE.Color(0x121e41), zenithDay = new THREE.Color(0x7eadd6)
  const horizonNight = new THREE.Color(0x384463), horizonDay = new THREE.Color(0xe2e1d9), peach = new THREE.Color(0xf2a178)
  const fog = new THREE.FogExp2(0xe2e1d9, 0.0015)
  scene.fog = fog

  function update(hour: number, style: NightStyle, currentLighting: boolean) {
    const state = sampleHour(hour, style)
    if (currentLighting) {
      light.position.set(-100, 240, 130); light.color.setHex(0xffecce); light.intensity = 3
      ambient.color.setHex(0xfff0f9); ambient.intensity = 2.6; fill.intensity = 1.2
      windowMaterial.emissiveIntensity = 0.6
      skyMaterial.uniforms.zenith.value.copy(zenithDay)
      skyMaterial.uniforms.horizon.value.copy(horizonDay)
      starMaterial.opacity = 0; sun.visible = false
    } else {
      light.position.copy(light.target.position).addScaledVector(state.sunDirection, 300)
      light.color.setHex(0xfff1dc).lerp(new THREE.Color(0xffa267), state.twilight)
      light.intensity = state.sunIntensity
      ambient.color.setHex(0xa8bced).lerp(new THREE.Color(0xe0efff), state.day)
      ambient.intensity = state.ambientIntensity; fill.intensity = state.fillIntensity
      fill.color.setHex(0xc0b6f5)
      windowMaterial.emissiveIntensity = state.windowGlow
      skyMaterial.uniforms.zenith.value.copy(zenithNight).lerp(zenithDay, state.day)
      skyMaterial.uniforms.horizon.value.copy(horizonNight).lerp(horizonDay, state.day).lerp(peach, state.twilight * 0.85)
      starMaterial.opacity = state.stars * 0.85
      sun.visible = state.elevation > -3
      sun.position.copy(camera.position).addScaledVector(state.sunDirection, 700)
      sunMaterial.color.copy(light.color)
    }
    fog.color.copy(skyMaterial.uniforms.horizon.value)
    return state
  }
  function setView(view: 'meadow' | 'home' | 'friends') {
    garden.setView(view)
    // A lower eye line makes the changing sky readable alongside the landscape.
    if (view === 'meadow') camera.position.add(new THREE.Vector3(2, -16, -8))
  }
  setView('meadow')
  return { update, setView, setPaused: garden.setPaused }
}
