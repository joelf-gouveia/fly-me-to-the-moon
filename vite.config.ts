import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rolldownOptions: {
      input: { game: 'index.html', flightStudy: 'fairy-flight-study.html', creatureStudy: 'creature-study.html', candyStudy: 'candy-planet-study.html', dayNightStudy: 'day-night-study.html', mobileStudy: 'mobile-study.html', starMapStudy: 'star-map-study.html', fairytaleStudy: 'fairytale-creature-study.html', asteroidBeltStudy: 'asteroid-belt-study.html', stickerBookStudy: 'sticker-book-study.html', cottonCandyStudy: 'cotton-candy-study.html', moonStudy: 'moon-study.html', hairStudy: 'hair-style-study.html', proportionsStudy: 'proportions-study.html', planetLookStudy: 'planet-look-study.html', bodyStudy: 'fairy-body-study.html', sunStudy: 'sun-study.html' },
    },
  },
})
