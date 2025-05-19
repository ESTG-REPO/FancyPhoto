// fallback.js

document.addEventListener("DOMContentLoaded", () => {
  const fallbackSrc = 'assets/images/favicon.png';

  document.querySelectorAll('img').forEach(img => {
    // Attach error listener to each image
    img.addEventListener('error', () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = 'true'; // Prevent infinite loop
        img.src = fallbackSrc;
      }
    });
  });
});
