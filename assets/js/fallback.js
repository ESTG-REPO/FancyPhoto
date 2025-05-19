// fallback.js

const fallbackSrc = 'assets/images/favicon.png';

async function checkImageExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function preloadAndFixFancyboxImages() {
  if (!window.Fancybox) return;

  const items = document.querySelectorAll('[data-fancybox]');

  await Promise.allSettled(
    [...items].map(async (el) => {
      const originalSrc = el.getAttribute('href') || el.getAttribute('data-src');

      // Already using fallback
      if (!originalSrc || originalSrc.includes(fallbackSrc)) return;

      const exists = await checkImageExists(originalSrc);
      if (!exists) {
        el.setAttribute('href', fallbackSrc);
        el.setAttribute('data-src', fallbackSrc);

        const img = el.querySelector('img');
        if (img) {
          img.src = fallbackSrc;
        }
      }
    })
  );
}

// Also fix images shown in the document normally
async function fixBrokenPageImages() {
  const images = document.querySelectorAll('img:not([data-checked])');

  await Promise.allSettled(
    [...images].map(async (img) => {
      img.dataset.checked = 'true';

      if (img.src.includes(fallbackSrc)) return;

      const exists = await checkImageExists(img.src);
      if (!exists) {
        img.src = fallbackSrc;
      }
    })
  );
}

document.addEventListener('DOMContentLoaded', async () => {
  await fixBrokenPageImages();
  await preloadAndFixFancyboxImages();
});

// Optional: re-check every few seconds for dynamically loaded content
setInterval(() => {
  fixBrokenPageImages();
  preloadAndFixFancyboxImages();
}, 2000);
