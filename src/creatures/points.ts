import * as THREE from 'three'

/**
 * The point layer of the small life (option C of docs/animals-study.md): a far fish that jumps, a
 * butterfly, a goose of a far V, a bee, and the light of a firefly or a lantern moth are each one
 * point. All the points of a world are one draw call, and all the lights one more. A point has a
 * colour and a size in metres, so it gets smaller with the distance, and the fog of the air covers it.
 */
const bufferSize = new THREE.Vector2()

export function createPointLayer(capacity: number, glow: boolean) {
  const positions = new Float32Array(capacity * 3), looks = new Float32Array(capacity * 4)
  const geometry = new THREE.BufferGeometry()
  const position = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  const look = new THREE.BufferAttribute(looks, 4).setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', position)
  geometry.setAttribute('look', look)
  geometry.setDrawRange(0, 0)
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uHalfHeight: { value: 360 } },
    // look: rgb the colour, w the size in metres.
    vertexShader: `attribute vec4 look; uniform float uHalfHeight; varying vec3 vColor;
      #include <fog_pars_vertex>
      void main() {
        vColor = look.rgb;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(look.w * projectionMatrix[1][1] * uHalfHeight / -mvPosition.z, 1.5, 48.0);
        #include <fog_vertex>
      }`,
    fragmentShader: `varying vec3 vColor;
      #include <fog_pars_fragment>
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        ${glow
          // A light: soft at the edge, white in the middle.
          ? 'float alpha = pow(max(0.0, 1.0 - d), 1.3); if (alpha < 0.02) discard; gl_FragColor = vec4(mix(vColor, vec3(1.0, 0.98, 0.85), pow(max(0.0, 1.0 - d), 3.0)) * 1.6, alpha);'
          // A small round body with a soft edge.
          : 'float alpha = smoothstep(1.0, 0.7, d); if (alpha < 0.02) discard; gl_FragColor = vec4(vColor, alpha);'}
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  })
  const points = new THREE.Points(geometry, material)
  points.name = glow ? 'small-life-lights' : 'small-life-points'
  points.frustumCulled = false
  points.visible = false
  points.onBeforeRender = renderer => { material.uniforms.uHalfHeight.value = renderer.getDrawingBufferSize(bufferSize).y / 2 }
  let count = 0
  return {
    points,
    get count() { return count },
    begin() { count = 0 },
    /** Adds one point at a local place. It returns false when the layer is full. */
    add(x: number, y: number, z: number, colour: THREE.Color, size: number) {
      if (count >= capacity) return false
      positions[count * 3] = x; positions[count * 3 + 1] = y; positions[count * 3 + 2] = z
      looks[count * 4] = colour.r; looks[count * 4 + 1] = colour.g; looks[count * 4 + 2] = colour.b; looks[count * 4 + 3] = size
      count++
      return true
    },
    end() {
      geometry.setDrawRange(0, count)
      points.visible = count > 0
      if (count) { position.needsUpdate = true; look.needsUpdate = true }
    },
    dispose() {
      points.removeFromParent()
      geometry.dispose(); material.dispose()
    },
  }
}
