import * as THREE from 'three'
import { createLab } from '../feature-ideas-study/lab'
import { FEATURES } from './features'
import { QUALITY } from './features/kit'

/**
 * The bench of the living worlds study: five views of the clips, each one today and with each
 * option. It measures the draw calls of the renderer (`renderer.info.render.calls`), the triangles
 * and the frame time: the update of the skies, the render and a read of one pixel, which waits for
 * the graphics card. `?bench&phone` builds the lab as a phone does (src/worlds.ts with `mobile`, no
 * antialias, a pixel ratio of 1.25), and the skies use the phone budget.
 */
export const BENCH_VIEWS = [
  { id: 'jupiter-top', name: 'Jupiter, in the top layer', time: 6.5, clips: { today: 'T', A: 'A', B: 'B', C: 'C' } },
  { id: 'jupiter-under', name: 'Jupiter, under the top layer', time: 11, clips: { today: 'T', A: 'A', B: 'B', C: 'C' } },
  { id: 'venus', name: 'Venus, under the deck', time: 10, clips: { today: 'V-today', A: 'V-A', B: 'V' } },
  { id: 'mars', name: 'Mars, low over the plain', time: 11, clips: { today: 'M-today', A: 'M-A', B: 'M' } },
  { id: 'neptune', name: 'Neptune, among the high streaks', time: 8, clips: { today: 'N-today', A: 'N-A', B: 'N' } },
] as const

export function startBench(root: HTMLElement, phone: boolean) {
  QUALITY.mobile = phone
  root.style.cssText = 'position:fixed;inset:0;overflow:hidden;background:#000'
  const lab = createLab(root, { mobile: phone })
  lab.capture(true)
  const gl = lab.renderer.getContext(), pixel = new Uint8Array(4)
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  const gpu = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unknown'
  const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] }
  const p90 = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length * 0.9)] }
  Object.defineProperty(window, '__bench', { value: {
    gpu, phone,
    get size() { const size = lab.renderer.getDrawingBufferSize(new THREE.Vector2()); return { width: size.x, height: size.y, pixelRatio: lab.renderer.getPixelRatio() } },
    views: BENCH_VIEWS,
    /** Loads the clip of a view and an option, goes to the time of the view, and measures `frames` frames after 20 frames of warm-up. */
    measure(viewId: string, option: string, frames = 90) {
      const view = BENCH_VIEWS.find(item => item.id === viewId)!
      const clip = (view.clips as Record<string, string>)[option]
      lab.load(FEATURES[clip])
      lab.step(view.time - 20 / 30)
      for (let i = 0; i < 20; i++) lab.step(1 / 30)
      const times: number[] = [], calls: number[] = [], triangles: number[] = []
      // The clip stays at the time of the view: the bench measures one place, not a flight.
      lab.setPlaying(false)
      for (let i = 0; i < frames; i++) {
        const start = performance.now()
        lab.step(1 / 30)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        times.push(performance.now() - start)
        calls.push(lab.renderer.info.render.calls)
        triangles.push(lab.renderer.info.render.triangles)
      }
      return { view: viewId, option, clip, calls: median(calls), triangles: median(triangles), ms: +median(times).toFixed(2), p90: +p90(times).toFixed(2) }
    },
  } })
}
