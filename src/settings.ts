import { createElement, Settings } from 'lucide'
import { STICKERS } from './stickers'
import './settings.css'

type Actions = {
  open: (open: boolean) => void
  stickers: { readonly count: number; reset: () => void }
}

/** The gear button and the Settings dialog. The first setting resets the sticker book. */
export function createSettings(actions: Actions) {
  const button = document.createElement('button')
  Object.assign(button, { id: 'settings-toggle', type: 'button', className: 'icon-button' })
  button.ariaLabel = 'Open settings'
  button.title = 'Settings'
  button.setAttribute('aria-haspopup', 'dialog')
  button.append(createElement(Settings))
  document.querySelector('#stickers-toggle')!.after(button)

  const host = document.createElement('div')
  host.className = 'settings'
  host.innerHTML = `
    <dialog id="settings" aria-labelledby="settings-title">
      <header><div><p class="eyebrow">FOR GROWN-UPS</p><h2 id="settings-title">Settings</h2></div><button id="close-settings" type="button" aria-label="Close settings">×</button></header>
      <section class="setting" aria-labelledby="reset-stickers-title">
        <div><h3 id="reset-stickers-title">Sticker book</h3><p id="sticker-summary"></p></div>
        <button id="reset-stickers" type="button">Reset sticker book</button>
        <div id="reset-confirm" class="reset-confirm" role="alertdialog" aria-labelledby="reset-question" aria-describedby="reset-detail" hidden>
          <p id="reset-question"></p>
          <p id="reset-detail">Your child starts again with an empty book. This cannot be undone.</p>
          <div><button id="reset-cancel" type="button">Keep the stickers</button><button id="reset-yes" type="button" class="danger">Reset the book</button></div>
        </div>
        <p id="reset-status" role="status"></p>
      </section>
    </dialog>`
  document.querySelector('.game-shell')!.append(host)
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!
  const dialog = get<HTMLDialogElement>('settings'), reset = get<HTMLButtonElement>('reset-stickers'), confirm = get('reset-confirm')

  const plural = (count: number) => `${count} sticker${count === 1 ? '' : 's'}`
  function render() {
    const count = actions.stickers.count
    get('sticker-summary').textContent = count ? `The book has ${count} of ${STICKERS.length} stickers.` : 'The book is empty.'
    reset.disabled = count === 0
  }
  function ask(show: boolean) {
    confirm.hidden = !show
    reset.hidden = show
    if (show) {
      const count = actions.stickers.count
      get('reset-question').textContent = count === 1 ? 'Remove the sticker?' : `Remove all ${count} stickers?`
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
    const count = actions.stickers.count
    actions.stickers.reset()
    ask(false); render()
    get('reset-status').textContent = `${plural(count)} removed. The next world the fairy visits gives the first sticker.`
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

  return { close: () => setOpen(false), get isOpen() { return dialog.open } }
}
