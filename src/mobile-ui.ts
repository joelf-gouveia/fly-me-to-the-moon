import './mobile.css'

// The viewport picks the layout: coarse primary pointers and narrow windows get touch controls.
const touchLayout = matchMedia('(pointer: coarse), (max-width: 720px)')

export function createMobileUI(onMenu: (open: boolean) => void, clearInput: () => void) {
  const shell = document.querySelector<HTMLElement>('.game-shell')!
  const host = document.querySelector<HTMLElement>('.adventure')!
  host.insertAdjacentHTML('beforeend', `
    <div class="mobile-top"><button id="menu-toggle" type="button" aria-haspopup="dialog" aria-controls="flight-menu" aria-expanded="false">☰ <span>Menu</span></button></div>
    <dialog id="flight-menu" aria-labelledby="flight-menu-title">
      <header><h2 id="flight-menu-title">Your flight</h2><button id="menu-close" type="button" aria-label="Close menu">×</button></header>
      <div class="menu-actions"></div><div class="menu-adventure"></div><div class="menu-details"></div>
      <p class="touch-help">Hold the arrows to steer. Hold Boost to go faster. Tap Hover to stop. While you hover, the arrows turn you to look around. Tap Fly to keep going.</p>
    </dialog>`)
  const menu = document.querySelector<HTMLDialogElement>('#flight-menu')!
  const toggle = document.querySelector<HTMLButtonElement>('#menu-toggle')!
  const moves = [
    ['#open-map', '.mobile-top'],
    ['#customize-toggle', '.menu-actions'], ['#stickers-toggle', '.menu-actions'], ['#settings-toggle', '.menu-actions'], ['#sound-toggle', '.menu-actions'],
    ['#orbit-speed-toggle', '.menu-actions'],
    ['.adventure-tools', '.menu-adventure'],
    ['.destination', '.menu-details'], ['.flight-panel', '.menu-details'],
  ].map(([selector, target]) => {
    const node = document.querySelector<HTMLElement>(selector)!
    const marker = document.createComment(`Original location of ${selector}`)
    node.before(marker)
    return { node, marker, target: document.querySelector<HTMLElement>(target)! }
  })
  for (const [id, label] of [['customize-toggle', 'Your fairy'], ['stickers-toggle', 'Stickers'], ['settings-toggle', 'Settings'], ['sound-toggle', 'Sound'], ['orbit-speed-toggle', 'World speed']]) {
    const text = document.createElement('span'); text.className = 'mobile-action-label'; text.textContent = label
    document.getElementById(id)!.append(text)
  }
  // WebKit can still start a selection from a long press; only form fields may select.
  shell.addEventListener('selectstart', event => {
    if (!(event.target instanceof HTMLSelectElement)) event.preventDefault()
  })
  // iPad WebKit ignores user-scalable=no, so stop its pinch gestures here.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, event => event.preventDefault(), { passive: false })
  }
  document.addEventListener('touchmove', event => { if (event.touches.length > 1) event.preventDefault() }, { passive: false })
  let touch = touchLayout.matches
  function close() {
    if (!menu.open) return
    menu.close(); syncMenu()
  }
  function syncMenu() {
    toggle.setAttribute('aria-expanded', String(menu.open))
    shell.classList.toggle('is-menu-open', menu.open)
    onMenu(menu.open); clearInput()
  }
  function setTouch(value: boolean) {
    close(); clearInput(); touch = value
    shell.classList.toggle('touch-ui', value)
    document.getElementById('steering-hint')!.textContent = value
      ? 'Hold the arrows to steer. Boost goes faster. Hover stops in the air. Steer to look around.'
      : 'Use WASD or arrow keys to steer. Shift boosts. Ctrl toggles hover.'
    for (const { node, marker, target } of moves) {
      if (value) target.append(node)
      else marker.after(node)
    }
  }
  toggle.addEventListener('click', () => { menu.showModal(); syncMenu(); document.getElementById('menu-close')!.focus() })
  document.getElementById('menu-close')!.addEventListener('click', close)
  menu.addEventListener('close', syncMenu)
  let backdropPress = false
  menu.addEventListener('pointerdown', event => {
    const box = menu.getBoundingClientRect()
    backdropPress = event.target === menu && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)
  })
  menu.addEventListener('click', event => {
    if (event.target === menu && backdropPress) {
      const box = menu.getBoundingClientRect()
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close()
    }
    backdropPress = false
  })
  // Close before another panel opens, retaining the original buttons/listeners.
  for (const id of ['customize-toggle', 'stickers-toggle', 'settings-toggle', 'follow-home', 'stop-home']) document.getElementById(id)!.addEventListener('click', close, true)
  touchLayout.addEventListener('change', () => { if (touchLayout.matches !== touch) setTouch(touchLayout.matches) })
  setTouch(touch)
  return { close, get touch() { return touch } }
}
