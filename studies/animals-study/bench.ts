import * as THREE from 'three'
import { createLab } from '../feature-ideas-study/lab'
import type { Feature, Lab, RailPoint } from '../feature-ideas-study/lab'
import type { World } from '../../src/worlds'
import { tipToSun } from '../learn-and-play-study/features/shared'
import type { OptionId } from './catalog'
import { createFauna } from './fauna'
import { bestTour } from './features/clips'
import { herdsOf, nearStops } from './features/kit'

/**
 * The bench of the animals study: the same views of the real Earth and Blossom Haven with the fauna
 * of each option, and with the animals of today. It measures the draw calls of the renderer
 * (`renderer.info.render.calls`) and the frame time: the update of the fauna, the render and a read
 * of one pixel, which waits for the graphics card. `?bench&phone` builds the lab as a phone does
 * (src/worlds.ts with `mobile`, no antialias, a pixel ratio of 1.25) for a page of 390 × 844.
 */
export type BenchOption = OptionId | 'today' | 'none'
export const BENCH_OPTIONS: BenchOption[] = ['none', 'today', 'A', 'B', 'C']
type View = { id: string; name: string; world: 'earth' | 'fairy'; dir: THREE.Vector3; heading: THREE.Vector3; alt: number; follow: [number, number] }

export function startBench(root: HTMLElement, phone: boolean) {
  root.style.cssText = 'position:fixed;inset:0;overflow:hidden;background:#000'
  const lab = createLab(root, { mobile: phone })
  lab.capture(true)
  const views = findViews(lab)
  const gl = lab.renderer.getContext(), pixel = new Uint8Array(4)
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  const gpu = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unknown'
  let shown = 0

  function feature(view: View, option: BenchOption): Feature {
    return {
      id: `${view.id}-${option}`,
      create(lab: Lab) {
        const world = view.world === 'earth' ? lab.earth : lab.home
        const fauna = option === 'today' || option === 'none' ? null : createFauna(world, { option, mobile: phone })
        const creatures = world.creatures!, update = creatures.update
        if (option === 'none') { creatures.group.visible = false; creatures.update = () => {} }
        const restore = view.world === 'fairy' ? tipToSun(lab, world, view.dir, 50) : (lab.setSunElevation(world, view.dir, 40), null)
        // The fairy hovers: a rail of 0.5 m for 1000 s. The follow camera of the game is behind her.
        const back = lab.stepAlong(world, view.dir, view.dir.clone().sub(view.heading.clone().multiplyScalar(0.01)).normalize(), 24)
        const ahead = lab.stepAlong(world, back, view.dir, 0.5)
        lab.setRail(world, [{ dir: back, alt: view.alt }, { dir: ahead, alt: view.alt }] as RailPoint[], 0, 1000)
        lab.setFollow(...view.follow)
        return {
          duration: 1000,
          update(t: number, delta: number) { if (fauna) { fauna.update(t, delta, lab.camera, lab.fairy.position); shown = fauna.shown } else shown = 0 },
          dispose() {
            fauna?.dispose(); restore?.()
            creatures.group.visible = true; creatures.update = update
          },
        }
      },
    }
  }

  const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] }
  const p90 = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length * 0.9)] }
  Object.defineProperty(window, '__bench', { value: {
    gpu, phone,
    get size() { const size = lab.renderer.getDrawingBufferSize(new THREE.Vector2()); return { width: size.x, height: size.y, pixelRatio: lab.renderer.getPixelRatio() } },
    views: views.map(view => ({ id: view.id, name: view.name })),
    /** Loads a view with an option, and measures `frames` frames after 20 frames of warm-up. */
    measure(viewId: string, option: BenchOption, frames = 90) {
      const view = views.find(item => item.id === viewId)!
      lab.load(feature(view, option))
      for (let i = 0; i < 20; i++) lab.step(1 / 30)
      const times: number[] = [], calls: number[] = [], triangles: number[] = []
      for (let i = 0; i < frames; i++) {
        const start = performance.now()
        lab.step(1 / 30)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        times.push(performance.now() - start)
        calls.push(lab.renderer.info.render.calls)
        triangles.push(lab.renderer.info.render.triangles)
      }
      return { view: viewId, option, calls: median(calls), triangles: median(triangles), ms: +median(times).toFixed(2), p90: +p90(times).toFixed(2), shown }
    },
    /** A label on the view for its picture. */
    label(text: string) {
      const label = document.createElement('div')
      label.setAttribute('style', `position:absolute;left:12px;right:12px;bottom:${phone ? 28 : 18}px;padding:8px 12px;border-radius:14px;background:rgba(14,18,38,.8);color:#fff6e4;font:600 ${phone ? 13 : 15}px/1.35 system-ui,sans-serif;text-align:center`)
      label.textContent = text
      lab.overlay.append(label)
    },
  } })
}

/** The views of the bench, from the herds of option B (a species has the same herds in each option). */
function findViews(lab: Lab): View[] {
  const earth = lab.earth, home = lab.home
  const earthFauna = createFauna(earth, { option: 'B', mobile: false })
  const savanna = bestTour(earthFauna, ['giraffe', 'zebra', 'elephant'], 0.25)
  const meadow = herdsOf(earthFauna, 'cow', lab.meadowLocal)[0]
  earthFauna.dispose()
  const homeFauna = createFauna(home, { option: 'B', mobile: false })
  const grove = nearStops(home, homeFauna, ['gummyBear', 'flossLamb'], 55)
  homeFauna.dispose()
  const heading = (from: THREE.Vector3, to: THREE.Vector3) => to.clone().sub(from).addScaledVector(from, -to.clone().sub(from).dot(from)).normalize()
  const view = (id: string, name: string, world: World, dir: THREE.Vector3, toward: THREE.Vector3, alt: number, follow: [number, number]): View =>
    ({ id, name, world: world.kind === 'earth' ? 'earth' : 'fairy', dir: dir.clone(), heading: heading(dir, toward), alt, follow })
  return [
    view('savanna', 'Earth, low over a savanna herd', earth, savanna[1].route[0], savanna[2].route[0], 5, [8, 2.8]),
    view('meadow', 'Earth, low over the meadow of the leaf forest', earth, meadow.route[0], lab.meadowLocal, 5, [8, 2.8]),
    view('high', 'Earth, 30 m over the savanna', earth, savanna[1].route[0], savanna[2].route[0], 30, [10, 4]),
    view('grove', 'Blossom Haven, low over the lollipop grove', home, grove[0].route[0], grove[1].route[0], 5, [8, 2.8]),
  ]
}
