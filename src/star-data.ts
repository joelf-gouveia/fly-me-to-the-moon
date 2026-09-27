/** Hand-authored sky scenery; the star rows are in src/star-catalog.ts.
 * See docs/star-data.md for sources, licenses and limits.
 *
 * Picture paths use catalog designations ("Alp Ori" = Alpha Orionis), which
 * src/star-map.ts resolves to Bright Star Catalog HR numbers. The outlines are
 * original, simplified teaching shapes, not copies of a published figure set.
 * The Big Dipper is an asterism within Ursa Major, not a separate constellation.
 */
export type FigureKind = 'constellation' | 'asterism'
export type SkyBand = 'north' | 'middle' | 'south'

export type StarFigure = {
  id: string; name: string; picture: string; kind: FigureKind; band: SkyBand
  paths: readonly (readonly string[])[]
}

export const starPictures: readonly StarFigure[] = [
  { id: 'orion', name: 'Orion', picture: 'The Hunter', kind: 'constellation', band: 'middle',
    paths: [['Alp Ori', 'Gam Ori', 'Del Ori', 'Bet Ori', 'Kap Ori', 'Zet Ori', 'Alp Ori'], ['Del Ori', 'Eps Ori', 'Zet Ori'], ['Alp Ori', 'Lam Ori', 'Gam Ori']] },
  { id: 'big-dipper', name: 'Big Dipper', picture: 'Part of the Great Bear', kind: 'asterism', band: 'north',
    paths: [['Alp UMa', 'Bet UMa', 'Gam UMa', 'Del UMa', 'Alp UMa'], ['Del UMa', 'Eps UMa', 'Zet UMa', 'Eta UMa']] },
  { id: 'cassiopeia', name: 'Cassiopeia', picture: 'The Queen', kind: 'constellation', band: 'north',
    paths: [['Bet Cas', 'Alp Cas', 'Gam Cas', 'Del Cas', 'Eps Cas']] },
  { id: 'ursa-minor', name: 'Little Dipper', picture: 'The Little Bear', kind: 'constellation', band: 'north',
    paths: [['Alp UMi', 'Del UMi', 'Eps UMi', 'Zet UMi', 'Bet UMi', 'Gam UMi', 'Eta UMi', 'Zet UMi']] },
  { id: 'draco', name: 'Draco', picture: 'The Dragon', kind: 'constellation', band: 'north',
    paths: [['Lam Dra', 'Kap Dra', 'Alp Dra', 'Iot Dra', 'The Dra', 'Eta Dra', 'Zet Dra', 'Del Dra', 'Xi Dra', 'Nu2 Dra', 'Bet Dra', 'Gam Dra', 'Xi Dra']] },
  { id: 'cygnus', name: 'Cygnus', picture: 'The Swan', kind: 'constellation', band: 'north',
    paths: [['Alp Cyg', 'Gam Cyg', 'Eta Cyg', 'Bet1 Cyg'], ['Del Cyg', 'Gam Cyg', 'Eps Cyg']] },
  { id: 'lyra', name: 'Lyra', picture: 'The Harp', kind: 'constellation', band: 'north',
    paths: [['Alp Lyr', 'Zet1 Lyr', 'Bet Lyr', 'Gam Lyr', 'Del2 Lyr', 'Zet1 Lyr']] },
  { id: 'perseus', name: 'Perseus', picture: 'The Hero', kind: 'constellation', band: 'north',
    paths: [['Eta Per', 'Gam Per', 'Alp Per', 'Del Per', 'Eps Per', 'Xi Per', 'Zet Per'], ['Alp Per', 'Bet Per', 'Rho Per']] },
  { id: 'auriga', name: 'Auriga', picture: 'The Charioteer', kind: 'constellation', band: 'north',
    paths: [['Alp Aur', 'Bet Aur', 'The Aur', 'Bet Tau', 'Iot Aur', 'Alp Aur']] },
  { id: 'andromeda', name: 'Andromeda', picture: 'The Princess', kind: 'constellation', band: 'north',
    paths: [['Alp And', 'Del And', 'Bet And', 'Gam1 And']] },
  { id: 'pegasus', name: 'Pegasus', picture: 'The Winged Horse', kind: 'constellation', band: 'middle',
    paths: [['Alp Peg', 'Bet Peg', 'Alp And', 'Gam Peg', 'Alp Peg'], ['Alp Peg', 'Zet Peg', 'The Peg', 'Eps Peg']] },
  { id: 'bootes', name: 'Boötes', picture: 'The Herdsman', kind: 'constellation', band: 'middle',
    paths: [['Alp Boo', 'Eps Boo', 'Del Boo', 'Bet Boo', 'Gam Boo', 'Rho Boo', 'Alp Boo'], ['Alp Boo', 'Zet Boo']] },
  { id: 'leo', name: 'Leo', picture: 'The Lion', kind: 'constellation', band: 'middle',
    paths: [['Eps Leo', 'Mu Leo', 'Zet Leo', 'Gam1 Leo', 'Eta Leo', 'Alp Leo'], ['Alp Leo', 'The Leo', 'Bet Leo', 'Del Leo', 'Gam1 Leo'], ['Del Leo', 'The Leo']] },
  { id: 'gemini', name: 'Gemini', picture: 'The Twins', kind: 'constellation', band: 'middle',
    paths: [['Alp Gem', 'Bet Gem'], ['Alp Gem', 'Tau Gem', 'Eps Gem', 'Mu Gem'], ['Bet Gem', 'Del Gem', 'Zet Gem', 'Gam Gem']] },
  { id: 'taurus', name: 'Taurus', picture: 'The Bull', kind: 'constellation', band: 'middle',
    paths: [['Bet Tau', 'Eps Tau', 'Del1 Tau', 'Gam Tau', 'The2 Tau', 'Alp Tau', 'Zet Tau']] },
  { id: 'aquila', name: 'Aquila', picture: 'The Eagle', kind: 'constellation', band: 'middle',
    paths: [['Gam Aql', 'Alp Aql', 'Bet Aql'], ['Alp Aql', 'Del Aql', 'Lam Aql'], ['Zet Aql', 'Del Aql'], ['Alp Aql', 'The Aql']] },
  { id: 'canis-minor', name: 'Canis Minor', picture: 'The Little Dog', kind: 'constellation', band: 'middle',
    paths: [['Alp CMi', 'Bet CMi']] },
  { id: 'canis-major', name: 'Canis Major', picture: 'The Big Dog', kind: 'constellation', band: 'south',
    paths: [['Bet CMa', 'Alp CMa', 'Del CMa', 'Eta CMa'], ['Del CMa', 'Eps CMa']] },
  { id: 'scorpius', name: 'Scorpius', picture: 'The Scorpion', kind: 'constellation', band: 'south',
    paths: [['Bet1 Sco', 'Del Sco', 'Pi Sco'], ['Del Sco', 'Sig Sco', 'Alp Sco', 'Tau Sco', 'Eps Sco', 'Mu1 Sco', 'Zet2 Sco', 'Eta Sco', 'The Sco', 'Iot1 Sco', 'Kap Sco', 'Lam Sco']] },
  { id: 'crux', name: 'Southern Cross', picture: 'Crux, the Cross', kind: 'constellation', band: 'south',
    paths: [['Alp1 Cru', 'Gam Cru'], ['Bet Cru', 'Del Cru']] },
  { id: 'summer-triangle', name: 'Summer Triangle', picture: 'Three bright friends', kind: 'asterism', band: 'middle',
    paths: [['Alp Lyr', 'Alp Cyg', 'Alp Aql', 'Alp Lyr']] },
  { id: 'winter-triangle', name: 'Winter Triangle', picture: 'Three bright friends', kind: 'asterism', band: 'middle',
    paths: [['Alp Ori', 'Alp CMa', 'Alp CMi', 'Alp Ori']] },
  { id: 'teapot', name: 'Teapot', picture: 'Inside Sagittarius', kind: 'asterism', band: 'south',
    paths: [['Gam2 Sgr', 'Del Sgr', 'Eps Sgr', 'Gam2 Sgr'], ['Del Sgr', 'Lam Sgr', 'Phi Sgr', 'Del Sgr'], ['Phi Sgr', 'Zet Sgr', 'Eps Sgr'], ['Phi Sgr', 'Sig Sgr', 'Tau Sgr', 'Zet Sgr']] },
  { id: 'pointers', name: 'The Pointers', picture: 'They point to the Cross', kind: 'asterism', band: 'south',
    paths: [['Alp1 Cen', 'Bet Cen']] },
]

/** IAU Working Group on Star Names proper names for labelled bright stars. */
export const starNames: Readonly<Record<string, string>> = {
  'Alp CMa': 'Sirius', 'Alp Car': 'Canopus', 'Alp1 Cen': 'Rigil Kentaurus', 'Alp Boo': 'Arcturus',
  'Alp Lyr': 'Vega', 'Alp Aur': 'Capella', 'Bet Ori': 'Rigel', 'Alp CMi': 'Procyon', 'Alp Eri': 'Achernar',
  'Alp Ori': 'Betelgeuse', 'Bet Cen': 'Hadar', 'Alp Aql': 'Altair', 'Alp1 Cru': 'Acrux', 'Alp Tau': 'Aldebaran',
  'Alp Sco': 'Antares', 'Alp Vir': 'Spica', 'Bet Gem': 'Pollux', 'Alp PsA': 'Fomalhaut', 'Alp Cyg': 'Deneb',
  'Bet Cru': 'Mimosa', 'Alp Leo': 'Regulus', 'Alp Gem': 'Castor', 'Alp UMi': 'Polaris', 'Bet1 Cyg': 'Albireo',
  'Alp Dra': 'Thuban', 'Bet Per': 'Algol', 'Alp Per': 'Mirfak', 'Alp UMa': 'Dubhe', 'Zet UMa': 'Mizar',
}

export type WebbImage = {
  id: string; title: string; about: string; near: string | null
  ra: number; dec: number; fieldArcmin: number | null; credit: string; positionSource: 'esawebb' | 'cds-sesame'
}

/** ESA/Webb releases, CC BY 4.0. Positions are the image centres from each
 * esawebb.org image page; the Ring Nebula page lists none, so CDS Sesame M57.
 * fieldArcmin is null where the image page gives no field of view. */
export const webbImages: readonly WebbImage[] = [
  { id: 'weic2411a', title: 'Horsehead Nebula', about: 'A dark cloud shaped like a horse’s head. Webb looked closely at the top of the head.', near: 'orion',
    ra: 85.2193, dec: -2.4799, fieldArcmin: 2.14, credit: 'ESA/Webb, NASA, CSA, K. Misselt (University of Arizona) and A. Abergel (IAS/University Paris-Saclay, CNRS)', positionSource: 'esawebb' },
  { id: 'weic2417a', title: 'Crab Nebula', about: 'The glowing cloud left by a star that exploded. People saw the explosion in the year 1054.', near: 'taurus',
    ra: 83.6357, dec: 22.0163, fieldArcmin: 5.33, credit: 'NASA, ESA, CSA, STScI, T. Temim (Princeton University)', positionSource: 'esawebb' },
  { id: 'weic2320b', title: 'Ring Nebula', about: 'An old star puffed off its outer layers. They make a glowing ring.', near: 'lyra',
    ra: 283.3962, dec: 33.0291, fieldArcmin: null, credit: 'ESA/Webb, NASA, CSA, M. Barlow, N. Cox, R. Wesson', positionSource: 'cds-sesame' },
  { id: 'weic2330a', title: 'Cassiopeia A', about: 'The cloud that remains after a star exploded, in the Queen’s part of the sky.', near: 'cassiopeia',
    ra: 350.8498, dec: 58.8151, fieldArcmin: 7.4, credit: 'NASA, ESA, CSA, STScI, D. Milisavljevic (Purdue University), T. Temim (Princeton University), I. De Looze (University of Gent)', positionSource: 'esawebb' },
  { id: 'weic2316a', title: 'Rho Ophiuchi', about: 'The closest place to Earth where new stars form, near the red star Antares.', near: 'scorpius',
    ra: 246.6273, dec: -24.3854, fieldArcmin: 6.65, credit: 'NASA, ESA, CSA, STScI, K. Pontoppidan (STScI), A. Pagan (STScI)', positionSource: 'esawebb' },
  { id: 'weic2216a', title: 'Pillars of Creation', about: 'Tall towers of gas and dust in the Eagle Nebula. New stars form inside them.', near: 'aquila',
    ra: 274.7306, dec: -13.8450, fieldArcmin: 4.22, credit: 'NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI).', positionSource: 'esawebb' },
  { id: 'weic2208a', title: 'Stephan’s Quintet', about: 'A group of five galaxies. Four of them are close together and pull on each other.', near: 'pegasus',
    ra: 338.9982, dec: 33.9584, fieldArcmin: 6.34, credit: 'NASA, ESA, CSA, and STScI', positionSource: 'esawebb' },
  { id: 'weic2612a', title: 'Cigar Galaxy (M82)', about: 'A galaxy that makes new stars very fast. It is near the Big Dipper.', near: 'big-dipper',
    ra: 148.9740, dec: 69.6809, fieldArcmin: 9.48, credit: 'NASA, ESA, CSA, A. Smercina (STScI), T. Williams (University of Manchester). Image processing: A. Pagan (STScI).', positionSource: 'esawebb' },
  { id: 'weic2205a', title: 'Cosmic Cliffs', about: 'The edge of a giant gas cloud in the Carina Nebula, where new stars form.', near: 'crux',
    ra: 159.2126, dec: -58.6200, fieldArcmin: 7.29, credit: 'NASA, ESA, CSA, and STScI', positionSource: 'esawebb' },
  { id: 'weic2212a', title: 'Tarantula Nebula', about: 'A huge star nursery in a small galaxy next to ours, the Large Magellanic Cloud.', near: null,
    ra: 84.6984, dec: -69.0953, fieldArcmin: null, credit: 'NASA, ESA, CSA, and STScI', positionSource: 'esawebb' },
]
