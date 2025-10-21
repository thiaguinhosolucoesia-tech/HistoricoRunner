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
    rankingData: {},
    resultadosEtapas: {},
    allCorridas: {}
};

let firebaseApp, database, auth;
let authUser = null; 
let currentViewingUid = null; 
let isAdmin = false; 

const RUNNER_1_KEY = "runner1";
const RUNNER_2_KEY = "runner2";

let RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
let RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };

// --- Cache de Elementos DOM (V1 + V2) ---
const dom = {
    // V1 (Perfis)
    btnLogout: document.getElementById('btn-logout'),
    btnBackToPublic: document.getElementById('btn-back-to-public'), 
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
    publicProfileList: document.getElementById('public-profile-list'),
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
    // Define perfis padrão
    RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
    RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };
    
    // Sobrescreve com dados do DB se existirem
    if (profile && profile.runner1Name) {
        RUNNER_1_PROFILE = { name: profile.runner1Name, nameShort: profile.runner1Name.split(' ')[0] || "Corredor", emoji: '🏃‍♂️' };
    }
     // Corrigido para verificar se runner2Name existe e não é string vazia
    if (profile && profile.runner2Name && profile.runner2Name.trim() !== "") {
         RUNNER_2_PROFILE = { name: profile.runner2Name, nameShort: profile.runner2Name.split(' ')[0] || "Corredora", emoji: '🏃‍♀️' };
         dom.runner2FormGroup.classList.remove('hidden');
    } else {
        dom.runner2FormGroup.classList.add('hidden'); // Esconde runner 2 se não houver
    }

    // Atualiza o header para mostrar "Corredor 1 & Corredor 2" ou apenas "Corredor 1"
    let headerTitle = RUNNER_1_PROFILE.name;
    if (RUNNER_2_PROFILE.name !== 'Corredora 2' && RUNNER_2_PROFILE.name.trim() !== "") {
        headerTitle += ` & ${RUNNER_2_PROFILE.name}`;
    }
    dom.headerSubtitle.textContent = headerTitle;

    dom.runner1FormGroup.querySelector('h4').innerHTML = `${RUNNER_1_PROFILE.name} ${RUNNER_1_PROFILE.emoji}`;
    dom.runner2FormGroup.querySelector('h4').innerHTML = `${RUNNER_2_PROFILE.name} ${RUNNER_2_PROFILE.emoji}`;
}

function renderDashboard() {
    const racesArray = Object.values(db.races);
    const prs = { runner1: {}, runner2: {} };
    const distances = [2, 5, 6, 7, 10, 12, 16, 17]; 
    
    let totalKmRunner1 = 0, totalKmRunner2 = 0, totalRacesJuntos = 0, completedRacesRunner1 = 0, completedRacesRunner2 = 0;

    distances.forEach(d => {
        prs.runner1[d] = { time: 'N/A', seconds: Infinity };
        prs.runner2[d] = { time: 'N/A', seconds: Infinity };
    });

    racesArray.forEach(race => {
        const runner1Data = race[RUNNER_1_KEY]; 
        const runner2Data = race[RUNNER_2_KEY];
        
        if (race.juntos && runner1Data && runner1Data.status === 'completed' && runner2Data && runner2Data.status === 'completed') totalRacesJuntos++;

        if (runner1Data && runner1Data.status === 'completed') {
            completedRacesRunner1++;
            const dist = parseFloat(runner1Data.distance || race.distance);
            const timeSec = timeToSeconds(runner1Data.time);
            if (dist) totalKmRunner1 += dist;
            if (dist && prs.runner1[dist] && timeSec < prs.runner1[dist].seconds) {
                prs.runner1[dist] = { seconds: timeSec, time: secondsToTime(timeSec) };
            }
        }

        if (runner2Data && runner2Data.status === 'completed') {
            completedRacesRunner2++;
            const dist = parseFloat(runner2Data.distance || race.distance);
            const timeSec = timeToSeconds(runner2Data.time);
            if (dist) totalKmRunner2 += dist;
            if (dist && prs.runner2[dist] && timeSec < prs.runner2[dist].seconds) {
                prs.runner2[dist] = { seconds: timeSec, time: secondsToTime(timeSec) };
            }
        }
    });

    dom.prGrid.innerHTML = distances.map(d => `
        <div class="stat-card pr-card">
            <div class="stat-label">PR ${d}km</div>
            <div class="stat-number">
                <div class="runner-pr"><span class="runner-pr-thiago">${RUNNER_1_PROFILE.nameShort}: ${prs.runner1[d].time}</span></div>
                <div class="runner-pr"><strong class="runner-pr-thamis">${RUNNER_2_PROFILE.nameShort}: ${prs.runner2[d].time}</strong></div>
            </div>
        </div>`).join('');

    dom.summaryGrid.innerHTML = `
        <div class="stat-card"><div class="stat-number">${completedRacesRunner1 + completedRacesRunner2}</div><div class="stat-label">Corridas Concluídas (Total)</div></div>
        <div class="stat-card"><div class="stat-number">${totalRacesJuntos} 👩🏻‍❤️‍👨🏻</div><div class="stat-label">Corridas Juntos</div></div>
        <div class="stat-card"><div class="stat-number">${(totalKmRunner1 + totalKmRunner2).toFixed(1)} km</div><div class="stat-label">Total KM (Casal)</div></div>
        <div class="stat-card">
            <div class="stat-number">
                <span class="runner-pr-thiago">${totalKmRunner1.toFixed(1)}</span> / <strong class="runner-pr-thamis">${totalKmRunner2.toFixed(1)}</strong>
            </div>
            <div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort} / ${RUNNER_2_PROFILE.nameShort})</div>
        </div>`;
}

function renderHistory() {
    dom.historyContainer.innerHTML = '';
    const sortedRaces = Object.entries(db.races)
        .map(([id, race]) => ({ ...race, id: id }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const racesByYear = sortedRaces.reduce((acc, race) => {
        const year = race.year || new Date(race.date + 'T00:00:00').getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push(race);
        return acc;
    }, {});

    const sortedYears = Object.keys(racesByYear).sort((a, b) => b - a);

    if (sortedYears.length === 0) {
        dom.historyContainer.innerHTML = `<div class="loader">${authUser ? 'Nenhuma corrida encontrada. Clique em "Adicionar Nova Corrida".' : 'Perfil sem corridas.'}</div>`;
        return;
    }

    for (const year of sortedYears) {
        const yearGroup = document.createElement('div');
        yearGroup.className = 'year-group';
        const yearEmoji = year.split('').map(d => ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][d]).join('');
        yearGroup.innerHTML = `<h2 class="year-title">${yearEmoji} (${racesByYear[year].length} provas)</h2>`;

        const raceList = document.createElement('div');
        raceList.className = 'race-card-list';
        racesByYear[year].forEach(race => raceList.appendChild(createRaceCard(race)));

        yearGroup.appendChild(raceList);
        dom.historyContainer.appendChild(yearGroup);
    }
}

function createRaceCard(race) {
    const card = document.createElement('div');
    const runner1Data = race[RUNNER_1_KEY];
    const runner2Data = race[RUNNER_2_KEY];
    
    if (!runner1Data) {
        console.warn("Dados da corrida incompletos (Falta Runner 1):", race);
        return card; 
    }
    
    let cardStatus = 'completed';
    if (runner1Data.status === 'planned' || (runner2Data && runner2Data.status === 'planned')) cardStatus = 'planned';
    if (runner1Data.status === 'skipped' && (!runner2Data || runner2Data.status === 'skipped')) cardStatus = 'skipped';

    card.className = `race-card status-${cardStatus}`;
    card.dataset.id = race.id;

    const runner1Dist = runner1Data.distance || race.distance;
    const runner1Pace = calculatePace(runner1Data.status === 'completed' ? runner1Data.time : runner1Data.goalTime, runner1Dist);
    
    let runner2Dist = null;
    let runner2Pace = null;
    if(runner2Data) {
        runner2Dist = runner2Data.distance || race.distance;
        runner2Pace = calculatePace(runner2Data.status === 'completed' ? runner2Data.time : runner2Data.goalTime, runner2Dist);
    }

    let raceDistDisplay = '';
    if (race.distance) {
        raceDistDisplay = `${race.distance}km`;
    } else if (runner1Dist && runner2Data && runner2Dist && runner1Dist !== runner2Dist) { // Verifica se runner2Data existe
        raceDistDisplay = `${runner1Dist || '?'}k / ${runner2Dist || '?'}k`;
    } else {
        raceDistDisplay = `${runner1Dist || (runner2Data ? runner2Dist : '') || '?'}km`;
    }

    const canEdit = authUser && authUser.uid === currentViewingUid;

    card.innerHTML = `
        <div class="race-card-header">
            <h3>${race.raceName}</h3>
            <span class="date">${new Date(race.date).toLocaleDateString('pt-BR', {timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric'})}</span>
        </div>
        <div class="race-card-body">
            ${createRunnerInfoHTML(RUNNER_1_PROFILE, runner1Data, runner1Dist, runner1Pace, 'runner1')}
            ${(runner2Data && RUNNER_2_PROFILE.name !== 'Corredora 2') ? createRunnerInfoHTML(RUNNER_2_PROFILE, runner2Data, runner2Dist, runner2Pace, 'runner2') : ''}
        </div>
        <div class="race-card-footer">
            <div>
                <span class="juntos-icon">${race.juntos ? '👩🏻‍❤️‍👨🏻' : ''}</span>
                <span class="race-notes">${race.notes || ''}</span>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="race-distance">${raceDistDisplay}</span>
                <div class="race-controls ${canEdit ? '' : 'hidden'}">
                    <button class="btn-control btn-edit" title="Editar">✏️</button>
                    <button class="btn-control btn-delete" title="Excluir">🗑️</button>
                </div>
            </div>
        </div>`;
    
    if(canEdit) {
        card.querySelector('.btn-edit').addEventListener('click', () => openModal(race.id));
        card.querySelector('.btn-delete').addEventListener('click', () => deleteRace(race.id));
    }

    return card;
}

function createRunnerInfoHTML(config, runnerData, distance, pace, cssClass) {
    let timeHTML = '', paceHTML = '';
     // Se não houver dados de status (ex: runner 2 opcional e não preenchido), não renderiza nada
    if(!runnerData || !runnerData.status) return '';

    switch (runnerData.status) {
        case 'completed':
            timeHTML = `<div class="runner-time">${secondsToTime(timeToSeconds(runnerData.time))}</div>`;
            if (pace !== 'N/A') paceHTML = `<div class="runner-pace">${pace}</div>`;
            break;
        case 'planned':
            const goalTime = runnerData.goalTime || (runnerData.time && runnerData.time.includes(':') ? runnerData.time : null);
            timeHTML = `<div class="runner-time goal">⏳ ${goalTime ? secondsToTime(timeToSeconds(goalTime)) : 'Planejada'}</div>`;
            if (pace !== 'N/A') paceHTML = `<div class="runner-pace goal">(Meta: ${pace})</div>`;
            break;
        case 'skipped':
            timeHTML = `<div class="runner-time skipped">❌ Não correu</div>`;
            break;
        default: timeHTML = `<div class="runner-time skipped">N/A</div>`;
    }

    if (runnerData.status === 'skipped') {
        return `<div class="runner-info"><span class="runner-name ${cssClass}">${config.name} ${config.emoji}</span><div class="runner-details">${timeHTML}</div></div>`;
    }
    return `<div class="runner-info"><span class="runner-name ${cssClass}">${config.name} ${config.emoji}</span><div class="runner-details">${timeHTML}${paceHTML}</div></div>`;
}

// --- Funções do Modal e CRUD (V1) ---

function openModal(raceId = null) {
    dom.form.reset();
    document.getElementById('race-id').value = '';
    dom.btnDelete.classList.add('hidden');
    
    // Re-executa a lógica de exibição do Runner 2
    updateProfileUI(); 

    if (raceId) {
        dom.modalTitle.textContent = 'Editar Corrida Pessoal';
        dom.btnDelete.classList.remove('hidden');
        const race = db.races[raceId]; // Acessa o objeto
        if (!race) return;

        document.getElementById('race-id').value = raceId; // Usa o ID (chave do objeto)
        document.getElementById('raceName').value = race.raceName;
        document.getElementById('raceDate').value = race.date;
        document.getElementById('raceDistance').value = race.distance;
        document.getElementById('raceJuntos').checked = race.juntos;
        document.getElementById('raceNotes').value = race.notes || '';

        const runner1Data = race[RUNNER_1_KEY];
        const runner2Data = race[RUNNER_2_KEY];

        if(runner1Data){
            document.getElementById('runner1Status').value = runner1Data.status || 'skipped';
            const runner1Time = runner1Data.status === 'completed' ? runner1Data.time : (runner1Data.goalTime || runner1Data.time || '');
            document.getElementById('runner1Time').value = normalizeTime(runner1Time) ? secondsToTime(timeToSeconds(runner1Time)) : '';
            document.getElementById('runner1Distance').value = runner1Data.distance || '';
        }
        
        if(runner2Data){
            document.getElementById('runner2Status').value = runner2Data.status || 'skipped';
            const runner2Time = runner2Data.status === 'completed' ? runner2Data.time : (runner2Data.goalTime || runner2Data.time || '');
            document.getElementById('runner2Time').value = normalizeTime(runner2Time) ? secondsToTime(timeToSeconds(runner2Time)) : '';
            document.getElementById('runner2Distance').value = runner2Data.distance || '';
        }

    } else {
        dom.modalTitle.textContent = 'Adicionar Nova Corrida Pessoal';
        document.getElementById('raceDate').value = new Date().toISOString().split('T')[0];
    }
    dom.modal.showModal();
}

function closeModal() { dom.modal.close(); }

function handleFormSubmit(e) {
    e.preventDefault();
    if (!currentViewingUid || !authUser || currentViewingUid !== authUser.uid) {
        alert("Erro: Você deve estar logado para salvar.");
        return;
    }

    const id = document.getElementById('race-id').value;
    const date = document.getElementById('raceDate').value;
    
    const runner1TimeRaw = document.getElementById('runner1Time').value;
    const runner2TimeRaw = document.getElementById('runner2Time').value;
    const runner1Status = document.getElementById('runner1Status').value;
    const runner2Status = document.getElementById('runner2Status').value;
    
    const raceData = {
        date: date,
        year: new Date(date + 'T00:00:00').getFullYear().toString(),
        raceName: document.getElementById('raceName').value,
        distance: parseFloat(document.getElementById('raceDistance').value) || null,
        juntos: document.getElementById('raceJuntos').checked,
        notes: document.getElementById('raceNotes').value || null,
        [RUNNER_1_KEY]: {
            status: runner1Status,
            time: runner1Status === 'completed' ? normalizeTime(runner1TimeRaw) : null,
            goalTime: runner1Status === 'planned' ? normalizeTime(runner1TimeRaw) : null,
            distance: parseFloat(document.getElementById('runner1Distance').value) || null
        },
        [RUNNER_2_KEY]: {
            status: runner2Status,
            time: runner2Status === 'completed' ? normalizeTime(runner2TimeRaw) : null,
            goalTime: runner2Status === 'planned' ? normalizeTime(runner2TimeRaw) : null,
            distance: parseFloat(document.getElementById('runner2Distance').value) || null
        }
    };
    
    const dbPath = `/users/${currentViewingUid}/races/`;

    if (id) {
        // Atualiza (set)
        firebase.database().ref(dbPath).child(id).set(raceData)
            .then(closeModal)
            .catch(err => {
                console.error("Erro ao atualizar:", err);
                alert("Erro ao salvar: " + err.message);
            });
    } else {
        // Cria (push)
        const newRaceRef = firebase.database().ref(dbPath).push();
        newRaceRef.set(raceData)
            .then(closeModal)
            .catch(err => {
                 console.error("Erro ao criar:", err);
                 alert("Erro ao salvar: " + err.message);
            });
    }
}

function deleteRace(raceId) {
    if (!currentViewingUid || !authUser || currentViewingUid !== authUser.uid) {
        alert("Erro: Você deve estar logado para excluir.");
        return;
    }
    
    const race = db.races[raceId]; // Acessa o objeto
    if (!confirm(`Tem certeza que deseja excluir esta corrida?\n\n${race.raceName} (${race.date})`)) return;

    firebase.database().ref(`/users/${currentViewingUid}/races/`).child(raceId).remove()
        .then(closeModal) // Fecha o modal após a exclusão
        .catch(err => {
            console.error("Erro ao excluir:", err);
            alert("Erro ao excluir: " + err.message);
        });
}

function renderAllV1Profile() {
    updateProfileUI(); 
    renderDashboard();
    renderHistory();
}

// --- Funções de Carregamento de Dados (V1) ---

function loadProfile(uid) {
    const profileRef = firebase.database().ref(`/users/${uid}/profile`);
    profileRef.once('value', (snapshot) => {
        const profileData = snapshot.val();
        if (profileData) {
            db.profile = profileData;
            renderAllV1Profile(); 
        }
    });
}

function loadRaces(uid) {
    currentViewingUid = uid; 
    const racesRef = firebase.database().ref(`/users/${uid}/races`);
    
    db.races = {};
    // Limpa o dashboard antes de carregar novos dados
    dom.prGrid.innerHTML = '<div class="loader">Carregando PRs...</div>';
    dom.summaryGrid.innerHTML = '<div class="loader">Calculando...</div>';
    dom.historyContainer.innerHTML = '<div class="loader">Carregando histórico...</div>';
    
    racesRef.on('value', (snapshot) => {
        db.races = snapshot.val() || {};
        renderAllV1Profile();
    });
}

function loadPublicView() {
    dom.headerSubtitle.textContent = "Selecione um currículo ou faça login";
    
    const publicProfilesRef = firebase.database().ref('/publicProfiles');
    publicProfilesRef.on('value', (snapshot) => {
        const profiles = snapshot.val();
        dom.publicProfileList.innerHTML = '';
        if(profiles) {
            Object.entries(profiles).forEach(([uid, profile]) => {
                const card = document.createElement('div');
                card.className = 'profile-card';
                card.innerHTML = `
                    <h3>${profile.runner1Name || 'Corredor 1'}</h3>
                    <h3 class="runner2-name">${profile.runner2Name || ''}</h3>
                    <p>${profile.teamName || 'Equipe'}</p>
                `;
                card.addEventListener('click', () => {
                    dom.loginOrPublicView.classList.add('hidden');
                    dom.userContent.classList.remove('hidden');
                    dom.btnBackToPublic.classList.remove('hidden'); 
                    loadProfile(uid); 
                    loadRaces(uid);
                });
                dom.publicProfileList.appendChild(card);
            });
        } else {
            dom.publicProfileList.innerHTML = '<div class="loader">Nenhum perfil público encontrado.</div>';
        }
    });
}

// --- Funções de Lógica de UI (V1 - Roteador) ---

function showLoggedOutView() {
    authUser = null;
    isAdmin = false;
    currentViewingUid = null;
    
    dom.btnLogout.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden'); 
    dom.userInfo.classList.add('hidden');
    dom.controlsSection.classList.add('hidden');
    // dom.adminPanel.classList.add('hidden'); // Oculto por padrão no HTML
    dom.pendingApprovalView.classList.add('hidden');
    dom.rejectedView.classList.add('hidden'); 
    
    dom.loginOrPublicView.classList.remove('hidden');
    dom.publicView.classList.remove('hidden'); 
    dom.userContent.classList.add('hidden'); 
    dom.loginError.textContent = '';
    dom.loginForm.reset();
    toggleLoginMode(false); 
    
    db = { races: {}, profile: {} };
    loadPublicView(); // Carrega perfis V1
    fetchAllData(); // Carrega calendário V2
}

function showPendingView() {
    dom.btnLogout.classList.remove('hidden'); 
    dom.userInfo.classList.remove('hidden');
    dom.userEmail.textContent = authUser.email;
    
    dom.loginOrPublicView.classList.add('hidden');
    dom.userContent.classList.add('hidden');
    // dom.adminPanel.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden');
    dom.rejectedView.classList.add('hidden');
    
    dom.pendingApprovalView.classList.remove('hidden'); 
}

function showRejectedView(email) {
    dom.btnLogout.classList.remove('hidden'); 
    dom.userInfo.classList.remove('hidden');
    dom.userEmail.textContent = email;
    
    dom.loginOrPublicView.classList.add('hidden');
    dom.userContent.classList.add('hidden');
    // dom.adminPanel.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden');
    dom.pendingApprovalView.classList.add('hidden');
    
    dom.rejectedEmail.textContent = email;
    dom.rejectedView.classList.remove('hidden'); 
}

function showUserDashboard(user) {
    dom.btnLogout.classList.remove('hidden');
    dom.userInfo.classList.remove('hidden');
    dom.userEmail.textContent = user.email;
    dom.controlsSection.classList.remove('hidden'); 
    
    dom.loginOrPublicView.classList.add('hidden');
    dom.pendingApprovalView.classList.add('hidden');
    dom.rejectedView.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden'); 
    
    dom.userContent.classList.remove('hidden');

    loadProfile(user.uid); // Carrega perfil V1
    loadRaces(user.uid); // Carrega corridas pessoais V1
    fetchAllData(); // Carrega calendário V2
    
    if (isAdmin) {
        dom.userInfo.classList.add('admin-user');
        // Inicializa o painel de admin (V1+V2)
        // A função initializeAdminPanel está no admin-logic.js
        initializeAdminPanel(user.uid, database);
    } else {
         dom.userInfo.classList.remove('admin-user');
         // dom.adminPanel.classList.add('hidden'); // Oculto por padrão no HTML
    }
}


// --- Funções de Autenticação (V1) ---

function showLoginError(message) {
     dom.loginError.textContent = message;
}

function toggleLoginMode(isSigningUp) {
    if (isSigningUp) {
        dom.loginTitle.textContent = "Cadastrar Novo Usuário";
        dom.signupFields.classList.remove('hidden');
        dom.btnLoginSubmit.classList.add('hidden');
        dom.btnSignUpSubmit.classList.remove('hidden');
        dom.loginToggleLink.textContent = "Já tem conta? Entrar";
    } else {
        dom.loginTitle.textContent = "Acessar Meu Currículo";
        dom.signupFields.classList.add('hidden');
        dom.btnLoginSubmit.classList.remove('hidden');
        dom.btnSignUpSubmit.classList.add('hidden');
        dom.loginToggleLink.textContent = "Não tem conta? Cadastre-se";
    }
    dom.loginError.textContent = '';
}

function handleSignUp(e) {
    e.preventDefault();
    const email = dom.loginEmail.value;
    const password = dom.loginPassword.value;
    const runner1Name = dom.signupRunner1Name.value;
    
    dom.loginError.textContent = ''; 
    
    if (password.length < 6) {
        showLoginError("A senha deve ter pelo menos 6 caracteres.");
        return;
    }
    if (!runner1Name) {
        showLoginError("O 'Seu nome' (Corredor 1) é obrigatório.");
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            const pendingRef = firebase.database().ref('/pendingApprovals/' + user.uid);
            pendingRef.set({
                email: user.email,
                requestDate: new Date().toISOString(),
                runner1Name: runner1Name,
                runner2Name: dom.signupRunner2Name.value || "",
                teamName: dom.signupTeamName.value || ""
            });
            
            console.log("Novo usuário cadastrado e aguardando aprovação:", user.uid);
            dom.loginForm.reset();
            toggleLoginMode(false); 
            showLoginError("Cadastro realizado! Aguardando aprovação do admin."); 
        })
        .catch(err => {
            console.error("Erro no cadastro:", err.code, err.message);
            if (err.code === 'auth/email-already-in-use') {
                showLoginError("Este e-mail já está em uso. Tente fazer login.");
            } else {
                showLoginError("Erro ao cadastrar: " + err.message);
            }
        });
}

function handleSignIn(e) {
    e.preventDefault();
    const email = dom.loginEmail.value;
    const password = dom.loginPassword.value;
    dom.loginError.textContent = ''; 

    auth.signInWithEmailAndPassword(email, password)
        .catch(err => {
            console.error("Erro no login:", err.code, err.message);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                 showLoginError("E-mail ou senha incorretos.");
            } else {
                 showLoginError("Erro ao entrar: " + err.message);
            }
        });
}

function signOut() {
    // Desliga listeners de tempo real V1
    firebase.database().ref('/pendingApprovals').off();
    firebase.database().ref('/publicProfiles').off();
    if(currentViewingUid) {
        firebase.database().ref(`/users/${currentViewingUid}/profile`).off();
        firebase.database().ref(`/users/${currentViewingUid}/races`).off();
    }
    // Desliga listener de tempo real V2
    firebase.database().ref('corridas').off();
    firebase.database().ref('resultadosEtapas').off();


    auth.signOut().catch(err => console.error("Erro no logout:", err));
}


// ======================================================
// SEÇÃO V2: LÓGICA DO CALENDÁRIO PÚBLICO
// ======================================================

function fetchAllData() {
    const db = firebase.database();

    // ---- INÍCIO DA CORREÇÃO ----
    // Em vez de ler a raiz inteira, lemos os nós específicos que precisamos.
    // Isso respeita as regras de segurança que definimos.

    // Listener 1: Para as corridas
    db.ref('corridas').on('value', snapshot => {
        appState.allCorridas = snapshot.val() || { copaAlcer: {}, geral: {} };
        console.log("Calendário V2 (Corridas) carregado:", appState.allCorridas);
        renderContentV2(); // Re-renderiza quando as corridas mudam
    }, error => {
        console.error("Falha ao carregar o nó /corridas:", error);
    });

    // Listener 2: Para os resultados das etapas
    db.ref('resultadosEtapas').on('value', snapshot => {
        appState.resultadosEtapas = snapshot.val() || {};
        console.log("Calendário V2 (Resultados) carregado:", appState.resultadosEtapas);
        renderContentV2(); // Re-renderiza quando os resultados mudam
    }, error => {
        console.error("Falha ao carregar o nó /resultadosEtapas:", error);
    });

    // O ranking pode ser carregado uma única vez, pois não é tão dinâmico
    db.ref('rankingCopaAlcer').once('value', snapshot => {
        appState.rankingData = snapshot.val() || {};
        console.log("Calendário V2 (Ranking) carregado:", appState.rankingData);
    });
    // ---- FIM DA CORREÇÃO ----
}


function renderContentV2() {
    const todasCorridasCopa = Object.values(appState.allCorridas.copaAlcer || {});
    const todasCorridasGerais = Object.values(appState.allCorridas.geral || {});
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const corridasAgendadasCopa = todasCorridasCopa.filter(c => new Date(c.data) >= hoje);
    const corridasRealizadas = todasCorridasCopa.filter(c => new Date(c.data) < hoje);
    
    // Renderiza para o container PÚBLICO
    renderCalendar(corridasAgendadasCopa, dom.copaContainerPublic, 'inscrições');
    renderCalendar(todasCorridasGerais, dom.geralContainerPublic, 'inscrições');
    renderCalendar(corridasRealizadas, dom.resultadosContainerPublic, 'resultados');
    
    // Renderiza para o container LOGADO (duplicado)
    renderCalendar(corridasAgendadasCopa, dom.copaContainerLogged, 'inscrições');
    renderCalendar(todasCorridasGerais, dom.geralContainerLogged, 'inscrições');
    renderCalendar(corridasRealizadas, dom.resultadosContainerLogged, 'resultados');
}

function renderCalendar(corridas, container, buttonType) {
    if (!container) return;
    if (!corridas || corridas.length === 0) {
        container.innerHTML = `<p class="loader" style="font-size: 0.9em; color: #999;">Nenhuma corrida nesta categoria.</p>`;
        return;
    }
    
    const sortedCorridas = corridas.sort((a, b) => new Date(a.data) - new Date(b.data));
    container.innerHTML = sortedCorridas.map(corrida => {
        const dataObj = new Date(`${corrida.data}T12:00:00Z`);
        const dia = String(dataObj.getDate()).padStart(2, '0');
        const mes = dataObj.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
        
        let actionButtonHTML = '';
        if (buttonType === 'inscrições') {
            actionButtonHTML = corrida.linkInscricao ?
                `<a href="${corrida.linkInscricao}" target="_blank" rel="noopener noreferrer" class="v2-inscricoes-button"><i class='bx bx-link-external' style="margin-right: 5px;"></i>Inscrições</a>` :
                `<div class="v2-race-button-disabled">Inscrições Encerradas</div>`;
        } else { 
            // O ID da corrida está salvo no objeto corrida (V2 admin.js)
            actionButtonHTML = appState.resultadosEtapas[corrida.id] ?
                `<button class="v2-results-button" data-race-id="${corrida.id}"><i class='bx bx-table' style="margin-right: 5px;"></i>Ver Resultados</button>` :
                `<div class="v2-race-button-disabled">Resultados em Breve</div>`;
        }

        return `
            <div class="v2-race-card">
                <div class="v2-race-date">
                    <span class="v2-race-date-day">${dia}</span>
                    <span class="v2-race-date-month">${mes}</span>
                </div>
                <div class="v2-race-info">
                    <div>
                        <h3 class="font-bold text-lg text-white">${corrida.nome}</h3>
                        <p class="text-sm text-gray-400"><i class='bx bxs-map' style="margin-right: 5px;"></i>${corrida.cidade}</p>
                    </div>
                    <div class="v2-race-buttons">
                        ${actionButtonHTML}
                    </div>
                </div>
            </div>`;
    }).join('');

    // Adiciona listeners aos botões de resultado recém-criados
    container.querySelectorAll('.v2-results-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const raceId = e.currentTarget.dataset.raceId;
            showRaceResultsModal(raceId);
        });
    });
}

function showRaceResultsModal(raceId) {
    const race = appState.allCorridas.copaAlcer?.[raceId] || appState.allCorridas.geral?.[raceId];
    const results = appState.resultadosEtapas[raceId];

    if (!race || !results) {
        console.error("Dados da corrida ou resultados não encontrados para o ID:", raceId);
        return;
    }

    dom.modalTitleResults.textContent = `Resultados - ${race.nome}`;
    
    let contentHTML = '';
    for (const percurso in results) {
        for (const genero in results[percurso]) {
            const atletas = results[percurso][genero];
            if (atletas && atletas.length > 0) {
                contentHTML += `<h3 class="v2-modal-category-title">${percurso} - ${genero.charAt(0).toUpperCase() + genero.slice(1)}</h3>`;
                contentHTML += `
                    <div style="overflow-x: auto;">
                        <table class="v2-results-table">
                            <thead><tr><th>#</th><th>Atleta</th><th>Equipe</th><th>Tempo</th></tr></thead>
                            <tbody>
                                ${atletas.map(atleta => `
                                    <tr>
                                        <td class="font-medium">${atleta.classificacao}</td>
                                        <td>${atleta.nome}</td>
                                        <td style="color: #b0b0b0;">${atleta.assessoria || 'Individual'}</td>
                                        <td style="font-family: monospace;">${atleta.tempo}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`;
            }
        }
    }
    dom.modalContentResults.innerHTML = contentHTML;
    dom.modalSearchInput.value = '';
    // O listener de 'onkeyup' é adicionado em DOMContentLoaded
    dom.modalOverlay.classList.remove('hidden');
}

function filterResultsInModal() {
    const searchTerm = dom.modalSearchInput.value.toUpperCase();
    dom.modalContentResults.querySelectorAll('.v2-results-table tbody tr').forEach(row => {
        // Célula 1 é o Nome do Atleta
        const athleteName = row.cells[1].textContent.toUpperCase();
        row.style.display = athleteName.includes(searchTerm) ? '' : 'none';
    });
}

function closeResultsModal() {
    dom.modalOverlay.classList.add('hidden');
}


// ======================================================
// PONTO DE ENTRADA PRINCIPAL (DOM LOADED)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
    // VERIFICAÇÃO CRÍTICA
    if (typeof FIREBASE_CONFIG === 'undefined') {
        alert("ERRO DE CONFIGURAÇÃO: O objeto FIREBASE_CONFIG não foi carregado. Verifique o 'js/config.js'.");
        document.body.innerHTML = '<h1 style="color:red; text-align:center; padding: 50px;">ERRO: O Firebase não foi configurado corretamente.</h1>';
        return;
    }

    // Inicializa o Firebase
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    database = firebase.database();
    auth = firebase.auth();

    // Listeners do Modal V1 (Corrida Pessoal)
    dom.btnAddnew.addEventListener('click', () => openModal());
    dom.btnCloseModal.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    dom.btnCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    dom.form.addEventListener('submit', handleFormSubmit);
    dom.btnDelete.addEventListener('click', () => {
        const id = document.getElementById('race-id').value;
        if(id) deleteRace(id);
    });
    
    // Listeners de Autenticação V1
    dom.btnLoginSubmit.addEventListener('click', handleSignIn);
    dom.btnSignUpSubmit.addEventListener('click', handleSignUp);
    dom.btnLogout.addEventListener('click', signOut);
    dom.btnBackToPublic.addEventListener('click', showLoggedOutView);
    dom.loginToggleLink.addEventListener('click', () => {
        const isSigningUp = dom.signupFields.classList.contains('hidden');
        toggleLoginMode(isSigningUp);
    });
    
    toggleLoginMode(false); // Define o estado inicial do formulário de login

    // Listeners do Modal V2 (Resultados Públicos)
    dom.modalSearchInput.addEventListener('keyup', filterResultsInModal);
    dom.btnCloseResultsModal.addEventListener('click', closeResultsModal);
    dom.modalOverlay.addEventListener('click', (e) => {
        if (e.target === dom.modalOverlay) {
            closeResultsModal();
        }
    });

    // Gerenciador Central de Estado de Autenticação (ROTEADOR V3)
    auth.onAuthStateChanged((user) => {
        if (user) {
            // --- USUÁRIO LOGADO ---
            authUser = user;
            // UID do Admin V1 (thIAguinho Soluções)
            isAdmin = user.uid === '29d30W4RS1WzK4SWZRZ5pEFnOdm1'; 
            
            // ROTEAMENTO DE 3 ETAPAS
            // 1. O usuário está aprovado (existe em /users)?
            firebase.database().ref('/users/' + user.uid).once('value', (userSnapshot) => {
                if (userSnapshot.exists() || isAdmin) {
                    showUserDashboard(user);
                } else {
                    // 2. Ele está na lista de pendentes?
                    firebase.database().ref('/pendingApprovals/' + user.uid).once('value', (pendingSnapshot) => {
                        if (pendingSnapshot.exists()) {
                            showPendingView(); 
                        } else {
                            // 3. Ele foi RECUSADO ou EXCLUÍDO.
                            showRejectedView(user.email);
                        }
                    }, (error) => {
                        if(error.code === "PERMISSION_DENIED") {
                            console.error("ERRO DE REGRAS: O usuário não-admin não tem permissão para ler /pendingApprovals.");
                            showLoggedOutView(); 
                            alert("Erro de configuração do banco de dados. Contate o administrador.");
                            auth.signOut();
                        }
                    });
                }
            });

        } else {
            // --- USUÁRIO ANÔNIMO (LOGGED OUT) ---
            showLoggedOutView();
        }
    });
});

