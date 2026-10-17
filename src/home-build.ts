import * as THREE from 'three'
import { HOME_CLEARING_HEIGHT } from './terrain'
import { colorOf, createHomeBuilder, HOME_COLORS, homeLook, OPTIONS, PART_IDS, PART_NAMES, saveHomeLook, setHomeLook, surpriseLook } from './home'
import type { ColorId, HomeLook, PartId } from './home'
import type { World } from './worlds'

/**
 * Build mode (docs/fairy-home-study.md): near her cottage, the fairy changes the roof, the walls,
 * the door and the yard of her home, and gives each part one of twelve colours. The flight waits,
 * the camera turns slowly around the home (a drag turns it), and each change saves at once.
 *
 * src/main.ts owns the flight and the camera. It asks this module whether the Build button shows
 * (`update()`), opens and closes the mode, and gives the camera to `cameraPose()` while it is open.
 */
export type HomeBuildOptions = {
  /** The panel `#home-builder` and the button `#build-home` of src/main.ts. */
  panel: HTMLElement
  button: HTMLButtonElement
  canvas: HTMLCanvasElement
  scene: THREE.Scene
  home: World
  sparkle: THREE.Texture
  reducedMotion: MediaQueryList
  /** A soft chime when the sound is on. */
  chime: (notes: number[]) => void
  /** src/main.ts stops the flight and gives the camera, or takes them back. */
  onOpen: (open: boolean) => void
}

/** The Build button shows when the fairy is this near the cottage, in metres. */
export const BUILD_REACH = 25
/** The camera of build mode: the distance and the height over the ground, in metres. */
const ORBIT = { distance: 19, height: 6, look: 2.6, turn: 0.06 }
/** The intensity of the soft light of build mode. */
const BUILD_LIGHT = 1.4

export function createHomeBuild(options: HomeBuildOptions) {
  const { panel, button, canvas, home } = options
  let open = false, tab: PartId = 'roof', near = false
  let builder: ReturnType<typeof createHomeBuilder> | null = null
  let clock = 0, angle = 0, pitch = 0, zoom = 1, dragging = false, lastX = 0, lastY = 0
  const effects = createEffects(options.scene, options.sparkle, point => point.clone().sub(home.group.position).normalize())
  const content = panel.querySelector<HTMLElement>('[data-home-content]')!
  const note = panel.querySelector<HTMLElement>('.customizer-note')!

  /** The frame of the home in the world: its ground point, its up, its front and its side. */
  function frame() {
    const group = home.surface.getObjectByName('flower-cottage')!
    group.updateWorldMatrix(true, false)
    const basis = new THREE.Matrix3().setFromMatrix4(group.matrixWorld)
    return {
      centre: new THREE.Vector3().setFromMatrixPosition(group.matrixWorld),
      up: new THREE.Vector3(0, 1, 0).applyMatrix3(basis).normalize(),
      front: new THREE.Vector3(0, 0, 1).applyMatrix3(basis).normalize(),
      side: new THREE.Vector3(1, 0, 0).applyMatrix3(basis).normalize(),
    }
  }

  function render() {
    const look = homeLook()
    const pictures = (part: PartId, id: string) => `${import.meta.env.BASE_URL}home/${part}-${id}.jpg`
    content.innerHTML = `
      <div class="home-tabs" role="tablist" aria-label="Part of the home">${PART_IDS.map(id => `<button type="button" role="tab" data-home-tab="${id}" aria-selected="${id === tab}">${PART_NAMES[id]}</button>`).join('')}</div>
      <fieldset class="customizer-group" aria-label="${PART_NAMES[tab]}">
        <legend>${PART_NAMES[tab]}</legend>
        <div class="option-grid home-options">${(OPTIONS[tab] as readonly { id: string; label: string }[]).map(option => `
          <button type="button" data-home-option="${option.id}" aria-pressed="${look[tab] === option.id}"><img src="${pictures(tab, option.id)}" alt="" loading="lazy"><span>${option.label}</span></button>`).join('')}</div>
        <div class="swatch-grid home-swatches" role="group" aria-label="Colour of the ${PART_NAMES[tab].toLowerCase()}">${HOME_COLORS.map(color => `
          <button type="button" class="swatch" data-home-color="${color.id}" aria-pressed="${look.colors[tab] === color.id}" aria-label="${color.label}" title="${color.label}" style="--swatch:#${color.color.toString(16).padStart(6, '0')}"><i aria-hidden="true"></i></button>`).join('')}</div>
      </fieldset>`
  }

  /** Keeps the focus on the button with the same data after a new render. */
  function refocus(selector: string) { content.querySelector<HTMLElement>(selector)?.focus() }
  content.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button')
    if (!target || !builder) return
    if (target.dataset.homeTab) {
      tab = target.dataset.homeTab as PartId
      render(); refocus(`[data-home-tab="${tab}"]`)
    } else if (target.dataset.homeOption) {
      change(builder.set(tab, target.dataset.homeOption), colorOf(builder.look.colors[tab]))
      render(); refocus(`[data-home-option="${target.dataset.homeOption}"]`)
    } else if (target.dataset.homeColor) {
      const color = target.dataset.homeColor as ColorId
      builder.paint(tab, color)
      save(builder.look)
      if (!options.reducedMotion.matches) effects.puff(new THREE.Box3().setFromObject(builder.parts[tab]).getCenter(new THREE.Vector3()), 1.6, colorOf(color), clock)
      options.chime([987.77])
      render(); refocus(`[data-home-color="${color}"]`)
    }
  })
  panel.querySelector('#home-surprise')!.addEventListener('click', () => {
    if (!builder) return
    builder.apply(surpriseLook(Math.random, builder.look))
    change(Object.values(builder.parts), colorOf(builder.look.colors.roof), 1.2)
    render()
  })

  /** A new part pops in with a small bounce and a puff of petals in its colour; reduced motion changes it at once. */
  function change(groups: THREE.Object3D[], color: number, size = 1) {
    save(builder!.look)
    options.chime([783.99, 1046.5])
    if (!options.reducedMotion.matches) effects.pop(groups, clock, color, size)
  }
  function save(look: HomeLook) {
    setHomeLook(look)
    let store: Storage | undefined
    try { store = globalThis.localStorage } catch { store = undefined }
    note.textContent = saveHomeLook(look, store) ? 'Changes are saved automatically' : 'Your home stays for this visit'
  }

  // ---- The camera ---------------------------------------------------------------------------------
  const down = (event: PointerEvent) => { if (!open) return; dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId) }
  const move = (event: PointerEvent) => {
    if (!dragging) return
    angle -= (event.clientX - lastX) * 0.008
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastY) * 0.003, -0.25, 0.8)
    lastX = event.clientX; lastY = event.clientY
  }
  const up = () => { dragging = false }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)
  canvas.addEventListener('wheel', event => { if (!open) return; event.preventDefault(); zoom = THREE.MathUtils.clamp(zoom * (event.deltaY > 0 ? 1.08 : 0.92), 0.6, 1.5) }, { passive: false })
  const eye = new THREE.Vector3(), target = new THREE.Vector3(), upGoal = new THREE.Vector3(), look = new THREE.Vector3()
  // The cottage is at the south pole, where the Sun stays low (docs/fairy-home-study.md, finding 6).
  // A soft light from the camera lets the colours show as she picks them. It fades in and out with build mode.
  const buildLight = new THREE.DirectionalLight(0xfff2e2, 0)
  buildLight.visible = false
  options.scene.add(buildLight, buildLight.target)
  let lightLevel = 0

  function setOpen(next: boolean, fairy?: THREE.Vector3) {
    if (next === open) return
    open = next
    if (open) {
      // A new builder each time: a new size of Blossom Haven builds a new home group.
      builder = createHomeBuilder(home.surface, home.radius + HOME_CLEARING_HEIGHT, homeLook())
      // The camera starts on the side of the home where the fairy is.
      const f = frame()
      const toFairy = (fairy ?? f.centre.clone().addScaledVector(f.front, 10)).clone().sub(f.centre)
      angle = Math.atan2(toFairy.dot(f.side), toFairy.dot(f.front)) - 0.35
      pitch = 0; zoom = 1
      render()
    } else {
      dragging = false
      effects.clear()
      if (builder) for (const part of Object.values(builder.parts)) part.scale.setScalar(1)
      builder = null
    }
    panel.classList.toggle('is-open', open)
    panel.setAttribute('aria-hidden', String(!open))
    button.hidden = open || !near
    options.onOpen(open)
  }

  return {
    get open() { return open },
    get near() { return near },
    get look() { return homeLook() },
    /** Opens build mode. `fairy` is her place, so the camera starts on her side of the home. */
    openAt(fairy: THREE.Vector3) { setOpen(true, fairy) },
    close() { setOpen(false) },
    /**
     * Each frame: `allowed` is false behind a menu or a pause, and before the start. The button shows
     * when she is near the cottage; in build mode the camera turns slowly and the changes play.
     */
    update(rawDelta: number, fairy: THREE.Vector3, allowed: boolean) {
      clock += rawDelta
      const centre = home.surface.getObjectByName('flower-cottage')?.getWorldPosition(look)
      near = allowed && !!centre && fairy.distanceTo(centre) < BUILD_REACH
      button.hidden = open || !near
      if (open && !dragging && !options.reducedMotion.matches) angle += rawDelta * ORBIT.turn
      lightLevel += ((open ? 1 : 0) - lightLevel) * (1 - Math.exp(-rawDelta * 4))
      buildLight.intensity = BUILD_LIGHT * lightLevel
      buildLight.visible = lightLevel > 0.01
      effects.update(clock)
    },
    /** The camera of build mode, eased from where it is. The fog of the air stays as in flight. */
    cameraPose(camera: THREE.PerspectiveCamera, delta: number) {
      const f = frame()
      const across = f.front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(f.side, Math.sin(angle))
      // A narrow screen (a phone held upright) sees less to the sides: the camera goes back, so the yard shows too.
      const far = zoom * (camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.3 : 1)
      eye.copy(f.centre).addScaledVector(across, ORBIT.distance * far).addScaledVector(f.up, (ORBIT.height + pitch * 10) * far)
      target.copy(f.centre).addScaledVector(f.up, ORBIT.look)
      const k = 1 - Math.exp(-delta * 4)
      camera.position.lerp(eye, k)
      camera.up.lerp(upGoal.copy(f.up), k).normalize()
      camera.lookAt(target)
      buildLight.position.copy(camera.position)
      buildLight.target.position.copy(target)
    },
  }
}

/** The pop of a new part and the puffs of petals. Their clock is the clock of the frames, so they play while the flight waits. */
function createEffects(scene: THREE.Scene, texture: THREE.Texture, upAt: (point: THREE.Vector3) => THREE.Vector3) {
  const pops: { group: THREE.Object3D; start: number }[] = []
  const COUNT = 220, LIFE = 1.3
  const positions = new Float32Array(COUNT * 3), colors = new Float32Array(COUNT * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setDrawRange(0, 0)
  const material = new THREE.PointsMaterial({ size: 0.42, map: texture, vertexColors: true, transparent: true, depthWrite: false })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 4
  scene.add(points)
  type Petal = { from: THREE.Vector3; way: THREE.Vector3; down: THREE.Vector3; start: number; color: THREE.Color }
  let petals: Petal[] = []
  const white = new THREE.Color(0xffffff), tint = new THREE.Color(), at = new THREE.Vector3()
  /** The bounce: from small to a little over its size and back, in 0.5 s. */
  const bounce = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2)
  function puff(centre: THREE.Vector3, radius: number, color: number, start: number) {
    // The up of the puff is the up of the ground under it.
    const up = upAt(centre)
    const base = new THREE.Color(color)
    for (let i = 0; i < 44; i++) {
      const way = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      way.addScaledVector(up, Math.abs(way.dot(up)) + 0.4).normalize().multiplyScalar(radius * (0.7 + Math.random() * 0.8))
      petals.push({ from: centre.clone(), way, down: up.clone().multiplyScalar(-0.9), start: start + Math.random() * 0.08, color: base.clone().lerp(white, Math.random() * 0.45) })
    }
    if (petals.length > COUNT) petals = petals.slice(-COUNT)
  }
  return {
    pop(groups: THREE.Object3D[], start: number, color: number, size = 1) {
      for (const group of groups) { pops.push({ group, start }); group.scale.setScalar(0.01) }
      const box = new THREE.Box3().setFromObject(groups[0])
      puff(box.getCenter(new THREE.Vector3()), Math.max(1.2, box.getSize(new THREE.Vector3()).length() * 0.3) * size, color, start)
    },
    puff,
    update(clock: number) {
      for (let i = pops.length - 1; i >= 0; i--) {
        const k = Math.min(1, (clock - pops[i].start) / 0.5)
        pops[i].group.scale.setScalar(Math.max(0.01, bounce(k)))
        if (k >= 1) { pops[i].group.scale.setScalar(1); pops.splice(i, 1) }
      }
      if (!petals.length) { geometry.setDrawRange(0, 0); return }
      let n = 0
      petals = petals.filter(petal => clock - petal.start <= LIFE)
      for (const petal of petals) {
        const age = (clock - petal.start) / LIFE
        if (age < 0) continue
        at.copy(petal.from).addScaledVector(petal.way, 1 - Math.pow(1 - age, 3)).addScaledVector(petal.down, age * age)
        positions.set([at.x, at.y, at.z], n * 3)
        tint.copy(petal.color).multiplyScalar(1 - age * age)
        colors.set([tint.r, tint.g, tint.b], n * 3)
        n++
      }
      geometry.setDrawRange(0, n)
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true
    },
    clear() { petals = []; pops.length = 0; geometry.setDrawRange(0, 0) },
  }
}
