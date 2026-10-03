import * as THREE from 'three'
import { createElement, Camera, Check, Download, Share } from 'lucide'
import type { Feature } from '../lab'
import { chime } from './sound'
import { groundRail } from './path'
import '../../../src/adventure.css'
import './f5-postcard.css'

/**
 * F5 · Postcard camera. A round camera button sits beside the toolbar. A tap gives a soft
 * white flash, and the view becomes a postcard: the picture with a white border, the name
 * of the world and its sticker. "Save" keeps it in Photos. The flight goes on behind the card.
 */
const COTTAGE = new THREE.Vector3(0, -1, 0)
/** The door of the cottage faces the local +z direction. */
const FRONT = new THREE.Vector3(0, 0, 1)
const TAP = 2.7, SHUTTER = 3.0, CARD_IN = 3.5, SAVE_TAP = 6.5, SAVED = 6.8, CARD_OUT = 8.6

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const easeBack = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2)

export const postcard: Feature = {
  id: 'F5',
  create(lab) {
    const { home } = lab
    // The fairy glides to the cottage from the front, then goes past it on the left.
    lab.setRail(home, groundRail(lab, home, COTTAGE, FRONT, [[42, 9, 6.5], [30, 9, 6], [20, 10, 6], [10, 12, 6.5], [0, 13, 7], [-10, 11, 7], [-18, 5, 7.5]]))
    lab.setFollow(7.5, 2.4)

    // The layer is 1280 × 720, as the capture page, and scales to the stage.
    const root = document.createElement('div')
    root.className = 'f5-root'
    root.innerHTML = `
      <div class="f5-scrim"></div>
      <div class="f5-flash"></div>
      <button class="f5-camera" type="button" tabindex="-1" aria-label="Take a postcard"></button>
      <div class="f5-card">
        <figure class="f5-postcard">
          <img alt="The view of the fairy at Blossom Haven">
          <figcaption><span>Blossom Haven</span><small>A POSTCARD FROM YOUR JOURNEY</small></figcaption>
          <i class="f5-stamp"><span class="planet-picture fairy" style="--planet-color:#f3acd1" aria-hidden="true">✿</span></i>
        </figure>
        <div class="f5-actions">
          <button class="f5-save" type="button" tabindex="-1"><span class="f5-save-icon"></span>Save</button>
          <button class="f5-share" type="button" tabindex="-1"></button>
        </div>
        <p class="f5-saved"></p>
      </div>
      <i class="f5-touch"></i>`
    const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!
    const camera = get('.f5-camera'), scrim = get('.f5-scrim'), flash = get('.f5-flash'), card = get('.f5-card')
    const figure = get('.f5-postcard'), photo = get<HTMLImageElement>('.f5-postcard img'), save = get('.f5-save'), saved = get('.f5-saved'), touch = get('.f5-touch')
    camera.append(createElement(Camera))
    get('.f5-save-icon').append(createElement(Download))
    get('.f5-share').append(createElement(Share), document.createTextNode('Share'))
    saved.append(createElement(Check), document.createTextNode('Saved to Photos'))
    lab.overlay.append(root)

    let taken = false, chimed = 0, last = -1

    /** A finger tap: a soft dot that presses and a ring that grows. */
    function showTouch(t: number, at: number, x: number, y: number) {
      const age = t - at
      if (age < -0.25 || age > 0.6) return false
      const press = age < 0 ? 1 + age / 0.25 * 0.5 : 1
      touch.style.left = `${x}px`; touch.style.top = `${y}px`
      touch.style.opacity = String(age < 0 ? (age + 0.25) / 0.25 : 1 - age / 0.6)
      touch.style.setProperty('--press', String(press))
      touch.style.setProperty('--ring', String(1 + Math.max(0, age) * 3.2))
      return true
    }

    return {
      duration: 10.5,
      still: 7.4,
      update(t) {
        if (t < last) { taken = false; chimed = 0 }
        last = t
        root.style.transform = `scale(${lab.overlay.clientWidth / 1280})`

        // The camera button: a soft gold pulse first, then the active look after the tap.
        const pressed = t >= TAP && t < TAP + 0.25
        camera.classList.toggle('is-active', t >= TAP && t < CARD_OUT + 0.6)
        camera.style.transform = `scale(${pressed ? 0.9 : 1})`
        camera.style.setProperty('--pulse', String(t < TAP ? 0.5 + 0.5 * Math.sin(t * 4) : 0))
        let touching = showTouch(t, TAP, 1062, 663)

        // The shutter: the frame on the canvas is the last frame of the game, without the overlay.
        if (t >= SHUTTER && !taken) {
          taken = true
          photo.src = lab.renderer.domElement.toDataURL('image/jpeg', 0.9)
        }
        if (t >= SHUTTER && chimed < 1) { chimed = 1; chime([1318.51, 1975.53], 0.04) }
        flash.style.opacity = String(t < SHUTTER ? 0 : Math.max(0, 0.9 * (1 - (t - SHUTTER) / 0.55)))

        // The card slides up with a small spin and rests at a tilt. It leaves to the camera button.
        const enter = easeBack(ramp(t, CARD_IN, CARD_IN + 0.8)), leave = easeOut(ramp(t, CARD_OUT, CARD_OUT + 0.7))
        const shown = t >= CARD_IN && t < CARD_OUT + 0.7
        card.style.visibility = shown ? 'visible' : 'hidden'
        card.style.opacity = String(Math.min(ramp(t, CARD_IN, CARD_IN + 0.25), 1 - leave))
        const x = leave * 420, y = (1 - enter) * 420 + leave * 290, turn = (1 - enter) * 9 - 3 + leave * 10, size = 1 - leave * 0.85
        card.style.transform = `translate(${x}px, ${y}px) scale(${size})`
        figure.style.transform = `rotate(${turn}deg)`
        // The flight goes on behind the card, soft and dim.
        scrim.style.opacity = String(Math.min(ramp(t, CARD_IN - 0.2, CARD_IN + 0.5), 1 - ramp(t, CARD_OUT, CARD_OUT + 0.8)))

        // One press of Save, then a small note.
        touching = showTouch(t, SAVE_TAP, 578, 518) || touching
        save.style.transform = `scale(${t >= SAVE_TAP && t < SAVE_TAP + 0.2 ? 0.93 : 1})`
        save.classList.toggle('is-done', t >= SAVED)
        if (t >= SAVED && chimed < 2) { chimed = 2; chime([783.99, 1046.5], 0.045) }
        const note = ramp(t, SAVED, SAVED + 0.35)
        saved.style.opacity = String(note)
        saved.style.transform = `translateY(${(1 - easeOut(note)) * 10}px)`
        touch.style.visibility = touching ? 'visible' : 'hidden'
      },
      dispose() {
        root.remove()
      },
    }
  },
}
