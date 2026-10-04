import * as THREE from 'three'
import { lookColors } from '../customization'
import type { FairyLook } from '../customization'
import type { Design } from './designs'
import { paintDesign } from './paint'
import { rgb, tone } from './shapes'

/**
 * The wings of the fairy. Each panel is a square mesh with the two pictures of paint.ts and
 * the wing shader. The panels follow the four wing pivots of the rig, so pose() of
 * src/fairy.ts gives the wing beat. See docs/fairy-wing-study.md.
 */
export type Levers = { paint: boolean; lines: boolean; irid: boolean; glitter: boolean; glow: boolean; flex: boolean }
/** The game uses all the levers. The wing study turns them off one at a time. */
export const ALL_LEVERS: Levers = { paint: true, lines: true, irid: true, glitter: true, glow: true, flex: true }
export const NO_LEVERS: Levers = { paint: false, lines: false, irid: false, glitter: false, glow: false, flex: false }
export type WingStats = { panels: number; drawCalls: number; pictures: number; megabytes: number; ms: number }

const fragmentPars = /* glsl */`
uniform sampler2D uData;
uniform float uTime, uIrid, uGlitter, uGlow, uBack, uDeep;
float wingHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`

// After the map and the normal: the colour shift, the light through the wing, the own light and the glitter.
const fragmentMain = /* glsl */`
#include <emissivemap_fragment>
vec3 wingData = texture2D(uData, vMapUv).rgb;
float wingFacing = abs(dot(normal, normalize(vViewPosition)));
float wingGraze = 1.0 - wingFacing;
// The Sun of the game is bright, and it makes a pale colour white. A deeper colour keeps its hue.
diffuseColor.rgb = pow(diffuseColor.rgb, vec3(uDeep));
vec3 wingFilm = 0.5 + 0.5 * cos(6.2832 * (wingGraze * 1.6 + vMapUv.x * 0.9 + vMapUv.y * 0.6 + vec3(0.0, 0.33, 0.67)));
diffuseColor.rgb = mix(diffuseColor.rgb, wingFilm * 0.8, uIrid * wingData.b * (0.16 + 0.5 * wingGraze));
diffuseColor.a = min(1.0, diffuseColor.a * (1.0 + 0.7 * wingGraze * uIrid));
totalEmissiveRadiance += diffuseColor.rgb * uBack * 0.6;
totalEmissiveRadiance += diffuseColor.rgb * wingData.g * uGlow * (1.2 + 0.3 * sin(uTime * 1.7 + vMapUv.y * 9.0));
vec2 wingCell = floor(vMapUv * 70.0);
float wingSeed = wingHash(wingCell);
vec2 wingOffset = fract(vMapUv * 70.0) - 0.5 - (vec2(wingHash(wingCell + 3.1), wingHash(wingCell + 7.7)) - 0.5) * 0.5;
float wingSpark = smoothstep(0.3, 0.0, length(wingOffset)) * step(1.0 - wingData.r * uGlitter, wingHash(wingCell + 11.3));
wingSpark *= pow(max(0.0, sin(wingSeed * 40.0 + uTime * (1.5 + wingSeed * 3.0) + wingFacing * 16.0)), 6.0);
totalEmissiveRadiance += vec3(1.0, 0.97, 0.9) * wingSpark * 3.0;
diffuseColor.a = max(diffuseColor.a, wingSpark * step(0.02, diffuseColor.a));`

/** `pivots` are the four wing pivots of the rig: left upper, left lower, right upper, right lower. */
export function createFairyWings(body: THREE.Group, pivots: THREE.Object3D[]) {
  const group = new THREE.Group()
  group.name = 'wings-look'
  body.add(group)
  const shared = { uTime: { value: 0 }, uIrid: { value: 0 }, uGlitter: { value: 0 }, uGlow: { value: 0 }, uBack: { value: 0 }, uDeep: { value: 1 } }
  type Part = { pivot: THREE.Group; source: THREE.Object3D; mesh: THREE.Mesh; material: THREE.Material; lower: boolean; flex: { value: number } }
  let parts: Part[] = [], textures: THREE.Texture[] = []
  let fx = { irid: 0, glitter: 0, glow: 0, back: 0 }, levers = { ...ALL_LEVERS }
  let day = 1, shown = '', silhouette: THREE.MeshBasicMaterial | null = null

  function clear() {
    for (const part of parts) { part.mesh.geometry.dispose(); part.material.dispose() }
    textures.forEach(texture => texture.dispose())
    group.clear()
    parts = []; textures = []; shown = ''
  }

  /** Paints and shows a wing in the wing colour of the look. The same wing, colour and levers paint one time only. */
  function show(design: Design, look: FairyLook, nextLevers: Levers = ALL_LEVERS): WingStats {
    const key = `${design.id}|${look.wingColor}|${JSON.stringify(nextLevers)}`
    group.visible = true
    const stats = (ms: number): WingStats => ({ panels: design.panels.length, drawCalls: design.panels.length * 2, pictures: design.panels.length * 2, megabytes: Math.round(design.panels.length * 2 * 512 * 512 * 4 * 4 / 3 / 1048576 * 10) / 10, ms })
    if (key === shown) return stats(0)
    clear()
    shown = key
    levers = { ...nextLevers }
    fx = design.fx
    // With no document (a test in Node.js), the wing has no picture and no mesh.
    if (typeof document === 'undefined') return stats(0)
    const started = performance.now()
    const colours = lookColors(look)
    // The wing colours of the menu are pale. A painted wing needs a deeper shade of the same hue.
    const wing = levers.paint ? tone(rgb(colours.wings), -0.16, 0.25) : rgb(colours.wings)
    paintDesign(design, { wing, sparkle: rgb(colours.sparkle) }, levers).forEach((picture, index) => {
      const map = new THREE.CanvasTexture(picture.colour), data = new THREE.CanvasTexture(picture.data)
      map.colorSpace = THREE.SRGBColorSpace
      map.anisotropy = data.anisotropy = 4
      textures.push(map, data)
      const geometry = new THREE.PlaneGeometry(picture.box.side, picture.box.side, 10, 10)
      geometry.translate(picture.box.x + picture.box.side / 2, picture.box.y + picture.box.side / 2, 0)
      const lower = !!design.panels[index].lower
      for (const [sideIndex, side] of [-1, 1].entries()) {
        const flex = { value: 0 }
        const material = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.35 })
        material.onBeforeCompile = shader => {
          Object.assign(shader.uniforms, shared, { uData: { value: data }, uFlex: flex })
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nuniform float uFlex;')
            // The tip of the wing is late in each beat: the bend grows with the square of the distance from the root.
            .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += uFlex * dot( position.xy, position.xy );')
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\n${fragmentPars}`)
            .replace('#include <emissivemap_fragment>', fragmentMain)
        }
        material.customProgramCacheKey = () => 'fairy-wing'
        const source = pivots[sideIndex * 2 + Number(lower)]
        const pivot = new THREE.Group(), leaf = new THREE.Group()
        pivot.position.copy(source.position)
        leaf.scale.x = side
        const mesh = new THREE.Mesh(geometry, material)
        // The lower panels draw first, so an upper panel is over a lower panel where they overlap.
        mesh.renderOrder = 2 + (lower ? 0 : 1) + index * 0.1
        leaf.add(mesh)
        pivot.add(leaf)
        group.add(pivot)
        parts.push({ pivot, source, mesh, material, lower, flex })
      }
    })
    if (silhouette) setSilhouette(silhouette)
    update(0, 0, 0)
    return stats(Math.round(performance.now() - started))
  }

  /**
   * Call after the pose of the wing pivots. `upper` and `lower` are the speed of the wing
   * beat of the two pairs of pivots, in radians for each second: the tip bends against it.
   */
  function update(time: number, upper: number, lower: number) {
    shared.uTime.value = time
    shared.uDeep.value = levers.paint ? 1.4 : 1
    shared.uIrid.value = levers.irid ? fx.irid : 0
    shared.uGlitter.value = levers.glitter ? fx.glitter : 0
    shared.uGlow.value = levers.glow ? fx.glow : 0
    // The light through the wing needs the Sun. With the lever off, the wing keeps the small own light of the wings of before.
    shared.uBack.value = levers.glow ? fx.back * THREE.MathUtils.lerp(0.22, 1, day) : 0.12
    for (const part of parts) {
      part.pivot.quaternion.copy(part.source.quaternion)
      part.pivot.scale.copy(part.source.scale)
      part.flex.value = levers.flex ? THREE.MathUtils.clamp((part.lower ? lower : upper) * 0.011, -0.12, 0.12) : 0
    }
  }

  /** A plain shape in one colour, for the pose studies. The outline comes from the picture. */
  function setSilhouette(material: THREE.MeshBasicMaterial | null) {
    for (const part of parts) {
      if (!material) { part.mesh.material = part.material; continue }
      const flat = material.clone()
      flat.map = (part.material as THREE.MeshStandardMaterial).map
      flat.alphaTest = 0.4
      flat.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', 'diffuseColor.a *= texture2D( map, vMapUv ).a;') }
      part.mesh.material = flat
    }
    silhouette = material
  }

  return {
    group, show, update, setSilhouette, dispose: clear,
    /** The daylight from 0 to 1, for the light through the wing. */
    setDaylight(value: number) { day = value },
    /** Hides the wing, for a study that shows the wings of before. */
    hide() { group.visible = false },
  }
}
