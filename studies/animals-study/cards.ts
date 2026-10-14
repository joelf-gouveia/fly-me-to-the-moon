import * as THREE from 'three'
import type { Lab } from '../feature-ideas-study/lab'
import { portrait } from '../learn-and-play-study/features/shared'
import { SPECIES } from './catalog'
import { farMaterial, joinedGeometry } from './build'

/**
 * The pictures of the cards of the animal book: a render of the joined model of each species with
 * a prototype, on the colour of its world. The capture script saves them to
 * public/studies/animals/cards/<id>.jpg. The models stand still: the far material has no motion.
 */
export function cardPictures(lab: Lab, size = 192) {
  const pictures: Record<string, string> = {}
  for (const species of SPECIES.filter(item => item.prototype)) {
    const material = farMaterial(species.id)
    if (species.id === 'gummyBear') material.color.setHex(0xff6f8f)
    if (species.id === 'jelly') material.color.setHex(0xf4a6d6)
    const mesh = new THREE.Mesh(joinedGeometry(species.id, 'near'), material)
    const holder = new THREE.Group()
    holder.add(mesh)
    // Fliers and swimmers turn a little more, so both wings or the whole body show.
    if (species.move === 'fly') holder.rotation.x = 0.5
    pictures[species.id] = portrait(lab, holder, species.world === 'earth' ? 0xe4efd9 : 0xffe4f1, species.move === 'fly' ? 0.4 : 0.75, size)
    material.dispose()
  }
  return pictures
}
