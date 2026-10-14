import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { BOOK_KINDS, chooseFriend, createFriend, createFriendFollow, createFriendModel, emptyFriend, FRIEND, FRIEND_KINDS, friendFlies, friendGlance, friendName, friendPlace, friendSize, hasFriendGift, helloNotes, parseFriend, sayHello, SWAP, swapAt } from '../src/friend'
import type { FriendFrame, FriendGround, FriendKind, FriendState } from '../src/friend'

const wide = 1280 / 800, phone = 390 / 844

/**
 * Flies the fairy for `seconds` at `speed` m/s, with a turn to the left and to the right, a climb and a
 * dive, and one happy loop of the friend. It returns the largest distance from the friend to the fairy.
 */
function fly(speed: number, { rate = 60, seconds = 24, aspect = wide, carry = null as null | ((time: number) => THREE.Vector3) } = {}) {
  const follow = createFriendFollow()
  const fairy = new THREE.Vector3(500, 20, -300), heading = new THREE.Quaternion(), turn = new THREE.Quaternion(), shift = new THREE.Vector3()
  const place = friendPlace(aspect, false), forward = new THREE.Vector3()
  const delta = 1 / rate
  let farthest = 0, snaps = 0
  for (let frame = 0; frame < seconds * rate; frame++) {
    const time = frame * delta
    // The turn rates of stepFlight() in src/flight.ts: 0.78 rad/s to a side, 0.72 rad/s up and down.
    const yaw = Math.sin(time * 0.9) > 0 ? 0.78 : -0.78, pitch = Math.sin(time * 0.5) * 0.72
    heading.multiply(turn.setFromEuler(new THREE.Euler(pitch * delta, yaw * delta, 0, 'YXZ'))).normalize()
    fairy.addScaledVector(forward.set(0, 0, -1).applyQuaternion(heading), speed * delta)
    if (carry) fairy.add(shift.copy(carry(time)).multiplyScalar(delta))
    if (frame === Math.round(8 * rate)) expect(follow.cheer()).toBe(true)
    if (follow.step({ fairy, heading, delta, place, carry: carry ? shift : null }) && frame > 0) snaps++
    farthest = Math.max(farthest, follow.position.distanceTo(fairy))
  }
  return { farthest, snaps }
}

describe('fairy friend: the follow rule', () => {
  it('stays within the limit at each speed of the fairy, also at 20 frames a second', () => {
    const table: Record<string, string> = {}
    for (const speed of [0, 11, 32, 968, 2226]) {
      for (const rate of [60, 20]) {
        const { farthest, snaps } = fly(speed, { rate })
        table[`${speed} m/s at ${rate} fps`] = `${farthest.toFixed(2)} m`
        expect(farthest, `${speed} m/s at ${rate} fps`).toBeLessThan(FRIEND.limit)
        // A flight is not a jump: the friend eases to its place in each frame.
        expect(snaps, `${speed} m/s at ${rate} fps`).toBe(0)
      }
    }
    console.info('The largest distance from the friend to the fairy:', table)
  })

  it('stays within the limit on a narrow screen', () => {
    for (const speed of [11, 2226]) expect(fly(speed, { aspect: phone }).farthest).toBeLessThan(FRIEND.limit)
  })

  it('stays with her when a world carries her along its orbit, also at World speed 64×', () => {
    for (const factor of [1, 64]) {
      // Blossom Haven moves at 59 m/s on its orbit. The direction of the orbit turns slowly.
      const carry = (time: number) => new THREE.Vector3(Math.cos(time * 0.02), 0, Math.sin(time * 0.02)).multiplyScalar(59 * factor)
      const { farthest, snaps } = fly(32, { carry, rate: 20 })
      expect(farthest).toBeLessThan(FRIEND.limit)
      expect(snaps).toBe(0)
    }
  })

  it('is at its place when she flies straight, with no delay at 2,226 m/s', () => {
    const follow = createFriendFollow(), fairy = new THREE.Vector3(), heading = new THREE.Quaternion(), place = friendPlace(wide, false)
    for (let frame = 0; frame < 300; frame++) {
      fairy.z -= 2226 / 60
      follow.step({ fairy, heading, delta: 1 / 60, place, still: true })
    }
    expect(follow.position.clone().sub(fairy).distanceTo(place)).toBeLessThan(1e-6)
  })

  it('comes a little late in a turn', () => {
    const follow = createFriendFollow(), fairy = new THREE.Vector3(), heading = new THREE.Quaternion(), place = friendPlace(wide, false)
    follow.step({ fairy, heading, delta: 1 / 60, place, still: true })
    heading.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3)
    follow.step({ fairy, heading, delta: 1 / 60, place, still: true })
    const goal = place.clone().applyQuaternion(heading)
    const late = follow.position.distanceTo(goal)
    expect(late).toBeGreaterThan(0.3)
    for (let frame = 0; frame < 180; frame++) follow.step({ fairy, heading, delta: 1 / 60, place, still: true })
    expect(follow.position.distanceTo(goal)).toBeLessThan(0.01)
  })

  it('goes to its place at once after a jump of the fairy', () => {
    const follow = createFriendFollow(), fairy = new THREE.Vector3(10, 0, 0), heading = new THREE.Quaternion(), place = friendPlace(wide, false)
    expect(follow.step({ fairy, heading, delta: 1 / 60, place, still: true })).toBe(true)
    fairy.x += 1
    expect(follow.step({ fairy, heading, delta: 1 / 60, place, still: true })).toBe(false)
    // A move of the home: 3,000 m in one frame.
    fairy.add(new THREE.Vector3(3000, -200, 900))
    expect(follow.step({ fairy, heading, delta: 1 / 60, place, still: true })).toBe(true)
    expect(follow.position.clone().sub(fairy).distanceTo(place)).toBeLessThan(1e-9)
    // A test hook or a new start: a small move with a new heading.
    fairy.x += 20
    heading.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 2)
    expect(follow.step({ fairy, heading, delta: 1 / 60, place, still: true })).toBe(true)
    expect(follow.position.clone().sub(fairy).distanceTo(place.clone().applyQuaternion(heading))).toBeLessThan(1e-9)
    // The move of a world is not a jump, at each size.
    const carry = new THREE.Vector3(189, 0, 0)
    fairy.add(carry).z -= 1.6
    expect(follow.step({ fairy, heading, delta: 0.05, place, carry, still: true })).toBe(false)
    // A frame with no time (a pause, or Worlds with the worlds in motion) keeps the friend with her.
    fairy.add(carry)
    expect(follow.step({ fairy, heading, delta: 0, place, carry, still: true })).toBe(false)
    expect(follow.position.distanceTo(fairy)).toBeLessThan(FRIEND.limit)
  })

  it('stays over the ground and the water when she flies low', () => {
    // A world of 190 m with a hill to her right: the ground is 4 m higher there.
    const centre = new THREE.Vector3(0, -190, 0)
    const ground: FriendGround = { centre, radiusAt: direction => 190 + (direction.x > 0.004 ? 4 : 0) }
    const follow = createFriendFollow(), heading = new THREE.Quaternion(), place = friendPlace(wide, false)
    // The lowest flight of the fairy is 2.3 m over the ground (stepFlight() in src/flight.ts).
    const fairy = new THREE.Vector3(0, 2.3, 0)
    for (let frame = 0; frame < 240; frame++) {
      if (frame === 60) follow.cheer()
      fairy.z -= 11 / 60
      fairy.y = centre.y + Math.sqrt((190 + 2.3) ** 2 - fairy.z ** 2)
      follow.step({ fairy, heading, delta: 1 / 60, place, ground })
      const direction = follow.position.clone().sub(centre)
      expect(direction.length()).toBeGreaterThanOrEqual(ground.radiusAt(direction.clone().normalize()) + FRIEND.ground - 1e-6)
      expect(follow.position.distanceTo(fairy)).toBeLessThan(FRIEND.limit + 2)
    }
  })

  it('stays out of the line from the camera to the fairy, and away from the camera', () => {
    const follow = createFriendFollow(), fairy = new THREE.Vector3(), heading = new THREE.Quaternion()
    const camera = new THREE.Vector3(0, 2.8, 8)
    // A place between the camera and the fairy, and a place at the camera.
    for (const place of [new THREE.Vector3(0, 1.4, 4), new THREE.Vector3(0.2, 2.8, 7.5), new THREE.Vector3(0, 0, 0)]) {
      follow.reset()
      follow.step({ fairy, heading, delta: 1 / 60, place, camera, still: true })
      const line = new THREE.Line3(camera, fairy), nearest = line.closestPointToPoint(follow.position, true, new THREE.Vector3())
      expect(follow.position.distanceTo(nearest)).toBeGreaterThanOrEqual(FRIEND.lane - 1e-6)
      expect(follow.position.distanceTo(camera)).toBeGreaterThanOrEqual(FRIEND.near - 1e-6)
    }
    // The place at her side needs no change.
    follow.reset()
    const place = friendPlace(wide, false)
    follow.step({ fairy, heading, delta: 1 / 60, place, camera, still: true })
    expect(follow.position.distanceTo(place)).toBeLessThan(1e-9)
  })

  it('makes a happy loop around her, not more often than each 20 s', () => {
    const follow = createFriendFollow(), fairy = new THREE.Vector3(), heading = new THREE.Quaternion(), place = friendPlace(wide, false)
    const step = (seconds: number, check?: () => void) => { for (let t = 0; t < seconds; t += 1 / 60) { follow.step({ fairy, heading, delta: 1 / 60, place }); check?.() } }
    step(1)
    expect(follow.loop).toBe(0)
    expect(follow.cheer()).toBe(true)
    let left = false, over = false, under = false
    step(FRIEND.loopFor, () => {
      const at = follow.position
      left ||= at.x < -1; over ||= at.y > 1.5; under ||= at.y < -1
      // The loop goes around her, not through her.
      expect(at.distanceTo(fairy)).toBeGreaterThan(1.2)
    })
    expect(left && over && under).toBe(true)
    step(1)
    expect(follow.loop).toBe(0)
    expect(follow.position.distanceTo(place)).toBeLessThan(0.3)
    expect(follow.cheer()).toBe(false)
    step(FRIEND.loopRest - FRIEND.loopFor - 1.5)
    expect(follow.cheer()).toBe(false)
    step(1)
    expect(follow.cheer()).toBe(true)
    // The moment when the friend comes can start a loop at each time.
    expect(follow.cheer(false, true)).toBe(true)
  })

  it('makes no loop and no bob with reduced motion', () => {
    const follow = createFriendFollow(), fairy = new THREE.Vector3(), heading = new THREE.Quaternion(), place = friendPlace(wide, false)
    expect(follow.cheer(true)).toBe(false)
    expect(follow.cheer(true, true)).toBe(false)
    for (let frame = 0; frame < 120; frame++) {
      follow.step({ fairy, heading, delta: 1 / 60, place, still: true })
      expect(follow.position.distanceTo(place)).toBeLessThan(1e-9)
      expect(follow.loop).toBe(0)
    }
  })
})

describe('fairy friend: the place at her side', () => {
  /** The place of the friend on the screen, from -1 to 1, with the camera of updateCamera() in src/main.ts. */
  function onScreen(aspect: number, menu: boolean) {
    const camera = new THREE.PerspectiveCamera(58, aspect, 0.08, 80000)
    camera.position.set(0, 2.8, menu ? (aspect > 720 / 800 ? 3.4 : 5.8) : 8)
    camera.lookAt(0, 0, menu ? 0 : -12)
    camera.updateMatrixWorld()
    const place = friendPlace(aspect, menu)
    const centre = place.clone().project(camera)
    const edge = place.clone().add(new THREE.Vector3(FRIEND.bubble * friendSize(aspect, menu), 0, 0)).project(camera)
    return { x: centre.x, y: centre.y, radius: edge.x - centre.x, place }
  }

  it('is at her right side and in the view, on a computer and on a phone', () => {
    for (const aspect of [1280 / 800, 1024 / 768, 844 / 390, 390 / 844, 320 / 640]) {
      const { x, y, radius, place } = onScreen(aspect, false)
      expect(place.x).toBeGreaterThan(1)
      expect(x - radius, `aspect ${aspect}`).toBeGreaterThan(0.05)
      expect(x + radius * 0.6, `aspect ${aspect}`).toBeLessThan(1)
      expect(Math.abs(y) + radius * aspect, `aspect ${aspect}`).toBeLessThan(1)
    }
  })

  it('is nearer to her in the look menu, where the camera is close', () => {
    for (const aspect of [1280 / 800, 390 / 844]) {
      const { x, radius, place } = onScreen(aspect, true)
      expect(place.length()).toBeLessThan(friendPlace(aspect, false).length())
      expect(x).toBeGreaterThan(0)
      expect(x + radius).toBeLessThan(1)
      // On a computer the panel of the menu covers the right part of the view, and the view moves 13% to the left.
      if (aspect > 1) expect(x + radius - 0.26).toBeLessThan(1 - 2 * 358 / 1280)
    }
  })

  it('is a little smaller on a narrow screen', () => {
    expect(friendSize(wide)).toBe(1)
    expect(friendSize(phone)).toBeCloseTo(0.8)
    expect(friendSize(wide, true)).toBeLessThan(0.7)
  })

  it('looks back at her for a short time, and ahead for the other time', () => {
    let back = 0
    for (let t = 0; t < 12; t += 0.05) if (friendGlance(t) > 0.5) back += 0.05
    expect(back).toBeGreaterThan(1)
    expect(back).toBeLessThan(2.5)
    expect(friendGlance(0)).toBe(0)
    expect(friendGlance(14)).toBe(0)
  })
})

describe('fairy friend: the saved state', () => {
  it('has a card for each of the 48 kinds of the catalog, and a friend in each kind that is no school or swarm', () => {
    expect(BOOK_KINDS).toHaveLength(48)
    expect(FRIEND_KINDS).toHaveLength(44)
    expect(BOOK_KINDS.filter(kind => !FRIEND_KINDS.includes(kind)).sort()).toEqual(['butterfly', 'firefly', 'fish', 'honeyBee'])
    // The nine kinds of the first book keep their names.
    const first: FriendKind[] = ['cow', 'rabbit', 'sheep', 'duck', 'unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus']
    expect(first.map(friendName)).toEqual(['Cow', 'Rabbit', 'Sheep', 'Duck', 'Unicorn', 'Dragonling', 'Kitsune kit', 'Frog Prince', 'Pegasus foal'])
    expect(first.filter(friendFlies)).toEqual(['duck', 'dragonling', 'pegasus'])
    // A kind with wings flies; the others ride in the bubble, also a whale and a giraffe.
    for (const kind of ['stork', 'parrot', 'seagull', 'goose', 'griffin', 'phoenix', 'lanternMoth', 'owlet'] as FriendKind[]) expect(friendFlies(kind), kind).toBe(true)
    for (const kind of ['whale', 'giraffe', 'penguin', 'flamingo', 'bubbleFish', 'jelly'] as FriendKind[]) expect(friendFlies(kind), kind).toBe(false)
  })

  it('keeps the kinds that she met, and gives the friend at the fifth hello', () => {
    let state = emptyFriend()
    const first = sayHello(state, ['sheep'])
    expect(first).toEqual({ state: { hellos: 1, met: ['sheep'], friend: null }, gift: null, fresh: ['sheep'] })
    state = sayHello(first.state, ['sheep', 'cow']).state
    expect(state).toEqual({ hellos: 3, met: ['sheep', 'cow'], friend: null })
    expect(hasFriendGift(state)).toBe(false)
    // No friend before the gift.
    expect(chooseFriend(state, 'cow')).toBe(state)
    state = sayHello(state, ['cow']).state
    const fifth = sayHello(state, ['duck', 'rabbit'])
    // The fifth hello is the duck. The rabbit of the same frame is met, and it is not the gift.
    expect(fifth.gift).toBe('duck')
    expect(fifth.fresh).toEqual(['duck', 'rabbit'])
    expect(fifth.state).toEqual({ hellos: 5, met: ['sheep', 'cow', 'duck', 'rabbit'], friend: 'duck' })
    expect(hasFriendGift(fifth.state)).toBe(true)
  })

  it('counts to five and stops: the count is not a score', () => {
    let state = sayHello(emptyFriend(), ['cow', 'cow', 'cow', 'cow', 'cow', 'cow', 'cow']).state
    expect(state.hellos).toBe(5)
    const more = sayHello(state, ['cow', 'unicorn'])
    expect(more.state).toEqual({ hellos: 5, met: ['cow', 'unicorn'], friend: 'cow' })
    expect(more.gift).toBeNull()
    expect(more.fresh).toEqual(['unicorn'])
    // A later hello does not change the friend that she selected.
    state = chooseFriend(more.state, 'unicorn')
    expect(sayHello(state, ['cow']).state.friend).toBe('unicorn')
  })

  it('ignores an unknown kind, and gives a school or a swarm its card but no heart', () => {
    const result = sayHello(emptyFriend(), ['dragon', 7, null, 'butterfly', 'cow'])
    expect(result.state).toEqual({ hellos: 1, met: ['butterfly', 'cow'], friend: null })
    expect(result.fresh).toEqual(['butterfly', 'cow'])
    // Five hellos of fish give no friend: a school is not one animal.
    expect(sayHello(emptyFriend(), ['fish', 'fish', 'fish', 'fish', 'fish', 'fish']).state).toEqual({ hellos: 0, met: ['fish'], friend: null })
  })

  it('selects only a friend that she met, or no friend', () => {
    const state: FriendState = { hellos: 5, met: ['cow', 'duck'], friend: 'cow' }
    expect(chooseFriend(state, 'duck').friend).toBe('duck')
    expect(chooseFriend(state, null).friend).toBeNull()
    expect(chooseFriend(state, 'pegasus')).toBe(state)
    // A school or a swarm that she met is in the book, but it is no friend.
    const swarm: FriendState = { hellos: 5, met: ['cow', 'honeyBee'], friend: 'cow' }
    expect(chooseFriend(swarm, 'honeyBee')).toBe(swarm)
    expect(parseFriend({ ...swarm, friend: 'honeyBee' }).friend).toBeNull()
  })

  it('loads a saved state', () => {
    const state: FriendState = { hellos: 5, met: ['cow', 'pegasus'], friend: 'pegasus' }
    expect(parseFriend(JSON.parse(JSON.stringify(state)))).toEqual(state)
    expect(parseFriend({ hellos: 5, met: ['cow'], friend: null })).toEqual({ hellos: 5, met: ['cow'], friend: null })
    expect(parseFriend({ hellos: 3, met: ['cow', 'duck'] })).toEqual({ hellos: 3, met: ['cow', 'duck'], friend: null })
  })

  it('ignores a missing or broken saved state', () => {
    for (const value of [null, undefined, 'cow', 7, [], { hellos: 'many' }, { met: 'cow' }, { hellos: 5 }]) expect(parseFriend(value)).toEqual(emptyFriend())
    // Each bad part goes, and each good part stays.
    expect(parseFriend({ hellos: 99, met: ['cow', 'dragon', 'cow', 4], friend: 'cow' })).toEqual({ hellos: 5, met: ['cow'], friend: 'cow' })
    expect(parseFriend({ hellos: 5, met: ['cow'], friend: 'duck' })).toEqual({ hellos: 5, met: ['cow'], friend: null })
    expect(parseFriend({ hellos: 2, met: ['cow'], friend: 'cow' })).toEqual({ hellos: 2, met: ['cow'], friend: null })
    expect(parseFriend({ hellos: -3, met: ['cow'] }).hellos).toBe(1)
    expect(parseFriend({ hellos: NaN, met: ['cow'] }).hellos).toBe(1)
  })
})

describe('fairy friend: the joined model', () => {
  it('is two meshes for each kind: the body, and the wings or the bubble', () => {
    for (const kind of FRIEND_KINDS) {
      const model = createFriendModel(kind, null)
      // The dust is the third draw call. It needs a texture, so the game adds it.
      expect(model.calls, kind).toBe(2)
      const meshes: THREE.Mesh[] = []
      model.root.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object) })
      const bubble = meshes.some(mesh => (mesh.material as THREE.Material).transparent)
      expect(bubble, kind).toBe(!friendFlies(kind))
      // The body fits in the bubble.
      const body = meshes[0].geometry
      expect(body.boundingSphere!.radius, kind).toBeCloseTo(FRIEND.body, 5)
      expect(body.boundingSphere!.center.length(), kind).toBeLessThan(0.05)
      expect(FRIEND.body).toBeLessThan(FRIEND.bubble)
      expect(body.attributes.color.count, kind).toBe(body.attributes.position.count)
      model.animate(1, { loop: 0, still: false, fast: true, light: 1 })
      model.dispose()
    }
  })
})

describe('fairy friend: the notes of the hellos', () => {
  it('shows a card note at the first hello of a kind, with the hearts before the gift', () => {
    const first = helloNotes(emptyFriend(), ['sheep'])
    expect(first.notes).toEqual([{ kind: 'sheep', gift: false, hearts: 1 }])
    // A hello to a kind that she met adds a heart and shows no note.
    const again = helloNotes(first.state, ['sheep'])
    expect(again.notes).toEqual([])
    expect(again.state.hellos).toBe(2)
    // Two new kinds in one frame: two notes, each with the hearts at its hello.
    expect(helloNotes(again.state, ['cow', 'duck']).notes).toEqual([{ kind: 'cow', gift: false, hearts: 3 }, { kind: 'duck', gift: false, hearts: 4 }])
  })

  it('shows the gift note at the fifth hello, in the place of the card note of a new kind', () => {
    const state: FriendState = { hellos: 4, met: ['sheep', 'duck'], friend: null }
    expect(helloNotes(state, ['rabbit']).notes).toEqual([{ kind: 'rabbit', gift: true, hearts: 5 }])
    // The fifth hello of a kind that she met is the gift note too.
    expect(helloNotes(state, ['duck']).notes).toEqual([{ kind: 'duck', gift: true, hearts: 5 }])
    // After the gift a new kind has its card note, with no hearts.
    const result = helloNotes(state, ['duck', 'cow', 'duck'])
    expect(result.notes).toEqual([{ kind: 'duck', gift: true, hearts: 5 }, { kind: 'cow', gift: false, hearts: null }])
    expect(result.state).toEqual(sayHello(state, ['duck', 'cow', 'duck']).state)
  })

  it('gives the same state as sayHello() for each list of hellos', () => {
    const lists: unknown[][] = [['cow'], ['cow', 'cow', 'duck', 'butterfly', 'pegasus', 'unicorn', 'cow'], [...FRIEND_KINDS], []]
    for (const kinds of lists) expect(helloNotes(emptyFriend(), kinds).state).toEqual(sayHello(emptyFriend(), kinds).state)
  })
})

describe('fairy friend: the swap', () => {
  it('waves, flies home, and the new friend comes out of the sky after 1.5 s', () => {
    expect(swapAt(0, true, true)).toMatchObject({ old: 'wave', next: 'wait', done: false })
    expect(swapAt(0.5, true, true)).toMatchObject({ old: 'wave', next: 'wait' })
    expect(swapAt(1, true, true)).toMatchObject({ old: 'home', next: 'wait' })
    expect(swapAt(2, true, true)).toMatchObject({ old: 'home', next: 'sky' })
    expect(swapAt(2, true, true).nextK).toBeCloseTo(1 / 3)
    expect(swapAt(3.01, true, true)).toMatchObject({ old: 'gone', next: 'here', done: true })
    // Two friends are in the scene from the arrival to the end of the way home: 1.5 s. The whole swap takes 3 s.
    expect(SWAP.wave + SWAP.home - SWAP.arrive).toBeCloseTo(1.5)
    expect(Math.max(SWAP.wave + SWAP.home, SWAP.arrive + SWAP.sky)).toBeCloseTo(3)
  })

  it('brings the first friend at once, and "No friend" only sends the friend home', () => {
    expect(swapAt(0, false, true)).toMatchObject({ old: 'gone', next: 'sky', done: false })
    expect(swapAt(1.6, false, true)).toMatchObject({ next: 'here', done: true })
    expect(swapAt(2, true, false)).toMatchObject({ old: 'home', next: 'here', done: false })
    expect(swapAt(3.1, true, false).done).toBe(true)
  })
})

describe('fairy friend: the friend in the scene', () => {
  const frame = (fairy: THREE.Vector3, still = false): FriendFrame => ({
    fairy, heading: new THREE.Quaternion(), delta: 1 / 60, place: friendPlace(wide, false), menu: false, fast: false, light: 1, size: 1, still,
  })
  /** Flies the fairy for `seconds`, and gives the state of the friends in each frame. */
  function fly(friend: ReturnType<typeof createFriend>, seconds: number, each?: (time: number, arrived: boolean) => void, still = false) {
    const fairy = new THREE.Vector3()
    for (let t = 0; t < seconds; t += 1 / 60) {
      fairy.z -= 11 / 60
      const arrived = friend.update(frame(fairy, still))
      each?.(t, arrived)
    }
    return fairy
  }
  const make = (kind: FriendKind | null) => {
    const friend = createFriend(new THREE.Scene(), new THREE.Texture())
    friend.setKind(kind, false)
    fly(friend, 0.5)
    return friend
  }

  it('has two friends in the scene for 1.5 s of a swap (6 draw calls), then one', () => {
    const friend = make('pegasus')
    expect(friend.calls).toBe(3)
    expect(friend.swap('sheep')).toBe(true)
    expect(friend.swap('sheep')).toBe(false)
    let six = 0, arrivals = 0, most = 0, looped = false
    fly(friend, 4, (time, arrived) => {
      if (friend.calls === 6) six += 1 / 60
      most = Math.max(most, friend.calls)
      if (arrived) { arrivals++; expect(time).toBeGreaterThan(2.9); expect(time).toBeLessThan(3.1) }
      looped ||= friend.follow.loop > 0
    })
    expect(most).toBe(6)
    expect(six).toBeGreaterThan(1.4)
    expect(six).toBeLessThan(1.6)
    // The new friend makes the happy loop when it is at its place, and the old one is gone.
    expect(arrivals).toBe(1)
    expect(looped).toBe(true)
    expect(friend.kind).toBe('sheep')
    expect(friend.leaving).toBeNull()
    expect(friend.swapping).toBe(false)
    expect(friend.calls).toBe(3)
  })

  it('sends the old friend home and away from her, and brings the new one from the sky to her side', () => {
    const friend = make('cow')
    friend.swap('duck')
    let far = 0, start = Infinity
    const fairy = fly(friend, 3.2, time => {
      const leaver = friend.group.getObjectByName('friend-leaving')!
      if (friend.leaving) far = Math.max(far, leaver.position.length())
      if (friend.holder.visible && time < 1.7) start = Math.min(start, friend.holder.position.z)
    })
    // A bubble flies 20 m home. The new friend leaves the sky 15 m ahead of her.
    expect(far).toBeGreaterThan(15)
    expect(start).toBeLessThan(-10)
    expect(friend.holder.position.distanceTo(fairy)).toBeLessThan(FRIEND.limit)
  })

  it('brings the first friend from the sky, and lets the friend fly home for "No friend"', () => {
    const friend = make(null)
    expect(friend.update(frame(new THREE.Vector3()))).toBe(false)
    friend.swap('unicorn')
    expect(friend.calls).toBe(0)
    let arrivedAt = -1
    fly(friend, 2, (time, arrived) => { if (arrived) arrivedAt = time })
    expect(arrivedAt).toBeGreaterThan(1.4)
    expect(arrivedAt).toBeLessThan(1.6)
    friend.swap(null)
    expect(friend.kind).toBeNull()
    expect(friend.leaving).toBe('unicorn')
    fly(friend, 3.2)
    expect(friend.leaving).toBeNull()
    expect(friend.calls).toBe(0)
  })

  it('changes at once with reduced motion, and with setKind()', () => {
    const friend = make('rabbit')
    friend.swap('dragonling')
    fly(friend, 1 / 60, undefined, true)
    expect(friend.swapping).toBe(false)
    expect(friend.leaving).toBeNull()
    expect(friend.holder.visible).toBe(true)
    friend.swap('kitsune')
    friend.setKind('frogPrince', false)
    expect(friend.swapping).toBe(false)
    expect(friend.kind).toBe('frogPrince')
    expect(friend.calls).toBe(3)
  })

  it('starts no happy loop of its own in a swap', () => {
    const friend = make('sheep')
    friend.swap('cow')
    fly(friend, 1)
    expect(friend.cheer(false)).toBe(false)
  })
})

describe('fairy friend: the saved data of the animal book', () => {
  it('loads the saved data of F19 with no change: the met list is the book', () => {
    // Records as F19 saved them before the animal book: the same three fields.
    const records: FriendState[] = [
      { hellos: 5, met: ['cow', 'sheep', 'pegasus', 'duck'], friend: 'pegasus' },
      { hellos: 5, met: ['sheep', 'cow', 'duck', 'rabbit', 'unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus'], friend: null },
      { hellos: 2, met: ['duck'], friend: null },
      { hellos: 0, met: [], friend: null },
    ]
    for (const record of records) expect(parseFriend(JSON.parse(JSON.stringify(record)))).toEqual(record)
    // A field that the game does not know is ignored.
    expect(parseFriend({ hellos: 5, met: ['cow'], friend: 'cow', book: ['duck'] })).toEqual({ hellos: 5, met: ['cow'], friend: 'cow' })
  })
})
