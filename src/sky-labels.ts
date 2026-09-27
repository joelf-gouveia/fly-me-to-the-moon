import * as THREE from 'three'
import { starNames } from './star-data'
import { findStar, offset, raDec, resolvedPictures, starDirectionOf, WEBB_PICTURE_DEGREES } from './star-map'
import type { Vec3 } from './star-map'
import { STAR_SKY_RADIUS } from './stars'
import type { StarSky } from './stars'
import './sky-labels.css'

type Label = { element: HTMLSpanElement; direction: THREE.Vector3; edge?: THREE.Vector3 }

/** HTML names for the star pictures, bright stars and Webb pictures, and a
 * caption with the required ESA/Webb credit for the Webb picture nearest the
 * centre of the view. Everything shows only with the star pictures on. */
export function createSkyLabels(shell: HTMLElement, sky: StarSky) {
  const layer = document.createElement('div')
  layer.className = 'sky-labels'
  layer.setAttribute('aria-hidden', 'true')
  layer.hidden = true
  shell.querySelector('#scene')!.after(layer)
  const caption = document.createElement('aside')
  caption.className = 'sky-caption'
  caption.setAttribute('aria-label', 'About this space picture')
  caption.hidden = true
  shell.append(caption)

  const vector = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(STAR_SKY_RADIUS)
  const labels: Label[] = []
  function add(kind: 'picture' | 'star' | 'webb', text: string, direction: Vec3, edge?: Vec3) {
    const element = document.createElement('span')
    element.className = `sky-label ${kind}`
    element.textContent = text
    element.hidden = true
    layer.append(element)
    labels.push({ element, direction: vector(direction), edge: edge && vector(edge) })
  }
  for (const picture of resolvedPictures) add('picture', picture.name, picture.centre)
  for (const [key, name] of Object.entries(starNames)) add('star', name, starDirectionOf(findStar(key)!))
  const webb = sky.placements.map(placement => {
    const { ra, dec } = raDec(placement.centre)
    // The label sits under the picture: drop it by the picture's on-screen radius.
    add('webb', placement.image.title, placement.centre, offset(ra, dec, WEBB_PICTURE_DEGREES / 2, 180))
    return { placement, direction: vector(placement.centre) }
  })

  const world = new THREE.Vector3(), projected = new THREE.Vector3(), edge = new THREE.Vector3(), forward = new THREE.Vector3()
  let shown = false, captionId = ''
  function showCaption(id: string) {
    if (id === captionId) return
    captionId = id
    caption.hidden = !id
    const image = sky.placements.find(placement => placement.image.id === id)?.image
    if (!image) { caption.replaceChildren(); return }
    caption.innerHTML = `<p class="eyebrow">JAMES WEBB SPACE TELESCOPE</p><h2></h2><p class="about"></p>
      <p class="credit"><span></span> Resized with a soft oval edge. <a target="_blank" rel="noopener">ESA/Webb, CC BY 4.0 ↗</a></p>`
    caption.querySelector('h2')!.textContent = image.title
    caption.querySelector('.about')!.textContent = image.about
    caption.querySelector('.credit span')!.textContent = `Credit: ${image.credit}.`
    caption.querySelector('a')!.href = `https://esawebb.org/images/${image.id}/`
  }

  return {
    update(camera: THREE.Camera, width: number, height: number) {
      const visible = sky.picturesShown && sky.visibility > 0.05
      if (visible !== shown) { shown = visible; layer.hidden = !visible }
      if (!visible) { showCaption(''); return }
      layer.style.opacity = String(sky.visibility)
      camera.getWorldDirection(forward)
      for (const label of labels) {
        projected.copy(world.copy(label.direction).add(sky.group.position)).project(camera)
        const onScreen = label.direction.dot(forward) > 0 && Math.abs(projected.x) < 1.02 && Math.abs(projected.y) < 1.02
        if (label.element.hidden === onScreen) label.element.hidden = !onScreen
        if (!onScreen) continue
        const x = (projected.x + 1) / 2 * width, y = (1 - projected.y) / 2 * height
        let drop = 0
        if (label.edge) {
          edge.copy(label.edge).add(sky.group.position).project(camera)
          drop = Math.hypot((edge.x - projected.x) / 2 * width, (edge.y - projected.y) / 2 * height)
        }
        label.element.style.transform = `translate(${x.toFixed(1)}px, ${(y + drop).toFixed(1)}px)`
      }
      // Caption the Webb picture nearest the centre; keep it until it leaves a wider zone.
      let best = '', bestDistance = Infinity
      for (const { placement, direction } of webb) {
        if (direction.dot(forward) <= 0) continue
        projected.copy(world.copy(direction).add(sky.group.position)).project(camera)
        const distance = Math.hypot(projected.x, projected.y)
        const zone = placement.image.id === captionId ? 0.75 : 0.5
        if (distance < zone && distance < bestDistance) { best = placement.image.id; bestDistance = distance }
      }
      showCaption(best)
    },
    dispose() { layer.remove(); caption.remove() },
  }
}
