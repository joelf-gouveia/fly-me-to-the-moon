import * as THREE from 'three'
import type { World } from './worlds'
import { MOON } from './moon'
import { PROPORTIONS } from './proportions'
import { view } from './viewport'
import { BOOK_ORDER, isKnown, MILESTONE, nextDoor, stickerById, STICKERS } from './stickers'
import type { Book, StickerId } from './stickers'
import { worldPicture } from './sticker-book'
import type { StickerBook } from './sticker-book'

/** Game metres at the edge of the solar map: the base system at the spacing of the game. */
const MAP_REACH = 14500 * PROPORTIONS.spacing
/** The Moon's ring on the map: its true size is under Earth's marker, so it is drawn larger. */
const MOON_RING = Math.max(12, MOON.orbit / MAP_REACH * 216)
import './adventure.css'

type Actions = { home: () => void; stop: () => void; travel: (world: World) => void; map: (open: boolean) => void }
/** The state of a card in the book: its sticker, open, closed until later, or a mystery. */
type CardState = 'sticker' | 'open' | 'closed' | 'mystery-open' | 'mystery-closed'
const EARTH_NOTE = 'Fly out to space, then come back to Earth to get this sticker.'
const called = (id: StickerId) => stickerById(id).the ? `the ${stickerById(id).name}` : stickerById(id).name
const capital = (text: string) => text[0].toUpperCase() + text.slice(1)

/**
 * The flight buttons, the flower marker, and Worlds: the book of worlds of option D in
 * docs/world-book-study.md. The map, the stickers and "Fly there" are in one dialog. A world
 * opens with its sticker, and one more world is always open: the next door.
 */
export function createAdventure(worlds: World[], stickers: StickerBook, actions: Actions) {
  const host = document.createElement('div')
  host.className = 'adventure'
  host.innerHTML = `
    <nav class="adventure-tools" aria-label="Your adventure" hidden>
      <div class="explore-tools"><button id="open-map" type="button" aria-haspopup="dialog"><span aria-hidden="true">◉</span> Worlds <span class="world-count" aria-hidden="true"></span></button></div>
      <div class="home-controls"><button id="stop-home" type="button" aria-label="Stop following; fly freely" hidden>■ <span>Stop following</span></button></div>
      <p id="home-help" role="status" hidden></p>
    </nav>
    <button id="home-beacon" type="button" aria-label="Follow the flower to your fairy home" hidden><span aria-hidden="true">✿</span><small aria-hidden="true">↑</small></button>
    <dialog id="world-map" aria-labelledby="map-title">
      <header><div><p class="eyebrow">A LITTLE BOOK OF WORLDS</p><h2 id="map-title">Where shall we fly?</h2></div><button id="close-map" type="button" aria-label="Close world map">×</button></header>
      <div class="sticker-progress"><div class="sticker-dots" role="img"></div><p id="sticker-count"></p></div>
      <div class="world-note" aria-live="polite"><p id="world-note-text"></p><button id="world-fly" type="button" hidden>Fly there ↗</button></div>
      <section class="solar-map" aria-label="Live planet positions and orbital paths"><p><span aria-hidden="true">◎</span> Each new world you visit comes onto the map. One full lap takes about an hour.</p><svg viewBox="0 0 600 500" role="img" aria-labelledby="solar-title solar-description"><title id="solar-title">Live map of planets orbiting the Sun</title><desc id="solar-description">A storybook map with a circular path for every planet; the planets move slowly along their paths.</desc><circle class="solar-sun" cx="300" cy="250" r="13"/><text class="solar-sun-label" x="300" y="280">SUN</text>${worlds.filter(world => world.kind !== 'sun').map(world => {
        const initialRadius = Math.hypot(world.group.position.x, world.group.position.z)
        // The Moon's path is a small circle around Earth's marker; its name is above it.
        const moon = world.kind === 'moon'
        const mapRadius = moon ? MOON_RING : Math.max(22, Math.min(216, initialRadius / MAP_REACH * 216))
        return `<circle class="solar-orbit" data-orbit="${world.kind}" cx="300" cy="250" r="${mapRadius}" stroke="#${new THREE.Color(world.color).getHexString()}"/><g data-orbit-marker="${world.kind}"><circle class="solar-planet" r="${moon ? 4 : 6}" fill="#${new THREE.Color(world.color).getHexString()}"/><text y="${moon ? -9 : 18}">${world.name}</text></g>`
      }).join('')}</svg></section>
      <div class="book-cards">${BOOK_ORDER.map((id, index) => `<button type="button" data-world="${id}" class="book-card" style="--tilt:${(index * 37 % 9) - 4}deg"></button>`).join('')}</div>
      <p class="map-footnote">Blossom Haven wanders every five minutes. Choose its flower to keep it still while we fly there. Pictures are not to scale.</p>
    </dialog>
    <div id="home-celebration" role="status" hidden><span aria-hidden="true">✿</span><div><small>BLOSSOM HAVEN</small><h2>You found your home!</h2><p>Stay a while. Your wings can rest.</p></div></div>
    <div id="home-move-note" role="status" hidden><span aria-hidden="true">✿</span><p></p></div>
    <div class="celebration-petals" aria-hidden="true" hidden>${Array.from({length: 14}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
  `
  document.querySelector('.game-shell')!.append(host)
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!
  const map = get<HTMLDialogElement>('world-map')
  const sunCenter = worlds.find(world => world.kind === 'sun')!.group.position
  const earth = worlds.find(world => world.kind === 'earth')!
  const beacon = get<HTMLButtonElement>('home-beacon')
  const tools = host.querySelector<HTMLElement>('.adventure-tools')!
  // The map shows the path of each known world. The Orbit paths switch of Settings shows them in the sky only.
  let celebrationTime = 0, moveNoticeTime = 0, opener: HTMLElement | null = null
  let here: StickerId = 'earth', selected: StickerId | null = null, flyTo: StickerId | null = null
  const worldOf = (id: StickerId) => worlds.find(world => world.kind === id)!
  const colourOf = (id: StickerId) => `#${new THREE.Color(worldOf(id).color).getHexString()}`

  function cardState(book: Book, id: StickerId): CardState {
    if (book.arrived.includes(id)) return 'sticker'
    const open = stickers.canFly(id)
    if (isKnown(book, id)) return open ? 'open' : 'closed'
    return open ? 'mystery-open' : 'mystery-closed'
  }
  function status(state: CardState, id: StickerId) {
    if (id === here && (state === 'sticker' || state === 'open')) return '✦ You are here'
    if (state === 'sticker') return id === 'fairy' ? '★ Your fairy home' : '★ Your sticker'
    if (state === 'open') return id === 'fairy' ? 'Follow the flower' : 'Fly here ↗'
    if (state === 'mystery-open') return 'A mystery · fly to it ↗'
    return 'Opens later'
  }
  function note(text: string, target: StickerId | null) {
    get('world-note-text').textContent = text
    // No guided flight to the world where the fairy is.
    flyTo = target && target !== here ? target : null
    get('world-fly').hidden = !flyTo
  }
  /** The note with no card chosen: the next door. */
  function nextNote(book: Book) {
    const next = nextDoor(book)
    if (!next) note('Your book is full! You are a space explorer!', null)
    else if (next === 'earth') note('Fly back home to Earth to get its sticker.', 'earth')
    else if (isKnown(book, next)) note(`Next: ${called(next)} is waiting. Fly there to get its sticker.`, next)
    else note('Next: a mystery world is waiting. Fly there to find out what it is!', next)
  }
  function select(id: StickerId) {
    selected = id
    const book = stickers.book, state = cardState(book, id)
    if (state === 'sticker') note(stickerById(id).fact, id)
    else if (id === 'fairy') note('Follow the flower to Blossom Haven, your fairy home.', id)
    // Earth is always the way home. On Earth, the note says how to get its sticker.
    else if (id === 'earth') note(here === 'earth' ? EARTH_NOTE : 'Fly back home to Earth to get its sticker.', id)
    else if (state === 'open') note(`Fly to ${called(id)} to get its sticker.`, id)
    else if (state === 'mystery-open') note('A mystery world is waiting. Fly there to find out what it is!', id)
    else if (state === 'closed') note(`${capital(called(id))} opens later. Or find it in the sky on your own!`, null)
    else note('This world opens later. Or find it in the sky on your own!', null)
    render()
  }

  /** Draws the book: the count, the dots, the cards and the map. A mystery is a grey "?" with no path. */
  function render() {
    const book = stickers.book, earned = book.arrived.length, total = STICKERS.length
    host.querySelector('.sticker-dots')!.innerHTML = STICKERS.map((_, i) => `<i class="${i < earned ? 'on' : ''} ${(i + 1) % MILESTONE === 0 ? 'milestone' : ''}"></i>`).join('')
    host.querySelector('.sticker-dots')!.setAttribute('aria-label', `${earned} of ${total} stickers`)
    get('sticker-count').textContent = `${earned} of ${total} stickers`
    get('open-map').querySelector('.world-count')!.textContent = `${earned}/${total}`
    get('open-map').ariaLabel = `Worlds and stickers: ${earned} of ${total} stickers`
    host.querySelectorAll<HTMLButtonElement>('.book-card').forEach(card => {
      const id = card.dataset.world as StickerId, state = cardState(book, id), mystery = state.startsWith('mystery')
      const html = `${mystery ? '<span class="planet-picture mystery-picture" aria-hidden="true">?</span>' : worldPicture(worlds, id)}<strong>${mystery ? 'Mystery world' : stickerById(id).name}</strong><small class="map-location">${status(state, id)}</small>`
      if (card.innerHTML !== html) card.innerHTML = html
      card.className = `book-card is-${state}${id === selected ? ' is-selected' : ''}${id === here ? ' you-are-here' : ''}`
    })
    for (const world of worlds) {
      if (world.kind === 'sun') continue
      const known = isKnown(book, world.kind)
      host.querySelector(`[data-orbit="${world.kind}"]`)!.classList.toggle('is-mystery', !known)
      const marker = host.querySelector(`[data-orbit-marker="${world.kind}"]`)!
      marker.classList.toggle('is-mystery', !known)
      marker.querySelector('circle')!.setAttribute('fill', known ? colourOf(world.kind) : '#59607a')
      marker.querySelector('text')!.textContent = known ? world.name : '?'
    }
  }
  function refresh() { if (selected) select(selected); else { nextNote(stickers.book); render() } }
  stickers.onChange(refresh)

  function closeMap() { map.close(); actions.map(false) }
  get('open-map').onclick = () => {
    opener = document.activeElement as HTMLElement
    selected = null
    refresh()
    actions.map(true)
    map.showModal()
    get('close-map').focus()
  }
  get('close-map').onclick = closeMap
  map.addEventListener('close', () => { actions.map(false); opener?.focus() })
  map.addEventListener('click', event => { if (event.target === map) { const r = map.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeMap() } })
  // The Blossom Haven picture in Worlds starts the flower guide (actions.travel), and the flower marker resumes it.
  beacon.onclick = actions.home
  get('stop-home').onclick = actions.stop
  // A tap on a card shows its fact or its hint. "Fly there" flies.
  host.querySelectorAll<HTMLButtonElement>('.book-card').forEach(card => { card.onclick = () => select(card.dataset.world as StickerId) })
  get('world-fly').onclick = () => {
    if (!flyTo || !stickers.canFly(flyTo)) return
    const world = worldOf(flyTo)
    closeMap(); actions.travel(world)
  }
  refresh()
  const local = new THREE.Vector3(), projected = new THREE.Vector3()
  return {
    notifyMove(carrying: boolean) {
      // A move far away is quiet; the flower guide always finds the new spot.
      if (!carrying) return
      moveNoticeTime = 9
      get('home-move-note').hidden = false
      get('home-move-note').querySelector('p')!.textContent = 'A little hop through the stars. You and your home moved together!'
    },
    celebrate() {
      celebrationTime = 8
      get('home-celebration').hidden = false
      host.querySelector<HTMLElement>('.celebration-petals')!.hidden = false
    },
    update(camera: THREE.Camera, hint: THREE.Vector3, nearest: World, delta: number, state: { started: boolean; following: boolean; suspended: boolean; obscured: boolean }) {
      tools.hidden = !state.started || state.obscured
      get('stop-home').hidden = !state.following
      // The help line shows only while the flower guide is on.
      get('home-help').hidden = !state.following
      const help = !state.following ? '' : state.suspended ? 'Your turn! Home waits while your guide is on.' : 'Following the flower · home waits for you.'
      if (get('home-help').textContent !== help) get('home-help').textContent = help
      // The flower marker shows only while the guide is on.
      beacon.hidden = !state.following || !state.started || state.obscured
      if (!beacon.hidden) {
        local.copy(hint).applyMatrix4(camera.matrixWorldInverse)
        projected.copy(hint).project(camera)
        // Use camera-local direction for behind-camera targets; no flipped arrow.
        let x = projected.x, y = projected.y
        if (local.z >= 0) { x = local.x || 0.01; y = local.y || 1; const scale = Math.max(Math.abs(x), Math.abs(y)); x = x / scale * 2; y = y / scale * 2 }
        const edge = Math.max(1, Math.abs(x) / 0.8, Math.abs(y) / 0.54)
        const px = THREE.MathUtils.clamp((x / edge * 0.5 + 0.5) * view.width, 36, view.width - 36)
        // Keep the marker between the top toolbar and thumb controls, including short landscape screens.
        const topMargin = Math.min(200, view.height * 0.28)
        const bottomMargin = Math.min(205, view.height * 0.38)
        const py = THREE.MathUtils.clamp((-y / edge * 0.5 + 0.5) * view.height, topMargin, view.height - bottomMargin)
        beacon.style.left = `${px}px`; beacon.style.top = `${py}px`
        beacon.classList.toggle('at-edge', edge > 1)
        beacon.querySelector('small')!.style.transform = `rotate(${Math.atan2(x, y) * 180 / Math.PI}deg)`
      }
      if (nearest.kind !== here) { here = nearest.kind; refresh() }
      if (map.open) {
        // Map projections use the star's center and live planet coordinates.
        const cx = sunCenter.x
        const cz = sunCenter.z
        for (const world of worlds) {
          if (world.kind === 'sun') continue
          const marker = host.querySelector<SVGGElement>(`[data-orbit-marker="${world.kind}"]`)
          if (!marker) continue
          let x = 300 + (world.group.position.x - cx) / MAP_REACH * 216
          let y = 250 - (world.group.position.z - cz) / MAP_REACH * 216
          const orbit = host.querySelector<SVGCircleElement>(`[data-orbit="${world.kind}"]`)
          if (world.kind === 'moon') {
            // Earth's marker is the centre; the Moon sits on its ring, in its true direction.
            const ex = 300 + (earth.group.position.x - cx) / MAP_REACH * 216, ey = 250 - (earth.group.position.z - cz) / MAP_REACH * 216
            const dx = world.group.position.x - earth.group.position.x, dz = world.group.position.z - earth.group.position.z, length = Math.hypot(dx, dz) || 1
            x = ex + dx / length * MOON_RING; y = ey - dz / length * MOON_RING
            orbit?.setAttribute('cx', String(ex))
            orbit?.setAttribute('cy', String(ey))
          }
          marker.setAttribute('transform', `translate(${x} ${y})`)
          if (world.kind !== 'moon') orbit?.setAttribute('r', String(Math.hypot(world.group.position.x - cx, world.group.position.z - cz) / MAP_REACH * 216))
        }
      }
      if (celebrationTime > 0) {
        celebrationTime -= delta
        if (celebrationTime <= 0) { get('home-celebration').hidden = true; host.querySelector<HTMLElement>('.celebration-petals')!.hidden = true }
      }
      if (moveNoticeTime > 0) {
        moveNoticeTime -= delta
        if (moveNoticeTime <= 0) get('home-move-note').hidden = true
      }
    },
  }
}

export function createGuideFireflies(scene: THREE.Scene, texture: THREE.Texture) {
  const positions = new Float32Array(24 * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ color: 0xffdfbb, map: texture, size: 0.8, transparent: true, opacity: 0.85, depthWrite: false, fog: false })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  scene.add(points)
  const side = new THREE.Vector3(), up = new THREE.Vector3(), p = new THREE.Vector3()
  return (position: THREE.Vector3, heading: THREE.Vector3, time: number, visible: boolean) => {
    points.visible = visible
    if (!visible) return
    side.crossVectors(heading, new THREE.Vector3(0, 1, 0))
    if (side.lengthSq() < 0.01) side.set(1, 0, 0)
    side.normalize(); up.crossVectors(side, heading).normalize()
    for (let i = 0; i < 24; i++) {
      const d = 7 + i * 2.2
      p.copy(position).addScaledVector(heading, d).addScaledVector(side, Math.sin(i * 0.45 + time * 0.6) * 1.8).addScaledVector(up, Math.cos(i * 0.5 + time * 0.4) * 1.1)
      positions.set([p.x, p.y, p.z], i * 3)
    }
    geometry.attributes.position.needsUpdate = true
  }
}
