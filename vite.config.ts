import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rolldownOptions: {
      input: { game: 'index.html', flightStudy: 'studies/fairy-flight-study.html', creatureStudy: 'studies/creature-study.html', candyStudy: 'studies/candy-planet-study.html', dayNightStudy: 'studies/day-night-study.html', mobileStudy: 'studies/mobile-study.html', starMapStudy: 'studies/star-map-study.html', fairytaleStudy: 'studies/fairytale-creature-study.html', asteroidBeltStudy: 'studies/asteroid-belt-study.html', stickerBookStudy: 'studies/sticker-book-study.html', cottonCandyStudy: 'studies/cotton-candy-study.html', moonStudy: 'studies/moon-study.html', hairStudy: 'studies/hair-style-study.html', proportionsStudy: 'studies/proportions-study.html', planetLookStudy: 'studies/planet-look-study.html', bodyStudy: 'studies/fairy-body-study.html', sunStudy: 'studies/sun-study.html' },
    },
  },
})
