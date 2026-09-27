import * as THREE from 'three'
import type { World } from './worlds'
import { MOON } from './moon'
import { PROPORTIONS } from './proportions'
import { view } from './viewport'

/** Game metres at the edge of the solar map: the base system at the spacing of the game. */
const MAP_REACH = 14500 * PROPORTIONS.spacing
/** The Moon's ring on the map: its true size is under Earth's marker, so it is drawn larger. */
const MOON_RING = Math.max(12, MOON.orbit / MAP_REACH * 216)
import './adventure.css'

type Actions = { home: () => void; stop: () => void; travel: (world: World) => void; map: (open: boolean) => void }
export function createAdventure(worlds: World[], actions: Actions) {
  const host = document.createElement('div')
  host.className = 'adventure'
  host.innerHTML = `
    <nav class="adventure-tools" aria-label="Your adventure" hidden>
      <div class="explore-tools"><button id="open-map" type="button" aria-haspopup="dialog"><span aria-hidden="true">◉</span> Worlds</button></div>
      <div class="home-controls"><button id="stop-home" type="button" aria-label="Stop following; fly freely" hidden>■ <span>Stop following</span></button></div>
      <p id="home-help" role="status" hidden></p>
    </nav>
    <button id="home-beacon" type="button" aria-label="Follow the flower to your fairy home" hidden><span aria-hidden="true">✿</span><small aria-hidden="true">↑</small></button>
    <dialog id="world-map" aria-labelledby="map-title">
      <header><div><p class="eyebrow">A LITTLE BOOK OF WORLDS</p><h2 id="map-title">Where shall we fly?</h2></div><button id="close-map" type="button" aria-label="Close world map">×</button></header>
      <p class="map-caption">Choose a picture and we’ll fly there together.</p>
      <section class="solar-map" aria-label="Live planet positions and orbital paths"><p><span aria-hidden="true">◎</span> The planets follow their coloured paths. One full lap takes about an hour.</p><svg viewBox="0 0 600 500" role="img" aria-labelledby="solar-title solar-description"><title id="solar-title">Live map of planets orbiting the Sun</title><desc id="solar-description">A storybook map with a circular path for every planet; the planets move slowly along their paths.</desc><circle class="solar-sun" cx="300" cy="250" r="13"/><text class="solar-sun-label" x="300" y="280">SUN</text>${worlds.filter(world => world.kind !== 'sun').map(world => {
        const initialRadius = Math.hypot(world.group.position.x, world.group.position.z)
        // The Moon's path is a small circle around Earth's marker; its name is above it.
        const moon = world.kind === 'moon'
        const mapRadius = moon ? MOON_RING : Math.max(22, Math.min(216, initialRadius / MAP_REACH * 216))
        return `<circle class="solar-orbit" data-orbit="${world.kind}" cx="300" cy="250" r="${mapRadius}" stroke="#${new THREE.Color(world.color).getHexString()}"/><g data-orbit-marker="${world.kind}"><circle class="solar-planet" r="${moon ? 4 : 6}" fill="#${new THREE.Color(world.color).getHexString()}"/><text y="${moon ? -9 : 18}">${world.name}</text></g>`
      }).join('')}</svg></section>
      <div class="picture-worlds">${worlds.map(world => `<button type="button" data-world="${world.kind}" class="world-picture ${world.kind === 'fairy' ? 'home-picture' : ''}" style="--planet-color:#${new THREE.Color(world.color).getHexString()}"><span class="planet-picture ${world.kind}" aria-hidden="true">${world.kind === 'fairy' ? '✿' : world.kind === 'earth' ? '≈' : ''}</span><strong>${world.name}</strong><small class="map-location"></small></button>`).join('')}</div>
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
  // The map always shows the orbit paths. The Orbit paths switch of Settings shows them in the sky only.
  let found = false, celebrationTime = 0, moveNoticeTime = 0, opener: HTMLElement | null = null
  function closeMap() { map.close(); actions.map(false) }
  get('open-map').onclick = () => {
    opener = document.activeElement as HTMLElement
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
  host.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(button => {
    button.onclick = () => { closeMap(); actions.travel(worlds.find(world => world.kind === button.dataset.world)!) }
  })
  const local = new THREE.Vector3(), projected = new THREE.Vector3()
  return {
    notifyMove(carrying: boolean) {
      // A move far away is quiet; the flower guide always finds the new spot.
      if (!carrying) return
      moveNoticeTime = 9
      get('home-move-note').hidden = false
      get('home-move-note').querySelector('p')!.textContent = 'A little hop through the stars. You and your home moved together!'
    },
    setFound(value: boolean) { found = value },
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
      host.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(button => {
        const here = button.dataset.world === nearest.kind
        button.classList.toggle('you-are-here', here)
        button.querySelector('.map-location')!.textContent = here ? '✦ You are here' : button.dataset.world === 'fairy' && found ? 'Your fairy home' : 'Fly here ↗'
      })
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
