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

  // URL du point de réception des photos (Google Apps Script — ne jamais modifier)
  const PHOTOS_UPLOAD_URL =
    'https://script.google.com/macros/s/' +
    'AKfycby7_YyPD4zurS9vLeI-eFpzhPhYWSqfKNud_xMD4jDDLeD64n_RNY3oULnkIurfxSUp3g/exec';

  const PHOTO_MAX_MB = 15;

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
     Parallaxe légère — image de fond des héros de pages
     (Programme, Dress Code, FAQ, RSVP, Partagez vos photos).
     translateY plutôt que background-attachment: fixed, qui est
     mal supporté sur Safari iOS — l'image déborde de 10% en haut/bas
     (voir .page-hero__bg) pour ne jamais laisser de bord vide.
     ===================================================== */
  const heroBg = document.querySelector('.page-hero__bg');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (heroBg && !prefersReducedMotion) {
    const heroEl = heroBg.closest('.page-hero');
    const PARALLAX_FACTOR = 0.08;
    let ticking = false;
    const updateHeroParallax = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const limit  = heroEl.offsetHeight;
          const offset = Math.min(window.scrollY, limit) * PARALLAX_FACTOR;
          heroBg.style.transform = `translateY(${offset.toFixed(1)}px)`;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', updateHeroParallax, { passive: true });
    updateHeroParallax();
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
     Partage de photos — envoi vers Google Drive
     ===================================================== */
  const photoForm         = document.getElementById('photo-form');
  const photoInput        = document.getElementById('photo-input');
  const photoPreviews     = document.getElementById('photo-previews');
  const photoSubmit       = document.getElementById('photo-submit');
  const photoStatus       = document.getElementById('photo-status');
  const photoSuccess      = document.getElementById('photo-success');
  const photoSuccessTitle  = document.getElementById('photo-success-title');
  const photoSuccessDetail = document.getElementById('photo-success-detail');
  const photoBulkBar      = document.getElementById('photo-bulk-bar');
  const photoBulkCount    = document.getElementById('photo-bulk-count');
  const photoBulkBtn      = document.getElementById('photo-bulk-remove');
  const photoProgress     = document.getElementById('photo-progress');
  const photoProgressFill = document.getElementById('photo-progress-fill');
  const photoProgressText = document.getElementById('photo-progress-text');

  const lightbox      = document.getElementById('photo-lightbox');
  const lightboxImage  = document.getElementById('lightbox-image');
  const lightboxClose  = document.getElementById('lightbox-close');
  const lightboxPrev   = document.getElementById('lightbox-prev');
  const lightboxNext   = document.getElementById('lightbox-next');

  const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Redimensionne et recompresse la photo côté navigateur avant l'envoi
  // (les photos de téléphone pèsent souvent 5 à 12 Mo) — accélère
  // nettement l'envoi sans perte visible à l'écran. Repli silencieux
  // sur le fichier d'origine si la compression échoue ou n'apporte rien
  // (GIF animés, images déjà petites, format non décodable…).
  const PHOTO_MAX_DIMENSION       = 1200;
  const PHOTO_JPEG_QUALITY        = 0.8;
  const PHOTO_MAX_COUNT           = 10;
  const PHOTO_MAX_COMPRESSED_MB   = 10;
  const PHOTO_UPLOAD_MAX_RETRIES  = 2;

  const compressImage = file => new Promise((resolve) => {
    const original = { blob: file, filename: file.name, mimeType: file.type || 'image/jpeg' };

    if (file.type === 'image/gif') {
      resolve(original);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > PHOTO_MAX_DIMENSION || height > PHOTO_MAX_DIMENSION) {
        if (width > height) {
          height = Math.round(height * (PHOTO_MAX_DIMENSION / width));
          width  = PHOTO_MAX_DIMENSION;
        } else {
          width  = Math.round(width * (PHOTO_MAX_DIMENSION / height));
          height = PHOTO_MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (blob && blob.size < file.size) {
          resolve({
            blob,
            filename: file.name.replace(/\.[^.]+$/, '') + '.jpg',
            mimeType: 'image/jpeg',
          });
        } else {
          resolve(original);
        }
      }, 'image/jpeg', PHOTO_JPEG_QUALITY);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(original);
    };

    img.src = url;
  });

  if (photoForm && photoInput) {
    // Fichiers retenus, chacun avec son URL de prévisualisation locale
    // (indépendant de photoInput.files, pour permettre d'en retirer un
    // sans perdre les autres — le navigateur ne permet pas de modifier
    // une FileList existante).
    let selectedPhotos = [];
    let lightboxIndex  = 0;
    let sending         = false;

    const updateBulkBar = () => {
      const count = selectedPhotos.filter(entry => entry.selected).length;
      photoBulkBar.hidden   = count === 0;
      photoBulkCount.textContent = count > 1 ? `${count} photos sélectionnées` : `${count} photo sélectionnée`;
    };

    const openLightbox = (index) => {
      lightboxIndex = index;
      updateLightboxImage();
      lightbox.classList.add('lightbox--open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      lightbox.classList.remove('lightbox--open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    function updateLightboxImage() {
      if (!selectedPhotos.length) {
        closeLightbox();
        return;
      }
      lightboxIndex = (lightboxIndex + selectedPhotos.length) % selectedPhotos.length;
      const entry = selectedPhotos[lightboxIndex];
      lightboxImage.src = entry.url;
      lightboxImage.alt = entry.file.name;
      const multiple = selectedPhotos.length > 1;
      lightboxPrev.hidden = !multiple;
      lightboxNext.hidden = !multiple;
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', () => { lightboxIndex--; updateLightboxImage(); });
    lightboxNext.addEventListener('click', () => { lightboxIndex++; updateLightboxImage(); });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('lightbox--open')) return;
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowLeft')  { lightboxIndex--; updateLightboxImage(); }
      if (e.key === 'ArrowRight') { lightboxIndex++; updateLightboxImage(); }
    });

    const renderPreviews = () => {
      photoPreviews.innerHTML = '';

      selectedPhotos.forEach((entry, index) => {
        const card = document.createElement('div');
        card.className = 'photo-upload__preview';
        if (entry.status === 'uploading') card.classList.add('photo-upload__preview--uploading');

        // Sélection multiple (case à cocher)
        const selectLabel = document.createElement('label');
        selectLabel.className = 'photo-upload__preview-select';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!entry.selected;
        checkbox.disabled = sending;
        checkbox.setAttribute('aria-label', `Sélectionner ${entry.file.name}`);
        checkbox.addEventListener('change', () => {
          entry.selected = checkbox.checked;
          updateBulkBar();
        });
        const checkmark = document.createElement('span');
        checkmark.className = 'photo-upload__preview-checkmark';
        selectLabel.appendChild(checkbox);
        selectLabel.appendChild(checkmark);
        card.appendChild(selectLabel);

        // Clic sur la photo = agrandissement
        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'photo-upload__preview-open';
        openBtn.setAttribute('aria-label', `Agrandir ${entry.file.name}`);
        const img = document.createElement('img');
        img.src = entry.url;
        img.alt = '';
        openBtn.appendChild(img);
        openBtn.addEventListener('click', () => openLightbox(index));
        card.appendChild(openBtn);

        // Retrait individuel
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'photo-upload__preview-remove';
        removeBtn.disabled = sending;
        removeBtn.setAttribute('aria-label', `Retirer ${entry.file.name}`);
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
          if (sending) return;
          URL.revokeObjectURL(entry.url);
          selectedPhotos.splice(index, 1);
          renderPreviews();
          updateBulkBar();
          if (lightbox.classList.contains('lightbox--open')) updateLightboxImage();
        });
        card.appendChild(removeBtn);

        // Icône de statut d'envoi (✓ succès / ✗ échec)
        if (entry.status === 'success' || entry.status === 'error') {
          const statusIcon = document.createElement('span');
          statusIcon.className = 'photo-upload__preview-status photo-upload__preview-status--' +
            (entry.status === 'success' ? 'success' : 'error');
          statusIcon.textContent = entry.status === 'success' ? '✓' : '✗';
          statusIcon.setAttribute('aria-hidden', 'true');
          card.appendChild(statusIcon);
        }

        photoPreviews.appendChild(card);
      });
    };

    photoBulkBtn.addEventListener('click', () => {
      if (sending) return;
      selectedPhotos = selectedPhotos.filter(entry => {
        if (entry.selected) URL.revokeObjectURL(entry.url);
        return !entry.selected;
      });
      renderPreviews();
      updateBulkBar();
      if (lightbox.classList.contains('lightbox--open')) updateLightboxImage();
    });

    photoInput.addEventListener('change', () => {
      if (sending) { photoInput.value = ''; return; }

      const newFiles = [...photoInput.files];
      photoStatus.style.display = 'none';
      let limitWarned = false;

      newFiles.forEach(file => {
        if (selectedPhotos.length >= PHOTO_MAX_COUNT) {
          if (!limitWarned) {
            photoStatus.textContent   = `Vous ne pouvez pas ajouter plus de ${PHOTO_MAX_COUNT} photos par envoi.`;
            photoStatus.style.display = 'block';
            limitWarned = true;
          }
          return;
        }
        if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
          photoStatus.textContent   = `« ${file.name} » dépasse ${PHOTO_MAX_MB} Mo et n'a pas été ajoutée.`;
          photoStatus.style.display = 'block';
          return;
        }
        const alreadyAdded = selectedPhotos.some(entry =>
          entry.file.name === file.name &&
          entry.file.size === file.size &&
          entry.file.lastModified === file.lastModified
        );
        if (!alreadyAdded) {
          selectedPhotos.push({ file, url: URL.createObjectURL(file), selected: false, status: null });
        }
      });

      // On vide l'input pour pouvoir rouvrir le sélecteur et ajouter
      // d'autres photos sans perdre celles déjà choisies.
      photoInput.value = '';
      renderPreviews();
    });

    // Envoie une photo déjà compressée vers Drive, avec jusqu'à
    // PHOTO_UPLOAD_MAX_RETRIES tentatives supplémentaires en cas d'échec
    // (connexion lente/instable) avant d'abandonner cette photo précise.
    const uploadWithRetry = async (filename, mimeType, base64) => {
      for (let attempt = 0; attempt <= PHOTO_UPLOAD_MAX_RETRIES; attempt++) {
        try {
          await fetch(PHOTOS_UPLOAD_URL, {
            method: 'POST',
            mode:   'no-cors',
            body: JSON.stringify({ filename, mimeType, data: base64 }),
          });
          return;
        } catch (err) {
          if (attempt === PHOTO_UPLOAD_MAX_RETRIES) throw err;
        }
      }
    };

    photoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sending) return;

      if (!selectedPhotos.length) {
        photoStatus.textContent  = 'Choisissez au moins une photo avant d’envoyer.';
        photoStatus.style.display = 'block';
        return;
      }

      photoStatus.style.display = 'none';
      sending = true;
      const total = selectedPhotos.length;
      let successCount = 0;
      let failCount    = 0;

      photoSubmit.textContent = 'Envoi en cours…';
      photoSubmit.disabled    = true;
      photoProgress.hidden    = false;
      photoProgressFill.style.width = '0%';

      const setProgress = (doneCount, label) => {
        const pct = Math.round((doneCount / total) * 100);
        photoProgressFill.style.width = pct + '%';
        photoProgressText.textContent = `${label} — ${pct}%`;
      };

      // Envoi photo par photo (pas en parallèle) pour rester léger sur
      // les connexions lentes et pouvoir afficher une progression fiable.
      for (let i = 0; i < selectedPhotos.length; i++) {
        const entry = selectedPhotos[i];
        entry.status = 'uploading';
        renderPreviews();
        setProgress(i, `Photo ${i + 1}/${total} en cours…`);

        try {
          const { blob, filename, mimeType } = await compressImage(entry.file);

          if (blob.size > PHOTO_MAX_COMPRESSED_MB * 1024 * 1024) {
            entry.status = 'error';
            failCount++;
            photoStatus.textContent   = `« ${entry.file.name} » dépasse ${PHOTO_MAX_COMPRESSED_MB} Mo même après compression et n'a pas été envoyée.`;
            photoStatus.style.display = 'block';
          } else {
            const base64 = await fileToBase64(blob);
            await uploadWithRetry(filename, mimeType, base64);
            entry.status = 'success';
            successCount++;
          }
        } catch (_) {
          entry.status = 'error';
          failCount++;
        }

        renderPreviews();
        setProgress(i + 1, i + 1 < total ? `Photo ${i + 2}/${total} en cours…` : 'Envoi terminé');
      }

      sending = false;
      photoProgress.hidden = true;

      // On retire du panier les photos envoyées avec succès ; celles en
      // échec restent affichées (icône ✗) pour permettre un nouvel essai.
      selectedPhotos = selectedPhotos.filter(entry => {
        if (entry.status === 'success') {
          URL.revokeObjectURL(entry.url);
          return false;
        }
        return true;
      });
      updateBulkBar();
      if (lightbox.classList.contains('lightbox--open')) updateLightboxImage();

      photoSubmit.textContent = 'Envoyer';
      photoSubmit.disabled    = false;

      if (successCount > 0) {
        photoSuccessTitle.textContent = `${successCount} photo${successCount > 1 ? 's' : ''} envoyée${successCount > 1 ? 's' : ''} avec succès !`;
        photoSuccessDetail.textContent = failCount
          ? `${failCount} photo${failCount > 1 ? 's' : ''} n'${failCount > 1 ? 'ont' : 'a'} pas pu être envoyée${failCount > 1 ? 's' : ''}. Vous pouvez réessayer avec ${failCount > 1 ? 'celles restantes' : 'celle-ci'} ci-dessous.`
          : `Elles sont bien arrivées jusqu'à nous.`;

        if (failCount === 0) {
          photoForm.style.display = 'none';
        }
        photoSuccess.style.display = 'block';
        window.scrollTo({ top: photoSuccess.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
      } else {
        photoStatus.textContent   = 'Aucune photo n’a pu être envoyée. Merci de réessayer.';
        photoStatus.style.display = 'block';
      }

      renderPreviews();
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
