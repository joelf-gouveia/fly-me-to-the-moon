import * as THREE from 'three'
import type { Feature, Lab } from '../../feature-ideas-study/lab'
import { colorOf, DOORS, HOME_COLORS, OPTIONS, PART_IDS, PART_NAMES, ROOFS, TODAY, WALLS, YARDS } from '../parts'
import type { ColorId, HomeLook, PartId } from '../parts'
import { HOMES, SHEET } from '../homes'
import { createCaption, createLayer, createSteps, createTag, homeFrame, homeOf, hoverFairy, keepHome, lightHome, mixOrbit, orbitPose, ramp, setPose, smooth } from './kit'
import type { Orbit, Step } from './kit'

/**
 * The clips of the fairy home study. Each one runs in the lab of the feature ideas study
 * (studies/feature-ideas-study/lab.ts), with the real worlds of the game, and puts the home of
 * parts.ts in place of the cottage of today. The cottage of the game is at the south pole of
 * Blossom Haven, where the Sun stays low. Each clip turns the planet so that the Sun is 38° over
 * the home: the colours of the parts show better. The game does not turn it.
 */
const look = (change: Partial<Omit<HomeLook, 'colors'>> & { colors?: Partial<HomeLook['colors']> }): HomeLook => ({ ...structuredClone(TODAY), ...change, colors: { ...TODAY.colors, ...change.colors } })
/** The hover place of the fairy in the clips: in front of the home, to the right, at the height of the door. */
const FAIRY_AT: [number, number, number] = [5.2, 2.3, 7.6]

/** The fairy hovers near the home and looks at it, so the size of the home shows. */
function fairyNearHome(lab: Lab, at = FAIRY_AT) {
  const frame = homeFrame(lab)
  hoverFairy(lab, frame.at(...at), frame.at(0, 2.2, 0))
}

/**
 * A show of one part: the camera turns slowly around the home, and the part changes to each of
 * its options, one each `every` seconds. The tag names the option.
 */
function partShow(id: string, part: PartId, start: HomeLook, orbit: [Orbit, Orbit], every: number, captionText: string): Feature {
  const options = OPTIONS[part]
  return {
    id,
    create(lab) {
      const restore = keepHome(lab)
      homeOf(lab)
      lightHome(lab)
      const frame = homeFrame(lab)
      const first = look({ ...start, [part]: options[0].id, colors: { ...start.colors, [part]: options[0].color } })
      const steps: Step[] = options.map((option, index) => index === 0
        ? { t: 0, tag: `${PART_NAMES[part].toUpperCase()} · ${option.label.toUpperCase()}` }
        : { t: 0.6 + index * every, set: [part, option.id] as [PartId, string], tag: `${PART_NAMES[part].toUpperCase()} · ${option.label.toUpperCase()}` })
      const show = createSteps(lab, first, steps)
      fairyNearHome(lab)
      const duration = 0.6 + options.length * every + 0.4
      lab.setShot((camera, t) => setPose(camera, orbitPose(frame, mixOrbit(orbit[0], orbit[1], smooth(ramp(t, 0, duration))))))
      const { layer, fit } = createLayer(lab)
      const tag = createTag(layer)
      const caption = createCaption(layer, [[0.2, duration, captionText]])
      return {
        duration, still: 0.6 + every * 1.5,
        update(t) {
          fit()
          show.update(t, lab.camera)
          tag(show.tag)
          caption(t)
        },
        dispose() { show.dispose(); layer.remove(); restore() },
      }
    },
  }
}

/** C: one home, and each part gets new colours. A row of swatches shows the colour of the part. */
const colours: Feature = {
  id: 'C',
  create(lab) {
    const restore = keepHome(lab)
    homeOf(lab)
    lightHome(lab)
    const frame = homeFrame(lab)
    const start = look({ roof: 'toadstool', walls: 'stump', door: 'round', yard: 'fairyRing', colors: { roof: 'cherry', walls: 'cocoa', door: 'berry', yard: 'cherry' } })
    const plan: [PartId, ColorId[]][] = [['roof', ['lilac', 'sky', 'honey']], ['walls', ['cream', 'mint']], ['door', ['fern', 'periwinkle']], ['yard', ['honey', 'sky']]]
    const steps: Step[] = []
    let t = 1.2
    for (const [part, list] of plan) for (const color of list) { steps.push({ t, paint: [part, color], tag: `${part}:${color}` }); t += 1.15 }
    const duration = t + 0.6
    const show = createSteps(lab, start, steps)
    fairyNearHome(lab)
    lab.setShot((camera, time) => setPose(camera, orbitPose(frame, mixOrbit({ angle: -0.35, distance: 19, height: 5.5, look: 2.6, shift: 1.9 }, { angle: 0.25, distance: 18, height: 5, look: 2.6, shift: 1.9 }, smooth(ramp(time, 0, duration))))))
    const { layer, fit } = createLayer(lab)
    const caption = createCaption(layer, [[0.2, duration, '<b>C · Colours</b> One colour for each part, from twelve colours']])
    // The swatch panel: the four parts, each with the twelve colours. The colour of the part has a ring.
    const panel = document.createElement('div')
    panel.className = 'fh-swatches'
    panel.innerHTML = PART_IDS.map(part => `<div data-part="${part}"><span>${PART_NAMES[part]}</span><p>${HOME_COLORS.map(color => `<i data-color="${color.id}" style="background:#${color.color.toString(16).padStart(6, '0')}"></i>`).join('')}</p></div>`).join('')
    layer.append(panel)
    return {
      duration, still: 3.6,
      update(time) {
        fit()
        show.update(time, lab.camera)
        const colorsNow = show.builder.look.colors
        const active = show.tag?.split(':')[0]
        panel.querySelectorAll<HTMLElement>('[data-part]').forEach(row => {
          row.classList.toggle('is-active', row.dataset.part === active)
          row.querySelectorAll<HTMLElement>('i').forEach(dot => dot.classList.toggle('is-on', dot.dataset.color === colorsNow[row.dataset.part as PartId]))
        })
        caption(time)
      },
      dispose() { show.dispose(); layer.remove(); restore() },
    }
  },
}

/** G: the eight homes of homes.ts, one after another, while the camera turns. */
const gallery: Feature = {
  id: 'G',
  create(lab) {
    const restore = keepHome(lab)
    homeOf(lab)
    lightHome(lab)
    const frame = homeFrame(lab)
    const every = 2.2
    const steps: Step[] = HOMES.map((home, index) => ({ t: index === 0 ? 0 : 0.4 + index * every, look: home.look, tag: home.name.toUpperCase(), quiet: index === 0 }))
    const show = createSteps(lab, HOMES[0].look, steps)
    fairyNearHome(lab)
    const duration = 0.4 + HOMES.length * every + 0.3
    lab.setShot((camera, t) => setPose(camera, orbitPose(frame, { angle: -0.7 + t * 0.075, distance: 20, height: 6.5, look: 2.4 })))
    const { layer, fit } = createLayer(lab)
    const tag = createTag(layer)
    const caption = createCaption(layer, [[0.2, duration, '<b>G · Eight fairy homes</b> Each one is a roof, walls, a door and a yard of the same set']])
    return {
      duration, still: 0.4 + every * 2.5,
      update(t) { fit(); show.update(t, lab.camera); tag(show.tag); caption(t) },
      dispose() { show.dispose(); layer.remove(); restore() },
    }
  },
}

/**
 * H and P: the picture sheets. H shows one home of homes.ts in each second, P one option of
 * SHEET in each second, with the camera of its part. The capture takes a picture in the middle of
 * each second (H-0.jpg, P-0.jpg, ...). They are no clips.
 */
const SHEET_CAMERAS: Record<PartId, Orbit> = {
  roof: { angle: -0.55, distance: 13.5, height: 7.4, look: 4.6 },
  walls: { angle: -0.55, distance: 15, height: 4.6, look: 3.0 },
  door: { angle: -0.22, distance: 6.4, height: 1.7, look: 1.35 },
  yard: { angle: -0.4, distance: 16.5, height: 9.5, look: 0.2 },
}
const homeSheet: Feature = {
  id: 'H',
  create(lab) {
    const restore = keepHome(lab)
    homeOf(lab)
    lightHome(lab)
    const frame = homeFrame(lab)
    const show = createSteps(lab, HOMES[0].look, HOMES.map((home, index) => ({ t: index, look: home.look, quiet: true })))
    fairyNearHome(lab)
    lab.setShot(camera => setPose(camera, orbitPose(frame, { angle: -0.6, distance: 19, height: 6.2, look: 2.6 })))
    return { duration: HOMES.length, still: 0.5, update(t) { show.update(t, lab.camera) }, dispose() { show.dispose(); restore() } }
  },
}
const partSheet: Feature = {
  id: 'P',
  create(lab) {
    const restore = keepHome(lab)
    homeOf(lab)
    lightHome(lab)
    const frame = homeFrame(lab)
    const show = createSteps(lab, SHEET[0].look, SHEET.map((item, index) => ({ t: index, look: item.look, quiet: true })))
    // The fairy waits out of the view: the pictures show the part alone.
    hoverFairy(lab, frame.at(0, 30, -40), frame.at(0, 30, 0))
    lab.setShot((camera, t) => setPose(camera, orbitPose(frame, SHEET_CAMERAS[SHEET[Math.min(SHEET.length - 1, Math.floor(t))].part])))
    return { duration: SHEET.length, still: 0.5, update(t) { show.update(t, lab.camera) }, dispose() { show.dispose(); restore() } }
  },
}

/** X: the four parts apart, one over the other, with their names. A still for the page. */
const exploded: Feature = {
  id: 'X',
  create(lab) {
    const restore = keepHome(lab)
    const builder = homeOf(lab)
    builder.apply(look({ roof: 'toadstool', walls: 'stump', door: 'heart', yard: 'fairyRing', colors: { roof: 'cherry', walls: 'cocoa', door: 'berry', yard: 'cherry' } }))
    lightHome(lab)
    const frame = homeFrame(lab)
    hoverFairy(lab, frame.at(0, 40, -40), frame.at(0, 40, 0))
    // The parts go apart: the yard stays on the ground, the walls rise, the door comes out to the front, the roof rises most.
    const lift = { roof: 5.4, walls: 2.2, door: 2.2, yard: 0 }
    const doorOut = 3
    for (const part of PART_IDS) builder.parts[part].position.y += lift[part]
    builder.parts.door.position.z += doorOut
    lab.setShot(camera => setPose(camera, orbitPose(frame, { angle: -0.62, distance: 24, height: 9.5, look: 4.4, shift: -2.4 })))
    const { layer, fit } = createLayer(lab)
    const labels = document.createElement('div')
    labels.className = 'fh-labels'
    layer.append(labels)
    // The point of each label, in the frame of the home. A label stands left of its point.
    const top = builder.socket.topY
    const anchors: Record<PartId, [number, number, number]> = {
      roof: [-4.4, top + lift.roof + 1.4, 0], walls: [-4.2, lift.walls + 2.2, 0],
      door: [-1.4, lift.door + 1.2, builder.socket.frontAt(1.2) + doorOut], yard: [-8.8, 0.4, 2.5],
    }
    return {
      duration: 1, still: 0.5,
      update() {
        fit()
        lab.camera.updateMatrixWorld()
        labels.innerHTML = PART_IDS.map(part => {
          const p = frame.at(...anchors[part]).project(lab.camera)
          const x = (p.x * 0.5 + 0.5) * 1280, y = (-p.y * 0.5 + 0.5) * 720
          return `<span style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px"><b>${PART_NAMES[part]}</b>${OPTIONS[part].length} options</span>`
        }).join('')
      },
      dispose() { layer.remove(); restore() },
    }
  },
}

// ---- B: the build mode ------------------------------------------------------------------------------
/** The pictures of the options: one picture of SHEET for each option, from the capture of P. */
export const sheetPicture = (part: PartId, id: string, base = '/') => `${base}studies/fairy-home/P-${SHEET.findIndex(item => item.part === part && item.option === id)}.jpg`

/** The panel of the build mode, with the classes of the fairy panel of the game (src/style.css). */
export function buildPanelHtml(part: PartId, look: HomeLook, base = '/') {
  return `
    <div class="customizer-heading"><div><p class="eyebrow">YOUR HOME</p><h2>Make it yours</h2></div><button class="customizer-close fh-done" type="button" data-done>Done</button></div>
    <div class="fh-tabs" role="tablist">${PART_IDS.map(id => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === part}">${PART_NAMES[id]}</button>`).join('')}</div>
    <fieldset class="customizer-group"><legend>${PART_NAMES[part]}</legend>
      <div class="option-grid fh-options">${(OPTIONS[part] as readonly { id: string; label: string }[]).map(option => `
        <button type="button" data-option="${option.id}" aria-pressed="${look[part] === option.id}"><img src="${sheetPicture(part, option.id, base)}" alt=""><span>${option.label}</span></button>`).join('')}</div>
      <div class="swatch-grid fh-swatch-grid">${HOME_COLORS.map(color => `
        <button type="button" class="swatch" data-color="${color.id}" aria-pressed="${look.colors[part] === color.id}" aria-label="${color.label}" title="${color.label}" style="--swatch:#${color.color.toString(16).padStart(6, '0')}"><i aria-hidden="true"></i></button>`).join('')}</div>
    </fieldset>`
}

const build: Feature = {
  id: 'B',
  create(lab) {
    const restore = keepHome(lab)
    homeOf(lab)
    lightHome(lab)
    const frame = homeFrame(lab)
    // The taps of the child: [time, what she taps, the change]. A tap shows 0.25 s before its change.
    const taps: { t: number; target: string; step?: Step }[] = [
      { t: 6.0, target: '[data-tab="roof"]' },
      { t: 6.7, target: '[data-option="toadstool"]', step: { t: 6.7, set: ['roof', 'toadstool'] } },
      { t: 8.4, target: '[data-tab="walls"]' },
      { t: 9.1, target: '[data-option="stump"]', step: { t: 9.1, set: ['walls', 'stump'] } },
      { t: 10.8, target: '[data-tab="door"]' },
      { t: 11.5, target: '[data-option="heart"]', step: { t: 11.5, set: ['door', 'heart'] } },
      { t: 13.0, target: '[data-tab="yard"]' },
      { t: 13.7, target: '[data-option="fairyRing"]', step: { t: 13.7, set: ['yard', 'fairyRing'] } },
      { t: 15.1, target: '[data-tab="roof"]' },
      { t: 15.8, target: '[data-color="lilac"]', step: { t: 15.8, paint: ['roof', 'lilac'] } },
      { t: 17.2, target: '[data-done]' },
    ]
    const show = createSteps(lab, TODAY, taps.filter(tap => tap.step).map(tap => tap.step!))
    // Her flight: from the meadow to the front of the home, a hover while she builds, and up over the roof.
    const hover = frame.at(-4.6, 2.4, 7.4)
    lab.setRailPoints(lab.home, [frame.at(-14, 13, 52), frame.at(-6, 8, 30), frame.at(2, 4.2, 14), hover], 0, 4.6)
    hoverFairy(lab, hover, frame.at(0, 2.2, 0), 4.6, 17.6)
    lab.setRailPoints(lab.home, [hover, frame.at(5, 5, 3), frame.at(1, 10.5, -4), frame.at(-5, 15, -18), frame.at(-10, 19, -34)], 17.6, 22)
    // The camera: behind her as in the game, then a turn around the home while she builds.
    const build1: Orbit = { angle: -0.42, distance: 17, height: 5.2, look: 2.8, shift: 3.4 }
    const build2: Orbit = { angle: 0.12, distance: 17, height: 5.2, look: 2.8, shift: 3.4 }
    const after: Orbit = { angle: 0.3, distance: 22, height: 8.5, look: 6, shift: 0 }
    const chaseEye = new THREE.Vector3(), chaseLook = new THREE.Vector3(), forward = new THREE.Vector3(), up = new THREE.Vector3()
    lab.setShot((camera, t) => {
      const fairy = lab.fairy
      forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
      up.set(0, 1, 0).applyQuaternion(fairy.quaternion)
      chaseEye.copy(fairy.position).add(new THREE.Vector3(0, 2.8, 8).applyQuaternion(fairy.quaternion))
      chaseLook.copy(fairy.position).addScaledVector(forward, 12)
      const orbit = t < 17.6 ? mixOrbit(build1, build2, smooth(ramp(t, 5, 17.6))) : mixOrbit(build2, after, smooth(ramp(t, 17.6, 20)))
      const pose = orbitPose(frame, orbit)
      const k = smooth(ramp(t, 4.7, 6.0))
      camera.position.copy(chaseEye).lerp(pose.eye, k)
      camera.up.copy(up).lerp(pose.up, k).normalize()
      camera.lookAt(chaseLook.clone().lerp(pose.target, k))
    })
    const { layer, fit } = createLayer(lab)
    const caption = createCaption(layer, [
      [0.3, 3.4, '<b>B · Build mode</b> She flies home to her cottage'],
      [3.6, 5.0, '<b>B · Build mode</b> Near the cottage, a button shows'],
      [17.8, 22, '<b>B · Build mode</b> Done: her home stays as she made it'],
    ])
    const button = document.createElement('button')
    button.className = 'fh-build-button'
    button.type = 'button'
    button.innerHTML = '<span aria-hidden="true">✦</span> Build your home'
    layer.append(button)
    const panel = document.createElement('section')
    panel.className = 'customizer is-open fh-panel'
    layer.append(panel)
    const tap = document.createElement('i')
    tap.className = 'fh-tap'
    layer.append(tap)
    let tab: PartId = 'roof', shown = ''
    function render() {
      const html = buildPanelHtml(tab, show.builder.look)
      if (html !== shown) { panel.innerHTML = html; shown = html }
    }
    return {
      duration: 22, still: 9.8,
      update(t) {
        fit()
        show.update(t, lab.camera)
        // The tabs follow the taps; the look follows the steps.
        tab = 'roof'
        for (const item of taps) if (item.t <= t && item.target.startsWith('[data-tab')) tab = item.target.slice(11, -2) as PartId
        render()
        const buttonIn = ramp(t, 3.5, 3.9) * (1 - ramp(t, 4.9, 5.1))
        button.style.opacity = String(buttonIn)
        button.style.transform = `translate(-50%, ${(1 - buttonIn) * 14}px) scale(${t > 4.65 && t < 4.95 ? 0.95 : 1})`
        const panelIn = ramp(t, 5.0, 5.35) * (1 - ramp(t, 17.35, 17.65))
        panel.style.opacity = String(panelIn)
        panel.style.transform = `translateY(${(1 - panelIn) * 12}px) scale(${0.98 + panelIn * 0.02})`
        panel.style.visibility = panelIn > 0 ? 'visible' : 'hidden'
        // The tap: a soft ring at the button that she taps, 0.35 s before the change.
        const next = [{ t: 4.75, target: 'build' }, ...taps].find(item => t >= item.t - 0.35 && t < item.t + 0.1)
        if (next) {
          const element = next.target === 'build' ? button : panel.querySelector<HTMLElement>(next.target)
          const scale = layer.getBoundingClientRect().width / 1280 || 1
          const box = element?.getBoundingClientRect(), origin = layer.getBoundingClientRect()
          if (box) {
            const k = (t - (next.t - 0.35)) / 0.45
            tap.style.left = `${(box.left + box.width / 2 - origin.left) / scale}px`
            tap.style.top = `${(box.top + box.height / 2 - origin.top) / scale}px`
            tap.style.opacity = String(Math.sin(Math.PI * Math.min(1, k)) * 0.9)
            tap.style.transform = `translate(-50%, -50%) scale(${0.6 + k * 0.6})`
          }
        } else tap.style.opacity = '0'
        caption(t)
      },
      dispose() { show.dispose(); layer.remove(); restore() },
    }
  },
}

// ---- L: build it yourself -------------------------------------------------------------------------
/**
 * L: the live build mode of the page. The page shows the panel next to the view and calls
 * `liveBuild.lab` to change the home. The camera turns around the home; a drag turns it.
 */
export const liveBuild = {
  lab: null as Lab | null,
  angle: -0.35,
  pitch: 0,
  zoom: 1,
  changes: null as ReturnType<typeof createSteps> | null,
}
const live: Feature = {
  id: 'L',
  create(lab) {
    const restore = keepHome(lab)
    homeOf(lab)
    lightHome(lab)
    const frame = homeFrame(lab)
    const show = createSteps(lab, homeOf(lab).look, [])
    liveBuild.lab = lab
    liveBuild.changes = show
    fairyNearHome(lab)
    lab.setShot((camera, t) => {
      if (Math.abs(t) > 0 && !dragging) liveBuild.angle += 0.0018
      setPose(camera, orbitPose(frame, { angle: liveBuild.angle, distance: 18 * liveBuild.zoom, height: 5.4 + liveBuild.pitch * 10 * liveBuild.zoom, look: 2.6, shift: 0 }))
    })
    let dragging = false, lastX = 0, lastY = 0
    const canvas = lab.renderer.domElement
    const down = (event: PointerEvent) => { dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId) }
    const move = (event: PointerEvent) => {
      if (!dragging) return
      liveBuild.angle -= (event.clientX - lastX) * 0.008
      liveBuild.pitch = THREE.MathUtils.clamp(liveBuild.pitch + (event.clientY - lastY) * 0.003, -0.3, 0.8)
      lastX = event.clientX; lastY = event.clientY
    }
    const up = () => { dragging = false }
    const wheel = (event: WheelEvent) => { event.preventDefault(); liveBuild.zoom = THREE.MathUtils.clamp(liveBuild.zoom * (event.deltaY > 0 ? 1.08 : 0.92), 0.55, 1.6) }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('wheel', wheel, { passive: false })
    return {
      duration: 3600, still: 1,
      update(t) { show.update(t, lab.camera) },
      dispose() {
        canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('wheel', wheel)
        show.dispose(); liveBuild.lab = null; liveBuild.changes = null; restore()
      },
    }
  },
}

/** The clips of the fairy home study, in the order of the page, and the picture sheets. */
export const FEATURES: Record<string, Feature> = {
  B: build,
  R: partShow('R', 'roof', look({}), [{ angle: -0.75, distance: 17, height: 6.2, look: 3.6 }, { angle: 0.15, distance: 16, height: 5.6, look: 3.6 }], 1.9, '<b>R · Roofs</b> Six roofs on the flower cottage'),
  W: partShow('W', 'walls', look({ roof: 'toadstool', colors: { roof: 'cherry' } }), [{ angle: -0.7, distance: 17.5, height: 5.4, look: 3.0 }, { angle: 0.2, distance: 17, height: 5, look: 3.0 }], 1.9, '<b>W · Walls</b> Six walls: the roof and the door move with them'),
  D: partShow('D', 'door', look({}), [{ angle: -0.32, distance: 8.2, height: 2.0, look: 1.5 }, { angle: 0.2, distance: 8.0, height: 1.9, look: 1.5 }], 1.8, '<b>D · Doors</b> Five doors on the flower cottage'),
  Y: partShow('Y', 'yard', look({}), [{ angle: -0.6, distance: 24, height: 13, look: 1.2 }, { angle: 0.25, distance: 23, height: 12, look: 1.2 }], 2.0, '<b>Y · Yards</b> Six yards around the flower cottage'),
  C: colours,
  G: gallery,
  L: live,
  H: homeSheet,
  P: partSheet,
  X: exploded,
}
export { ROOFS, WALLS, DOORS, YARDS, colorOf }
