import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { createTerrain, groundHeight, HOME_CLEARING_HEIGHT, HOME_SEED, isGasWorld, seededRandom } from './terrain'
import type { PlanetKind } from './terrain'
import { buildCandyEcosystem } from './candy'
import { buildFoliage, GAME_LOOK } from './foliage/build'
import type { FoliageUniforms } from './foliage/build'
import { createFields, groundColour } from './foliage/zones'
import { buildCottonCandyClouds } from './cotton-candy'
import { createPopulation } from './creatures/population'
import type { CreaturePopulation } from './creatures/population'
import { CreatureObstacles } from './creatures/spherical'
import { DAYLIGHT, skyProfile } from './daylight'
import { auToGame, BELT_BASE, DWARF_WORLDS } from './belt'
import { PROPORTIONS } from './proportions'
import { createMoonMaterial, MOON, moonGroundColor, moonOffset } from './moon'
import { HALO_THIN, isLookedPlanet, PLANET_LOOKS, ROCKY_RELIEF } from './planet-look'
import { createGroundPainter, createLookState, lookMaterial, paintedMap, planetRings, setPlanetPainter, venusDeck } from './planet-paint'
import type { PlanetLookState } from './planet-paint'
import { createSunLook } from './sun-paint'
import type { SunLook } from './sun-paint'

export type World = {
  name: string
  kind: PlanetKind | 'sun'
  radius: number
  atmosphere: number
  cloudHeight: number
  color: number
  sky: THREE.Color
  group: THREE.Group
  surface: THREE.Group
  clouds: THREE.Group
  sample: ReturnType<typeof createTerrain>
  seed: number
  visit: number
  armed: boolean
  gas: boolean
  mobile?: boolean
  animate?: (time: number) => void
  creatures?: CreaturePopulation
  /** Earth and Blossom Haven only: the wind and the night glow of the plants (src/foliage/build.ts). */
  foliage?: FoliageUniforms
  /** The Moon only: the part of the hemisphere light on its ground. */
  earthshine?: THREE.IUniform<number>
  /** The seven planets only: the painted look of src/planet-paint.ts. */
  look?: PlanetLookState
  /** The Sun only: its living look of src/sun-paint.ts. updateEnvironment() in src/main.ts updates it. */
  sunLook?: SunLook
}

/** The Sun's live position, for the ring shadow on Saturn. createWorlds() sets it. */
let sunCentre: THREE.Vector3 | undefined

/** The terrain of a world. Mercury and Mars get a lower relief, so they are round from space (src/planet-look.ts). */
export function worldTerrain(kind: PlanetKind, seed: number) {
  const sample = createTerrain(kind, seed)
  const relief = isLookedPlanet(kind) ? ROCKY_RELIEF[kind] : undefined
  if (!relief) return sample
  return (x: number, y: number, z: number) => {
    const value = sample(x, y, z)
    return { ...value, height: value.height * relief }
  }
}

/** Blossom Haven's first place, in base units and in the game (src/proportions.ts). */
export const HOME_START_BASE = [10000, 1200, 9000] as const
export const HOME_START_POSITION = HOME_START_BASE.map(value => value * PROPORTIONS.spacing) as unknown as readonly [number, number, number]

// Ceres and Vesta sit in the asteroid belt at their real distances; see src/belt.ts.
const dwarf = (id: typeof DWARF_WORLDS[number]['id']) => {
  const world = DWARF_WORLDS.find(item => item.id === id)!
  return [world.name, world.id, world.radius, auToGame(world.au, BELT_BASE), world.angle, world.color, 0, 0] as const
}

// Base units: radius, orbit, angle, colour, atmosphere, cloud height. createWorlds() applies
// PROPORTIONS: size to radii, air and clouds, spacing to orbits (docs/proportions-study.md).
export const WORLD_DATA = [
  ['Mercury', 'mercury', 95, 1400, 0.28, 0xb7a58d, 0, 0],
  ['Venus', 'venus', 170, 2250, 1.18, 0xd5a36d, 95, 48],
  ['Earth', 'earth', 220, 3300, 0.08, 0x83c5e8, 78, 34],
  ['Mars', 'mars', 145, 4500, 2.12, 0xd7a087, 42, 23],
  dwarf('vesta'),
  dwarf('ceres'),
  ['Jupiter', 'jupiter', 470, 6300, 4.2, 0xd7bb9c, 145, 38],
  ['Saturn', 'saturn', 390, 8500, 5.18, 0xe1cb9e, 130, 35],
  ['Uranus', 'uranus', 285, 10900, 3.05, 0x96d9df, 100, 28],
  ['Neptune', 'neptune', 275, 13600, 5.82, 0x638ecb, 105, 32],
] as const

function disposeGroup(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      if ('map' in material && material.map instanceof THREE.Texture) textures.add(material.map)
    }
    if (object instanceof THREE.InstancedMesh) object.dispose()
  })
  geometries.forEach((geometry) => geometry.dispose())
  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
  group.clear()
}

export function surfaceRadius(world: World, direction: THREE.Vector3) {
  if (world.kind === 'sun') return world.radius
  const localDirection = direction.clone().applyQuaternion(world.group.quaternion.clone().invert())
  return world.radius + groundHeight(world.kind, world.sample(localDirection.x, localDirection.y, localDirection.z))
}

export function homeCottageNormal() {
  return new THREE.Vector3(0, -1, 0)
}

/** Shared by the player's Earth start and the first nearby residents. */
export function meadowNormal(world: World) {
  const random = seededRandom(world.seed + 5), normal = new THREE.Vector3()
  for (let attempt = 0; attempt < 2000; attempt++) {
    const y = random() * 0.9 - 0.45, angle = random() * Math.PI * 2
    normal.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    const sample = world.sample(normal.x, normal.y, normal.z)
    if (sample.height > 1.5 && sample.height < 5 && sample.river < 0.1) break
  }
  return normal
}

/** World-space cottage ground, optionally offset outward for an approach. */
export function homeCottagePosition(world: World, clearance = 0) {
  const normal = homeCottageNormal().applyQuaternion(world.group.quaternion)
  return normal.multiplyScalar(surfaceRadius(world, normal) + clearance).add(world.group.position)
}

function addAtmosphere(world: World, sunPosition: THREE.Vector3) {
  if (!world.atmosphere) return
  const radius = world.radius + world.atmosphere
  const profile = skyProfile(world)
  // The day/twilight bands use the same thresholds as the surface, as sines of elevation.
  const sine = (degrees: number) => Math.sin(THREE.MathUtils.degToRad(degrees)).toFixed(4)
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide,
    uniforms: {
      tint: { value: profile.day }, nightTint: { value: profile.night }, twilightTint: { value: profile.twilight },
      sunPosition: { value: sunPosition }, center: { value: world.group.position },
      radius: { value: radius }, ground: { value: world.radius },
      // The seven planets: a thin air rim from far away. Other worlds keep 0, the look of before.
      haloFar: world.look?.haloFar ?? { value: 0 },
    },
    vertexShader: `varying vec3 worldPosition;
      void main() {
        worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 tint; uniform vec3 nightTint; uniform vec3 twilightTint; uniform vec3 sunPosition;
      uniform vec3 center; uniform float radius; uniform float ground; uniform float haloFar;
      varying vec3 worldPosition;
      void main() {
        vec3 origin = cameraPosition - center;
        vec3 ray = normalize(worldPosition - cameraPosition);
        vec3 toSun = normalize(sunPosition - center);
        float b = dot(origin, ray);
        float hit = sqrt(max(0.0, b*b - dot(origin,origin) + radius*radius));
        float start = max(0.0, -b-hit);
        float end = max(0.0, -b+hit);
        float depth = 0.0;
        vec3 color = vec3(0.0);
        for (int i = 0; i < 12; i++) {
          float t = mix(start,end,(float(i)+0.5)/12.0);
          vec3 point = origin+ray*t;
          float height = max(0.0, length(point)-ground);
          float weight = exp(-height / ((radius-ground)*0.21)) * (end-start)/12.0;
          // Each sample is lit by its own position, so the terminator crosses the shell.
          float light = dot(normalize(point), toSun);
          float day = smoothstep(${sine(DAYLIGHT.dayStart)}, ${sine(DAYLIGHT.dayEnd)}, light);
          float twilight = (1.0 - smoothstep(0.0, ${sine(DAYLIGHT.twilightSpread)}, abs(light)))
            * smoothstep(${sine(DAYLIGHT.twilightFloor)}, ${sine(DAYLIGHT.twilightPeak)}, light);
          color += mix(mix(nightTint, tint, day), twilightTint, twilight * 0.55) * weight;
          depth += weight;
        }
        color /= max(depth, 0.0001);
        float alpha = 1.0-exp(-depth*0.028*mix(1.0, ${HALO_THIN.toFixed(2)}, haloFar));
        gl_FragColor = vec4(color, alpha * 0.96);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), material)
  mesh.renderOrder = -2
  world.group.add(mesh)
}

function buildClouds(world: World) {
  if (!world.cloudHeight) return
  if (world.kind === 'fairy') {
    buildCottonCandyClouds(world, homeCottageNormal())
    return
  }
  const random = seededRandom(world.seed + 914)
  const baseCount = world.kind === 'mars' ? 70 : world.gas || world.kind === 'venus' ? 1500 : 1050
  const count = Math.round(baseCount * (world.mobile ? 0.5 : 1))
  const looked = isLookedPlanet(world.kind) && world.look ? world.kind : null
  const material = new THREE.MeshStandardMaterial({
    color: world.kind === 'earth' ? 0xf6fafc : looked ? PLANET_LOOKS[looked].cloud : world.color,
    roughness: 1, transparent: true, opacity: world.kind === 'mars' ? (looked ? 0.25 : 0.2) : looked ? (world.kind === 'venus' ? 0.8 : 0.5) : 0.65,
    depthWrite: false,
  })
  if (looked) lookMaterial(material, looked, world.look!)
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material, count)
  // updatePlanetLooks() shows the puffs of the seven planets only inside their air.
  if (looked) mesh.name = 'cloud-puffs'
  const dummy = new THREE.Object3D()
  const up = new THREE.Vector3(0, 1, 0)
  const normal = new THREE.Vector3()
  let cluster = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < count; i++) {
    if (i % 7 === 0) {
      const y = random() * 2 - 1
      const angle = random() * Math.PI * 2
      cluster.set(Math.sqrt(1 - y*y) * Math.cos(angle), y, Math.sqrt(1 - y*y) * Math.sin(angle))
    }
    normal.copy(cluster).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.1)).normalize()
    dummy.position.copy(normal).multiplyScalar(world.radius + world.cloudHeight + random() * 8)
    dummy.quaternion.setFromUnitVectors(up, normal)
    dummy.scale.set(5 + random() * 9, 1.2 + random() * 2, 4 + random() * 7)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  world.clouds.add(mesh)
  if (world.kind === 'venus' && world.look) world.clouds.add(venusDeck(world, world.look, PLANET_LOOKS.venus.cloud))
}

function buildGasDeck(world: World) {
  const looked = isLookedPlanet(world.kind) && world.look ? world.kind : null
  // The painted map of src/planet-paint.ts. Without a renderer, the canvas deck below.
  const painted = looked ? paintedMap(looked, world.seed, world.mobile) : null
  if (looked && painted) {
    world.surface.add(new THREE.Mesh(
      new THREE.SphereGeometry(world.radius - 12, 128, 80),
      lookMaterial(new THREE.MeshStandardMaterial({ map: painted, roughness: 1 }), looked, world.look!, sunCentre, world.group.position),
    ))
    return
  }
  const width = 512, height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')!
  const pixels = ctx.createImageData(width, height)
  const noise = createNoise3D(seededRandom(world.seed))
  const color = new THREE.Color()
  const base = new THREE.Color(world.color)
  for (let y = 0; y < height; y++) {
    const lat = y / height * Math.PI
    for (let x = 0; x < width; x++) {
      const lon = x / width * Math.PI * 2
      const n = noise(Math.sin(lat)*Math.cos(lon)*5, Math.cos(lat)*5, Math.sin(lat)*Math.sin(lon)*5)
      const band = Math.sin(lat * 30 + n * 2.5)
      color.copy(base).multiplyScalar(0.65 + band * 0.15 + n * 0.1).convertLinearToSRGB()
      const i = (y * width + x) * 4
      pixels.data[i] = color.r * 255; pixels.data[i+1] = color.g * 255
      pixels.data[i+2] = color.b * 255; pixels.data[i+3] = 255
    }
  }
  ctx.putImageData(pixels, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  world.surface.add(new THREE.Mesh(
    new THREE.SphereGeometry(world.radius - 12, 128, 80),
    new THREE.MeshStandardMaterial({ map, roughness: 1 }),
  ))
}

function buildGround(world: World) {
  const earth = world.kind === 'earth'
  const fairy = world.kind === 'fairy'
  const living = earth || fairy
  // Small dwarf worlds need fewer triangles for the same detail per metre.
  const small = world.radius < 60
  const moon = world.kind === 'moon'
  const [width, height] = living ? [512, 256] : small || (moon && world.mobile) ? [96, 64] : moon ? [128, 96] : [256, 128]
  const geometry = new THREE.SphereGeometry(1, width, height)
  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const direction = new THREE.Vector3()
  const sand = new THREE.Color(fairy ? 0xf6d6c1 : 0xd5c395)
  // The grass has the colour of its zone: a climate belt of Earth or a garden of Blossom Haven.
  const fields = living ? createFields(world.seed) : null
  const stone = new THREE.Color(fairy ? 0xbca6d6 : 0x85817a), snow = new THREE.Color(0xdfe7e5)
  const color = new THREE.Color()
  // The bright salt spots of Occator crater on Ceres.
  const occator = new THREE.Vector3(0.35, 0.45, 0.82).normalize()
  const painter = world.look && (world.kind === 'mars' || world.kind === 'mercury') ? createGroundPainter(world.kind, world.seed) : null
  for (let i = 0; i < positions.count; i++) {
    direction.fromBufferAttribute(positions, i).normalize()
    const sample = world.sample(direction.x, direction.y, direction.z)
    positions.setXYZ(i, direction.x * (world.radius + sample.height), direction.y * (world.radius + sample.height), direction.z * (world.radius + sample.height))
    if (living) {
      if (sample.height < 0.7) color.copy(sand)
      else if (sample.height > (fairy ? 5.5 : 8.5)) color.copy(stone)
      else groundColour(GAME_LOOK[fairy ? 'fairy' : 'earth'], direction.x, direction.y, direction.z, sample, fields!, color)
      if (earth && (Math.abs(direction.y) > 0.9 || sample.height > 12)) color.copy(snow)
      color.multiplyScalar(0.87 + sample.detail * 0.22 + Math.max(0, sample.height) * 0.014)
    } else if (moon) moonGroundColor(direction, sample, color)
    else if (painter) painter(direction, sample, color)
    else if (world.kind === 'ceres' && direction.angleTo(occator) < 0.07) color.setHex(0xf1eee4)
    else color.setHex(world.kind === 'mars' ? 0xb87651 : world.kind === 'venus' ? 0xa28153 : world.kind === 'ceres' || world.kind === 'vesta' ? world.color : 0x918c85).multiplyScalar(0.9 + sample.detail * 0.2 + sample.height * 0.025)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  if (moon) {
    const { material, earthshine } = createMoonMaterial()
    world.earthshine = earthshine
    world.surface.add(new THREE.Mesh(geometry, material))
  } else {
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 })
    if (isLookedPlanet(world.kind) && world.look) lookMaterial(material, world.kind, world.look)
    world.surface.add(new THREE.Mesh(geometry, material))
  }

  if (living) {
    const material = new THREE.MeshStandardMaterial({ color: fairy ? 0x73c4c8 : 0x208dad, roughness: 0.32, metalness: 0.12 })
    // Small world-space ripples stay legible both by the shore and from orbit.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 waterPosition;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nwaterPosition = position;')
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 waterPosition;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float ripple = sin(waterPosition.x*2.8 + sin(waterPosition.z*1.9))*sin(waterPosition.z*3.1 + waterPosition.y*2.3);
          diffuseColor.rgb *= 0.95 + ripple*0.06;`)
    }
    const waterGeometry = new THREE.SphereGeometry(world.radius, 256, 160)
    world.surface.add(new THREE.Mesh(waterGeometry, material))
    const obstacles = new CreatureObstacles()
    buildFoliage(world, obstacles)
    if (fairy) {
      world.animate = buildCandyEcosystem(world)
      buildFlowerCottage(world)
      obstacles.add(homeCottageNormal(), world.radius, 12)
    }
    const anchor = fairy ? new THREE.Vector3(0, -1, -0.12).normalize() : meadowNormal(world)
    const populationSeed = fairy ? (Math.random() * 0xffffffff) >>> 0 : world.seed ^ 0x71ac
    world.creatures = createPopulation(world.group, geometry, waterGeometry, world.radius, fairy, obstacles, populationSeed, anchor, world.mobile ? 14 : 28, world.mobile)
  }
}

function buildFlowerCottage(world: World) {
  const cottage = new THREE.Group()
  cottage.name = 'flower-cottage'
  const normal = homeCottageNormal()
  cottage.position.copy(normal).multiplyScalar(surfaceRadius(world, normal))
  cottage.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
  const cream = new THREE.MeshStandardMaterial({ color: 0xffefd0, roughness: 0.9 })
  const pink = new THREE.MeshStandardMaterial({ color: 0xe66aa4, roughness: 0.8 })
  const petalMaterial = new THREE.MeshStandardMaterial({ color: 0xffa8cf, roughness: 0.8, side: THREE.DoubleSide })
  const gold = new THREE.MeshStandardMaterial({ color: 0xffdc8e, roughness: 0.7, emissive: 0xffb849, emissiveIntensity: 0.18 })
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0xffe8a0, emissive: 0xffc25a, emissiveIntensity: 0.05 })
  const body = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.7, 4.7, 24), cream)
  body.position.y = 2.2
  cottage.add(body)
  const petalGeometry = new THREE.SphereGeometry(1, 16, 10)
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2
    const petal = new THREE.Mesh(petalGeometry, petalMaterial)
    petal.position.set(Math.sin(angle) * 2.1, 4.8, Math.cos(angle) * 2.1)
    petal.scale.set(1.6, 0.65, 3)
    petal.rotation.y = angle
    cottage.add(petal)
  }
  const flowerCenter = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 12), gold)
  flowerCenter.position.y = 5.6
  flowerCenter.scale.y = 0.65
  cottage.add(flowerCenter)
  const door = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.2, 4, 12), pink)
  door.position.set(0, 1.45, 3.45)
  door.scale.z = 0.13
  cottage.add(door)
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), gold)
  knob.position.set(0.42, 1.45, 3.59)
  cottage.add(knob)
  for (const side of [-1, 1]) {
    const window = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 12), windowMaterial)
    window.name = 'cottage-window'
    window.position.set(side * 2.3, 2.7, 2.4)
    window.scale.z = 0.15
    window.rotation.y = side * 0.6
    cottage.add(window)
  }
  // Small flowers make a friendly garden without adding hundreds of draw calls.
  const garden = new THREE.InstancedMesh(petalGeometry, gold, 32)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 32; i++) {
    const angle = i / 32 * Math.PI * 2
    const radius = 7 + (i % 3) * 1.4
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius
    // Match the spherical clearing rather than hovering over a flat disk.
    const clearingRadius = world.radius + HOME_CLEARING_HEIGHT
    const y = Math.sqrt(clearingRadius ** 2 - radius ** 2) - clearingRadius
    dummy.position.set(x, y + 0.35, z)
    dummy.scale.set(0.55, 0.3, 0.55)
    dummy.updateMatrix()
    garden.setMatrixAt(i, dummy.matrix)
  }
  cottage.add(garden)
  world.surface.add(cottage)
}

export function regenerateWorld(world: World, seed = (Math.random() * 0xffffffff) >>> 0) {
  // Blossom Haven and the Moon keep one landscape: the Moon always shows Earth the same face.
  if (world.kind === 'sun' || ((world.kind === 'fairy' || world.kind === 'moon') && world.visit > 0)) return
  world.creatures?.dispose()
  world.creatures = undefined
  disposeGroup(world.surface)
  disposeGroup(world.clouds)
  world.seed = world.kind === 'fairy' ? HOME_SEED : world.kind === 'moon' ? MOON.seed : seed
  world.visit++
  world.sample = worldTerrain(world.kind, world.seed)
  if (world.gas) buildGasDeck(world)
  else buildGround(world)
  buildClouds(world)
}

/** `renderer` paints the maps of the seven planets. Without it, the giants keep their canvas decks. */
export function createWorlds(scene: THREE.Scene, mobile = false, renderer?: THREE.WebGLRenderer) {
  const worlds: World[] = []
  // Created first so every atmosphere shares the Sun's live position.
  const sun = new THREE.Group()
  sunCentre = sun.position
  setPlanetPainter(renderer ?? null)
  for (const [name, kind, baseRadius, baseOrbit, angle, color, baseAtmosphere, baseCloudHeight] of WORLD_DATA) {
    const radius = baseRadius * PROPORTIONS.size, orbit = baseOrbit * PROPORTIONS.spacing
    const atmosphere = baseAtmosphere * PROPORTIONS.size, cloudHeight = baseCloudHeight * PROPORTIONS.size
    const group = new THREE.Group(), surface = new THREE.Group(), clouds = new THREE.Group()
    group.position.set(Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit)
    group.add(surface, clouds)
    const look = isLookedPlanet(kind) ? PLANET_LOOKS[kind] : null
    const world: World = {
      name, kind, radius, atmosphere, cloudHeight, color, sky: new THREE.Color(look?.sky ?? color),
      group, surface, clouds, sample: worldTerrain(kind, 1),
      seed: 1, visit: 0, armed: kind !== 'earth', gas: isGasWorld(kind), mobile,
      look: look ? createLookState() : undefined,
    }
    if (look) {
      // The real axial tilt. src/main.ts sets rotation.y; with the Euler order XYZ the planet turns about its tilted axis.
      group.rotation.x = THREE.MathUtils.degToRad(look.obliquity)
      // Rings in the equator plane, made before the deck so Saturn's deck can take their shadow.
      if (kind === 'saturn' || kind === 'uranus') group.add(planetRings(kind, radius, world.look!))
    }
    regenerateWorld(world)
    addAtmosphere(world, sun.position)
    scene.add(group)
    worlds.push(world)
  }
  // The Moon orbits Earth, not the Sun (src/orbits.ts). It comes after Earth in Worlds.
  const earth = worlds.find(world => world.kind === 'earth')!
  const moonGroup = new THREE.Group(), moonSurface = new THREE.Group(), moonClouds = new THREE.Group()
  moonGroup.name = 'moon'
  const start = moonOffset(0)
  moonGroup.position.copy(earth.group.position).add(new THREE.Vector3(start.x, start.y, start.z))
  moonGroup.add(moonSurface, moonClouds)
  const moon: World = {
    name: 'Moon', kind: 'moon', radius: MOON.radius, atmosphere: 0, cloudHeight: 0,
    color: MOON.color, sky: new THREE.Color(MOON.color), group: moonGroup,
    surface: moonSurface, clouds: moonClouds, sample: createTerrain('moon', MOON.seed),
    seed: MOON.seed, visit: 0, armed: false, gas: false, mobile,
  }
  regenerateWorld(moon)
  scene.add(moonGroup)
  worlds.splice(worlds.indexOf(earth) + 1, 0, moon)

  const homeGroup = new THREE.Group(), homeSurface = new THREE.Group(), homeClouds = new THREE.Group()
  homeGroup.name = 'blossom-haven'
  // Start a real journey away from Earth; later hops can use the whole system.
  homeGroup.position.set(...HOME_START_POSITION)
  homeGroup.add(homeSurface, homeClouds)
  const home: World = {
    name: 'Blossom Haven', kind: 'fairy', radius: 110 * PROPORTIONS.size, atmosphere: 52 * PROPORTIONS.size, cloudHeight: 24 * PROPORTIONS.size,
    color: 0xf3acd1, sky: new THREE.Color(0xe7b6e8), group: homeGroup,
    surface: homeSurface, clouds: homeClouds, sample: createTerrain('fairy', HOME_SEED),
    seed: HOME_SEED, visit: 0, armed: false, gas: false, mobile,
  }
  regenerateWorld(home)
  addAtmosphere(home, sun.position)
  scene.add(homeGroup)
  worlds.push(home)

  // The living Sun of the Sun study (docs/sun-study.md): limb darkening, granules, sunspots, the corona and
  // prominences. A touch device gets the phone shader.
  const sunRadius = 600 * PROPORTIONS.sun
  const sunLook = createSunLook(sunRadius, sun.position, true, mobile)
  sun.add(sunLook.root)
  scene.add(sun)
  worlds.push({
    name: 'Sun', kind: 'sun', radius: sunRadius, atmosphere: 0, cloudHeight: 0,
    color: 0xffcf86, sky: new THREE.Color(0xffcf86), group: sun,
    surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain('mercury', 0),
    seed: 0, visit: 1, armed: false, gas: false, sunLook,
  })
  return worlds
}
