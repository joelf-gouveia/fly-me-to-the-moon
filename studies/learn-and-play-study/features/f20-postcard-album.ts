import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { creaturePass, grab, overlay, ramp, smooth, worldPicture } from './shared'

/**
 * F20 · Postcard album. The postcard camera of the game saves a file and keeps no picture. The
 * album keeps the postcards in the game, and it asks for pictures: "a duck", "the Moon", "a
 * rainbow". A picture that shows the thing goes into its place. The clip takes the picture of a
 * duck. The album stays on the device, as the postcards do.
 */
export const ALBUM: { id: string; icon: string; name: string }[] = [
  { id: 'moon', icon: '🌙', name: 'The Moon' },
  { id: 'duck', icon: '🦆', name: 'A duck' },
  { id: 'rainbow', icon: '🌈', name: 'A rainbow' },
  { id: 'unicorn', icon: '🦄', name: 'A unicorn' },
  { id: 'rings', icon: '🪐', name: 'The rings' },
]
/** The largest number of pictures that the album keeps, so a phone does not fill up. */
export const ALBUM_LIMIT = 24
const PASS = 5.6, SNAP = PASS - 0.1, CARD_FOR = 2.1, DISTANCE = 12

export const postcardAlbum: Feature = {
  id: 'F20',
  create(lab) {
    const { earth } = lab
    const pass = creaturePass(lab, earth, ['duck'], PASS, { alt: 2.8, view: 6.2 })
    const root = overlay(lab, `
      <div class="f20-flash"></div>
      <div class="f20-post"><img alt=""><b>A duck!</b></div>
      <div class="lp-strip"><div class="lp-strip-title"><small>POSTCARD ALBUM</small><b id="f20-count"></b></div>${ALBUM.map(item => `<div class="lp-slot-wrap"><div class="lp-slot f20-slot is-empty" data-album="${item.id}"><span>${item.icon}</span></div><em>${item.name}</em></div>`).join('')}</div>`)
    const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!
    const flash = get('.f20-flash'), post = get('.f20-post'), count = get('#f20-count')
    const slot = (id: string) => get(`[data-album="${id}"]`)
    const fill = (id: string, picture: string) => { slot(id).innerHTML = `<img alt="" src="${picture}"><span class="f20-tick">✅</span>`; slot(id).classList.replace('is-empty', 'is-full') }
    const empty = (id: string) => { slot(id).innerHTML = `<span>${ALBUM.find(item => item.id === id)!.icon}</span>`; slot(id).classList.replace('is-full', 'is-empty') }
    let frames = 0, moon = false, takenAt = -1, placed = false, last = -1

    return {
      duration: 10,
      still: 6.6,
      update(t) {
        if (t < last) { takenAt = -1; placed = false; empty('duck') }
        last = t
        // The album of the clip has one picture: the Moon, from an earlier flight.
        if (!moon && ++frames > 1) { moon = true; fill('moon', worldPicture(lab, lab.moon, 0.8)) }
        // The camera: the picture is the 3D view, with no panels and no buttons.
        if (takenAt < 0 && (lab.mode === 'clip' ? t >= SNAP : pass.distance(t) < DISTANCE)) {
          takenAt = t
          post.querySelector('img')!.src = grab(lab, 640, true)
          chime([1318.5, 1568], 0.05)
        }
        const age = takenAt < 0 ? -1 : t - takenAt
        flash.style.opacity = String(age < 0 ? 0 : Math.max(0, 1 - age / 0.35) * 0.9)
        // The postcard shows, then it gets small and goes down to its place in the album.
        const leave = smooth(ramp(age, CARD_FOR, CARD_FOR + 0.6))
        post.style.visibility = age < 0.1 || leave >= 1 ? 'hidden' : 'visible'
        post.style.opacity = String(Math.min(1, ramp(age, 0.1, 0.35)) * (1 - leave * 0.3))
        post.style.transform = `translate(${-6.6 * leave}em, ${15 * leave}em) rotate(${-3 + leave * 3}deg) scale(${(0.75 + 0.25 * smooth(ramp(age, 0.1, 0.5))) * (1 - leave * 0.82)})`
        if (age > CARD_FOR + 0.55 && !placed) {
          placed = true
          fill('duck', post.querySelector('img')!.src)
          chime([783.99, 1046.5], 0.05)
        }
        const since = age - CARD_FOR - 0.55
        slot('duck').style.transform = placed && since < 0.5 ? `scale(${1 + Math.sin(since * Math.PI * 2) * 0.3})` : ''
        count.textContent = `${placed ? 2 : 1} of ${ALBUM.length}`
      },
      dispose() {},
    }
  },
}
