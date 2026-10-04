import * as THREE from 'three'
import { Camera, Check, createElement, Download, Share } from 'lucide'
import type { World } from './worlds'
import { worldPicture } from './sticker-book'
import { drawPostcard, POSTCARD_LINE, postcardFileName, postcardLayout, postcardTitle } from './postcard'
import './postcard.css'

type Actions = {
  open: (open: boolean) => void
  /**
   * Renders a new frame and gives the canvas of the renderer. The renderer clears its
   * picture after each frame, so the camera reads the canvas in the same call.
   */
  capture: () => HTMLCanvasElement
  /** The nearest world: the name and the stamp of the card. */
  world: () => World
  /** The soft shutter sound, when the sound is on. */
  shutter: () => void
}

/** Waits for the fonts of the card, but not for long: the card can use the fallback fonts. */
function cardFonts() {
  if (!document.fonts) return Promise.resolve()
  const loads = Promise.all(['64px Italiana', '18px "DM Mono"'].map(font => document.fonts.load(font))).catch(() => [])
  return Promise.race([loads, new Promise(resolve => setTimeout(resolve, 1500))])
}

/**
 * The camera button and the postcard: F5 of docs/feature-ideas-study.md. A tap takes a
 * picture of the 3D view. A soft white flash, then the postcard shows with Save and Share.
 * Nothing leaves the device without a tap.
 */
export function createPostcardCamera(actions: Actions) {
  const button = document.createElement('button')
  Object.assign(button, { id: 'postcard-toggle', type: 'button', className: 'icon-button' })
  button.ariaLabel = 'Take a postcard'
  button.title = 'Postcard'
  button.setAttribute('aria-haspopup', 'dialog')
  button.append(createElement(Camera))
  document.querySelector('#customize-toggle')!.after(button)

  const host = document.createElement('div')
  host.className = 'postcard'
  host.innerHTML = `
    <dialog id="postcard" aria-labelledby="postcard-title" aria-describedby="postcard-line">
      <div class="postcard-card">
        <figure class="postcard-figure">
          <div class="postcard-photo"></div>
          <figcaption><span><b id="postcard-title"></b><small id="postcard-line">${POSTCARD_LINE}</small></span><i class="postcard-stamp"></i></figcaption>
        </figure>
        <button id="close-postcard" type="button" aria-label="Close the postcard">×</button>
      </div>
      <div class="postcard-actions">
        <button id="postcard-save" type="button"></button>
        <button id="postcard-share" type="button" hidden></button>
      </div>
      <p id="postcard-status" role="status"></p>
    </dialog>`
  document.querySelector('.game-shell')!.append(host)
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!
  const dialog = get<HTMLDialogElement>('postcard'), save = get<HTMLButtonElement>('postcard-save'), share = get<HTMLButtonElement>('postcard-share')
  const status = get('postcard-status'), photoHost = host.querySelector<HTMLElement>('.postcard-photo')!
  save.append(createElement(Download), document.createTextNode('Save'))
  share.append(createElement(Share), document.createTextNode('Share'))

  const state = { open: false, world: null as string | null, file: null as string | null, shots: 0, saved: 0, shared: 0, ready: false, share: false, width: 0, height: 0 }
  let card: Promise<File | null> = Promise.resolve(null)
  let opener: HTMLElement = button

  function showStatus(text: string) {
    status.replaceChildren()
    if (text) status.append(createElement(Check), document.createTextNode(text))
  }

  /** Takes the picture and opens the postcard. */
  function take() {
    if (dialog.open) return
    if (document.activeElement instanceof HTMLElement) opener = document.activeElement
    // Render and read the canvas in the same call, before the browser clears it.
    const source = actions.capture()
    const layout = postcardLayout(source.width, source.height)
    const photo = document.createElement('canvas')
    photo.width = layout.photo.width
    photo.height = layout.photo.height
    const context = photo.getContext('2d')!
    context.imageSmoothingQuality = 'high'
    context.drawImage(source, layout.crop.x, layout.crop.y, layout.crop.width, layout.crop.height, 0, 0, photo.width, photo.height)
    actions.shutter()

    const world = actions.world(), title = postcardTitle(world.kind), file = postcardFileName(world.name)
    Object.assign(state, { world: world.name, file, shots: state.shots + 1, ready: false, share: false, width: layout.width, height: layout.height })
    photo.setAttribute('role', 'img')
    photo.ariaLabel = `The picture of the flight at ${title}`
    photoHost.replaceChildren(photo)
    photoHost.style.setProperty('--aspect', String(layout.photo.width / layout.photo.height))
    get('postcard-title').textContent = title
    host.querySelector('.postcard-stamp')!.innerHTML = worldPicture([world], world.kind)
    showStatus('')
    share.hidden = true

    // The saved card is a PNG of the whole card, drawn on a 2D canvas.
    const color = `#${new THREE.Color(world.color).getHexString()}`
    card = cardFonts().then(() => new Promise<File | null>(resolve => {
      const canvas = document.createElement('canvas')
      canvas.width = layout.width
      canvas.height = layout.height
      drawPostcard(canvas.getContext('2d')!, layout, photo, { id: world.kind, title, color })
      canvas.toBlob(blob => resolve(blob ? new File([blob], file, { type: 'image/png' }) : null), 'image/png')
    }))
    const shot = state.shots
    void card.then(made => {
      if (shot !== state.shots || !dialog.open) return
      state.ready = !!made
      // Share shows only where the device can share a picture file.
      state.share = !!made && typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [made] })
      share.hidden = !state.share
    })

    dialog.showModal()
    state.open = true
    button.classList.add('is-active')
    actions.open(true)
    save.focus()
  }

  async function saveCard() {
    // Save waits for the card, which is ready a moment after the picture.
    const made = await card
    if (!made || !dialog.open) return
    const url = URL.createObjectURL(made)
    const link = Object.assign(document.createElement('a'), { href: url, download: made.name })
    link.click()
    // The download reads the picture after the click, so keep the address for a moment.
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    state.saved++
    showStatus('Saved to Downloads')
  }

  async function shareCard() {
    const made = await card
    if (!made || !dialog.open) return
    try {
      await navigator.share({ files: [made], title: `A postcard from ${get('postcard-title').textContent}` })
      state.shared++
      showStatus('Shared')
    } catch {
      // The grown-up closed the share sheet, or the device cannot share now. Nothing left the device.
    }
  }

  // The dialog fires "close" later, as a task, so a close from the button tells the game at once.
  function closed() {
    if (!state.open) return
    state.open = false
    button.classList.remove('is-active')
    photoHost.replaceChildren()
    actions.open(false)
    // On a touch screen the camera is in Menu, which is closed now: the focus goes to Menu.
    const back = opener.isConnected && opener.checkVisibility?.() !== false ? opener : document.querySelector<HTMLElement>('#menu-toggle') ?? button
    back.focus()
  }
  function close() { if (dialog.open) dialog.close(); closed() }

  button.addEventListener('click', take)
  get('close-postcard').addEventListener('click', close)
  save.addEventListener('click', () => void saveCard())
  share.addEventListener('click', () => void shareCard())
  dialog.addEventListener('close', closed)
  // A press that starts and ends outside the card closes it, as Settings does.
  let backdropPress = false
  dialog.addEventListener('pointerdown', event => { backdropPress = event.target === dialog })
  dialog.addEventListener('click', event => {
    if (event.target === dialog && backdropPress) close()
    backdropPress = false
  })

  return {
    close,
    get isOpen() { return dialog.open },
    /** The state for the test snapshot. */
    get state() { return { ...state } },
  }
}
