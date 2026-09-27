import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createNoise3D } from 'simplex-noise'
import { seededRandom } from '../terrain'
import { createFairyRig, skyDancer } from '../fairy'
import { dimensions } from './model'

export type StudyView = 'meadow' | 'overview' | 'water' | 'grove' | 'clouds' | 'friends' | 'home'

export function createCandyScene(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D candy-planet concept: pink hills, sparkling soda river, spiral lollipops, striped candy canes, and a flower cottage')
  host.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xeadce9)
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2200)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 14
  controls.maxDistance = 650
  controls.maxPolarAngle = Math.PI * 0.53
  const light = new THREE.DirectionalLight(0xffecce, 3)
  light.position.set(-100, 240, 130)
  const ambient = new THREE.HemisphereLight(0xfff0f9, 0x947da4, 2.6)
  scene.add(light, ambient)
  const fill = new THREE.DirectionalLight(0xc8f1fa, 1.2)
  fill.position.set(130, 70, -70); scene.add(fill)
  const root = new THREE.Group(); scene.add(root)
  const radius = dimensions.homeRadius
  const random = seededRandom(271828), noise = createNoise3D(seededRandom(8181))
  const normal = new THREE.Vector3(), color = new THREE.Color()
  const material = (hex: number) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75 })
  const cream = material(0xffedcc), pink = material(0xec88b1), red = material(0xc55e87)
  const mint = material(0x85bda8), lemon = material(0xffd486), lilac = material(0xb9a4d4)
  const materials = [pink, lemon, lilac, mint]
  const sphere = new THREE.SphereGeometry(1, 16, 10)
  function ball(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) {
    const mesh = new THREE.Mesh(sphere, mat)
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh)
    return mesh
  }
  function sample(n: THREE.Vector3) {
    const x = n.x * radius, z = n.z * radius
    const river = Math.abs(x - Math.sin(z * 0.045) * 12 + 10)
    const riverDepth = Math.exp(-((river / 5.2) ** 2)) * 7
    const hills = 2.3 + noise(n.x * 4, n.y * 4, n.z * 4) * 2.1
    // A local authored river is deliberate: the study demonstrates a readable biome.
    return hills - riverDepth
  }
  function local(x: number, z: number, offset = 0) {
    const n = new THREE.Vector3(x, Math.sqrt(Math.max(1, radius * radius - x * x - z * z)), z).normalize()
    return n.multiplyScalar(radius + Math.max(0, sample(n)) + offset)
  }
  function place(group: THREE.Object3D, x: number, z: number, offset = 0) {
    group.position.copy(local(x, z, offset))
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), group.position.clone().normalize())
    root.add(group)
  }
  const ground = new THREE.SphereGeometry(1, 192, 128)
  const pos = ground.attributes.position, colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    normal.fromBufferAttribute(pos, i).normalize()
    const height = sample(normal)
    pos.setXYZ(i, normal.x * (radius + height), normal.y * (radius + height), normal.z * (radius + height))
    color.setHex(height < 0.65 ? 0xf6d3b4 : height > 3 ? 0xdba2c0 : 0xebb1c5).multiplyScalar(0.97 + noise(normal.x * 25, normal.y * 25, normal.z * 25) * 0.045)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colors, 3)); ground.computeVertexNormals()
  root.add(new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })))
  const soda = new THREE.Mesh(new THREE.SphereGeometry(radius, 144, 96), new THREE.MeshStandardMaterial({ color: 0x73c4c8, roughness: 0.21, metalness: 0.12 }))
  root.add(soda)
  // Spiral candy discs use geometry, not image assets.
  const spiralPoints = Array.from({ length: 90 }, (_, i) => {
    const t = i / 89, angle = t * Math.PI * 5.3
    return new THREE.Vector3(Math.cos(angle) * t * 1.5, Math.sin(angle) * t * 1.5, 0.25)
  })
  const spiral = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPoints), 80, 0.12, 6, false)
  const disc = new THREE.CylinderGeometry(1.8, 1.8, 0.42, 32)
  const stem = new THREE.CylinderGeometry(0.17, 0.23, 5, 8)
  function lollipop(x: number, z: number, index: number, scale = 1) {
    const group = new THREE.Group()
    const stick = new THREE.Mesh(stem, cream); stick.position.y = 2.5; group.add(stick)
    const top = new THREE.Group(); top.position.y = 5.7
    if (index % 3 === 0) { ball(top, materials[index % 4], 0, 0, 0, 2, 2.3, 2); ball(top, cream, -0.7, 0.7, 1.45, 0.42) }
    else {
      const candy = new THREE.Mesh(disc, materials[index % 4]); candy.rotation.x = Math.PI / 2
      top.add(candy, new THREE.Mesh(spiral, cream))
      top.rotation.y = -0.35 + random() * 0.7
    }
    group.add(top); group.scale.setScalar(scale); place(group, x, z)
  }
  const canePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.7, 0), new THREE.Vector3(0, 4, 0), new THREE.Vector3(0.5, 4.8, 0), new THREE.Vector3(1.5, 4.8, 0), new THREE.Vector3(2, 4.1, 0), new THREE.Vector3(2, 3.5, 0)]
  const caneGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(canePoints), 64, 0.27, 8, false)
  const caneColors = new Float32Array(caneGeometry.attributes.position.count * 3)
  for (let i = 0; i < caneGeometry.attributes.position.count; i++) {
    const uv = caneGeometry.attributes.uv
    color.setHex(Math.floor(uv.getX(i) * 19 + uv.getY(i)) % 2 ? 0xdb7998 : 0xfff0dc)
    caneColors.set([color.r, color.g, color.b], i * 3)
  }
  caneGeometry.setAttribute('color', new THREE.BufferAttribute(caneColors, 3))
  const caneMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })
  function candyCane(x: number, z: number, scale = 1) {
    const group = new THREE.Group(); group.add(new THREE.Mesh(caneGeometry, caneMaterial))
    group.scale.setScalar(scale); place(group, x, z)
  }
  for (let i = 0; i < 150; i++) {
    const x = (random() - 0.5) * 160, z = (random() - 0.5) * 160
    if (x * x + z * z > 8500 || Math.hypot(x - 20, z + 12) < 14) continue
    normal.set(x, Math.sqrt(radius * radius - x * x - z * z), z).normalize()
    if (sample(normal) < 1.2) continue
    if (i % 3 === 0) candyCane(x, z, 0.7 + random() * 0.7)
    else lollipop(x, z, i, 0.75 + random() * 0.6)
  }
  lollipop(10, 11, 1, 1.35); lollipop(20, 7, 2, 1.05); lollipop(-22, -4, 0, 1.25)
  candyCane(8, -6, 1.2); candyCane(29, 2, 0.9)
  for (let i = 0; i < 100; i++) {
    const x = (random() - 0.5) * 130, z = (random() - 0.5) * 130
    normal.copy(local(x, z)).normalize()
    if (sample(normal) < 0.8 || Math.hypot(x - 20, z + 12) < 11) continue
    const group = new THREE.Group()
    if (i % 3 === 0) {
      ball(group, cream, 0, 0.55, 0, 1.2, 0.7, 1)
    } else {
      ball(group, mint, 0, 0.32, 0, 1.2, 0.22, 0.8)
      for (let p = 0; p < 5; p++) ball(group, materials[i % 4], Math.cos(p * Math.PI * 0.4) * 0.55, 0.5, Math.sin(p * Math.PI * 0.4) * 0.55, 0.45, 0.2, 0.45)
      ball(group, lemon, 0, 0.65, 0, 0.25)
    }
    place(group, x, z)
  }
  const cottage = new THREE.Group()
  const walls = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.8, 4.4, 20), cream); walls.position.y = 2.2; cottage.add(walls)
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2
    const petal = ball(cottage, i % 2 ? red : pink, Math.sin(angle) * 2, 4.6, Math.cos(angle) * 2, 1.7, 0.65, 3.2)
    petal.rotation.y = angle
  }
  ball(cottage, lemon, 0, 5.6, 0, 1.7, 0.85, 1.7)
  ball(cottage, red, 0, 1.5, 3.65, 0.85, 1.5, 0.18)
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0xffedb0, emissive: 0xffc878, emissiveIntensity: 0.6 })
  ball(cottage, windowMaterial, -2.2, 2.5, 2.9, 0.64, 0.64, 0.2)
  ball(cottage, windowMaterial, 2.2, 2.5, 2.9, 0.64, 0.64, 0.2)
  ball(cottage, lemon, 0.45, 1.4, 3.83, 0.12)
  place(cottage, 20, -12)
  // Low-density water bubbles. Nothing can collide with or collect them.
  const bubbleMaterial = new THREE.MeshPhysicalMaterial({ color: 0xe6ffff, transparent: true, opacity: 0.38, roughness: 0.15, metalness: 0.1, depthWrite: false })
  const bubbles: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = []
  for (let i = 0; i < 45; i++) {
    const z = -60 + random() * 120, x = Math.sin(z * 0.045) * 12 - 10 + (random() - 0.5) * 4.5
    const base = local(x, z)
    const mesh = ball(root, bubbleMaterial, base.x, base.y, base.z, 0.25 + random() * 0.45)
    bubbles.push({ mesh, base, phase: random() * 8 })
  }
  const cloudGroup = new THREE.Group(); root.add(cloudGroup)
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffe9ef, transparent: true, opacity: 0.84, roughness: 1, depthWrite: false })
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2, x = Math.cos(angle) * 76, z = Math.sin(angle) * 76
    const group = new THREE.Group()
    for (let j = 0; j < 5; j++) ball(group, cloudMat, (j - 2) * 4, Math.sin(j * 2) * 1.5, random() * 3, 5, 2.7, 4)
    group.position.copy(local(x, z, 27)); cloudGroup.add(group)
  }
  const butterflies: { group: THREE.Group; wings: THREE.Mesh[]; base: THREE.Vector3 }[] = []
  for (let i = 0; i < 3; i++) {
    const group = new THREE.Group()
    ball(group, red, 0, 0, 0, 0.16, 0.15, 0.65)
    const wings: THREE.Mesh[] = []
    for (const side of [-1, 1]) wings.push(ball(group, materials[(i + 1) % 4], side * 0.6, 0, 0, 0.65, 0.08, 0.8))
    const base = local(7 + i * 3, 3 - i * 4, 4)
    group.position.copy(base); root.add(group); butterflies.push({ group, wings, base })
  }
  const fairy = createFairyRig({ withTrail: false })
  fairy.root.scale.setScalar(1.1)
  place(fairy.root, 3, 7, 4.5)
  const views: Record<StudyView, { target: THREE.Vector3; offset: THREE.Vector3 }> = {
    meadow: { target: local(3, -4, 2), offset: new THREE.Vector3(44, 30, 65) },
    overview: { target: new THREE.Vector3(), offset: new THREE.Vector3(210, 200, 330) },
    water: { target: local(-10, 0, 2), offset: new THREE.Vector3(19, 15, 31) },
    grove: { target: local(14, 6, 3), offset: new THREE.Vector3(16, 12, 27) },
    clouds: { target: local(18, -12, 5), offset: new THREE.Vector3(74, 76, 123) },
    friends: { target: local(10, -1, 4), offset: new THREE.Vector3(11, 8, 19) },
    home: { target: local(20, -12, 3), offset: new THREE.Vector3(15, 10, 28) },
  }
  let time = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches
  let frame = 0, previous = performance.now()
  function setView(view: StudyView) {
    const shot = views[view]
    controls.target.copy(shot.target)
    camera.position.copy(shot.target).add(shot.offset)
    camera.lookAt(shot.target); controls.update()
    scene.background = new THREE.Color(view === 'overview' ? 0x30263e : 0xeadce9)
  }
  const observer = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight)
    camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix()
  })
  observer.observe(host)
  setView('meadow')
  function animate(now: number) {
    const delta = Math.min((now - previous) / 1000, 0.05); previous = now
    if (!paused && !document.hidden) time += delta
    bubbles.forEach(({ mesh, base, phase }) => { mesh.position.copy(base).addScaledVector(base.clone().normalize(), (time * 0.8 + phase) % 7) })
    butterflies.forEach(({ group, wings, base }, i) => {
      group.position.copy(base).add(new THREE.Vector3(Math.sin(time * 0.4 + i) * 1.4, Math.sin(time + i) * 0.3, Math.cos(time * 0.4 + i) * 1.1))
      wings.forEach((wing, j) => { wing.rotation.z = (j ? 1 : -1) * Math.sin(time * 7) * 0.5 })
    })
    fairy.pose(skyDancer, 0, time)
    controls.update(); renderer.render(scene, camera)
    frame = requestAnimationFrame(animate)
  }
  frame = requestAnimationFrame(animate)
  return {
    // Shared render context for the independent day/night lighting study.
    environment: { scene, camera, renderer, light, ambient, fill, windowMaterial },
    setView,
    setPaused(value: boolean) { paused = value; controls.enableDamping = !value },
    get paused() { return paused },
    setClouds(value: boolean) { cloudGroup.visible = value },
    setBubbles(value: boolean) { bubbles.forEach(({ mesh }) => { mesh.visible = value }) },
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.dispose() },
  }
}
