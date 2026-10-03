import * as THREE from 'three'
import type { World } from './worlds'
import { touchesBelt } from './belt'
import { touchesMoonPath } from './moon'
import { touchesCometPath } from './comet'
import { PROPORTIONS } from './proportions'

export const HOME_MOVE_SECONDS = 5 * 60
export const HOME_CARRY_MARGIN = 12

/** Include atmosphere and the rings of Saturn and Uranus, not only each planet's solid sphere. */
export function occupiedRadius(world: World) {
  return Math.max(world.radius + world.atmosphere, world.kind === 'saturn' ? world.radius * 2.1 : world.kind === 'uranus' ? world.radius * 2.05 : 0)
}

export function clearHomePosition(position: THREE.Vector3, home: World, worlds: World[], fairy: THREE.Vector3, carrying: boolean) {
  const extent = occupiedRadius(home) + HOME_CARRY_MARGIN + 30
  if (position.distanceTo(home.group.position) < 1400 * PROPORTIONS.spacing) return false
  if (!carrying && position.distanceTo(fairy) < extent + 250) return false
  // The asteroid belt turns with the planets, so a home clear of it stays clear.
  if (touchesBelt(position, extent + 250)) return false
  // The comet does not turn with the planets. A home clear of its whole path and tails stays clear.
  if (touchesCometPath(position, extent + 250)) return false
  // The Moon turns around Earth, so a home clear of the Moon now can be in its path later.
  const earth = worlds.find(world => world.kind === 'earth')
  if (earth && worlds.some(world => world.kind === 'moon') && touchesMoonPath(position, earth.group.position, extent + 250)) return false
  return worlds.every(world => world === home || position.distanceTo(world.group.position) > extent + occupiedRadius(world) + 250)
}

export function findHomePosition(home: World, worlds: World[], fairy: THREE.Vector3, carrying: boolean, random = Math.random) {
  // Candidate space spans the inner and outer system, not a fixed orbit.
  for (let attempt = 0; attempt < 160; attempt++) {
    const radius = (1100 + random() * 13300) * PROPORTIONS.spacing, angle = random() * Math.PI * 2
    const position = new THREE.Vector3(Math.cos(angle) * radius, (random() - 0.5) * 3200 * PROPORTIONS.spacing, Math.sin(angle) * radius)
    if (clearHomePosition(position, home, worlds, fairy, carrying)) return position
  }
  return null // Keep the old safe position if no candidate passes all checks.
}

export function createRelocationClock() {
  let elapsed = 0, moves = 0
  return {
    get elapsed() { return elapsed },
    get moves() { return moves },
    update(delta: number, guided: boolean, move: () => boolean) {
      if (guided || !Number.isFinite(delta) || delta <= 0) return false
      elapsed = Math.min(HOME_MOVE_SECONDS, elapsed + delta)
      if (elapsed < HOME_MOVE_SECONDS || !move()) return false
      elapsed = 0
      moves++
      return true
    },
  }
}

/** Move the existing group instead of rebuilding it: terrain, effects and seed survive. */
export function relocateHome(home: World, next: THREE.Vector3, fairy: THREE.Vector3) {
  const carrying = fairy.distanceTo(home.group.position) <= home.radius + home.atmosphere + HOME_CARRY_MARGIN
  const offset = next.clone().sub(home.group.position)
  home.group.position.copy(next)
  if (carrying) fairy.add(offset)
  return { carrying, offset }
}

export function createRelocationGlow(scene: THREE.Scene, texture: THREE.Texture) {
  const sprites = [0, 1].map(() => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: 0xffacd5, transparent: true, opacity: 0, depthWrite: false }))
    sprite.visible = false; scene.add(sprite)
    return sprite
  })
  let age = 3
  return {
    begin(from: THREE.Vector3, to: THREE.Vector3, radius: number) {
      age = 0
      sprites.forEach((sprite, index) => { sprite.position.copy(index ? to : from); sprite.scale.setScalar(radius * 3.5); sprite.visible = true })
    },
    update(delta: number, reducedMotion: boolean) {
      age += delta
      sprites.forEach(sprite => {
        sprite.visible = age < 2.5 && !reducedMotion
        sprite.material.opacity = Math.max(0, 1 - age / 2.5) * 0.22
      })
    },
  }
}
