import * as THREE from 'three'
import type { World } from '../../src/worlds'
import { foliageMaterial } from '../../src/foliage/build'
import { SPECIES } from '../../src/foliage/species'
import type { SpeciesId } from '../../src/foliage/species'
import { declination, EARTH_TILT, LOOK_LAG, PALETTE, SEASON_BAND, SNOW_LAPSE } from './model'

/**
 * The prototype of the seasons of Earth, on the real Earth of the game. It adds to the materials
 * that createWorlds() made: the ground, the water and the plants of src/foliage/. The season of a
 * fragment comes from its latitude and from three numbers, so a change of season is a change of
 * uniforms only: no new mesh and no new texture.
 *
 * It also leans the world on its axis (option A of the study) and adds petals, leaves and snow.
 * The magic seasons of Blossom Haven are in magic.ts. The game does not use this file.
 */
const RAD = Math.PI / 180
export const glsl = (hex: number) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})` }
/** A colour as a factor of the base colour, so the shade of each vertex stays. */
export const factor = (hex: number, base: number) => { const c = new THREE.Color(hex), b = new THREE.Color(base); return `vec3(${(c.r / b.r).toFixed(4)}, ${(c.g / b.g).toFixed(4)}, ${(c.b / b.b).toFixed(4)})` }
const sine = (degrees: number) => Math.sin(degrees * RAD).toFixed(4)

/** The plants of src/foliage/species.ts that lose their leaves. The pines, the palms and the cactus stay green. */
const LEAF_PLANTS: SpeciesId[] = ['oak', 'birch', 'bush']
const SMALL_PLANTS: SpeciesId[] = ['grass', 'flowers', 'fern', 'reeds']

const COMMON = /* glsl */`
uniform float seasonQ; uniform vec2 seasonDecl; uniform float seasonOn;
float seasonStrength(float sLat) { return smoothstep(${sine(SEASON_BAND.none)}, ${sine(SEASON_BAND.full)}, abs(sLat)); }
// The sine of the noon height of the Sun: warmth() of model.ts.
float seasonWarm(float sLat) { return sqrt(max(0.0, 1.0 - sLat * sLat)) * seasonDecl.y + sLat * seasonDecl.x; }
// The south is half a year after the north. The switch is at the equator, where the season is 0.
float seasonPhase(float sLat) { return fract(seasonQ + (sLat < 0.0 ? 0.5 : 0.0)); }
vec3 seasonRamp(float q, vec3 a, vec3 b, vec3 c, vec3 d) {
  float x = fract(q) * 4.0; float t = smoothstep(0.0, 1.0, fract(x));
  return x < 1.0 ? mix(a, b, t) : x < 2.0 ? mix(b, c, t) : x < 3.0 ? mix(c, d, t) : mix(d, a, t);
}
float seasonRamp(float q, vec4 v) {
  float x = fract(q) * 4.0; float t = smoothstep(0.0, 1.0, fract(x));
  return x < 1.0 ? mix(v.x, v.y, t) : x < 2.0 ? mix(v.y, v.z, t) : x < 3.0 ? mix(v.z, v.w, t) : mix(v.w, v.x, t);
}
`
/** The place of a plant: the translation of its instance matrix. A plant needs no new attribute. */
export const INSTANCE_PLACE = /* glsl */`
#ifdef USE_INSTANCING
  vec3 seasonPlace = instanceMatrix[3].xyz;
#else
  vec3 seasonPlace = position;
#endif
vSeasonDir = normalize(seasonPlace);
vSeasonHash = fract(sin(dot(floor(seasonPlace * 8.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);`

type Uniforms = Record<string, THREE.IUniform>
export type Patch = { key: string; vertexPars?: string; vertex?: string; fragment: string; roughness?: string; emissive?: string }

/** Adds a season change to a built-in material. It keeps each shader change that the material has. */
export function patch(material: THREE.Material, uniforms: Uniforms, common: string, change: Patch) {
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${common}\nvarying vec3 vSeasonDir;\n${change.vertexPars ?? ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${change.vertex ?? 'vSeasonDir = normalize(position);'}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${common}\nvarying vec3 vSeasonDir;\n${change.vertexPars?.replace(/attribute [^;]+;/g, '') ?? ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${change.fragment}`)
    if (change.roughness) shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${change.roughness}`)
    if (change.emissive) shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${change.emissive}`)
  }
  material.customProgramCacheKey = () => `${previousKey}|season-${change.key}`
  material.needsUpdate = true
}

/** Marks each ground vertex: grass or not, the height, the detail. `top` is the highest grass. */
export function markGround(world: World, top: number, polarSnow: boolean) {
  const ground = world.surface.children[0] as THREE.Mesh
  const positions = ground.geometry.attributes.position
  const info = new Float32Array(positions.count * 3), direction = new THREE.Vector3()
  for (let i = 0; i < positions.count; i++) {
    direction.fromBufferAttribute(positions, i).normalize()
    const sample = world.sample(direction.x, direction.y, direction.z)
    // The same limits as the grass of buildGround() in src/worlds.ts.
    const grass = sample.height >= 0.7 && sample.height <= top && !(polarSnow && Math.abs(direction.y) > 0.9)
    info.set([grass ? 1 : 0, sample.height, sample.detail], i * 3)
  }
  ground.geometry.setAttribute('seasonInfo', new THREE.BufferAttribute(info, 3))
  return ground
}

/**
 * Turns a world for a day of the year. The world stays in its place and its axis turns, which
 * gives the same Sun in the sky as an orbit with a fixed axis. `noonAt` (a local direction) keeps
 * that place at the hour `hour`; without it, `turn` is the spin angle.
 */
export function createPose(world: World, sunPosition: THREE.Vector3) {
  const up = new THREE.Vector3(0, 1, 0)
  const toSun = new THREE.Vector3(), north = new THREE.Vector3(), east = new THREE.Vector3(), axis = new THREE.Vector3()
  const lean = new THREE.Quaternion(), spin = new THREE.Quaternion(), sunLocal = new THREE.Vector3()
  return (year: number, tilt: number, noonAt?: THREE.Vector3, hour = 12, turn = 0) => {
    toSun.copy(sunPosition).sub(world.group.position).normalize()
    north.copy(up).addScaledVector(toSun, -up.dot(toSun)).normalize()
    east.crossVectors(north, toSun)
    const angle = year * Math.PI * 2
    axis.copy(north).multiplyScalar(Math.cos(tilt * RAD))
      .addScaledVector(toSun, Math.sin(tilt * RAD) * Math.sin(angle)).addScaledVector(east, Math.sin(tilt * RAD) * Math.cos(angle))
    lean.setFromUnitVectors(up, axis)
    if (noonAt) {
      sunLocal.copy(toSun).applyQuaternion(spin.copy(lean).invert())
      turn = Math.atan2(noonAt.z, noonAt.x) - Math.atan2(sunLocal.z, sunLocal.x) + (hour - 12) / 24 * Math.PI * 2
    }
    world.group.quaternion.copy(lean).multiply(spin.setFromAxisAngle(up, turn))
    world.group.updateMatrixWorld(true)
  }
}

export type Seasons = ReturnType<typeof createSeasons>

export function createSeasons(world: World, sunPosition: THREE.Vector3) {
  const uniforms = { seasonQ: { value: 0 }, seasonDecl: { value: new THREE.Vector2(0, 1) }, seasonOn: { value: 1 } }
  const snowAt = `(1.0 - smoothstep(${PALETTE.snowLine.low.toFixed(3)}, ${PALETTE.snowLine.high.toFixed(3)}, warm))`
  const tints = PALETTE.ground.map(colour => factor(colour, PALETTE.base)).join(', ')

  // ---- The ground: a mark for each vertex, then the season in the fragment.
  const ground = markGround(world, 8.5, true), water = world.surface.children[1] as THREE.Mesh
  patch(ground.material as THREE.Material, uniforms, COMMON, {
    key: 'earth-ground',
    vertexPars: 'attribute vec3 seasonInfo; varying vec3 vSeasonInfo;',
    vertex: 'vSeasonDir = normalize(position); vSeasonInfo = seasonInfo;',
    fragment: /* glsl */`{
      float sLat = vSeasonDir.y;
      float warm = seasonWarm(sLat) - max(vSeasonInfo.y, 0.0) * ${SNOW_LAPSE.toFixed(4)} + vSeasonInfo.z * 0.03;
      vec3 tint = seasonRamp(seasonPhase(sLat), ${tints});
      vec3 lived = mix(diffuseColor.rgb, diffuseColor.rgb * tint, seasonStrength(sLat) * vSeasonInfo.x);
      lived = mix(lived, ${glsl(PALETTE.snow)} * (0.92 + vSeasonInfo.z * 0.08), ${snowAt});
      diffuseColor.rgb = mix(diffuseColor.rgb, lived, seasonOn);
    }`,
  })

  // ---- The water: ice near a cold pole.
  patch(water.material as THREE.Material, uniforms, COMMON, {
    key: 'earth-water',
    fragment: /* glsl */`
      float seasonWobble = sin(vSeasonDir.x * 41.0 + vSeasonDir.z * 23.0) * sin(vSeasonDir.y * 37.0 + vSeasonDir.x * 17.0) * 0.02;
      float seasonIce = (1.0 - smoothstep(${PALETTE.iceLine.low.toFixed(3)}, ${PALETTE.iceLine.high.toFixed(3)}, seasonWarm(vSeasonDir.y) + seasonWobble)) * seasonOn;
      diffuseColor.rgb = mix(diffuseColor.rgb, ${glsl(PALETTE.ice)}, seasonIce);`,
    roughness: 'roughnessFactor = mix(roughnessFactor, 0.85, seasonIce);',
  })

  // ---- The plants of src/foliage/build.ts. The game gives all the plants of a world two materials.
  // The study gives each kind its own material, so each kind can have its own season.
  const tops = `${snowAt} * seasonOn * smoothstep(0.8, 2.2, vSeasonTop) * 0.9`
  for (const object of world.surface.children) {
    if (!(object instanceof THREE.InstancedMesh) || !object.name.startsWith('foliage-')) continue
    const kind = object.name.slice(8) as SpeciesId
    const material = foliageMaterial(SPECIES[kind].gloss, world.foliage!)
    object.material = material
    if (LEAF_PLANTS.includes(kind)) {
      // A leaf tree or a bush: blossom, then its own green, then autumn colours, then a thin bare crown.
      // aFoliage.x marks the leaves: the part that the game paints with the colour of the instance.
      patch(material, uniforms, COMMON, {
        key: 'earth-leaf',
        vertexPars: 'varying float vSeasonHash; varying float vSeasonTop; varying float vSeasonLeaf;',
        vertex: /* glsl */`${INSTANCE_PLACE}
          vSeasonTop = position.y; vSeasonLeaf = aFoliage.x;
          float seasonBare = seasonOn * seasonStrength(vSeasonDir.y) * seasonRamp(seasonPhase(vSeasonDir.y), vec4(0.0, 0.0, 0.1, 1.0));
          transformed.xz *= 1.0 - 0.7 * seasonBare * aFoliage.x;`,
        fragment: /* glsl */`{
          float sLat = vSeasonDir.y, strength = seasonStrength(sLat) * seasonOn;
          vec3 blossom = mix(${glsl(0x9fd060)}, ${glsl(0xf7b6cf)}, step(0.5, fract(vSeasonHash * 13.0)));
          vec3 autumn = mix(${glsl(0xe08a2a)}, ${glsl(0xc0432a)}, fract(vSeasonHash * 7.0));
          vec3 leaf = seasonRamp(seasonPhase(sLat), blossom, diffuseColor.rgb, autumn, ${glsl(0x6f5f4d)});
          diffuseColor.rgb = mix(diffuseColor.rgb, leaf, strength * vSeasonLeaf);
          float warm = seasonWarm(sLat);
          diffuseColor.rgb = mix(diffuseColor.rgb, ${glsl(PALETTE.snow)}, ${tops});
        }`,
      })
    } else if (SMALL_PLANTS.includes(kind)) {
      // Grass, ferns, reeds and flowers: the colour of the ground, and no plant under the snow.
      // The flowers are out in spring and in summer only.
      patch(material, uniforms, COMMON, {
        key: `earth-small-${kind === 'flowers'}`,
        vertexPars: 'varying float vSeasonHash;',
        vertex: /* glsl */`${INSTANCE_PLACE}
          { float warm = seasonWarm(vSeasonDir.y); transformed *= 1.0 - ${snowAt} * seasonOn;
            ${kind === 'flowers' ? 'transformed *= mix(1.0, seasonRamp(seasonPhase(vSeasonDir.y), vec4(1.0, 1.0, 0.15, 0.0)), seasonOn * seasonStrength(vSeasonDir.y));' : ''} }`,
        fragment: kind === 'flowers' ? '' : /* glsl */`{
          vec3 tint = seasonRamp(seasonPhase(vSeasonDir.y), ${tints});
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * tint, seasonStrength(vSeasonDir.y) * seasonOn);
        }`,
      })
    } else {
      // Pines, palms, cactus and rocks keep their colour. They get snow on their tops in the cold.
      patch(material, uniforms, COMMON, {
        key: 'earth-evergreen',
        vertexPars: 'varying float vSeasonHash; varying float vSeasonTop;',
        vertex: `${INSTANCE_PLACE}\nvSeasonTop = position.y;`,
        fragment: /* glsl */`{
          float warm = seasonWarm(vSeasonDir.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, ${glsl(PALETTE.snow)}, ${tops});
        }`,
      })
    }
  }

  return {
    world, uniforms,
    /** Option A leans the axis; option B and the game of today keep it straight. */
    pose: createPose(world, sunPosition),
    /** The look of a day of the year. `tilt` sets how far the snow line moves. */
    setLook(year: number, tilt = EARTH_TILT) {
      const sun = declination(year - LOOK_LAG, tilt) * RAD
      uniforms.seasonQ.value = year - LOOK_LAG
      uniforms.seasonDecl.value.set(Math.sin(sun), Math.cos(sun))
    },
    /** 0 is the game of today, 1 is the seasons. */
    setOn(value: number) { uniforms.seasonOn.value = value },
  }
}

/** The things in the air. Snow, leaves and petals are of Earth; the others are of Blossom Haven. */
export type Fall = 'snow' | 'leaf' | 'petal' | 'bubble' | 'firefly' | 'glitter'
/** `speed` is in metres in each second toward the ground; a bubble and a firefly go up. */
const FALLS: Record<Fall, { colour: number; size: number; speed: number; sway: number }> = {
  snow: { colour: 0xffffff, size: 0.34, speed: 2.4, sway: 0.5 },
  leaf: { colour: 0xff9838, size: 0.5, speed: 1.5, sway: 1.6 },
  petal: { colour: 0xffc4dc, size: 0.42, speed: 1.1, sway: 1.2 },
  bubble: { colour: 0xd8fff6, size: 0.6, speed: -1.3, sway: 0.9 },
  firefly: { colour: 0xfff2a0, size: 0.36, speed: -0.25, sway: 2.2 },
  glitter: { colour: 0xe4f1ff, size: 0.26, speed: 1.2, sway: 0.7 },
}

/** A soft white dot. Its edge fades to clear white, so it has no dark ring on a bright sky. */
function flakeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,1)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Points in a box around the camera. The box is in the frame of the world, so it turns with it. */
export function createWeather(world: World, count = 520) {
  const map = flakeTexture()
  const half = 24
  const positions = new Float32Array(count * 3)
  const seeds = Array.from({ length: count }, () => new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(half * 2))
  const phases = seeds.map(() => Math.random() * 20)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ size: 0.2, map, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  world.group.add(points)
  const eye = new THREE.Vector3(), down = new THREE.Vector3(), side = new THREE.Vector3(), point = new THREE.Vector3(), inverse = new THREE.Quaternion()
  const wrap = (value: number, centre: number) => centre + ((((value - centre + half) % (half * 2)) + half * 2) % (half * 2)) - half
  let shown = 0
  return {
    points,
    update(time: number, delta: number, camera: THREE.Vector3, fall: Fall | null, amount: number) {
      shown = THREE.MathUtils.lerp(shown, fall ? amount : 0, 1 - Math.exp(-Math.max(delta, 0.016) * 3))
      material.opacity = shown * 0.9
      points.visible = shown > 0.01
      if (!points.visible) return
      const kind = FALLS[fall ?? 'snow']
      if (fall) { material.color.setHex(kind.colour); material.size = kind.size }
      eye.copy(camera).sub(world.group.position).applyQuaternion(inverse.copy(world.group.quaternion).invert())
      down.copy(eye).normalize().negate()
      // Near a pole `down` is the Y axis, so the sway takes the X axis.
      if (side.set(down.z, 0, -down.x).lengthSq() < 0.01) side.set(1, 0, 0)
      side.normalize()
      for (let i = 0; i < count; i++) {
        point.copy(seeds[i]).addScaledVector(down, time * kind.speed * (0.7 + (i % 7) * 0.08))
          .addScaledVector(side, Math.sin(time * 1.3 + phases[i]) * kind.sway)
        point.set(wrap(point.x, eye.x), wrap(point.y, eye.y), wrap(point.z, eye.z))
        // A point less than 4 m from the camera is a large blob in the picture, so it goes out of view.
        if (point.distanceToSquared(eye) < 16) point.addScaledVector(down, -1000)
        positions[i * 3] = point.x; positions[i * 3 + 1] = point.y; positions[i * 3 + 2] = point.z
      }
      geometry.attributes.position.needsUpdate = true
    },
    dispose() { world.group.remove(points); geometry.dispose(); material.dispose(); map.dispose() },
  }
}
