/* ── Movie Match Client ── */
(() => {
  'use strict';

  // ── State ──
  const state = {
    roomCode: null,
    playerSlot: null,  // 0 or 1 — assigned by server
    movies: [],        // room's movie list (same order for everyone)
    allMovies: [],
    currentIndex: 0,
    matches: [],
    apiKey: localStorage.getItem('tmdb_api_key') || '',
    visitorId: localStorage.getItem('mm_visitor') || crypto.randomUUID(),
  };
  localStorage.setItem('mm_visitor', state.visitorId);

  // ── Swipe History (persisted per player slot) ──
  function historyKey() {
    return `mm_swipe_history_${state.playerSlot ?? 'default'}`;
  }
  function getSwipeHistory() {
    try { return JSON.parse(localStorage.getItem(historyKey()) || '{}'); }
    catch { return {}; }
  }
  function saveSwipe(movieId, direction) {
    const history = getSwipeHistory();
    history[movieId] = direction;
    localStorage.setItem(historyKey(), JSON.stringify(history));
  }
  function clearSwipeHistory() {
    localStorage.removeItem(historyKey());
  }

  const socket = window.__socket || io();

  // ── DOM refs ──
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const lobby = $('#lobby');
  const appScreen = $('#app-screen');
  const cardContainer = $('#card-container');
  const emptyState = $('#empty-state');
  const matchOverlay = $('#match-overlay');

  const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
  const GENRE_MAP = {28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western'};

  // ── Card Rendering ──
  function renderCards() {
    cardContainer.querySelectorAll('.card').forEach(c => c.remove());
    emptyState.classList.toggle('hidden', state.currentIndex < state.movies.length);

    const end = Math.min(state.currentIndex + 3, state.movies.length);
    for (let i = end - 1; i >= state.currentIndex; i--) {
      const movie = state.movies[i];
      const card = document.createElement('div');
      card.className = 'card' + (i === state.currentIndex ? ' active' : '');
      const depth = i - state.currentIndex;
      card.style.transform = `scale(${1 - depth * 0.04}) translateY(${depth * 8}px)`;
      card.style.zIndex = 10 - depth;
      if (depth > 0) card.style.filter = `brightness(${1 - depth * 0.1})`;

      card.innerHTML = `
        <div class="card-bg" style="background-image:url('${movie.poster || ''}')"></div>
        <div class="card-gradient"></div>
        <div class="swipe-label like">LIKE</div>
        <div class="swipe-label nope">NOPE</div>
        <div class="card-content">
          <div class="card-title">${movie.title}</div>
          <div class="card-meta">
            <span>${movie.year}</span>
            <span class="rating">★ ${movie.rating}</span>
          </div>
          <div class="card-genres">${movie.genres.map(g => `<span>${g}</span>`).join('')}</div>
          <div class="card-desc">${movie.desc || ''}</div>
        </div>
      `;
      card.dataset.movieId = movie.id;
      cardContainer.insertBefore(card, emptyState);
      if (i === state.currentIndex) initSwipe(card, movie);
    }
  }

  // ── Swipe Physics ──
  function initSwipe(card, movie) {
    let startX = 0, currentX = 0, isDragging = false;
    const likeLabel = card.querySelector('.swipe-label.like');
    const nopeLabel = card.querySelector('.swipe-label.nope');
    const threshold = 100;

    function onStart(e) {
      isDragging = true;
      card.classList.add('dragging');
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      card.style.transition = 'none';
    }

    function onMove(e) {
      if (!isDragging) return;
      const point = e.touches ? e.touches[0] : e;
      currentX = point.clientX - startX;
      const rotate = currentX * 0.08;
      const progress = Math.min(Math.abs(currentX) / threshold, 1);
      card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
      likeLabel.style.opacity = currentX > 0 ? progress : 0;
      nopeLabel.style.opacity = currentX < 0 ? progress : 0;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      card.classList.remove('dragging');
      if (Math.abs(currentX) > threshold) {
        flyOff(card, currentX > 0 ? 'right' : 'left', movie);
      } else {
        card.style.transition = 'transform 0.4s cubic-bezier(0.25,0.8,0.25,1)';
        card.style.transform = 'translateX(0) rotate(0)';
        likeLabel.style.opacity = 0;
        nopeLabel.style.opacity = 0;
      }
      currentX = 0;
    }

    card.addEventListener('mousedown', onStart);
    card.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    card._cleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }

  function flyOff(card, direction, movie) {
    const dir = direction === 'right' ? 1 : -1;
    card.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s';
    card.style.transform = `translateX(${dir * window.innerWidth * 1.5}px) rotate(${dir * 30}deg)`;
    card.style.opacity = '0';
    if (card._cleanup) card._cleanup();

    // Save swipe to localStorage
    saveSwipe(movie.id, direction);

    socket.emit('swipe', {
      movieId: movie.id,
      direction,
      movieData: movie,
    });

    setTimeout(() => {
      state.currentIndex++;
      renderCards();
    }, 300);
  }

  // Button swipes
  $('#btn-nope').addEventListener('click', () => {
    const card = cardContainer.querySelector('.card.active');
    if (card && state.currentIndex < state.movies.length) {
      flyOff(card, 'left', state.movies[state.currentIndex]);
    }
  });
  $('#btn-like').addEventListener('click', () => {
    const card = cardContainer.querySelector('.card.active');
    if (card && state.currentIndex < state.movies.length) {
      flyOff(card, 'right', state.movies[state.currentIndex]);
    }
  });

  // ── Room Logic ──
  function showApp(code, movies) {
    state.roomCode = code;
    lobby.classList.remove('active');
    appScreen.classList.add('active');
    $('#header-code').textContent = code;
    $('#settings-code').textContent = code;
    if (movies) {
      state.allMovies = movies; // store full list for reset
      applySwipeFilter();
    }
  }

  function applySwipeFilter() {
    // Filter out already-swiped movies (from localStorage)
    const history = getSwipeHistory();
    state.movies = state.allMovies.filter(m => !history[m.id]);
    state.currentIndex = 0;
    console.log(`Movies: ${state.allMovies.length} total, ${state.movies.length} unswiped`);
    renderCards();
  }

  // Create room
  $('#btn-create').addEventListener('click', () => {
    socket.emit('create-room', state.visitorId, (res) => {
      if (res.error) { $('#lobby-error').textContent = res.error; return; }
      $('#lobby-main').classList.add('hidden');
      $('#join-form').classList.add('hidden');
      $('#room-info').classList.remove('hidden');
      $('#display-code').textContent = res.code;
      state.roomCode = res.code;
      state.playerSlot = res.playerSlot;
      state.allMovies = res.movies || [];
      if (res.userCount >= 2) showApp(res.code, res.movies);
    });
  });

  // Join form
  $('#btn-show-join').addEventListener('click', () => {
    $('#lobby-main').classList.add('hidden');
    $('#join-form').classList.remove('hidden');
    $('#room-input').focus();
  });

  $('#btn-join').addEventListener('click', joinRoom);
  $('#room-input').addEventListener('keyup', (e) => { if (e.key === 'Enter') joinRoom(); });

  function joinRoom() {
    const code = $('#room-input').value.trim();
    if (code.length !== 4) { $('#lobby-error').textContent = 'Enter a 4-digit code'; return; }
    socket.emit('join-room', { code, visitorId: state.visitorId }, (res) => {
      if (res.error) { $('#lobby-error').textContent = res.error; return; }
      state.playerSlot = res.playerSlot;
      showApp(code, res.movies);
    });
  }

  // Partner joined → start (creator gets movies here)
  socket.on('user-joined', ({ userCount, movies }) => {
    if (userCount >= 2 && state.roomCode) {
      if (!appScreen.classList.contains('active')) {
        // Use movies from event, or fall back to stored allMovies
        showApp(state.roomCode, movies || state.allMovies);
      }
      updatePartnerStatus(true);
    }
  });

  socket.on('user-left', () => updatePartnerStatus(false));

  function updatePartnerStatus(connected) {
    const dot = $('#partner-dot');
    const text = $('#partner-text');
    dot.className = 'status-dot' + (connected ? '' : ' waiting');
    text.textContent = connected ? 'Partner connected' : 'Partner disconnected';
  }

  // ── Matches ──
  socket.on('match', ({ movieId, movieData }) => {
    state.matches.push(movieData);
    showMatchCelebration(movieData);
    renderMatchesList();
    updateMatchBadge();
  });

  function showMatchCelebration(movie) {
    $('#match-poster').src = movie.poster || '';
    $('#match-title').textContent = movie.title;
    $('#match-year').textContent = movie.year;
    matchOverlay.classList.add('show');
    spawnConfetti();
  }

  $('#btn-dismiss-match').addEventListener('click', () => {
    matchOverlay.classList.remove('show');
    $('#confetti').innerHTML = '';
  });

  function spawnConfetti() {
    const container = $('#confetti');
    container.innerHTML = '';
    const colors = ['#e50914', '#fbbf24', '#46d369', '#60a5fa', '#f472b6', '#a78bfa'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = Math.random() * 100 + '%';
      el.style.animationDelay = Math.random() * 1.5 + 's';
      el.style.animationDuration = (2 + Math.random() * 2) + 's';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      el.style.width = (6 + Math.random() * 6) + 'px';
      el.style.height = (6 + Math.random() * 6) + 'px';
      container.appendChild(el);
    }
  }

  function renderMatchesList() {
    const list = $('#matches-list');
    const empty = $('#matches-empty');
    if (state.matches.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.querySelectorAll('.match-item').forEach(el => el.remove());
    state.matches.forEach(m => {
      const el = document.createElement('div');
      el.className = 'match-item';
      el.innerHTML = `
        <img class="match-poster" src="${m.poster || ''}" alt="">
        <div class="match-info">
          <h4>${m.title}</h4>
          <div class="meta">${m.year} · ★ ${m.rating}</div>
          <div class="genres">${m.genres.join(', ')}</div>
        </div>
        <div class="match-label">🍿</div>
      `;
      list.appendChild(el);
    });
  }

  function updateMatchBadge() {
    const badge = $('#match-badge');
    if (state.matches.length > 0) {
      badge.classList.remove('hidden');
      badge.textContent = state.matches.length;
    }
  }

  // ── Bottom Nav ──
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-content').forEach(t => t.classList.remove('active'));
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // ── Settings ──
  const apiInput = $('#api-key-input');
  if (apiInput) {
    apiInput.value = state.apiKey;
    apiInput.addEventListener('change', () => {
      state.apiKey = apiInput.value.trim();
      localStorage.setItem('tmdb_api_key', state.apiKey);
    });
  }

  // Reset queue button
  $('#btn-reset').addEventListener('click', () => {
    clearSwipeHistory();
    if (state.allMovies) applySwipeFilter();
  });

  $('#btn-leave').addEventListener('click', () => {
    socket.disconnect();
    location.reload();
  });
})();
