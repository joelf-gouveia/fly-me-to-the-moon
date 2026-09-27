import * as THREE from 'three'
import type { Species } from './habitat'

export type CreatureFeatures = { details: boolean; tails: boolean; motion: boolean }

export function createCreature(kind: Species, fairy: boolean) {
  const root = new THREE.Group(), body = new THREE.Group(), details = new THREE.Group(), tail = new THREE.Group()
  root.add(body)
  body.add(details, tail)
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
  const sphere = new THREE.SphereGeometry(1, 12, 8)
  geometries.add(sphere)
  const material = (color: number) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true })
    materials.add(value)
    return value
  }
  const coat = material(kind === 'cow' ? (fairy ? 0xf2deea : 0xf2ebd9) : kind === 'rabbit' ? (fairy ? 0xd2aad0 : 0xb78b6b) : kind === 'sheep' ? (fairy ? 0xf6dbe7 : 0xf3e9d3) : (fairy ? 0xc4cde6 : 0xe6bb77))
  const face = material(kind === 'sheep' ? 0x756858 : kind === 'duck' ? (fairy ? 0x8d819f : 0x557865) : (fairy ? 0xd2aad0 : 0xb78b6b))
  const dark = material(0x30382e), accent = material(kind === 'duck' ? 0xe1a15c : 0xe7b6a9)
  const cream = material(0xfff6e2)
  function blob(parent: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const mesh = new THREE.Mesh(sphere, mat)
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz)
    parent.add(mesh)
    return mesh
  }
  const legs: THREE.Mesh[] = []
  const head = new THREE.Group()
  body.add(head)
  if (kind === 'rabbit') {
    blob(body, coat, 0, 0.42, -0.06, 0.34, 0.36, 0.46)
    head.position.set(0, 0.7, 0.31)
    blob(head, coat, 0, 0, 0, 0.26, 0.27, 0.27)
    for (const side of [-1, 1]) {
      const ear = blob(head, coat, side * 0.13, 0.37, -0.035, 0.085, 0.34, 0.07)
      ear.rotation.z = side * -0.12
      const center = blob(details, accent, side * 0.17, 1.075, 0.34, 0.037, 0.23, 0.025)
      center.rotation.z = side * -0.12
      blob(head, dark, side * 0.19, 0.035, 0.18, 0.028, 0.038, 0.025)
      legs.push(blob(body, coat, side * 0.24, 0.12, -0.19, 0.15, 0.11, 0.21))
      legs.push(blob(body, coat, side * 0.15, 0.09, 0.3, 0.085, 0.08, 0.16))
    }
    blob(head, accent, 0, -0.06, 0.255, 0.045, 0.027, 0.027)
    blob(tail, cream, 0, 0.49, -0.48, 0.145, 0.145, 0.145)
  } else if (kind === 'sheep') {
    blob(body, coat, 0, 0.6, -0.07, 0.48, 0.4, 0.63)
    head.position.set(0, 0.73, 0.55)
    blob(head, face, 0, 0, 0.01, 0.24, 0.27, 0.3)
    blob(head, coat, 0, 0.18, -0.065, 0.29, 0.15, 0.27)
    for (const side of [-1, 1]) {
      blob(head, face, side * 0.29, 0.065, -0.01, 0.17, 0.07, 0.1)
      blob(head, dark, side * 0.17, 0.015, 0.235, 0.029, 0.034, 0.025)
      for (const z of [-0.4, 0.35]) legs.push(blob(body, face, side * 0.29, 0.2, z, 0.075, 0.21, 0.085))
      for (let i = 0; i < 3; i++) blob(details, coat, side * 0.35, 0.8, -0.38 + i * 0.3, 0.23, 0.24, 0.24)
    }
    blob(tail, coat, 0, 0.6, -0.7, 0.11, 0.12, 0.2)
  } else if (kind === 'cow') {
    const patches = material(fairy ? 0x97819f : 0x4d5046)
    blob(body, coat, 0, 0.79, -0.12, 0.52, 0.44, 0.77)
    head.position.set(0, 0.9, 0.69)
    blob(head, coat, 0, 0, 0, 0.29, 0.33, 0.31)
    blob(head, accent, 0, -0.15, 0.24, 0.3, 0.16, 0.18)
    for (const side of [-1, 1]) {
      blob(head, coat, side * 0.34, 0.13, -0.035, 0.19, 0.08, 0.11)
      blob(head, accent, side * 0.36, 0.16, 0.03, 0.095, 0.025, 0.055)
      const horn = blob(head, cream, side * 0.22, 0.34, -0.055, 0.06, 0.16, 0.055)
      horn.rotation.z = side * -0.28
      blob(head, dark, side * 0.22, 0.055, 0.22, 0.03, 0.039, 0.026)
      blob(head, dark, side * 0.11, -0.12, 0.401, 0.024, 0.018, 0.011)
      for (const z of [-0.57, 0.38]) {
        legs.push(blob(body, coat, side * 0.32, 0.3, z, 0.1, 0.29, 0.11))
        blob(body, dark, side * 0.32, 0.075, z, 0.11, 0.075, 0.12)
      }
      blob(details, patches, side * 0.45, 0.87, -0.26, 0.075, 0.23, 0.28)
      blob(details, patches, side * 0.41, 0.7, 0.24, 0.08, 0.16, 0.19)
    }
    blob(details, patches, -0.13, 1.19, -0.3, 0.23, 0.055, 0.29)
    tail.position.set(0, 0.88, -0.85)
    blob(tail, coat, 0, -0.2, -0.06, 0.04, 0.27, 0.045)
    blob(tail, patches, 0, -0.46, -0.065, 0.08, 0.12, 0.075)
  } else {
    blob(body, coat, 0, 0.18, -0.06, 0.35, 0.25, 0.52)
    head.position.set(0, 0.54, 0.34)
    blob(head, face, 0, 0, 0, 0.24, 0.25, 0.24)
    blob(head, accent, 0, -0.08, 0.28, 0.15, 0.055, 0.19)
    for (const side of [-1, 1]) {
      blob(head, dark, side * 0.19, 0.04, 0.125, 0.027, 0.031, 0.022)
      blob(details, cream, side * 0.3, 0.24, -0.07, 0.065, 0.12, 0.29)
    }
    const tip = blob(tail, coat, 0, 0.25, -0.51, 0.16, 0.1, 0.24)
    tip.rotation.x = -0.35
  }
  function animate(time: number, moving: boolean, features: CreatureFeatures) {
    details.visible = features.details; tail.visible = features.tails
    body.position.y = 0; body.rotation.z = 0; head.rotation.x = 0; tail.rotation.z = 0
    legs.forEach(leg => { leg.rotation.x = 0 })
    if (!features.motion) return
    if (kind === 'rabbit' && moving) body.position.y = Math.max(0, Math.sin(time * 9)) * 0.1
    if (kind === 'duck') body.rotation.z = Math.sin(time * 2.8) * 0.035
    if ((kind === 'sheep' || kind === 'cow') && !moving) head.rotation.x = 0.25 + Math.sin(time * 2) * 0.08
    if (kind === 'cow') tail.rotation.z = Math.sin(time * 1.6) * 0.18
    if (moving) legs.forEach((leg, i) => { leg.rotation.x = Math.sin(time * (kind === 'cow' ? 3.5 : 6) + i * Math.PI) * 0.2 })
  }
  return { root, animate, dispose: () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()) } }
}
