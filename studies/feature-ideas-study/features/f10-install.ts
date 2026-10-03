import { createElement, BatteryMedium, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pause, Plane, WifiOff } from 'lucide'
import type { Feature } from '../lab'
import { chime } from './sound'
import { groundRail, tangentOf } from './path'
import './f10-install.css'

/**
 * F10 · Install and fly offline. A mock, because a real install cannot be filmed. An iPad is
 * in airplane mode. A tap on the game icon of the home screen opens the splash screen, then
 * the game: the fairy flies over the meadow with no Wi-Fi. The screen of the iPad is open,
 * so the live lab shows through it.
 */
/** The iPad, on the 1280 × 720 layer: the outer edge, the bezel and the screen. */
const DEVICE = { left: 210, top: 54, width: 860, height: 612, radius: 42, bezel: 20 }
const SCREEN = { width: DEVICE.width - DEVICE.bezel * 2, height: DEVICE.height - DEVICE.bezel * 2 }
/** The game icon: the centre of its tile on the screen. */
const ICON = { x: 352, y: 214, size: 68 }
const TAP = 1.7, OPEN = 1.95, SPLASH = 2.55, GAME = 4.5, NOTE = 5.5

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const easeInOut = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

/** The rest of the stage, round the outer edge of the iPad: a path with a hole (even-odd rule). */
function frameClip() {
  const { left, top, width, height, radius: r } = DEVICE, right = left + width, bottom = top + height
  return `path(evenodd, 'M0 0 H1280 V720 H0 Z M${left + r} ${top} H${right - r} A${r} ${r} 0 0 1 ${right} ${top + r} V${bottom - r} A${r} ${r} 0 0 1 ${right - r} ${bottom} H${left + r} A${r} ${r} 0 0 1 ${left} ${bottom - r} V${top + r} A${r} ${r} 0 0 1 ${left + r} ${top} Z')`
}

export const installOffline: Feature = {
  id: 'F10',
  create(lab) {
    const { earth, meadowLocal } = lab
    lab.setRail(earth, groundRail(lab, earth, meadowLocal, tangentOf(meadowLocal, 0.4), [[-20, 0, 7], [10, 2, 6.5], [40, -2, 7.5], [70, 3, 8], [95, 0, 7]]))
    lab.setFollow(7.5, 2.4)

    // Plain app tiles, with no names and no marks of real apps. The game icon is in the second row.
    const tiles = Array.from({ length: 18 }, (_, index) => index === 8
      ? `<span class="f10-app f10-game-app"><i class="f10-icon"><b class="f10-wings"><i></i><i></i><i></i><i></i><i></i></b><em></em></i><small>Fly to the Moon</small></span>`
      : `<span class="f10-app"><i class="f10-tile f10-tile-${index % 6}"></i><small></small></span>`).join('')
    const root = document.createElement('div')
    root.className = 'f10-root'
    root.innerHTML = `
      <div class="f10-room" style="clip-path:${frameClip()}"></div>
      <div class="f10-device">
        <div class="f10-screen">
          <div class="f10-home">
            <div class="f10-grid">${tiles}</div>
            <div class="f10-dock">${Array.from({ length: 5 }, (_, index) => `<i class="f10-tile f10-tile-${(index * 2 + 1) % 6}"></i>`).join('')}</div>
          </div>
          <div class="f10-game-ui" aria-hidden="true">
            <span class="f10-worlds"><b>◉</b> Worlds <small>3/13</small></span>
            <span class="f10-round f10-pause"></span>
            <span class="f10-arrows"><i></i><i></i><i></i><i></i></span>
            <span class="f10-round f10-boost">Boost</span>
          </div>
          <div class="f10-splash">
            <div class="f10-splash-brand"><b class="f10-mark f10-mark-large"><i></i><i></i><i></i></b><p>A SMALL JOURNEY</p><h2>Fly me to the moon</h2></div>
          </div>
          <div class="f10-note"></div>
          <div class="f10-status"><span>10:30&nbsp;&nbsp;Fri 3 Oct</span><span class="f10-status-right"></span></div>
          <i class="f10-touch"></i>
        </div>
        <i class="f10-lens"></i>
      </div>`
    const get = (selector: string) => root.querySelector<HTMLElement>(selector)!
    const home = get('.f10-home'), splash = get('.f10-splash'), brand = get('.f10-splash-brand'), gameUi = get('.f10-game-ui')
    const note = get('.f10-note'), touch = get('.f10-touch'), gameApp = get('.f10-game-app .f10-icon')
    // The status bar: airplane mode, no Wi-Fi mark, and the battery.
    get('.f10-status-right').append(createElement(Plane), document.createTextNode('82%'), createElement(BatteryMedium))
    note.append(createElement(WifiOff), document.createTextNode('No Wi-Fi · still flying'))
    get('.f10-pause').append(createElement(Pause))
    const arrows = [...root.querySelectorAll<HTMLElement>('.f10-arrows i')]
    ;[ChevronUp, ChevronLeft, ChevronRight, ChevronDown].forEach((icon, index) => arrows[index].append(createElement(icon)))
    lab.overlay.append(root)

    // The capture page shows the game HUD round the lab: hide it while F10 runs.
    const shell = lab.host.parentElement
    const hud = shell?.classList.contains('game-shell') ? [...shell.children].filter((element): element is HTMLElement => element !== lab.host && element instanceof HTMLElement) : []
    const hudVisibility = hud.map(element => element.style.visibility)
    hud.forEach(element => { element.style.visibility = 'hidden' })

    let chimed = 0, last = -1
    return {
      duration: 11,
      still: 7.2,
      update(t) {
        if (t < last) chimed = 0
        last = t
        root.style.transform = `scale(${lab.overlay.clientWidth / 1280})`

        // (a) The home screen, then (b) a finger tap on the game icon.
        home.style.visibility = t < SPLASH + 0.1 ? 'visible' : 'hidden'
        home.style.transform = `scale(${1 + easeOut(ramp(t, OPEN, SPLASH)) * 0.08})`
        home.style.filter = `blur(${ramp(t, OPEN, SPLASH) * 6}px)`
        const age = t - TAP
        const touching = age > -0.3 && age < 0.6
        touch.style.visibility = touching ? 'visible' : 'hidden'
        if (touching) {
          touch.style.left = `${ICON.x}px`; touch.style.top = `${ICON.y}px`
          touch.style.opacity = String(age < 0 ? (age + 0.3) / 0.3 : 1 - age / 0.6)
          touch.style.setProperty('--press', String(age < 0 ? 1.4 + age : 1))
          touch.style.setProperty('--ring', String(1 + Math.max(0, age) * 3))
        }
        gameApp.style.transform = `scale(${age >= 0 && age < 0.25 ? 0.9 : 1})`
        gameApp.style.filter = `brightness(${age >= 0 && age < 0.25 ? 0.8 : 1})`

        // (c) The app opens from its icon to the full screen: the splash screen.
        const open = easeInOut(ramp(t, OPEN, SPLASH))
        const scale = ICON.size / SCREEN.width + (1 - ICON.size / SCREEN.width) * open
        splash.style.visibility = t >= OPEN && t < GAME + 0.7 ? 'visible' : 'hidden'
        splash.style.transform = `translate(${(ICON.x - SCREEN.width / 2) * (1 - open)}px, ${(ICON.y - SCREEN.height / 2) * (1 - open)}px) scale(${scale})`
        splash.style.borderRadius = `${(1 - open) * 180 + 22}px`
        splash.style.opacity = String(1 - ramp(t, GAME, GAME + 0.6))
        brand.style.opacity = String(ramp(t, SPLASH - 0.1, SPLASH + 0.5))
        brand.style.transform = `translateY(${(1 - easeOut(ramp(t, SPLASH - 0.1, SPLASH + 0.7))) * 12}px)`
        if (t >= SPLASH && chimed < 1) { chimed = 1; chime([659.25, 880], 0.04) }

        // (d) The game, full screen in the iPad: the live lab shows through the open screen.
        const play = ramp(t, GAME + 0.2, GAME + 0.8)
        gameUi.style.opacity = String(play)
        const noteShow = ramp(t, NOTE, NOTE + 0.5)
        note.style.opacity = String(noteShow)
        note.style.transform = `translate(-50%, ${(1 - easeOut(noteShow)) * -10}px)`
        if (t >= NOTE && chimed < 2) { chimed = 2; chime([783.99, 987.77], 0.035) }
      },
      dispose() {
        root.remove()
        hud.forEach((element, index) => { element.style.visibility = hudVisibility[index] })
      },
    }
  },
}
