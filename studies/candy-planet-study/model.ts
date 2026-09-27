export const dimensions = { earthRadius: 220, homeRadius: 110 } as const
export type LocationMode = 'rim' | 'roaming' | 'doorway'
export type VisitorState = 'away' | 'travelling' | 'home'
export const locationOptions = {
  doorway: { name: 'Faraway home, friendly doorway', tag: 'RECOMMENDED', detail: 'The planet stays beyond Neptune in our storybook solar system. A flower doorway near Earth gives a short, reliable route home.', child: 'The flower always means home.', risk: 'The shortcut is fantasy, not real astronomy. Show the faraway destination on the picture map.', timing: 'Aim for 30–60 seconds from choosing the flower to reaching the meadow; playtest, don’t impose a timer.' },
  rim: { name: 'A fixed home at the outer rim', tag: 'SIMPLE ALTERNATIVE', detail: 'A permanent pink world beyond Neptune. A flower trail guides the entire journey, with an optional skip-ahead flower doorway.', child: 'Home stays in the same place.', risk: 'A long, empty flight may lose interest. Compress travel and keep the Home button available.', timing: 'Keep assisted travel brief. Real solar-system distances are not used.' },
  roaming: { name: 'A wandering candy planet', tag: 'OPTIONAL MAGIC', detail: 'Every 20 minutes of active play, the planet may move to another illustrated outer-system location. The landscape and cottage never change.', child: 'Home moves, but the flower still knows the way.', risk: 'A disappearing destination can make the search confusing. Never move it while the child is approaching or visiting.', timing: 'No countdown, deadline, or waiting for a window. Defer movement until the child has left; no catch-up jumps after a closed tab.' },
} as const

export const ecosystem = [
  { id: 'water', number: '01', symbol: '◌', title: 'Soda springs', subtitle: 'Water / a gentle fizz', color: '#8bc9cd', view: 'water', role: 'Mint-blue sparkling water feeds a wide river and little pools. Round bubbles drift upward, with no sticky or dangerous liquid.', response: 'Fly low and a few bubbles rise beside you. Touching one makes a soft glimmer; nothing to collect.', guardrail: 'Use slow bubbles, not a screen full of particles. No drowning, splash punishment, or drinking rewards.', link: 'Soda springs → mint banks → cloud wisps', build: 'A water material, low-density bubbles, and one optional quiet pop sound.' },
  { id: 'trees', number: '02', symbol: '◎', title: 'Lollipop groves', subtitle: 'Canopy / round landmarks', color: '#edb46e', view: 'grove', role: 'Tall spiral lollipops and round candy crowns frame clear flying lanes. Warm peach and pink canopies stand apart from cool water.', response: 'A nearby tree sways hello. Its candy stays on the tree—no harvesting or running out.', guardrail: 'Open spacing, rounded silhouettes, and wide paths. Never require weaving between trunks.', link: 'Candy blossoms → ribbon butterflies → new blossoms', build: 'Shared low-poly stems, flat spiral discs, and a few round crowns.' },
  { id: 'canes', number: '03', symbol: '∩', title: 'Candy-cane gardens', subtitle: 'Understory / a path home', color: '#d87791', view: 'grove', role: 'Striped hooks and peppermint shrubs line the route from the river to the flower cottage. Mint leaves soften the sugar-pink ground.', response: 'The stripes brighten gently when she passes. A pair of canes can frame a welcoming arch.', guardrail: 'Arches are decorations, not gates to hit. Do not block the route if the child misses one.', link: 'Mint ground cover → sheltered gardens → cottage', build: 'Curved tube geometry with broad stripes; no sharp spikes.' },
  { id: 'ground', number: '04', symbol: '⌁', title: 'Marshmallow meadows', subtitle: 'Ground / somewhere soft', color: '#efb8cf', view: 'meadow', role: 'Rose-colored rolling hills, cream paths, gumdrop shrubs, biscuit-colored shores, and rounded marshmallow stones.', response: 'Meadow flowers open as the fairy drifts nearby. She can skim the ground safely.', guardrail: 'Keep most of the ground quiet. Candy accents need empty space around them so the fairy remains visible.', link: 'Cloud dew → meadows → candy groves', build: 'Gentle procedural terrain with a fixed clear area around home.' },
  { id: 'sky', number: '05', symbol: '☁', title: 'Cotton-candy clouds', subtitle: 'Weather / always welcoming', color: '#c6b5de', view: 'clouds', role: 'Cream and pale-lilac clouds float above the groves. Occasional sparkly dew nourishes the make-believe landscape.', response: 'Passing through a cloud reveals the world again with a soft color fade.', guardrail: 'No storms, lightning, dark surprise, or obscuring the flower guide. Motion can be paused.', link: 'Soda mist → clouds → soft dew → springs', build: 'Sparse cloud clusters, not thick fog. Fantasy climate even at the outer rim.' },
  { id: 'friends', number: '06', symbol: '⋈', title: 'Ribbon butterflies', subtitle: 'Neighbors / no chores', color: '#9fae83', view: 'friends', role: 'A few petal-winged friends wander between candy blossoms. Optional later residents: marshmallow rabbits and little soda-pool floaters.', response: 'One butterfly accompanies her briefly, then returns to its garden. The child never has to chase it.', guardrail: 'No hunger meters, feeding duties, predators, or distress if she leaves. More species are later options, not required scope.', link: 'Blossoms shelter friends; friends carry sparkle between blossoms', build: 'Start with three simple butterflies. Keep other creatures as concepts until this feels calm.' },
  { id: 'home', number: '07', symbol: '✿', title: 'The flower cottage', subtitle: 'Home / the goal of the game', color: '#b987af', view: 'home', role: 'A cream cottage with a petal roof, warm windows, and a wide pink garden. The same cottage and landscape greet every return.', response: 'Arrive anywhere in the broad garden: windows glow, petals drift, and the fairy continues flying.', guardrail: 'No precise landing, required button press, locked door, timer, or game-over screen.', link: 'Every landmark points gently back to one familiar home', build: 'One clear landmark, saved discovery, and an always-available flower Home button.' },
] as const

export function createLocationPreview() {
  let mode: LocationMode = 'doorway', visitor: VisitorState = 'away'
  let activeSeconds = 0, location = 0, pending = false
  return {
    get state() { return { mode, visitor, activeSeconds, location, pending } },
    setMode(value: LocationMode) { mode = value; activeSeconds = 0; location = 0; pending = false },
    setVisitor(value: VisitorState) {
      visitor = value
      if (pending && visitor === 'away') { location = (location + 1) % 3; activeSeconds = 0; pending = false }
    },
    advance(seconds: number, active = true) {
      if (!active || mode !== 'roaming' || seconds <= 0) return
      activeSeconds = Math.min(1200, activeSeconds + seconds)
      if (activeSeconds >= 1200) {
        if (visitor !== 'away') pending = true
        else { location = (location + 1) % 3; activeSeconds = 0; pending = false }
      }
    },
  }
}
