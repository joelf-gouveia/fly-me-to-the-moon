import * as THREE from 'three'
import { PROPORTIONS } from '../proportions'

/*
 * The Sun before the Sun study: a copy of the old code, so the study can show it as Before.
 * The sphere is from createWorlds() in src/worlds.ts; the glow and its texture are from src/main.ts.
 */

function makeSoftDiscTexture(color: string, size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.18, color)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** The old Sun: one colour on a sphere, with fog, and one glow sprite. */
export function buildBefore() {
  const root = new THREE.Group()
  root.name = 'sun-before'
  const material = new THREE.MeshBasicMaterial({ color: 0xffd78d })
  const sunRadius = 600 * PROPORTIONS.sun
  root.add(new THREE.Mesh(new THREE.SphereGeometry(sunRadius, 64, 40), material))
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSoftDiscTexture('rgba(255,185,90,1)'), color: 0xffbf70,
    transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
  }))
  sunGlow.scale.setScalar(2450 * PROPORTIONS.sun)
  root.add(sunGlow)
  return root
}
