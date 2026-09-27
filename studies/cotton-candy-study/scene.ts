import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createFairyRig, createSkyDancerAnimation } from '../../src/fairy'
import { orientFlight } from '../../src/flight'
import { daylightAt, skyColor, skyProfile, solarElevation } from '../../src/daylight'
import { createSunShading } from '../../src/sun-shading'
import { createTerrain, HOME_SEED } from '../../src/terrain'
import { flossMaterial, puffGeometry } from '../../src/cotton-candy'
import { homeCottagePosition, regenerateWorld, surfaceRadius } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { CLOUD_SPEED, cloudLayout, CONE_SEGMENTS, HOME, MIST, TODAY } from './model'
import type { CloudOption, Device } from './model'

export type View = 'garden' | 'layer' | 'planet'
export type Light = 'day' | 'golden' | 'night'
export type Flight = 'fly' | 'hover'
export type StudySettings = { option: CloudOption; device: Device; view: View; light: Light; flight: Flight; mist: boolean }

/** Solar elevation at the garden, in degrees. */
export const ELEVATION: Record<Light, number> = { day: 48, golden: 5, night: -22 }

// Colors and light levels from src/main.ts, so the preview matches the game.
const spaceColor = new THREE.Color(0x02030f)
const sunColor = new THREE.Color(0xffebcc), lowSunColor = new THREE.Color(0xffa267)
const dayAmbientSky = new THREE.Color(0xd9efff), nightAmbientSky = new THREE.Color(0xa8bced)
const dayAmbientGround = new THREE.Color(0x65794e), nightAmbientGround = new THREE.Color(0x3c3a5a)

/** A paper cone with spiral stripes. The tip points down (−y); the rim is at y = 0. */
function coneGeometry(stripe: THREE.Color) {
  const geometry = new THREE.ConeGeometry(1, 1, CONE_SEGMENTS[0], CONE_SEGMENTS[1], true).rotateX(Math.PI).translate(0, -0.5, 0).toNonIndexed()
  const position = geometry.attributes.position, colors = new Float32Array(position.count * 3)
  const paper = new THREE.Color(0xfff4e6), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i); b.fromBufferAttribute(position, i + 1); c.fromBufferAttribute(position, i + 2)
    a.add(b).add(c).divideScalar(3)
    // The face center decides the color, so stripe edges stay sharp.
    const band = Math.floor(Math.atan2(a.z, a.x) / (Math.PI * 2) * 6 + a.y * 4 + 12) % 2
    const color = band ? stripe : paper
    for (let k = 0; k < 3; k++) colors.set([color.r, color.g, color.b], (i + k) * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function softDisc() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.25, 'rgba(255,240,250,0.9)'); gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function homeWorld(): World {
  const group = new THREE.Group(), surface = new THREE.Group(), clouds = new THREE.Group()
  group.add(surface, clouds)
  const home: World = {
    name: 'Blossom Haven', kind: 'fairy', radius: HOME.radius, atmosphere: HOME.atmosphere, cloudHeight: HOME.cloudHeight,
    color: 0xf3acd1, sky: new THREE.Color(0xe7b6e8), group, surface, clouds,
    sample: createTerrain('fairy', HOME_SEED), seed: HOME_SEED, visit: 0, armed: false, gas: false, mobile: false,
  }
  regenerateWorld(home)
  // The study builds every option from the model, the clouds of the game too.
  clouds.visible = false
  // Turn the planet so that the cottage (the south pole) is at the top of the scene.
  group.rotation.x = Math.PI
  group.updateMatrixWorld(true)
  return home
}

export function createCloudScene(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', 'Blossom Haven with the selected cloud option: the candy garden, the cloud layer and the whole planet. Drag to turn and scroll to zoom.')
  host.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color()
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 6000)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false

  const home = homeWorld()
  scene.add(home.group)
  const centre = home.group.position
  const study = new THREE.Group(); study.name = 'study-clouds'; home.group.add(study)

  const ambient = new THREE.HemisphereLight(0xd9efff, 0x65794e, 2.1)
  // Decay 0 and distance 0 make this the game sun: the sun shading masks only this light.
  const sun = new THREE.PointLight(0xffebcc, 2.4, 0, 0)
  const nightFill = new THREE.DirectionalLight(0xc0b6f5, 0)
  scene.add(ambient, sun, nightFill, nightFill.target)
  const sunShading = createSunShading(sun.position)
  const fog = new THREE.FogExp2(0xffffff, 0)
  scene.fog = fog
  const profile = skyProfile(home)
  const skyTint = new THREE.Color(), mistTint = new THREE.Color(), mistColor = new THREE.Color()

  const time = { value: 0 }
  const disc = softDisc()
  const stats = { calls: 0, triangles: 0, puffs: 0, cones: 0, sparkles: 0, fog: '', fogDensity: 0 }

  function clearStudy() {
    study.traverse(object => {
      const item = object as THREE.Mesh
      if (!item.geometry) return
      item.geometry.dispose()
      for (const material of Array.isArray(item.material) ? item.material : [item.material]) material.dispose()
      if (item instanceof THREE.InstancedMesh) item.dispose()
    })
    study.clear()
  }

  function buildClouds(option: CloudOption, device: Device) {
    clearStudy()
    const layout = cloudLayout(option, device)
    const floss = option === 'puffs' || option === 'cones'
    const material = floss ? flossMaterial(time)
      : new THREE.MeshStandardMaterial({ color: option === 'today' ? TODAY.color : 0xffffff, roughness: 1, transparent: true, opacity: TODAY.opacity, depthWrite: false })
    const geometry = floss ? puffGeometry(device === 'phone') : new THREE.IcosahedronGeometry(1, 1)
    const puffs = new THREE.InstancedMesh(geometry, material, layout.puffs.length)
    puffs.name = 'cloud-puffs'
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), color = new THREE.Color()
    layout.puffs.forEach((puff, i) => {
      dummy.position.copy(puff.position)
      dummy.quaternion.setFromUnitVectors(up, puff.up)
      dummy.rotateY(puff.spin)
      dummy.scale.copy(puff.scale)
      dummy.updateMatrix()
      puffs.setMatrixAt(i, dummy.matrix)
      if (option !== 'today') puffs.setColorAt(i, color.setHex(puff.color))
    })
    study.add(puffs)
    if (layout.cones.length) {
      const cones = new THREE.InstancedMesh(coneGeometry(new THREE.Color(0xf29cc4)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), layout.cones.length)
      cones.name = 'paper-cones'
      layout.cones.forEach((cone, i) => {
        dummy.position.copy(cone.position)
        dummy.quaternion.setFromUnitVectors(up, cone.up)
        dummy.scale.set(cone.radius, cone.length, cone.radius)
        dummy.updateMatrix(); cones.setMatrixAt(i, dummy.matrix)
      })
      study.add(cones)
    }
    if (layout.sparkles.length) {
      const sparkleGeometry = new THREE.BufferGeometry().setFromPoints(layout.sparkles)
      const sparkleMaterial = new THREE.PointsMaterial({ color: 0xfff6fb, size: 0.9, map: disc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      sparkleMaterial.onBeforeCompile = shader => {
        shader.uniforms.flossTime = time
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float flossTime;')
          .replace('#include <fog_vertex>', 'gl_PointSize *= 0.45 + 0.55 * abs( sin( flossTime * 1.9 + float( gl_VertexID ) * 2.39 ) );\n#include <fog_vertex>')
      }
      sparkleMaterial.customProgramCacheKey = () => 'sugar-sparkle'
      const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial)
      sparkles.name = 'sugar-sparkles'
      study.add(sparkles)
    }
    sunShading.track(scene)
    stats.puffs = layout.puffs.length
    stats.cones = layout.cones.length
    stats.sparkles = layout.sparkles.length
    return layout
  }

  // Planet-local places of the three views. The cottage is at local (0, −1, 0).
  const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize().applyQuaternion(home.group.quaternion)
  /** A direction at an angle from the cottage, at an azimuth in the local x–z plane. */
  const fromCottage = (angle: number, azimuth: number) => {
    const a = THREE.MathUtils.degToRad(azimuth)
    return local(Math.sin(angle) * Math.cos(a), -Math.cos(angle), Math.sin(angle) * Math.sin(a))
  }
  // At azimuth 70°, the clouds of every layout are near the cottage (see the technical study).
  const gardenEye = fromCottage(0.2, 200), gardenLook = fromCottage(0.3, 70)
  const anchor = local(0, -1, 0)
  const sunSide = local(1, 0, 0.35)
  // The fairy flies a great circle through the cloud layer, near the garden.
  const flightStart = local(0.1, -1, -0.5), flightHeading = new THREE.Vector3()
  const flightAxis = new THREE.Vector3().crossVectors(flightStart, local(1, -0.25, 0)).normalize()
  const fairy = createFairyRig({ withTrail: false })
  const dancer = createSkyDancerAnimation(fairy)
  scene.add(fairy.root)
  let angle = 0
  const flightRadius = HOME.radius + HOME.cloudHeight + 4

  function placeFairy() {
    const normal = flightStart.clone().applyAxisAngle(flightAxis, angle)
    fairy.root.position.copy(centre).addScaledVector(normal, flightRadius)
    flightHeading.crossVectors(flightAxis, normal).normalize()
    orientFlight(fairy.root.quaternion, flightHeading, normal)
  }

  let settings: StudySettings | undefined
  let built = ''
  const chase = new THREE.Vector3(), look = new THREE.Vector3()

  function setCamera(view: View) {
    controls.enabled = true
    if (view === 'garden') {
      const eye = centre.clone().addScaledVector(gardenEye, surfaceRadius(home, gardenEye) + 3)
      // Look over the cottage roof, up into the cloud layer.
      controls.target.copy(centre).addScaledVector(gardenLook, HOME.radius + 34)
      camera.position.copy(eye)
      camera.up.copy(anchor)
      controls.minDistance = 8; controls.maxDistance = 160
    } else if (view === 'planet') {
      controls.target.copy(centre)
      camera.up.set(0, 1, 0)
      camera.position.copy(centre).add(new THREE.Vector3(0.15, 0.62, 1).normalize().multiplyScalar(400))
      controls.minDistance = 190; controls.maxDistance = 1100
    } else {
      placeFairy()
      camera.up.copy(fairy.root.position).sub(centre).normalize()
      chase.set(0, 2.8, 8).applyQuaternion(fairy.root.quaternion).add(fairy.root.position)
      camera.position.copy(chase)
      controls.target.copy(fairy.root.position)
      controls.minDistance = 3; controls.maxDistance = 60
      controls.enabled = settings?.flight === 'hover'
    }
    camera.lookAt(controls.target)
    controls.update()
  }

  function apply(next: StudySettings) {
    const viewChanged = settings?.view !== next.view || settings?.flight !== next.flight
    settings = { ...next }
    const key = `${next.option}|${next.device}`
    if (key !== built) { buildClouds(next.option, next.device); built = key }
    const elevation = THREE.MathUtils.degToRad(ELEVATION[next.light])
    sun.position.copy(centre).addScaledVector(anchor.clone().multiplyScalar(Math.sin(elevation)).addScaledVector(sunSide, Math.cos(elevation)).normalize(), 5000)
    mistColor.setHex(next.mist ? MIST.candy : MIST.today)
    fairy.root.visible = next.view === 'layer'
    if (viewChanged) setCamera(next.view)
  }

  function resetView() { if (settings) setCamera(settings.view) }

  /** A port of updateEnvironment() in src/main.ts for one world. */
  function updateEnvironment() {
    const altitude = camera.position.distanceTo(centre) - HOME.radius
    const density = 1 - THREE.MathUtils.smoothstep(altitude, HOME.atmosphere * 0.25, HOME.atmosphere * 1.08)
    const cloudMist = Math.exp(-Math.pow((altitude - HOME.cloudHeight - 4) / 6, 2)) * density
    const probe = settings?.view === 'layer' ? fairy.root.position : camera.position
    const light = daylightAt(solarElevation(probe, centre, sun.position))
    skyColor(profile, light, skyTint)
    mistTint.copy(mistColor).lerp(skyTint, light.night)
    fog.color.copy(skyTint).lerp(mistTint, cloudMist * 0.65)
    fog.density = 0.0018 * density + cloudMist * 0.023
    ;(scene.background as THREE.Color).copy(spaceColor).lerp(skyTint, density * 0.78)
    sun.color.copy(sunColor).lerp(lowSunColor, light.twilight * density)
    const normal = probe.clone().sub(centre).normalize()
    const surfaceDay = THREE.MathUtils.lerp(1, light.day, density)
    ambient.position.copy(normal)
    ambient.intensity = THREE.MathUtils.lerp(1.1, THREE.MathUtils.lerp(0.85, 2.1, light.day), density)
    ambient.color.copy(nightAmbientSky).lerp(dayAmbientSky, surfaceDay)
    ambient.groundColor.copy(nightAmbientGround).lerp(dayAmbientGround, surfaceDay)
    nightFill.intensity = 0.45 * light.night * density
    nightFill.target.position.copy(probe)
    nightFill.position.copy(probe).addScaledVector(normal, 300).add(new THREE.Vector3(120, 0, -90))
    stats.fog = fog.color.getHexString()
    stats.fogDensity = fog.density
  }

  const observer = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight)
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
  })
  observer.observe(host)

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const cottageWindow = (home.surface.getObjectByName('cottage-window') as THREE.Mesh).material as THREE.MeshStandardMaterial
  let previous = performance.now(), elapsed = 0, frame = 0
  function animate(now: number) {
    const delta = Math.min((now - previous) / 1000, 0.05); previous = now
    if (!document.hidden && !reducedMotion) elapsed += delta
    time.value = elapsed
    if (settings?.view === 'layer') {
      if (settings.flight === 'fly' && !reducedMotion) {
        angle += delta * CLOUD_SPEED / flightRadius
        placeFairy()
        // The chase camera of the game: behind and above, looking ahead of the fairy.
        chase.set(0, 2.8, 8).applyQuaternion(fairy.root.quaternion).add(fairy.root.position)
        camera.position.lerp(chase, 1 - Math.exp(-delta * 6))
        look.copy(fairy.root.position).addScaledVector(flightHeading, 12)
        camera.up.copy(fairy.root.position).sub(centre).normalize()
        camera.lookAt(look)
      }
      dancer.update(delta || 0.016, false)
    }
    home.animate?.(elapsed)
    home.creatures?.update(reducedMotion ? 0 : delta, camera.position)
    const cottageDay = daylightAt(solarElevation(homeCottagePosition(home), centre, sun.position)).day
    cottageWindow.emissiveIntensity = THREE.MathUtils.lerp(1.7, 0.9, cottageDay)
    sunShading.update([home])
    sunShading.track(scene)
    updateEnvironment()
    if (controls.enabled) controls.update()
    renderer.render(scene, camera)
    stats.calls = renderer.info.render.calls
    stats.triangles = renderer.info.render.triangles
    frame = requestAnimationFrame(animate)
  }
  frame = requestAnimationFrame(animate)

  return {
    apply, resetView, stats,
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); clearStudy(); renderer.dispose() },
  }
}

