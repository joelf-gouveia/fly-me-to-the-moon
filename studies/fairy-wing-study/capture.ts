import './style.css'
import { createLab } from '../feature-ideas-study/lab'
import { FEATURES } from './shots'
import type { WingRun } from './shots'

/**
 * The capture page: the lab at 1280 × 720 with no panel. The capture script
 * (fairy-wing-study-capture.mjs) asks for each frame, so each clip has 30 frames in each
 * second, also on a slow computer.
 */
export function startCapture(root: HTMLElement) {
  document.body.classList.add('is-capture')
  root.innerHTML = '<div class="stage capture-stage" id="scene"></div>'
  const lab = createLab(root.querySelector<HTMLElement>('#scene')!)
  lab.capture(true)
  Object.defineProperty(window, '__capture', { value: {
    features: Object.keys(FEATURES),
    load(id: string) {
      lab.load(FEATURES[id])
      const run = lab.run as WingRun
      return { duration: run.duration, still: run.still ?? run.duration * 0.6, clip: run.clip, stats: run.stats() }
    },
    frame(delta: number) { lab.step(delta); return { t: lab.time, playing: lab.playing } },
    /** The draw calls and the triangles of the last frame, with all the scene. */
    drawn() { return { calls: lab.renderer.info.render.calls, triangles: lab.renderer.info.render.triangles } },
    get lab() { return lab },
  } })
}
