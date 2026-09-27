import * as THREE from 'three'
import type { Joints, Materials } from '../../src/fairy-body'

// The body of the game before the fairy body study: 26 separate shapes, with
// cylinder limbs stretched between the pose targets. The study shows it as
// Today and builds A on it. The head, the hair cap and the ears are the parts
// of the rig; this adds everything below the head.
export function addClassicBody(body: THREE.Group, m: Materials) {
  function ellipsoid(material: THREE.Material, scale: number[], position: number[], name: string) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material)
    mesh.name = name
    mesh.scale.set(scale[0], scale[1], scale[2])
    mesh.position.set(position[0], position[1], position[2])
    body.add(mesh)
    return mesh
  }
  ellipsoid(m.dress, [0.24, 0.38, 0.15], [0, 0.43, 0], 'torso')
  ellipsoid(m.skin, [0.075, 0.13, 0.07], [0, 0.85, 0], 'neck')
  const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.32, 0.4, 10, 1, true), m.dress)
  tunic.position.y = 0.02
  tunic.name = 'tunic'
  body.add(tunic)
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2
    const petal = ellipsoid(i % 2 ? m.petals : m.dress, [0.12, 0.25, 0.055], [Math.sin(angle) * 0.22, -0.03, Math.cos(angle) * 0.22], 'skirt-petal')
    petal.rotation.y = angle
    petal.rotation.x = -0.2
  }
  const backSeam = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.37, 3, 5), m.gold)
  backSeam.position.set(0, 0.38, 0.158)
  backSeam.name = 'back-seam'
  body.add(backSeam)

  const limb = (material: THREE.Material, radius: number, name: string) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, 1, 8), material)
    mesh.name = name
    body.add(mesh)
    return mesh
  }
  const parts = [0, 1].map(() => ({
    upper: limb(m.skin, 0.064, 'upper-arm'), fore: limb(m.skin, 0.052, 'forearm'),
    thigh: limb(m.tights, 0.085, 'thigh'), shin: limb(m.tights, 0.062, 'shin'),
  }))
  const hands = [0, 1].map(() => ellipsoid(m.skin, [0.063, 0.09, 0.047], [0, 0, 0], 'hand'))
  const feet = [0, 1].map(() => ellipsoid(m.shoes, [0.078, 0.08, 0.16], [0, 0, 0], 'foot'))

  const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3()
  function stretch(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3) {
    direction.copy(end).sub(start)
    mesh.position.copy(start).add(end).multiplyScalar(0.5)
    mesh.scale.y = direction.length()
    mesh.quaternion.setFromUnitVectors(up, direction.normalize())
  }
  // The hands stay level and centred on the wrists; the feet only tilt.
  function update(targets: Joints[], boost: number) {
    targets.forEach((joint, i) => {
      stretch(parts[i].upper, joint.shoulder, joint.elbow)
      stretch(parts[i].fore, joint.elbow, joint.wrist)
      stretch(parts[i].thigh, joint.hip, joint.knee)
      stretch(parts[i].shin, joint.knee, joint.ankle)
      hands[i].position.copy(joint.wrist)
      feet[i].position.copy(joint.ankle).add(new THREE.Vector3(0, -0.03, -0.045))
      feet[i].rotation.x = -0.18 + boost * 0.38
    })
  }
  return { update }
}
