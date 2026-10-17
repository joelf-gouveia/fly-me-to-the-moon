import * as THREE from 'three'
import { seededRandom } from '../../../src/terrain'
import type { World } from '../../../src/worlds'
import { JETS, turnRate } from './data'
import { frameAt, latOf, placesNear } from './common'
import type { SkyPart } from './common'

/**
 * Option C: floaters, the gas-bag creatures that Carl Sagan and Edwin Salpeter imagined in the
 * clouds of Jupiter in 1976. They are not real: the paper calculated if such life could float
 * there, and no one has seen one. Each floater is a see-through bag with a soft glow, slow pulses
 * and hanging threads, and it drifts with the jet of its latitude. Nothing hunts them.
 */
export function floaters(world: World, near: THREE.Vector3, heights: [number, number], count = 10): SkyPart {
  const random = seededRandom(171)
  const list = placesNear(near, 150, world.radius, count, 171).map((dir, i) => {
    const height = heights[0] + random() * (heights[1] - heights[0])
    return { dir, height, size: 6 + random() * 6, turn: turnRate(JETS.jupiter, latOf(dir), world.radius + height), phase: random() * 6.28, bob: 0.4 + random() * 0.4, seed: i }
  })
  const bag = new THREE.SphereGeometry(1, 28, 18)
  // A dome with a soft skirt: the lower half is shorter and pulled in.
  const positions = bag.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    if (y < 0) { positions.setY(i, y * 0.45); positions.setX(i, positions.getX(i) * (1 + y * 0.25)); positions.setZ(i, positions.getZ(i) * (1 + y * 0.25)) }
  }
  bag.computeVertexNormals()
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 } }]),
    vertexShader: /* glsl */`
      varying vec3 vNormalV; varying vec3 vViewDir; varying vec3 vLocal;
      #include <fog_pars_vertex>
      void main() {
        vLocal = position;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float time;
      varying vec3 vNormalV; varying vec3 vViewDir; varying vec3 vLocal;
      #include <fog_pars_fragment>
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vNormalV), vViewDir)), 2.2);
        // Soft stripes of light from the top to the skirt, which move down as the bag pulses.
        float veins = 0.5 + 0.5 * sin(atan(vLocal.z, vLocal.x) * 7.0) * sin(vLocal.y * 5.0 - time * 1.4);
        vec3 c = mix(vec3(1.0, 0.72, 0.6), vec3(1.0, 0.93, 0.82), rim) + vec3(0.25, 0.12, 0.08) * veins * (1.0 - rim);
        gl_FragColor = vec4(c, 0.22 + rim * 0.6 + veins * 0.08);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  })
  const mesh = new THREE.InstancedMesh(bag, material, count)
  mesh.frustumCulled = false
  // The threads: 8 for each floater, each a line of 6 parts.
  const threads = 8, joints = 7
  const threadPositions = new Float32Array(count * threads * (joints - 1) * 2 * 3)
  const threadGeometry = new THREE.BufferGeometry()
  threadGeometry.setAttribute('position', new THREE.BufferAttribute(threadPositions, 3))
  const threadMaterial = new THREE.LineBasicMaterial({ color: 0xffd9c4, transparent: true, opacity: 0.55, depthWrite: false })
  const lines = new THREE.LineSegments(threadGeometry, threadMaterial)
  lines.frustumCulled = false
  world.clouds.add(mesh, lines)
  const dummy = new THREE.Object3D(), point = new THREE.Vector3(), last = new THREE.Vector3()
  return {
    calls: 2,
    update(time) {
      material.uniforms.time.value = time
      let k = 0
      list.forEach((item, i) => {
        const angle = item.turn * time
        const dir = item.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
        const frame = frameAt(dir)
        const pulse = 1 + Math.sin(time * 1.4 + item.phase) * 0.08
        const height = item.height + Math.sin(time * item.bob + item.phase) * 1.5
        dummy.position.copy(dir).multiplyScalar(world.radius + height)
        dummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.east, frame.up, frame.north.clone().negate()))
        dummy.scale.set(item.size * pulse, item.size * 0.8 / pulse, item.size * pulse)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        for (let t = 0; t < threads; t++) {
          const a = t / threads * Math.PI * 2 + item.seed
          for (let j = 0; j < joints; j++) {
            const down = j / (joints - 1)
            const sway = Math.sin(time * 1.1 + item.phase + down * 2.5 + t) * down * item.size * 0.25
            point.copy(dummy.position)
              .addScaledVector(frame.east, Math.cos(a) * item.size * 0.55 * (1 - down * 0.3) + sway)
              .addScaledVector(frame.north, Math.sin(a) * item.size * 0.55 * (1 - down * 0.3))
              .addScaledVector(frame.up, -item.size * (0.3 + down * 1.6))
            if (j > 0) { threadPositions.set(last.toArray(), k); threadPositions.set(point.toArray(), k + 3); k += 6 }
            last.copy(point)
          }
        }
      })
      mesh.instanceMatrix.needsUpdate = true
      threadGeometry.attributes.position.needsUpdate = true
    },
    dispose() { world.clouds.remove(mesh, lines); mesh.dispose(); bag.dispose(); material.dispose(); threadGeometry.dispose(); threadMaterial.dispose() },
  }
}
