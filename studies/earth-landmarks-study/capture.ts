import { createLab } from '../feature-ideas-study/lab'
import { EARTH } from './model'
import type { LandmarkId } from './model'
import { prepareEarth } from './tours'

/**
 * The capture page: the lab alone at 1280 × 720, with no page around it. The capture script
 * (earth-landmarks-study-capture.mjs) asks for each frame, so each clip has 30 frames in
 * each second, also on a slow computer. The id `L8-coarse` makes Earth again with the cell
 * size of the ground of the game in each patch, for the comparison picture.
 */
export function startCapture(root: HTMLElement) {
  root.innerHTML = '<div class="stage capture-stage" id="scene"></div>'
  const lab = createLab(root.querySelector<HTMLElement>('#scene')!)
  lab.capture(true)
  const before = performance.now()
  let cell = 0, landscape = prepareEarth(lab, cell)
  const buildTime = performance.now() - before
  Object.defineProperty(window, '__capture', { value: {
    features: Object.keys(landscape.features),
    load(name: string) {
      const [id, coarse] = name.split('-') as [LandmarkId | 'EARTH', string | undefined]
      const wanted = coarse ? EARTH.groundCell : 0
      if (wanted !== cell) { cell = wanted; landscape = prepareEarth(lab, cell) }
      lab.load(landscape.features[id])
      const run = lab.run!
      return { duration: run.duration, still: run.still ?? run.duration * 0.6 }
    },
    frame(delta: number) { lab.step(delta); return { t: lab.time, playing: lab.playing } },
    get lab() { return lab },
    get landscape() { return landscape },
    /** The time to make the Earth of the study, in milliseconds. */
    buildTime,
  } })
}
