  document.addEventListener('DOMContentLoaded', function () {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    const day = 1;
    const imageCount = 125;

    for (let i = 1; i <= imageCount; i++) {
      const file = `Festa-${i}.jpg`;
      const cdnBase = 'https://cdn-dia1.xperia.pt';
      const cdnHD = 'https://cdn-dia1-hd.xperia.pt';

      const thumbUrl = `${cdnBase}/${file}`;
      const fullUrl = `${cdnBase}/${file}`; // used for viewing in Fancybox
      const hdUrl = `${cdnHD}/${file}`;     // used for downloading

      const item = document.createElement('div');
      item.className = 'gallery-item';

      const link = document.createElement('a');
      link.href = fullUrl;
      link.setAttribute('data-fancybox', 'gallery');
      link.setAttribute('data-caption', `Festa ${i} - Dia ${day}`);

      const img = document.createElement('img');
      img.src = thumbUrl;
      img.alt = `Festa ${i}`;
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
          .then(blob => saveAs(blob, file))
          .catch(err => {
            console.error('Erro ao descarregar:', err);
            alert('Erro ao descarregar a imagem.');
          });
      });

      item.appendChild(link);
      item.appendChild(button);
      gallery.appendChild(item);
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