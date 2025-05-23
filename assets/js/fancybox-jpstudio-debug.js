$(document).ready(async function () { 
  const $gallery = $('#gallery');
  if (!$gallery.length) return;

  const day = 1;
  const imageCount = 116;
  const cdnBase = 'https://jpcdn-sd.xperia.pt';
  const cdnHD = 'https://jpcdn-sd.xperia.pt';

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const preloadCount = isMobile ? 4 : 10;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        obs.unobserve(img);
      }
    });
  }, {
    rootMargin: '200px'
  });

  const checkImageAvailable = async (url) => {
    try {
      const res = await fetch(url, { method: 'HEAD', mode: 'cors' });
      if (res.ok) return true;
    } catch (err) {
      if (err instanceof TypeError) {
        try {
          const fallbackRes = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
          if (fallbackRes.type === 'opaque') return true;
        } catch (fallbackErr) {
          console.warn('Fallback failed:', fallbackErr);
        }
      } else {
        console.warn('Erro ao verificar imagem:', err);
      }
    }
    return false;
  };

  const loadImageTasks = Array.from({ length: imageCount }, async (_, idx) => {
    const i = idx + 1;
    const paddedNumber = i.toString().padStart(4, '0');
    const filename = `IMG_${paddedNumber}.JPG`;
    const imageUrl = `${cdnBase}/${filename}`;
    const hdUrl = `${cdnHD}/${filename}`;

    const exists = await checkImageAvailable(imageUrl);
    if (!exists) return;

    const $link = $(
      `<a href="${imageUrl}" data-fancybox="gallery" data-caption="IMG ${paddedNumber} - Dia ${day}" aria-label="Abrir imagem IMG ${paddedNumber}" data-thumb="${imageUrl}">
        <img data-src="${imageUrl}" alt="IMG ${paddedNumber}" loading="lazy" style="opacity:0;transition:opacity 0.4s ease-in-out;will-change:opacity;backface-visibility:hidden;transform:translateZ(0);" crossorigin="anonymous">
      </a>`
    );

    const $button = $(
      `<button class="gallery-download-btn" aria-label="Download HD">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5V13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10.4a.5.5 0 0 1 1 0V13a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V10.4a.5.5 0 0 1 .5-.5z"/>
          <path d="M7.646 10.854a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 9.293V1.5a.5.5 
                   0 0 0-1 0v7.793L5.354 6.646a.5.5 0 1 0-.708.708l3.5 3.5z"/>
        </svg> 
      </button>`);

    $button.on('click', async function (e) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const res = await fetch(hdUrl);
        if (!res.ok) throw new Error('Erro ao buscar imagem HD');
        const blob = await res.blob();
        saveAs(blob, filename);
      } catch (err) {
        console.error('Erro ao descarregar:', err);
        alert('Erro! Tente mais tarde');
      }
    });

    const $item = $('<div class="gallery-item" style="will-change: transform, opacity; backface-visibility:hidden; transform:translateZ(0);"></div>');
    $item.append($link).append($button);
    $gallery.append($item);

    const img = $link.find('img')[0];
    observer.observe(img);

    img.onload = () => {
      img.style.opacity = 1;
    };
  });

  await Promise.allSettled(loadImageTasks);

  if (window.Fancybox) {
    Fancybox.bind('[data-fancybox="gallery"]', {
      loop: true,
      animated: true,
      showClass: "fancybox-fadeIn",
      hideClass: "fancybox-fadeOut",
      dragToClose: true,
      preload: preloadCount,
      hideScrollbar: true,
      trapFocus: true,

      images: {
        zoom: true,
        wheel: "zoom",
        click: "toggleZoom"
      },
      Thumbs: {
        autoStart: false,
        type: "modern"
      },
      Panzoom: {
        decelFriction: 0.9,
        maxScale: 3,
        minScale: 0.5,
        panOnlyWhenZoomed: true,
        bounds: true,
        contain: true,
        zoomSpeed: 0.1,
        maxZoom: 3,
        minZoom: 0.5,
      },
      Toolbar: {
        display: [
          "counter",
          "zoom",
          "slideshow",
          "fullscreen",
          "download",
          "thumbs",
          "close"
        ]
      },
      on: {
        "initThumbs": (fancybox) => {
          fancybox.Thumbnails.$track.find(".fancybox__thumb").each(function () {
            this.addEventListener("mouseenter", function () {
              this.classList.add("hover-preview");
            });
            this.addEventListener("mouseleave", function () {
              this.classList.remove("hover-preview");
            });
          });
        }
      }
    });
  }

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
    } catch (err) {
      console.warn('Service Worker registration failed:', err);
    }
  }
});
