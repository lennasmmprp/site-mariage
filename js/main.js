(function () {
  'use strict';

  /* =====================================================
     CONFIG
     ===================================================== */
  const WEDDING_DATE = new Date('2027-07-21T14:00:00');

  // URL de soumission Google Forms (ne jamais modifier)
  const GFORM_URL =
    'https://docs.google.com/forms/d/e/' +
    '1FAIpQLSe_nuM0FVCkLa0zyNlaANkvvysuvrlAoeglCeBvkFLF0MYuxA/formResponse';

  /* =====================================================
     Vidéo de fond du hero — autoplay robuste + fallback image
     (notamment iPhone en mode économie d'énergie, où Safari
     refuse l'autoplay sans jamais le signaler autrement)
     ===================================================== */
  const heroVideo    = document.getElementById('hero-video');
  const heroFallback = document.getElementById('hero-fallback');

  if (heroVideo && heroFallback) {
    // Forcer les propriétés JS en plus des attributs HTML : sur iOS Safari,
    // l'autoplay n'est fiable que si "muted"/"playsInline" sont bien à `true`
    // côté IDL au moment de l'appel à play(), pas seulement en attributs.
    heroVideo.muted        = true;
    heroVideo.defaultMuted = true;
    heroVideo.playsInline  = true;
    heroVideo.autoplay     = true;

    // L'image de secours est visible par défaut (voir HTML/CSS) et la vidéo
    // elle-même reste invisible (opacity:0, voir CSS) tant que la lecture
    // n'est pas RÉELLEMENT confirmée — jamais sur la base d'une simple
    // tentative de play(). Double protection : même si un navigateur
    // affichait malgré tout un bouton natif sur la vidéo, il resterait
    // invisible puisque l'élément entier l'est encore à ce moment-là.
    const confirmPlaying = () => {
      if (!heroVideo.paused && heroVideo.currentTime > 0 && heroVideo.readyState >= 2) {
        heroVideo.classList.add('is-playing');
        heroFallback.classList.add('is-hidden');
      }
    };
    const revertToFallback = () => {
      heroVideo.classList.remove('is-playing');
      heroFallback.classList.remove('is-hidden');
    };

    heroVideo.addEventListener('playing', confirmPlaying);
    heroVideo.addEventListener('timeupdate', confirmPlaying);
    heroVideo.addEventListener('pause',   revertToFallback);
    heroVideo.addEventListener('stalled', revertToFallback);
    heroVideo.addEventListener('error',   revertToFallback);

    const tryPlay = () => {
      const p = heroVideo.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => { /* autoplay refusé — l'image de secours reste affichée */ });
      }
    };

    tryPlay();
    heroVideo.addEventListener('loadedmetadata', tryPlay);
    heroVideo.addEventListener('loadeddata', tryPlay);
    heroVideo.addEventListener('canplay', tryPlay);
    heroVideo.addEventListener('canplaythrough', tryPlay);
    window.addEventListener('load', tryPlay);

    // Retour depuis le cache navigateur (bouton précédent / bfcache) :
    // le script ne se ré-exécute pas, on retente explicitement.
    window.addEventListener('pageshow', tryPlay);

    // Premier geste de l'utilisateur (tap, scroll, touche) : on retente
    // silencieusement — aucun bouton Play, aucune action explicite requise.
    // Si la lecture démarre, "playing" ci-dessus masquera l'image seul.
    const resumeOnFirstInteraction = () => {
      tryPlay();
      ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(evt =>
        window.removeEventListener(evt, resumeOnFirstInteraction)
      );
    };
    ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(evt =>
      window.addEventListener(evt, resumeOnFirstInteraction, { once: true, passive: true })
    );
  }

  /* =====================================================
     Header : transparent → opaque au scroll
     ===================================================== */
  const header = document.getElementById('header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('header--scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* =====================================================
     Navigation mobile
     ===================================================== */
  const navToggle = document.getElementById('navToggle');
  const nav       = document.getElementById('nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav--open');
      navToggle.classList.toggle('nav__toggle--open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    nav.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('nav--open');
        navToggle.classList.remove('nav__toggle--open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* =====================================================
     Compte à rebours
     ===================================================== */
  const countdown = document.getElementById('countdown');

  if (countdown) {
    const pad = n => String(n).padStart(2, '0');

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const update = () => {
      const diff = WEDDING_DATE - new Date();
      if (diff <= 0) {
        countdown.innerHTML = '<p class="countdown__done">C\'est le grand jour !</p>';
        return;
      }
      const days    = Math.floor(diff / 864e5);
      const hours   = Math.floor((diff % 864e5) / 36e5);
      const minutes = Math.floor((diff % 36e5) / 6e4);
      const seconds = Math.floor((diff % 6e4) / 1e3);

      setEl('cd-days',    days);
      setEl('cd-hours',   pad(hours));
      setEl('cd-minutes', pad(minutes));
      setEl('cd-seconds', pad(seconds));
    };

    update();
    setInterval(update, 1000);
  }

  /* =====================================================
     Parallaxe — bandeau des pages intérieures
     ===================================================== */
  const pageBanner = document.querySelector('.page-banner');
  if (pageBanner) {
    let ticking = false;
    const updateParallax = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const limit = pageBanner.offsetHeight + 120;
          const offset = Math.min(window.scrollY, limit) * 0.28;
          pageBanner.style.transform = `translateY(${offset.toFixed(1)}px)`;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', updateParallax, { passive: true });
  }

  /* =====================================================
     Scroll reveal (IntersectionObserver)
     ===================================================== */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* =====================================================
     RSVP — UX conditionnelle
     ===================================================== */
  const presenceInputs  = document.querySelectorAll('input[name="entry.135342444"]');
  const musiqueGroup    = document.getElementById('musique-group');

  if (presenceInputs.length && musiqueGroup) {
    const toggle = () => {
      const absent = [...document.querySelectorAll('input[name="entry.135342444"]:checked')]
        .some(cb => cb.value === 'Je ne pourrai pas être là');
      musiqueGroup.style.display = absent ? 'none' : '';
    };
    presenceInputs.forEach(r => r.addEventListener('change', toggle));
    toggle();
  }

  /* =====================================================
     RSVP — Soumission silencieuse vers Google Forms
     ===================================================== */
  const form       = document.getElementById('rsvp-form');
  const successDiv = document.getElementById('rsvp-success');
  const submitBtn  = document.getElementById('rsvp-submit');
  const errorMsg   = document.getElementById('rsvp-error');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validation minimale
      const noms            = form.querySelector('[name="entry.1710035302"]').value.trim();
      const presenceChecked = [...form.querySelectorAll('[name="entry.135342444"]:checked')];

      if (!noms) {
        form.querySelector('[name="entry.1710035302"]').focus();
        return;
      }
      if (!presenceChecked.length) {
        form.querySelector('#presence-group').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // État de chargement
      submitBtn.textContent = 'Envoi en cours…';
      submitBtn.disabled    = true;
      errorMsg.style.display = 'none';

      // Construction du FormData avec les entry IDs Google Forms
      const data = new FormData();
      data.append('entry.1710035302', noms);
      presenceChecked.forEach(cb => data.append('entry.135342444', cb.value));

      const musique      = (form.querySelector('[name="entry.993788628"]')?.value  ?? '').trim();
      const commentaires = (form.querySelector('[name="entry.1424245846"]')?.value ?? '').trim();
      if (musique)      data.append('entry.993788628',  musique);
      if (commentaires) data.append('entry.1424245846', commentaires);

      try {
        // mode: 'no-cors' : la réponse est opaque mais les données
        // arrivent bien dans Google Forms (pas de redirection).
        await fetch(GFORM_URL, {
          method: 'POST',
          mode:   'no-cors',
          body:   data,
        });

        // Succès — afficher le message de confirmation
        form.style.display        = 'none';
        successDiv.style.display  = 'block';
        window.scrollTo({ top: successDiv.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });

      } catch (_) {
        // Erreur réseau
        submitBtn.textContent  = 'Envoyer ma réponse';
        submitBtn.disabled     = false;
        errorMsg.style.display = 'block';
      }
    });
  }

  /* =====================================================
     Accordion — FAQ
     ===================================================== */
  document.querySelectorAll('.accordion__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const body   = btn.nextElementSibling;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      document.querySelectorAll('.accordion__btn').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        b.nextElementSibling.style.maxHeight = null;
      });

      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

})();
