import * as THREE from 'three'
import type { Feature } from '../lab'
import { orientFlight } from '../../../src/flight'
import type { FlightInput } from '../../../src/flight'
import { tangentOf } from './path'
import './f7-controller.css'

/**
 * F7 · Game controller. The left stick steers (left and right turn, up climbs), A boosts,
 * B pauses and X hovers. The clip flies the real stepFlight() with a scripted stick over the
 * meadow. On the live page a real controller flies the fairy in free flight.
 */
type Stick = { x: number; y: number; a: boolean; b: boolean; x2: boolean; note: string }

/** A soft step from 0 to 1 between `from` and `to`, and back to 0 between `back` and `end`. */
function hold(t: number, from: number, to: number, back: number, end: number) {
  return THREE.MathUtils.smoothstep(t, from, to) * (1 - THREE.MathUtils.smoothstep(t, back, end))
}

/** The scripted stick of the clip. x: right is +1. y: up is +1 (the game "climb"). */
function scripted(t: number): Stick {
  const left = hold(t, 1.0, 1.4, 3.0, 3.4), right = hold(t, 4.0, 4.4, 6.0, 6.4), climb = hold(t, 6.6, 6.9, 7.6, 7.9)
  // A short push down after the climb brings the fairy level again before the boost.
  const level = hold(t, 8.1, 8.3, 8.8, 9.0)
  const a = t > 9.2 && t < 11.6
  const note = left > 0.5 ? '◀  Turn left' : right > 0.5 ? 'Turn right  ▶' : climb > 0.5 ? '▲  Climb' : level > 0.5 ? '▼  Level out' : a ? '✦  Boost' : 'Glide'
  return { x: -0.85 * left + 0.85 * right, y: 0.75 * climb - 0.6 * level, a, b: false, x2: false, note }
}

const DEAD = 0.15
const dead = (value: number) => Math.abs(value) < DEAD ? 0 : Math.sign(value) * (Math.abs(value) - DEAD) / (1 - DEAD)

/** A generic controller: two grips, a left stick, a cross, a right stick and four face buttons. */
const PAD_SVG = `
<svg class="f7-pad" viewBox="0 0 300 190" aria-hidden="true">
  <defs>
    <radialGradient id="f7-glow"><stop offset="0" stop-color="#ffe7a8" stop-opacity="0.95"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
    <linearGradient id="f7-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4266"/><stop offset="1" stop-color="#1b2140"/></linearGradient>
  </defs>
  <path class="f7-body" d="M78 30 H222 C262 30 286 62 294 112 C302 160 284 184 258 184 C236 184 224 168 212 150 C204 138 196 132 182 132 H118 C104 132 96 138 88 150 C76 168 64 184 42 184 C16 184 -2 160 6 112 C14 62 38 30 78 30 Z"/>
  <path class="f7-shoulder" d="M70 30 C78 18 104 16 116 24"/>
  <path class="f7-shoulder" d="M230 30 C222 18 196 16 184 24"/>
  <g transform="translate(78 82)">
    <circle class="f7-well" r="27"/>
    <circle class="f7-ring" r="27"/>
    <g class="f7-stick"><circle class="f7-nub" r="15"/><circle class="f7-nub-top" r="9"/></g>
  </g>
  <g transform="translate(116 132)" class="f7-cross">
    <rect x="-7" y="-20" width="14" height="40" rx="3"/><rect x="-20" y="-7" width="40" height="14" rx="3"/>
  </g>
  <g transform="translate(184 132)"><circle class="f7-well" r="19"/><circle class="f7-nub" r="11"/></g>
  <g class="f7-face" transform="translate(222 82)">
    <g class="f7-btn" data-key="y" transform="translate(0 -22)"><circle r="12"/><text y="4">Y</text></g>
    <g class="f7-btn" data-key="x" transform="translate(-22 0)"><circle r="12"/><text y="4">X</text></g>
    <g class="f7-btn" data-key="b" transform="translate(22 0)"><circle r="12"/><text y="4">B</text></g>
    <g class="f7-btn" data-key="a" transform="translate(0 22)"><circle class="f7-halo" r="26" fill="url(#f7-glow)"/><circle r="12"/><text y="4">A</text></g>
  </g>
  <circle class="f7-home" cx="150" cy="70" r="7"/>
</svg>`

export const controller: Feature = {
  id: 'F7',
  create(lab) {
    const { earth, meadowLocal } = lab
    // The start pose: 8 m over the meadow, the heading along the ground.
    const position = lab.surfacePoint(earth, meadowLocal, 8)
    const up = lab.upAt(earth, position)
    const heading = tangentOf(meadowLocal, 0.9).applyQuaternion(earth.group.quaternion)
    heading.addScaledVector(up, -heading.dot(up)).normalize()
    const quaternion = new THREE.Quaternion()
    orientFlight(quaternion, heading, up)
    lab.setScript(t => {
      const stick = scripted(t)
      return { yaw: -stick.x, pitch: stick.y, boost: stick.a }
    }, position, quaternion)

    // ---- The card with the controller ----------------------------------------------------------------
    const card = document.createElement('div')
    card.className = 'f7-card'
    card.innerHTML = `${PAD_SVG}
      <p class="f7-status"><span class="f7-dot"></span><span class="f7-note">Glide</span></p>
      <p class="f7-caption">Left stick: steer · A: boost · B: pause · X: hover</p>`
    lab.overlay.append(card)
    const stickNode = card.querySelector<SVGGElement>('.f7-stick')!
    const ring = card.querySelector<SVGCircleElement>('.f7-ring')!
    const note = card.querySelector<HTMLElement>('.f7-note')!
    const buttons = Object.fromEntries([...card.querySelectorAll<SVGGElement>('.f7-btn')].map(node => [node.dataset.key!, node]))

    // ---- A real controller, for free flight on the live page ----------------------------------------
    let pad: Stick | null = null, bWas = false
    function readPad(): Stick | null {
      const found = typeof navigator.getGamepads === 'function' ? [...navigator.getGamepads()].find(item => item?.connected) : null
      if (!found) return null
      const pressed = (index: number) => !!found.buttons[index]?.pressed
      return { x: dead(found.axes[0] ?? 0), y: -dead(found.axes[1] ?? 0), a: pressed(0), b: pressed(1), x2: pressed(2), note: 'Controller connected' }
    }
    lab.setExtraInput((): Partial<FlightInput> => {
      if (lab.mode !== 'free' || !pad) return {}
      return { yaw: -pad.x, pitch: pad.y, boost: pad.a }
    })

    return {
      duration: 12,
      still: 10.2,
      update(t) {
        let stick: Stick
        if (lab.mode === 'free') {
          pad = readPad()
          // B pauses and plays again. The lab has no hover, so X only lights up here.
          if (pad?.b && !bWas) lab.setPlaying(!lab.playing)
          bWas = !!pad?.b
          stick = pad ?? { x: 0, y: 0, a: false, b: false, x2: false, note: 'Connect a controller to fly' }
        } else stick = scripted(t)
        const length = Math.min(1, Math.hypot(stick.x, stick.y))
        stickNode.setAttribute('transform', `translate(${(stick.x * 13).toFixed(2)} ${(-stick.y * 13).toFixed(2)})`)
        ring.style.opacity = (0.25 + length * 0.75).toFixed(3)
        buttons.a.classList.toggle('is-on', stick.a)
        buttons.b.classList.toggle('is-on', stick.b)
        buttons.x.classList.toggle('is-on', stick.x2)
        card.classList.toggle('is-moving', length > 0.2 || stick.a)
        if (note.textContent !== stick.note) note.textContent = stick.note
      },
      dispose() {
        lab.setExtraInput(null)
        card.remove()
      },
    }
  },
}
