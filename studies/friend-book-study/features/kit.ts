import * as THREE from 'three'
import type { Lab } from '../../feature-ideas-study/lab'
import { backOut } from '../../feature-ideas-study/features/f1-search-stars'
import { createFriendModel } from '../../../src/friend'
import type { FriendKind } from '../../../src/friend'
import gameStyle from '../../../src/style.css?inline'
import adventureStyle from '../../../src/adventure.css?inline'
import stickerStyle from '../../../src/sticker-book.css?inline'
import friendStyle from '../../../src/friend.css?inline'
import mobileStyle from '../../../src/mobile.css?inline'
import { scopeCss } from '../scope-css.mjs'
import './features.css'

/**
 * The parts that the clips of the friend book study share: a frame with the real CSS of the
 * game, the taps, the motion of a note on the clip clock, and the pictures of the cards.
 */
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
export const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
export const smooth = (x: number) => x * x * (3 - 2 * x)

/** The game CSS files, in the order in which the game loads them. build-artifact.mjs reads the same files. */
export const GAME_CSS_FILES = ['src/style.css', 'src/adventure.css', 'src/sticker-book.css', 'src/friend.css', 'src/mobile.css']

/**
 * The CSS of the game under `.fb-game` (scope-css.mjs). A published copy has it as a fixed style
 * block; on the dev server the page adds it here.
 */
export function addGameStyle() {
  if (document.querySelector('style[data-game-style]')) return
  const style = document.createElement('style')
  style.dataset.gameStyle = ''
  style.textContent = scopeCss([gameStyle, adventureStyle, stickerStyle, friendStyle, mobileStyle].join('\n'))
  document.head.append(style)
}

/**
 * A layer of 1280 × 720 px over the 3D view. It has the size of the clip, and it scales to the
 * live view of the page, so each panel has the same place in the clip and in the live view.
 */
export function createLayer(lab: Lab) {
  addGameStyle()
  const layer = document.createElement('div')
  layer.className = 'fb-layer'
  lab.overlay.append(layer)
  return {
    layer,
    /** Fits the layer to the view. Call it in each frame: the live view can change its size. */
    fit() {
      const scale = (lab.host.clientWidth || 1280) / 1280
      layer.style.transform = `scale(${scale})`
    },
  }
}

/**
 * A screen of the game in the layer: `.fb-game` has the CSS of the game, and its width is the
 * width of the view for the rules of a narrow screen (they are container queries here).
 */
export function createScreen(layer: HTMLElement, width = 1280, height = 720, shellClasses = '') {
  const screen = document.createElement('div')
  screen.className = 'fb-game'
  screen.style.width = `${width}px`
  screen.style.height = `${height}px`
  screen.style.setProperty('--view-width', `${width}px`)
  screen.style.setProperty('--view-height', `${height}px`)
  screen.innerHTML = `<div class="game-shell has-started fb-shell ${shellClasses}"></div>`
  layer.append(screen)
  return { screen, shell: screen.querySelector<HTMLElement>('.fb-shell')! }
}

/** A tap of a finger at a point of the layer: a ring that grows and fades, from the clip time. */
export function createTap(layer: HTMLElement) {
  const ring = document.createElement('div')
  ring.className = 'fb-tap'
  layer.append(ring)
  return (x: number, y: number, age: number) => {
    if (age < 0 || age > 0.7) { ring.style.visibility = 'hidden'; return }
    ring.style.visibility = 'visible'
    ring.style.left = `${x}px`
    ring.style.top = `${y}px`
    ring.style.setProperty('--grow', String(0.75 + age * 1.1))
    ring.style.opacity = String(age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.55)
  }
}

/**
 * The motion of a note from the clip time, as the `friend-note-on` and `sticker-on` keyframes of
 * the game: in with a bounce, out with a fade after `hold` seconds. `base` keeps the transform of
 * the note (the friend note is at the middle of the view).
 */
export function noteAt(element: HTMLElement, age: number, hold: number, base = '') {
  if (age < 0 || age > hold + 0.6) { element.hidden = true; return }
  element.hidden = false
  const e = backOut(Math.min(age / 0.6, 1))
  element.style.animation = 'none'
  element.style.transform = `${base} scale(${1.3 - 0.3 * e}) rotate(${-6 * (1 - e)}deg)`
  element.style.opacity = String(Math.min(age / 0.3, 1) * (age > hold ? 1 - (age - hold) / 0.6 : 1))
}

/** A panel that opens with a short fade and a small rise, and closes with a fade. */
export function panelAt(element: HTMLElement, open: number, close: number, t: number, base = '') {
  const shown = t >= open && t < close + 0.2
  element.style.visibility = shown ? 'visible' : 'hidden'
  if (!shown) return
  const k = t < close ? smooth(ramp(t, open, open + 0.25)) : 1 - ramp(t, close, close + 0.2)
  element.style.opacity = String(k)
  element.style.transform = `${base} translateY(${(1 - k) * 12}px) scale(${0.98 + 0.02 * k})`
}

/** The heart of a hello, as an SVG. */
export const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>'

/** Five hearts for the count of the hellos before the gift. `full` hearts are pink. */
export function heartsHtml() {
  return `<span class="fb-hearts" aria-label="Hellos">${Array.from({ length: 5 }, () => `<i>${HEART}</i>`).join('')}</span>`
}
export function setHearts(root: HTMLElement, full: number, pulse = -1) {
  root.querySelectorAll<HTMLElement>('.fb-hearts i').forEach((heart, index) => {
    heart.classList.toggle('is-full', index < full)
    heart.style.transform = index === full - 1 && pulse >= 0 && pulse < 0.6 ? `scale(${1 + Math.sin(pulse / 0.6 * Math.PI) * 0.45})` : ''
  })
}

// ---- The pictures of the cards -------------------------------------------------------------------

/**
 * A picture of a kind from its friend model (createFriendModel() of src/friend.ts) with a clear
 * background, for a card. `shadow` gives a soft shadow of the shape, for a kind that she did not
 * meet. The bubble is left out: the card shows the creature. The light is the light of friendPicture().
 */
export function kindPicture(renderer: THREE.WebGLRenderer, kind: FriendKind, shadow = false, size = 160) {
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcbb9a6, 2.3))
  const key = new THREE.DirectionalLight(0xfff4e4, 1.5)
  key.position.set(2, 3, 4)
  scene.add(key)
  const model = createFriendModel(kind, null)
  model.animate(0, { loop: 0, still: true, fast: false, light: 1 })
  model.root.traverse(object => { if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) object.visible = false })
  model.root.rotation.y = 0.6
  scene.add(model.root)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30)
  camera.position.set(0, 0.25, 2.6)
  camera.lookAt(0, 0, 0)
  const target = new THREE.WebGLRenderTarget(size, size, { samples: 4 })
  const before = renderer.getRenderTarget(), clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha()
  renderer.setRenderTarget(target)
  renderer.setClearColor(0x000000, 0)
  renderer.clear()
  renderer.render(scene, camera)
  const pixels = new Uint8Array(size * size * 4)
  renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels)
  renderer.setRenderTarget(before)
  renderer.setClearColor(clear, alpha)
  target.dispose(); model.dispose(); key.dispose()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!
  const image = context.createImageData(size, size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const from = ((size - 1 - y) * size + x) * 4, to = (y * size + x) * 4
    const a = pixels[from + 3] / 255
    if (shadow) {
      // The shadow: one soft lilac colour with the shape of the model.
      image.data.set([112, 96, 150, Math.round(a * 150)], to)
      continue
    }
    // The texture is linear and has its first row at the bottom. The edge has the colour times its cover.
    for (let c = 0; c < 3; c++) image.data[to + c] = a > 0 ? Math.round(255 * Math.pow(Math.min(1, pixels[from + c] / 255 / a), 1 / 2.2)) : 0
    image.data[to + 3] = pixels[from + 3]
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

/** The pictures of the nine kinds, in colour and as a shadow. Make them in update(), not in create(). */
export function createPictures(renderer: THREE.WebGLRenderer) {
  const colour = new Map<FriendKind, string>(), shadow = new Map<FriendKind, string>()
  return {
    colour(kind: FriendKind) { if (!colour.has(kind)) colour.set(kind, kindPicture(renderer, kind)); return colour.get(kind)! },
    shadow(kind: FriendKind) { if (!shadow.has(kind)) shadow.set(kind, kindPicture(renderer, kind, true)); return shadow.get(kind)! },
  }
}
export type Pictures = ReturnType<typeof createPictures>

/** Fills each `img[data-picture]` under `root`: the value is "<kind>" or "<kind>:shadow". */
export function fillPictures(root: HTMLElement, pictures: Pictures) {
  root.querySelectorAll<HTMLImageElement>('img[data-picture]').forEach(img => {
    const [kind, mode] = img.dataset.picture!.split(':') as [FriendKind, string?]
    img.src = mode === 'shadow' ? pictures.shadow(kind) : pictures.colour(kind)
    delete img.dataset.picture
  })
}
