/* ============================================================
   VOTE ÉTUDIANT — script.js
   Chef de Classe · Multi-votants · Résultats en temps réel
   ============================================================ */

/* ── STATE ─────────────────────────────────────────────────── */
const state = {
    candidates:    [],
    nextId:        1,
    selectedColor: '#00d4ff',
    photoDataURL:  null,
    // Vote
    voterName:     '',
    currentVoted:  false,
    selectedId:    null,
    totalVoters:   0,
    // Timer
    timerInterval: null,
    timerSeconds:  0,
    timerRunning:  false,
  };
  
  /* ══════════════════════════════════════════════════════════════
     ONGLETS
  ══════════════════════════════════════════════════════════════ */
  function switchTab(tab) {
    ['admin','vote','results'].forEach(t => {
      document.getElementById('section-' + t).classList.toggle('active', t === tab);
      document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    });
    if (tab === 'vote')    renderVoteSection();
    if (tab === 'results') renderResults();
  }
  
  /* ══════════════════════════════════════════════════════════════
     FORMULAIRE — GESTION
  ══════════════════════════════════════════════════════════════ */
  
  function pickColor(el) {
    document.querySelectorAll('.sw').forEach(s => s.classList.remove('on'));
    el.classList.add('on');
    state.selectedColor = el.dataset.c;
  }
  
  function previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      state.photoDataURL = e.target.result;
      const img = document.getElementById('photo-prev');
      img.src = state.photoDataURL;
      img.style.display = 'block';
      document.getElementById('photo-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
  
  function addCandidate() {
    const lastname   = document.getElementById('f-lastname').value.trim().toUpperCase();
    const firstname  = document.getElementById('f-firstname').value.trim();
    const phone      = document.getElementById('f-phone').value.trim();
    const faculty    = document.getElementById('f-faculty').value;
    const department = document.getElementById('f-department').value;
    const level      = document.getElementById('f-level').value;
    const errEl      = document.getElementById('ferror');
  
    if (!lastname || !firstname || !faculty || !department || !level) {
      errEl.textContent = '⚠️ Champs obligatoires manquants : Nom, Prénom, Faculté, Département, Niveau.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
  
    state.candidates.push({
      id:         state.nextId++,
      lastname,
      firstname,
      fullname:   `${firstname} ${lastname}`,
      phone,
      faculty,
      department,
      level,
      color:      state.selectedColor,
      photoData:  state.photoDataURL,
      votes:      0,
    });
  
    clearForm();
    updateAdminCount();
    showToast(`${firstname} ${lastname} a été ajouté(e) avec succès. Rendez-vous dans l'onglet 🗳️ Voter.`);
  }
  
  function clearForm() {
    ['f-lastname','f-firstname','f-phone'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-faculty').value    = '';
    document.getElementById('f-department').value = '';
    document.getElementById('f-level').value      = '';
    document.getElementById('f-photo').value       = '';
    document.getElementById('photo-prev').style.display         = 'none';
    document.getElementById('photo-placeholder').style.display  = 'block';
    document.getElementById('ferror').style.display             = 'none';
    state.photoDataURL = null;
  }
  
  function removeCandidate(id) {
    state.candidates = state.candidates.filter(c => c.id !== id);
    updateAdminCount();
  }
  
  function resetAll() {
    if (!confirm('Supprimer tous les candidats et votes ?')) return;
    state.candidates   = [];
    state.totalVoters  = 0;
    state.voterName    = '';
    state.currentVoted = false;
    state.selectedId   = null;
    updateAdminCount();
    showToast('Tous les candidats ont été supprimés.');
  }
  
  function resetVotes() {
    if (!confirm('Remettre tous les votes à zéro ?')) return;
    state.candidates.forEach(c => c.votes = 0);
    state.totalVoters  = 0;
    state.voterName    = '';
    state.currentVoted = false;
    state.selectedId   = null;
    updateAdminCount();
    showToast('Tous les votes ont été remis à zéro.');
  }
  
  function updateAdminCount() {
    document.getElementById('candidate-count').textContent = state.candidates.length;
  }
  
  function showToast(msg) {
    const toast = document.getElementById('add-toast');
    toast.innerHTML = `
      <div style="
        background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);
        border-radius:10px;padding:12px 18px;display:flex;align-items:center;
        gap:10px;font-size:13.5px;color:var(--success);animation:fadeUp .4s ease both;">
        ✅ ${msg}
      </div>`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }
  
  /* ══════════════════════════════════════════════════════════════
     VOTE — MULTI-VOTANTS
  ══════════════════════════════════════════════════════════════ */
  function renderVoteSection() {
    const dynamic   = document.getElementById('vote-dynamic');
    const submitRow = document.getElementById('submit-row');
    const badge     = document.getElementById('vote-status-badge');
  
    // Aucun candidat
    if (!state.candidates.length) {
      badge.textContent = 'Aucun candidat';
      badge.className   = 'status-badge';
      submitRow.style.display = 'none';
      dynamic.innerHTML = `
        <div style="text-align:center;padding:48px 20px;color:var(--text-muted);">
          <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
          <p>Aucun candidat enregistré.<br/>Allez dans <strong style="color:var(--cyan)">Gestion</strong> pour en ajouter.</p>
        </div>`;
      return;
    }
  
    // ── Étape 1 : Saisie du nom ──────────────────────────────
    if (!state.voterName) {
      badge.textContent = `${state.totalVoters} vote${state.totalVoters !== 1 ? 's' : ''} enregistré${state.totalVoters > 1 ? 's' : ''}`;
      badge.className = 'status-badge';
      submitRow.style.display = 'none';
      dynamic.innerHTML = `
        <div class="vscreen">
          <div class="vscreen-icon">🙋</div>
          <h3>Prochain électeur</h3>
          <p>Entrez votre prénom pour accéder au bulletin de vote</p>
          <input type="text" id="voter-input" placeholder="Votre prénom..."
                 maxlength="40" onkeydown="if(event.key==='Enter') confirmName()"/>
          <button class="btn btn-primary" style="width:100%;" onclick="confirmName()">
            Continuer →
          </button>
          <div style="color:var(--danger);font-size:12px;margin-top:8px;display:none;" id="name-err">
            ⚠️ Veuillez entrer votre prénom.
          </div>
        </div>`;
      return;
    }
  
    // ── Étape 2 : Vote confirmé ──────────────────────────────
    if (state.currentVoted) {
      badge.textContent = '✅ Vote enregistré';
      badge.className   = 'status-badge done';
      submitRow.style.display = 'none';
      dynamic.innerHTML = `
        <div class="cscreen">
          <div style="font-size:44px;margin-bottom:14px;">✅</div>
          <h3>Merci, ${state.voterName} !</h3>
          <p>Votre vote a bien été enregistré.</p>
          <div class="total-stat">${state.totalVoters} vote${state.totalVoters > 1 ? 's' : ''} au total</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button class="btn btn-primary" style="width:100%;" onclick="nextVoter()">
              👤 Prochain électeur
            </button>
            <button class="btn btn-ghost" style="width:100%;font-size:12.5px;" onclick="switchTab('results')">
              📊 Voir les résultats
            </button>
          </div>
        </div>`;
      return;
    }
  
    // ── Étape 3 : Cartes candidats ───────────────────────────
    badge.textContent = `🗳️ ${state.voterName} vote...`;
    badge.className   = 'status-badge live';
    submitRow.style.display = 'flex';
  
    const btnConfirm = document.getElementById('btn-confirm');
    const hint       = document.getElementById('submit-hint');
    btnConfirm.disabled  = !state.selectedId;
    hint.textContent     = state.selectedId ? 'Candidat sélectionné — confirmez' : 'Sélectionnez un candidat';
  
    dynamic.innerHTML = `
      <div class="vote-grid" id="vote-grid">
        ${state.candidates.map(c => {
          const isSel = state.selectedId === c.id;
          return `
          <div class="vcard ${isSel ? 'selected' : ''}" data-id="${c.id}"
               style="--card-color:${c.color}" onclick="selectCard(${c.id})">
            <div class="vcard-photo" style="background:${c.color}22">
              ${c.photoData
                ? `<img src="${c.photoData}" alt="${c.fullname}"/>`
                : `<div class="vcard-initials" style="background:linear-gradient(135deg,${c.color}cc,${c.color}66)">
                     ${initials(c.fullname)}
                   </div>`
              }
              <div class="vcard-check">${isSel ? '✓' : ''}</div>
            </div>
            <div class="vcard-body">
              <div class="vcard-name">${c.firstname} ${c.lastname}</div>
              <div class="vcard-tags">
                <span class="vtag vtag-lvl">${c.level}</span>
                <span class="vtag vtag-dept">${c.department}</span>
                <span class="vtag vtag-fac">${c.faculty.split('—')[0].trim()}</span>
              </div>
              ${c.phone ? `<div class="vcard-phone">📞 ${c.phone}</div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }
  
  function confirmName() {
    const input = document.getElementById('voter-input');
    const name  = input ? input.value.trim() : '';
    if (!name) {
      const err = document.getElementById('name-err');
      if (err) err.style.display = 'block';
      return;
    }
    state.voterName  = name;
    state.selectedId = null;
    renderVoteSection();
  }
  
  function selectCard(id) {
    if (state.currentVoted) return;
    state.selectedId = id;
  
    document.querySelectorAll('.vcard').forEach(el => {
      const isSel = parseInt(el.dataset.id) === id;
      el.classList.toggle('selected', isSel);
      el.querySelector('.vcard-check').textContent = isSel ? '✓' : '';
    });
  
    document.getElementById('btn-confirm').disabled   = false;
    document.getElementById('submit-hint').textContent = 'Candidat sélectionné — confirmez';
  }
  
  function submitVote() {
    if (!state.selectedId || state.currentVoted) return;
    const c = state.candidates.find(x => x.id === state.selectedId);
    if (!c) return;
    c.votes++;
    state.totalVoters++;
    state.currentVoted = true;
    updateAdminCount();
    renderVoteSection();
  }
  
  function nextVoter() {
    state.voterName    = '';
    state.currentVoted = false;
    state.selectedId   = null;
    renderVoteSection();
  }
  
  /* ══════════════════════════════════════════════════════════════
     RÉSULTATS
  ══════════════════════════════════════════════════════════════ */
  function renderResults() {
    const total = state.candidates.reduce((s, c) => s + c.votes, 0);
  
    document.getElementById('total-pill').textContent =
      `${total} vote${total !== 1 ? 's' : ''}`;
  
    const noVotesEl  = document.getElementById('no-votes');
    const chartsWrap = document.getElementById('charts-wrap');
  
    if (total === 0 || !state.candidates.length) {
      noVotesEl.style.display  = 'block';
      chartsWrap.style.display = 'none';
      return;
    }
  
    noVotesEl.style.display  = 'none';
    chartsWrap.style.display = 'block';
  
    const sorted = [...state.candidates].sort((a, b) => b.votes - a.votes);
  
    // ── Barres ──
    document.getElementById('bar-chart').innerHTML = sorted.map(c => {
      const pct = Math.round((c.votes / total) * 100);
      return `
      <div class="brow">
        <div class="blabel">
          <div class="blabel-name">${c.firstname} ${c.lastname}</div>
          <div class="blabel-sub">${c.department} · ${c.level}</div>
        </div>
        <div class="btrack">
          <div class="bfill" id="bf-${c.id}"
               style="background:linear-gradient(90deg,${c.color},${c.color}99)">
            <span class="bpct-inline" id="bp-${c.id}"></span>
          </div>
        </div>
        <div class="bstat"><strong>${pct}%</strong> · ${c.votes}v</div>
      </div>`;
    }).join('');
  
    setTimeout(() => {
      sorted.forEach(c => {
        const pct = Math.round((c.votes / total) * 100);
        const fill = document.getElementById(`bf-${c.id}`);
        const pctEl = document.getElementById(`bp-${c.id}`);
        if (fill)  { fill.style.width = pct + '%'; fill.classList.add('shown'); }
        if (pctEl) pctEl.textContent = pct + '%';
      });
    }, 80);
  
    // ── Donut ──
    renderDonut(sorted, total);
  
    // ── Vainqueur ──
    const w = sorted[0];
    const wPct = Math.round((w.votes / total) * 100);
    document.getElementById('winner-name').textContent  = `${w.firstname} ${w.lastname}`;
    document.getElementById('winner-name').style.color  = w.color;
    document.getElementById('winner-dept').textContent  = `${w.department} · ${w.faculty.split('—')[0].trim()} · ${w.level}`;
    document.getElementById('winner-stat').textContent  = `${wPct}% des suffrages · ${w.votes} vote${w.votes !== 1 ? 's' : ''}`;
  }
  
  function renderDonut(sorted, total) {
    const svg    = document.getElementById('donut-svg');
    const legend = document.getElementById('donut-legend');
    const cx = 80, cy = 80, r = 60;
    const circ = 2 * Math.PI * r;
  
    svg.querySelectorAll('.dseg').forEach(el => el.remove());
  
    let cumulative = 0;
    const segments = sorted.map(c => {
      const pct = c.votes / total;
      const seg = { c, pct, offset: cumulative };
      cumulative += pct;
      return seg;
    });
  
    segments.forEach(({ c, pct, offset }) => {
      if (pct === 0) return;
      const dash = `${pct * circ} ${(1 - pct) * circ}`;
      const rot  = offset * 360 - 90;
      const el   = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('class',             'dseg');
      el.setAttribute('cx',                cx);
      el.setAttribute('cy',                cy);
      el.setAttribute('r',                 r);
      el.setAttribute('fill',              'none');
      el.setAttribute('stroke',            c.color);
      el.setAttribute('stroke-width',      '28');
      el.setAttribute('stroke-dasharray',  dash);
      el.setAttribute('transform',         `rotate(${rot} ${cx} ${cy})`);
      el.style.transition = 'stroke-dasharray 1s ease';
      svg.appendChild(el);
    });
  
    legend.innerHTML = sorted.map(c => {
      const pct = Math.round((c.votes / total) * 100);
      return `
      <div class="legend-row">
        <div class="legend-dot" style="background:${c.color}"></div>
        <span class="legend-name">${c.firstname} ${c.lastname}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
    }).join('');
  }
  
  /* ══════════════════════════════════════════════════════════════
     MINUTERIE
  ══════════════════════════════════════════════════════════════ */
  function startTimer() {
    if (state.timerRunning) return;
    const mins = parseInt(document.getElementById('timer-input').value) || 5;
    state.timerSeconds = mins * 60;
    state.timerRunning = true;
    updateTimerDisplay();
  
    state.timerInterval = setInterval(() => {
      state.timerSeconds--;
      updateTimerDisplay();
      if (state.timerSeconds <= 0) {
        clearInterval(state.timerInterval);
        state.timerRunning = false;
        setTimerText('TERMINÉ');
        removeUrgent();
      }
    }, 1000);
  }
  
  function resetTimer() {
    clearInterval(state.timerInterval);
    state.timerRunning = false;
    state.timerSeconds = 0;
    setTimerText('00:00');
    document.getElementById('vote-timer-display').textContent = '—';
    removeUrgent();
  }
  
  function updateTimerDisplay() {
    const m   = Math.floor(state.timerSeconds / 60).toString().padStart(2, '0');
    const s   = (state.timerSeconds % 60).toString().padStart(2, '0');
    const txt = `${m}:${s}`;
    const urg = state.timerSeconds <= 30 && state.timerSeconds > 0;
    setTimerText(txt);
    ['timer-display','vote-timer-display'].forEach(id => {
      document.getElementById(id)?.classList.toggle('urgent', urg);
    });
  }
  
  function setTimerText(txt) {
    ['timer-display','vote-timer-display'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    });
  }
  
  function removeUrgent() {
    ['timer-display','vote-timer-display'].forEach(id => {
      document.getElementById(id)?.classList.remove('urgent');
    });
  }
  
  /* ══════════════════════════════════════════════════════════════
     UTILITAIRES
  ══════════════════════════════════════════════════════════════ */
  function initials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
  
  /* ══════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    updateAdminCount();
  });