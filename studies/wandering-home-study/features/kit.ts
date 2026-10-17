import * as THREE from 'three'
import type { Lab } from '../../feature-ideas-study/lab'
import './features.css'

/** The parts that the clips of the wandering home study share. */
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
export const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
export const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * A layer of 1280 × 720 px over the 3D view. It has the size of the clip, and it scales to the
 * live view of the page, so a caption has the same place in the clip and in the live view.
 */
export function createLayer(lab: Lab) {
  const layer = document.createElement('div')
  layer.className = 'wh-layer'
  lab.overlay.append(layer)
  return {
    layer,
    /** Fits the layer to the view. Call it in each frame: the live view can change its size. */
    fit() { layer.style.transform = `scale(${(lab.host.clientWidth || 1280) / 1280})` },
  }
}

/** A caption at the bottom of the clip, from `from` to `to` seconds of the clip. */
export function createCaption(layer: HTMLElement, lines: [from: number, to: number, html: string][]) {
  const caption = document.createElement('p')
  caption.className = 'wh-caption'
  layer.append(caption)
  let shown = ''
  return (t: number) => {
    const line = lines.find(([from, to]) => t >= from && t < to)
    if (!line) { caption.style.visibility = 'hidden'; return }
    if (line[2] !== shown) { caption.innerHTML = line[2]; shown = line[2] }
    caption.style.visibility = 'visible'
    caption.style.opacity = String(Math.min(1, (t - line[0]) / 0.3, (line[1] - t) / 0.3))
  }
}

/** A label at the top left of the clip: the size or the place of the home. */
export function createTag(layer: HTMLElement) {
  const tag = document.createElement('p')
  tag.className = 'wh-tag'
  layer.append(tag)
  return (html: string | null) => {
    tag.style.visibility = html ? 'visible' : 'hidden'
    if (html && tag.innerHTML !== html) tag.innerHTML = html
  }
}

/** A fixed camera for a clip: from `eye` to `look`, with `up`. */
export function fixedShot(eye: THREE.Vector3, look: THREE.Vector3, up = new THREE.Vector3(0, 1, 0)) {
  return (camera: THREE.PerspectiveCamera) => {
    camera.position.copy(eye)
    camera.up.copy(up)
    camera.lookAt(look)
  }
}

/** Points the fairy from `from` to `to` and keeps her there: a hover in space. */
export function hoverFairy(lab: Lab, from: THREE.Vector3, to: THREE.Vector3) {
  lab.setRailPoints(lab.nearest, [from.clone(), from.clone().lerp(to, 0.0004), from.clone().lerp(to, 0.0008)])
}
