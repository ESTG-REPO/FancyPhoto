(function () {
  // Detect mobile user agent
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Check for reduced motion preference (accessibility)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Detect device memory (low-end device heuristic)
  const isLowEndDevice = (() => {
    if ('deviceMemory' in navigator) {
      return navigator.deviceMemory && navigator.deviceMemory <= 1.5;
    }
    return false;
  })();

  // Detect network speed (slow network heuristic)
  const isSlowNetwork = (() => {
    if ('connection' in navigator) {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        // effectiveType can be 'slow-2g', '2g', '3g', '4g'
        return ['slow-2g', '2g'].includes(conn.effectiveType);
      }
    }
    return false;
  })();

  // FPS measurement utility
  function measureFPS(duration = 1000) {
    return new Promise((resolve) => {
      let frames = 0;
      let startTime = performance.now();

      function frame(time) {
        frames++;
        if (time - startTime < duration) {
          requestAnimationFrame(frame);
        } else {
          const fps = (frames * 1000) / (time - startTime);
          resolve(fps);
        }
      }
      requestAnimationFrame(frame);
    });
  }

  // Create skeleton shimmer overlay
  function createSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'fancybox-skeleton';
    Object.assign(skeleton.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, #eee 25%, #ddd 37%, #eee 63%)',
      backgroundSize: '400% 100%',
      animation: (enableAnimation ? 'skeleton-shimmer 1.4s ease infinite' : 'none'),
      pointerEvents: 'none',
      zIndex: 10,
      borderRadius: '4px',
    });
    return skeleton;
  }

  // Inject skeleton CSS only once
  function injectSkeletonStyles() {
    if (document.getElementById('fancybox-skeleton-style')) return;

    const style = document.createElement('style');
    style.id = 'fancybox-skeleton-style';
    style.textContent = `
      @keyframes skeleton-shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Throttle function
  function throttle(fn, wait) {
    let lastTime = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastTime >= wait) {
        lastTime = now;
        fn.apply(this, args);
      }
    };
  }

  // Variables controlling behavior (will be set after FPS test)
  let enableAnimation = true;

  // Use IntersectionObserver to watch when images enter viewport
  const observerOptions = {
    root: null,
    rootMargin: '100px',
    threshold: 0.1,
  };
  const observedContainers = new WeakSet();

  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const container = entry.target;
        if (observedContainers.has(container)) return;

        // Mark container observed to avoid duplication
        observedContainers.add(container);

        // If the container has an img and it’s not loaded, inject skeleton
        const img = container.querySelector('img');
        if (img && (!img.complete || img.naturalWidth === 0)) {
          injectSkeletonToContainer(container, img);
        }

        observer.unobserve(container);
      });
    }, observerOptions);
  }

  // Inject skeleton to container and remove on img load/error
  function injectSkeletonToContainer(container, img) {
    // Safety: avoid multiple skeletons
    if (container.querySelector('.fancybox-skeleton')) return;

    // Ensure container position is relative or absolute for overlay
    const pos = getComputedStyle(container).position;
    if (pos === 'static' || !pos) {
      container.style.position = 'relative';
    }

    const skeleton = createSkeleton();
    container.appendChild(skeleton);

    const cleanup = () => {
      if (skeleton.parentElement) skeleton.parentElement.removeChild(skeleton);
      img.removeEventListener('load', cleanup);
      img.removeEventListener('error', cleanup);
    };

    img.addEventListener('load', cleanup, { once: true });
    img.addEventListener('error', cleanup, { once: true });
  }

  // Fancybox reveal handler (throttled)
  const handleRevealThrottled = throttle((fancybox, slide) => {
    if (!slide.$image) return;
    const img = slide.$image;
    const container = img.parentElement;
    if (!container) return;

    // If image loaded, no skeleton needed
    if (img.complete && img.naturalWidth > 0) return;

    // Use IntersectionObserver if available to wait until visible
    if (observer) {
      observer.observe(container);
    } else {
      // Fallback: inject immediately
      injectSkeletonToContainer(container, img);
    }
  }, 200); // throttle to max 1 call per 200ms

  // Main initialization after DOM + Fancybox ready
  async function init() {
    injectSkeletonStyles();

    // Measure FPS for 1 sec to decide animation
    try {
      const fps = await measureFPS(1000);
      // Disable animation if fps < 30 or low-end device or prefers reduced motion or slow network
      enableAnimation = fps >= 30 && !isLowEndDevice && !prefersReducedMotion && !isSlowNetwork;
    } catch {
      enableAnimation = true; // fallback enable
    }

    // Initialize Fancybox options smartly
    if (typeof Fancybox === 'undefined') return;

    Fancybox.defaults = {
      ...Fancybox.defaults,
      animated: !isMobile,
      showClass: !isMobile,
      hideClass: !isMobile,
      preload: 1,
      dragToClose: !isMobile,
      infinite: !isMobile,
      zoom: !isMobile,
      autoFocus: false,
      trapFocus: false,
      Images: {
        zoom: false,
        protected: false,
      },
      on: {
        reveal: handleRevealThrottled,
      },
    };
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
