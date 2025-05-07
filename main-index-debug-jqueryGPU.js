// Fancybox Gallery handler with Hardware acceleration, panzoom features,  made by cardoso
$(document).ready(async function () { 
  const $gallery = $('#gallery');
  if (!$gallery.length) return;

  const day = 2;
  const imageCount = 190;
  const cdnBase = 'https://frgcdn-dia2-sd.diogo-cardoso.com';
  const cdnHD = 'https://frgcdn-dia2-sd.xperia.pt'; // if hd version available insert hd cdn

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
    const filename = `Festa-${paddedNumber}.jpg`;
    const imageUrl = `${cdnBase}/${filename}`;
    const hdUrl = `${cdnHD}/${filename}`;

    const exists = await checkImageAvailable(imageUrl);
    if (!exists) return;

    const $link = $(`
      <a href="${imageUrl}" data-fancybox="gallery" data-caption="Festa ${paddedNumber} - Dia ${day}" aria-label="Abrir imagem Festa ${paddedNumber}">
        <img src="${imageUrl}" alt="Festa ${paddedNumber}" loading="lazy" style="opacity:0;transition:opacity 0.4s ease-in-out;will-change:opacity;">
      </a>
    `);

    const $button = $(
      `<button class="gallery-download-btn" aria-label="Download HD">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5V13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10.4a.5.5 0 0 1 1 0V13a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V10.4a.5.5 0 0 1 .5-.5z"/>
          <path d="M7.646 10.854a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 9.293V1.5a.5.5 
                   0 0 0-1 0v7.793L5.354 6.646a.5.5 0 1 0-.708.708l3.5 3.5z"/>
        </svg> 
      </button>`
    );
// downloader 1.0 multi select will implement later
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
        alert('Para fazer download, visita: https://photos.app.goo.gl/NR6beH5GeFBNfbkW6');
      }
    });

    const $item = $('<div class="gallery-item" style="will-change: transform, opacity;"></div>');
    $item.append($link).append($button);
    $gallery.append($item);

    $link.find('img').on('load', function () {
      $(this).css('opacity', 1);
    });
  });

  await Promise.allSettled(loadImageTasks);

  if (window.Fancybox) {
    Fancybox.bind('[data-fancybox="gallery"]', {
      loop: true,
      animated: true,
      showClass: "fancybox-fadeIn",
      hideClass: "fancybox-fadeOut",
      dragToClose: true,
      preload: 3,  // Preload 5 images
      hideScrollbar: true,
      trapFocus: true,

      images: {
        zoom: true,
        wheel: "zoom",
        click: "toggleZoom"
      },
      Thumbs: {
        autoStart: false
      },

          Panzoom: {
            // Smooth zooming
            decelFriction: 0.9,
            maxScale: 3,  // Max zoom scale
            minScale: 0.5,  // Min zoom scale

            // Drag to pan settings
            panOnlyWhenZoomed: true,  // Only allow dragging when zoomed in
            bounds: true,  // Restrict image movement within the container
            contain: true,  // Prevent panning beyond the image's bounds

            // Mouse wheel and pinch gestures
            zoomSpeed: 0.1,  // Speed of zoom
            maxZoom: 3,  // Maximum zoom
            minZoom: 0.5,  // Minimum zoom
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
    });
  }
});
