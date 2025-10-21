// =================================================================
// ARQUIVO DE LÓGICA PRINCIPAL (V3 - Fundido V1+V2)
// =================================================================

// --- Variáveis Globais do App ---
let db = {
    races: {},
    profile: {}
};
// Estado da Aplicação V2 (para calendário)
let appState = {
    rankingData: {}, // Mantido para armazenar dados do ranking.json
    resultadosEtapas: {},
    allCorridas: {}
};

let firebaseApp, database, auth;
let authUser = null;
let currentViewingUid = null;
let isAdmin = false;
let hasRunner2 = false;

const RUNNER_1_KEY = "runner1";
const RUNNER_2_KEY = "runner2";

let RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
let RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };

// --- Cache de Elementos DOM (V1 + V2) ---
const dom = {
    // V1 (Perfis)
    btnLogout: document.getElementById('btn-logout'),
    btnBackToPublic: document.getElementById('btn-back-to-public'),
    btnBackToMyDashboard: document.getElementById('btn-back-to-my-dashboard'),
    userInfo: document.getElementById('user-info'),
    userEmail: document.getElementById('user-email'),
    loginOrPublicView: document.getElementById('login-or-public-view'),
    loginView: document.getElementById('login-view'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    loginTitle: document.getElementById('login-title'),
    btnLoginSubmit: document.getElementById('btn-login-submit'),
    btnSignUpSubmit: document.getElementById('btn-signup-submit'),
    loginToggleLink: document.getElementById('login-toggle-link'),
    signupFields: document.getElementById('signup-fields'),
    signupRunner1Name: document.getElementById('signup-runner1-name'),
    signupRunner2Name: document.getElementById('signup-runner2-name'),
    signupTeamName: document.getElementById('signup-team-name'),
    publicView: document.getElementById('public-view'),
    publicProfileListPublic: document.getElementById('public-profile-list-public'),
    publicProfileListLogged: document.getElementById('public-profile-list-logged'), // <-- Certifique-se que este ID existe no HTML
    userContent: document.getElementById('user-content'),
    headerSubtitle: document.getElementById('header-subtitle'),
    prGrid: document.getElementById('pr-grid'),
    summaryGrid: document.getElementById('summary-grid'),
    controlsSection: document.getElementById('controls-section'),
    btnAddnew: document.getElementById('btn-add-new'),
    historyContainer: document.getElementById('history-container'),
    modal: document.getElementById('race-modal'),
    form: document.getElementById('race-form'),
    modalTitle: document.getElementById('modal-title'),
    btnDelete: document.getElementById('btn-delete'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancel: document.getElementById('btn-cancel'),
    runner1FormGroup: document.getElementById('runner1-form-group'),
    runner2FormGroup: document.getElementById('runner2-form-group'),
    pendingApprovalView: document.getElementById('pending-approval-view'),
    rejectedView: document.getElementById('rejected-view'),
    rejectedEmail: document.getElementById('rejected-email'),

    // V2 (Calendário Público)
    copaContainerPublic: document.getElementById('copa-container-public'),
    geralContainerPublic: document.getElementById('geral-container-public'),
    resultadosContainerPublic: document.getElementById('resultados-container-public'),
    copaContainerLogged: document.getElementById('copa-container-logged'),
    geralContainerLogged: document.getElementById('geral-container-logged'),
    resultadosContainerLogged: document.getElementById('resultados-container-logged'),

    // V2 (Modal de Resultados)
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitleResults: document.getElementById('modal-title-results'),
    modalContentResults: document.getElementById('modal-content-results'),
    modalSearchInput: document.getElementById('modal-search-input'),
    btnCloseResultsModal: document.getElementById('btn-close-results-modal')
};

// ======================================================
// SEÇÃO V1: LÓGICA DE PERFIS DE USUÁRIO
// ======================================================

// --- Funções Utilitárias de Tempo e Pace ---
function timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':').map(Number).filter(n => !isNaN(n));
    let seconds = 0;
    if (parts.length === 2) { seconds = parts[0] * 60 + parts[1]; }
    else if (parts.length === 3) { seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]; }
    else { return null; }
    return seconds;
}
function secondsToTime(totalSeconds) {
    if (totalSeconds === null || isNaN(totalSeconds) || totalSeconds === Infinity) return 'N/A';
    totalSeconds = Math.round(totalSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return (hours > 0) ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
function normalizeTime(timeStr) {
    if (!timeStr) return null;
    const cleanTime = timeStr.replace(/[^0-9:]/g, '');
    const parts = cleanTime.split(':');
    if (parts.length === 2) { return `00:${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`; }
    else if (parts.length === 3) { return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}:${String(parts[2]).padStart(2, '0')}`; }
    return null;
}
function calculatePace(timeStr, distance) {
    const seconds = timeToSeconds(timeStr);
    const dist = parseFloat(distance);
    if (!seconds || !dist || dist <= 0) return 'N/A';
    const paceInSeconds = seconds / dist;
    const paceMinutes = Math.floor(paceInSeconds / 60);
    const paceSeconds = Math.round(paceInSeconds % 60);
    return `${String(paceMinutes).padStart(2, '0')}:${String(paceSeconds).padStart(2, '0')} /km`;
}


// --- Funções de Lógica da Aplicação (V1) ---
function updateProfileUI() {
    const profile = db.profile;
    hasRunner2 = false;
    RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
    RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };
    if (profile && profile.runner1Name) { RUNNER_1_PROFILE = { name: profile.runner1Name, nameShort: profile.runner1Name.split(' ')[0] || "Corredor", emoji: '🏃‍♂️' }; }
    if (profile && profile.runner2Name && profile.runner2Name.trim() !== "") {
         hasRunner2 = true; RUNNER_2_PROFILE = { name: profile.runner2Name, nameShort: profile.runner2Name.split(' ')[0] || "Corredora", emoji: '🏃‍♀️' };
         if(dom.runner2FormGroup) dom.runner2FormGroup.classList.remove('hidden');
    } else {
        if(dom.runner2FormGroup) dom.runner2FormGroup.classList.add('hidden');
    }
    let headerTitle = RUNNER_1_PROFILE.name;
    if (hasRunner2) { headerTitle += ` & ${RUNNER_2_PROFILE.name}`; }
    if(dom.headerSubtitle) dom.headerSubtitle.textContent = headerTitle;
    if(dom.runner1FormGroup) dom.runner1FormGroup.querySelector('h4').innerHTML = `${RUNNER_1_PROFILE.name} ${RUNNER_1_PROFILE.emoji}`;
    if(dom.runner2FormGroup) dom.runner2FormGroup.querySelector('h4').innerHTML = `${RUNNER_2_PROFILE.name} ${RUNNER_2_PROFILE.emoji}`;
}
function renderDashboard() {
    // ... (código do renderDashboard permanece o mesmo - já corrigido para hasRunner2) ...
     const racesArray = Object.values(db.races); const prs = { runner1: {}, runner2: {} }; const distances = [2, 5, 6, 7, 10, 12, 16, 17];
    let totalKmRunner1 = 0, totalKmRunner2 = 0, totalRacesJuntos = 0, completedRacesRunner1 = 0, completedRacesRunner2 = 0;
    distances.forEach(d => { prs.runner1[d] = { time: 'N/A', seconds: Infinity }; prs.runner2[d] = { time: 'N/A', seconds: Infinity }; });
    racesArray.forEach(race => {
        const r1 = race[RUNNER_1_KEY]; const r2 = race[RUNNER_2_KEY];
        if (race.juntos && r1?.status === 'completed' && r2?.status === 'completed') totalRacesJuntos++;
        if (r1?.status === 'completed') {
            completedRacesRunner1++; const dist = parseFloat(r1.distance || race.distance); const timeSec = timeToSeconds(r1.time);
            if (dist) totalKmRunner1 += dist; if (dist && prs.runner1[dist] && timeSec < prs.runner1[dist].seconds) { prs.runner1[dist] = { seconds: timeSec, time: secondsToTime(timeSec) }; }
        }
        if (r2?.status === 'completed') {
            completedRacesRunner2++; const dist = parseFloat(r2.distance || race.distance); const timeSec = timeToSeconds(r2.time);
            if (dist) totalKmRunner2 += dist; if (dist && prs.runner2[dist] && timeSec < prs.runner2[dist].seconds) { prs.runner2[dist] = { seconds: timeSec, time: secondsToTime(timeSec) }; }
        }
    });
    if(dom.prGrid) dom.prGrid.innerHTML = distances.map(d => { const r2HTML = hasRunner2 ? `<div class="runner-pr"><strong class="runner-pr-thamis">${RUNNER_2_PROFILE.nameShort}: ${prs.runner2[d].time}</strong></div>` : ''; return `<div class="stat-card pr-card"><div class="stat-label">PR ${d}km</div><div class="stat-number"><div class="runner-pr"><span class="runner-pr-thiago">${RUNNER_1_PROFILE.nameShort}: ${prs.runner1[d].time}</span></div>${r2HTML}</div></div>`; }).join('');
    const totalCorridas = completedRacesRunner1 + completedRacesRunner2; const totalLbl = hasRunner2 ? " (Total)" : ""; const juntosHTML = hasRunner2 ? `<div class="stat-card"><div class="stat-number">${totalRacesJuntos} 👩🏻‍❤️‍👨🏻</div><div class="stat-label">Corridas Juntos</div></div>` : ''; const totalKmComb = totalKmRunner1 + totalKmRunner2; const totalKmLbl = hasRunner2 ? " (Casal)" : "";
    const splitKmHTML = hasRunner2 ? `<div class="stat-card"><div class="stat-number"><span class="runner-pr-thiago">${totalKmRunner1.toFixed(1)}</span> / <strong class="runner-pr-thamis">${totalKmRunner2.toFixed(1)}</strong></div><div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort} / ${RUNNER_2_PROFILE.nameShort})</div></div>` : `<div class="stat-card"><div class="stat-number">${totalKmRunner1.toFixed(1)} km</div><div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort})</div></div>`;
    if(dom.summaryGrid) dom.summaryGrid.innerHTML = `<div class="stat-card"><div class="stat-number">${totalCorridas}</div><div class="stat-label">Corridas Concluídas${totalLbl}</div></div>${juntosHTML}<div class="stat-card"><div class="stat-number">${totalKmComb.toFixed(1)} km</div><div class="stat-label">Total KM${totalKmLbl}</div></div>${splitKmHTML}`;
}
function renderHistory() {
    // ... (código do renderHistory permanece o mesmo - já corrigido para hasRunner2) ...
     if(!dom.historyContainer) return;
    dom.historyContainer.innerHTML = '';
    const sortedRaces = Object.entries(db.races).map(([id, race]) => ({ ...race, id: id })).sort((a, b) => new Date(b.date) - new Date(a.date));
    const racesByYear = sortedRaces.reduce((acc, race) => { const year = race.year || new Date(race.date + 'T00:00:00Z').getFullYear().toString(); if (!acc[year]) acc[year] = []; acc[year].push(race); return acc; }, {});
    const sortedYears = Object.keys(racesByYear).sort((a, b) => b - a);
    if (sortedYears.length === 0) { dom.historyContainer.innerHTML = `<div class="loader">${authUser ? 'Nenhuma corrida. Adicione uma!' : 'Perfil sem corridas.'}</div>`; return; }
    for (const year of sortedYears) {
        const yearGroup = document.createElement('div'); yearGroup.className = 'year-group'; const yearEmoji = year.split('').map(d => ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][d]).join(''); yearGroup.innerHTML = `<h2 class="year-title">${yearEmoji} (${racesByYear[year].length} provas)</h2>`;
        const raceList = document.createElement('div'); raceList.className = 'race-card-list'; racesByYear[year].forEach(race => raceList.appendChild(createRaceCard(race)));
        yearGroup.appendChild(raceList); dom.historyContainer.appendChild(yearGroup);
    }
}
function createRaceCard(race) {
    // ... (código do createRaceCard permanece o mesmo - já corrigido para hasRunner2) ...
     const card = document.createElement('div'); const r1 = race[RUNNER_1_KEY]; const r2 = race[RUNNER_2_KEY]; if (!r1) { console.warn("Dados incompletos:", race); return card; }
    let cardStatus = 'completed'; if (r1.status === 'planned' || (r2 && r2.status === 'planned')) cardStatus = 'planned'; if (r1.status === 'skipped' && (!r2 || r2.status === 'skipped')) cardStatus = 'skipped';
    card.className = `race-card status-${cardStatus}`; card.dataset.id = race.id;
    const r1Dist = r1.distance || race.distance; const r1Pace = calculatePace(r1.status === 'completed' ? r1.time : r1.goalTime, r1Dist); let r2Dist = null, r2Pace = null; if(r2) { r2Dist = r2.distance || race.distance; r2Pace = calculatePace(r2.status === 'completed' ? r2.time : r2.goalTime, r2Dist); }
    let raceDistDisplay = ''; if (race.distance) { raceDistDisplay = `${race.distance}km`; } else if (r1Dist && r2 && r2Dist && r1Dist !== r2Dist) { raceDistDisplay = `${r1Dist || '?'}k / ${r2Dist || '?'}k`; } else { raceDistDisplay = `${r1Dist || (r2 ? r2Dist : '') || '?'}km`; }
    const canEdit = authUser && authUser.uid === currentViewingUid;
    card.innerHTML = `<div class="race-card-header"><h3>${race.raceName}</h3><span class="date">${new Date(race.date).toLocaleDateString('pt-BR', {timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric'})}</span></div><div class="race-card-body">${createRunnerInfoHTML(RUNNER_1_PROFILE, r1, r1Dist, r1Pace, 'runner1')}${(hasRunner2 && r2) ? createRunnerInfoHTML(RUNNER_2_PROFILE, r2, r2Dist, r2Pace, 'runner2') : ''}</div><div class="race-card-footer"><div><span class="juntos-icon">${(hasRunner2 && race.juntos) ? '👩🏻‍❤️‍👨🏻' : ''}</span><span class="race-notes">${race.notes || ''}</span></div><div style="display: flex; align-items: center;"><span class="race-distance">${raceDistDisplay}</span><div class="race-controls ${canEdit ? '' : 'hidden'}"><button class="btn-control btn-edit" title="Editar">✏️</button><button class="btn-control btn-delete" title="Excluir">🗑️</button></div></div></div>`;
    if(canEdit) { card.querySelector('.btn-edit').addEventListener('click', () => openModal(race.id)); card.querySelector('.btn-delete').addEventListener('click', () => deleteRace(race.id)); } return card;
}
function createRunnerInfoHTML(config, runnerData, distance, pace, cssClass) {
    // ... (código do createRunnerInfoHTML permanece o mesmo - já corrigido para hasRunner2 e o SyntaxError) ...
    let timeHTML = '', paceHTML = '';
    if(!runnerData || !runnerData.status) return '';
    switch (runnerData.status) {
        case 'completed':
            timeHTML = `<div class="runner-time">${secondsToTime(timeToSeconds(runnerData.time))}</div>`;
            if (pace !== 'N/A') paceHTML = `<div class="runner-pace">${pace}</div>`;
            break;
        case 'planned':
            const goalTime = runnerData.goalTime || (runnerData.time && runnerData.time.includes(':') ? runnerData.time : null); // Corrigido fallback
            timeHTML = `<div class="runner-time goal">⏳ ${goalTime ? secondsToTime(timeToSeconds(goalTime)) : 'Planejada'}</div>`;
            if (goalTime && pace !== 'N/A') paceHTML = `<div class="runner-pace goal">(Meta Pace: ${calculatePace(goalTime, distance)})</div>`;
            else if (pace !== 'N/A') paceHTML = `<div class="runner-pace goal">(Pace Estimado: ${pace})</div>`;
            break;
        case 'skipped':
            timeHTML = `<div class="runner-time skipped">❌ Não Correu</div>`;
            break;
        default:
            timeHTML = `<div class="runner-time skipped">N/A</div>`;
    }
    if (runnerData.status === 'skipped') { return `<div class="runner-info"><span class="runner-name ${cssClass}">${config.name} ${config.emoji}</span><div class="runner-details">${timeHTML}</div></div>`; }
    return `<div class="runner-info"><span class="runner-name ${cssClass}">${config.name} ${config.emoji}</span><div class="runner-details">${timeHTML}${paceHTML}</div></div>`;
}


// --- Funções do Modal e CRUD (V1) ---
function openModal(raceId = null) {
    // ... (código do openModal permanece o mesmo) ...
     if(!dom.form || !dom.modal || !dom.btnDelete || !dom.modalTitle) return;
    dom.form.reset(); document.getElementById('race-id').value = ''; dom.btnDelete.classList.add('hidden'); updateProfileUI();
    if (raceId) {
        dom.modalTitle.textContent = 'Editar Corrida Pessoal'; dom.btnDelete.classList.remove('hidden'); const race = db.races[raceId]; if (!race) return;
        document.getElementById('race-id').value = raceId; document.getElementById('raceName').value = race.raceName; document.getElementById('raceDate').value = race.date;
        document.getElementById('raceDistance').value = race.distance || ''; document.getElementById('raceJuntos').checked = race.juntos; document.getElementById('raceNotes').value = race.notes || '';
        const r1 = race[RUNNER_1_KEY]; const r2 = race[RUNNER_2_KEY];
        if(r1){ document.getElementById('runner1Status').value = r1.status || 'skipped'; const t1 = r1.status === 'completed' ? r1.time : (r1.goalTime || r1.time || ''); document.getElementById('runner1Time').value = normalizeTime(t1) ? secondsToTime(timeToSeconds(t1)) : ''; document.getElementById('runner1Distance').value = r1.distance || ''; }
        if(r2){ document.getElementById('runner2Status').value = r2.status || 'skipped'; const t2 = r2.status === 'completed' ? r2.time : (r2.goalTime || r2.time || ''); document.getElementById('runner2Time').value = normalizeTime(t2) ? secondsToTime(timeToSeconds(t2)) : ''; document.getElementById('runner2Distance').value = r2.distance || ''; }
    } else { dom.modalTitle.textContent = 'Adicionar Nova Corrida Pessoal'; document.getElementById('raceDate').value = new Date().toISOString().split('T')[0]; }
    if(typeof dom.modal.showModal === 'function') dom.modal.showModal();
}
function closeModal() { if(dom.modal && typeof dom.modal.close === 'function') dom.modal.close(); }
function handleFormSubmit(e) {
    // ... (código do handleFormSubmit permanece o mesmo) ...
     e.preventDefault(); if (!currentViewingUid || !authUser || currentViewingUid !== authUser.uid) { alert("Erro: Não autorizado."); return; }
    const id = document.getElementById('race-id').value; const date = document.getElementById('raceDate').value;
    const t1Raw = document.getElementById('runner1Time').value; const t2Raw = document.getElementById('runner2Time').value;
    const s1 = document.getElementById('runner1Status').value; const s2 = document.getElementById('runner2Status').value;
    const raceData = { date: date, year: new Date(date + 'T00:00:00Z').getFullYear().toString(), raceName: document.getElementById('raceName').value, distance: parseFloat(document.getElementById('raceDistance').value) || null, juntos: document.getElementById('raceJuntos').checked, notes: document.getElementById('raceNotes').value || null, [RUNNER_1_KEY]: { status: s1, time: s1 === 'completed' ? normalizeTime(t1Raw) : null, goalTime: s1 === 'planned' ? normalizeTime(t1Raw) : null, distance: parseFloat(document.getElementById('runner1Distance').value) || null }, [RUNNER_2_KEY]: { status: s2, time: s2 === 'completed' ? normalizeTime(t2Raw) : null, goalTime: s2 === 'planned' ? normalizeTime(t2Raw) : null, distance: parseFloat(document.getElementById('runner2Distance').value) || null } };
    const dbPath = `/users/${currentViewingUid}/races/`;
    if (id) { firebase.database().ref(dbPath).child(id).set(raceData).then(closeModal).catch(err => { console.error("Erro update:", err); alert("Erro ao salvar: " + err.message); }); }
    else { const newRef = firebase.database().ref(dbPath).push(); newRef.set(raceData).then(closeModal).catch(err => { console.error("Erro create:", err); alert("Erro ao salvar: " + err.message); }); }
}
function deleteRace(raceId) {
    // ... (código do deleteRace permanece o mesmo) ...
     if (!currentViewingUid || !authUser || currentViewingUid !== authUser.uid) { alert("Erro: Não autorizado."); return; }
    const race = db.races[raceId]; if (!race || !confirm(`Excluir ${race.raceName} (${race.date})?`)) return;
    firebase.database().ref(`/users/${currentViewingUid}/races/`).child(raceId).remove().then(closeModal).catch(err => { console.error("Erro delete:", err); alert("Erro ao excluir: " + err.message); });
}


// --- Funções de Carregamento de Dados (V1 - Dados do Usuário RTDB) ---
function renderAllV1Profile() { updateProfileUI(); renderDashboard(); renderHistory(); }
function loadProfile(uid) {
    // ... (código do loadProfile permanece o mesmo) ...
     if(!database) return;
    const profileRef = database.ref(`/users/${uid}/profile`);
    profileRef.once('value').then(snapshot => { const data = snapshot.val(); if (data) { db.profile = data; renderAllV1Profile(); } });
}
function loadRaces(uid) {
    // ... (código do loadRaces permanece o mesmo) ...
     if(!database) return;
    currentViewingUid = uid;
    if (authUser && authUser.uid === currentViewingUid) { dom.controlsSection?.classList.remove('hidden'); } else { dom.controlsSection?.classList.add('hidden'); }
    const racesRef = database.ref(`/users/${uid}/races`); db.races = {};
    if(dom.prGrid) dom.prGrid.innerHTML = '<div class="loader">Carregando PRs...</div>';
    if(dom.summaryGrid) dom.summaryGrid.innerHTML = '<div class="loader">Calculando...</div>';
    if(dom.historyContainer) dom.historyContainer.innerHTML = '<div class="loader">Carregando histórico...</div>';
    racesRef.off('value'); racesRef.on('value', (snapshot) => { db.races = snapshot.val() || {}; renderAllV1Profile(); });
}


// --- Carregamento de Dados Públicos (V1 - Perfis do JSON) ---
// [FUNÇÃO CORRIGIDA - Restaura população de ambas as listas]
function loadPublicView() {
    if (!authUser && dom.headerSubtitle) { dom.headerSubtitle.textContent = "Selecione um currículo ou faça login"; }

    fetch('./data/public_profiles.json', { cache: 'no-cache' }) // Adiciona no-cache para garantir atualização
        .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar public_profiles.json`); return response.json(); })
        .then(profiles => {
            // Limpa ambos os containers ANTES de popular
            if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = '<div class="loader">Carregando...</div>'; // Mostra loader
            if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = '<div class="loader">Carregando...</div>'; // Mostra loader

            if (profiles && Object.keys(profiles).length > 0) {
                // Função helper para criar o card (reutilizada)
                const createCard = (uid, profile) => {
                    const card = document.createElement('div'); card.className = 'profile-card';
                    const r2HTML = profile.runner2Name && profile.runner2Name.trim() !== "" ? `<h3 class="runner2-name">${profile.runner2Name}</h3>` : '';
                    card.innerHTML = `<h3>${profile.runner1Name || 'Corredor 1'}</h3>${r2HTML}<p>${profile.teamName || 'Equipe'}</p>`;
                    card.addEventListener('click', () => {
                        if (!authUser) { dom.loginOrPublicView?.classList.add('hidden'); dom.userContent?.classList.remove('hidden'); dom.btnBackToPublic?.classList.remove('hidden'); dom.btnBackToMyDashboard?.classList.add('hidden'); }
                        else { dom.btnBackToPublic?.classList.add('hidden'); dom.btnBackToMyDashboard?.classList.remove('hidden'); }
                        loadProfile(uid); loadRaces(uid);
                    }); return card;
                };

                // Limpa DE NOVO antes de adicionar, garantindo que não haja duplicatas se a função for chamada múltiplas vezes
                if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = '';
                if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = '';

                // Popula AMBAS as listas
                Object.entries(profiles).forEach(([uid, profile]) => {
                    // Adiciona ao container PÚBLICO
                    if (dom.publicProfileListPublic) {
                        dom.publicProfileListPublic.appendChild(createCard(uid, profile));
                    }
                    // Adiciona ao container LOGADO (exceto o próprio usuário)
                    if (dom.publicProfileListLogged) {
                        if (!(authUser && authUser.uid === uid)) { // Condição para não mostrar o próprio
                           dom.publicProfileListLogged.appendChild(createCard(uid, profile));
                        }
                    }
                });
                 // Se a lista logada ficou vazia (só tinha o próprio usuário)
                 if (dom.publicProfileListLogged && dom.publicProfileListLogged.children.length === 0 && authUser) {
                    dom.publicProfileListLogged.innerHTML = '<div class="loader">Nenhum outro perfil público encontrado.</div>';
                 }

            } else {
                // Mensagem se não houver NENHUM perfil
                const msg = '<div class="loader">Nenhum perfil público encontrado.</div>';
                if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = msg;
                if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = msg;
            }
        })
        .catch(error => {
            console.error("Falha ao carregar 'public_profiles.json':", error);
            const msg = `<div class="loader" style="color:red;">Erro ao carregar perfis (${error.message}).</div>`;
            if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = msg;
            if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = msg;
        });
}


// --- Funções de Lógica de UI (V1 - Roteador) ---
function showLoggedOutView() {
    // ... (código do showLoggedOutView permanece o mesmo) ...
     authUser = null; isAdmin = false; currentViewingUid = null;
    dom.btnLogout?.classList.add('hidden'); dom.btnBackToPublic?.classList.add('hidden'); dom.btnBackToMyDashboard?.classList.add('hidden');
    dom.userInfo?.classList.add('hidden'); dom.controlsSection?.classList.add('hidden'); dom.pendingApprovalView?.classList.add('hidden'); dom.rejectedView?.classList.add('hidden');
    dom.loginOrPublicView?.classList.remove('hidden'); dom.publicView?.classList.remove('hidden'); dom.userContent?.classList.add('hidden');
    if(dom.loginError) dom.loginError.textContent = ''; if(dom.loginForm) dom.loginForm.reset(); toggleLoginMode(false);
    db = { races: {}, profile: {} };
    loadPublicView(); fetchAllData();
}
function showPendingView() {
    // ... (código do showPendingView permanece o mesmo) ...
     dom.btnLogout?.classList.remove('hidden'); dom.userInfo?.classList.remove('hidden'); if(dom.userEmail) dom.userEmail.textContent = authUser?.email || '';
    dom.loginOrPublicView?.classList.add('hidden'); dom.userContent?.classList.add('hidden'); dom.btnBackToPublic?.classList.add('hidden'); dom.rejectedView?.classList.add('hidden');
    dom.pendingApprovalView?.classList.remove('hidden');
}
function showRejectedView(email) {
    // ... (código do showRejectedView permanece o mesmo) ...
    dom.btnLogout?.classList.remove('hidden'); dom.userInfo?.classList.remove('hidden'); if(dom.userEmail) dom.userEmail.textContent = email || '';
    dom.loginOrPublicView?.classList.add('hidden'); dom.userContent?.classList.add('hidden'); dom.btnBackToPublic?.classList.add('hidden'); dom.pendingApprovalView?.classList.add('hidden');
    if(dom.rejectedEmail) dom.rejectedEmail.textContent = email || ''; dom.rejectedView?.classList.remove('hidden');
}
function showUserDashboard(user) {
    // ... (código do showUserDashboard permanece o mesmo) ...
     if(!user) return;
    dom.btnLogout?.classList.remove('hidden'); dom.userInfo?.classList.remove('hidden'); if(dom.userEmail) dom.userEmail.textContent = user.email;
    dom.loginOrPublicView?.classList.add('hidden'); dom.pendingApprovalView?.classList.add('hidden'); dom.rejectedView?.classList.add('hidden'); dom.btnBackToPublic?.classList.add('hidden'); dom.btnBackToMyDashboard?.classList.add('hidden');
    dom.userContent?.classList.remove('hidden');
    loadProfile(user.uid); loadRaces(user.uid); fetchAllData(); loadPublicView();
    if (isAdmin) {
        dom.userInfo?.classList.add('admin-user');
        if (typeof initializeAdminPanel === 'function') { initializeAdminPanel(user.uid, database); }
        else { console.error("initializeAdminPanel não encontrada."); }
    } else {
        dom.userInfo?.classList.remove('admin-user'); const adminPanel = document.getElementById('admin-panel'); if (adminPanel) adminPanel.classList.add('hidden');
    }
}


// --- Funções de Autenticação (V1) ---
function showLoginError(message) { if(dom.loginError) dom.loginError.textContent = message; }
function toggleLoginMode(isSigningUp) {
    // ... (código do toggleLoginMode permanece o mesmo) ...
    if(!dom.loginTitle || !dom.signupFields || !dom.btnLoginSubmit || !dom.btnSignUpSubmit || !dom.loginToggleLink || !dom.loginError) return;
    if (isSigningUp) { dom.loginTitle.textContent = "Cadastrar"; dom.signupFields.classList.remove('hidden'); dom.btnLoginSubmit.classList.add('hidden'); dom.btnSignUpSubmit.classList.remove('hidden'); dom.loginToggleLink.textContent = "Já tem conta? Entrar"; }
    else { dom.loginTitle.textContent = "Acessar Currículo"; dom.signupFields.classList.add('hidden'); dom.btnLoginSubmit.classList.remove('hidden'); dom.btnSignUpSubmit.classList.add('hidden'); dom.loginToggleLink.textContent = "Não tem conta? Cadastre-se"; }
    dom.loginError.textContent = '';
}
function handleSignUp(e) {
    // ... (código do handleSignUp permanece o mesmo) ...
     e.preventDefault(); if(!auth || !dom.loginEmail || !dom.loginPassword || !dom.signupRunner1Name) return;
    const email = dom.loginEmail.value; const password = dom.loginPassword.value; const r1Name = dom.signupRunner1Name.value; dom.loginError.textContent = '';
    if (password.length < 6) { showLoginError("Senha curta (mín. 6)."); return; } if (!r1Name) { showLoginError("Nome Corredor 1 obrigatório."); return; }
    auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            const user = cred.user; if(!user || !database) return; const pendingRef = database.ref('/pendingApprovals/' + user.uid);
            pendingRef.set({ email: user.email, requestDate: new Date().toISOString(), runner1Name: r1Name, runner2Name: dom.signupRunner2Name?.value || "", teamName: dom.signupTeamName?.value || "" });
            console.log("Cadastrado, aguardando aprovação:", user.uid); dom.loginForm?.reset(); toggleLoginMode(false); showLoginError("Cadastro OK! Aguardando aprovação.");
        })
        .catch(err => { console.error("Erro SignUp:", err); showLoginError(err.code === 'auth/email-already-in-use' ? "E-mail já existe." : "Erro: " + err.message); });
}
function handleSignIn(e) {
    // ... (código do handleSignIn permanece o mesmo) ...
     e.preventDefault(); if(!auth || !dom.loginEmail || !dom.loginPassword) return;
    const email = dom.loginEmail.value; const password = dom.loginPassword.value; dom.loginError.textContent = '';
    auth.signInWithEmailAndPassword(email, password)
        .catch(err => { console.error("Erro SignIn:", err); showLoginError( (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') ? "E-mail/senha inválidos." : "Erro: " + err.message ); });
}
function signOut() {
    // ... (código do signOut permanece o mesmo) ...
     if(database) {
        database.ref('/pendingApprovals').off(); database.ref('/publicProfiles').off(); if(currentViewingUid) { database.ref(`/users/${currentViewingUid}/profile`).off(); database.ref(`/users/${currentViewingUid}/races`).off(); }
    }
    if(auth) auth.signOut().catch(err => console.error("Erro Logout:", err));
}


// ======================================================
// SEÇÃO V2: LÓGICA DO CALENDÁRIO PÚBLICO (Lê JSON)
// ======================================================
async function fetchAllData() {
    // ... (código do fetchAllData permanece o mesmo - já corrigido para ranking.json) ...
     try {
        const [corridasResponse, resultadosResponse, rankingResponse] = await Promise.all([
            fetch('./data/corridas.json', { cache: 'no-cache' }),
            fetch('./data/resultados.json', { cache: 'no-cache' }),
            fetch('./data/ranking.json', { cache: 'no-cache' })
        ]);
        if (!corridasResponse.ok) throw new Error(`corridas.json: ${corridasResponse.statusText}`);
        if (!resultadosResponse.ok) throw new Error(`resultados.json: ${resultadosResponse.statusText}`);
        appState.allCorridas = await corridasResponse.json();
        appState.resultadosEtapas = await resultadosResponse.json();
        appState.rankingData = rankingResponse.ok ? await rankingResponse.json() : {};
        console.log("V2 (Corridas) JSON:", appState.allCorridas); console.log("V2 (Resultados) JSON:", appState.resultadosEtapas); console.log("V2 (Ranking) JSON:", appState.rankingData);
        renderContentV2();
    } catch (error) {
        console.error("Falha ao carregar dados JSON:", error);
        const errorMsg = `<p class="loader" style="color:red;">Erro ao carregar calendário (${error.message}).</p>`;
        const containers = [ dom.copaContainerPublic, dom.geralContainerPublic, dom.resultadosContainerPublic, dom.copaContainerLogged, dom.geralContainerLogged, dom.resultadosContainerLogged ];
        containers.forEach(c => { if(c) c.innerHTML = errorMsg; });
    }
}
function renderContentV2() {
    // ... (código do renderContentV2 permanece o mesmo) ...
     const todasCopa = Object.values(appState.allCorridas?.copaAlcer || {}); const todasGerais = Object.values(appState.allCorridas?.geral || {}); const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const agendadasCopa = todasCopa.filter(c => c.data && new Date(c.data) >= hoje); const realizadas = todasCopa.filter(c => c.data && new Date(c.data) < hoje);
    renderCalendar(agendadasCopa, dom.copaContainerPublic, 'inscrições'); renderCalendar(todasGerais, dom.geralContainerPublic, 'inscrições'); renderCalendar(realizadas, dom.resultadosContainerPublic, 'resultados');
    renderCalendar(agendadasCopa, dom.copaContainerLogged, 'inscrições'); renderCalendar(todasGerais, dom.geralContainerLogged, 'inscrições'); renderCalendar(realizadas, dom.resultadosContainerLogged, 'resultados');
}
function renderCalendar(corridas, container, buttonType) {
    // ... (código do renderCalendar permanece o mesmo) ...
     if (!container) return; if (!corridas || corridas.length === 0) { container.innerHTML = `<p class="loader" style="font-size: 0.9em; color: #999;">Nenhuma corrida.</p>`; return; }
    const sorted = corridas.sort((a, b) => new Date(a.data) - new Date(b.data));
    container.innerHTML = sorted.map(corrida => {
        if(!corrida || !corrida.data) return '';
        const dataObj = new Date(`${corrida.data}T12:00:00Z`); const dia = String(dataObj.getDate()).padStart(2, '0'); const mes = dataObj.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(); let btnHTML = '';
        if (buttonType === 'inscrições') { btnHTML = corrida.linkInscricao ? `<a href="${corrida.linkInscricao}" target="_blank" rel="noopener noreferrer" class="v2-inscricoes-button"><i class='bx bx-link-external'></i>Inscrições</a>` : `<div class="v2-race-button-disabled">Encerradas</div>`; }
        else { btnHTML = appState.resultadosEtapas?.[corrida.id] ? `<button class="v2-results-button" data-race-id="${corrida.id}"><i class='bx bx-table'></i>Resultados</button>` : `<div class="v2-race-button-disabled">Em Breve</div>`; }
        return `<div class="v2-race-card"><div class="v2-race-date"><span class="v2-race-date-day">${dia}</span><span class="v2-race-date-month">${mes}</span></div><div class="v2-race-info"><div><h3 class="font-bold text-lg text-white">${corrida.nome || 'Nome Indefinido'}</h3><p class="text-sm text-gray-400"><i class='bx bxs-map'></i>${corrida.cidade || 'Cidade Indefinida'}</p></div><div class="v2-race-buttons">${btnHTML}</div></div></div>`;
    }).join('');
    container.querySelectorAll('.v2-results-button').forEach(button => button.addEventListener('click', (e) => showRaceResultsModal(e.currentTarget.dataset.raceId)));
}
function showRaceResultsModal(raceId) {
    // ... (código do showRaceResultsModal permanece o mesmo) ...
      if(!dom.modalTitleResults || !dom.modalContentResults || !dom.modalSearchInput || !dom.modalOverlay) return;
    const race = appState.allCorridas?.copaAlcer?.[raceId] || appState.allCorridas?.geral?.[raceId]; const results = appState.resultadosEtapas?.[raceId];
    if (!race || !results) { console.error("Dados não encontrados:", raceId); return; }
    dom.modalTitleResults.textContent = `Resultados - ${race.nome}`; let contentHTML = '';
    for (const percurso in results) { for (const genero in results[percurso]) { const atletas = results[percurso][genero];
        if (atletas?.length > 0) {
            contentHTML += `<h3 class="v2-modal-category-title">${percurso} - ${genero.charAt(0).toUpperCase() + genero.slice(1)}</h3><div style="overflow-x: auto;"><table class="v2-results-table"><thead><tr><th>#</th><th>Atleta</th><th>Equipe</th><th>Tempo</th></tr></thead><tbody>${atletas.map(a => `<tr><td class="font-medium">${a.classificacao || '?'}</td><td>${a.nome || '?'}</td><td style="color: #b0b0b0;">${a.assessoria || 'N/A'}</td><td style="font-family: monospace;">${a.tempo || '?'}</td></tr>`).join('')}</tbody></table></div>`;
        } } }
    dom.modalContentResults.innerHTML = contentHTML || '<p class="text-gray-400">Nenhum resultado encontrado para esta etapa.</p>'; dom.modalSearchInput.value = ''; dom.modalOverlay.classList.remove('hidden');
}
function filterResultsInModal() { if(!dom.modalSearchInput || !dom.modalContentResults) return; const term = dom.modalSearchInput.value.toUpperCase(); dom.modalContentResults.querySelectorAll('.v2-results-table tbody tr').forEach(row => { const name = row.cells[1]?.textContent.toUpperCase() || ''; row.style.display = name.includes(term) ? '' : 'none'; }); }
function closeResultsModal() { dom.modalOverlay?.classList.add('hidden'); }


// ======================================================
// PONTO DE ENTRADA PRINCIPAL (DOM LOADED)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
    // ... (código do DOMContentLoaded permanece o mesmo, incluindo inicialização Firebase e listeners) ...
     if (typeof FIREBASE_CONFIG === 'undefined') { alert("ERRO: FIREBASE_CONFIG não encontrado."); document.body.innerHTML = '<h1>ERRO: Configuração Firebase ausente.</h1>'; return; }
    if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') { alert("ERRO: SDK Firebase não carregado."); document.body.innerHTML = '<h1>ERRO: SDK Firebase não carregado.</h1>'; return; }
    try { firebaseApp = firebase.initializeApp(FIREBASE_CONFIG); database = firebase.database(); auth = firebase.auth(); }
    catch (error) { console.error("Erro Firebase Init:", error); alert(`ERRO FATAL Firebase: ${error.message}`); document.body.innerHTML = `<h1>ERRO: ${error.message}</h1>`; return; }
    if(dom.btnAddnew) dom.btnAddnew.addEventListener('click', () => openModal()); if(dom.btnCloseModal) dom.btnCloseModal.addEventListener('click', (e) => { e.preventDefault(); closeModal(); }); if(dom.btnCancel) dom.btnCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); }); if(dom.form) dom.form.addEventListener('submit', handleFormSubmit); if(dom.btnDelete) dom.btnDelete.addEventListener('click', () => { const id = document.getElementById('race-id')?.value; if(id) deleteRace(id); });
    if(dom.btnLoginSubmit) dom.btnLoginSubmit.addEventListener('click', handleSignIn); if(dom.btnSignUpSubmit) dom.btnSignUpSubmit.addEventListener('click', handleSignUp); if(dom.btnLogout) dom.btnLogout.addEventListener('click', signOut); if(dom.btnBackToPublic) dom.btnBackToPublic.addEventListener('click', showLoggedOutView); if(dom.loginToggleLink) dom.loginToggleLink.addEventListener('click', () => { const isSigningUp = dom.signupFields?.classList.contains('hidden'); toggleLoginMode(isSigningUp); }); if(dom.btnBackToMyDashboard) dom.btnBackToMyDashboard.addEventListener('click', () => { if (authUser) { dom.btnBackToMyDashboard.classList.add('hidden'); showUserDashboard(authUser); } }); toggleLoginMode(false);
    if(dom.modalSearchInput) dom.modalSearchInput.addEventListener('keyup', filterResultsInModal); if(dom.btnCloseResultsModal) dom.btnCloseResultsModal.addEventListener('click', closeResultsModal); if(dom.modalOverlay) dom.modalOverlay.addEventListener('click', (e) => { if (e.target === dom.modalOverlay) { closeResultsModal(); } });
    if(auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                authUser = user; isAdmin = user.uid === '29d30W4RS1WzK4SWZRZ5pEFnOdm1';
                if(!database) { console.error("DB não inicializado."); return; }
                database.ref('/users/' + user.uid).once('value')
                .then(userSnap => {
                    if (userSnap.exists() || isAdmin) { showUserDashboard(user); }
                    else {
                        database.ref('/pendingApprovals/' + user.uid).once('value')
                        .then(pendingSnap => { if (pendingSnap.exists()) { showPendingView(); } else { showRejectedView(user.email); } })
                        .catch(error => { if(error.code === "PERMISSION_DENIED") { console.error("Erro Regras (pending):", error); showLoggedOutView(); alert("Erro DB. Contate admin."); auth.signOut(); } else { console.error("Erro pending:", error); showLoggedOutView(); } });
                    }
                })
                .catch(error => { console.error("Erro /users:", error); showLoggedOutView(); });
            } else { showLoggedOutView(); }
        });
    } else { console.error("Auth não inicializado."); showLoggedOutView(); }
}); // Fim DOMContentLoaded
