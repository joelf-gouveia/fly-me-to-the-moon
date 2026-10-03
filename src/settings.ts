import { createElement, Settings } from 'lucide'
import { webbImages } from './star-data'
import { STICKERS } from './stickers'
import './settings.css'

type Actions = {
  open: (open: boolean) => void
  stickers: { readonly count: number; readonly stars: number; reset: () => void }
  /** Turns the sound on or off. It gives the state that the browser allows. */
  sound: (on: boolean) => Promise<boolean>
  stars: (show: boolean) => void
  orbits: (show: boolean) => void
  speed: (factor: number) => void
}

const STORAGE_KEY = 'fairy-settings'
export const WORLD_SPEEDS = [1, 8, 16, 32, 64] as const

/** The switches that stay after a reload. Sound needs a tap each visit, and World speed starts at 1×. */
export function parseSettings(value: unknown) {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return { stars: saved.stars === true, orbits: saved.orbits === true }
}

const toggle = (id: string, title: string, note: string) => `
  <label class="setting-row" for="${id}"><span><b>${title}</b><small>${note}</small></span><input id="${id}" type="checkbox" role="switch"><i aria-hidden="true"></i></label>`

/**
 * The gear button and the Settings dialog: the grown-up controls of option C in
 * docs/ui-simplify-study.md. Sound, the sky, the keys, the sticker book and the credits.
 */
export function createSettings(actions: Actions) {
  const button = document.createElement('button')
  Object.assign(button, { id: 'settings-toggle', type: 'button', className: 'icon-button' })
  button.ariaLabel = 'Open settings'
  button.title = 'Settings'
  button.setAttribute('aria-haspopup', 'dialog')
  button.append(createElement(Settings))
  document.querySelector('#customize-toggle')!.after(button)

  const host = document.createElement('div')
  host.className = 'settings'
  host.innerHTML = `
    <dialog id="settings" aria-labelledby="settings-title">
      <header><div><p class="eyebrow">FOR GROWN-UPS</p><h2 id="settings-title">Settings</h2></div><button id="close-settings" type="button" aria-label="Close settings">×</button></header>
      <section class="setting" aria-labelledby="sound-title">
        <h3 id="sound-title">Sound</h3>
        ${toggle('setting-sound', 'Music and chimes', 'A soft hum while she flies. The chime of a new sticker plays only with the sound on.')}
        <p id="sound-status" role="status"></p>
      </section>
      <section class="setting" aria-labelledby="sky-title">
        <h3 id="sky-title">In the sky</h3>
        ${toggle('setting-stars', 'Star pictures', 'Lines and names of the constellations, and the Webb pictures. They show in space, above the air.')}
        ${toggle('setting-orbits', 'Orbit paths', 'A coloured line in the sky for the path of each world. The Worlds map always shows the paths.')}
        <div class="setting-row speed-row-setting"><span><b id="speed-title">World speed</b><small>How fast the worlds go around the Sun. At 1×, one lap of Earth takes about an hour. It starts at 1× at each visit.</small></span>
          <div class="speed-steps" role="radiogroup" aria-labelledby="speed-title">${WORLD_SPEEDS.map((speed, index) => `<button type="button" role="radio" data-speed="${speed}" aria-checked="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${speed}×</button>`).join('')}</div>
        </div>
      </section>
      <section class="setting how-to-fly" aria-labelledby="fly-title">
        <h3 id="fly-title">How to fly</h3>
        <div class="how-keys"><p><kbd>W</kbd> or <kbd>↑</kbd> climb · <kbd>S</kbd> or <kbd>↓</kbd> descend · <kbd>A</kbd> <kbd>D</kbd> or <kbd>←</kbd> <kbd>→</kbd> turn</p><p><kbd>Shift</kbd> boost · <kbd>Q</kbd> hover · <kbd>Space</kbd> pause · let go to cruise</p></div>
        <p class="how-touch">Hold the arrows to steer. Hold Boost to go faster. Tap Hover to stop. While you hover, the arrows turn you to look around. Tap Fly to keep going.</p>
      </section>
      <section class="setting" aria-labelledby="reset-stickers-title">
        <div><h3 id="reset-stickers-title">Sticker book</h3><p id="sticker-summary"></p></div>
        <button id="reset-stickers" type="button">Reset sticker book</button>
        <div id="reset-confirm" class="reset-confirm" role="alertdialog" aria-labelledby="reset-question" aria-describedby="reset-detail" hidden>
          <p id="reset-question"></p>
          <p id="reset-detail">Your child starts again with an empty book, and the worlds close again. This cannot be undone.</p>
          <div><button id="reset-cancel" type="button">Keep the stickers</button><button id="reset-yes" type="button" class="danger">Reset the book</button></div>
        </div>
        <p id="reset-status" role="status"></p>
      </section>
      <details class="sky-credits"><summary>Pictures in the sky: credits</summary>
        <p>Stars: Bright Star Catalog, 5th Revised Edition (Preliminary Version), Hoffleit, D. and Warren, Jr., W. H. (1991), <a href="https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html" target="_blank" rel="noopener">NASA HEASARC</a>. Star names: IAU Working Group on Star Names.</p>
        <p>Space pictures from the James Webb Space Telescope: <a href="https://esawebb.org/copyright/" target="_blank" rel="noopener">ESA/Webb, CC BY 4.0</a>. Resized, with a soft oval edge, and shown much larger than in the real sky.</p>
        <ul>${webbImages.map(image => `<li><b>${image.title}</b>: ${image.credit} <a href="https://esawebb.org/images/${image.id}/" target="_blank" rel="noopener">esawebb.org</a></li>`).join('')}</ul>
      </details>
    </dialog>`
  document.querySelector('.game-shell')!.append(host)
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!
  const dialog = get<HTMLDialogElement>('settings'), reset = get<HTMLButtonElement>('reset-stickers'), confirm = get('reset-confirm')
  const sound = get<HTMLInputElement>('setting-sound'), stars = get<HTMLInputElement>('setting-stars'), orbits = get<HTMLInputElement>('setting-orbits')
  const speeds = [...host.querySelectorAll<HTMLButtonElement>('[data-speed]')]

  // The two sky switches stay after a reload.
  let saved = parseSettings(null)
  try { saved = parseSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) } catch { /* The switches work for this visit. */ }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)) } catch { /* Keep the switches for this visit. */ } }
  stars.checked = saved.stars; orbits.checked = saved.orbits
  actions.stars(saved.stars); actions.orbits(saved.orbits)
  stars.addEventListener('change', () => { saved.stars = stars.checked; actions.stars(stars.checked); save() })
  orbits.addEventListener('change', () => { saved.orbits = orbits.checked; actions.orbits(orbits.checked); save() })

  function soundNote(text: string) { get('sound-status').textContent = text }
  sound.addEventListener('change', async () => {
    soundNote('')
    const on = await actions.sound(sound.checked)
    sound.checked = on
  })

  function setSpeed(chosen: HTMLButtonElement, focus = false) {
    for (const step of speeds) {
      const on = step === chosen
      step.setAttribute('aria-checked', String(on))
      step.tabIndex = on ? 0 : -1
    }
    if (focus) chosen.focus()
    actions.speed(Number(chosen.dataset.speed))
  }
  speeds.forEach((step, index) => {
    step.addEventListener('click', () => setSpeed(step))
    // A radio group moves with the arrow keys.
    step.addEventListener('keydown', event => {
      const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
      if (!move) return
      event.preventDefault()
      setSpeed(speeds[(index + move + speeds.length) % speeds.length], true)
    })
  })

  const plural = (count: number) => `${count} sticker${count === 1 ? '' : 's'}`
  // The search stars (F1) count only when the book has one.
  const starText = (stars: number) => stars ? ` and ${stars} search star${stars === 1 ? '' : 's'}` : ''
  function render() {
    const count = actions.stickers.count
    get('sticker-summary').textContent = count ? `The book has ${count} of ${STICKERS.length} stickers${starText(actions.stickers.stars)}.` : 'The book is empty.'
    reset.disabled = count === 0
  }
  function ask(show: boolean) {
    confirm.hidden = !show
    reset.hidden = show
    if (show) {
      const count = actions.stickers.count
      const stars = starText(actions.stickers.stars)
      get('reset-question').textContent = count === 1 ? `Remove the sticker${stars}?` : `Remove all ${count} stickers${stars}?`
      // The safe answer has the focus, so an extra Enter keeps the stickers.
      get('reset-cancel').focus()
    }
  }

  // The dialog fires "close" later, as a task, so a close from Settings tells the game at once.
  let shown = false
  function closed() {
    if (!shown) return
    shown = false
    button.classList.remove('is-active')
    actions.open(false)
  }
  function setOpen(open: boolean) {
    if (open === dialog.open) return
    if (open) {
      ask(false); get('reset-status').textContent = ''; render()
      dialog.showModal(); get('close-settings').focus()
      shown = true
      button.classList.add('is-active')
      actions.open(true)
    } else { dialog.close(); closed() }
  }
  dialog.addEventListener('close', closed)
  button.addEventListener('click', () => setOpen(true))
  get('close-settings').addEventListener('click', () => setOpen(false))
  reset.addEventListener('click', () => ask(true))
  get('reset-cancel').addEventListener('click', () => { ask(false); reset.focus() })
  get('reset-yes').addEventListener('click', () => {
    const count = actions.stickers.count, stars = starText(actions.stickers.stars)
    actions.stickers.reset()
    ask(false); render()
    get('reset-status').textContent = `${plural(count)}${stars} removed. The next world the fairy visits gives the first sticker.`
    get('close-settings').focus()
  })
  // A press that starts and ends outside the dialog closes it, as the flight menu does.
  let backdropPress = false
  const outside = (event: MouseEvent) => { const box = dialog.getBoundingClientRect(); return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom }
  dialog.addEventListener('pointerdown', event => { backdropPress = event.target === dialog && outside(event) })
  dialog.addEventListener('click', event => {
    if (event.target === dialog && backdropPress && outside(event)) setOpen(false)
    backdropPress = false
  })

  return {
    close: () => setOpen(false),
    get isOpen() { return dialog.open },
    /** A message under the Sound switch, for example when the browser stops the sound. */
    soundNote,
  }
}
