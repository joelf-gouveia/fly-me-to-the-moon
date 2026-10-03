import './style.css'
import { createElement, Palette, Pause, Settings } from 'lucide'
import * as THREE from 'three'
import { createLab } from './lab'
import { FEATURES } from './features'
import { setSoundOn, startRecording, takeRecording } from './features/sound'
import { surfaceRadius } from '../../src/worlds'
import gameStyle from '../../src/style.css?inline'
import adventureStyle from '../../src/adventure.css?inline'
import stickerStyle from '../../src/sticker-book.css?inline'
import settingsStyle from '../../src/settings.css?inline'

/**
 * The capture page: the screen of the game at 1280 × 720, with the panels of src/main.ts
 * and the Worlds button of src/adventure.ts, and the lab in place of the game scene. The
 * capture script (feature-ideas-study-capture.mjs) asks for each frame, so each clip has
 * 30 frames in each second, also on a slow computer.
 */
export async function startCapture(root: HTMLElement) {
  // The game styles load only for the capture page: src/style.css sets the page to one screen with no scroll.
  for (const css of [gameStyle, adventureStyle, stickerStyle, settingsStyle]) {
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
  }
  document.body.classList.add('is-capture')
  root.innerHTML = `
    <main class="game-shell has-started">
      <div id="scene"></div>
      <header class="brand"><div class="brand-mark"><i></i><i></i><i></i></div><div><p class="eyebrow">A SMALL JOURNEY</p><h1>Fly me to the moon</h1></div></header>
      <aside class="destination"><div class="destination-orbit"><span id="planet-dot"></span></div><div><p class="eyebrow">NEAREST WORLD</p><h2 id="planet-name">Earth</h2><p id="planet-distance"></p><p id="flight-region"></p></div></aside>
      <section class="flight-panel"><div class="speed-row"><span class="speed-icon">✦</span><div><p class="eyebrow">GLIDE SPEED</p><strong><span id="speed-value">12</span> <small>m/s</small></strong></div></div></section>
      <div class="toolbar"><button id="customize-toggle" class="icon-button" type="button" aria-label="Your fairy"></button><button id="settings-toggle" class="icon-button" type="button" aria-label="Settings"></button><button id="pause-toggle" class="icon-button" type="button" aria-label="Pause flight"></button></div>
      <div class="adventure"><nav class="adventure-tools"><div class="explore-tools"><button id="open-map" type="button"><span aria-hidden="true">◉</span> Worlds <span class="world-count">3/13</span></button></div></nav></div>
      <div class="vignette"></div>
    </main>`
  root.querySelector('#customize-toggle')!.append(createElement(Palette))
  root.querySelector('#settings-toggle')!.append(createElement(Settings))
  root.querySelector('#pause-toggle')!.append(createElement(Pause))
  const lab = createLab(root.querySelector<HTMLElement>('#scene')!)
  lab.capture(true)
  const get = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!
  const hud = { name: get('planet-name'), distance: get('planet-distance'), region: get('flight-region'), dot: get('planet-dot'), speed: get('speed-value') }
  /** The flight panel of updateNearestWorld() in src/main.ts, in short. */
  function updateHud() {
    const world = lab.nearest
    const normal = lab.fairy.position.clone().sub(world.group.position).normalize()
    const distance = lab.fairy.position.distanceTo(world.group.position) - world.radius
    const clearance = lab.fairy.position.distanceTo(world.group.position) - surfaceRadius(world, normal)
    const near = distance < Math.max(85, world.atmosphere * 1.5)
    const colour = `#${new THREE.Color(world.color).getHexString()}`
    hud.name.textContent = world.name
    hud.dot.style.backgroundColor = colour
    hud.dot.style.boxShadow = `0 0 15px ${colour}`
    hud.distance.textContent = near ? `${Math.round(Math.max(0, clearance))} m above ${world.gas ? 'deep clouds' : 'surface'}` : `${(distance / 1000).toFixed(1)} km away`
    hud.region.textContent = !near ? 'Open space' : world.kind === 'moon' ? 'Airless · grey dust and dark seas'
      : world.kind === 'fairy' ? 'Candy groves · sparkling soda rivers'
      : world.cloudHeight && distance > world.cloudHeight + 12 ? 'Above the clouds' : 'Below the clouds'
    hud.speed.textContent = String(Math.round(lab.speed))
  }
  Object.defineProperty(window, '__capture', { value: {
    features: Object.keys(FEATURES),
    load(id: string) {
      // The recording starts first, so a sound at clip time 0 is in the cue list.
      startRecording()
      lab.load(FEATURES[id])
      updateHud()
      const run = lab.run!
      return { duration: run.duration, still: run.still ?? run.duration * 0.6 }
    },
    frame(delta: number) { lab.step(delta); updateHud(); return { t: lab.time, playing: lab.playing } },
    sound: setSoundOn,
    cues: takeRecording,
    get lab() { return lab },
  } })
}
