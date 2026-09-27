import * as THREE from 'three'
import {
  GALACTIC_CENTRE, GALACTIC_NORTH, WEBB_PICTURE_DEGREES, angleBetween, bvColor, byHr, placeWebbPictures,
  raDec, resolvedPictures, skyStars, starDirectionOf, starPointSize, unitVector,
} from './star-map'
import type { Vec3 } from './star-map'

export const STAR_SKY_RADIUS = 45000

/** Arbitrary game alignment: RA 0 faces +X; celestial north faces +Y. */
export function starDirection(raDegrees: number, decDegrees: number) {
  const ra = THREE.MathUtils.degToRad(raDegrees), dec = THREE.MathUtils.degToRad(decDegrees)
  return new THREE.Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra))
}

const R = STAR_SKY_RADIUS
const toVector = (v: Vec3, radius = R) => new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(radius)

/** Great-circle polyline from a to b as LineSegments vertex pairs, so lines stay on the sphere. */
function arcVertices(a: Vec3, b: Vec3, radius: number, out: number[]) {
  const start = toVector(a, 1), end = toVector(b, 1)
  const steps = Math.max(2, Math.ceil(angleBetween(a, b) / 2))
  for (let step = 0; step < steps; step++) for (const t of [step / steps, (step + 1) / steps]) {
    out.push(...start.clone().lerp(end, t).normalize().multiplyScalar(radius).toArray())
  }
}

type TextureLoad = (url: string, done: (texture: THREE.Texture) => void) => void
export type StarSkyOptions = { loadTexture?: TextureLoad; imageBase?: string }
const loadWithThree: TextureLoad = (url, done) => { new THREE.TextureLoader().load(url, done) }

/** The sky: 2,887 catalog stars and a Milky Way glow, always on. The optional
 * star pictures (lines, and the enlarged Webb pictures) show with setConstellations().
 * Everything is camera-centred, fades with `visibility`, and never rotates.
 * Sizes and colours are stylized for young players; see docs/star-data.md. */
export function createStarSky(scene: THREE.Scene, { loadTexture = loadWithThree, imageBase = `${import.meta.env.BASE_URL}sky/webb/` }: StarSkyOptions = {}) {
  const group = new THREE.Group()
  group.name = 'star-sky'
  scene.add(group)
  const resources: Array<{ dispose(): void }> = []
  const fades: Array<(fade: number) => void> = []
  let fade = 1, picturesShown = false, imagesRequested = false

  const milkyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uNorth: { value: toVector(GALACTIC_NORTH, 1) }, uCentre: { value: toVector(GALACTIC_CENTRE, 1) }, uStrength: { value: 0.11 } },
    vertexShader: `varying vec3 vDirection;
      void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDirection; uniform vec3 uNorth; uniform vec3 uCentre; uniform float uStrength;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 x) {
        vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec3 d = normalize(vDirection);
        float latitude = asin(clamp(dot(d, uNorth), -1.0, 1.0));
        float core = max(dot(d, uCentre), 0.0);
        float band = exp(-pow(latitude / (0.15 + 0.12 * core), 2.0));
        float rift = smoothstep(0.42, 0.72, fbm(d * 13.0 + 4.0)) * exp(-pow(latitude / 0.05, 2.0));
        float clouds = smoothstep(0.3, 0.78, fbm(d * 6.0));
        float glow = band * (0.2 + 0.8 * clouds) * (0.7 + 0.35 * pow(core, 3.0)) * (1.0 - 0.75 * rift);
        vec3 tint = mix(vec3(0.42, 0.47, 0.78), vec3(0.9, 0.78, 0.64), pow(core, 4.0));
        gl_FragColor = vec4(tint * glow * uStrength, 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const milkyGeometry = new THREE.SphereGeometry(R * 0.97, 96, 48)
  const milkyWay = new THREE.Mesh(milkyGeometry, milkyMaterial)
  milkyWay.name = 'milky-way'
  milkyWay.renderOrder = -10
  group.add(milkyWay)
  resources.push(milkyGeometry, milkyMaterial)
  fades.push(value => { milkyMaterial.uniforms.uStrength.value = 0.11 * value })

  // One draw call for every catalog star; size and colour per vertex.
  const positions: number[] = [], colours: number[] = [], sizes: number[] = [], magnitudes: number[] = []
  const colour = new THREE.Color()
  for (const star of skyStars) {
    positions.push(...toVector(starDirectionOf(star)).toArray())
    const [r, g, b] = bvColor(star.bv)
    colour.setRGB(r, g, b, THREE.SRGBColorSpace)
    colours.push(colour.r, colour.g, colour.b)
    sizes.push(starPointSize(star.magnitude)); magnitudes.push(star.magnitude)
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  starGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colours, 3))
  starGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
  starGeometry.setAttribute('aMagnitude', new THREE.Float32BufferAttribute(magnitudes, 1))
  const starMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 1 }, uScale: { value: 1 } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aMagnitude;
      uniform float uScale; varying vec3 vColor; varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = mix(1.0, 0.6, clamp((aMagnitude - 2.0) / 3.5, 0.0, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale;
      }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = 1.0 - smoothstep(0.15, 0.5, d);
        float halo = pow(max(0.0, 1.0 - d), 1.5) * 0.6;
        gl_FragColor = vec4(vColor, (core + halo) * vAlpha * uOpacity);
        #include <colorspace_fragment>
      }`,
  })
  const stars = new THREE.Points(starGeometry, starMaterial)
  stars.name = 'catalog-stars'
  stars.renderOrder = -9
  group.add(stars)
  resources.push(starGeometry, starMaterial)
  fades.push(value => { starMaterial.uniforms.uOpacity.value = value })

  // Optional star pictures: lines, pointers and Webb pictures behind one toggle.
  const pictureGroup = new THREE.Group()
  pictureGroup.name = 'star-pictures'
  pictureGroup.visible = false
  group.add(pictureGroup)
  function lines(name: string, vertices: number[], color: number, opacity: number, renderOrder: number) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: true, fog: false })
    const object = new THREE.LineSegments(geometry, material)
    object.name = name
    object.renderOrder = renderOrder
    pictureGroup.add(object)
    resources.push(geometry, material)
    fades.push(value => { material.opacity = opacity * value })
  }
  for (const kind of ['constellation', 'asterism'] as const) {
    const vertices: number[] = []
    for (const picture of resolvedPictures.filter(item => item.kind === kind)) for (const [a, b] of picture.segments) {
      arcVertices(starDirectionOf(byHr.get(a)!), starDirectionOf(byHr.get(b)!), R - 20, vertices)
    }
    lines(`${kind}-lines`, vertices, kind === 'constellation' ? 0xcbd7ff : 0xcfb6ff, kind === 'constellation' ? 0.34 : 0.24, -8)
  }

  // Webb pictures are 2–10 arcminutes wide; enlarge them and keep them beside the
  // lines. A small ring marks the true position, with a pointer when moved.
  const placements = placeWebbPictures()
  const pointerVertices: number[] = []
  for (const placement of placements) {
    const ring: Vec3[] = [], { ra, dec } = raDec(placement.anchor)
    for (let i = 0; i <= 24; i++) {
      const bearing = i * 15 * Math.PI / 180, d = 0.45 * Math.PI / 180, lat = dec * Math.PI / 180
      const lat2 = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing))
      const lon2 = ra * Math.PI / 180 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(lat2))
      ring.push(unitVector(lon2 * 180 / Math.PI, lat2 * 180 / Math.PI))
    }
    for (let i = 1; i < ring.length; i++) pointerVertices.push(...toVector(ring[i - 1], R - 40).toArray(), ...toVector(ring[i], R - 40).toArray())
    if (placement.moved) arcVertices(placement.anchor, placement.centre, R - 40, pointerVertices)
  }
  lines('webb-pointers', pointerVertices, 0x9fb6d8, 0.4, -7)

  const pictureGeometry = new THREE.PlaneGeometry(1, 1)
  resources.push(pictureGeometry)
  const pictureWidth = 2 * R * Math.tan(WEBB_PICTURE_DEGREES / 2 * Math.PI / 180)
  const orient = new THREE.Matrix4(), origin = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  const webbPictures = placements.map(placement => {
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { map: { value: null }, uOpacity: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      // A soft oval edge hides the rectangular frame of each image.
      fragmentShader: `varying vec2 vUv; uniform sampler2D map; uniform float uOpacity;
        void main() {
          float mask = smoothstep(1.0, 0.7, length((vUv - 0.5) * 2.0));
          gl_FragColor = vec4(texture2D(map, vUv).rgb, mask * uOpacity);
          #include <colorspace_fragment>
        }`,
    })
    const mesh = new THREE.Mesh(pictureGeometry, material)
    mesh.name = placement.image.id
    mesh.visible = false
    mesh.renderOrder = -6
    mesh.position.copy(toVector(placement.centre, R - 60))
    // Face the camera at the group centre, with the top towards celestial north.
    mesh.quaternion.setFromRotationMatrix(orient.lookAt(origin, mesh.position, up))
    mesh.scale.set(pictureWidth, pictureWidth, 1)
    pictureGroup.add(mesh)
    resources.push(material)
    fades.push(value => { material.uniforms.uOpacity.value = value })
    return { placement, mesh, material }
  })

  function requestImages() {
    if (imagesRequested) return
    imagesRequested = true
    for (const { placement, mesh, material } of webbPictures) {
      loadTexture(`${imageBase}${placement.image.id}.jpg`, texture => {
        texture.colorSpace = THREE.SRGBColorSpace
        const { width, height } = texture.image as { width: number; height: number }
        const aspect = width / height
        mesh.scale.set(aspect >= 1 ? pictureWidth : pictureWidth * aspect, aspect >= 1 ? pictureWidth / aspect : pictureWidth, 1)
        material.uniforms.map.value = texture
        mesh.visible = true
        resources.push(texture)
      })
    }
  }

  return {
    group,
    placements,
    get visibility() { return fade },
    get picturesShown() { return picturesShown },
    /** pixelRatio keeps star sizes in CSS pixels when the render ratio changes. */
    update(cameraPosition: THREE.Vector3, visibility: number, pixelRatio = 1) {
      group.position.copy(cameraPosition)
      // Atmosphere controls fading explicitly, avoiding enormous fog distances.
      fade = Number.isFinite(visibility) ? THREE.MathUtils.clamp(visibility, 0, 1) : 0
      for (const apply of fades) apply(fade)
      starMaterial.uniforms.uScale.value = pixelRatio
      group.visible = fade > 0
    },
    setConstellations(enabled: boolean) {
      picturesShown = enabled
      pictureGroup.visible = enabled
      if (enabled) requestImages()
    },
    dispose() {
      scene.remove(group)
      for (const resource of resources) resource.dispose()
    },
  }
}

export type StarSky = ReturnType<typeof createStarSky>
