import * as THREE from 'three'
import type { Feature, Lab } from '../../feature-ideas-study/lab'
import { orientFlight } from '../../../src/flight'
import type { FlightInput } from '../../../src/flight'
import { createPilot, handsOn, NO_KEYS, pilotStep } from '../model'
import type { Controls, OptionId, Phase, Pilot } from '../model'
import { headingAt, shellOf, TOUR, TOUR_SECONDS, tourKeys } from '../numbers'
import './features.css'

/**
 * The five clips of the let go study. Each one runs in the lab of the feature ideas study
 * (studies/feature-ideas-study/lab.ts) with the real worlds of the game. The fairy flies with
 * stepFlight() and hoverFlight() of src/flight.ts through pilotStep() of model.ts: no rail.
 * T, A, B and C fly the same tour over the meadow. S flies from Earth to the Moon with B.
 * A card shows the buttons of a phone and the keys of a computer that are down in each frame.
 */
export type ClipId = OptionId | 'S'

const PHASE_TEXT: Record<Phase, string> = { fly: 'Flying', glide: 'Gliding to a stop', wait: 'Waiting in the air' }
const NAMES: Record<OptionId, string> = { T: 'T · Today', A: 'A · Any key flies', B: 'B · Hold to fly', C: 'C · Rest after a pause' }

/** The buttons of the phone and the keys of the computer for each option. The labels are the labels of the game. */
const RIGHT_BUTTONS: Record<OptionId, { id: 'boost' | 'fly' | 'hover'; icon: string; label: string }[]> = {
  T: [{ id: 'boost', icon: '✦', label: 'Boost' }, { id: 'hover', icon: '◉', label: 'Hover' }],
  A: [{ id: 'boost', icon: '✦', label: 'Boost' }],
  B: [{ id: 'boost', icon: '✦', label: 'Fast' }, { id: 'fly', icon: '➤', label: 'Fly' }],
  C: [{ id: 'boost', icon: '✦', label: 'Boost' }],
}
const KEYS: Record<OptionId, { id: string; label: string }[]> = {
  T: [{ id: 'arrows', label: 'WASD / arrows' }, { id: 'boost', label: 'Shift' }, { id: 'tap', label: 'Q' }],
  A: [{ id: 'arrows', label: 'WASD / arrows' }, { id: 'boost', label: 'Shift' }],
  B: [{ id: 'arrows', label: 'WASD / arrows' }, { id: 'boost', label: 'Shift' }, { id: 'fly', label: 'Space' }],
  C: [{ id: 'arrows', label: 'WASD / arrows' }, { id: 'boost', label: 'Shift' }],
}

/** A layer of 1280 × 720 px over the 3D view. It scales to the live view, so the card has the same place in the clip and in the live view. */
function createLayer(lab: Lab) {
  const layer = document.createElement('div')
  layer.className = 'lg-layer'
  lab.overlay.append(layer)
  return { layer, fit() { layer.style.transform = `scale(${(lab.host.clientWidth || 1280) / 1280})` } }
}

/** A caption at the bottom of the clip, from `from` to `to` seconds. */
function createCaption(layer: HTMLElement, lines: [from: number, to: number, html: string][]) {
  const caption = document.createElement('p')
  caption.className = 'lg-caption'
  layer.append(caption)
  let shown = ''
  return (t: number, live: boolean) => {
    const line = live ? null : lines.find(([from, to]) => t >= from && t < to)
    if (!line) { caption.style.visibility = 'hidden'; return }
    if (line[2] !== shown) { caption.innerHTML = line[2]; shown = line[2] }
    caption.style.visibility = 'visible'
    caption.style.opacity = String(Math.min(1, (t - line[0]) / 0.25, (line[1] - t) / 0.25))
  }
}

/** The card with the phone buttons, the computer keys, the phase and the seconds with the hands on. */
function createCard(layer: HTMLElement, option: OptionId) {
  const card = document.createElement('div')
  card.className = 'lg-card'
  card.innerHTML = `
    <p class="lg-head">On a phone</p>
    <div class="lg-phone">
      <div class="lg-arrows">${[['up', '↑'], ['left', '←'], ['down', '↓'], ['right', '→']].map(([id, label]) => `<span data-arrow="${id}">${label}</span>`).join('')}</div>
      <div class="lg-actions">${RIGHT_BUTTONS[option].map(button => `<span data-button="${button.id}"><i>${button.icon}</i><em>${button.label}</em></span>`).join('')}</div>
    </div>
    <p class="lg-head">On a computer</p>
    <div class="lg-keys">${KEYS[option].map(key => `<kbd data-key="${key.id}">${key.label}</kbd>`).join('')}</div>
    <p class="lg-status"><span class="lg-dot"></span><span class="lg-phase"></span></p>
    <p class="lg-hands">Hands on the controls <b>0.0 s</b></p>`
  layer.append(card)
  const arrows = Object.fromEntries([...card.querySelectorAll<HTMLElement>('[data-arrow]')].map(node => [node.dataset.arrow!, node]))
  const buttons = Object.fromEntries([...card.querySelectorAll<HTMLElement>('[data-button]')].map(node => [node.dataset.button!, node]))
  const keys = Object.fromEntries([...card.querySelectorAll<HTMLElement>('[data-key]')].map(node => [node.dataset.key!, node]))
  const phaseNode = card.querySelector<HTMLElement>('.lg-phase')!, hands = card.querySelector<HTMLElement>('.lg-hands b')!
  const hoverLabel = buttons.hover?.querySelector('em')
  return (controls: Controls, tap: boolean, phase: Phase, seconds: number) => {
    arrows.up.classList.toggle('is-held', controls.pitch > 0)
    arrows.down.classList.toggle('is-held', controls.pitch < 0)
    arrows.left.classList.toggle('is-held', controls.yaw > 0)
    arrows.right.classList.toggle('is-held', controls.yaw < 0)
    buttons.boost?.classList.toggle('is-held', controls.boost)
    buttons.fly?.classList.toggle('is-held', controls.fly)
    if (buttons.hover) {
      // The toggle of today: lit while she hovers, and its label says what the next tap does.
      buttons.hover.classList.toggle('is-held', controls.hover)
      buttons.hover.classList.toggle('is-tap', tap)
      const label = controls.hover ? 'Fly' : 'Hover'
      if (hoverLabel && hoverLabel.textContent !== label) hoverLabel.textContent = label
    }
    keys.arrows.classList.toggle('is-held', Boolean(controls.yaw || controls.pitch))
    keys.boost.classList.toggle('is-held', controls.boost)
    keys.fly?.classList.toggle('is-held', controls.fly)
    keys.tap?.classList.toggle('is-held', tap)
    card.dataset.phase = phase
    if (phaseNode.textContent !== PHASE_TEXT[phase]) phaseNode.textContent = PHASE_TEXT[phase]
    hands.textContent = `${seconds.toFixed(1)} s`
  }
}

/** A tag at the top of the clip: the option. */
function createTag(layer: HTMLElement, html: string) {
  const tag = document.createElement('p')
  tag.className = 'lg-tag'
  tag.innerHTML = html
  layer.append(tag)
}

/**
 * The keys of free flight on the live page: the arrows and Shift come from the lab. Space is the
 * Fly key of B, and Q is the hover toggle of T. The other options do not use them.
 */
function createLiveKeys(lab: Lab, option: OptionId) {
  let fly = false, hover = false
  const target = lab.renderer.domElement
  const down = (event: KeyboardEvent) => {
    if (lab.mode !== 'free') return
    if (event.code === 'Space') { event.preventDefault(); fly = true }
    if (event.code === 'KeyQ' && !event.repeat && option === 'T') hover = !hover
  }
  const up = (event: KeyboardEvent) => { if (event.code === 'Space') fly = false }
  const blur = () => { fly = false }
  target.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  target.addEventListener('blur', blur)
  return {
    get fly() { return fly },
    get hover() { return hover },
    dispose() { target.removeEventListener('keydown', down); window.removeEventListener('keyup', up); target.removeEventListener('blur', blur) },
  }
}

type Script = (t: number) => { controls: Controls; tap: boolean }

/**
 * A clip that flies `script` with the control model of `option`, from `start`. On the live page,
 * Free flight uses the same control model with the real keys.
 */
function flightClip(id: ClipId, option: OptionId, setup: (lab: Lab) => { position: THREE.Vector3; quaternion: THREE.Quaternion }, script: Script, duration: number, still: number, lines: [number, number, string][], tag: string): Feature {
  return {
    id,
    create(lab) {
      const start = setup(lab)
      let pilot: Pilot = createPilot(option)
      let frame: { controls: Controls; tap: boolean } = { controls: { ...NO_KEYS }, tap: false }
      let hands = 0, last = 0
      const live = createLiveKeys(lab, option)
      // The lab calls the script for the boost look, then the stepper with the same keys.
      lab.setScript((t): FlightInput => {
        if (t < last) { pilot = createPilot(option); hands = 0 }
        frame = script(t)
        return { yaw: frame.controls.yaw, pitch: frame.controls.pitch, boost: frame.controls.boost }
      }, start.position, start.quaternion)
      lab.setStepper((state, world, delta, input) => {
        if (delta <= 0) return
        if (lab.mode === 'free') frame = { controls: { ...input, fly: live.fly, hover: live.hover }, tap: false }
        pilotStep(pilot, state, world, delta, frame.controls)
        if (handsOn(option, frame.controls) || frame.tap) hands += delta
      })
      const { layer, fit } = createLayer(lab)
      createTag(layer, tag)
      const card = createCard(layer, option)
      const caption = createCaption(layer, lines)
      let mode = lab.mode
      return {
        duration, still,
        update(t) {
          fit()
          // Free flight starts a new count from where she is.
          if (lab.mode !== mode) { mode = lab.mode; hands = 0; pilot = createPilot(option) }
          if (t < last && lab.mode === 'clip') { pilot = createPilot(option); hands = 0; frame = script(0) }
          last = t
          card(frame.controls, frame.tap, pilot.phase, hands)
          caption(t, lab.mode === 'free')
        },
        dispose() { live.dispose(); layer.remove() },
      }
    },
  }
}

/** The start of the tour: 8 m over the meadow of Earth, level, as the tour of numbers.ts. */
function meadowStart(lab: Lab) {
  const position = lab.surfacePoint(lab.earth, lab.meadowLocal, 8)
  const up = lab.upAt(lab.earth, position)
  const heading = headingAt(lab.meadowLocal, 0.9).applyQuaternion(lab.earth.group.quaternion)
  heading.addScaledVector(up, -heading.dot(up)).normalize()
  const quaternion = new THREE.Quaternion()
  orientFlight(quaternion, heading, up)
  return { position, quaternion }
}

const s = (part: readonly [number, number]) => part
/** The captions of the tour: the intent, and what the option needs for it. */
function tourLines(option: OptionId): [number, number, string][] {
  const name = `<b>${NAMES[option]}</b>`
  const text: Record<OptionId, string[]> = {
    T: ['Fly straight: no keys', 'Turn left: hold ←', 'Stop to look: tap Hover. She stops at once', 'Look around: hold →. She turns in place', 'Fly on: tap Fly. No keys'],
    A: ['Fly straight: only Boost goes straight, so she goes fast', 'Turn left: hold ←', 'Stop to look: let go. She glides 2.5 m and waits', 'Look around: hold →. She turns, and she flies a circle', 'Fly on: hold Boost again'],
    B: ['Fly straight: hold Fly', 'Turn left: hold Fly and ←. Two thumbs', 'Stop to look: let go. She glides 2.5 m and waits', 'Look around: hold → only. She turns in place', 'Fly on: hold Fly'],
    C: ['Fly straight: no keys', 'Turn left: hold ←', 'Stop to look: let go. She flies on for 3 s', 'Look around: hold →. She starts again, and flies a circle', 'Fly on: no keys. In 3 s she rests again'],
  }
  const parts = [s(TOUR.straight), s(TOUR.left), s(TOUR.stop), s(TOUR.look), s(TOUR.on)]
  return parts.map(([from, to], index) => [from + 0.1, to - 0.05, `${name} ${text[option][index]}`])
}

function tourClip(option: OptionId): Feature {
  const tag = `${NAMES[option]}<small>the same tour, the keys of ${option === 'T' ? 'today' : 'option ' + option}</small>`
  return flightClip(option, option, meadowStart, t => tourKeys(option, t), TOUR_SECONDS, 6.6, tourLines(option), tag)
}

// ---- S · To the Moon, with B --------------------------------------------------------------------------

/** The parts of the trip to the Moon: hold Fly, let go and wait, one turn in place (Earth passes through the view), then fly on. */
export const MOON_TRIP = { fly: [0, 3.2], wait: [3.2, 4.6], look: [4.6, 13.6], on: [13.6, 17] } as const
export const MOON_SECONDS = 17
function moonKeys(t: number): { controls: Controls; tap: boolean } {
  const c: Controls = { ...NO_KEYS }
  const at = (part: readonly [number, number]) => t >= part[0] && t < part[1]
  if (at(MOON_TRIP.fly) || at(MOON_TRIP.on)) c.fly = true
  if (at(MOON_TRIP.look)) c.yaw = 1
  return { controls: c, tap: false }
}
/** The start: 10 m above the steering shell of Earth, on the line to the Moon, toward the Moon. */
function moonStart(lab: Lab) {
  const earth = lab.earth, moon = lab.moon
  earth.group.updateMatrixWorld(true); moon.group.updateMatrixWorld(true)
  const line = moon.group.position.clone().sub(earth.group.position).normalize()
  const position = earth.group.position.clone().addScaledVector(line, earth.radius + shellOf(earth) + 10)
  const quaternion = new THREE.Quaternion()
  const up = Math.abs(line.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  orientFlight(quaternion, line, up.addScaledVector(line, -up.dot(line)).normalize())
  return { position, quaternion }
}
const moonClip = flightClip('S', 'B', moonStart, moonKeys, MOON_SECONDS, 9.1, [
  [0.1, 3.15, '<b>S · To the Moon with B</b> Hold Fly: she leaves Earth for the Moon'],
  [3.25, 4.55, '<b>S · To the Moon with B</b> Let go: at about 100 m/s she glides about 30 m, and waits'],
  [4.65, 13.55, '<b>S · To the Moon with B</b> She waits. Hold ←: she turns in place, and Earth goes by'],
  [13.65, 16.95, '<b>S · To the Moon with B</b> Hold Fly to go on. Today she flies on with no keys'],
], 'S · To the Moon<small>option B, in open space</small>')

export const FEATURES: Record<ClipId, Feature> = {
  T: tourClip('T'), A: tourClip('A'), B: tourClip('B'), C: tourClip('C'), S: moonClip,
}
