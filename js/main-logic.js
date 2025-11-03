// =================================================================
// ARQUIVO DE LÓGICA PRINCIPAL (V9.2 - Estrutura BD Separada + Layout + Add Corrida Pública + Correções)
// ATUALIZADO (V9.3) COM TAREFAS 2 (Excluir Mídia) e 3 (Ver Classificação)
// CORREÇÃO (V9.4) DO ERRO 'sort' of undefined em openMediaUploadModal
// =================================================================

// --- Variáveis Globais do App ---
let db = {
    races: {}, // Dados das corridas do usuário visualizado
    profile: {} // Dados do perfil do usuário visualizado
};
// Estado da Aplicação V2 (para calendário público)
let appState = {
    rankingData: {},
    resultadosEtapas: {},
    allCorridas: {} // Corridas dos calendários públicos (copaAlcer, geral)
};
// Estado da Aplicação V9.2 (Listeners separados para Likes e Comentários)
let currentRaceLikesListeners = {}; // Armazena listeners de LIKES ativos
let currentRaceCommentsListeners = {}; // Armazena listeners de COMMENTS ativos
let currentProfileCommentsListener = null; // Armazena listener de comentários de perfil ativo
let lightboxState = { // V8 - Estado do Lightbox
    images: [],
    currentIndex: 0,
    isOpen: false
};


let firebaseApp, database, auth, functions;
let authUser = null; // Usuário autenticado (ou null)
let currentViewingUid = null; // UID do perfil sendo visualizado atualmente
let isAdmin = false;
let hasRunner2 = false; // Flag para perfil com 2 corredores

// V4/V5 - Constantes de Configuração (serão preenchidas no DOMContentLoaded)
let CLOUDINARY_URL = "";
let CLOUDINARY_PRESET = "";

const RUNNER_1_KEY = "runner1";
const RUNNER_2_KEY = "runner2";

// Perfis padrão, serão sobrescritos pelos dados do Firebase
let RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
let RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };

// --- Cache de Elementos DOM (Completo V9.1) ---
const dom = {
    // V1 (Perfis & Auth)
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
    publicProfileListLogged: document.getElementById('public-profile-list-logged'),
    userContent: document.getElementById('user-content'),
    headerSubtitle: document.getElementById('header-subtitle'), // Nomes
    prGrid: document.getElementById('pr-grid'),
    summaryGrid: document.getElementById('summary-grid'),
    controlsSection: document.getElementById('controls-section'),
    btnAddnew: document.getElementById('btn-add-new'),
    historyContainer: document.getElementById('history-container'), // ID do container HTML
    pendingApprovalView: document.getElementById('pending-approval-view'),
    rejectedView: document.getElementById('rejected-view'),
    rejectedEmail: document.getElementById('rejected-email'),

    // V1 (Modal Corrida)
    modal: document.getElementById('race-modal'),
    form: document.getElementById('race-form'),
    modalTitle: document.getElementById('modal-title'),
    btnDelete: document.getElementById('btn-delete'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancel: document.getElementById('btn-cancel'),
    runner1FormGroup: document.getElementById('runner1-form-group'),
    runner2FormGroup: document.getElementById('runner2-form-group'),

    // V2 (Calendário Público)
    copaContainerPublic: document.getElementById('copa-container-public'),
    geralContainerPublic: document.getElementById('geral-container-public'),
    resultadosContainerPublic: document.getElementById('resultados-container-public'),
    copaContainerLogged: document.getElementById('copa-container-logged'),
    geralContainerLogged: document.getElementById('geral-container-logged'),
    resultadosContainerLogged: document.getElementById('resultados-container-logged'),

    // V2 (Modal Resultados)
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitleResults: document.getElementById('modal-title-results'),
    modalContentResults: document.getElementById('modal-content-results'),
    modalSearchInput: document.getElementById('modal-search-input'),
    btnCloseResultsModal: document.getElementById('btn-close-results-modal'),

    // V4 + V8 (Modal Mídia)
    mediaModal: document.getElementById('media-modal'),
    mediaForm: document.getElementById('media-form'),
    mediaRaceIdInput: document.getElementById('media-race-id'),
    mediaModalTitle: document.getElementById('media-modal-title'),
    btnCloseMediaModal: document.getElementById('btn-close-media-modal'),
    btnCancelMediaUpload: document.getElementById('btn-cancel-media-upload'),
    btnConfirmMediaUpload: document.getElementById('btn-confirm-media-upload'),
    mediaFileInput: document.getElementById('media-file-input'),
    mediaPreviewContainer: document.getElementById('media-preview-container'), // Agora é o grid V8
    mediaUploadStatus: document.getElementById('media-upload-status'),

    // V5 (Header Detalhado)
    headerProfilePicture: document.getElementById('header-profile-picture'),
    headerLocation: document.getElementById('header-location'),
    headerBio: document.getElementById('header-bio'),
    btnEditProfile: document.getElementById('btn-edit-profile'),

    // V5 (Modal Edição Perfil)
    profileEditModal: document.getElementById('profile-edit-modal'),
    profileEditForm: document.getElementById('profile-edit-form'),
    btnCloseProfileEditModal: document.getElementById('btn-close-profile-edit-modal'),
    btnCancelProfileEdit: document.getElementById('btn-cancel-profile-edit'),
    btnSaveProfileEdit: document.getElementById('btn-save-profile-edit'),
    profileEditRunner1Name: document.getElementById('profile-edit-runner1-name'),
    profileEditRunner2Name: document.getElementById('profile-edit-runner2-name'),
    profileEditRunner2NameSeparator: document.getElementById('profile-edit-runner2-name-separator'),
    profileEditTeam: document.getElementById('profile-edit-team'),
    profileEditBio: document.getElementById('profile-edit-bio'),
    profileEditLocation: document.getElementById('profile-edit-location'),
    profileEditBirthdate: document.getElementById('profile-edit-birthdate'),
    profileEditPictureInput: document.getElementById('profile-edit-picture-input'),
    profileEditPicturePreviewContainer: document.getElementById('profile-edit-picture-preview-container'),
    profileEditPicturePreview: document.getElementById('profile-edit-picture-preview'),
    profilePictureUploadStatus: document.getElementById('profile-picture-upload-status'),

    // V7/8 (Modal Likers)
    likersModal: document.getElementById('likers-modal'),
    likersModalTitle: document.getElementById('likers-modal-title'),
    btnCloseLikersModal: document.getElementById('btn-close-likers-modal'),
    btnCancelLikersModal: document.getElementById('btn-cancel-likers-modal'),
    likersModalList: document.getElementById('likers-modal-list'),

    // V7/8 (Comentários de Perfil)
    profileCommentsSection: document.getElementById('profile-comments-section'),
    profileCommentsList: document.getElementById('profile-comments-list'),
    profileCommentForm: document.getElementById('profile-comment-form'),
    profileCommentInput: document.getElementById('profile-comment-input'),

    // V8 (Lightbox)
    lightboxOverlay: document.getElementById('lightbox-overlay'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),
    lightboxCaption: document.getElementById('lightbox-caption'),

    // V9.1 (Layout Recolhível)
    toggleHistoryBtn: document.getElementById('toggle-history-btn'),
    historyContent: document.getElementById('history-container') // Cache para o conteúdo recolhível
};

// ======================================================
// SEÇÃO V1: LÓGICA DE PERFIS DE USUÁRIO (ATUALIZADA V5)
// ======================================================

// --- Funções Utilitárias ---
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

// V7/8 - Função utilitária para formatar timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // Formato mais curto: DD/MM HH:MM
    const optionsDate = { day: '2-digit', month: '2-digit' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false };
    return `${date.toLocaleDateString('pt-BR', optionsDate)} ${date.toLocaleTimeString('pt-BR', optionsTime)}`;
}


// --- Funções de Lógica da Aplicação (V1 + V5 + V7/8) ---

// Atualiza a UI com base nos dados do perfil carregado (db.profile)
function updateProfileUI() {
    const profile = db.profile;
    hasRunner2 = false;

    // Define perfis padrão
    RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
    RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };

    const defaultProfilePic = 'icons/icon-192x192.png';

    if (profile) {
        if (profile.runner1Name) {
            RUNNER_1_PROFILE = { name: profile.runner1Name, nameShort: profile.runner1Name.split(' ')[0] || "Corredor", emoji: '🏃‍♂️' };
        }
        if (profile.runner2Name && profile.runner2Name.trim() !== "") {
            hasRunner2 = true;
            RUNNER_2_PROFILE = { name: profile.runner2Name, nameShort: profile.runner2Name.split(' ')[0] || "Corredora", emoji: '🏃‍♀️' };
            dom.runner2FormGroup.classList.remove('hidden');
        } else {
            dom.runner2FormGroup.classList.add('hidden');
        }

        // V5 - Atualiza Header com Novos Dados
        dom.headerProfilePicture.src = profile.profilePictureUrl || defaultProfilePic;
        dom.headerLocation.textContent = profile.location || '';
        dom.headerBio.textContent = profile.bio || '';
        dom.headerLocation.classList.toggle('hidden', !profile.location);
        dom.headerBio.classList.toggle('hidden', !profile.bio);

    } else {
        // Caso não haja perfil (raro, mas defensivo)
        dom.runner2FormGroup.classList.add('hidden');
        dom.headerProfilePicture.src = defaultProfilePic;
        dom.headerLocation.textContent = '';
        dom.headerBio.textContent = '';
        dom.headerLocation.classList.add('hidden');
        dom.headerBio.classList.add('hidden');
    }

    // Atualiza nomes no header e nos formulários
    let headerTitle = RUNNER_1_PROFILE.name;
    if (hasRunner2) {
        headerTitle += ` & ${RUNNER_2_PROFILE.name}`;
    }
    dom.headerSubtitle.textContent = headerTitle; // Nomes principais

    dom.runner1FormGroup.querySelector('h4').innerHTML = `${RUNNER_1_PROFILE.name} ${RUNNER_1_PROFILE.emoji}`;
    dom.runner2FormGroup.querySelector('h4').innerHTML = `${RUNNER_2_PROFILE.name} ${RUNNER_2_PROFILE.emoji}`;

    // V5 - Mostra/Esconde botão Editar Perfil
    const canEditProfile = authUser && authUser.uid === currentViewingUid;
    dom.btnEditProfile.classList.toggle('hidden', !canEditProfile);

    // V7/8 - Mostra/Esconde seção de comentários do perfil e formulário
    dom.profileCommentsSection.classList.remove('hidden'); // Sempre mostra a seção
    dom.profileCommentForm.classList.toggle('hidden', !authUser); // Esconde form se deslogado
    // Carrega/Atualiza comentários do perfil
    loadProfileComments(currentViewingUid);
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

    dom.prGrid.innerHTML = distances.map(d => {
        const runner2PR_HTML = hasRunner2
            ? `<div class="runner-pr"><strong class="runner-pr-thamis">${RUNNER_2_PROFILE.nameShort}: ${prs.runner2[d].time}</strong></div>`
            : '';

        return `
        <div class="stat-card pr-card">
            <div class="stat-label">PR ${d}km</div>
            <div class="stat-number">
                <div class="runner-pr"><span class="runner-pr-thiago">${RUNNER_1_PROFILE.nameShort}: ${prs.runner1[d].time}</span></div>
                ${runner2PR_HTML}
            </div>
        </div>`;
    }).join('');

    // CORREÇÃO: A contagem de corridas estava errada para usuários 'sozinhos'
    // Agora, contamos corridas únicas onde *pelo menos um* corredor completou.
    const totalCorridasCompletasUnicas = racesArray.filter(race =>
        (race[RUNNER_1_KEY] && race[RUNNER_1_KEY].status === 'completed') ||
        (hasRunner2 && race[RUNNER_2_KEY] && race[RUNNER_2_KEY].status === 'completed') // Só conta R2 se o perfil tiver R2
    ).length;
    const totalCorridasLabel = "Corridas Concluídas"; // Simplificado

    const juntosCardHTML = hasRunner2
        ? `<div class="stat-card"><div class="stat-number">${totalRacesJuntos} 👩🏻‍❤️‍👨🏻</div><div class="stat-label">Corridas Juntos</div></div>`
        : '';

    const totalKmCombined = totalKmRunner1 + totalKmRunner2;
    const totalKmCombinedLabel = hasRunner2 ? "Total KM (Casal)" : "Total KM";

    const splitKmCardHTML = hasRunner2
        ? `<div class="stat-card">
            <div class="stat-number">
                <span class="runner-pr-thiago">${totalKmRunner1.toFixed(1)}</span> / <strong class="runner-pr-thamis">${totalKmRunner2.toFixed(1)}</strong>
            </div>
            <div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort} / ${RUNNER_2_PROFILE.nameShort})</div>
           </div>`
        : `<div class="stat-card">
            <div class="stat-number">
                ${totalKmRunner1.toFixed(1)} km
            </div>
            <div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort})</div>
           </div>`;

    dom.summaryGrid.innerHTML = `
        <div class="stat-card"><div class="stat-number">${totalCorridasCompletasUnicas}</div><div class="stat-label">${totalCorridasLabel}</div></div>
        ${juntosCardHTML}
        <div class="stat-card"><div class="stat-number">${totalKmCombined.toFixed(1)} km</div><div class="stat-label">${totalKmCombinedLabel}</div></div>
        ${splitKmCardHTML}
    `;
}

function renderHistory() {
    dom.historyContent.innerHTML = ''; // Usa historyContent (cache DOM)
    // Desliga listeners de interações antigas
    Object.values(currentRaceLikesListeners).forEach(ref => ref.off()); // V9.2
    Object.values(currentRaceCommentsListeners).forEach(ref => ref.off()); // V9.2
    currentRaceLikesListeners = {}; // V9.2
    currentRaceCommentsListeners = {}; // V9.2

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
        dom.historyContent.innerHTML = `<div class="loader">${authUser ? 'Nenhuma corrida encontrada. Clique em "Adicionar Nova Corrida".' : 'Perfil sem corridas.'}</div>`;
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
        dom.historyContent.appendChild(yearGroup);
    }
}

// Cria o HTML para um card de corrida (ATUALIZADO V9.2)
function createRaceCard(race) {
    const card = document.createElement('div');
    const runner1Data = race[RUNNER_1_KEY];
    const runner2Data = race[RUNNER_2_KEY];

    if (!runner1Data) {
        console.warn("Dados da corrida incompletos:", race);
        return card;
    }

    let cardStatus = 'completed';
    if (runner1Data.status === 'planned' || (runner2Data && runner2Data.status === 'planned')) cardStatus = 'planned';
    if (runner1Data.status === 'skipped' && (!runner2Data || runner2Data.status === 'skipped')) cardStatus = 'skipped';

    card.className = `race-card status-${cardStatus}`;
    card.dataset.id = race.id;
    card.dataset.ownerUid = currentViewingUid; // Assume UID atual como dono para UI inicial

    const runner1Dist = runner1Data.distance || race.distance;
    const runner1Pace = calculatePace(runner1Data.status === 'completed' ? runner1Data.time : runner1Data.goalTime, runner1Dist);
    let runner2Dist = null;
    let runner2Pace = null;
    if(runner2Data) {
        runner2Dist = runner2Data.distance || race.distance;
        runner2Pace = calculatePace(runner2Data.status === 'completed' ? runner2Data.time : runner2Data.goalTime, runner2Dist);
    }
    let raceDistDisplay = race.distance ? `${race.distance}km` : (runner1Dist && runner2Data && runner2Dist && runner1Dist !== runner2Dist ? `${runner1Dist || '?'}k / ${runner2Dist || '?'}k` : `${runner1Dist || (runner2Data ? runner2Dist : '') || '?'}km`);

    const canEdit = authUser && authUser.uid === currentViewingUid;

    // --- Mídia (Fotos) - V8 Lightbox ---
    let mediaHTML = '';
    const mediaItems = race.media ? Object.values(race.media).sort((a, b) => a.uploadedAt - b.uploadedAt) : [];
    if (mediaItems.length > 0) {
        mediaHTML = `
        <div class="race-card-media">
            <h4>Mídia (${mediaItems.length})</h4>
            <div class="media-gallery">
                ${mediaItems.map((item, index) => `
                    <img src="${item.url}" alt="Foto ${index + 1}" class="media-thumbnail" data-index="${index}" data-race-id="${race.id}">
                `).join('')}
            </div>
        </div>`;
    }

    let mediaButtonHTML = '';
    if (canEdit && cardStatus === 'completed') {
        mediaButtonHTML = `<button class="btn-control btn-add-media" data-race-id="${race.id}" title="Adicionar/Excluir Mídia">📸</button>`;
    }

    // --- Seção Social (Likes + Preview Likers) - Placeholder ---
    const socialSectionHTML = `
        <div class="race-card-social" id="social-${race.id}">
            <div class="like-section">
                <button class="like-button" data-race-id="${race.id}" data-owner-uid="${currentViewingUid}" aria-label="Curtir" disabled>
                    <i class='bx bx-loader-alt bx-spin'></i>
                </button>
                <span class="like-count" data-race-id="${race.id}" title="Ver quem curtiu">--</span>
            </div>
            <div class="likers-preview" data-race-id="${race.id}" title="Ver quem curtiu">
                </div>
        </div>`;

    // --- Seção de Comentários - Placeholder ---
    const commentsSectionHTML = `
        <div class="race-card-comments">
            <h4 class="comments-title">Comentários</h4>
            <div class="comments-list" id="comments-list-${race.id}">
                <div class="loader" style="font-size: 0.9em; padding: 10px 0;">Carregando...</div>
            </div>
            <form class="comment-form ${authUser ? '' : 'hidden'}" data-race-id="${race.id}" data-owner-uid="${currentViewingUid}">
                <textarea class="comment-input" placeholder="Adicionar um comentário..." required maxlength="1000"></textarea>
                <button type="submit" class="btn btn-primary btn-comment">Comentar</button>
            </form>
        </div>`;

    // --- Estrutura Principal ---
    card.innerHTML = `
        <div class="race-card-header">
            <h3>${race.raceName}</h3>
            <span class="date">${new Date(race.date).toLocaleDateString('pt-BR', {timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric'})}</span>
        </div>
        <div class="race-card-body">
            ${createRunnerInfoHTML(RUNNER_1_PROFILE, runner1Data, runner1Dist, runner1Pace, 'runner1')}
            ${(hasRunner2 && runner2Data) ? createRunnerInfoHTML(RUNNER_2_PROFILE, runner2Data, runner2Dist, runner2Pace, 'runner2') : ''}
        </div>
        ${mediaHTML}
        ${socialSectionHTML}
        ${commentsSectionHTML}
        <div class="race-card-footer">
            <div>
                <span class="juntos-icon">${(hasRunner2 && race.juntos) ? '👩🏻‍❤️‍👨🏻' : ''}</span>
                <span class="race-notes">${race.notes || ''}</span>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="race-distance">${raceDistDisplay}</span>
                ${mediaButtonHTML}
                <div class="race-controls ${canEdit ? '' : 'hidden'}">
                    <button class="btn-control btn-edit" title="Editar">✏️</button>
                    <button class="btn-control btn-delete" title="Excluir">🗑️</button>
                </div>
            </div>
        </div>`;

    // --- Listeners para Edição/Exclusão/Mídia ---
    if(canEdit) {
        card.querySelector('.btn-edit')?.addEventListener('click', (e) => { e.stopPropagation(); openModal(race.id); });
        card.querySelector('.btn-delete')?.addEventListener('click', (e) => { e.stopPropagation(); deleteRace(race.id); });
        const mediaBtn = card.querySelector('.btn-add-media');
        if (mediaBtn) { mediaBtn.addEventListener('click', (e) => { e.stopPropagation(); openMediaUploadModal(e.currentTarget.dataset.raceId); }); }
    }

    // --- Carrega Dados de Interação (Listeners SEPARADOS V9.2) ---
    loadAndListenRaceInteractions(race.id, card); // Mantém a chamada, mas a função interna mudou

    // --- Listener para Comentários ---
     const commentForm = card.querySelector('.comment-form');
     if (commentForm) { commentForm.addEventListener('submit', handleRaceCommentSubmit); }

     // --- Listener para Thumbnails (Lightbox V8) ---
     const thumbnails = card.querySelectorAll('.media-thumbnail');
     thumbnails.forEach(thumb => {
         thumb.addEventListener('click', (e) => {
             const raceIdClick = e.currentTarget.dataset.raceId; // Renomeado para evitar conflito
             const startIndex = parseInt(e.currentTarget.dataset.index, 10);
             const currentRaceData = db.races[raceIdClick]; // Acessa do estado global
             if (currentRaceData && currentRaceData.media) {
                 const imageUrls = Object.values(currentRaceData.media)
                                     .sort((a, b) => a.uploadedAt - b.uploadedAt)
                                     .map(item => item.url);
                 openLightbox(imageUrls, startIndex);
             }
         });
     });

    return card;
}

function createRunnerInfoHTML(config, runnerData, distance, pace, cssClass) {
    let timeHTML = '', paceHTML = '';
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

// --- Funções do Modal e CRUD (V1 - Modificada V9.1) ---
// Modificada para aceitar dados pré-preenchidos do calendário público
function openModal(raceId = null, prefillData = null) {
    dom.form.reset();
    document.getElementById('race-id').value = '';
    dom.btnDelete.classList.add('hidden');
    updateProfileUI(); // Garante que nomes/visibilidade de R2 estejam corretos

    if (raceId) { // Editando corrida existente
        dom.modalTitle.textContent = 'Editar Corrida Pessoal';
        dom.btnDelete.classList.remove('hidden');
        const race = db.races[raceId];
        if (!race) return;
        document.getElementById('race-id').value = raceId;
        document.getElementById('raceName').value = race.raceName;
        document.getElementById('raceDate').value = race.date;
        document.getElementById('raceDistance').value = race.distance || '';
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
        if(runner2Data && hasRunner2){
            document.getElementById('runner2Status').value = runner2Data.status || 'skipped';
            const runner2Time = runner2Data.status === 'completed' ? runner2Data.time : (runner2Data.goalTime || runner2Data.time || '');
            document.getElementById('runner2Time').value = normalizeTime(runner2Time) ? secondsToTime(timeToSeconds(runner2Time)) : '';
            document.getElementById('runner2Distance').value = runner2Data.distance || '';
        }
    } else if (prefillData) { // Adicionando corrida do calendário público
         dom.modalTitle.textContent = 'Adicionar Corrida ao Histórico';
         document.getElementById('raceName').value = prefillData.nome || '';
         document.getElementById('raceDate').value = prefillData.data || new Date().toISOString().split('T')[0];
         // Opcional: preencher distância se disponível na corrida pública
         // document.getElementById('raceDistance').value = prefillData.distance || '';
         // Assume como 'planejada' por padrão
         document.getElementById('runner1Status').value = 'planned';
         if(hasRunner2) document.getElementById('runner2Status').value = 'planned';
    }
     else { // Adicionando nova corrida manualmente
        dom.modalTitle.textContent = 'Adicionar Nova Corrida Pessoal';
        document.getElementById('raceDate').value = new Date().toISOString().split('T')[0];
         // Assume como 'completa' por padrão ao adicionar manualmente
        document.getElementById('runner1Status').value = 'completed';
         if(hasRunner2) document.getElementById('runner2Status').value = 'completed';
    }
    dom.modal.showModal();
}

function closeModal() { dom.modal.close(); }

// Modificada V9.2 para inicializar nós separados
function handleFormSubmit(e) {
    e.preventDefault();
    if (!currentViewingUid || !authUser || currentViewingUid !== authUser.uid) { alert("Erro: Você deve estar logado para salvar."); return; }
    const id = document.getElementById('race-id').value;
    const date = document.getElementById('raceDate').value;
    const runner1TimeRaw = document.getElementById('runner1Time').value;
    const runner2TimeRaw = document.getElementById('runner2Time').value;
    const runner1Status = document.getElementById('runner1Status').value;
    const runner2Status = document.getElementById('runner2Status').value;
    const raceData = {
        date: date, year: new Date(date + 'T00:00:00').getFullYear().toString(),
        raceName: document.getElementById('raceName').value, distance: parseFloat(document.getElementById('raceDistance').value) || null,
        juntos: document.getElementById('raceJuntos').checked, notes: document.getElementById('raceNotes').value || null,
        [RUNNER_1_KEY]: { status: runner1Status, time: runner1Status === 'completed' ? normalizeTime(runner1TimeRaw) : null, goalTime: runner1Status === 'planned' ? normalizeTime(runner1TimeRaw) : null, distance: parseFloat(document.getElementById('runner1Distance').value) || null },
        [RUNNER_2_KEY]: hasRunner2 ? { status: runner2Status, time: runner2Status === 'completed' ? normalizeTime(runner2TimeRaw) : null, goalTime: runner2Status === 'planned' ? normalizeTime(runner2TimeRaw) : null, distance: parseFloat(document.getElementById('runner2Distance').value) || null } : null
    };
    if (id && db.races[id] && db.races[id].media) { raceData.media = db.races[id].media; }
    const dbPath = `/users/${currentViewingUid}/races/`;
    let promise;
    let raceIdToReturn = id;

    if (id) { // Editando corrida
        promise = firebase.database().ref(dbPath).child(id).set(raceData);
    } else { // Criando nova corrida
        const newRaceRef = firebase.database().ref(dbPath).push();
        raceIdToReturn = newRaceRef.key;
        promise = newRaceRef.set(raceData);
    }

    promise.then(() => {
        closeModal();
        // Se for uma nova corrida, inicializa os nós de interação separados
        if (!id && raceIdToReturn) {
            const updates = {};
            updates[`/raceLikes/${raceIdToReturn}`] = { ownerUid: currentViewingUid, likeCount: 0, likes: {}, likers: {} };
            updates[`/raceComments/${raceIdToReturn}`] = { ownerUid: currentViewingUid, comments: {} };
            firebase.database().ref().update(updates)
                .catch(err => console.error("Erro ao inicializar interações separadas:", err));
        }
    }).catch(err => { console.error("Erro ao salvar corrida:", err); alert("Erro ao salvar: " + err.message); });
}

// Modificada V9.2 para remover nós separados
function deleteRace(raceId) {
    if (!currentViewingUid || !authUser || currentViewingUid !== authUser.uid) { alert("Erro: Você deve estar logado para excluir."); return; }
    const race = db.races[raceId];
    if (!confirm(`Tem certeza que deseja excluir esta corrida?\n\n${race.raceName} (${race.date})`)) return;
    const updates = {};
    updates[`/users/${currentViewingUid}/races/${raceId}`] = null;
    updates[`/raceLikes/${raceId}`] = null; // Remove dados de likes
    updates[`/raceComments/${raceId}`] = null; // Remove dados de comentários

    firebase.database().ref().update(updates)
        .then(() => { console.log("Corrida e interações excluídas:", raceId); closeModal(); })
        .catch(err => { console.error("Erro ao excluir corrida/interações:", err); alert("Erro ao excluir: " + err.message); });
}


// --- Funções de Carregamento de Dados (V1 + V5) ---
// (loadProfile e loadRaces permanecem as mesmas da correção V9)
function loadProfile(uid) {
    if (currentProfileCommentsListener) { currentProfileCommentsListener.off(); currentProfileCommentsListener = null; }
    dom.profileCommentsList.innerHTML = '';
    const profileRef = firebase.database().ref(`/users/${uid}/profile`);
    profileRef.once('value', (snapshot) => {
        db.profile = snapshot.val() || {};
        updateProfileUI(); // Chama APENAS o que depende do perfil
    },
    (error) => {
        console.error("Erro ao carregar perfil:", error);
        db.profile = {};
        updateProfileUI(); // Chama APENAS o que depende do perfil
    });
}

function loadRaces(uid) {
    currentViewingUid = uid;
    const isOwner = authUser && authUser.uid === currentViewingUid;
    dom.controlsSection.classList.toggle('hidden', !isOwner);
    dom.btnEditProfile.classList.toggle('hidden', !isOwner);
    const racesRef = firebase.database().ref(`/users/${uid}/races`);
    db.races = {};
    // Limpa ambos os listeners V9.2
    Object.values(currentRaceLikesListeners).forEach(ref => ref.off());
    Object.values(currentRaceCommentsListeners).forEach(ref => ref.off());
    currentRaceLikesListeners = {};
    currentRaceCommentsListeners = {};
    dom.prGrid.innerHTML = '<div class="loader">Carregando PRs...</div>';
    dom.summaryGrid.innerHTML = '<div class="loader">Calculando...</div>';
    dom.historyContent.innerHTML = '<div class="loader">Carregando histórico...</div>'; // Usa historyContent
    racesRef.off('value');
    racesRef.on('value', (snapshot) => {
        db.races = snapshot.val() || {};
        renderDashboard();
        renderHistory();
    },
    (error) => {
        console.error("Erro ao carregar corridas:", error);
        db.races = {};
        renderDashboard();
        renderHistory();
    });
}

function loadPublicView() {
    if(!authUser) { dom.headerSubtitle.textContent = "Selecione um currículo ou faça login"; dom.headerProfilePicture.src = 'icons/icon-192x192.png'; dom.headerLocation.classList.add('hidden'); dom.headerBio.classList.add('hidden'); }
    const publicProfilesRef = firebase.database().ref('/publicProfiles');
    publicProfilesRef.off('value');
    publicProfilesRef.on('value', (snapshot) => {
        const profiles = snapshot.val() || {};
        if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = '';
        if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = '';
        if(Object.keys(profiles).length > 0) {
            const createProfileCard = (uid, profile) => {
                const card = document.createElement('div'); card.className = 'profile-card';
                const runner2HTML = profile.runner2Name && profile.runner2Name.trim() !== "" ? `<h3 class="runner2-name">${profile.runner2Name}</h3>` : '';
                const profilePicUrl = profile.profilePictureUrl || 'icons/icon-192x192.png';
                card.innerHTML = `<img src="${profilePicUrl}" alt="Foto Perfil" class="profile-card-pic"><div class="profile-card-info"><h3>${profile.runner1Name || 'Corredor'}</h3>${runner2HTML}<p>${profile.teamName || 'Equipe'}</p></div>`;
                card.addEventListener('click', () => { if (!authUser) { dom.loginOrPublicView.classList.add('hidden'); dom.userContent.classList.remove('hidden'); dom.btnBackToPublic.classList.remove('hidden'); dom.btnBackToMyDashboard.classList.add('hidden'); } else { dom.btnBackToPublic.classList.add('hidden'); dom.btnBackToMyDashboard.classList.remove('hidden'); } loadProfile(uid); loadRaces(uid); });
                return card;
            };
            Object.entries(profiles).forEach(([uid, profile]) => { if (dom.publicProfileListPublic) { dom.publicProfileListPublic.appendChild(createProfileCard(uid, profile)); } if (dom.publicProfileListLogged && !(authUser && authUser.uid === uid)) { dom.publicProfileListLogged.appendChild(createProfileCard(uid, profile)); } });
        } else { const noProfileMsg = '<div class="loader">Nenhum perfil público encontrado.</div>'; if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = noProfileMsg; if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = noProfileMsg; }
    });
}

// --- Funções de Lógica de UI (V1 - Roteador) ---
function showLoggedOutView() {
    if (currentViewingUid) { firebase.database().ref(`/users/${currentViewingUid}/races`).off(); }
    // Limpa ambos os listeners V9.2
    Object.values(currentRaceLikesListeners).forEach(ref => ref.off()); currentRaceLikesListeners = {};
    Object.values(currentRaceCommentsListeners).forEach(ref => ref.off()); currentRaceCommentsListeners = {};
    if (currentProfileCommentsListener) { currentProfileCommentsListener.off(); currentProfileCommentsListener = null; }
    firebase.database().ref('/publicProfiles').off(); firebase.database().ref('corridas').off(); firebase.database().ref('resultadosEtapas').off();
    authUser = null; isAdmin = false; currentViewingUid = null; db = { races: {}, profile: {} };
    dom.btnLogout.classList.add('hidden'); dom.btnBackToPublic.classList.add('hidden'); dom.btnBackToMyDashboard.classList.add('hidden');
    dom.userInfo.classList.add('hidden'); dom.controlsSection.classList.add('hidden'); dom.btnEditProfile.classList.add('hidden');
    dom.pendingApprovalView.classList.add('hidden'); dom.rejectedView.classList.add('hidden');
    dom.loginOrPublicView.classList.remove('hidden'); dom.publicView.classList.remove('hidden'); dom.userContent.classList.add('hidden');
    dom.loginError.textContent = ''; dom.loginForm.reset(); toggleLoginMode(false);
    loadPublicView(); fetchAllData();
}

function showPendingView() {
    dom.btnLogout.classList.remove('hidden'); dom.userInfo.classList.remove('hidden'); dom.userEmail.textContent = authUser.email;
    dom.loginOrPublicView.classList.add('hidden'); dom.userContent.classList.add('hidden'); dom.btnBackToPublic.classList.add('hidden');
    dom.rejectedView.classList.add('hidden'); dom.btnEditProfile.classList.add('hidden'); dom.pendingApprovalView.classList.remove('hidden');
}
function showRejectedView(email) {
    dom.btnLogout.classList.remove('hidden'); dom.userInfo.classList.remove('hidden'); dom.userEmail.textContent = email;
    dom.loginOrPublicView.classList.add('hidden'); dom.userContent.classList.add('hidden'); dom.btnBackToPublic.classList.add('hidden');
    dom.pendingApprovalView.classList.add('hidden'); dom.btnEditProfile.classList.add('hidden'); dom.rejectedEmail.textContent = email;
    dom.rejectedView.classList.remove('hidden');
}
function showUserDashboard(user) {
    dom.btnLogout.classList.remove('hidden'); dom.userInfo.classList.remove('hidden'); dom.userEmail.textContent = user.email;
    dom.loginOrPublicView.classList.add('hidden'); dom.pendingApprovalView.classList.add('hidden'); dom.rejectedView.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden'); dom.btnBackToMyDashboard.classList.add('hidden'); dom.userContent.classList.remove('hidden');
    loadProfile(user.uid); loadRaces(user.uid); fetchAllData(); loadPublicView();
    if (isAdmin) { dom.userInfo.classList.add('admin-user'); initializeAdminPanel(user.uid, database); }
    else { dom.userInfo.classList.remove('admin-user'); }
}

// --- Funções de Autenticação (V1) ---
function showLoginError(message) { dom.loginError.textContent = message; }
function toggleLoginMode(isSigningUp) {
    if (isSigningUp) { dom.loginTitle.textContent = "Cadastrar Novo Usuário"; dom.signupFields.classList.remove('hidden'); dom.btnLoginSubmit.classList.add('hidden'); dom.btnSignUpSubmit.classList.remove('hidden'); dom.loginToggleLink.textContent = "Já tem conta? Entrar"; }
    else { dom.loginTitle.textContent = "Acessar Meu Currículo"; dom.signupFields.classList.add('hidden'); dom.btnLoginSubmit.classList.remove('hidden'); dom.btnSignUpSubmit.classList.add('hidden'); dom.loginToggleLink.textContent = "Não tem conta? Cadastre-se"; }
    dom.loginError.textContent = '';
}
function handleSignUp(e) {
    e.preventDefault(); const email = dom.loginEmail.value; const password = dom.loginPassword.value; const runner1Name = dom.signupRunner1Name.value;
    dom.loginError.textContent = ''; if (password.length < 6) { showLoginError("A senha deve ter pelo menos 6 caracteres."); return; } if (!runner1Name) { showLoginError("O 'Seu nome' (Corredor 1) é obrigatório."); return; }
    auth.createUserWithEmailAndPassword(email, password).then((userCredential) => {
        const user = userCredential.user; const pendingRef = firebase.database().ref('/pendingApprovals/' + user.uid);
        pendingRef.set({ email: user.email, requestDate: new Date().toISOString(), runner1Name: runner1Name, runner2Name: dom.signupRunner2Name.value || "", teamName: dom.signupTeamName.value || "" });
        console.log("Novo usuário cadastrado:", user.uid); dom.loginForm.reset(); toggleLoginMode(false); showLoginError("Cadastro realizado! Aguardando aprovação.");
    }).catch(err => { console.error("Erro no cadastro:", err.code, err.message); if (err.code === 'auth/email-already-in-use') { showLoginError("Este e-mail já está em uso."); } else { showLoginError("Erro ao cadastrar: " + err.message); } });
}
function handleSignIn(e) {
    e.preventDefault(); const email = dom.loginEmail.value; const password = dom.loginPassword.value; dom.loginError.textContent = '';
    auth.signInWithEmailAndPassword(email, password).catch(err => { console.error("Erro no login:", err.code, err.message); if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') { showLoginError("E-mail ou senha incorretos."); } else { showLoginError("Erro ao entrar: " + err.message); } });
}
function signOut() {
    if (currentViewingUid) { firebase.database().ref(`/users/${currentViewingUid}/races`).off(); }
    // Limpa ambos os listeners V9.2
    Object.values(currentRaceLikesListeners).forEach(ref => ref.off()); currentRaceLikesListeners = {};
    Object.values(currentRaceCommentsListeners).forEach(ref => ref.off()); currentRaceCommentsListeners = {};
    if (currentProfileCommentsListener) { currentProfileCommentsListener.off(); currentProfileCommentsListener = null; }
    firebase.database().ref('/publicProfiles').off(); firebase.database().ref('corridas').off(); firebase.database().ref('resultadosEtapas').off();
    auth.signOut().catch(err => console.error("Erro no logout:", err));
}

// ======================================================
// SEÇÃO V2: LÓGICA DO CALENDÁRIO PÚBLICO (Modificado V9.1)
// ======================================================
function fetchAllData() {
    const dbRef = firebase.database(); dbRef.ref('corridas').off(); dbRef.ref('corridas').on('value', snapshot => { appState.allCorridas = snapshot.val() || { copaAlcer: {}, geral: {} }; renderContentV2(); }, error => console.error("Falha /corridas:", error));
    dbRef.ref('resultadosEtapas').off(); dbRef.ref('resultadosEtapas').on('value', snapshot => { appState.resultadosEtapas = snapshot.val() || {}; renderContentV2(); }, error => console.error("Falha /resultadosEtapas:", error));
    dbRef.ref('rankingCopaAlcer').once('value', snapshot => { appState.rankingData = snapshot.val() || {}; });
}
function renderContentV2() {
    const todasCorridasCopa = Object.values(appState.allCorridas.copaAlcer || {}); const todasCorridasGerais = Object.values(appState.allCorridas.geral || {});
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const corridasAgendadasCopa = todasCorridasCopa.filter(c => new Date(c.data + 'T00:00:00') >= hoje); const corridasAgendadasGerais = todasCorridasGerais.filter(c => new Date(c.data + 'T00:00:00') >= hoje);
    const corridasRealizadas = [...todasCorridasCopa, ...todasCorridasGerais].filter(c => new Date(c.data + 'T00:00:00') < hoje);
    renderCalendar(corridasAgendadasCopa, dom.copaContainerPublic, 'inscrições'); renderCalendar(corridasAgendadasGerais, dom.geralContainerPublic, 'inscrições'); renderCalendar(corridasRealizadas, dom.resultadosContainerPublic, 'resultados');
    renderCalendar(corridasAgendadasCopa, dom.copaContainerLogged, 'inscrições'); renderCalendar(corridasAgendadasGerais, dom.geralContainerLogged, 'inscrições'); renderCalendar(corridasRealizadas, dom.resultadosContainerLogged, 'resultados');
}

// Modificada para adicionar botão "Adicionar ao Histórico" (V9.1)
function renderCalendar(corridas, container, buttonType) {
    if (!container) return; if (!corridas || corridas.length === 0) { container.innerHTML = `<p class="loader" style="font-size: 0.9em; color: #999;">Nenhuma corrida.</p>`; return; }
    const sortedCorridas = corridas.sort((a, b) => { const dateA = new Date(a.data + 'T00:00:00'); const dateB = new Date(b.data + 'T00:00:00'); return buttonType === 'resultados' ? dateB - dateA : dateA - dateB; });
    container.innerHTML = sortedCorridas.map(corrida => {
        const dataObj = new Date(`${corrida.data}T12:00:00Z`); const dia = String(dataObj.getUTCDate()).padStart(2, '0'); const mes = dataObj.toLocaleString("pt-BR", { month: "short", timeZone: 'UTC' }).replace(".", "").toUpperCase();
        let actionButtonHTML = '';
        if (buttonType === 'inscrições') { actionButtonHTML = corrida.linkInscricao ? `<a href="${corrida.linkInscricao}" target="_blank" rel="noopener noreferrer" class="v2-inscricoes-button"><i class='bx bx-link-external' style="margin-right: 5px;"></i>Inscrições</a>` : `<div class="v2-race-button-disabled">Em Breve</div>`; }
        else { actionButtonHTML = appState.resultadosEtapas[corrida.id] ? `<button class="v2-results-button" data-race-id="${corrida.id}"><i class='bx bx-table' style="margin-right: 5px;"></i>Ver Resultados</button>` : `<div class="v2-race-button-disabled">Resultados em Breve</div>`; }

        // Botão Adicionar (V9.1) - Apenas se logado
        const addRaceButtonHTML = authUser ? `<button class="v2-add-personal-button" data-race-info='${JSON.stringify({nome: corrida.nome, data: corrida.data, id: corrida.id})}'>➕ Adicionar</button>` : '';

        return `<div class="v2-race-card"><div class="v2-race-date"><span class="v2-race-date-day">${dia}</span><span class="v2-race-date-month">${mes}</span></div><div class="v2-race-info"><div><h3 class="font-bold text-lg text-white">${corrida.nome}</h3><p class="text-sm text-gray-400"><i class='bx bxs-map' style="margin-right: 5px;"></i>${corrida.cidade}</p></div><div class="v2-race-buttons">${actionButtonHTML}${addRaceButtonHTML}</div></div></div>`;
    }).join('');

    // Listener para o botão de resultados (existente)
    container.querySelectorAll('.v2-results-button').forEach(button => { button.addEventListener('click', (e) => { const raceId = e.currentTarget.dataset.raceId; showRaceResultsModal(raceId); }); });

    // Listener para o novo botão "Adicionar ao Histórico" (V9.1)
    container.querySelectorAll('.v2-add-personal-button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!authUser) return; // Segurança extra
            try {
                const raceInfo = JSON.parse(e.currentTarget.dataset.raceInfo);
                openModal(null, raceInfo); // Chama openModal sem ID, mas com dados para pré-preencher
            } catch (error) {
                console.error("Erro ao parsear dados da corrida pública:", error);
            }
        });
    });
}

function showRaceResultsModal(raceId) {
    const race = appState.allCorridas.copaAlcer?.[raceId] || appState.allCorridas.geral?.[raceId];
    const resultsData = appState.resultadosEtapas[raceId]; // Pode ser um array ou um objeto

    if (!race || !resultsData) {
        console.error("Dados da corrida ou resultados não encontrados para:", raceId);
        return;
    }

    dom.modalTitleResults.textContent = `Resultados - ${race.nome}`;
    let contentHTML = '';

    // Verifica se resultsData é um Array (formato do resultado.json)
    if (Array.isArray(resultsData)) {
        // Agrupa os resultados pela string exata da categoria
        const groupedResults = resultsData.reduce((acc, atleta) => {
            const category = atleta.category || "Categoria Desconhecida";
            if (!acc[category]) {
                acc[category] = [];
            }
            // Garante que a propriedade 'placement' exista e seja usada para ordenar
            const placement = parseInt(atleta.placement || atleta.classificacao || "9999");
            acc[category].push({ ...atleta, placement: placement }); // Adiciona 'placement' numérico
            return acc;
        }, {});

        // Ordena as categorias (opcional, mas pode ser útil)
        const sortedCategories = Object.keys(groupedResults).sort();

        // Gera o HTML a partir dos grupos
        sortedCategories.forEach(category => {
            const atletas = groupedResults[category];
            // Ordena atletas dentro da categoria pela colocação ('placement')
            atletas.sort((a, b) => a.placement - b.placement);

            if (atletas.length > 0) {
                contentHTML += `<h3 class="v2-modal-category-title">${category}</h3>`;
                // --- INÍCIO TAREFA 3 (Modificação) ---
                contentHTML += `<div style="overflow-x: auto;"><table class="v2-results-table"><thead><tr><th>#</th><th>Atleta</th><th>Equipe</th><th>Tempo</th><th>Class. Cat.</th></tr></thead><tbody>`;
                contentHTML += atletas.map(atleta => `
                    <tr>
                        <td class="font-medium">${atleta.placement}</td>
                        <td>${atleta.name || atleta.nome || 'N/A'}</td>
                        <td style="color: #b0b0b0;">${atleta.team || atleta.assessoria || 'Individual'}</td>
                        <td style="font-family: monospace;">${atleta.time || atleta.tempo || 'N/A'}</td>
                        <td style="color: #c5cae9;">${atleta.placement_info || 'N/A'}</td>
                    </tr>`).join('');
                // --- FIM TAREFA 3 (Modificação) ---
                contentHTML += `</tbody></table></div>`;
            }
        });

    } else if (typeof resultsData === 'object' && resultsData !== null) {
        // Lógica original para dados estruturados (mantida para compatibilidade)
        for (const categoryKey in resultsData) {
            if (resultsData.hasOwnProperty(categoryKey)) {
                for (const genderKey in resultsData[categoryKey]) {
                    if (resultsData[categoryKey].hasOwnProperty(genderKey)) {
                        const atletas = resultsData[categoryKey][genderKey];
                        if (atletas && Array.isArray(atletas) && atletas.length > 0) {
                            // Ordena atletas pela 'classificacao'
                            atletas.sort((a,b) => parseInt(a.classificacao || "9999") - parseInt(b.classificacao || "9999"));

                            contentHTML += `<h3 class="v2-modal-category-title">${categoryKey} - ${genderKey.charAt(0).toUpperCase() + genderKey.slice(1)}</h3>`;
                            contentHTML += `<div style="overflow-x: auto;"><table class="v2-results-table"><thead><tr><th>#</th><th>Atleta</th><th>Equipe</th><th>Tempo</th></tr></thead><tbody>`;
                            contentHTML += atletas.map(atleta => `
                                <tr>
                                    <td class="font-medium">${atleta.classificacao}</td>
                                    <td>${atleta.nome || 'N/A'}</td>
                                    <td style="color: #b0b0b0;">${atleta.assessoria || 'Individual'}</td>
                                    <td style="font-family: monospace;">${atleta.tempo || 'N/A'}</td>
                                </tr>`).join('');
                            contentHTML += `</tbody></table></div>`;
                        }
                    }
                }
            }
        }
    }

    dom.modalContentResults.innerHTML = contentHTML || '<p>Nenhum resultado encontrado ou formato inválido.</p>';
    dom.modalSearchInput.value = '';
    filterResultsInModal(); // Aplica filtro inicial (mostrar tudo)
    dom.modalOverlay.classList.remove('hidden');
}


function filterResultsInModal() {
    const searchTerm = dom.modalSearchInput.value.toUpperCase();
    dom.modalContentResults.querySelectorAll('.v2-results-table tbody tr').forEach(row => {
        // Verifica se a linha existe e tem as células esperadas
        if (row && row.cells && row.cells.length > 1) {
            const athleteName = row.cells[1].textContent.toUpperCase();
            row.style.display = athleteName.includes(searchTerm) ? '' : 'none';
        } else {
            // Opcional: Logar ou tratar linhas inválidas se necessário
             console.warn("Linha de tabela inválida encontrada durante a filtragem:", row);
        }
    });
}

function closeResultsModal() { dom.modalOverlay.classList.add('hidden'); }

// ======================================================
// SEÇÃO V4 + V8: LÓGICA DE UPLOAD DE MÍDIA (CLOUDINARY)
// ATUALIZADA (V9.3) COM TAREFA 2 (Excluir Mídia)
// ======================================================

function openMediaUploadModal(raceId) {
    const race = db.races[raceId]; if (!race) { console.error("Corrida não encontrada:", raceId); return; }
    dom.mediaForm.reset(); dom.mediaRaceIdInput.value = raceId; dom.mediaModalTitle.textContent = `Gerenciar Mídia: ${race.raceName}`;
    dom.mediaPreviewContainer.innerHTML = ''; dom.mediaUploadStatus.textContent = '';
    dom.mediaUploadStatus.className = 'upload-status'; dom.btnConfirmMediaUpload.disabled = true; // Desabilita upload até selecionar NOVOS arquivos

    // --- INÍCIO TAREFA 2: Carregar mídias existentes ---
    // --- CORREÇÃO V9.4: Adiciona verificação antes de Object.entries e .sort ---
    const mediaItems = (race.media ? Object.entries(race.media).sort(([,a], [,b]) => a.uploadedAt - b.uploadedAt) : []);
    
    if (mediaItems.length > 0) {
        dom.mediaPreviewContainer.style.display = 'grid'; // Mostra o grid
        mediaItems.forEach(([mediaId, item]) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'media-preview-item existing'; // Classe 'existing'
            previewItem.innerHTML = `
                <img src="${item.url}" alt="Mídia existente">
                <button type="button" class="btn-delete-media" data-media-id="${mediaId}" data-media-url="${item.url}" title="Excluir esta mídia">×</button>
            `;
            dom.mediaPreviewContainer.appendChild(previewItem);
        });

        // Adiciona listeners aos novos botões de exclusão
        dom.mediaPreviewContainer.querySelectorAll('.btn-delete-media').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const mediaId = e.currentTarget.dataset.mediaId;
                const mediaUrl = e.currentTarget.dataset.mediaUrl;
                // Chama a nova função de exclusão
                deleteMediaItem(raceId, mediaId, mediaUrl, e.currentTarget.parentElement);
            });
        });
    } else {
         // Se não houver mídias existentes, garante que o container esteja oculto (até que novos arquivos sejam selecionados)
         dom.mediaPreviewContainer.style.display = 'none';
    }
    // --- FIM TAREFA 2 ---

    dom.mediaModal.showModal();
}

function closeMediaUploadModal() { dom.mediaModal.close(); }

function handleMediaFileSelect(e) {
    const files = e.target.files;
    
    // --- INÍCIO TAREFA 2 (Modificação) ---
    // Limpa apenas os previews de NOVOS arquivos (que não têm a classe .existing)
    dom.mediaPreviewContainer.querySelectorAll('.media-preview-item:not(.existing)').forEach(el => el.remove());
    // --- FIM TAREFA 2 (Modificação) ---

    dom.mediaUploadStatus.textContent = ''; dom.mediaUploadStatus.className = 'upload-status'; let hasValidFiles = false;
    
    if (files && files.length > 0) {
        dom.mediaPreviewContainer.style.display = 'grid'; // Garante que o grid esteja visível
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                hasValidFiles = true; const reader = new FileReader(); reader.onload = function(event) {
                    const previewItem = document.createElement('div'); 
                    previewItem.className = 'media-preview-item'; // SEM a classe 'existing'
                    const img = document.createElement('img'); img.src = event.target.result; img.alt = `Preview ${file.name}`; previewItem.appendChild(img); dom.mediaPreviewContainer.appendChild(previewItem);
                }; reader.readAsDataURL(file);
            } else { console.warn(`Arquivo ignorado: ${file.name}`); } });
        if (!hasValidFiles) { updateMediaUploadStatus("Nenhuma imagem válida.", "error"); }
    } else {
        // Se não houver novos arquivos, e também não houver arquivos existentes, esconde o grid
        if (dom.mediaPreviewContainer.querySelectorAll('.media-preview-item.existing').length === 0) {
            dom.mediaPreviewContainer.style.display = 'none';
        }
    } 
    
    // Habilita o botão de upload SOMENTE se houver NOVOS arquivos válidos
    dom.btnConfirmMediaUpload.disabled = !hasValidFiles;
}

async function handleMediaUploadSubmit(e) {
    e.preventDefault(); const files = Array.from(dom.mediaFileInput.files).filter(f => f.type.startsWith('image/')); const raceId = dom.mediaRaceIdInput.value;
    if (files.length === 0 || !raceId) { updateMediaUploadStatus("Selecione imagens.", "error"); return; }
    dom.btnConfirmMediaUpload.disabled = true; let successCount = 0; let errorCount = 0;
    for (const file of files) { updateMediaUploadStatus(`Enviando ${successCount + errorCount + 1}/${files.length}: ${file.name}...`, "loading"); try {
        const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', CLOUDINARY_PRESET);
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData }); const data = await response.json();
        if (!data.secure_url) { throw new Error(data.error?.message || `Inválida resp Cloudinary ${file.name}`); }
        await saveMediaUrlToFirebase(raceId, data.secure_url); successCount++;
    } catch (err) { console.error(`Erro upload ${file.name}:`, err); errorCount++; } }
    if (errorCount === 0) { updateMediaUploadStatus(`${successCount} imagem(ns) enviada(s)!`, "success"); }
    else { updateMediaUploadStatus(`${successCount} enviada(s), ${errorCount} falha(s).`, "error"); }
    setTimeout(() => { closeMediaUploadModal(); }, 2000);
}
function saveMediaUrlToFirebase(raceId, url) {
    return new Promise((resolve, reject) => { const uid = authUser?.uid; if (!uid) { updateMediaUploadStatus("Erro: Não autenticado.", "error"); return reject(new Error("Não autenticado.")); }
        const mediaRef = firebase.database().ref(`/users/${uid}/races/${raceId}/media`).push(); const mediaData = { id: mediaRef.key, url: url, type: "image", uploadedAt: firebase.database.ServerValue.TIMESTAMP };
        mediaRef.set(mediaData).then(() => { console.log("Mídia salva:", url); resolve(); }).catch(err => { console.error("Erro Firebase:", err); updateMediaUploadStatus(`Erro salvar mídia: ${err.message}`, "error"); reject(err); }); });
}
function updateMediaUploadStatus(message, type) { dom.mediaUploadStatus.textContent = message; dom.mediaUploadStatus.className = 'upload-status'; if (type) { dom.mediaUploadStatus.classList.add(type); } }

// --- INÍCIO TAREFA 2: Nova Função ---
function deleteMediaItem(raceId, mediaId, mediaUrl, element) {
    // Verifica permissão
    if (!authUser || authUser.uid !== currentViewingUid) {
        alert("Erro: Você não tem permissão para excluir esta mídia.");
        return;
    }
    
    if (!confirm("Tem certeza que deseja excluir esta foto?\n\nEsta ação não pode ser desfeita.")) {
        return;
    }

    // Define o caminho para o nó da mídia no Firebase
    const mediaRef = firebase.database().ref(`/users/${currentViewingUid}/races/${raceId}/media/${mediaId}`);
    
    // Remove a referência do Firebase
    mediaRef.remove()
        .then(() => {
            console.log("Mídia removida do Firebase:", mediaId);
            // Remove o elemento da UI
            if (element) {
                element.remove();
            }
            // Atualiza status no modal
            updateMediaUploadStatus("Mídia excluída.", "success");
            // Se foi a última foto, esconde o container
            if (dom.mediaPreviewContainer.querySelectorAll('.media-preview-item').length === 0) {
                 dom.mediaPreviewContainer.style.display = 'none';
            }
        })
        .catch(err => {
            console.error("Erro ao excluir mídia do Firebase:", err);
            alert("Erro ao excluir mídia: " + err.message);
            updateMediaUploadStatus(`Erro ao excluir: ${err.message}`, "error");
        });
    
    // NOTA: A exclusão do arquivo físico do Cloudinary não é implementada
    // por razões de segurança (exigiria API secret no frontend).
    // A remoção da referência do Firebase é suficiente para o app.
}
// --- FIM TAREFA 2 ---


// ======================================================
// SEÇÃO V5: LÓGICA DE EDIÇÃO DE PERFIL
// ======================================================
function openProfileEditModal() { if (!authUser || authUser.uid !== currentViewingUid) return; populateProfileEditModal(); dom.profileEditModal.showModal(); }
function closeProfileEditModal() { dom.profileEditModal.close(); }
function populateProfileEditModal() {
    const profile = db.profile || {}; dom.profileEditRunner1Name.textContent = profile.runner1Name || 'Corredor 1';
    if (profile.runner2Name && profile.runner2Name.trim() !== "") { dom.profileEditRunner2Name.textContent = profile.runner2Name; dom.profileEditRunner2NameSeparator.style.display = ''; dom.profileEditRunner2Name.style.display = ''; }
    else { dom.profileEditRunner2Name.textContent = ''; dom.profileEditRunner2NameSeparator.style.display = 'none'; dom.profileEditRunner2Name.style.display = 'none'; }
    dom.profileEditTeam.value = profile.teamName || ''; dom.profileEditBio.value = profile.bio || ''; dom.profileEditLocation.value = profile.location || ''; dom.profileEditBirthdate.value = profile.birthdate || '';
    if (profile.profilePictureUrl) { dom.profileEditPicturePreview.src = profile.profilePictureUrl; dom.profileEditPicturePreviewContainer.style.display = 'block'; }
    else { dom.profileEditPicturePreview.src = ''; dom.profileEditPicturePreviewContainer.style.display = 'none'; }
    dom.profileEditPictureInput.value = ''; dom.profilePictureUploadStatus.textContent = ''; dom.profilePictureUploadStatus.className = 'upload-status'; dom.btnSaveProfileEdit.disabled = false;
}
function handleProfilePictureSelect(e) {
    const file = e.target.files[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = function(event) { dom.profileEditPicturePreview.src = event.target.result; dom.profileEditPicturePreviewContainer.style.display = 'block'; }; reader.readAsDataURL(file); dom.profilePictureUploadStatus.textContent = ''; }
    else { dom.profileEditPicturePreview.src = db.profile?.profilePictureUrl || ''; dom.profileEditPicturePreviewContainer.style.display = db.profile?.profilePictureUrl ? 'block' : 'none'; if (file) { updateProfilePictureUploadStatus("Selecione imagem.", "error"); } }
}
function handleProfileEditSubmit(e) {
    e.preventDefault(); if (!authUser || authUser.uid !== currentViewingUid) return; dom.btnSaveProfileEdit.disabled = true;
    const newProfileData = { runner1Name: db.profile.runner1Name || '', runner2Name: db.profile.runner2Name || '', teamName: dom.profileEditTeam.value.trim() || 'Equipe', bio: dom.profileEditBio.value.trim() || null, location: dom.profileEditLocation.value.trim() || null, birthdate: dom.profileEditBirthdate.value || null, profilePictureUrl: db.profile.profilePictureUrl || null };
    const file = dom.profileEditPictureInput.files[0];
    const saveTextData = () => { updateProfilePictureUploadStatus("Salvando...", "loading"); const updates = {}; updates[`/users/${authUser.uid}/profile`] = newProfileData; updates[`/publicProfiles/${authUser.uid}`] = newProfileData; return firebase.database().ref().update(updates).then(() => { db.profile = { ...db.profile, ...newProfileData }; updateProfilePictureUploadStatus("Atualizado!", "success"); setTimeout(closeProfileEditModal, 1500); renderAllV1Profile(); }).catch(err => { console.error("Erro salvar perfil:", err); updateProfilePictureUploadStatus(`Erro: ${err.message}`, "error"); dom.btnSaveProfileEdit.disabled = false; }); };
    if (file && file.type.startsWith('image/')) { uploadProfilePicture(file, (newUrl) => { if (newUrl) { newProfileData.profilePictureUrl = newUrl; saveTextData(); } else { dom.btnSaveProfileEdit.disabled = false; } }); }
    else { saveTextData(); }
}
function uploadProfilePicture(file, callback) {
    updateProfilePictureUploadStatus("Enviando foto...", "loading"); const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', CLOUDINARY_PRESET);
    fetch(CLOUDINARY_URL, { method: 'POST', body: formData }).then(response => response.json()).then(data => { if (!data.secure_url) { throw new Error(data.error?.message || "Resp Cloudinary inválida."); } updateProfilePictureUploadStatus("Foto enviada!", "loading"); callback(data.secure_url); }).catch(err => { console.error("Erro upload foto perfil:", err); updateProfilePictureUploadStatus(`Erro upload: ${err.message}`, "error"); callback(null); });
}
function updateProfilePictureUploadStatus(message, type) { dom.profilePictureUploadStatus.textContent = message; dom.profilePictureUploadStatus.className = 'upload-status'; if (type) { dom.profilePictureUploadStatus.classList.add(type); } }

// ======================================================
// SEÇÃO V9.2: LÓGICA DE CURTIDAS (ESTRUTURA SEPARADA)
// ======================================================
function toggleLike(likeButtonElement) {
    if (!authUser) { alert("Login necessário."); return; }
    const raceId = likeButtonElement.dataset.raceId;
    const ownerUid = likeButtonElement.dataset.ownerUid; // Pega o ownerUid do botão (definido no createRaceCard)
    const currentUserUid = authUser.uid;

    if (!raceId || !ownerUid) {
        console.error("Faltando data attributes (raceId ou ownerUid) no botão de like.");
        alert("Erro ao curtir/descurtir (dados faltando).");
        return;
    }

    const likesRef = firebase.database().ref(`/raceLikes/${raceId}`); // Caminho novo

    firebase.database().ref(`/publicProfiles/${currentUserUid}`).once('value', profileSnapshot => {
        const currentUserProfile = profileSnapshot.val() || {};
        const currentUserName = currentUserProfile.runner1Name || "Usuário";
        const currentUserPic = currentUserProfile.profilePictureUrl || null;

        likesRef.transaction(currentLikesData => {
            if (currentLikesData === null) {
                // Se o nó não existe, cria-o (geralmente inicializado ao criar a corrida, mas como fallback)
                const likerInfo = { name: currentUserName, pic: currentUserPic };
                return { ownerUid: ownerUid, likeCount: 1, likes: { [currentUserUid]: true }, likers: { [currentUserUid]: likerInfo } };
            }

            // Garante que as propriedades existam
            currentLikesData.likes = currentLikesData.likes || {};
            currentLikesData.likers = currentLikesData.likers || {};
            currentLikesData.likeCount = currentLikesData.likeCount || 0;
            if (!currentLikesData.ownerUid) currentLikesData.ownerUid = ownerUid; // Garante ownerUid

            // Alterna o like
            if (currentLikesData.likes[currentUserUid]) {
                currentLikesData.likeCount--;
                currentLikesData.likes[currentUserUid] = null; // Remove o like
                currentLikesData.likers[currentUserUid] = null; // Remove dos likers
            } else {
                currentLikesData.likeCount++;
                currentLikesData.likes[currentUserUid] = true; // Adiciona o like
                currentLikesData.likers[currentUserUid] = { name: currentUserName, pic: currentUserPic }; // Adiciona aos likers
            }
            return currentLikesData; // Retorna os dados modificados para a transação
        }, (error, committed, snapshot) => {
            if (error) {
                console.error('Falha like transaction:', error);
                alert("Erro ao curtir/descurtir.");
            } else if (committed) {
                console.log('Like/Unlike transaction OK!');
                // A UI será atualizada pelo listener em loadAndListenRaceInteractions
            } else {
                console.log('Like transaction abortada.');
            }
        });
    });
}


function updateLikeButtonUI(buttonElement, count, liked) {
    const iconElement = buttonElement.querySelector('i');
    const countElement = buttonElement.nextElementSibling; // Assume que o span de contagem é o próximo irmão

    buttonElement.classList.toggle('liked', liked);
    if (iconElement) {
        iconElement.classList.remove('bx-heart', 'bxs-heart', 'bx-loader-alt', 'bx-spin', 'bx-error-circle'); // Limpa ícones
        iconElement.classList.add(liked ? 'bxs-heart' : 'bx-heart');
    }
    if (countElement && countElement.classList.contains('like-count')) {
        countElement.textContent = count;
    }
    buttonElement.disabled = !authUser; // Habilita/desabilita baseado no login
}

function updateLikersPreview(previewContainer, likersData, raceId) {
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    const likerUids = likersData ? Object.keys(likersData) : [];
    const maxPreview = 3;

    likerUids.slice(0, maxPreview).forEach(uid => {
        const liker = likersData[uid];
        if (liker && liker.name) { // Verifica se liker e nome existem
            const img = document.createElement('img');
            img.src = liker.pic || 'icons/icon-96x96.png';
            img.alt = liker.name;
            img.title = liker.name;
            img.className = 'liker-avatar';
            previewContainer.appendChild(img);
        }
    });

    if (likerUids.length > maxPreview) {
        const moreSpan = document.createElement('span');
        moreSpan.className = 'likers-more';
        moreSpan.textContent = `+${likerUids.length - maxPreview}`;
        moreSpan.title = "Ver todos";
        moreSpan.dataset.raceId = raceId; // Adiciona raceId para o modal
        if (!moreSpan.listenerAdded) {
            moreSpan.addEventListener('click', (e) => {
                 e.stopPropagation();
                 showLikersModal(e.currentTarget.dataset.raceId);
            });
            moreSpan.listenerAdded = true;
        }
        previewContainer.appendChild(moreSpan);
    }
}


// Modificada V9.2 para buscar de /raceLikes
function showLikersModal(raceId) {
    const likesRef = firebase.database().ref(`/raceLikes/${raceId}`); // Caminho novo
    const race = db.races[raceId]; // Pega dados da corrida do cache local
    if (!race) {
        console.error("Dados da corrida não encontrados no cache local para:", raceId);
        return;
    }

    dom.likersModalTitle.textContent = `Curtidas em ${race.raceName}`;
    dom.likersModalList.innerHTML = '<div class="loader">Carregando...</div>';
    dom.likersModal.showModal();

    likesRef.child('likers').once('value', snapshot => {
        const likersData = snapshot.val();
        if (likersData) {
            dom.likersModalList.innerHTML = Object.entries(likersData)
                .map(([uid, liker]) => {
                    if (!liker || !liker.name) return ''; // Ignora entradas inválidas
                    const pic = liker.pic || 'icons/icon-96x96.png';
                    return `<div class="liker-item"><img src="${pic}" alt="${liker.name}"><span>${liker.name}</span></div>`;
                })
                .join('');
        } else {
            dom.likersModalList.innerHTML = '<p>Ninguém curtiu ainda.</p>';
        }
    }, error => {
        console.error("Erro ao buscar likers:", error);
        dom.likersModalList.innerHTML = '<p style="color: red;">Erro ao carregar curtidas.</p>';
    });
}

function closeLikersModal() { dom.likersModal.close(); }

// ======================================================
// SEÇÃO V9.2: LÓGICA DE COMENTÁRIOS (ESTRUTURA SEPARADA)
// ======================================================

// **Modificada V9.2:** Agora usa dois listeners separados
function loadAndListenRaceInteractions(raceId, cardElement) {
    const likeButtonElement = cardElement.querySelector('.like-button');
    const likeCountElement = cardElement.querySelector('.like-count');
    const likersPreviewElement = cardElement.querySelector('.likers-preview');
    const commentsListElement = cardElement.querySelector(`#comments-list-${raceId}`);
    const ownerUidFromCard = cardElement.dataset.ownerUid; // UID do dono do perfil (dono da corrida)

    // --- Listener para Likes ---
    const likesRef = firebase.database().ref(`/raceLikes/${raceId}`);
    if (currentRaceLikesListeners[raceId]) {
        currentRaceLikesListeners[raceId].off(); // Remove listener antigo de likes
    }
    currentRaceLikesListeners[raceId] = likesRef;
    likesRef.on('value', snapshot => {
        const likesData = snapshot.val();
        const likeCount = likesData?.likeCount || 0;
        const userLiked = authUser && (likesData?.likes?.[authUser.uid] || false);
        const likers = likesData?.likers || {};
        const ownerUid = likesData?.ownerUid || ownerUidFromCard; // Pega ownerUid dos dados ou do card

        // Atualiza UI de Likes
        if (likeButtonElement) {
            likeButtonElement.dataset.ownerUid = ownerUid; // Garante que o botão tenha o ownerUid correto
            updateLikeButtonUI(likeButtonElement, likeCount, userLiked);
            if (!likeButtonElement.listenerAdded) {
                likeButtonElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleLike(e.currentTarget);
                });
                likeButtonElement.listenerAdded = true;
            }
        }
        if (likeCountElement) {
            likeCountElement.dataset.raceId = raceId;
            if (!likeCountElement.listenerAdded) {
                 likeCountElement.addEventListener('click', (e) => {
                     e.stopPropagation();
                     if (parseInt(e.currentTarget.textContent, 10) > 0) {
                        showLikersModal(e.currentTarget.dataset.raceId);
                     }
                 });
                 likeCountElement.listenerAdded = true;
            }
        }
        if (likersPreviewElement) {
            likersPreviewElement.dataset.raceId = raceId; // Garante raceId
            updateLikersPreview(likersPreviewElement, likers, raceId);
            if (!likersPreviewElement.listenerAdded) {
                 likersPreviewElement.addEventListener('click', (e) => {
                     e.stopPropagation();
                      if (parseInt(likeCountElement?.textContent || '0', 10) > 0) { // Verifica se há likes antes de abrir
                         showLikersModal(e.currentTarget.dataset.raceId);
                      }
                 });
                 likersPreviewElement.listenerAdded = true;
            }
        }

    }, error => {
        console.error(`Erro ao carregar likes para race ${raceId}:`, error);
        if (likeButtonElement) { likeButtonElement.innerHTML = `<i class='bx bx-error-circle'></i>`; likeButtonElement.disabled = true; }
        if (likeCountElement) likeCountElement.textContent = 'X';
    });

    // --- Listener para Comentários ---
    const commentsRef = firebase.database().ref(`/raceComments/${raceId}/comments`);
    // Também busca o ownerUid do nó de comentários uma vez para usar na exclusão
    let commentOwnerUid = ownerUidFromCard; // Usa do card como fallback inicial
    firebase.database().ref(`/raceComments/${raceId}/ownerUid`).once('value', ownerSnap => {
        if(ownerSnap.exists()) commentOwnerUid = ownerSnap.val();

        // Agora configura o listener de comentários
        if (currentRaceCommentsListeners[raceId]) {
            currentRaceCommentsListeners[raceId].off(); // Remove listener antigo de comentários
        }
        currentRaceCommentsListeners[raceId] = commentsRef;
        commentsRef.orderByChild('timestamp').on('value', snapshot => {
            const comments = snapshot.val() || {};
            const commentEntries = Object.entries(comments).sort(([,a], [,b]) => a.timestamp - b.timestamp);

            if (commentsListElement) {
                commentsListElement.innerHTML = ''; // Limpa lista
                if (commentEntries.length === 0) {
                     commentsListElement.innerHTML = '<div class="loader" style="font-size: 0.9em; padding: 10px 0;">Nenhum comentário ainda.</div>';
                } else {
                    commentEntries.forEach(([commentId, commentData]) => {
                        // Passa o commentOwnerUid obtido para a função de criação
                        const commentElement = createCommentElement(commentData, commentId, raceId, commentOwnerUid);
                        commentsListElement.appendChild(commentElement);
                    });
                }
            }
        }, error => {
            console.error(`Erro ao carregar comentários para race ${raceId}:`, error);
            if (commentsListElement) commentsListElement.innerHTML = '<div style="color: red;">Erro ao carregar comentários.</div>';
        });
    });
}


// Carrega e escuta por comentários no perfil atual (V7/8) - SEM ALTERAÇÃO (usa /profileComments)
function loadProfileComments(profileUid) {
    if (!profileUid) { dom.profileCommentsList.innerHTML = ''; return; }
    dom.profileCommentsList.innerHTML = '<div class="loader" style="font-size: 0.9em; padding: 10px 0;">Carregando recados...</div>';
    const commentsRef = firebase.database().ref(`/profileComments/${profileUid}`).orderByChild('timestamp').limitToLast(50);
    if (currentProfileCommentsListener) { currentProfileCommentsListener.off(); }
    currentProfileCommentsListener = commentsRef;
    commentsRef.on('value', (snapshot) => {
        dom.profileCommentsList.innerHTML = ''; const comments = snapshot.val() || {}; const commentEntries = Object.entries(comments).sort(([,a], [,b]) => a.timestamp - b.timestamp);
        if (commentEntries.length === 0) { dom.profileCommentsList.innerHTML = '<div class="loader" style="font-size: 0.9em; padding: 10px 0;">Nenhum recado ainda.</div>'; }
        else { commentEntries.forEach(([commentId, commentData]) => { const commentElement = createCommentElement(commentData, commentId, null, profileUid); dom.profileCommentsList.appendChild(commentElement); }); }
    }, error => { console.error(`Erro comentários perfil ${profileUid}:`, error); dom.profileCommentsList.innerHTML = '<div style="color: red;">Erro ao carregar.</div>'; });
}


// Cria o elemento HTML para um comentário (V7/8) - Parâmetro 'ownerOrProfileUid' agora é o UID relevante para exclusão
function createCommentElement(commentData, commentId, raceId = null, ownerOrProfileUid) {
    const item = document.createElement('div'); item.className = 'comment-item'; item.dataset.commentId = commentId;
    const commenterProfilePic = commentData.commenterPic || 'icons/icon-96x96.png'; const timestampFormatted = formatTimestamp(commentData.timestamp);
    // Permissão de exclusão: autor OU dono da corrida/perfil OU admin
    const canDelete = authUser && (authUser.uid === commentData.commenterUid || authUser.uid === ownerOrProfileUid || isAdmin);
    item.innerHTML = `<img src="${commenterProfilePic}" alt="${commentData.commenterName}" class="comment-avatar"><div class="comment-content"><div class="comment-header"><span class="comment-author">${commentData.commenterName}</span><span class="comment-timestamp">${timestampFormatted}</span>${canDelete ? `<button class="comment-delete-btn" title="Excluir"><i class='bx bx-trash'></i></button>` : ''}</div><p class="comment-text">${commentData.text.replace(/\n/g, '<br>')}</p></div>`;
    const deleteBtn = item.querySelector('.comment-delete-btn'); if (deleteBtn) { deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); if (raceId) { deleteRaceComment(raceId, commentId); } else { deleteProfileComment(ownerOrProfileUid, commentId); } }); }
    return item;
}


// Modificada V9.2 para salvar em /raceComments e garantir ownerUid
function handleRaceCommentSubmit(e) {
    e.preventDefault(); if (!authUser) { alert("Login necessário."); return; }
    const form = e.target;
    const raceId = form.dataset.raceId;
    const ownerUid = form.dataset.ownerUid; // UID do dono da corrida (perfil visualizado)
    const textarea = form.querySelector('.comment-input');
    const text = textarea.value.trim();
    const button = form.querySelector('button[type="submit"]');

    if (!text || !raceId || !ownerUid) return;
    button.disabled = true;

    const raceCommentsRef = firebase.database().ref(`/raceComments/${raceId}`);
    const commentsPath = raceCommentsRef.child('comments');

    // 1. Busca perfil do comentador
    firebase.database().ref(`/publicProfiles/${authUser.uid}`).once('value').then(snapshot => {
        const profile = snapshot.val() || {};
        const commenterName = profile.runner1Name || "Usuário";
        const commenterPic = profile.profilePictureUrl || null;
        const commentData = {
            commenterUid: authUser.uid,
            commenterName: commenterName,
            commenterPic: commenterPic,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // 2. Garante que ownerUid existe no nó /raceComments/$raceId antes de adicionar comentário
        return raceCommentsRef.child('ownerUid').set(ownerUid).then(() => {
             // 3. Adiciona o comentário
             return commentsPath.push(commentData);
        });
    }).then(() => {
        textarea.value = '';
        console.log("Comentário adicionado com sucesso em /raceComments");
    }).catch(error => {
        console.error("Erro ao comentar corrida:", error);
        alert("Erro ao enviar comentário.");
    }).finally(() => {
        button.disabled = false;
    });
}


// Envia um comentário de perfil (V7/8) - SEM ALTERAÇÃO (usa /profileComments)
function handleProfileCommentSubmit(e) {
    e.preventDefault(); if (!authUser || !currentViewingUid) { alert("Login necessário."); return; }
    const text = dom.profileCommentInput.value.trim(); const button = dom.profileCommentForm.querySelector('button[type="submit"]');
    if (!text) return; button.disabled = true;
    firebase.database().ref(`/publicProfiles/${authUser.uid}`).once('value').then(snapshot => {
        const profile = snapshot.val() || {}; const commenterName = profile.runner1Name || "Usuário"; const commenterPic = profile.profilePictureUrl || null;
        const commentData = { commenterUid: authUser.uid, commenterName: commenterName, commenterPic: commenterPic, text: text, timestamp: firebase.database.ServerValue.TIMESTAMP };
        return firebase.database().ref(`/profileComments/${currentViewingUid}`).push(commentData);
    }).then(() => { dom.profileCommentInput.value = ''; console.log("Comentário perfil add"); }).catch(error => { console.error("Erro comentar perfil:", error); alert("Erro ao enviar recado."); }).finally(() => { button.disabled = false; });
}


// Modificada V9.2 para usar /raceComments
function deleteRaceComment(raceId, commentId) {
    if (!authUser) return; if (!confirm("Excluir este comentário?")) return;
    const commentRef = firebase.database().ref(`/raceComments/${raceId}/comments/${commentId}`); // Caminho novo
    commentRef.remove()
      .then(() => console.log("Comentário de corrida excluído:", commentId))
      .catch(error => { console.error("Erro excluir comentário de corrida:", error); alert("Erro ao excluir comentário."); });
}

// Deleta um comentário de perfil (V7/8) - SEM ALTERAÇÃO (usa /profileComments)
function deleteProfileComment(profileUid, commentId) {
     if (!authUser) return; if (!confirm("Excluir este recado?")) return;
     const commentRef = firebase.database().ref(`/profileComments/${profileUid}/${commentId}`);
     commentRef.remove().then(() => console.log("Comt perfil excluído:", commentId)).catch(error => { console.error("Erro excluir perfil:", error); alert("Erro ao excluir."); });
}

// ======================================================
// SEÇÃO V8: LÓGICA DO LIGHTBOX DE FOTOS
// ======================================================
function openLightbox(imageUrls, startIndex = 0) {
    if (!imageUrls || imageUrls.length === 0) return; lightboxState.images = imageUrls; lightboxState.currentIndex = startIndex; lightboxState.isOpen = true; showLightboxImage(); dom.lightboxOverlay.classList.remove('hidden'); document.body.style.overflow = 'hidden';
}
function closeLightbox() { lightboxState.isOpen = false; dom.lightboxOverlay.classList.add('hidden'); document.body.style.overflow = ''; }
function showLightboxImage() {
    if (!lightboxState.isOpen) return; dom.lightboxImage.src = lightboxState.images[lightboxState.currentIndex]; dom.lightboxCaption.textContent = `Foto ${lightboxState.currentIndex + 1} de ${lightboxState.images.length}`;
    dom.lightboxPrev.disabled = lightboxState.currentIndex === 0; dom.lightboxNext.disabled = lightboxState.currentIndex === lightboxState.images.length - 1;
    dom.lightboxPrev.classList.toggle('disabled', lightboxState.currentIndex === 0); dom.lightboxNext.classList.toggle('disabled', lightboxState.currentIndex === lightboxState.images.length - 1);
}
function showPrevImage() { if (lightboxState.currentIndex > 0) { lightboxState.currentIndex--; showLightboxImage(); } }
function showNextImage() { if (lightboxState.currentIndex < lightboxState.images.length - 1) { lightboxState.currentIndex++; showLightboxImage(); } }

// ======================================================
// SEÇÃO V9.1: LÓGICA DE LAYOUT (Recolher/Expandir)
// ======================================================
function toggleCollapsibleSection(contentElement, buttonElement) {
    if (!contentElement || !buttonElement) return;

    const isCollapsed = contentElement.classList.toggle('collapsed');
    const icon = buttonElement.querySelector('i');

    if (isCollapsed) {
        icon.classList.remove('bx-chevron-up');
        icon.classList.add('bx-chevron-down');
        buttonElement.title = "Expandir Histórico";
    } else {
        icon.classList.remove('bx-chevron-down');
        icon.classList.add('bx-chevron-up');
        buttonElement.title = "Recolher Histórico";
    }
}


// ======================================================
// PONTO DE ENTRADA PRINCIPAL (DOM LOADED)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
    // VERIFICAÇÃO CRÍTICA (Firebase)
    if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "COLE_AQUI_SUA_API_KEY") { alert("ERRO CFG Firebase"); document.body.innerHTML = '<h1>ERRO CFG Firebase</h1>'; return; }
    // Inicializa Firebase
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG); database = firebase.database(); auth = firebase.auth();
    // VERIFICAÇÃO CRÍTICA (Cloudinary)
    if (typeof CLOUDINARY_CLOUD_NAME === 'undefined' || typeof CLOUDINARY_UPLOAD_PRESET === 'undefined' || !CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === "COLE_AQUI_SEU_CLOUD_NAME" || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === "COLE_AQUI_SEU_UPLOAD_PRESET") { alert("ERRO CFG Cloudinary"); return; }
    CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`; CLOUDINARY_PRESET = CLOUDINARY_UPLOAD_PRESET;

    // --- LISTENERS ---
    dom.btnAddnew.addEventListener('click', () => openModal()); dom.btnCloseModal.addEventListener('click', (e) => { e.preventDefault(); closeModal(); }); dom.btnCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); }); dom.form.addEventListener('submit', handleFormSubmit); dom.btnDelete.addEventListener('click', () => { const id = document.getElementById('race-id').value; if(id) deleteRace(id); });
    dom.btnLoginSubmit.addEventListener('click', handleSignIn); dom.btnSignUpSubmit.addEventListener('click', handleSignUp); dom.btnLogout.addEventListener('click', signOut); dom.btnBackToPublic.addEventListener('click', showLoggedOutView); dom.loginToggleLink.addEventListener('click', () => { const isSigningUp = dom.signupFields.classList.contains('hidden'); toggleLoginMode(isSigningUp); }); dom.btnBackToMyDashboard.addEventListener('click', () => { if (authUser) { dom.btnBackToMyDashboard.classList.add('hidden'); showUserDashboard(authUser); } });
    dom.btnCloseMediaModal.addEventListener('click', (e) => { e.preventDefault(); closeMediaUploadModal(); }); dom.btnCancelMediaUpload.addEventListener('click', (e) => { e.preventDefault(); closeMediaUploadModal(); }); dom.mediaFileInput.addEventListener('change', handleMediaFileSelect); dom.mediaForm.addEventListener('submit', handleMediaUploadSubmit);
    dom.btnEditProfile.addEventListener('click', openProfileEditModal); dom.btnCloseProfileEditModal.addEventListener('click', (e) => { e.preventDefault(); closeProfileEditModal(); }); dom.btnCancelProfileEdit.addEventListener('click', (e) => { e.preventDefault(); closeProfileEditModal(); }); dom.profileEditPictureInput.addEventListener('change', handleProfilePictureSelect); dom.profileEditForm.addEventListener('submit', handleProfileEditSubmit);
    dom.modalSearchInput.addEventListener('keyup', filterResultsInModal); dom.btnCloseResultsModal.addEventListener('click', closeResultsModal); dom.modalOverlay.addEventListener('click', (e) => { if (e.target === dom.modalOverlay && !dom.modalOverlay.classList.contains('hidden')) { closeResultsModal(); } });
    dom.btnCloseLikersModal.addEventListener('click', (e) => { e.preventDefault(); closeLikersModal(); }); dom.btnCancelLikersModal.addEventListener('click', (e) => { e.preventDefault(); closeLikersModal(); });
    dom.profileCommentForm.addEventListener('submit', handleProfileCommentSubmit);
    dom.lightboxClose.addEventListener('click', closeLightbox); dom.lightboxPrev.addEventListener('click', showPrevImage); dom.lightboxNext.addEventListener('click', showNextImage); dom.lightboxOverlay.addEventListener('click', (e) => { if (e.target === dom.lightboxOverlay) { closeLightbox(); } });
    document.addEventListener('keydown', (e) => { if (!lightboxState.isOpen) return; if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowLeft') showPrevImage(); if (e.key === 'ArrowRight') showNextImage(); });
    // Listener para recolher/expandir (V9.1)
    dom.toggleHistoryBtn.addEventListener('click', () => toggleCollapsibleSection(dom.historyContent, dom.toggleHistoryBtn));
    // Listener para clicar no título também (opcional, melhora usabilidade) (V9.1)
    dom.toggleHistoryBtn.parentElement.addEventListener('click', (e) => {
        // Só aciona se clicar fora do botão em si (para não acionar duas vezes)
        if (e.target === dom.toggleHistoryBtn.parentElement || e.target === dom.toggleHistoryBtn.parentElement.querySelector('h2')) {
            toggleCollapsibleSection(dom.historyContent, dom.toggleHistoryBtn);
        }
    });


    // Estado inicial
    toggleLoginMode(false);

    // --- ROTEADOR PRINCIPAL (Auth State Changed) ---
    auth.onAuthStateChanged((user) => {
        const previousUserUid = authUser?.uid; authUser = user;
        if (previousUserUid && previousUserUid !== user?.uid) { // Limpa listeners do user anterior
            firebase.database().ref(`/users/${previousUserUid}/races`).off();
            // Limpa ambos os listeners V9.2
            Object.values(currentRaceLikesListeners).forEach(ref => ref.off()); currentRaceLikesListeners = {};
            Object.values(currentRaceCommentsListeners).forEach(ref => ref.off()); currentRaceCommentsListeners = {};
            if (currentProfileCommentsListener) { currentProfileCommentsListener.off(); currentProfileCommentsListener = null; }
        }
        if (user) { // --- USUÁRIO LOGADO ---
            firebase.database().ref('/admins/' + user.uid).once('value', (adminSnapshot) => {
                isAdmin = adminSnapshot.exists() && adminSnapshot.val() === true;
                firebase.database().ref('/users/' + user.uid).once('value', (userSnapshot) => {
                    if (userSnapshot.exists() || isAdmin) { showUserDashboard(user); }
                    else { firebase.database().ref('/pendingApprovals/' + user.uid).once('value', (pendingSnapshot) => {
                            if (pendingSnapshot.exists()) { showPendingView(); } else { showRejectedView(user.email); }
                        }, (error) => { // Tratamento de Erro COMPLETO
                            if(error.code === "PERMISSION_DENIED") { console.error("ERRO DE REGRAS: Verifique leitura em /pendingApprovals."); signOut(); alert("Erro config. Contate admin."); }
                            else { console.error("Erro verificar pendingApprovals:", error); signOut(); alert("Erro ao verificar status. Tente novamente."); }
                        }); } }); });
        } else { /* --- USUÁRIO DESLOGADO --- */ showLoggedOutView(); }
    });
}); // Fim DOMContentLoaded
