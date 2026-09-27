import * as THREE from 'three'
import { STAR_SKY_RADIUS } from '../stars'
import { starNames, webbImages } from '../star-data'
import {
  GALACTIC_CENTRE, GALACTIC_NORTH, angleBetween, byHr, bvColor, distanceToArc, findStar, offset, placeWebbPictures,
  raDec, resolvedPictures as resolvedFigures, skyStars, starPointSize, unitVector,
} from '../star-map'
import type { Placement, Vec3 } from '../star-map'
import { shownFigures } from './model'
import type { StudySettings } from './model'
import { createLegacySky } from './legacy-sky'

const R = STAR_SKY_RADIUS
export type Selection = { type: 'figure' | 'webb'; id: string } | null
export type View = { ra: number; dec: number; fov: number }

const vector = (v: Vec3, radius = R) => new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(radius)

/** Great-circle polyline from a to b as LineSegments vertices, like src/stars.ts. */
function arcVertices(a: Vec3, b: Vec3, radius: number, out: number[]) {
  const start = vector(a, 1), end = vector(b, 1)
  const steps = Math.max(2, Math.ceil(angleBetween(a, b) / 2))
  for (let step = 0; step < steps; step++) for (const t of [step / steps, (step + 1) / steps]) {
    out.push(...start.clone().lerp(end, t).normalize().multiplyScalar(radius).toArray())
  }
}

function circleVertices(centre: Vec3, degrees: number, radius: number) {
  const c = raDec(centre), ring: Vec3[] = []
  for (let i = 0; i <= 24; i++) {
    const bearing = i * 15 * Math.PI / 180, d = degrees * Math.PI / 180, lat = c.dec * Math.PI / 180
    const lat2 = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing))
    const lon2 = c.ra * Math.PI / 180 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(lat2))
    ring.push(unitVector(lon2 * 180 / Math.PI, lat2 * 180 / Math.PI))
  }
  const out: number[] = []
  for (let i = 1; i < ring.length; i++) out.push(...vector(ring[i - 1], radius).toArray(), ...vector(ring[i], radius).toArray())
  return out
}

export function createStarMapScene(host: HTMLElement, labelHost: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Star map prototype. Drag or use the arrow keys to look around. Scroll, pinch, or use plus and minus to zoom. Select a picture to learn about it.')
  host.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x02030f)
  const camera = new THREE.PerspectiveCamera(62, 1, 10, R * 2)
  const view: View = { ra: 84, dec: 4, fov: 62 }
  let target: View | null = null
  const resources: Array<{ dispose(): void }> = []

  // Baseline: the game sky before this change, frozen in legacy-sky.ts.
  const today = createLegacySky(scene)
  const todayStars = today.stars
  const todayPictures = today.pictures

  // Proposed: one draw call for every catalog star; size and colour per vertex.
  const positions: number[] = [], colours: number[] = [], sizes: number[] = [], magnitudes: number[] = []
  const colour = new THREE.Color()
  for (const star of skyStars) {
    positions.push(...vector(unitVector(star.ra, star.dec)).toArray())
    const [r, g, b] = bvColor(star.bv)
    colour.setRGB(r, g, b, THREE.SRGBColorSpace)
    colours.push(colour.r, colour.g, colour.b)
    sizes.push(starPointSize(star.magnitude)); magnitudes.push(star.magnitude)
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  starGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colours, 3))
  starGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
  starGeometry.setAttribute('aMagnitude', new THREE.Float32BufferAttribute(magnitudes, 1))
  const starMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uLimit: { value: 5.5 }, uScale: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aMagnitude;
      uniform float uLimit; uniform float uScale; varying vec3 vColor; varying float vAlpha;
      void main() {
        vColor = aColor;
        float fade = clamp((uLimit + 0.05 - aMagnitude) / 0.3, 0.0, 1.0);
        vAlpha = fade * mix(1.0, 0.6, clamp((aMagnitude - 2.0) / 3.5, 0.0, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = fade > 0.0 ? aSize * uScale : 0.0;
      }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = 1.0 - smoothstep(0.15, 0.5, d);
        float halo = pow(max(0.0, 1.0 - d), 1.5) * 0.6;
        gl_FragColor = vec4(vColor, (core + halo) * vAlpha);
        #include <colorspace_fragment>
      }`,
  })
  const realStars = new THREE.Points(starGeometry, starMaterial)
  realStars.name = 'catalog-stars'
  realStars.renderOrder = 1
  scene.add(realStars)
  resources.push(starGeometry, starMaterial)

  // Procedural Milky Way: a soft band around the galactic equator, brighter towards the centre.
  const milkyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uNorth: { value: vector(GALACTIC_NORTH, 1) }, uCentre: { value: vector(GALACTIC_CENTRE, 1) }, uStrength: { value: 0.11 } },
    vertexShader: `varying vec3 vDirection;
      void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDirection; uniform vec3 uNorth; uniform vec3 uCentre; uniform float uStrength;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 x) {
        vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec3 d = normalize(vDirection);
        float latitude = asin(clamp(dot(d, uNorth), -1.0, 1.0));
        float core = max(dot(d, uCentre), 0.0);
        float band = exp(-pow(latitude / (0.15 + 0.12 * core), 2.0));
        float rift = smoothstep(0.42, 0.72, fbm(d * 13.0 + 4.0)) * exp(-pow(latitude / 0.05, 2.0));
        float clouds = smoothstep(0.3, 0.78, fbm(d * 6.0));
        float glow = band * (0.2 + 0.8 * clouds) * (0.7 + 0.35 * pow(core, 3.0)) * (1.0 - 0.75 * rift);
        vec3 tint = mix(vec3(0.42, 0.47, 0.78), vec3(0.9, 0.78, 0.64), pow(core, 4.0));
        gl_FragColor = vec4(tint * glow * uStrength, 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const milkyGeometry = new THREE.SphereGeometry(R * 0.97, 96, 48)
  const milkyWay = new THREE.Mesh(milkyGeometry, milkyMaterial)
  milkyWay.renderOrder = 0
  scene.add(milkyWay)
  resources.push(milkyGeometry, milkyMaterial)

  // Figure lines: one LineSegments object per figure, so one can be highlighted.
  const figureLines = new Map<string, { lines: THREE.LineSegments; material: THREE.LineBasicMaterial; asterism: boolean }>()
  for (const figure of resolvedFigures) {
    const vertices: number[] = []
    for (const [a, b] of figure.segments) {
      const s = byHr.get(a)!, e = byHr.get(b)!
      arcVertices(unitVector(s.ra, s.dec), unitVector(e.ra, e.dec), R - 20, vertices)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    const material = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false })
    const lines = new THREE.LineSegments(geometry, material)
    lines.renderOrder = 2
    scene.add(lines)
    resources.push(geometry, material)
    figureLines.set(figure.id, { lines, material, asterism: figure.kind === 'asterism' })
  }

  // Webb pictures: soft-edged ellipses on the sky sphere, with a pointer to the true position.
  const loader = new THREE.TextureLoader()
  const postcardGeometry = new THREE.PlaneGeometry(1, 1)
  resources.push(postcardGeometry)
  const postcards = new Map<string, { mesh: THREE.Mesh; material: THREE.ShaderMaterial; aspect: number }>()
  const guides = new THREE.Group()
  guides.renderOrder = 3
  scene.add(guides)
  let placements: Placement[] = []
  function postcard(id: string) {
    const existing = postcards.get(id)
    if (existing) return existing
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { map: { value: null }, uOpacity: { value: 0 }, uSelected: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform sampler2D map; uniform float uOpacity; uniform float uSelected;
        void main() {
          float r = length((vUv - 0.5) * 2.0);
          float mask = smoothstep(1.0, 0.7, r);
          float ring = smoothstep(0.04, 0.0, abs(r - 0.96)) * uSelected;
          vec3 picture = texture2D(map, vUv).rgb;
          gl_FragColor = vec4(picture * mask + vec3(0.94, 0.78, 0.54) * ring, max(mask, ring) * uOpacity);
          #include <colorspace_fragment>
        }`,
    })
    const mesh = new THREE.Mesh(postcardGeometry, material)
    mesh.name = id
    mesh.renderOrder = 4
    scene.add(mesh)
    const entry = { mesh, material, aspect: 1 }
    postcards.set(id, entry)
    loader.load(`${import.meta.env.BASE_URL}sky/webb/${id}.jpg`, texture => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 4
      entry.aspect = texture.image.width / texture.image.height
      material.uniforms.map.value = texture
      material.uniforms.uOpacity.value = 1
      resources.push(texture)
      layoutPostcards()
    })
    resources.push(material)
    return entry
  }

  let settings: StudySettings | null = null
  let selection: Selection = null

  function layoutPostcards() {
    if (!settings) return
    for (const child of [...guides.children]) {
      guides.remove(child)
      const line = child as THREE.LineSegments
      line.geometry.dispose(); (line.material as THREE.Material).dispose()
    }
    for (const entry of postcards.values()) entry.mesh.visible = false
    if (!settings.webb) { placements = []; return }
    placements = placeWebbPictures(settings.postcardDegrees, settings.placement, shownFigures(settings))
    const size = 2 * R * Math.tan(settings.postcardDegrees / 2 * Math.PI / 180)
    for (const placement of placements) {
      const entry = postcard(placement.image.id)
      const selected = selection?.type === 'webb' && selection.id === placement.image.id
      entry.mesh.visible = entry.material.uniforms.map.value !== null
      entry.mesh.position.copy(vector(placement.centre, R - 60))
      entry.mesh.lookAt(0, 0, 0)
      entry.mesh.scale.set(entry.aspect >= 1 ? size : size * entry.aspect, entry.aspect >= 1 ? size / entry.aspect : size, 1)
      entry.material.uniforms.uSelected.value = selected ? 1 : 0
      const vertices = circleVertices(placement.anchor, 0.45, R - 40)
      if (placement.moved) arcVertices(placement.anchor, placement.centre, R - 40, vertices)
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      const guide = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: selected ? 0xefc88a : 0x9fb6d8, transparent: true, opacity: selected ? 0.9 : 0.45, depthWrite: false }))
      guide.renderOrder = 3
      guides.add(guide)
    }
  }

  // Labels are HTML, so they stay sharp; the chips below the preview give keyboard access.
  type Label = { element: HTMLSpanElement; direction: THREE.Vector3; kind: 'figure' | 'star' | 'webb'; id: string; edge?: THREE.Vector3 }
  const labels: Label[] = []
  function addLabel(kind: Label['kind'], id: string, text: string, direction: Vec3) {
    const element = document.createElement('span')
    element.className = `sky-label ${kind}`
    element.textContent = text
    labelHost.append(element)
    labels.push({ element, direction: vector(direction), kind, id })
  }
  for (const figure of resolvedFigures) addLabel('figure', figure.id, figure.name, figure.centre)
  for (const [key, name] of Object.entries(starNames)) {
    const star = findStar(key)!
    addLabel('star', key, name, unitVector(star.ra, star.dec))
  }
  for (const image of webbImages) addLabel('webb', image.id, image.title, unitVector(image.ra, image.dec))

  function apply(next: StudySettings) {
    settings = next
    const shown = new Set(shownFigures(next).map(figure => figure.id))
    const todayPicturesOnly = next.figures === 'today'
    for (const child of todayStars) child.visible = next.background === 'today'
    todayPictures.visible = todayPicturesOnly
    realStars.visible = next.background === 'real'
    starMaterial.uniforms.uLimit.value = next.limit
    milkyWay.visible = next.milkyWay
    for (const [id, entry] of figureLines) {
      const selected = selection?.type === 'figure' && selection.id === id
      entry.lines.visible = !todayPicturesOnly && shown.has(id)
      entry.material.color.setHex(selected ? 0xefc88a : entry.asterism ? 0xcfb6ff : 0xcbd7ff)
      entry.material.opacity = selected ? 0.95 : entry.asterism ? 0.26 : 0.36
    }
    for (const label of labels) label.element.dataset.enabled = String(label.kind === 'webb'
      ? next.webb
      : next.labels && !todayPicturesOnly && (label.kind === 'star' || shown.has(label.id)))
    layoutPostcards()
    for (const label of labels.filter(item => item.kind === 'webb')) {
      const placement = placements.find(item => item.image.id === label.id)
      if (!placement) continue
      label.direction.copy(vector(placement.centre))
      const { ra, dec } = raDec(placement.centre)
      label.edge = vector(offset(ra, dec, next.postcardDegrees / 2, 180))
    }
  }

  function select(next: Selection) {
    selection = next
    for (const label of labels) label.element.classList.toggle('selected', !!next && label.id === next.id)
    if (settings) apply(settings)
  }

  /** Turn to a direction; the extent in degrees sets a zoom that fits it. */
  function lookAt(direction: Vec3, extent?: number) {
    const { ra, dec } = raDec(direction)
    const fov = extent === undefined ? view.fov : THREE.MathUtils.clamp(extent * 2.6, 28, 82)
    target = { ra, dec: THREE.MathUtils.clamp(dec, -88, 88), fov }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { Object.assign(view, target); target = null }
  }

  function lookAtSelection(next: Selection) {
    if (!next) return
    if (next.type === 'figure') {
      const figure = resolvedFigures.find(item => item.id === next.id)!
      const extent = Math.max(...figure.hrPaths.flat().map(hr => { const s = byHr.get(hr)!; return angleBetween(figure.centre, unitVector(s.ra, s.dec)) }))
      lookAt(figure.centre, extent)
    } else {
      const placement = placements.find(item => item.image.id === next.id)
      if (placement) lookAt(placement.centre, (settings?.postcardDegrees ?? 6) * 1.6)
    }
  }

  // Look controls: drag, arrow keys, wheel and pinch. RA grows to the left, as on a real sky.
  const pointers = new Map<number, { x: number; y: number }>()
  let pressed: { x: number; y: number; moved: boolean } | null = null, pinch = 0
  const canvas = renderer.domElement
  const degreesPerPixel = () => view.fov / canvas.clientHeight
  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    pressed = { x: event.clientX, y: event.clientY, moved: pointers.size > 1 }
    target = null
  })
  canvas.addEventListener('pointermove', event => {
    const last = pointers.get(event.pointerId)
    if (!last) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch) view.fov = THREE.MathUtils.clamp(view.fov * pinch / distance, 20, 90)
      pinch = distance
      return
    }
    const dx = event.clientX - last.x, dy = event.clientY - last.y
    if (pressed && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 5) pressed.moved = true
    view.ra = (view.ra + dx * degreesPerPixel() + 360) % 360
    view.dec = THREE.MathUtils.clamp(view.dec + dy * degreesPerPixel(), -88, 88)
  })
  const release = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinch = 0
    if (pressed && !pressed.moved && pointers.size === 0) pick(event)
    if (pointers.size === 0) pressed = null
  }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); pressed = null; pinch = 0 })
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); target = null
    view.fov = THREE.MathUtils.clamp(view.fov * Math.exp(event.deltaY * 0.001), 20, 90)
  }, { passive: false })
  canvas.addEventListener('keydown', event => {
    const step = view.fov / 12
    const moves: Record<string, () => void> = {
      ArrowLeft: () => { view.ra = (view.ra + step + 360) % 360 }, ArrowRight: () => { view.ra = (view.ra - step + 360) % 360 },
      ArrowUp: () => { view.dec = Math.min(88, view.dec + step) }, ArrowDown: () => { view.dec = Math.max(-88, view.dec - step) },
      '+': () => { view.fov = Math.max(20, view.fov / 1.15) }, '=': () => { view.fov = Math.max(20, view.fov / 1.15) },
      '-': () => { view.fov = Math.min(90, view.fov * 1.15) },
    }
    if (moves[event.key]) { event.preventDefault(); target = null; moves[event.key]() }
  })

  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
  let onPick: (selection: Selection) => void = () => {}
  function pick(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    ndc.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const cards = [...postcards.values()].filter(entry => entry.mesh.visible).map(entry => entry.mesh)
    const hit = raycaster.intersectObjects(cards)[0]
    if (hit) return onPick({ type: 'webb', id: hit.object.name })
    if (!settings || settings.figures === 'today') return onPick(null)
    const d = raycaster.ray.direction, direction: Vec3 = [d.x, d.y, d.z]
    let best: { id: string; distance: number } | null = null
    for (const figure of shownFigures(settings)) for (const [a, b] of figure.segments) {
      const s = byHr.get(a)!, e = byHr.get(b)!
      const distance = distanceToArc(direction, unitVector(s.ra, s.dec), unitVector(e.ra, e.dec))
      if (!best || distance < best.distance) best = { id: figure.id, distance }
    }
    onPick(best && best.distance < view.fov / 28 ? { type: 'figure', id: best.id } : null)
  }

  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  let onView: (view: View) => void = () => {}
  const projected = new THREE.Vector3(), forward = new THREE.Vector3(), edge = new THREE.Vector3()
  let previous = performance.now(), frame = 0
  function render(now: number) {
    frame = requestAnimationFrame(render)
    const delta = Math.min((now - previous) / 1000, 0.1); previous = now
    if (document.hidden) return
    if (target) {
      const blend = 1 - Math.exp(-delta * 5)
      const dRa = ((target.ra - view.ra + 540) % 360) - 180
      view.ra = (view.ra + dRa * blend + 360) % 360
      view.dec += (target.dec - view.dec) * blend
      view.fov += (target.fov - view.fov) * blend
      if (Math.abs(dRa) < 0.05 && Math.abs(target.dec - view.dec) < 0.05 && Math.abs(target.fov - view.fov) < 0.05) target = null
    }
    if (camera.fov !== view.fov) { camera.fov = view.fov; camera.updateProjectionMatrix() }
    camera.lookAt(vector(unitVector(view.ra, view.dec)))
    camera.getWorldDirection(forward)
    const width = canvas.clientWidth, height = canvas.clientHeight
    for (const label of labels) {
      const enabled = label.element.dataset.enabled === 'true'
      projected.copy(label.direction).project(camera)
      const visible = enabled && label.direction.dot(forward) > 0 && Math.abs(projected.x) < 1.02 && Math.abs(projected.y) < 1.02
      label.element.hidden = !visible
      if (!visible) continue
      const x = (projected.x + 1) / 2 * width, y = (1 - projected.y) / 2 * height
      // A Webb label goes under its picture: drop it by the on-screen radius.
      let drop = 0
      if (label.edge) {
        edge.copy(label.edge).project(camera)
        drop = Math.hypot((edge.x - projected.x) / 2 * width, (edge.y - projected.y) / 2 * height)
      }
      label.element.style.transform = `translate(${x}px, ${y + drop}px)`
    }
    renderer.render(scene, camera)
    onView(view)
  }
  frame = requestAnimationFrame(render)

  return {
    canvas, apply, select, lookAt, lookAtSelection,
    get view() { return { ...view } },
    set onPick(callback: (selection: Selection) => void) { onPick = callback },
    set onView(callback: (view: View) => void) { onView = callback },
    dispose() {
      cancelAnimationFrame(frame); observer.disconnect(); today.dispose()
      for (const resource of resources) resource.dispose()
      renderer.dispose(); canvas.remove()
    },
  }
}
