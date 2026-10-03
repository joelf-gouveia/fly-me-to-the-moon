import './style.css'

// The capture page and the study page load apart, so the capture page has no page code and no page look.
const root = document.querySelector<HTMLDivElement>('#earth-landmarks-study')!
if (new URLSearchParams(location.search).has('capture')) void import('./capture').then(module => module.startCapture(root))
else void import('./page').then(module => module.startPage(root))
