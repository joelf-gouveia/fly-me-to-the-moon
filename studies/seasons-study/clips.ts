import * as THREE from 'three'
import { surfaceRadius } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { orientFlight } from '../../src/flight'
import { SPECIES } from '../../src/foliage/species'
import type { SpeciesId } from '../../src/foliage/species'
import type { CameraShot, Feature, Lab } from '../feature-ideas-study/lab'
import {
  declination, EARTH_TILT, latitudeLabel, lookPhase, magicAt, magicOffset, monthAt, noonElevation, PALETTE, seasonAt,
  seasonStrength, snowCover,
} from './model'
import type { ClipId, Pattern, WorldId } from './model'
import { createSeasons, createWeather } from './seasons'
import type { Fall, Seasons } from './seasons'
import { createMagicSeasons } from './magic'
import type { MagicSeasons } from './magic'

/**
 * The clips of the study and the live view. Each one runs in the lab of the feature ideas study
 * (../feature-ideas-study/lab.ts): the real worlds, sky, fairy and light of the game. A clip sets
 * the day of the year on each frame; the lab draws the frame.
 */
const RAD = Math.PI / 180
const YEAR_CLIP = 12

type Kit = { earth: Seasons; fairy: MagicSeasons; weather: Record<WorldId, ReturnType<typeof createWeather>> }
const kits = new WeakMap<Lab, Kit>()
/** The seasons of the two worlds of a lab. The materials change once, at the first clip. */
function kitOf(lab: Lab): Kit {
  let kit = kits.get(lab)
  if (!kit) {
    const earth = createSeasons(lab.earth, lab.sun.group.position), fairy = createMagicSeasons(lab.home, lab.sun.group.position)
    kit = { earth, fairy, weather: { earth: createWeather(lab.earth), fairy: createWeather(lab.home) } }
    kits.set(lab, kit)
  }
  kit.earth.setOn(1); kit.earth.setLook(0)
  kit.fairy.setOn(1); kit.fairy.setLook(0)
  lab.fairy.visible = true
  return kit
}

/** The note in the corner of a clip. It writes to the page only when its text changes. */
export function captionOf(lab: Lab) {
  const element = document.createElement('p')
  element.className = 'season-caption'
  lab.overlay.append(element)
  let shown = ''
  return (title: string, text: string) => {
    if (shown === title + text) return
    shown = title + text
    element.innerHTML = `<b>${title}</b><span>${text}</span>`
  }
}
const title = (text: string) => text[0].toUpperCase() + text.slice(1)
/** The season of a place of Earth in words: "Summer", "No season" near the equator. */
function seasonWord(latitude: number, year: number) {
  const season = seasonAt(latitude, year)
  return season.name ? title(season.name) : 'No season'
}

/** A local direction at a latitude and a longitude, in degrees. */
export function directionAt(latitude: number, longitude: number) {
  const ring = Math.cos(latitude * RAD)
  return new THREE.Vector3(ring * Math.cos(longitude * RAD), Math.sin(latitude * RAD), ring * Math.sin(longitude * RAD))
}
/** The local directions of the tall plants of a world, or of the kinds in `only`. */
function plantsOf(world: World, only?: SpeciesId[]) {
  const plants: THREE.Vector3[] = [], matrix = new THREE.Matrix4()
  for (const object of world.surface.children) {
    // The trees of src/foliage/build.ts: one mesh for each kind, with the name foliage-<kind>.
    if (!(object instanceof THREE.InstancedMesh) || !object.name.startsWith('foliage-')) continue
    const kind = object.name.slice(8) as SpeciesId
    // The toadstools of the mushroom glade of Blossom Haven are as large as trees.
    if (only ? !only.includes(kind) : !(SPECIES[kind]?.tree || kind === 'toadstool')) continue
    for (let i = 0; i < object.count; i++) { object.getMatrixAt(i, matrix); plants.push(new THREE.Vector3().setFromMatrixPosition(matrix).normalize()) }
  }
  return plants
}
/**
 * A dry place at a latitude with gentle ground and some plants around it. The game has no fixed
 * places: Earth is new at each visit.
 */
export function findSpot(world: World, latitude: number, toward = 1, turn = 28, back = 6, accept?: (centre: THREE.Vector3) => boolean) {
  const close = (plant: THREE.Vector3) => Math.abs(Math.asin(plant.y) / RAD - latitude) < 14
  const plants = plantsOf(world).filter(close)
  // The leaf trees of Earth show the season best, so a place with them in the view gets more points.
  const leafTrees = plantsOf(world, ['oak', 'birch']).filter(close)
  const offset = new THREE.Vector3()
  let best = directionAt(latitude, 0), bestScore = -Infinity
  for (let longitude = 0; longitude < 360; longitude += 1.5) {
    const centre = directionAt(latitude, longitude), sample = world.sample(centre.x, centre.y, centre.z)
    if (sample.height < 1 || sample.river > 0.05 || (accept && !accept(centre))) continue
    let score = -Math.abs(sample.height - 3) * 2
    for (const distance of [12, 26, 45]) for (let turnAt = 0; turnAt < 8; turnAt++) {
      const angle = turnAt / 8 * Math.PI * 2
      const near = centre.clone().add(new THREE.Vector3(Math.cos(angle), 0.4 * Math.sin(angle * 2), Math.sin(angle)).multiplyScalar(distance / world.radius)).normalize()
      const height = world.sample(near.x, near.y, near.z).height
      // Dry, low ground gets a point. A hill in front of the camera loses three.
      score += height > 0.9 && height < 6 ? 1 : height >= 6 ? -3 : 0
    }
    // Plants in the view get points. A plant at the camera, or between the camera and the fairy, loses eight.
    const heading = headingAt(centre, toward, turn), right = new THREE.Vector3().crossVectors(heading, centre)
    let seen = 0
    for (const plant of plants) {
      offset.copy(plant).sub(centre).multiplyScalar(world.radius)
      if (offset.lengthSq() > 70 * 70) continue
      const along = offset.dot(heading), across = offset.dot(right)
      if (Math.hypot(along + back, across) < 9 || (along > -back && along < 16 && Math.abs(across) < 3.2)) score -= 8
      else if (along > 12 && along < 55 && Math.abs(across) < 30) seen++
    }
    score += Math.min(14, seen) * 1.2
    let leafy = 0
    for (const plant of leafTrees) {
      offset.copy(plant).sub(centre).multiplyScalar(world.radius)
      const along = offset.dot(heading), across = offset.dot(right)
      if (along > 10 && along < 45 && Math.abs(across) < 22) leafy++
    }
    score += Math.min(8, leafy) * 3
    if (score > bestScore) { bestScore = score; best = centre }
  }
  return best
}

type ViewOptions = { back?: number; eye?: number; ahead?: number; lookUp?: number; circle?: number; height?: number; fov?: number }
/**
 * A camera on a tripod on the ground of a world, and the fairy on a slow circle in front of it.
 * `centre` and `heading` are in the frame of the world, so the view turns with the world.
 */
export function groundView(lab: Lab, world: World, centre: THREE.Vector3, heading: THREE.Vector3, options: ViewOptions = {}) {
  const { back = 6, eye = 3.8, ahead = 17, lookUp = 2.2, circle = 5.5, height = 3.4, fov = 58 } = options
  const right = new THREE.Vector3().crossVectors(heading, centre).normalize()
  const sample = world.sample(centre.x, centre.y, centre.z)
  const base = world.radius + Math.max(0, sample.height)
  const normal = new THREE.Vector3(), tangent = new THREE.Vector3(), target = new THREE.Vector3()
  /** A world position `along` and `across` metres from the centre, `alt` metres above its ground. */
  function local(along: number, across: number, alt: number, out: THREE.Vector3) {
    return out.copy(centre).addScaledVector(heading, along / world.radius).addScaledVector(right, across / world.radius).normalize()
      .applyQuaternion(world.group.quaternion).multiplyScalar(base + alt).add(world.group.position)
  }
  const eyeDirection = centre.clone().addScaledVector(heading, -back / world.radius).normalize()
  const shot: CameraShot = camera => {
    camera.position.copy(lab.surfacePoint(world, eyeDirection, eye))
    camera.up.copy(camera.position).sub(world.group.position).normalize()
    camera.lookAt(local(ahead, 0, lookUp, target))
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix() }
  }
  return {
    shot,
    /** The fairy on her circle at the time `t`. */
    place(t: number) {
      const angle = t * 0.55
      // Her height is above the ground under her, so a hill does not hide her.
      normal.copy(local(ahead * 0.6 + Math.cos(angle) * circle, Math.sin(angle) * circle, 0, lab.fairy.position)).sub(world.group.position).normalize()
      lab.fairy.position.copy(world.group.position).addScaledVector(normal, surfaceRadius(world, normal) + height + Math.sin(t * 1.1) * 0.4)
      tangent.copy(heading).multiplyScalar(-Math.sin(angle)).addScaledVector(right, Math.cos(angle)).applyQuaternion(world.group.quaternion)
      orientFlight(lab.fairy.quaternion, tangent, normal)
    },
  }
}
/** The local direction to the pole (`toward` 1) or to the equator (`toward` -1), turned by `turn` degrees. */
export function headingAt(centre: THREE.Vector3, toward: number, turn = 0) {
  const pole = new THREE.Vector3(0, centre.y >= 0 ? 1 : -1, 0)
  return pole.addScaledVector(centre, -pole.dot(centre)).normalize().multiplyScalar(toward).applyAxisAngle(centre, turn * RAD)
}

/** The view of a whole world from space, from the side of the Sun. `lift` puts the camera to the north (+) or the south (-). */
export function spaceShot(lab: Lab, world: World, lift = 0.1): CameraShot {
  const toSun = new THREE.Vector3(), north = new THREE.Vector3(), east = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  return camera => {
    toSun.copy(lab.sun.group.position).sub(world.group.position).normalize()
    north.copy(up).addScaledVector(toSun, -up.dot(toSun)).normalize()
    east.crossVectors(north, toSun)
    camera.position.copy(toSun).multiplyScalar(0.84).addScaledVector(east, 0.5).addScaledVector(north, lift).normalize()
      .multiplyScalar(world.radius * 3.05).add(world.group.position)
    camera.up.copy(north)
    camera.lookAt(world.group.position)
    // The fairy waits behind the camera, so the sky and the air of the lab stay those of space.
    lab.fairy.position.copy(camera.position).addScaledVector(toSun, 8)
  }
}

/** What falls from the sky at a place of Earth on a day: snow in the cold, leaves in autumn, petals in spring. */
export function fallAt(latitude: number, year: number, tilt = EARTH_TILT): [Fall | null, number] {
  const snow = snowCover(latitude, year, tilt)
  if (snow > 0.35) return ['snow', snow]
  const strength = seasonStrength(latitude), phase = lookPhase(latitude, year)
  const near = (centre: number) => Math.max(0, 1 - Math.abs(((phase - centre + 1.5) % 1) - 0.5) / 0.11)
  if (near(0.5) > 0.05) return ['leaf', near(0.5) * strength]
  if (near(0) > 0.05) return ['petal', near(0) * strength]
  return [null, 0]
}
const MAGIC_FALLS: Fall[] = ['petal', 'bubble', 'firefly', 'glitter']
/** What is in the air at a place of Blossom Haven: the thing of its magic season. */
export function magicFall(pattern: Pattern, direction: THREE.Vector3, year: number): [Fall, number] {
  const at = magicAt(pattern, direction, year)
  return [MAGIC_FALLS[at.index], Math.min(1, at.full * 1.8)]
}
const latitudeOf = (direction: THREE.Vector3) => Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)) / RAD
/** A magic year that stays on each season for 2 s of each 3 s, then changes in 1 s. */
const stepped = (t: number, each = 3) => (Math.floor(t / each) + THREE.MathUtils.smoothstep(t % each, each - 1, each)) / 4

// ---- The clips of Earth -----------------------------------------------------------------------------

/** E1: one year from space. */
const earthYear: Feature = { id: 'E1', create(lab) {
  const seasons = kitOf(lab).earth, caption = captionOf(lab)
  lab.fairy.visible = false
  lab.setShot(spaceShot(lab, seasons.world))
  return {
    duration: YEAR_CLIP, still: 4.5,
    update(t) {
      const year = t / YEAR_CLIP
      seasons.setLook(year)
      seasons.pose(year, EARTH_TILT, undefined, 12, 0.6 + year * Math.PI * 2)
      caption(monthAt(year), `North: ${seasonWord(50, year).toLowerCase()} · South: ${seasonWord(-50, year).toLowerCase()}`)
    },
    dispose() { lab.fairy.visible = true },
  }
} }

/** E2: one place through one year, each frame at noon. The clip starts in the middle of spring. */
const meadowYear: Feature = { id: 'E2', create(lab) {
  const kit = kitOf(lab), seasons = kit.earth, weather = kit.weather.earth, caption = captionOf(lab)
  const latitude = 32, spot = findSpot(seasons.world, latitude)
  const view = groundView(lab, seasons.world, spot, headingAt(spot, 1, 28))
  lab.setShot(view.shot)
  return {
    duration: YEAR_CLIP, still: 6,
    update(t, delta) {
      const year = 0.125 + t / YEAR_CLIP, season = seasonAt(latitude, year)
      seasons.setLook(year)
      seasons.pose(year, EARTH_TILT, spot)
      view.place(t)
      weather.update(t, delta, lab.camera.position, ...fallAt(latitude, year))
      caption(`${monthAt(year)} · ${PALETTE.words[season.name!]}`, `${latitudeLabel(latitude)} · ${title(season.name!)} · Sun at noon ${Math.round(season.noon)}° · day ${season.hours.toFixed(1)} h`)
    },
    dispose() { weather.update(0, 1, lab.camera.position, null, 0) },
  }
} }

/** E3: the same noon at four latitudes. */
const onePlaces: Feature = { id: 'E3', create(lab) {
  const kit = kitOf(lab), seasons = kit.earth, caption = captionOf(lab)
  const year = 0.375, each = 3
  const places = [35, 0, -35, -75].map(latitude => {
    const spot = findSpot(seasons.world, latitude)
    return { latitude, spot, view: groundView(lab, seasons.world, spot, headingAt(spot, 1, 28)) }
  })
  const at = (t: number) => places[Math.min(places.length - 1, Math.floor(t / each))]
  lab.setShot((camera, t) => at(t).view.shot(camera, t))
  seasons.setLook(year)
  return {
    duration: each * places.length, still: 7.5,
    update(t, delta) {
      const place = at(t), season = seasonAt(place.latitude, year)
      seasons.pose(year, EARTH_TILT, place.spot)
      place.view.place(t)
      kit.weather.earth.update(t, delta, lab.camera.position, ...fallAt(place.latitude, year))
      caption(`${monthAt(year)} · ${latitudeLabel(place.latitude)} · ${seasonWord(place.latitude, year)}`,
        season.noon < 0 ? 'Noon · the Sun does not rise today' : `Sun at noon ${Math.round(season.noon)}° · day ${season.hours.toFixed(1)} h`)
    },
    dispose() { kit.weather.earth.update(0, 1, lab.camera.position, null, 0) },
  }
} }

/** E4: the Sun at noon through one year, with the real tilt (A) and then with the painted year (B). */
const tiltOrPaint: Feature = { id: 'E4', create(lab) {
  const kit = kitOf(lab), seasons = kit.earth, caption = captionOf(lab)
  const latitude = 32, half = 6
  const spot = findSpot(seasons.world, latitude, -1, 0)
  // The camera looks toward the equator and up, at the noon Sun.
  const view = groundView(lab, seasons.world, spot, headingAt(spot, -1), { fov: 80, lookUp: 21.5, ahead: 20, circle: 4, height: 9 })
  lab.setShot(view.shot)
  return {
    duration: half * 2, still: 4.5,
    update(t, delta) {
      const real = t < half, year = (t % half) / half
      seasons.setLook(year)
      seasons.pose(year, real ? EARTH_TILT : 0, spot)
      view.place(t)
      kit.weather.earth.update(t, delta, lab.camera.position, ...fallAt(latitude, year))
      const noon = Math.round(noonElevation(latitude, real ? declination(year) : 0))
      caption(real ? 'A · Real tilt' : 'B · Painted year', `${monthAt(year)} · 32° N · ${seasonWord(latitude, year)} · Sun at noon ${noon}°${real ? '' : ', the same all year'}`)
    },
    dispose() { kit.weather.earth.update(0, 1, lab.camera.position, null, 0) },
  }
} }

// ---- The clips of Blossom Haven ----------------------------------------------------------------------

const COTTAGE = new THREE.Vector3(0, -1, 0), FAR_SIDE = new THREE.Vector3(0, 1, 0)

/** B1: one magic year from space. The camera is to the south, so the cottage is in the picture. */
const magicYear: Feature = { id: 'B1', create(lab) {
  const seasons = kitOf(lab).fairy, caption = captionOf(lab)
  lab.fairy.visible = false
  lab.setShot(spaceShot(lab, seasons.world, -0.55))
  return {
    duration: YEAR_CLIP, still: 7,
    update(t) {
      const year = stepped(t)
      seasons.setLook(year)
      seasons.pose(0, 0, undefined, 12, 0.6 + t * 0.12)
      caption(magicAt('rings', COTTAGE, year).season.name, `At the cottage: ${magicAt('rings', COTTAGE, year).season.name} · On the far side: ${magicAt('rings', FAR_SIDE, year).season.name}`)
    },
    dispose() { lab.fairy.visible = true },
  }
} }

/** B2: one grove through the four magic seasons. */
const magicGrove: Feature = { id: 'B2', create(lab) {
  const kit = kitOf(lab), seasons = kit.fairy, weather = kit.weather.fairy, caption = captionOf(lab)
  const spot = findSpot(seasons.world, 30), view = groundView(lab, seasons.world, spot, headingAt(spot, 1, 28))
  // The grove is not at the cottage, so its seasons come later. The clip starts in its Blossom time.
  const late = magicOffset('rings', spot)
  lab.setShot(view.shot)
  return {
    duration: YEAR_CLIP, still: 7,
    update(t, delta) {
      const year = stepped(t) + late, at = magicAt('rings', spot, year)
      seasons.setLook(year)
      seasons.pose(0, 0, spot)
      view.place(t)
      weather.update(t, delta, lab.camera.position, ...magicFall('rings', spot, year))
      caption(at.season.name, `${at.season.plants} · ${at.season.air}`)
    },
    dispose() { weather.update(0, 1, lab.camera.position, null, 0) },
  }
} }

/** The view of the flower cottage at the south pole of Blossom Haven. The door of the cottage faces local +Z. */
function cottageView(lab: Lab, world: World) {
  const view = groundView(lab, world, COTTAGE, new THREE.Vector3(-0.38, 0, -0.925).normalize(), { back: 25, eye: 3.4, ahead: 0, lookUp: 3.6, circle: 4.5, height: 3 })
  // The fairy circles between the camera and the door.
  const place = groundView(lab, world, new THREE.Vector3(0.04, -1, 0.1).normalize(), new THREE.Vector3(1, 0, 0), { ahead: 0, circle: 4 }).place
  return { shot: view.shot, place }
}
/** B4: Blossom time ends at the cottage and Bubble time starts there. */
const cottageChange: Feature = { id: 'B4', create(lab) {
  const kit = kitOf(lab), seasons = kit.fairy, weather = kit.weather.fairy, caption = captionOf(lab)
  const view = cottageView(lab, seasons.world)
  lab.setShot(view.shot)
  return {
    duration: 8, still: 6.5,
    update(t, delta) {
      const year = THREE.MathUtils.smoothstep(t, 1.5, 6) * 0.25, at = magicAt('rings', COTTAGE, year)
      seasons.setLook(year)
      // The planet has no tilt. 4 o'clock puts the low Sun behind the right shoulder of the camera.
      seasons.pose(0, 0, COTTAGE, 4)
      view.place(t)
      weather.update(t, delta, lab.camera.position, ...magicFall('rings', COTTAGE, year))
      caption(year < 0.02 ? 'Blossom time at the cottage' : year < 0.24 ? 'A new season starts at the door' : 'Bubble time', year < 0.125 ? `${at.season.plants} · ${at.season.air}` : 'The bubble blooms come up, and the ring goes out over the planet')
    },
    dispose() { weather.update(0, 1, lab.camera.position, null, 0) },
  }
} }

// ---- The live view --------------------------------------------------------------------------------

export type LivePlace = 'space' | 'cottage' | number
/** The controls of the live view. The page changes them; the live feature reads them on each frame. */
export const live = {
  world: 'earth' as WorldId,
  place: 32 as LivePlace,
  /** The year of Earth, or the magic year of Blossom Haven. */
  year: 0.375,
  play: false,
  /** Earth. A: the real tilt. B: the painted year. today: the game of today, for the two worlds. */
  model: 'A' as 'A' | 'B' | 'today',
  tilt: EARTH_TILT,
  hour: 12,
  weather: true,
  /** The player flies with the keys. */
  free: false,
}
export const LIVE: Feature = { id: 'LIVE', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab)
  const views = new Map<string, { spot: THREE.Vector3; shot: CameraShot; place: (t: number) => void }>()
  function viewOf(world: World, place: number | 'cottage') {
    const key = `${world.kind}-${place}`
    if (!views.has(key)) {
      if (place === 'cottage') views.set(key, { spot: COTTAGE, ...cottageView(lab, world) })
      else {
        const spot = findSpot(world, place)
        views.set(key, { spot, ...groundView(lab, world, spot, headingAt(spot, 1, 28)) })
      }
    }
    return views.get(key)!
  }
  const space = { earth: spaceShot(lab, lab.earth), fairy: spaceShot(lab, lab.home, -0.4) }
  const offset = new THREE.Vector3(), turn = new THREE.Quaternion(), inverse = new THREE.Quaternion(), here = new THREE.Vector3()
  let spin = 0.6
  return {
    duration: Infinity,
    update(t, delta) {
      const magic = live.world === 'fairy', seasons = kit[live.world], world = seasons.world
      if (live.play) live.year = (live.year + delta / YEAR_CLIP) % 1
      const on = live.model === 'today' ? 0 : 1, tilt = !magic && live.model === 'A' ? live.tilt : 0
      kit.earth.setOn(on); kit.fairy.setOn(on)
      if (magic) kit.fairy.setLook(live.year)
      else kit.earth.setLook(live.year, live.tilt)
      // Earth has no cottage: the pole button goes to 75° S there.
      const place = live.place === 'cottage' && !magic ? -75 : live.place
      const view = place === 'space' ? null : viewOf(world, place)
      // The planet of the magic seasons has no tilt, so its year does not turn it.
      const poseYear = magic ? 0 : live.year
      lab.fairy.visible = place !== 'space'
      if (live.free && view) {
        // The fairy flies with the keys. She stays on the world while the year turns it.
        inverse.copy(world.group.quaternion).invert()
        offset.copy(lab.fairy.position).sub(world.group.position).applyQuaternion(inverse)
        turn.copy(inverse).multiply(lab.fairy.quaternion)
        seasons.pose(poseYear, tilt, view.spot, live.hour)
        lab.fairy.position.copy(offset).applyQuaternion(world.group.quaternion).add(world.group.position)
        lab.fairy.quaternion.copy(world.group.quaternion).multiply(turn)
      } else if (view) {
        seasons.pose(poseYear, tilt, view.spot, live.hour)
        view.place(t)
        lab.setShot(view.shot)
      } else {
        spin += delta * 0.12
        seasons.pose(poseYear, tilt, undefined, 12, spin)
        lab.setShot(space[live.world])
      }
      // On the tripod the note gives the place. In free flight it follows the fairy.
      inverse.copy(world.group.quaternion).invert()
      if (live.free || !view) here.copy(lab.fairy.position).sub(world.group.position).applyQuaternion(inverse).normalize()
      else here.copy(view.spot)
      const latitude = Math.round(latitudeOf(here))
      const quiet = !live.weather || live.model === 'today' || place === 'space'
      const [fall, amount]: [Fall | null, number] = quiet ? [null, 0]
        : magic ? magicFall('rings', here, live.year)
        : fallAt(latitude, live.year, live.tilt)
      kit.weather[live.world].update(t, delta, lab.camera.position, fall, amount)
      kit.weather[magic ? 'earth' : 'fairy'].update(t, delta, lab.camera.position, null, 0)
      if (live.model === 'today') caption('The game of today', magic ? 'Blossom Haven has one look all the time' : 'No tilt and no season: the Sun is over the equator all year')
      else if (magic && place === 'space') caption(magicAt('rings', COTTAGE, live.year).season.name, `At the cottage: ${magicAt('rings', COTTAGE, live.year).season.name} · On the far side: ${magicAt('rings', FAR_SIDE, live.year).season.name}`)
      else if (magic) {
        const at = magicAt('rings', here, live.year)
        caption(at.season.name, `${at.season.plants} · ${at.season.air}`)
      } else if (place === 'space') caption(monthAt(live.year), `North: ${seasonWord(50, live.year).toLowerCase()} · South: ${seasonWord(-50, live.year).toLowerCase()}`)
      else {
        const sun = live.model === 'A' ? declination(live.year, live.tilt) : 0
        caption(`${monthAt(live.year)} · ${latitudeLabel(latitude)} · ${seasonWord(latitude, live.year)}`,
          `${live.model === 'A' ? 'A · Real tilt' : 'B · Painted year'} · Sun at noon ${Math.round(noonElevation(latitude, sun))}°`)
      }
    },
    dispose() {
      lab.fairy.visible = true
      for (const key of ['earth', 'fairy'] as const) kit.weather[key].update(0, 1, lab.camera.position, null, 0)
    },
  }
} }

/**
 * The clips that the capture can record, in the order of the page. Clip B3 (three patterns) is a
 * record of the second round: the game has the rings from the cottage only.
 */
export const SEASON_CLIPS: Partial<Record<ClipId, Feature>> = {
  E1: earthYear, E2: meadowYear, E3: onePlaces, E4: tiltOrPaint,
  B1: magicYear, B2: magicGrove, B4: cottageChange,
}
