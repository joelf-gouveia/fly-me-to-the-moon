import * as THREE from 'three'
import type { Feature } from '../lab'
import { surfaceRadius } from '../../../src/worlds'
import { arrivalDistance, stickerById } from '../../../src/stickers'
import { chime, voice } from './sound'
import { noteMotion } from './f1-search-stars'
import '../../../src/sticker-book.css'
import './f2-spoken-facts.css'

/**
 * F2 · Spoken facts. The fairy arrives at the Moon, the new-sticker note shows, and a voice
 * reads the name and the fact. A small speaker mark moves while the line plays, and each
 * word lights up when the voice says it.
 */
const LINE = '/voice/en/af_heart/hello-moon.mp3'
/** The line is 3.67 s ("Moon! The Moon goes around Earth. People have walked on it!"). */
const LINE_LENGTH = 3.67
/**
 * The three spoken parts of the line, in seconds from its start. The start and the end of
 * each part come from the loudness of the decoded mp3 (the pauses between the sentences).
 * In each part, the words share the time by their length.
 */
const PARTS = [{ start: 0.08, end: 0.58 }, { start: 0.66, end: 2.0 }, { start: 2.36, end: 3.52 }]
/** The voice starts a little after the note, so the chime and the voice do not overlap. */
const VOICE_DELAY = 0.5

type Word = { element: HTMLElement; start: number; end: number }

/** Spreads the time of a part over its words, by the number of letters, plus one for each word. */
function timeWords(elements: HTMLElement[], start: number, end: number): Word[] {
  const weights = elements.map(element => element.textContent!.replace(/[^\p{L}]/gu, '').length + 1)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let at = start
  return elements.map((element, index) => {
    const length = weights[index] / total * (end - start)
    const word = { element, start: at, end: at + length }
    at += length
    return word
  })
}

export const spokenFacts: Feature = {
  id: 'F2',
  create(lab) {
    const { moon, earth, sun } = lab
    const sticker = stickerById('moon')
    const centre = moon.group.position

    // The place of the arrival: the Sun 30° up and behind, and Earth low over the horizon ahead.
    const toSun = sun.group.position.clone().sub(centre).normalize()
    let site = new THREE.Vector3(0, 1, 0), best = -Infinity
    const probe = new THREE.Vector3(), toEarth = new THREE.Vector3()
    for (let i = 0; i < 4000; i++) {
      const y = 1 - (i + 0.5) / 2000, ring = Math.sqrt(Math.max(0, 1 - y * y)), angle = i * 2.399963
      probe.set(ring * Math.cos(angle), y, ring * Math.sin(angle))
      toEarth.copy(earth.group.position).sub(centre).addScaledVector(probe, -moon.radius).normalize()
      const sunUp = THREE.MathUtils.radToDeg(Math.asin(probe.dot(toSun))), earthUp = THREE.MathUtils.radToDeg(Math.asin(probe.dot(toEarth)))
      const sunFlat = toSun.clone().addScaledVector(probe, -probe.dot(toSun)).normalize()
      const earthFlat = toEarth.clone().addScaledVector(probe, -probe.dot(toEarth)).normalize()
      const score = -Math.abs(sunUp - 30) - Math.abs(earthUp - 4) * 1.5 - Math.max(0, sunFlat.dot(earthFlat) + 0.3) * 40
      if (score > best) { best = score; site = probe.clone() }
    }
    toEarth.copy(earth.group.position).sub(centre).addScaledVector(site, -moon.radius).normalize()
    const heading = toEarth.clone().addScaledVector(site, -site.dot(toEarth)).normalize()
    const axis = new THREE.Vector3().crossVectors(site, heading).normalize()
    const at = (along: number, alt: number) => {
      const normal = site.clone().applyAxisAngle(axis, along / moon.radius)
      return centre.clone().addScaledVector(normal, surfaceRadius(moon, normal) + alt)
    }
    lab.setRailPoints(moon, [at(-44, 150), at(-36, 120), at(-28, 96)], 0)
    lab.setRailPoints(moon, [at(-28, 96), at(-22, 74), at(-15, 55)], 1.6)
    lab.setRailPoints(moon, [at(-15, 55), at(-8, 38), at(0, 26), at(9, 20), at(18, 18)], 3.4)
    // The camera: behind the fairy, and turned between the edge of the Moon and Earth, so the picture has both.
    const goal = new THREE.Vector3(), look = new THREE.Vector3(), camPosition = new THREE.Vector3(), camLook = new THREE.Vector3()
    const forward = new THREE.Vector3(), up = new THREE.Vector3(), view = new THREE.Vector3()
    let shotLast = -1
    lab.setShot((camera, t) => {
      const fairy = lab.fairy.position
      forward.set(0, 0, -1).applyQuaternion(lab.fairy.quaternion)
      up.copy(fairy).sub(centre).normalize()
      // The limb of the Moon ahead: the Moon is small, so its edge is far below the horizontal.
      forward.addScaledVector(up, -forward.dot(up)).normalize()
      const dip = Math.acos(Math.min(1, moon.radius / fairy.distanceTo(centre)))
      view.copy(forward).multiplyScalar(Math.cos(dip)).addScaledVector(up, -Math.sin(dip)).multiplyScalar(0.55)
        .addScaledVector(earth.group.position.clone().sub(fairy).normalize(), 0.45).normalize()
      goal.copy(fairy).addScaledVector(view, -8).addScaledVector(up, 1.2)
      look.copy(fairy).addScaledVector(view, 14)
      if (shotLast < 0 || t < shotLast) { camPosition.copy(goal); camLook.copy(look) }
      else {
        const k = 1 - Math.exp(-(t - shotLast) * 3)
        camPosition.lerp(goal, k); camLook.lerp(look, k)
      }
      shotLast = t
      camera.position.copy(camPosition)
      camera.up.copy(up)
      camera.lookAt(camLook)
    })

    // ---- The note: the real sticker note of src/sticker-book.ts, with a speaker mark --------------
    const host = document.createElement('div')
    host.className = 'sticker-book f2-note'
    const colour = `#${new THREE.Color(moon.color).getHexString()}`
    const words = (text: string) => text.split(' ').map(word => `<span>${word}</span>`).join(' ')
    host.innerHTML = `<div id="sticker-toast" role="status" hidden><span class="sticker-toast-art"><span class="planet-picture moon" style="--planet-color:${colour}" aria-hidden="true"></span></span><div>`
      + `<div class="f2-head"><small>NEW STICKER</small><span class="f2-speaker" aria-label="The voice reads the fact"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 4h2.4L6.6 1.4v9.2L3.4 8H1z" fill="currentColor"/></svg><i></i><i></i><i></i><i></i></span></div>`
      + `<h2><span>${sticker.name}</span></h2><p class="f2-fact">${words(sticker.fact)}</p><p class="sticker-toast-next">A new world is waiting in Worlds!</p></div></div>`
    lab.overlay.append(host)
    const toast = host.querySelector<HTMLElement>('#sticker-toast')!
    const speaker = host.querySelector<HTMLElement>('.f2-speaker')!
    const bars = [...speaker.querySelectorAll<HTMLElement>('i')]
    const factWords = [...host.querySelectorAll<HTMLElement>('.f2-fact span')]
    const sentenceBreak = factWords.findIndex(element => element.textContent!.endsWith('.')) + 1
    const timeline = [
      ...timeWords([host.querySelector<HTMLElement>('h2 span')!], PARTS[0].start, PARTS[0].end),
      ...timeWords(factWords.slice(0, sentenceBreak), PARTS[1].start, PARTS[1].end),
      ...timeWords(factWords.slice(sentenceBreak), PARTS[2].start, PARTS[2].end),
    ]

    // ---- The arrival: the same "near" test as the flight panel, on each frame -----------------------
    let arrivedAt = -1, spoken = false, last = -1
    const hold = Math.max(6.5, VOICE_DELAY + LINE_LENGTH + 2)

    return {
      duration: 10,
      still: 5.2,
      update(t) {
        if (t < last) { arrivedAt = -1; spoken = false; shotLast = -1 }
        last = t
        if (arrivedAt < 0 && lab.nearest === moon && lab.fairy.position.distanceTo(centre) - moon.radius < arrivalDistance(sticker)) {
          arrivedAt = t
          chime([659.25, 783.99])
        }
        const age = arrivedAt < 0 ? -1 : t - arrivedAt
        if (!spoken && age >= VOICE_DELAY) { spoken = true; voice(LINE) }
        noteMotion(toast, age, hold)
        // The words: said, now, or later. Before the voice starts, all words are "later".
        const line = age - VOICE_DELAY
        for (const word of timeline) {
          const now = line >= word.start && line < word.end + 0.06
          word.element.classList.toggle('f2-now', now)
          word.element.classList.toggle('f2-later', line < word.start)
        }
        // The speaker mark: the bars move only while the voice speaks a part.
        const talking = PARTS.some(part => line >= part.start && line <= part.end)
        speaker.classList.toggle('is-quiet', line < 0 || line > LINE_LENGTH)
        bars.forEach((bar, index) => {
          const level = talking ? 0.35 + 0.65 * Math.abs(Math.sin(line * (9 + index * 3.1) + index * 1.7)) : 0.3
          bar.style.transform = `scaleY(${level.toFixed(3)})`
        })
      },
      dispose() {},
    }
  },
}
