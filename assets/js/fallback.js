// fallback.js

const fallbackSrc = 'assets/images/favicon.png';

async function checkImageExists(img) {
  const src = img.src;

  // Prevent loop if the image is already the fallback
  if (src.endsWith(fallbackSrc)) return;

  try {
    const response = await fetch(src, { method: 'HEAD' });

    if (!response.ok && response.status === 404) {
      img.src = fallbackSrc;
    }
  } catch (err) {
    // Network error fallback
    img.src = fallbackSrc;
  }
}

function monitorImages() {
  document.querySelectorAll('img').forEach(img => {
    // Skip images already checked or using fallback
    if (img.dataset.checked) return;

    img.dataset.checked = 'true';
    checkImageExists(img);
  });
}

document.addEventListener('DOMContentLoaded', monitorImages);

// Optional: Monitor dynamically added images every 2 seconds
setInterval(monitorImages, 2000);
