import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { seededRandom } from './terrain'
import { SOLAR_ORBIT_SECONDS } from './orbits'
import { BELT, BELT_LAYERS, beltDensity, CELL, cellRocks, gameToAu, NEAR_CELLS, NEAR_RANGE, nearCellsAround, ROCK_VARIANTS, sampleBeltPoint } from './belt'
import type { Rock } from './belt'

const ROCK_COLORS = [0x6f6861, 0xa08c72, 0x8f9398, 0x9b8fa8].map(hex => new THREE.Color(hex))

/** A lumpy rock: an icosahedron pushed in and out by noise. Faces stay flat. */
function rockGeometry(variant: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const noise = createNoise3D(seededRandom(700 + variant)), position = geometry.attributes.position
  const stretch = [[1, 0.72, 0.86], [1.15, 0.8, 0.7], [0.9, 0.9, 0.95], [1.3, 0.62, 0.78]][variant]
  const v = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    // Displacement from the position alone, so shared corners stay joined.
    const bump = 1 + noise(v.x * 1.7, v.y * 1.7, v.z * 1.7) * 0.28
    position.setXYZ(i, v.x * bump * stretch[0], v.y * bump * stretch[1], v.z * bump * stretch[2])
  }
  geometry.computeVertexNormals()
  return geometry
}

/**
 * The asteroid belt between Mars and Jupiter. It is scenery, not a World:
 * flight, landing and regeneration do not see it. Far away it is dust and a
 * faint glow; near the camera, rocks come from the cells around it.
 */
export function createAsteroidBelt(scene: THREE.Scene, mobile = false) {
  const layer = BELT_LAYERS[mobile ? 'phone' : 'desktop']
  const group = new THREE.Group()
  group.name = 'asteroid-belt'
  scene.add(group)

  // Dust points, with a size in pixels that shrinks with distance.
  const random = seededRandom(0xd057), positions = new Float32Array(layer.dust * 3), colors = new Float32Array(layer.dust * 3)
  const tints = [new THREE.Color(0xe8d7b8), new THREE.Color(0xcfc3d8), new THREE.Color(0xf2c894)]
  for (let i = 0; i < layer.dust; i++) {
    const p = sampleBeltPoint(random)
    positions.set([p.x, p.y, p.z], i * 3)
    const c = tints[Math.floor(random() * 3)].clone().multiplyScalar(0.55 + random() * 0.45)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const dustMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 600 }, uSize: { value: 14 }, uOpacity: { value: 1 } },
    vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float uScale; uniform float uSize;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * uScale / -mv.z, 1.2, 5.0);
      }`,
    fragmentShader: `varying vec3 vColor; uniform float uOpacity;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        gl_FragColor = vec4(vColor, pow(max(0.0, 1.0 - d), 1.6) * 0.9 * uOpacity);
        #include <colorspace_fragment>
      }`,
  })
  const dust = new THREE.Points(dustGeometry, dustMaterial)
  dust.name = 'belt-dust'
  dust.frustumCulled = false
  group.add(dust)

  // A faint flat glow whose brightness follows the real belt, with its gaps.
  const densityData = new Uint8Array(512 * 4)
  for (let i = 0; i < 512; i++) densityData.set([255, 255, 255, Math.round(beltDensity(gameToAu(BELT.inner + i / 511 * (BELT.outer - BELT.inner))) * 255)], i * 4)
  const densityTexture = new THREE.DataTexture(densityData, 512, 1)
  densityTexture.magFilter = densityTexture.minFilter = THREE.LinearFilter
  densityTexture.needsUpdate = true
  const hazeMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uDensity: { value: densityTexture }, uInner: { value: BELT.inner }, uOuter: { value: BELT.outer }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vPlane; varying float vDistance;
      void main() {
        vPlane = position.xy;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDistance = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    // Inside the belt the glow fades out: near the fairy it would look like a grey floor.
    fragmentShader: `varying vec2 vPlane; varying float vDistance; uniform sampler2D uDensity; uniform float uInner; uniform float uOuter; uniform float uOpacity;
      void main() {
        float t = (length(vPlane) - uInner) / (uOuter - uInner);
        float density = texture2D(uDensity, vec2(t, 0.5)).a * smoothstep(600.0, 3500.0, vDistance);
        gl_FragColor = vec4(vec3(0.93, 0.8, 0.62) * density * 0.16 * uOpacity, 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const haze = new THREE.Mesh(new THREE.RingGeometry(BELT.inner, BELT.outer, 256, 4), hazeMaterial)
  haze.name = 'belt-haze'
  haze.rotation.x = -Math.PI / 2
  group.add(haze)

  // Rocks near the camera. They turn slowly and grow in at the edge of the field.
  const capacity = layer.perCell * NEAR_CELLS
  const rockMaterial = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05, flatShading: true })
  const tint = new THREE.Color()
  const geometries = Array.from({ length: ROCK_VARIANTS }, (_, variant) => rockGeometry(variant))
  // The largest distance from the centre of any shape, per unit of rock size.
  const extent = Math.max(...geometries.map(geometry => { geometry.computeBoundingSphere(); return geometry.boundingSphere!.center.length() + geometry.boundingSphere!.radius }))
  const rocks = geometries.map((geometry, variant) => {
    const mesh = new THREE.InstancedMesh(geometry, rockMaterial, capacity)
    mesh.name = `belt-rocks-${variant}`
    mesh.frustumCulled = false
    mesh.count = 0
    mesh.setColorAt(0, tint.set(0xffffff))
    group.add(mesh)
    return mesh
  })
  const rockColor = (rock: Rock) => tint.copy(ROCK_COLORS[Math.floor(rock.tint * 4) % 4]).multiplyScalar(0.8 + (rock.tint * 7 % 1) * 0.35)
  const cache = new Map<string, Rock[]>()
  let near: Rock[] = [], nearKey = '', shown = 0
  const dummy = new THREE.Object3D(), axis = new THREE.Vector3(), camera = new THREE.Vector3(), fairy = new THREE.Vector3()
  const edge = CELL * NEAR_RANGE.across

  function updateRocks(time: number) {
    const key = `${Math.floor(camera.x / CELL)},${Math.floor(camera.y / CELL)},${Math.floor(camera.z / CELL)}`
    if (key !== nearKey) {
      nearKey = key
      near = nearCellsAround(camera).flatMap(([ix, iy, iz]) => {
        const id = `${ix},${iy},${iz}`
        let cell = cache.get(id)
        if (!cell) { cell = cellRocks(ix, iy, iz, layer.perCell); cache.set(id, cell) }
        return cell
      })
      if (cache.size > 600) cache.clear()
    }
    if (!near.length && !shown) return
    const counts = new Array(ROCK_VARIANTS).fill(0)
    shown = 0
    for (const rock of near) {
      const distance = Math.hypot(rock.x - camera.x, rock.y - camera.y, rock.z - camera.z)
      const reach = rock.size * extent
      const clearFairy = Math.hypot(rock.x - fairy.x, rock.y - fairy.y, rock.z - fairy.z) - reach
      // No collisions: rocks shrink away from the camera and the fairy instead.
      const scale = THREE.MathUtils.smoothstep(edge - distance, 0, edge * 0.3) * THREE.MathUtils.smoothstep(distance - reach, 1, 4) * THREE.MathUtils.smoothstep(clearFairy, 1, 3)
      if (scale <= 0.001) continue
      const mesh = rocks[rock.variant], i = counts[rock.variant]++
      dummy.position.set(rock.x, rock.y, rock.z)
      dummy.quaternion.setFromAxisAngle(axis.set(rock.axis.x, rock.axis.y, rock.axis.z), rock.phase + time * rock.spin)
      dummy.scale.setScalar(rock.size * scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, rockColor(rock))
      shown++
    }
    rocks.forEach((mesh, variant) => {
      mesh.count = counts[variant]
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
  }

  return {
    group,
    get stats() { return { dust: layer.dust, rocks: shown, capacity, extent } },
    /**
     * Turn with the planets: every world finishes one orbit in SOLAR_ORBIT_SECONDS,
     * so the belt never moves into a planet, Ceres or Vesta.
     */
    update(orbitTime: number, view: THREE.PerspectiveCamera, fairyPosition: THREE.Vector3, time: number, bufferHeight: number, visibility = 1) {
      group.rotation.y = -orbitTime / SOLAR_ORBIT_SECONDS * Math.PI * 2
      group.updateMatrixWorld()
      dustMaterial.uniforms.uScale.value = bufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(view.fov) / 2))
      dustMaterial.uniforms.uOpacity.value = hazeMaterial.uniforms.uOpacity.value = visibility
      camera.copy(view.position); group.worldToLocal(camera)
      fairy.copy(fairyPosition); group.worldToLocal(fairy)
      updateRocks(time)
    },
  }
}
export type AsteroidBelt = ReturnType<typeof createAsteroidBelt>
