<script>
  document.addEventListener('DOMContentLoaded', async function () {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    const day = 2;
    const imageCount = 190;
    const cdnBase = 'https://frgcdn-dia2-sd.diogo-cardoso.com';
    const cdnHD = 'https://frgcdn-dia2-sd.diogo-cardoso.com';

    function createGalleryItem(paddedNumber, imageUrl, hdUrl, filename) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.setAttribute('data-fancybox', 'gallery');
      link.setAttribute('data-caption', `Festa ${paddedNumber} - Dia ${day}`);
      link.setAttribute('aria-label', `Abrir imagem Festa ${paddedNumber}`);

      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `Festa ${paddedNumber}`;
      img.loading = 'lazy';
      link.appendChild(img);

      const button = document.createElement('button');
      button.className = 'gallery-download-btn';
      button.setAttribute('aria-label', 'Download HD');

      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5V13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10.4a.5.5 0 0 1 1 0V13a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V10.4a.5.5 0 0 1 .5-.5z"/>
          <path d="M7.646 10.854a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 9.293V1.5a.5.5 
                   0 0 0-1 0v7.793L5.354 6.646a.5.5 0 1 0-.708.708l3.5 3.5z"/>
        </svg> 
      `;

      button.addEventListener('click', async function (e) {
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

      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.appendChild(link);
      item.appendChild(button);
      gallery.appendChild(item);
    }

    async function checkImageAvailable(url) {
      try {
        const res = await fetch(url, { method: 'HEAD', mode: 'cors' });
        if (res.ok) return true;
      } catch (err) {
        // Fallback if likely CORS error
        if (err instanceof TypeError) {
          try {
            const fallbackRes = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            // We can't read status in opaque responses, so we assume it's there
            if (fallbackRes.type === 'opaque') return true;
          } catch (fallbackErr) {
            console.warn('Fallback also failed for:', url, fallbackErr);
          }
        } else {
          console.warn('Erro ao verificar (não-CORS):', url, err);
        }
      }
      return false;
    }

    const loadImageTasks = Array.from({ length: imageCount }, async (_, idx) => {
      const i = idx + 1;
      const paddedNumber = i.toString().padStart(4, '0');
      const filename = `Festa-${paddedNumber}.jpg`;
      const imageUrl = `${cdnBase}/${filename}`;
      const hdUrl = `${cdnHD}/${filename}`;

      const exists = await checkImageAvailable(imageUrl);
      if (exists) createGalleryItem(paddedNumber, imageUrl, hdUrl, filename);
    });

    await Promise.allSettled(loadImageTasks);

    if (window.Fancybox) {
      Fancybox.bind('[data-fancybox="gallery"]', {
        loop: true,
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
        Image: {
          zoom: true,
          click: "toggleZoom",
          wheel: "zoom",
        },
        Thumbs: {
          autoStart: true,
        },
      });
    }
  });
</script>
