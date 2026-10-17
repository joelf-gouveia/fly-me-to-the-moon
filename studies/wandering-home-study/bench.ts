import * as THREE from 'three'
import { createLab } from '../feature-ideas-study/lab'
import { homeCottageNormal } from '../../src/worlds'
import { homeAtSize, SIZES } from './numbers'
import type { SizeId } from './numbers'
import { poseFairy, resizeHome } from './features/home'

/**
 * The bench of the wandering home study: Blossom Haven at each size, built again with the code of
 * the game (resizeHome() in features/home.ts). For each size it measures the time of the build,
 * the plants, the animals and the triangles, and the frame time in two views: from space (the
 * whole home in the view) and on the ground (the fairy 8 m over the cottage meadow). The script
 * wandering-home-study-bench.mjs runs it on a computer page and on a phone page.
 */
export function startBench(root: HTMLElement, phone: boolean) {
  root.style.cssText = 'position:fixed;inset:0;overflow:hidden;background:#000'
  const lab = createLab(root, { mobile: phone })
  lab.capture(true)
  const home = lab.home
  const gl = lab.renderer.getContext(), pixel = new Uint8Array(4)
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  const gpu = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unknown'
  const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] }
  const p90 = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length * 0.9)] }
  const meadow = homeCottageNormal().applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.22).normalize()
  const sun = home.group.position.clone().multiplyScalar(-1).normalize()

  /** The plants, the candy and the clouds: the instances of each instanced mesh of the home. */
  function count() {
    let instances = 0, meshes = 0
    home.group.traverse(object => {
      if (object instanceof THREE.InstancedMesh) { instances += object.count; meshes++ }
      else if (object instanceof THREE.Mesh) meshes++
    })
    return { instances, meshes, animals: home.creatures?.residents.length ?? 0, herds: home.creatures?.herds.length ?? 0 }
  }

  /** Renders `frames` frames of a view and gives the median and the 90th percentile of the frame time. */
  function frames(view: 'space' | 'ground', total: number) {
    const size = homeAtSize(home.radius / 1.25)
    if (view === 'space') {
      const eye = home.group.position.clone().addScaledVector(sun, (size.radius + size.atmosphere) * 3.2)
      lab.setShot(camera => { camera.position.copy(eye); camera.up.set(0, 1, 0); camera.lookAt(home.group.position) })
    } else {
      lab.setShot(null)
      lab.setSunElevation(home, meadow, 40)
      const at = lab.surfacePoint(home, meadow, 8)
      const ahead = lab.surfacePoint(home, lab.stepAlong(home, meadow, new THREE.Vector3(1, 0, 0), 20), 8)
      poseFairy(lab, at, ahead, lab.upAt(home, at))
      lab.snapCamera()
    }
    for (let i = 0; i < 20; i++) lab.step(1 / 60)
    const times: number[] = []
    for (let i = 0; i < total; i++) {
      const start = performance.now()
      lab.step(1 / 60)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      times.push(performance.now() - start)
    }
    const info = lab.renderer.info.render
    return { ms: +median(times).toFixed(2), p90: +p90(times).toFixed(2), calls: info.calls, triangles: info.triangles }
  }

  Object.defineProperty(window, '__bench', { value: {
    gpu, phone, sizes: SIZES.map(size => size.id),
    /** Builds the home at a size three times and measures the build and the two views. */
    measure(id: SizeId, total = 60) {
      const size = SIZES.find(item => item.id === id)!
      const builds = [0, 1, 2].map(() => resizeHome(home, size.base))
      // The first frame after a build compiles nothing new, but it sends the new buffers to the GPU.
      const first = performance.now()
      lab.step(1 / 60)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      const upload = performance.now() - first
      return {
        size: id, radius: Math.round(home.radius), build: +median(builds).toFixed(0), upload: +upload.toFixed(0),
        ...count(), space: frames('space', total), ground: frames('ground', total),
      }
    },
  } })
}
