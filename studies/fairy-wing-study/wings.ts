import type { FairyLook } from '../../src/customization'
import type { ClassicWing, createFairyRig } from '../../src/fairy'
import { ALL_LEVERS } from '../../src/fairy-wings/wings'
import type { Levers, WingStats } from '../../src/fairy-wings/wings'
import { designById } from './designs'

/**
 * The wings of the study on the fairy rig of the game: one of the twenty wings, with the
 * levers of the study, or one of the three wings of before. The wing code is in
 * src/fairy-wings/.
 */
/** The three wings of the game of before, as options of the study. */
export const BEFORE: Record<string, ClassicWing> = { B1: 'petal', B2: 'luna', B3: 'flutter' }

export function createStudyWings(rig: ReturnType<typeof createFairyRig>) {
  /** Shows a wing of the study, or one of the three wings of before (B1 to B3). */
  function show(id: string, look: FairyLook, levers: Levers = ALL_LEVERS): WingStats {
    // applyLook() gives the colours to the body and to the wings of before.
    rig.applyLook(look)
    for (const [style, group] of Object.entries(rig.classicWings)) group.visible = style === BEFORE[id]
    const design = designById(id)
    if (design) return rig.wings.show(design, look, levers)
    rig.wings.hide()
    // The game of before drew each wing as one mesh and one edge line, with no picture. Petal had a vein line also.
    return { panels: 2, drawCalls: BEFORE[id] === 'petal' ? 12 : 8, pictures: 0, megabytes: 0, ms: 0 }
  }
  return { show }
}
