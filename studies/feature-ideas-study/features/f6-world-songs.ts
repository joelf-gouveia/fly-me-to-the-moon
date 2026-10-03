import * as THREE from 'three'
import type { Feature, Kind } from '../lab'
import { orientFlight } from '../../../src/flight'
import { setHum } from './sound'
import './f6-world-songs.css'

/**
 * F6 · A song for each world. Today the game has one hum: A2, E3 and A3 (createAmbience() in
 * src/main.ts). With this idea each world has its own soft chord of three notes, and the hum
 * glides to the new chord when the nearest world changes. A video has no sound, so a small
 * card shows the three notes as glowing bars that move to the new pitches.
 */
/** The chords in Hz: low, soft and consonant. Earth keeps the hum of today. The page plays them with setHum(). */
export const WORLD_CHORDS: Record<Kind, number[]> = {
  sun: [130.81, 196.0, 329.63],
  mercury: [146.83, 220.0, 369.99],
  venus: [116.54, 174.61, 293.66],
  earth: [110.0, 164.81, 220.0],
  moon: [87.31, 130.81, 220.0],
  mars: [82.41, 123.47, 207.65],
  vesta: [98.0, 146.83, 246.94],
  ceres: [103.83, 155.56, 261.63],
  jupiter: [65.41, 98.0, 164.81],
  saturn: [73.42, 110.0, 185.0],
  uranus: [77.78, 116.54, 196.0],
  neptune: [69.3, 103.83, 174.61],
  fairy: [164.81, 246.94, 415.3],
}

/** The note names and the mood of each chord, for the card. */
export const WORLD_CHORD_INFO: Record<Kind, { names: [string, string, string]; mood: string }> = {
  sun: { names: ['C3', 'G3', 'E4'], mood: 'warm and golden' },
  mercury: { names: ['D3', 'A3', 'F♯4'], mood: 'quick and bright' },
  venus: { names: ['B♭2', 'F3', 'D4'], mood: 'warm and hazy' },
  earth: { names: ['A2', 'E3', 'A3'], mood: 'home, as today' },
  moon: { names: ['F2', 'C3', 'A3'], mood: 'calm and silver' },
  mars: { names: ['E2', 'B2', 'G♯3'], mood: 'dusty and warm' },
  vesta: { names: ['G2', 'D3', 'B3'], mood: 'small and clear' },
  ceres: { names: ['A♭2', 'E♭3', 'C4'], mood: 'quiet and round' },
  jupiter: { names: ['C2', 'G2', 'E3'], mood: 'deep and wide' },
  saturn: { names: ['D2', 'A2', 'F♯3'], mood: 'deep, with rings' },
  uranus: { names: ['E♭2', 'B♭2', 'G3'], mood: 'cool and slow' },
  neptune: { names: ['D♭2', 'A♭2', 'F3'], mood: 'deep and blue' },
  fairy: { names: ['E3', 'B3', 'G♯4'], mood: 'bright and sweet' },
}

/** The glide of the hum in seconds. setHum() reaches the new chord in about this time. */
const GLIDE = 2.4
/** The bars show 55 Hz to 440 Hz: three octaves. */
const barHeight = (frequency: number) => THREE.MathUtils.clamp(Math.log2(frequency / 55) / 3, 0.05, 1)

export const worldSongs: Feature = {
  id: 'F6',
  create(lab) {
    const { earth, moon, sun } = lab
    const E = earth.group.position, M = moon.group.position
    // A frame for the path: `m` points from Earth to the Moon, `n` is at right angles to it, to the Sun side.
    const m = M.clone().sub(E).normalize()
    const toSun = sun.group.position.clone().sub(E).normalize()
    const n = toSun.clone().addScaledVector(m, -toSun.dot(m)).normalize()
    const at = (angle: number) => m.clone().multiplyScalar(Math.cos(angle)).addScaledVector(n, Math.sin(angle))
    const deg = THREE.MathUtils.degToRad
    const earthPoint = (angle: number, alt: number) => {
      const dir = at(deg(angle))
      return lab.surfacePoint(earth, dir.applyQuaternion(earth.group.quaternion.clone().invert()), alt)
    }
    // Moon points: `angle` from the direction to Earth, toward the Sun side.
    const moonPoint = (angle: number, alt: number) => {
      const dir = m.clone().negate().multiplyScalar(Math.cos(deg(angle))).addScaledVector(n, Math.sin(deg(angle)))
      return lab.surfacePoint(moon, dir.applyQuaternion(moon.group.quaternion.clone().invert()), alt)
    }
    // The path bends to the Sun side, so the "up" of the fairy turns from Earth to the Moon with no flip.
    const mid = (k: number, lift: number) => E.clone().lerp(M, k).addScaledVector(n, lift)
    const glide = [earthPoint(58, 62), earthPoint(52, 66), earthPoint(46, 74), earthPoint(41, 88)]
    const climb = [earthPoint(41, 88), earthPoint(36, 140), mid(0.4, 185), mid(0.58, 170)]
    const arrive = [mid(0.58, 170), mid(0.72, 150), moonPoint(60, 70), moonPoint(48, 26)]
    const land = [moonPoint(48, 26), moonPoint(43, 18), moonPoint(38, 15)]
    lab.setRailPoints(earth, glide, 0, 3)
    lab.setRailPoints(earth, climb, 3, 6)
    lab.setRailPoints(moon, arrive, 6, 9.2)
    lab.setRailPoints(moon, land, 9.2, 11)

    // ---- The card: the song of the nearest world --------------------------------------------------
    const card = document.createElement('div')
    card.className = 'f6-song'
    card.innerHTML = `
      <p class="f6-eyebrow">WORLD SONG</p>
      <div class="f6-title"><span class="f6-label"></span><span class="f6-label f6-label--next"></span></div>
      <div class="f6-bars">${[0, 1, 2].map(() => '<div class="f6-bar"><i></i><b></b></div>').join('')}</div>
      <p class="f6-mood"></p>`
    lab.overlay.append(card)
    const labels = [...card.querySelectorAll<HTMLElement>('.f6-label')]
    const bars = [...card.querySelectorAll<HTMLElement>('.f6-bar')]
    const fills = bars.map(bar => bar.querySelector('i')!)
    const names = bars.map(bar => bar.querySelector('b')!)
    const mood = card.querySelector<HTMLElement>('.f6-mood')!

    let kind: Kind | null = null, previous: Kind | null = null
    let changedAt = -100, last = -1, from = [...WORLD_CHORDS.earth], shown = [...WORLD_CHORDS.earth]
    const earthUp = new THREE.Vector3(), moonUp = new THREE.Vector3(), up = new THREE.Vector3(), heading = new THREE.Vector3()
    const colour = (world: Kind) => `#${new THREE.Color(lab.byKind(world).color).getHexString()}`

    function change(next: Kind, t: number, sound: boolean) {
      from = [...shown]
      previous = kind; kind = next; changedAt = t
      if (sound) setHum(WORLD_CHORDS[next], GLIDE)
      labels[0].textContent = previous ? `♪ ${lab.byKind(previous).name}` : ''
      labels[1].textContent = `♪ ${lab.byKind(next).name}`
      mood.textContent = WORLD_CHORD_INFO[next].mood
      card.style.setProperty('--f6-colour', colour(next))
      card.style.setProperty('--f6-before', colour(previous ?? next))
    }

    return {
      duration: 11,
      still: 7.6,
      update(t) {
        // A new start: the card shows the chord of the first world at once.
        if (t < last || kind === null) { kind = null; previous = null; shown = [...WORLD_CHORDS[lab.nearest.kind]]; change(lab.nearest.kind, -100, false); last = -1 }
        // The hum starts on the first frame that moves, so the cue list of the capture has it.
        if (last <= 0 && t > 0) setHum(WORLD_CHORDS[kind!], 0.6)
        last = t
        const nearest = lab.nearest.kind
        if (nearest !== kind) change(nearest, t, true)

        // The "up" of the fairy turns from Earth to the Moon as she crosses the gap.
        if (lab.mode === 'clip') {
          const p = lab.fairy.position
          earthUp.copy(p).sub(E).normalize(); moonUp.copy(p).sub(M).normalize()
          const share = THREE.MathUtils.smoothstep(p.distanceTo(E) - earth.radius - (p.distanceTo(M) - moon.radius), -260, 260)
          up.copy(earthUp).lerp(moonUp, share).normalize()
          heading.set(0, 0, -1).applyQuaternion(lab.fairy.quaternion)
          orientFlight(lab.fairy.quaternion, heading, up)
        }

        // The bars glide as the hum glides: the time constant of setHum() is GLIDE / 3.
        const target = WORLD_CHORDS[kind!]
        const k = Math.exp(-3 * Math.max(0, t - changedAt) / GLIDE)
        const swap = THREE.MathUtils.smoothstep(t - changedAt, 0, 0.9)
        for (let i = 0; i < 3; i++) {
          shown[i] = target[i] + (from[i] - target[i]) * k
          const breathe = 1 + Math.sin(t * 1.7 + i * 2.1) * 0.035
          fills[i].style.transform = `scaleY(${(barHeight(shown[i]) * breathe).toFixed(4)})`
          names[i].textContent = swap < 0.5 && previous ? WORLD_CHORD_INFO[previous].names[i] : WORLD_CHORD_INFO[kind!].names[i]
          names[i].style.opacity = (Math.abs(swap - 0.5) * 2 * 0.75 + 0.25).toFixed(3)
        }
        labels[0].style.opacity = previous ? (1 - swap).toFixed(3) : '0'
        labels[0].style.transform = `translateY(${(-swap * 10).toFixed(2)}px)`
        labels[1].style.opacity = previous ? swap.toFixed(3) : '1'
        labels[1].style.transform = previous ? `translateY(${((1 - swap) * 10).toFixed(2)}px)` : ''
        card.style.setProperty('--f6-mix', (1 - k).toFixed(3))
        card.style.setProperty('--f6-pulse', (0.5 + Math.sin(t * 1.3) * 0.5).toFixed(3))
      },
      dispose() {
        card.remove()
        setHum(null)
      },
    }
  },
}
