  document.addEventListener('DOMContentLoaded', function () {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    const day = 2;
    const imageCount = 190;
    const cdnBase = 'https://frgcdn-dia2-sd.diogo-cardoso.com';
    const cdnHD = 'https://frgcdn-dia2-sd.diogo-cardoso.com';

    for (let i = 1; i <= imageCount; i++) {
      const paddedNumber = i.toString().padStart(4, '0');
      const filename = `Festa-${paddedNumber}.jpg`;
      const imageUrl = `${cdnBase}/${filename}`;
      const hdUrl = `${cdnHD}/${filename}`;

      // Check if image exists before creating DOM elements
      fetch(imageUrl, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) return;

          const link = document.createElement('a');
          link.href = imageUrl;
          link.setAttribute('data-fancybox', 'gallery');
          link.setAttribute('data-caption', `Festa ${paddedNumber} - Dia ${day}`);

          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = `Festa ${paddedNumber}`;
          img.loading = 'lazy';
          link.appendChild(img);

          const button = document.createElement('button');
          button.className = 'gallery-download-btn';
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5V13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10.4a.5.5 0 0 1 1 0V13a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V10.4a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 10.854a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 9.293V1.5a.5.5 
                       0 0 0-1 0v7.793L5.354 6.646a.5.5 0 1 0-.708.708l3.5 3.5z"/>
            </svg> 
          `;

          button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            fetch(hdUrl)
              .then(response => {
                if (!response.ok) throw new Error('Erro ao buscar imagem');
                return response.blob();
              })
              .then(blob => saveAs(blob, filename))
              .catch(err => {
                console.error('Erro ao descarregar:', err);
                alert('Para Fazer download visita: https://photos.app.goo.gl/NR6beH5GeFBNfbkW6');
              });
          });

          const item = document.createElement('div');
          item.className = 'gallery-item';
          item.appendChild(link);
          item.appendChild(button);
          gallery.appendChild(item);
        })
	.catch(err => {
	  if (err.name !== 'TypeError') {
	    console.warn(`Erro ao verificar ${filename}:`, err);
	  }
        });
    }

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
