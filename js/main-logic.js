// =================================================================
// ARQUIVO DE LÓGICA PRINCIPAL (V9.2 - Estrutura BD Separada + Layout + Add Corrida Pública + Correções)
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

    // V10 (Strava)
    btnConnectStrava: document.getElementById('btn-connect-strava'),
    btnSyncStrava: document.getElementById('btn-sync-strava'),
    stravaIntegrationStatus: document.getElementById('strava-integration-status'),
    stravaConnectStatus: document.getElementById('strava-connect-status'),
    stravaErrorStatus: document.getElementById('strava-error-status'),

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

    
