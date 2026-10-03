import * as THREE from 'three'
import type { Feature } from '../lab'
import { chime } from './sound'
import { groundRail } from './path'
import '../../../src/settings.css'
import './f9-bedtime.css'

/**
 * F9 · Bedtime timer. A grown-up sets "Time to rest" in Settings (Off, 10, 20 or 30 minutes).
 * When the time comes, a gentle note asks the fairy to fly home. The fireflies of the flower
 * guide lead her to the cottage, she slows down at the door, the screen dims, and a
 * "Good night" card shows. The game never shows a countdown.
 */
const COTTAGE = new THREE.Vector3(0, -1, 0)
/** The door of the cottage faces the local +z direction. */
const FRONT = new THREE.Vector3(0, 0, 1)
const DURATION = 12
/** The Sun is this many degrees under the horizon of the cottage: dusk, with lit windows. */
const DUSK = -3
const NOTE_IN = 2.1, NOTE_OUT = 6.6, GUIDE_IN = 2.6, DIM_IN = 8.2, CARD_IN = 9.1

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
const smooth = (x: number) => x * x * (3 - 2 * x)
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)

/** The speed of the fairy on the way home: a calm glide, then slower and slower at the door. */
function speedAt(t: number) {
  return THREE.MathUtils.lerp(1, 0.04, smooth(ramp(t, 4.6, 8.6)))
}

export const bedtime: Feature = {
  id: 'F9',
  create(lab) {
    const { home } = lab
    // The cottage is at the south pole, on the axis of the spin, so setSunElevation() cannot move
    // its Sun. Tip the whole world a little, so the Sun at the cottage is just under the horizon.
    const savedQuaternion = home.group.quaternion.clone()
    const center = home.group.position, toSun = lab.sun.group.position.clone().sub(center).normalize()
    const normal = COTTAGE.clone().applyQuaternion(savedQuaternion)
    const across = normal.clone().addScaledVector(toSun, -normal.dot(toSun)).normalize()
    const goal = across.multiplyScalar(Math.cos(THREE.MathUtils.degToRad(DUSK))).addScaledVector(toSun, Math.sin(THREE.MathUtils.degToRad(DUSK)))
    home.group.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(normal, goal))
    home.group.updateMatrixWorld(true)

    // The way home: she flies across the meadow, turns to the cottage, and stops at the door.
    const stops: [number, number, number][] = [[46, -34, 7.5], [42, -21, 7.5], [35, -10, 7], [26, -3, 6], [17, -1, 4.8], [11.5, -2.6, 3.8], [9, -3.2, 3.4]]
    const path = new THREE.CatmullRomCurve3(groundRail(lab, home, COTTAGE, FRONT, stops).map(point => lab.surfacePoint(home, point.dir, point.alt)), false, 'centripetal')
    const length = path.getLength()
    // Short rails with a constant speed each give the slow-down: the rail of the lab moves at one speed.
    const steps = 60, times: number[] = [], places: number[] = [0]
    for (let i = 0; i <= steps; i++) times.push(i / steps * DURATION)
    for (let i = 1; i <= steps; i++) places.push(places[i - 1] + speedAt((times[i - 1] + times[i]) / 2))
    const total = places[steps]
    const placeAt = (t: number) => {
      const index = Math.min(steps - 1, Math.floor(t / DURATION * steps))
      const into = clamp01((t - times[index]) / (times[index + 1] - times[index]))
      return THREE.MathUtils.lerp(places[index], places[index + 1], into) / total
    }
    for (let i = 0; i < steps; i++) {
      const points = [0, 1, 2, 3].map(k => path.getPointAt(THREE.MathUtils.lerp(places[i], places[i + 1], k / 3) / total))
      lab.setRailPoints(home, points, times[i], times[i + 1])
    }
    lab.setFollow(7.5, 2.6)

    // The fireflies of the flower guide (createGuideFireflies() in src/adventure.ts), on the path ahead.
    const fireflyCount = 24
    const fireflyPositions = new Float32Array(fireflyCount * 3)
    const fireflyGeometry = new THREE.BufferGeometry()
    fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3))
    const fireflyMaterial = new THREE.PointsMaterial({ color: 0xffdfbb, map: lab.softDisc(), size: 0.8, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })
    const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial)
    fireflies.frustumCulled = false
    lab.scene.add(fireflies)
    const door = lab.surfacePoint(home, lab.stepAlong(home, COTTAGE, FRONT, 4.2), 1.6)
    const up = lab.upAt(home, door), side = new THREE.Vector3(), lift = new THREE.Vector3(), point = new THREE.Vector3(), tangent = new THREE.Vector3()

    // The overlay: the setting, the note, the dim layer and the card. The layer is 1280 × 720.
    const root = document.createElement('div')
    root.className = 'f9-root'
    root.innerHTML = `
      <div class="f9-setting setting">
        <p class="eyebrow">SETTINGS · FOR GROWN-UPS</p>
        <div class="setting-row speed-row-setting">
          <span><b>Time to rest · 20 min</b><small>Then the fairy flies home to sleep. No clock on the screen.</small></span>
          <div class="speed-steps" role="radiogroup" aria-label="Time to rest">
            <button type="button" tabindex="-1" aria-checked="false">Off</button><button type="button" tabindex="-1" aria-checked="false">10</button><button type="button" tabindex="-1" aria-checked="true">20</button><button type="button" tabindex="-1" aria-checked="false">30</button>
          </div>
        </div>
      </div>
      <div class="f9-note" role="status"><span aria-hidden="true">✿</span><p>Time to fly home and rest</p></div>
      <div class="f9-dim"></div>
      <div class="f9-card">
        <div class="f9-sky" aria-hidden="true"><i class="f9-moon"></i>${Array.from({ length: 9 }, () => '<b>✦</b>').join('')}</div>
        <h2>Good night, little fairy</h2>
        <p>Your stickers are safe. See you tomorrow.</p>
      </div>`
    lab.overlay.append(root)
    const get = (selector: string) => root.querySelector<HTMLElement>(selector)!
    const setting = get('.f9-setting'), note = get('.f9-note'), dim = get('.f9-dim'), card = get('.f9-card')
    const stars = [...root.querySelectorAll<HTMLElement>('.f9-sky b')]
    const STAR_PLACES = [[-190, -14, 15], [-150, 40, 10], [-118, -48, 12], [130, -40, 14], [168, 18, 11], [205, -22, 9], [-230, 30, 8], [92, 46, 9], [240, 52, 12]]
    stars.forEach((star, index) => {
      const [x, y, size] = STAR_PLACES[index]
      star.style.left = `calc(50% + ${x}px)`; star.style.top = `${60 + y}px`; star.style.fontSize = `${size}px`
    })

    // The game HUD (the capture page) dims with the screen. The lab page has no HUD.
    const shell = lab.host.parentElement
    const hud = shell?.classList.contains('game-shell') ? [...shell.children].filter((element): element is HTMLElement => element !== lab.host && element instanceof HTMLElement) : []
    const hudOpacity = hud.map(element => element.style.opacity)

    let chimed = 0, last = -1
    return {
      duration: DURATION,
      still: 10.6,
      update(t) {
        if (t < last) chimed = 0
        last = t
        root.style.transform = `scale(${lab.overlay.clientWidth / 1280})`

        // The setting row shows first, for a moment, to say where the grown-up sets the time.
        const settingShow = Math.min(ramp(t, 0.1, 0.45), 1 - ramp(t, 1.5, 1.9))
        setting.style.opacity = String(settingShow)
        setting.style.transform = `translateY(${(1 - easeOut(ramp(t, 0.1, 0.5))) * -12}px)`
        setting.style.visibility = settingShow > 0 ? 'visible' : 'hidden'

        // The note: a flower and one line, as the home-move note of the game.
        const noteShow = Math.min(ramp(t, NOTE_IN, NOTE_IN + 0.5), 1 - ramp(t, NOTE_OUT, NOTE_OUT + 0.6))
        note.style.opacity = String(noteShow)
        note.style.transform = `translate(-50%, ${(1 - easeOut(ramp(t, NOTE_IN, NOTE_IN + 0.6))) * 14}px)`
        if (t >= NOTE_IN && chimed < 1) { chimed = 1; chime([523.25, 659.25], 0.04) }

        // The fireflies: on the path ahead of the fairy. At the end of the path they circle the door.
        const here = placeAt(t)
        for (let i = 0; i < fireflyCount; i++) {
          const ahead = here + (4 + i * 1.9) / length
          if (ahead <= 1) {
            path.getPointAt(ahead, point)
            path.getTangentAt(ahead, tangent)
            side.crossVectors(tangent, lab.upAt(home, point)).normalize()
            lift.copy(lab.upAt(home, point))
            point.addScaledVector(side, Math.sin(i * 0.45 + t * 0.6) * 1.4).addScaledVector(lift, Math.cos(i * 0.5 + t * 0.4) * 0.8)
          } else {
            // A soft ring of light in front of the door.
            const angle = i * 2.4 + t * 0.5
            side.set(1, 0, 0).applyQuaternion(home.group.quaternion)
            lift.crossVectors(up, side)
            point.copy(door).addScaledVector(side, Math.cos(angle) * 2.2).addScaledVector(lift, Math.sin(angle) * 1.2).addScaledVector(up, 0.6 + Math.sin(i + t) * 0.5)
          }
          fireflyPositions.set([point.x, point.y, point.z], i * 3)
        }
        fireflyGeometry.attributes.position.needsUpdate = true
        fireflyMaterial.opacity = 0.9 * ramp(t, GUIDE_IN, GUIDE_IN + 0.8)
        fireflyMaterial.size = 0.8 + Math.sin(t * 3) * 0.08

        // The screen dims softly. Then the card: a moon, stars that twinkle, and two lines.
        const darkness = smooth(ramp(t, DIM_IN, DIM_IN + 1.6))
        dim.style.opacity = String(darkness * 0.86)
        hud.forEach(element => { element.style.opacity = String(1 - darkness * 0.75) })
        const cardShow = easeOut(ramp(t, CARD_IN, CARD_IN + 1))
        card.style.opacity = String(cardShow)
        card.style.transform = `translate(-50%, ${(1 - cardShow) * 18}px)`
        stars.forEach((star, index) => { star.style.opacity = String(cardShow * (0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * (1.6 + index * 0.37) + index * 1.9), 2))) })
        if (t >= CARD_IN && chimed < 2) { chimed = 2; chime([659.25, 523.25, 392], 0.035) }
      },
      dispose() {
        root.remove()
        hud.forEach((element, index) => { element.style.opacity = hudOpacity[index] })
        lab.scene.remove(fireflies)
        fireflyGeometry.dispose(); fireflyMaterial.map?.dispose(); fireflyMaterial.dispose()
        home.group.quaternion.copy(savedQuaternion)
        home.group.updateMatrixWorld(true)
      },
    }
  },
}
