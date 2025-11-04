// ==========================================
// ARQUIVO DE LÓGICA PRINCIPAL (V10 - Rede Social)
// VERSÃO ESTÁVEL (V10.1) - CORREÇÃO COMPLETA (SINTAXE + NULL CHECKS)
// (Complementa admin-logic.js)
// ==========================================

// --- Variáveis Globais do App ---
let db = null;
let auth = null;
let functions = null;
let appState = {
    currentViewingUid: null, // UID do perfil sendo visualizado
    authUserId: null,        // UID do usuário logado
    isAdmin: false,
    hasRunner2: false,       // Flag para perfis com 2 corredores
    profileData: {},         // Cache dos dados do perfil
    allRaces: {},            // Cache de todas as corridas (copa e geral)
    allResultadosEtapas: {}, // Cache de todos os resultados (V10)
    rankingCopa: {},         // Cache do ranking (V10)
    currentRaceLikes: {},    // Listeners de likes (para limpar)
    currentRaceComments: {}  // Listeners de comentários (para limpar)
};
let dom = {}; // Cache de Elementos do DOM

// --- Constantes de Nomes/Status ---
const RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Cor1', emoji: '🏃‍♂️' };
const RUNNER_2_PROFILE = { name: 'Corredor 2', nameShort: 'Cor2', emoji: '🏃‍♀️' };
const STATUS_COMPLETED = 'completed';
const STATUS_PLANNED = 'planned';
const STATUS_SKIPPED = 'skipped';

// --- Ponto de Entrada Principal ---
// =================================================================
// INÍCIO DA CORREÇÃO 1 (Erro de Sintaxe "V")
// A linha 32 foi corrigida de ()V => para () =>
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
// =================================================================
// FIM DA CORREÇÃO 1
// =================================================================
    cacheDomElements();
    setupEventListeners();
    initializeFirebase();
});

// ==========================================
// SEÇÃO 0: INICIALIZAÇÃO E AUTENTICAÇÃO
// ==========================================

function cacheDomElements() {
    // Vistas Principais
    dom.appLoading = document.getElementById('app-loading');
    dom.loginOrPublicView = document.getElementById('login-or-public-view');
    dom.loginView = document.getElementById('login-view');
    dom.signupView = document.getElementById('signup-view');
    dom.dashboardView = document.getElementById('dashboard-view');
    dom.publicListView = document.getElementById('public-list-view');
    dom.pendingView = document.getElementById('pending-view');
    dom.rejectedView = document.getElementById('rejected-view');

    // Login/Signup
    dom.loginForm = document.getElementById('login-form');
    dom.loginEmail = document.getElementById('login-email');
    dom.loginPassword = document.getElementById('login-password');
    dom.loginError = document.getElementById('login-error');
    dom.loginTitle = document.getElementById('login-title');
    dom.btnShowLogin = document.getElementById('btn-show-login');
    dom.btnShowSignup = document.getElementById('btn-show-signup');
    dom.btnLoginSubmit = document.getElementById('btn-login-submit');
    dom.signupForm = document.getElementById('signup-form');
    dom.signupEmail = document.getElementById('signup-email');
    dom.signupPassword = document.getElementById('signup-password');
    dom.signupRunner1Name = document.getElementById('signup-runner1-name');
    dom.signupRunner2Name = document.getElementById('signup-runner2-name');
    dom.signupTeamName = document.getElementById('signup-team-name');
    dom.signupError = document.getElementById('signup-error');
    dom.btnSignupSubmit = document.getElementById('btn-signup-submit');
    dom.rejectedEmailText = document.getElementById('rejected-email-text');
    dom.btnTrySignupAgain = document.getElementById('btn-try-signup-again');

    // Navegação Principal
    dom.btnLogout = document.getElementById('btn-logout');
    dom.btnBackToPublic = document.getElementById('btn-back-to-public');
    dom.btnBackToMyDashboard = document.getElementById('btn-back-to-my-dashboard');
    
    // Cabeçalho (V8)
    dom.header = document.querySelector('header.header');
    dom.headerProfileInfo = document.getElementById('header-profile-info');
    dom.headerProfilePicture = document.getElementById('header-profile-picture');
    dom.headerProfileName = document.getElementById('header-profile-name');

    // Lista Pública (Perfis)
    dom.publicListContainer = document.getElementById('public-list-container');

    // Dashboard (Perfil do Usuário)
    dom.userEmail = document.getElementById('user-email');
    dom.profileContentSection = document.getElementById('profile-content-section');
    dom.profileCommentsSection = document.getElementById('profile-comments-section'); // Mural (V9.2)
    dom.historyContent = document.getElementById('history-content');
    dom.statsContent = document.getElementById('stats-content');
    dom.mediaContent = document.getElementById('media-content');

    // Botões de Conteúdo (Dashboard)
    dom.profileContentBtn = document.getElementById('btn-profile-content');
    dom.profileCommentsBtn = document.getElementById('btn-profile-comments');
    dom.historyBtn = document.getElementById('btn-history');
    dom.statsBtn = document.getElementById('btn-stats');
    dom.mediaBtn = document.getElementById('btn-media');
    
    // Botões de Ação do Perfil
    dom.btnEditProfile = document.getElementById('btn-edit-profile');
    dom.btnAddRace = document.getElementById('btn-add-race');
    dom.btnAddMedia = document.getElementById('btn-add-media');
    dom.profileCommentsForm = document.getElementById('profile-comments-form'); // V9.2

    // Conteúdo Público (Resultados, Ranking, Calendário) (V9.7)
    dom.publicContentSection = document.getElementById('public-content-section');
    dom.publicContentTitle = document.getElementById('public-content-title');
    dom.publicContentFilters = document.getElementById('public-content-filters');
    dom.publicContentContainer = document.getElementById('public-content-container');
    dom.btnShowRanking = document.getElementById('btn-show-ranking');
    dom.btnShowCopaAlcer = document.getElementById('btn-show-copa-alcer');
    dom.btnShowGeral = document.getElementById('btn-show-geral');

    // --- Modais ---
    
    // Modal CRUD de Corrida
    dom.raceModal = document.getElementById('race-modal');
    dom.raceModalOverlay = document.getElementById('race-modal-overlay');
    dom.raceModalTitle = document.getElementById('race-modal-title');
    dom.raceFormModal = document.getElementById('race-form-modal');
    dom.raceId = document.getElementById('race-id-modal');
    dom.raceName = document.getElementById('race-name-modal');
    dom.raceDate = document.getElementById('race-date-modal');
    dom.raceDistance = document.getElementById('race-distance-modal');
    dom.raceTimeRunner1 = document.getElementById('race-time-runner1');
    dom.raceStatusRunner1 = document.getElementById('race-status-runner1');
    dom.raceTimeRunner2 = document.getElementById('race-time-runner2');
    dom.raceStatusRunner2 = document.getElementById('race-status-runner2');
    dom.juntosCheckbox = document.getElementById('race-juntos');
    dom.runner2Fields = document.getElementById('runner-2-fields');
    dom.raceNotes = document.getElementById('race-notes-modal');
    dom.btnSaveRace = document.getElementById('btn-save-race');
    dom.btnDeleteRace = document.getElementById('btn-delete-race');
    dom.btnCloseRaceModal = document.getElementById('btn-close-race-modal');

    // Modal Edição de Perfil
    dom.profileModal = document.getElementById('profile-modal');
    dom.profileModalOverlay = document.getElementById('profile-modal-overlay');
    dom.profileEditForm = document.getElementById('profile-edit-form');
    dom.profileRunner1Name = document.getElementById('profile-runner1-name');
    dom.profileRunner2Name = document.getElementById('profile-runner2-name');
    dom.profileTeamName = document.getElementById('profile-team-name');
    dom.profileBio = document.getElementById('profile-bio');
    dom.profileLocation = document.getElementById('profile-location');
    dom.profileBirthdateEdit = document.getElementById('profile-birthdate-edit');
    dom.profilePictureUrl = document.getElementById('profile-picture-url');
    dom.profilePictureUpload = document.getElementById('profile-picture-upload');
    dom.profilePictureProgress = document.getElementById('profile-picture-progress');
    dom.btnSaveProfile = document.getElementById('btn-save-profile');
    dom.btnCloseProfileModal = document.getElementById('btn-close-profile-modal');

    // Modal Upload de Mídia
    dom.mediaUploadModal = document.getElementById('media-upload-modal');
    dom.mediaModalOverlay = document.getElementById('media-modal-overlay');
    dom.mediaUploadForm = document.getElementById('media-upload-form');
    dom.mediaUploadRaceId = document.getElementById('media-upload-race-id');
    dom.mediaUploadName = document.getElementById('media-upload-name'); // Título da Mídia
    dom.mediaUploadFile = document.getElementById('media-upload-file');
    dom.mediaUploadPreview = document.getElementById('media-upload-preview');
    dom.mediaUploadProgress = document.getElementById('media-upload-progress');
    dom.btnSubmitMedia = document.getElementById('btn-submit-media');
    dom.btnCloseMediaModal = document.getElementById('btn-close-media-modal');
    dom.mediaListContainer = document.getElementById('media-list-container');

    // Modal de Resultados (V9.3 / V10)
    dom.resultsModal = document.getElementById('results-modal');
    dom.resultsModalOverlay = document.getElementById('results-modal-overlay');
    dom.resultsModalTitle = document.getElementById('results-modal-title');
    dom.resultsModalFilters = document.getElementById('results-modal-filters');
    dom.resultsModalFilterName = document.getElementById('results-modal-filter-name');
    dom.resultsModalContent = document.getElementById('results-modal-content');
    dom.btnCloseResultsModal = document.getElementById('btn-close-results-modal');

    // Modal de Comentários (Corrida) (V9.2)
    dom.raceCommentsModal = document.getElementById('race-comments-modal');
    dom.raceCommentsModalOverlay = document.getElementById('race-comments-modal-overlay');
    dom.raceCommentsModalTitle = document.getElementById('race-comments-modal-title');
    dom.raceCommentsList = document.getElementById('race-comments-list');
    dom.raceCommentsForm = document.getElementById('race-comments-form');
    dom.raceCommentText = document.getElementById('race-comment-text');
    dom.raceCommentRaceId = document.getElementById('race-comment-race-id');
    dom.raceCommentOwnerUid = document.getElementById('race-comment-owner-uid');
    dom.btnSubmitRaceComment = document.getElementById('btn-submit-race-comment');
    dom.btnCloseRaceCommentsModal = document.getElementById('btn-close-race-comments-modal');

    // Modal de Likes (Corrida) (V9.2)
    dom.raceLikesModal = document.getElementById('race-likes-modal');
    dom.raceLikesModalOverlay = document.getElementById('race-likes-modal-overlay');
    dom.raceLikesModalTitle = document.getElementById('race-likes-modal-title');
    dom.raceLikesList = document.getElementById('race-likes-list');
    dom.btnCloseRaceLikesModal = document.getElementById('btn-close-race-likes-modal');

    // Lightbox (V8)
    dom.lightbox = document.getElementById('lightbox');
    dom.lightboxOverlay = document.getElementById('lightbox-overlay');
    dom.lightboxImage = document.getElementById('lightbox-image');
    dom.lightboxCaption = document.getElementById('lightbox-caption');
    dom.lightboxClose = document.getElementById('lightbox-close');
    dom.lightboxPrev = document.getElementById('lightbox-prev');
    dom.lightboxNext = document.getElementById('lightbox-next');

    // Filtros de Histórico
    dom.filterYear = document.getElementById('filter-year');
    dom.filterStatus = document.getElementById('filter-status');
    dom.filterRunner = document.getElementById('filter-runner');
    dom.historyTotal = document.getElementById('history-total');

    // Recolher/Expandir (V13)
    dom.toggleHistoryBtn = document.getElementById('toggle-history-btn');
    dom.toggleHistoryContent = document.getElementById('history-content-collapsible');
    dom.toggleCommentsBtn = document.getElementById('toggle-comments-btn');
    dom.toggleCommentsContent = document.getElementById('comments-content-collapsible');
}

/**
 * (V10 - CORRIGIDO)
 * Inicializa o Firebase.
 * Verifica a existência da variável de configuração antes de inicializar.
 */
function initializeFirebase() {
    // V10: Garante que o config.js foi carregado antes de tentar inicializar
    if (typeof FIREBASE_CONFIG === "undefined" || !FIREBASE_CONFIG) {
        console.error("Erro fatal: FIREBASE_CONFIG não foi definido.");
        console.error("Verifique se o arquivo 'js/config.js' está sendo carregado corretamente no 'index.html' e se a variável FIREBASE_CONFIG está preenchida.");
        
        // Exibe erro para o usuário
        dom.appLoading.innerHTML = 'Erro crítico de configuração. Contate o administrador. (FIREBASE_CONFIG not found)';
        dom.appLoading.classList.remove('hidden');
        dom.loginOrPublicView.classList.add('hidden'); // Esconde o resto
        return; // Interrompe a execução
    }

    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        
        db = firebase.database();
        auth = firebase.auth();
        functions = firebase.functions();
        
        console.log("Firebase Inicializado com sucesso.");

        // Inicia o listener de autenticação
        setupAuthListener();
    } catch (e) {
        console.error("Erro fatal ao inicializar o Firebase: ", e);
        dom.appLoading.innerHTML = `Erro fatal na inicialização: ${e.message}. Verifique o console.`;
    }
}


/**
 * Listener Principal de Autenticação
 * Controla o fluxo da aplicação (logado vs. deslogado)
 */
function setupAuthListener() {
    auth.onAuthStateChanged((user) => {
        dom.appLoading.classList.add('hidden'); // Esconde o loading
        
        if (user) {
            // --- USUÁRIO LOGADO ---
            appState.authUserId = user.uid;
            
            // 1. Verifica se é Admin
            db.ref(`/admins/${user.uid}`).once('value', (adminSnapshot) => {
                appState.isAdmin = adminSnapshot.exists() && adminSnapshot.val() === true;

                // 2. Verifica se está APROVADO
                db.ref(`/approvedUsers/${user.uid}`).once('value', (approvedSnapshot) => {
                    
                    if (appState.isAdmin || approvedSnapshot.exists()) {
                        // --- CASO 1: APROVADO ou ADMIN ---
                        console.log("Usuário Aprovado ou Admin.");
                        
                        // Se for Admin, inicializa o painel de admin
                        if (appState.isAdmin) {
                            if (typeof initializeAdminPanel === "function") {
                                initializeAdminPanel(appState.authUserId, db);
                            } else {
                                console.error("admin-logic.js não foi carregado.");
                            }
                        }
                        
                        // Carrega o dashboard pessoal
                        loadUserProfile(user.uid, true);
                        showView('dashboard');
                        
                    } else {
                        // --- CASO 2: NÃO APROVADO ---
                        // 3. Verifica se está PENDENTE
                        db.ref(`/pendingApprovals/${user.uid}`).once('value', (pendingSnapshot) => {
                            if (pendingSnapshot.exists()) {
                                // --- CASO 2a: PENDENTE ---
                                console.log("Usuário Pendente. Exibindo 'pendingView'.");
                                showView('pending');
                            } else {
                                // --- CASO 2b: REJEITADO/EXCLUÍDO ---
                                console.log("Usuário Rejeitado ou não encontrado. Exibindo 'rejectedView'.");
                                dom.rejectedEmailText.textContent = user.email;
                                showView('rejected');
                            }
                        });
                    }
                });
            }, (error) => {
                // --- CASO 3: ERRO (Regras de Segurança?) ---
                console.error("Erro ao verificar status de admin/aprovação: ", error);
                if (error.code === "PERMISSION_DENIED") {
                    console.error("VERIFIQUE AS REGRAS DE LEITURA EM /admins/ e /approvedUsers/");
                }
                alert("Erro de configuração. Contate o administrador.");
                signOutUser();
            });
            
        } else {
            // --- USUÁRIO DESLOGADO ---
            console.log("Usuário deslogado. Exibindo 'loginOrPublicView'.");
            appState.authUserId = null;
            appState.isAdmin = false;
            
            // Carrega os dados públicos (Corridas, Resultados, Perfis)
            loadPublicData();
            
            showView('loginOrPublicView');
        }
    });
}

// ==========================================
// SEÇÃO 1: FUNÇÕES DE VIEW E AUTENTICAÇÃO
// ==========================================

// Gerenciador de troca de Views
function showView(viewToShow) {
    const views = [
        dom.loginOrPublicView, dom.loginView, dom.signupView,
        dom.dashboardView, dom.publicListView, dom.pendingView, dom.rejectedView
    ];
    
    // Esconde todas as vistas
    views.forEach(view => view.classList.add('hidden'));

    // Mostra a vista principal (Login/Public ou Dashboard)
    if (viewToShow === 'loginOrPublicView') {
        dom.loginOrPublicView.classList.remove('hidden');
        showViewPublicContent('copaAlcer'); // V10: Mostra Copa Alcer por padrão
        
    } else if (viewToShow === 'dashboard') {
        dom.dashboardView.classList.remove('hidden');
        dom.header.classList.remove('hidden'); // Mostra o header
        
    } else if (viewToShow === 'publicList') {
        dom.publicListView.classList.remove('hidden');
        dom.header.classList.remove('hidden'); // Mostra o header
        
    } else if (viewToShow === 'pending') {
        dom.pendingView.classList.remove('hidden');
        
    } else if (viewToShow === 'rejected') {
        dom.rejectedView.classList.remove('hidden');
        
    } else if (viewToShow === 'login') {
        dom.loginOrPublicView.classList.add('hidden');
        dom.loginView.classList.remove('hidden');
        dom.loginTitle.textContent = "Login";
        
    } else if (viewToShow === 'signup') {
        dom.loginOrPublicView.classList.add('hidden');
        dom.signupView.classList.remove('hidden');
    }
}

// Resetar sub-views específicas
function showDashboardContent(contentId) {
    // Esconde todas as seções
    [dom.profileContentSection, dom.profileCommentsSection, dom.historyContent, dom.statsContent, dom.mediaContent].forEach(el => el.classList.add('hidden'));
    // Remove a classe 'active' de todos os botões
    [dom.profileContentBtn, dom.profileCommentsBtn, dom.historyBtn, dom.statsBtn, dom.mediaBtn].forEach(btn => btn.classList.remove('active'));

    // Mostra a seção e ativa o botão correspondente
    if (contentId === 'profile') {
        dom.profileContentSection.classList.remove('hidden');
        dom.profileContentBtn.classList.add('active');
    } else if (contentId === 'comments') {
        dom.profileCommentsSection.classList.remove('hidden');
        dom.profileCommentsBtn.classList.add('active');
    } else if (contentId === 'history') {
        dom.historyContent.classList.remove('hidden');
        dom.historyBtn.classList.add('active');
    } else if (contentId === 'stats') {
        dom.statsContent.classList.remove('hidden');
        dom.statsBtn.classList.add('active');
    } else if (contentId === 'media') {
        dom.mediaContent.classList.remove('hidden');
        dom.mediaBtn.classList.add('active');
    }
}

// V10: Controla o conteúdo público (Resultados, Ranking, Calendário)
function showViewPublicContent(contentId) {
    // Esconde todos os containers
    dom.publicContentContainer.innerHTML = ''; // Limpa
    
    // Remove a classe 'active' de todos os botões de filtro
    const filterButtons = dom.publicContentFilters.querySelectorAll('.button');
    filterButtons.forEach(btn => btn.classList.remove('active'));

    // Mostra o conteúdo e ativa o botão correspondente
    if (contentId === 'ranking') {
        dom.publicContentTitle.textContent = 'Ranking Copa Alcer';
        dom.btnShowRanking.classList.add('active');
        renderRanking(appState.rankingCopa);
        
    } else if (contentId === 'copaAlcer') {
        dom.publicContentTitle.textContent = 'Calendário Copa Alcer';
        dom.btnShowCopaAlcer.classList.add('active');
        renderPublicCalendar(appState.allRaces.copaAlcer, 'Calendário Copa Alcer');
        
    } else if (contentId === 'geral') {
        dom.publicContentTitle.textContent = 'Calendário Geral';
        dom.btnShowGeral.classList.add('active');
        renderPublicCalendar(appState.allRaces.geral, 'Calendário Geral');
    }
}

// Reseta o formulário de login (usado ao voltar)
function showLoginForm() {
    dom.loginError.textContent = '';
    dom.loginForm.reset();
    showView('login');
}

// Reseta o formulário de signup (usado ao voltar)
function showSignupForm() {
    dom.signupError.textContent = '';
    dom.signupForm.reset();
    showView('signup');
}

// Handler para o formulário de Login
function handleLogin(e) {
    e.preventDefault();
    const email = dom.loginEmail.value;
    const password = dom.loginPassword.value;
    
    setLoadingState(dom.btnLoginSubmit, true, "Entrando...");

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Sucesso! O onAuthStateChanged vai cuidar do resto.
            console.log("Login bem-sucedido.");
            setLoadingState(dom.btnLoginSubmit, false, "Login");
            dom.loginForm.reset();
            dom.loginError.textContent = '';
        })
        .catch((error) => {
            // Falha
            console.error("Erro no login: ", error.code);
            let msg = "Erro desconhecido.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = "E-mail ou senha incorretos.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Formato de e-mail inválido.";
            }
            dom.loginError.textContent = msg;
            setLoadingState(dom.btnLoginSubmit, false, "Login");
        });
}

// Handler para o formulário de Signup
function handleSignUp(e) {
    e.preventDefault();
    const email = dom.signupEmail.value;
    const password = dom.signupPassword.value;
    const runner1Name = dom.signupRunner1Name.value.trim();
    const runner2Name = dom.signupRunner2Name.value.trim();
    const teamName = dom.signupTeamName.value.trim();

    if (runner1Name.length < 3) {
        dom.signupError.textContent = "O Nome do Corredor 1 é obrigatório.";
        return;
    }
    
    setLoadingState(dom.btnSignupSubmit, true, "Registrando...");

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Usuário criado. Agora, salva a solicitação de aprovação.
            const uid = userCredential.user.uid;
            
            const pendingData = {
                email: email,
                runner1Name: runner1Name
            };
            // Adiciona campos opcionais apenas se preenchidos
            if (runner2Name) pendingData.runner2Name = runner2Name;
            if (teamName) pendingData.teamName = teamName;

            return db.ref(`pendingApprovals/${uid}`).set(pendingData);
        })
        .then(() => {
            // Solicitação salva. O onAuthStateChanged vai mostrar o 'pendingView'.
            console.log("Usuário registrado e aguardando aprovação.");
            setLoadingState(dom.btnSignupSubmit, false, "Registrar");
            dom.signupForm.reset();
            dom.signupError.textContent = '';
            // Não precisa fazer signOut, o listener vai pegar o estado "pendente"
        })
        .catch((error) => {
            // Falha no Signup
            console.error("Erro no signup: ", error.code);
            let msg = "Erro desconhecido. Tente novamente.";
            if (error.code === 'auth/email-already-in-use') {
                msg = "Este e-mail já está em uso.";
            } else if (error.code === 'auth/weak-password') {
                msg = "A senha deve ter pelo menos 6 caracteres.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Formato de e-mail inválido.";
            }
            dom.signupError.textContent = msg;
            setLoadingState(dom.btnSignupSubmit, false, "Registrar");
        });
}

// Desloga o usuário
function signOutUser() {
    console.log("Deslogando usuário...");
    cleanupListeners(); // Limpa listeners dinâmicos
    auth.signOut();
    // O onAuthStateChanged vai cuidar de mostrar a tela de login/público
}

// ==========================================
// SEÇÃO 2: CARREGAMENTO DE DADOS (PÚBLICO E PERFIL)
// ==========================================

// Carrega todos os dados públicos (para view deslogada)
function loadPublicData() {
    console.log("Carregando dados públicos...");
    
    // Carrega Perfis Públicos
    db.ref('users').once('value', (snapshot) => {
        if (snapshot.exists()) {
            renderPublicList(snapshot.val());
        }
    });
    
    // Carrega Corridas (Ambos Calendários)
    db.ref('corridas').once('value', (snapshot) => {
        if (snapshot.exists()) {
            appState.allRaces = snapshot.val();
            // V10: Renderiza o calendário padrão (Copa Alcer) ao carregar
            showViewPublicContent('copaAlcer'); 
        } else {
            console.warn("Nenhum dado de corrida encontrado.");
        }
    });

    // Carrega Resultados (V10)
    db.ref('resultadosEtapas').once('value', (snapshot) => {
        if (snapshot.exists()) {
            appState.allResultadosEtapas = snapshot.val();
        }
    });
    
    // Carrega Ranking (V10)
    db.ref('rankingCopaAlcer').once('value', (snapshot) => {
        if (snapshot.exists()) {
            appState.rankingCopa = snapshot.val();
        }
    });
}

// Carrega dados de um perfil de usuário específico
function loadUserProfile(uid, isAuthUser = false) {
    // Se o perfil que estamos carregando é o mesmo, não recarrega
    if (appState.currentViewingUid === uid && !isAuthUser) { // isAuthUser força recarga do próprio dashboard
        showView('dashboard');
        return;
    }

    console.log(`Carregando perfil para UID: ${uid}`);
    appState.currentViewingUid = uid; // Define o perfil que estamos vendo
    
    // Limpa listeners antigos para evitar duplicação
    cleanupListeners();
    
    // Define quem pode editar/adicionar
    const canEdit = (appState.authUserId === uid) || appState.isAdmin;
    
    // Mostra/Esconde botões de admin/dono
    toggleElement(dom.btnEditProfile, canEdit);
    toggleElement(dom.btnAddRace, canEdit);
    toggleElement(dom.btnAddMedia, canEdit);
    toggleElement(dom.profileCommentsForm, appState.authUserId); // V9.2: Só mostra form de mural se logado
    
    // Define os botões de navegação
    if (appState.authUserId && appState.authUserId !== uid) {
        // Vendo o perfil de outro
        dom.btnBackToMyDashboard.classList.remove('hidden');
        dom.btnBackToPublic.classList.add('hidden');
    } else if (appState.authUserId && appState.authUserId === uid) {
        // Vendo o meu próprio perfil
        dom.btnBackToMyDashboard.classList.add('hidden');
        dom.btnBackToPublic.classList.remove('hidden');
    } else {
        // Deslogado vendo perfil
        dom.btnBackToMyDashboard.classList.add('hidden');
        dom.btnBackToPublic.classList.add('hidden');
    }

    // --- Carrega Dados do Perfil ---
    const profileRef = db.ref(`/users/${uid}/profile`);
    profileRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.error("Perfil não encontrado para UID:", uid);
            if (isAuthUser) signOutUser(); // Se o próprio usuário não tem perfil, desloga
            return;
        }
        const profile = snapshot.val();
        appState.profileData = profile; // Salva no cache
        
        // Define a flag global
        appState.hasRunner2 = !!(profile.runner2Name && profile.runner2Name.length > 0);
        
        renderProfile(profile);
        
        // Atualiza os filtros de histórico (Runner 2)
        toggleElement(dom.filterRunner.parentElement, appState.hasRunner2);

        // Carrega o histórico (depende do profile.races)
        const racesRef = db.ref(`/users/${uid}/races`);
        appState.currentRaceLikes = setupRaceDataListener(racesRef, 'history', (races) => {
            renderHistory(races);
            renderStats(races, profile);
        });

    }, (error) => {
        console.error("Erro ao carregar perfil:", error);
    });

    // --- Carrega Mídias ---
    const mediaRef = db.ref(`/users/${uid}/media`);
    mediaRef.on('value', (snapshot) => {
        renderMedia(snapshot.val());
    });
    
    // --- Carrega Comentários do Mural (V9.2) ---
    const commentsRef = db.ref(`/profileComments/${uid}`).orderByChild('timestamp').limitToLast(50);
    appState.currentRaceComments = setupRaceDataListener(commentsRef, 'comments', (comments) => {
        renderProfileComments(comments);
    });

    // Mostra a view do dashboard
    showView('dashboard');
    showDashboardContent('profile'); // Mostra a aba de perfil por padrão
    
    // Atualiza o Header
    updateHeader(profile.runner1Name, profile.runner2Name, profile.teamName, profile.profilePictureUrl);
}

// Carrega a lista pública de perfis
function renderPublicList(profiles) {
    if (!dom.publicListContainer) return;
    dom.publicListContainer.innerHTML = '';
    
    if (!profiles || Object.keys(profiles).length === 0) {
        dom.publicListContainer.innerHTML = '<p>Nenhum corredor encontrado.</p>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    // Filtra e ordena
    const filteredProfiles = Object.entries(profiles)
        .filter(([uid, data]) => data.profile) // Garante que o perfil existe
        .sort((a, b) => {
            // Ordena por nome (Runner1 ou Equipe)
            const nameA = a[1].profile.runner1Name || a[1].profile.teamName || '';
            const nameB = b[1].profile.runner1Name || b[1].profile.teamName || '';
            return nameA.localeCompare(nameB);
        });
        
    filteredProfiles.forEach(([uid, data]) => {
        const profile = data.profile;
        const div = document.createElement('div');
        div.className = 'public-list-item';
        div.dataset.uid = uid; // Para o click listener
        
        let displayName = profile.runner1Name || 'Usuário';
        if (profile.runner2Name) {
            displayName += ` & ${profile.runner2Name}`;
        }
        
        div.innerHTML = `
            <img src="${profile.profilePictureUrl || 'icons/icon-192x192.png'}" alt="Foto do perfil" class="profile-pic-small">
            <div class="public-list-info">
                <strong>${displayName}</strong>
                <span>${profile.teamName || 'Equipe não informada'}</span>
            </div>
        `;
        fragment.appendChild(div);
    });
    
    dom.publicListContainer.appendChild(fragment);
}

// ==========================================
// SEÇÃO 2B: RENDERIZAÇÃO DO DASHBOARD (PERFIL)
// ==========================================

// Atualiza o Header
function updateHeader(r1Name, r2Name, team, picUrl) {
    dom.headerProfilePicture.src = picUrl || 'icons/icon-192x192.png';
    
    let displayName = r1Name || '';
    let subDisplayName = team || '';

    if (r2Name) {
        const name1Short = r1Name.split(' ')[0];
        const name2Short = r2Name.split(' ')[0];
        displayName = `${name1Short} & ${name2Short}`;
    }
    
    dom.headerProfileName.innerHTML = `${displayName} <span>${subDisplayName}</span>`;
}


// Renderiza a seção de Perfil
function renderProfile(profile) {
    if (!dom.profileContentSection) return;
    
    dom.userEmail.textContent = `Logado como: ${auth.currentUser.email}`;
    
    // Atualiza nomes no modal de edição
    dom.profileRunner1Name.value = profile.runner1Name || '';
    dom.profileRunner2Name.value = profile.runner2Name || '';
    dom.profileTeamName.value = profile.teamName || '';
    dom.profileBio.value = profile.bio || '';
    dom.profileLocation.value = profile.location || '';
    dom.profileBirthdateEdit.value = profile.birthdate || '';
    dom.profilePictureUrl.value = profile.profilePictureUrl || '';

    // Define visibilidade dos campos R2
    toggleElement(dom.profileRunner2Name.parentElement, appState.hasRunner2);
    toggleElement(dom.runner2Fields, appState.hasRunner2);

    // Atualiza nomes globais para os botões
    RUNNER_1_PROFILE.name = profile.runner1Name || 'Corredor 1';
    RUNNER_1_PROFILE.nameShort = profile.runner1Name ? profile.runner1Name.split(' ')[0] : 'Cor1';
    
    if (appState.hasRunner2) {
        RUNNER_2_PROFILE.name = profile.runner2Name || 'Corredor 2';
        RUNNER_2_PROFILE.nameShort = profile.runner2Name ? profile.runner2Name.split(' ')[0] : 'Cor2';
    }

    // Atualiza os labels dos botões de status (V3.7)
    updateRunnerLabelsAndForms();
}

// Renderiza a seção de Histórico
function renderHistory(races) {
    if (!dom.historyContent) return;

    // Limpa o conteúdo
    dom.historyContent.innerHTML = '';
    
    // Aplica filtros
    const filteredRaces = filterRaces(races);

    // Ordena por data (mais nova primeiro)
    const sortedRaces = Object.entries(filteredRaces).sort((a, b) => {
        const dateA = new Date(a[1].data);
        const dateB = new Date(b[1].data);
        return dateB - dateA;
    });

    // Atualiza total
    const total = sortedRaces.length;
    dom.historyTotal.textContent = `${total} ${total === 1 ? 'corrida' : 'corridas'}`;

    if (total === 0) {
        dom.historyContent.innerHTML = '<li class="history-item-empty">Nenhuma corrida registrada encontrada para este filtro.</li>';
        return;
    }

    const fragment = document.createDocumentFragment();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparação

    sortedRaces.forEach(([raceId, race]) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.dataset.raceId = raceId; // Para o click listener
        
        // Verifica se a corrida é passada
        const raceDate = new Date(race.data + 'T12:00:00Z');
        const isPastRace = raceDate < today;
        if (isPastRace) {
            li.classList.add('past-race');
        }

        // --- Data ---
        const [year, month, day] = race.data.split('-');
        const formattedDate = `${day}/${month}`;
        
        // --- Status R1 ---
        const r1_status = race.r1 ? race.r1.status : STATUS_PLANNED;
        const r1_time = race.r1 ? (race.r1.time || '?') : '';
        let r1_html = '';
        if (r1_status === STATUS_COMPLETED) {
            r1_html = `<span class="status-dot completed" title="${RUNNER_1_PROFILE.name}: Completou"></span> ${RUNNER_1_PROFILE.nameShort}: <strong>${r1_time}</strong>`;
        } else if (r1_status === STATUS_SKIPPED) {
            r1_html = `<span class="status-dot skipped" title="${RUNNER_1_PROFILE.name}: Não correu"></span> ${RUNNER_1_PROFILE.nameShort}: ---`;
        } else {
            r1_html = `<span class="status-dot planned" title="${RUNNER_1_PROFILE.name}: Planejada"></span> ${RUNNER_1_PROFILE.nameShort}: Planejada`;
        }
        
        // --- Status R2 ---
        let r2_html = '';
        if (appState.hasRunner2) {
            const r2_status = race.r2 ? race.r2.status : STATUS_PLANNED;
            const r2_time = race.r2 ? (race.r2.time || '?') : '';
            if (r2_status === STATUS_COMPLETED) {
                r2_html = `<span class="status-dot completed" title="${RUNNER_2_PROFILE.name}: Completou"></span> ${RUNNER_2_PROFILE.nameShort}: <strong>${r2_time}</strong>`;
            } else if (r2_status === STATUS_SKIPPED) {
                r2_html = `<span class="status-dot skipped" title="${RUNNER_2_PROFILE.name}: Não correu"></span> ${RUNNER_2_PROFILE.nameShort}: ---`;
            } else {
                r2_html = `<span class="status-dot planned" title="${RUNNER_2_PROFILE.name}: Planejada"></span> ${RUNNER_2_PROFILE.nameShort}: Planejada`;
            }
        }
        
        // --- Contagem de Mídias, Likes, Comentários ---
        const mediaCount = race.mediaCount || 0;
        const likeCount = race.likeCount || 0;
        const commentCount = race.commentCount || 0;
        
        // Define UID para "Curtir" (V9.2)
        const likeButtonUid = appState.authUserId ? (appState.profileData.profilePictureUrl || 'icons/icon-192x192.png') : '';
        const likeButtonName = appState.authUserId ? (appState.profileData.runner1Name) : '';

        // Botão de editar
        const canEdit = (appState.authUserId === appState.currentViewingUid) || appState.isAdmin;
        const editButton = canEdit ? `<button class="icon-button btn-edit-race" data-race-id="${raceId}"><i class='bx bx-pencil'></i></button>` : '';

        // --- Botão de Resultados (V9.3) ---
        // Verifica se existe resultado para essa corrida no cache
        const hasResults = appState.allResultadosEtapas[raceId];
        const resultsButton = hasResults ? 
            `<a href="#" class="v2-btn-subscribe results-button" data-race-id="${raceId}" data-race-name="${race.nome}" target="_blank" rel="noopener">Ver Classificação</a>`
            : (race.link ? `<a href="${race.link}" class="v2-btn-subscribe" target="_blank" rel="noopener">Site Oficial</a>` : '');

        li.innerHTML = `
            <div class="v2-calendar-date">
                <span class="day">${day}</span>
                <span class="month">${getMonthName(month)}</span>
                <span class="year">${year}</span>
            </div>
            <div class="v2-calendar-info">
                <strong>${race.nome}</strong>
                <span>${race.cidade} | ${race.distancia}</span>
                <div class="v2-runner-status">
                    ${r1_html}
                    ${r2_html}
                </div>
            </div>
            <div class="v-calendar-action">
                ${resultsButton}
                <div class="history-item-media">
                    ${editButton}
                    <button class="icon-button btn-add-media-direct" data-race-id="${raceId}" data-race-name="${race.nome}" title="Adicionar Mídia">
                        <i class='bx bx-camera'></i>
                        <span class="media-count">${mediaCount}</span>
                    </button>
                    <button class="icon-button btn-show-comments" data-race-id="${raceId}" data-race-name="${race.nome}" title="Comentários">
                        <i class='bx bx-comment'></i>
                        <span class="comment-count">${commentCount}</span>
                    </button>
                    <button class="icon-button btn-like-race" data-race-id="${raceId}" data-owner-uid="${appState.currentViewingUid}" 
                            data-liker-pic="${likeButtonUid}" data-liker-name="${likeButtonName}" title="Curtir">
                        <i class='bx bx-heart'></i>
                        <span class="like-count" id="like-count-${raceId}">${likeCount}</span>
                    </button>
                </div>
            </div>
        `;
        fragment.appendChild(li);
    });

    dom.historyContent.appendChild(fragment);
}

// Renderiza a seção de Estatísticas
function renderStats(races, profile) {
    if (!dom.statsContent) return;

    let totalKm = 0;
    let totalRaces = 0;
    let totalKmR1 = 0;
    let totalRacesR1 = 0;
    let totalKmR2 = 0;
    let totalRacesR2 = 0;
    const years = new Set();
    
    Object.values(races).forEach(race => {
        years.add(race.data.substring(0, 4)); // Adiciona o ano (YYYY)
        
        // Tenta converter a distância para número (limpando 'km', 'K', e trocando vírgula)
        const distanceStr = (race.distancia || '0').replace(/km|k/i, '').replace(',', '.').trim();
        const distance = parseFloat(distanceStr);
        
        if (isNaN(distance)) return; // Pula se a distância não for válida

        // V3.7: Contabiliza por corredor
        const r1_match = race.r1 && race.r1.status === STATUS_COMPLETED;
        const r2_match = appState.hasRunner2 && race.r2 && race.r2.status === STATUS_COMPLETED;

        if (race.juntos) {
            // Se correram juntos, soma a distância 1x para ambos
            if (r1_match || r2_match) { // Se pelo menos um completou
                totalRaces++;
                totalKm += distance;
                if (r1_match) totalRacesR1++;
                if (r2_match) totalRacesR2++;
            }
        } else {
            // Se correram separados
            if (r1_match) {
                totalRaces++;
                totalRacesR1++;
                totalKm += distance;
            }
            if (r2_match) {
                totalRaces++;
                totalRacesR2++;
                totalKm += distance;
            }
        }
    });

    // V3.7: Formata a saída
    let html = `
        <div class="stat-card">
            <h3>Total (Equipe)</h3>
            <p><strong>${totalRaces}</strong> corridas</p>
            <p><strong>${totalKm.toFixed(1).replace('.', ',')}</strong> km</p>
        </div>
        <div class="stat-card">
            <h3>${RUNNER_1_PROFILE.name}</h3>
            <p><strong>${totalRacesR1}</strong> corridas</p>
        </div>
    `;
    
    if (appState.hasRunner2) {
        html += `
            <div class="stat-card">
                <h3>${RUNNER_2_PROFILE.name}</h3>
                <p><strong>${totalRacesR2}</strong> corridas</p>
            </div>
        `;
    }

    dom.statsContent.innerHTML = html;
}

// Renderiza a seção de Mídia (Fotos/Vídeos)
function renderMedia(mediaData) {
    if (!dom.mediaContent) return;

    dom.mediaContent.innerHTML = '';
    
    if (!mediaData || Object.keys(mediaData).length === 0) {
        dom.mediaContent.innerHTML = '<p class="media-empty-msg">Nenhuma foto ou vídeo adicionado ainda.</p>';
        return;
    }

    // V9.4: Ordena pela data de upload (mais nova primeiro)
    const sortedMedia = Object.entries(mediaData).sort((a, b) => {
        const timeA = a[1].uploadedAt || 0;
        const timeB = b[1].uploadedAt || 0;
        return timeB - timeA;
    });

    const fragment = document.createDocumentFragment();
    const lightboxImages = []; // Array para o Lightbox

    sortedMedia.forEach(([mediaId, media], index) => {
        const div = document.createElement('div');
        div.className = 'media-thumbnail';
        
        // Adiciona dados para o Lightbox
        div.dataset.index = index; 
        lightboxImages.push({
            src: media.url,
            caption: media.name || 'Mídia da corrida'
        });

        const isOwner = (appState.authUserId === appState.currentViewingUid) || appState.isAdmin;
        
        // V13: ID de Exclusão (mediaId)
        const deleteButton = isOwner ? 
            `<button class="media-delete-btn" data-media-id="${mediaId}" data-race-id="${media.raceId}" title="Excluir Mídia"><i class='bx bx-trash'></i></button>` 
            : '';

        div.innerHTML = `
            <img src="${media.thumbnail || media.url}" alt="${media.name || 'Mídia'}">
            <div class="media-thumbnail-overlay">
                <i class='bx bx-search-alt-2'></i>
            </div>
            ${deleteButton}
        `;
        fragment.appendChild(div);
    });

    dom.mediaContent.appendChild(fragment);
    
    // Salva o estado do lightbox
    lightboxState.images = lightboxImages;
}

// ==========================================
// SEÇÃO 2C: RENDERIZAÇÃO PÚBLICA (CALENDÁRIO / RESULTADOS V10)
// ==========================================

// Renderiza o Calendário Público (Copa ou Geral)
function renderPublicCalendar(racesData, title) {
    if (!dom.publicContentContainer) return;
    dom.publicContentContainer.innerHTML = '';
    
    if (!racesData || Object.keys(racesData).length === 0) {
        dom.publicContentContainer.innerHTML = `<div class="public-item-empty">Nenhuma corrida encontrada em "${title}".</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ordena por data (mais nova primeiro)
    const sortedRaces = Object.entries(racesData).sort((a, b) => {
        const dateA = new Date(a[1].data);
        const dateB = new Date(b[1].data);
        return dateB - dateA;
    });

    sortedRaces.forEach(([raceId, race]) => {
        const div = document.createElement('div');
        div.className = 'v2-calendar-item';
        
        const raceDate = new Date(race.data + 'T12:00:00Z');
        if (raceDate < today) {
            div.classList.add('past-race');
        }

        const [year, month, day] = race.data.split('-');
        
        // V10: Verifica se tem resultados
        const hasResults = appState.allResultadosEtapas[raceId];
        const resultsButton = hasResults ? 
            `<a href="#" class="v2-btn-subscribe results-button" data-race-id="${raceId}" data-race-name="${race.nome}" target="_blank" rel="noopener">Ver Classificação</a>`
            : (race.link ? `<a href="${race.link}" class="v2-btn-subscribe" target="_blank" rel="noopener">Site Oficial</a>` : '');

        div.innerHTML = `
            <div class="v2-calendar-date">
                <span class="day">${day}</span>
                <span class="month">${getMonthName(month)}</span>
                <span class="year">${year}</span>
            </div>
            <div class="v2-calendar-info">
                <strong>${race.nome}</strong>
                <span>${race.cidade} | ${race.distancia}</span>
            </div>
            <div class="v-calendar-action">
                ${resultsButton}
            </div>
        `;
        fragment.appendChild(div);
    });
    
    dom.publicContentContainer.appendChild(fragment);
}

/**
 * (V10 - CORRIGIDO)
 * Renderiza o modal de Resultados da Etapa (Classificação)
 */
function renderResultadosEtapas(raceId, raceName) {
    const resultsData = appState.allResultadosEtapas[raceId];
    if (!resultsData) {
        alert("Erro: Resultados não encontrados para esta corrida.");
        return;
    }
    
    dom.resultsModalTitle.textContent = `Resultados: ${raceName}`;
    dom.resultsModalContent.innerHTML = ''; // Limpa
    
    const fragment = document.createDocumentFragment();
    
    // Ordena as categorias (Ex: "GERAL" primeiro, depois alfabético)
    const sortedCategories = Object.keys(resultsData).sort((a, b) => {
        if (a.toUpperCase() === 'GERAL') return -1;
        if (b.toUpperCase() === 'GERAL') return 1;
        return a.localeCompare(b);
    });

    // Itera por cada categoria (ex: "GERAL", "Feminino 30-39", etc.)
    sortedCategories.forEach(categoryName => {
        const atletas = resultsData[categoryName];
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'v2-modal-category';
        
        let tableHtml = `
            <h3 class="v2-modal-category-title">${categoryName}</h3>
            <table class="v2-ranking-table">
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Atleta</th>
                        <th>Equipe</th>
                        <th>Tempo</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Itera sobre os atletas da categoria
        atletas.forEach(atleta => {
            // (V10) Usa as chaves corretas: placement, name, team, time
            tableHtml += `
                <tr>
                    <td>${atleta.placement || '-'}</td>
                    <td>${atleta.name || '-'}</td>
                    <td>${atleta.team || '-'}</td>
                    <td><strong>${atleta.time || '-'}</strong></td>
                </tr>
            `;
        });
        
        tableHtml += '</tbody></table>';
        categoryDiv.innerHTML = tableHtml;
        fragment.appendChild(categoryDiv);
    });
    
    dom.resultsModalContent.appendChild(fragment);
    
    // Mostra o Modal
    dom.resultsModal.classList.remove('hidden');
    dom.resultsModalOverlay.classList.remove('hidden');
    dom.resultsModalFilterName.value = ''; // Limpa o filtro
}

// ==========================================
// SEÇÃO 2D: RENDERIZAÇÃO PÚBLICA (RANKING COPA V10)
// ==========================================

// Renderiza o Ranking da Copa Alcer
function renderRanking(rankingData) {
    if (!dom.publicContentContainer) return;
    dom.publicContentContainer.innerHTML = '';
    
    if (!rankingData || Object.keys(rankingData).length === 0) {
        dom.publicContentContainer.innerHTML = `<div class="public-item-empty">Ranking ainda não disponível.</div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();

    // Ordena as categorias (ex: "GERAL MASCULINO" primeiro, etc.)
    const sortedCategories = Object.keys(rankingData).sort((a, b) => a.localeCompare(b));

    // Itera por cada categoria
    sortedCategories.forEach(categoryName => {
        const atletas = rankingData[categoryName];
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'v2-ranking-category'; // Estilo diferente do modal
        
        let tableHtml = `
            <h3 class="v2-ranking-category-title">${categoryName}</h3>
            <table class="v2-ranking-table">
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Atleta</th>
                        <th>Equipe</th>
                        <th>Et.1</th>
                        <th>Et.2</th>
                        <th>Et.3</th>
                        <th>Et.4</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Itera sobre os atletas (já ordenados do JSON)
        atletas.forEach(atleta => {
            tableHtml += `
                <tr>
                    <td>${atleta.pos}</td>
                    <td>${atleta.atleta}</td>
                    <td>${atleta.equipe || '-'}</td>
                    <td>${atleta.et1 || 0}</td>
                    <td>${atleta.et2 || 0}</td>
                    <td>${atleta.et3 || 0}</td>
                    <td>${atleta.et4 || 0}</td>
                    <td><strong>${atleta.total || 0}</strong></td>
                </tr>
            `;
        });
        
        tableHtml += '</tbody></table>';
        categoryDiv.innerHTML = tableHtml;
        fragment.appendChild(categoryDiv);
    });
    
    dom.publicContentContainer.appendChild(fragment);
}

// ==========================================
// SEÇÃO 3: CRUD (CORRIDAS E PERFIL)
// ==========================================

// Abre o Modal de Corrida (para Adicionar ou Editar)
function openRaceModal(raceId = null, raceName = null, raceDate = null) {
    // Limpa o formulário
    dom.raceFormModal.reset();
    dom.raceId.value = ''; // Limpa o ID oculto
    updateRunnerLabelsAndForms(); // Garante que os labels estão corretos
    toggleElement(dom.btnDeleteRace, false); // Esconde o botão de excluir
    
    if (raceId) {
        // --- MODO EDIÇÃO ---
        dom.raceModalTitle.textContent = "Editar Corrida";
        dom.raceId.value = raceId;
        toggleElement(dom.btnDeleteRace, true); // Mostra o botão de excluir
        
        // Busca os dados da corrida
        db.ref(`/users/${appState.currentViewingUid}/races/${raceId}`).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const race = snapshot.val();
                // Preenche o formulário
                dom.raceName.value = race.nome || '';
                dom.raceDate.value = race.data || '';
                dom.raceDistance.value = race.distancia || '';
                dom.raceNotes.value = race.notas || '';
                
                // V3.7: Preenche dados dos corredores
                if (race.r1) {
                    dom.raceStatusRunner1.value = race.r1.status || STATUS_PLANNED;
                    dom.raceTimeRunner1.value = race.r1.time || '';
                }
                if (appState.hasRunner2 && race.r2) {
                    dom.raceStatusRunner2.value = race.r2.status || STATUS_PLANNED;
                    dom.raceTimeRunner2.value = race.r2.time || '';
                }
                dom.juntosCheckbox.checked = race.juntos || false;
            }
        });
        
    } else {
        // --- MODO ADIÇÃO ---
        dom.raceModalTitle.textContent = "Adicionar Corrida";
        // V9.5: Preenche dados se vier do calendário
        if(raceName) dom.raceName.value = raceName;
        if(raceDate) dom.raceDate.value = raceDate;
    }
    
    dom.raceModal.classList.remove('hidden');
    dom.raceModalOverlay.classList.remove('hidden');
}

// Fecha o Modal de Corrida
function closeRaceModal() {
    dom.raceModal.classList.add('hidden');
    dom.raceModalOverlay.classList.add('hidden');
}

// Salva a Corrida (Create/Update)
function handleRaceSave() {
    const raceName = dom.raceName.value;
    const raceDate = dom.raceDate.value;
    
    if (!raceName || !raceDate) {
        alert("Nome da Corrida e Data são obrigatórios.");
        return;
    }
    
    let raceId = dom.raceId.value; // Pega o ID (se for edição)
    const uid = appState.currentViewingUid;
    
    let dbRef;
    if (raceId) {
        // Update
        dbRef = db.ref(`/users/${uid}/races/${raceId}`);
    } else {
        // Create (push gera novo ID)
        dbRef = db.ref(`/users/${uid}/races`).push();
        raceId = dbRef.key;
    }
    
    const raceData = {
        raceId: raceId, // Salva o ID dentro do objeto
        nome: raceName,
        data: raceDate,
        distancia: dom.raceDistance.value,
        notas: dom.raceNotes.value,
        juntos: dom.juntosCheckbox.checked,
        // V3.7: Dados dos corredores
        r1: {
            status: dom.raceStatusRunner1.value,
            time: dom.raceTimeRunner1.value.trim()
        }
    };
    
    // Adiciona R2 apenas se o perfil tiver R2
    if (appState.hasRunner2) {
        raceData.r2 = {
            status: dom.raceStatusRunner2.value,
            time: dom.raceTimeRunner2.value.trim()
        };
    }

    setLoadingState(dom.btnSaveRace, true, "Salvando...");
    
    dbRef.set(raceData)
        .then(() => {
            console.log("Corrida salva com sucesso.");
            setLoadingState(dom.btnSaveRace, false, "Salvar");
            closeRaceModal();
        })
        .catch((error) => {
            console.error("Erro ao salvar corrida:", error);
            alert("Erro ao salvar. Verifique o console.");
            setLoadingState(dom.btnSaveRace, false, "Salvar");
        });
}

// Exclui a Corrida
function handleRaceDelete() {
    const raceId = dom.raceId.value;
    const uid = appState.currentViewingUid;
    
    if (!raceId || !uid) {
        alert("Erro: ID da corrida ou do usuário não encontrado.");
        return;
    }
    
    if (!confirm("Tem certeza que deseja excluir esta corrida? Todas as mídias, likes e comentários associados também serão perdidos.")) {
        return;
    }
    
    setLoadingState(dom.btnDeleteRace, true, "Excluindo...");
    
    // V9.2: Exclusão em Múltiplos Nós (Atômica)
    const updates = {};
    updates[`/users/${uid}/races/${raceId}`] = null;
    updates[`/raceMedia/${raceId}`] = null;
    updates[`/raceComments/${raceId}`] = null;
    updates[`/raceLikes/${raceId}`] = null;
    
    db.ref().update(updates)
        .then(() => {
            console.log("Corrida e dados associados excluídos.");
            setLoadingState(dom.btnDeleteRace, false, "Excluir");
            closeRaceModal();
        })
        .catch((error) => {
            console.error("Erro ao excluir corrida:", error);
            alert("Erro ao excluir. Verifique o console.");
            setLoadingState(dom.btnDeleteRace, false, "Excluir");
        });
}

// Abre o Modal de Edição de Perfil
function openProfileModal() {
    // Os dados já são preenchidos pelo renderProfile()
    dom.profileModal.classList.remove('hidden');
    dom.profileModalOverlay.classList.remove('hidden');
}

// Fecha o Modal de Edição de Perfil
function closeProfileModal() {
    dom.profileModal.classList.add('hidden');
    dom.profileModalOverlay.classList.add('hidden');
}

// Salva os dados do Perfil
function handleProfileSave(e) {
    e.preventDefault();
    const uid = appState.authUserId; // Só podemos salvar o nosso
    if (!uid) return;
    
    const profileData = {
        runner1Name: dom.profileRunner1Name.value.trim(),
        runner2Name: dom.profileRunner2Name.value.trim(),
        teamName: dom.profileTeamName.value.trim(),
        bio: dom.profileBio.value.trim(),
        location: dom.profileLocation.value.trim(),
        birthdate: dom.profileBirthdateEdit.value,
        profilePictureUrl: dom.profilePictureUrl.value.trim()
    };
    
    setLoadingState(dom.btnSaveProfile, true, "Salvando...");
    
    // Atualiza o perfil
    const promiseProfile = db.ref(`/users/${uid}/profile`).update(profileData);
    
    // V9.2: Atualiza o nome nos comentários de corridas
    const promiseRaceComments = db.ref('/raceComments').once('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const updates = {};
        snapshot.forEach(raceCommentsSnap => {
            const raceId = raceCommentsSnap.key;
            raceCommentsSnap.forEach(commentSnap => {
                if (commentSnap.val().uid === uid) {
                    updates[`/raceComments/${raceId}/${commentSnap.key}/commenterName`] = profileData.runner1Name;
                }
            });
        });
        return db.ref().update(updates);
    });

    // V9.2: Atualiza o nome/pic nos likes de corridas
    const promiseRaceLikes = db.ref('/raceLikes').once('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const updates = {};
        snapshot.forEach(raceLikesSnap => {
            const raceId = raceLikesSnap.key;
            if (raceLikesSnap.hasChild(uid)) {
                updates[`/raceLikes/${raceId}/${uid}/runner1Name`] = profileData.runner1Name;
                updates[`/raceLikes/${raceId}/${uid}/pic`] = profileData.profilePictureUrl;
            }
        });
        return db.ref().update(updates);
    });

    // V9.6: Atualiza o nome/pic nos comentários do mural (profileComments)
    const promiseProfileComments = db.ref('/profileComments').once('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const updates = {};
        snapshot.forEach(profileCommentsSnap => {
            const profileUid = profileCommentsSnap.key;
            profileCommentsSnap.forEach(commentSnap => {
                 if (commentSnap.val().uid === uid) {
                    updates[`/profileComments/${profileUid}/${commentSnap.key}/commenterName`] = profileData.runner1Name;
                    updates[`/profileComments/${profileUid}/${commentSnap.key}/commenterPic`] = profileData.profilePictureUrl;
                }
            });
        });
        return db.ref().update(updates);
    });

    // Executa todas as atualizações
    Promise.all([promiseProfile, promiseRaceComments, promiseRaceLikes, promiseProfileComments])
        .then(() => {
            console.log("Perfil e todas as referências atualizadas com sucesso.");
            setLoadingState(dom.btnSaveProfile, false, "Salvar");
            closeProfileModal();
        })
        .catch((error) => {
            console.error("Erro ao salvar perfil:", error);
            alert("Erro ao salvar. Verifique o console.");
            setLoadingState(dom.btnSaveProfile, false, "Salvar");
        });
}

// ==========================================
// SEÇÃO 4: UPLOAD DE MÍDIA (V5 - Cloudinary)
// ==========================================

// Abre o Modal de Upload de Mídia
function openMediaUploadModal(raceId, raceName) {
    dom.mediaUploadForm.reset();
    dom.mediaUploadPreview.innerHTML = '';
    dom.mediaUploadProgress.style.width = '0%';
    dom.mediaUploadProgress.classList.add('hidden');
    dom.btnSubmitMedia.disabled = true; // Desabilita até selecionar arquivo
    
    // Preenche os dados da corrida
    dom.mediaUploadRaceId.value = raceId;
    dom.mediaUploadName.value = `Mídia - ${raceName}`;
    
    dom.mediaUploadModal.classList.remove('hidden');
    dom.mediaModalOverlay.classList.remove('hidden');
}

// Fecha o Modal de Upload de Mídia
function closeMediaUploadModal() {
    dom.mediaUploadModal.classList.add('hidden');
    dom.mediaModalOverlay.classList.add('hidden');
}

// Prepara a pré-visualização da mídia
function handleMediaFileChange(event) {
    const file = event.target.files[0];
    if (!file) {
        dom.mediaUploadPreview.innerHTML = '';
        dom.btnSubmitMedia.disabled = true;
        return;
    }
    
    dom.btnSubmitMedia.disabled = false;
    dom.mediaUploadPreview.innerHTML = '';
    
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        dom.mediaUploadPreview.appendChild(img);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        video.onloadeddata = () => URL.revokeObjectURL(video.src);
        dom.mediaUploadPreview.appendChild(video);
    } else {
        dom.mediaUploadPreview.innerHTML = `<p>Arquivo: ${file.name}</p>`;
    }
}

// Lida com o Upload para o Cloudinary (V5)
function handleMediaUpload(e) {
    e.preventDefault();
    
    const file = dom.mediaUploadFile.files[0];
    const raceId = dom.mediaUploadRaceId.value;
    const mediaName = dom.mediaUploadName.value.trim();
    const uid = appState.authUserId;

    if (!file || !raceId || !uid) {
        alert("Erro: Arquivo, ID da Corrida ou Usuário não encontrado.");
        return;
    }
    
    // (V10) Verifica se as chaves do Cloudinary existem (do config.js)
    if (typeof CLOUDINARY_CLOUD_NAME === "undefined" || !CLOUDINARY_CLOUD_NAME ||
        typeof CLOUDINARY_UNSIGNED_PRESET === "undefined" || !CLOUDINARY_UNSIGNED_PRESET) {
            
        console.error("Erro: Configuração do Cloudinary não encontrada.");
        alert("Erro: A função de upload não está configurada. (CLOUDINARY not found)");
        return;
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET);

    setLoadingState(dom.btnSubmitMedia, true, "Enviando...");
    dom.mediaUploadProgress.classList.remove('hidden');
    
    // Simula progresso (Fetch API não suporta nativamente)
    // Para progresso real, usaríamos XHR
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        dom.mediaUploadProgress.style.width = `${progress}%`;
        if (progress >= 90) clearInterval(interval); // Para em 90%
    }, 200);

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(interval);
        dom.mediaUploadProgress.style.width = '100%';
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        console.log("Upload para Cloudinary concluído:", data);

        // Prepara os dados para salvar no Firebase
        const mediaData = {
            raceId: raceId,
            name: mediaName,
            url: data.secure_url,
            type: data.resource_type, // 'image' ou 'video'
            format: data.format,
            uploadedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Cria thumbnail (Cloudinary)
        if (data.resource_type === 'image') {
            mediaData.thumbnail = data.secure_url.replace('/upload/', '/upload/c_thumb,w_200,g_face/');
        } else if (data.resource_type === 'video') {
            mediaData.thumbnail = data.secure_url.replace(`.${data.format}`, '.jpg');
        }

        // Salva a referência no Firebase
        const mediaRef = db.ref(`/users/${uid}/media`).push();
        const mediaId = mediaRef.key;
        
        // V9.4: Salva no nó principal de mídias também
        const updates = {};
        updates[`/users/${uid}/media/${mediaId}`] = mediaData;
        updates[`/raceMedia/${raceId}/${mediaId}`] = mediaData; // Nó espelhado
        
        // V9.4: Atualiza a contagem de mídias na corrida
        const raceMediaCountRef = db.ref(`/users/${uid}/races/${raceId}/mediaCount`);

        return db.ref().update(updates).then(() => {
            // Incrementa a contagem
            return raceMediaCountRef.transaction((currentCount) => {
                return (currentCount || 0) + 1;
            });
        });
    })
    .then(() => {
        console.log("Dados da mídia salvos no Firebase.");
        setLoadingState(dom.btnSubmitMedia, false, "Enviar");
        closeMediaUploadModal();
    })
    .catch((error) => {
        clearInterval(interval);
        console.error("Erro no upload da mídia: ", error);
        alert(`Erro no upload: ${error.message}`);
        setLoadingState(dom.btnSubmitMedia, false, "Enviar");
        dom.mediaUploadProgress.style.width = '0%';
        dom.mediaUploadProgress.classList.add('hidden');
    });
}

// Exclui Mídia (V13)
function handleMediaDelete(mediaId, raceId) {
    const uid = appState.currentViewingUid;
    
    if (!mediaId || !raceId || !uid) {
        alert("Erro: IDs não encontrados para exclusão.");
        return;
    }
    
    if (!confirm("Tem certeza que deseja excluir esta mídia?")) {
        return;
    }
    
    // (Cloudinary API de exclusão requer autenticação - pulando por enquanto)
    // Apenas exclui as referências do Firebase
    
    const updates = {};
    updates[`/users/${uid}/media/${mediaId}`] = null;
    updates[`/raceMedia/${raceId}/${mediaId}`] = null;
    
    const raceMediaCountRef = db.ref(`/users/${uid}/races/${raceId}/mediaCount`);

    db.ref().update(updates)
        .then(() => {
            // Decrementa a contagem
            return raceMediaCountRef.transaction((currentCount) => {
                return (currentCount || 1) - 1;
            });
        })
        .then(() => {
            console.log("Mídia excluída do Firebase.");
        })
        .catch((err) => {
            console.error("Erro ao excluir mídia:", err);
            alert("Erro ao excluir mídia.");
        });
}

// ==========================================
// SEÇÃO 5: LÓGICA DE FILTROS E UTILITÁRIOS
// ==========================================

// Aplica os filtros na lista de corridas
function filterRaces(races) {
    if (!races) return {};
    
    const year = dom.filterYear.value;
    const status = dom.filterStatus.value;
    const runner = dom.filterRunner.value;

    return Object.entries(races)
        .filter(([raceId, race]) => {
            // 1. Filtro de Ano
            if (year && race.data.substring(0, 4) !== year) {
                return false;
            }
            
            // 2. Filtro de Status
            if (status) {
                const r1_match = race.r1 && race.r1.status === status;
                const r2_match = appState.hasRunner2 && race.r2 && race.r2.status === status;
                
                // Se o status for "planned", precisa que AMBOS estejam "planned"
                if (status === STATUS_PLANNED) {
                    if (appState.hasRunner2) {
                        if (!r1_match && !r2_match) return false;
                    } else {
                        if (!r1_match) return false;
                    }
                } else {
                    // Se for "completed" ou "skipped", basta que UM tenha esse status
                    if (!r1_match && !r2_match) return false;
                }
            }
            
            // 3. Filtro de Corredor (V3.7)
            if (appState.hasRunner2 && runner) {
                const match = race[runner] && race[runner].status === STATUS_COMPLETED;
                if (!match) return false;
            }
            
            return true;
        })
        .reduce((acc, [id, race]) => {
            acc[id] = race;
            return acc;
        }, {});
}

// Atualiza os labels dos corredores no modal de corrida e filtros
function updateRunnerLabelsAndForms() {
    // Modal de Corrida
    document.querySelector('label[for="race-time-runner1"]').textContent = `Tempo ${RUNNER_1_PROFILE.nameShort}`;
    document.querySelector('label[for="race-status-runner1"]').textContent = `Status ${RUNNER_1_PROFILE.nameShort}`;
    document.querySelector('label[for="race-time-runner2"]').textContent = `Tempo ${RUNNER_2_PROFILE.nameShort}`;
    document.querySelector('label[for="race-status-runner2"]').textContent = `Status ${RUNNER_2_PROFILE.nameShort}`;
    
    // Filtro de Histórico
    const runnerFilter = dom.filterRunner;
    if (runnerFilter) {
        runnerFilter.options[1].textContent = RUNNER_1_PROFILE.name;
        runnerFilter.options[2].textContent = RUNNER_2_PROFILE.name;
    }
}

// Converte '01' para 'Jan', '02' para 'Fev'
function getMonthName(month) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[parseInt(month, 10) - 1] || '';
}

// Define estado de loading para botões
function setLoadingState(button, isLoading, loadingText = "...") {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || "Salvar";
    }
}

// Mostra ou esconde um elemento (usando 'hidden')
function toggleElement(element, show) {
    if (!element) return;
    if (show) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

// Limpa listeners dinâmicos ao trocar de perfil
function cleanupListeners() {
    // Limpa listeners do Histórico (Races)
    if (appState.currentRaceLikes && appState.currentRaceLikes.ref) {
        console.log(`Limpando listener: ${appState.currentRaceLikes.type}`);
        appState.currentRaceLikes.ref.off(appState.currentRaceLikes.event, appState.currentRaceLikes.callback);
    }
    // Limpa listeners do Mural (Comments)
    if (appState.currentRaceComments && appState.currentRaceComments.ref) {
         console.log(`Limpando listener: ${appState.currentRaceComments.type}`);
        appState.currentRaceComments.ref.off(appState.currentRaceComments.event, appState.currentRaceComments.callback);
    }
    
    appState.currentRaceLikes = {};
    appState.currentRaceComments = {};
}

// Wrapper para db.ref().on() que armazena a ref e o callback para limpeza
function setupRaceDataListener(ref, type, callback) {
    const eventType = 'value';
    const listenerCallback = (snapshot) => {
        callback(snapshot.val());
    };
    
    ref.on(eventType, listenerCallback);
    
    // Retorna o objeto para futura limpeza
    return {
        ref: ref,
        type: type,
        event: eventType,
        callback: listenerCallback
    };
}

// ==========================================
// SEÇÃO 6: AÇÕES SOCIAIS (LIKES, COMENTÁRIOS V9.2)
// ==========================================

// --- Comentários do Mural (Profile Comments) ---

function handleProfileCommentSubmit(e) {
    e.preventDefault();
    const commentText = dom.profileCommentsForm.querySelector('textarea').value.trim();
    const profileOwnerUid = appState.currentViewingUid; // O dono do mural
    
    // Quem está comentando
    const commenterUid = appState.authUserId;
    const commenterName = appState.profileData.runner1Name || "Usuário";
    const commenterPic = appState.profileData.profilePictureUrl || "icons/icon-192x192.png";
    
    if (!commentText || !profileOwnerUid || !commenterUid) {
        alert("Não é possível postar comentário.");
        return;
    }
    
    const commentData = {
        uid: commenterUid,
        commenterName: commenterName,
        commenterPic: commenterPic,
        text: commentText,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    db.ref(`/profileComments/${profileOwnerUid}`).push(commentData)
        .then(() => {
            dom.profileCommentsForm.querySelector('textarea').value = ''; // Limpa
        })
        .catch((err) => {
            console.error("Erro ao postar comentário no mural:", err);
            alert("Erro ao postar comentário.");
        });
}

function renderProfileComments(comments) {
    const listElement = document.getElementById('profile-comments-list');
    if (!listElement) return;
    listElement.innerHTML = '';
    
    if (!comments) {
        listElement.innerHTML = '<p class="social-empty-msg">Nenhum comentário no mural ainda. Seja o primeiro!</p>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    Object.entries(comments).forEach(([commentId, comment]) => {
        const div = document.createElement('div');
        div.className = 'social-comment-item';
        div.dataset.commentId = commentId;
        
        const timestamp = new Date(comment.timestamp).toLocaleString('pt-BR');
        
        // V9.6: Permite dono do mural ou dono do comentário excluir
        const canDelete = appState.isAdmin || (appState.authUserId === comment.uid) || (appState.authUserId === appState.currentViewingUid);
        const deleteButton = canDelete ? 
            `<button class="social-delete-comment" data-id="${commentId}" data-parent-id="${appState.currentViewingUid}" data-type="profileComments"><i class='bx bx-trash'></i></button>`
            : '';
            
        div.innerHTML = `
            <img src="${comment.commenterPic}" alt="${comment.commenterName}" class="profile-pic-small" data-uid="${comment.uid}">
            <div class="social-comment-content">
                <strong data-uid="${comment.uid}">${comment.commenterName}</strong>
                <span>${timestamp}</span>
                <p>${comment.text.replace(/\n/g, '<br>')}</p>
            </div>
            ${deleteButton}
        `;
        fragment.appendChild(div);
    });
    
    listElement.appendChild(fragment);
}

// --- Comentários da Corrida (Race Comments) ---

function showRaceCommentsModal(raceId, raceName) {
    dom.raceCommentsModalTitle.textContent = `Comentários: ${raceName}`;
    dom.raceCommentRaceId.value = raceId;
    dom.raceCommentOwnerUid.value = appState.currentViewingUid;
    
    // Esconde o formulário se não estiver logado
    toggleElement(dom.raceCommentsForm, appState.authUserId);
    
    dom.raceCommentsModal.classList.remove('hidden');
    dom.raceCommentsModalOverlay.classList.remove('hidden');
    
    // Carrega os comentários
    dom.raceCommentsList.innerHTML = '<div class="loader"></div>';
    db.ref(`/raceComments/${raceId}`).orderByChild('timestamp').once('value', (snapshot) => {
        dom.raceCommentsList.innerHTML = '';
        if (!snapshot.exists()) {
            dom.raceCommentsList.innerHTML = '<p class="social-empty-msg">Nenhum comentário ainda.</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        snapshot.forEach(commentSnap => {
            const comment = commentSnap.val();
            const commentId = commentSnap.key;
            
            const div = document.createElement('div');
            div.className = 'social-comment-item';
            
            const timestamp = new Date(comment.timestamp).toLocaleString('pt-BR');
            
            // Permite dono do perfil (dono da corrida) ou dono do comentário excluir
            const canDelete = appState.isAdmin || (appState.authUserId === comment.uid) || (appState.authUserId === appState.currentViewingUid);
            const deleteButton = canDelete ? 
                `<button class="social-delete-comment" data-id="${commentId}" data-parent-id="${raceId}" data-type="raceComments"><i class='bx bx-trash'></i></button>`
                : '';

            div.innerHTML = `
                <img src="${comment.commenterPic}" alt="${comment.commenterName}" class="profile-pic-small" data-uid="${comment.uid}">
                <div class="social-comment-content">
                    <strong data-uid="${comment.uid}">${comment.commenterName}</strong>
                    <span>${timestamp}</span>
                    <p>${comment.text.replace(/\n/g, '<br>')}</p>
                </div>
                ${deleteButton}
            `;
            fragment.appendChild(div);
        });
        dom.raceCommentsList.appendChild(fragment);
    });
}

function closeRaceCommentsModal() {
    dom.raceCommentsModal.classList.add('hidden');
    dom.raceCommentsModalOverlay.classList.add('hidden');
}

function handleRaceCommentSubmit(e) {
    e.preventDefault();
    const text = dom.raceCommentText.value.trim();
    const raceId = dom.raceCommentRaceId.value;
    const ownerUid = dom.raceCommentOwnerUid.value; // Dono da corrida

    // Quem está comentando
    const commenterUid = appState.authUserId;
    const commenterName = appState.profileData.runner1Name || "Usuário"; // V9.5.2: Garante que db.profile existe
    const commenterPic = appState.profileData.profilePictureUrl || "icons/icon-192x192.png";
    
    if (!text || !raceId || !ownerUid || !commenterUid) {
        alert("Não é possível postar o comentário.");
        return;
    }
    
    setLoadingState(dom.btnSubmitRaceComment, true, "Enviando...");
    
    const commentData = {
        uid: commenterUid,
        commenterName: commenterName,
        commenterPic: commenterPic,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    // Salva o comentário
    const commentRef = db.ref(`/raceComments/${raceId}`).push(commentData);
    
    // Atualiza a contagem na corrida
    const raceCommentCountRef = db.ref(`/users/${ownerUid}/races/${raceId}/commentCount`);

    Promise.all([commentRef, raceCommentCountRef.transaction((currentCount) => (currentCount || 0) + 1)])
        .then(() => {
            setLoadingState(dom.btnSubmitRaceComment, false, "Enviar");
            dom.raceCommentText.value = '';
            // Recarrega os comentários no modal
            showRaceCommentsModal(raceId, dom.raceCommentsModalTitle.textContent.replace('Comentários: ', ''));
        })
        .catch((error) => {
            console.error("Erro ao enviar comentário:", error);
            alert("Erro ao enviar comentário.");
            setLoadingState(dom.btnSubmitRaceComment, false, "Enviar");
        });
}


// --- Likes da Corrida (Race Likes) ---

function toggleLike(raceId, ownerUid, likerPic, likerName) {
    const likerUid = appState.authUserId;
    if (!likerUid) {
        alert("Você precisa estar logado para curtir.");
        return;
    }

    const likeRef = db.ref(`/raceLikes/${raceId}/${likerUid}`);
    const raceLikeCountRef = db.ref(`/users/${ownerUid}/races/${raceId}/likeCount`);
    
    likeRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            // --- Descurtir ---
            likeRef.remove();
            raceLikeCountRef.transaction((currentCount) => (currentCount || 1) - 1);
            // (Atualização visual é feita pelo listener 'handleRaceLike')
        } else {
            // --- Curtir ---
            const likeData = {
                uid: likerUid,
                runner1Name: likerName,
                pic: likerPic,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            likeRef.set(likeData);
            raceLikeCountRef.transaction((currentCount) => (currentCount || 0) + 1);
        }
    });
}

function showRaceLikesModal(raceId, raceName) {
    dom.raceLikesModalTitle.textContent = `Curtidas: ${raceName}`;
    dom.raceLikesModal.classList.remove('hidden');
    dom.raceLikesModalOverlay.classList.remove('hidden');
    
    // Carrega os likes
    dom.raceLikesList.innerHTML = '<div class="loader"></div>';
    db.ref(`/raceLikes/${raceId}`).orderByChild('timestamp').once('value', (snapshot) => {
        dom.raceLikesList.innerHTML = '';
        if (!snapshot.exists()) {
            dom.raceLikesList.innerHTML = '<p class="social-empty-msg">Nenhuma curtida ainda.</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        snapshot.forEach(likeSnap => {
            const like = likeSnap.val();
            
            const div = document.createElement('div');
            div.className = 'social-like-item';
            div.innerHTML = `
                <img src="${like.pic}" alt="${like.runner1Name}" class="profile-pic-small" data-uid="${like.uid}">
                <strong data-uid="${like.uid}">${like.runner1Name}</strong>
            `;
            fragment.appendChild(div);
        });
        dom.raceLikesList.appendChild(fragment);
    });
}

function closeRaceLikesModal() {
    dom.raceLikesModal.classList.add('hidden');
    dom.raceLikesModalOverlay.classList.add('hidden');
}

// Handler para exclusão de comentários (Mural ou Corrida)
function handleDeleteComment(id, parentId, type) {
    if (!id || !parentId || !type) return;

    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;
    
    let commentRef;
    let countRef;

    if (type === 'raceComments') {
        commentRef = db.ref(`/raceComments/${parentId}/${id}`);
        countRef = db.ref(`/users/${appState.currentViewingUid}/races/${parentId}/commentCount`);
    } else if (type === 'profileComments') {
        commentRef = db.ref(`/profileComments/${parentId}/${id}`);
        // Mural não tem contador
    } else {
        return;
    }

    commentRef.remove()
        .then(() => {
            console.log("Comentário excluído.");
            // Atualiza a contagem (se aplicável)
            if (countRef) {
                countRef.transaction((currentCount) => (currentCount || 1) - 1);
            }
            
            // Recarrega o modal (se for comentário de corrida)
            if (type === 'raceComments') {
                showRaceCommentsModal(parentId, dom.raceCommentsModalTitle.textContent.replace('Comentários: ', ''));
            }
        })
        .catch((err) => {
            console.error("Erro ao excluir comentário:", err);
            alert("Erro ao excluir.");
        });
}


// ==========================================
// SEÇÃO 7: LIGHTBOX (V8)
// ==========================================
const lightboxState = {
    images: [],
    currentIndex: 0,
    isOpen: false
};

function openLightbox(index) {
    if (index < 0 || index >= lightboxState.images.length) return;
    
    const media = lightboxState.images[index];
    lightboxState.currentIndex = index;
    lightboxState.isOpen = true;
    
    dom.lightboxImage.src = media.src;
    dom.lightboxCaption.textContent = media.caption;
    dom.lightbox.classList.remove('hidden');
    
    // Mostra/esconde setas de navegação
    dom.lightboxPrev.classList.toggle('hidden', index === 0);
    dom.lightboxNext.classList.toggle('hidden', index === lightboxState.images.length - 1);
}

function closeLightbox() {
    lightboxState.isOpen = false;
    dom.lightbox.classList.add('hidden');
    dom.lightboxImage.src = '';
    dom.lightboxCaption.textContent = '';
}

function showPrevLightbox() {
    openLightbox(lightboxState.currentIndex - 1);
}

function showNextLightbox() {
    openLightbox(lightboxState.currentIndex + 1);
}


// ==========================================
// SEÇÃO 8: RECOLHER/EXPANDIR (V13)
// ==========================================

function toggleCollapsibleSection(element, buttonElement) {
    const contentElement = element;
    const isCollapsed = contentElement.classList.toggle('collapsed');
    
    // Gira o ícone
    const icon = buttonElement.querySelector('i');
    if (icon) {
        icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
    
    // (Opcional) Salvar o estado no localStorage
    try {
        if (contentElement.id) {
            localStorage.setItem(contentElement.id + '_collapsed', isCollapsed);
        }
    } catch (e) {
        console.warn("Não foi possível salvar estado no localStorage.");
    }
}

// Carrega o estado salvo ao iniciar
function loadCollapsibleState() {
    try {
        if (localStorage.getItem(dom.toggleHistoryContent.id + '_collapsed') === 'true') {
            toggleCollapsibleSection(dom.toggleHistoryContent, dom.toggleHistoryBtn);
        }
        if (localStorage.getItem(dom.toggleCommentsContent.id + '_collapsed') === 'true') {
            toggleCollapsibleSection(dom.toggleCommentsContent, dom.toggleCommentsBtn);
        }
    } catch (e) {
        console.warn("Não foi possível ler estado do localStorage.");
    }
}

// ==========================================
// SEÇÃO 9: EVENT LISTENERS DA UI
// ==========================================
function setupEventListeners() {
    // --- Autenticação ---
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.signupForm.addEventListener('submit', handleSignUp);
    dom.btnLogout.addEventListener('click', signOutUser);
    dom.btnShowLogin.addEventListener('click', showLoginForm);
    dom.btnShowSignup.addEventListener('click', showSignupForm);
    
    // V1: Navegação (Voltar)
    const backToLoginButtons = document.querySelectorAll('.btn-back-to-login');
    backToLoginButtons.forEach(btn => btn.addEventListener('click', () => showView('loginOrPublicView')));
    dom.btnTrySignupAgain.addEventListener('click', showSignupForm); // V1: Botão de Rejeitado
    
    // --- Navegação Principal (Logado) ---
    dom.btnBackToPublic.addEventListener('click', () => {
        loadPublicData(); // Recarrega dados públicos
        showView('loginOrPublicView');
        dom.header.classList.add('hidden'); // Esconde o header
    });
    dom.btnBackToMyDashboard.addEventListener('click', () => loadUserProfile(appState.authUserId, true));

    // --- Navegação do Header (V8) ---
    if (dom.headerProfileInfo) {
        dom.headerProfileInfo.addEventListener('click', () => {
            if (appState.authUserId) {
                loadUserProfile(appState.authUserId, true); // Vai para o próprio perfil
            }
        });
    }

    // --- Navegação do Dashboard ---
    dom.profileContentBtn.addEventListener('click', () => showDashboardContent('profile'));
    dom.profileCommentsBtn.addEventListener('click', () => showDashboardContent('comments')); // V9.2
    dom.historyBtn.addEventListener('click', () => showDashboardContent('history'));
    dom.statsBtn.addEventListener('click', () => showDashboardContent('stats'));
    dom.mediaBtn.addEventListener('click', () => showDashboardContent('media'));

    // --- Filtros de Histórico ---
    dom.filterYear.addEventListener('change', () => loadUserProfile(appState.currentViewingUid));
    dom.filterStatus.addEventListener('change', () => loadUserProfile(appState.currentViewingUid));
    dom.filterRunner.addEventListener('change', () => loadUserProfile(appState.currentViewingUid));
    
    // --- Recolher/Expandir (V13) ---
    dom.toggleHistoryBtn.addEventListener('click', () => toggleCollapsibleSection(dom.toggleHistoryContent, dom.toggleHistoryBtn));
    dom.toggleCommentsBtn.addEventListener('click', () => toggleCollapsibleSection(dom.toggleCommentsContent, dom.toggleCommentsBtn));
    loadCollapsibleState(); // Carrega o estado salvo

    // --- CRUD Modal Corrida ---
    dom.btnAddRace.addEventListener('click', () => openRaceModal());
    dom.btnSaveRace.addEventListener('click', handleRaceSave);
    dom.btnDeleteRace.addEventListener('click', handleRaceDelete);
    dom.btnCloseRaceModal.addEventListener('click', closeRaceModal);
    dom.raceModalOverlay.addEventListener('click', closeRaceModal);
    dom.juntosCheckbox.addEventListener('change', (e) => {
        // Sincroniza status se "juntos" for marcado (V3.7)
        if (e.target.checked) {
            dom.raceStatusRunner2.value = dom.raceStatusRunner1.value;
        }
    });

    // --- CRUD Modal Perfil ---
    dom.btnEditProfile.addEventListener('click', openProfileModal);
    dom.profileEditForm.addEventListener('submit', handleProfileSave);
    dom.btnSaveProfile.addEventListener('click', handleProfileSave);
    dom.btnCloseProfileModal.addEventListener('click', closeProfileModal);
    dom.profileModalOverlay.addEventListener('click', closeProfileModal);
    dom.profilePictureUpload.addEventListener('change', handleProfilePictureUpload); // Upload de Foto de Perfil

    // --- CRUD Modal Mídia ---
    dom.btnAddMedia.addEventListener('click', () => openMediaUploadModal(null, "Nova Mídia")); // Botão principal
    dom.mediaUploadFile.addEventListener('change', handleMediaFileChange);
    dom.mediaUploadForm.addEventListener('submit', handleMediaUpload);
    dom.btnSubmitMedia.addEventListener('click', handleMediaUpload);
    dom.btnCloseMediaModal.addEventListener('click', closeMediaUploadModal);
    dom.mediaModalOverlay.addEventListener('click', closeMediaUploadModal);

    // --- Modal de Resultados (V9.3) ---
    // (Listener de clique é adicionado dinamicamente)
    dom.btnCloseResultsModal.addEventListener('click', () => {
        dom.resultsModal.classList.add('hidden');
        dom.resultsModalOverlay.classList.add('hidden');
    });
    dom.resultsModalOverlay.addEventListener('click', () => {
        dom.resultsModal.classList.add('hidden');
        dom.resultsModalOverlay.classList.add('hidden');
    });
    // Filtro de Nome (V9.5)
    dom.resultsModalFilterName.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = dom.resultsModalContent.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const name = (row.cells[1] ? row.cells[1].textContent.toLowerCase() : '');
            const team = (row.cells[2] ? row.cells[2].textContent.toLowerCase() : '');
            
            if (name.includes(searchTerm) || team.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // --- Ações Sociais (V9.2) ---
    dom.raceCommentsForm.addEventListener('submit', handleRaceCommentSubmit);
    dom.btnCloseRaceCommentsModal.addEventListener('click', closeRaceCommentsModal);
    dom.raceCommentsModalOverlay.addEventListener('click', closeRaceCommentsModal);
    
    dom.profileCommentsForm.addEventListener('submit', handleProfileCommentSubmit); // V9.2 (Mural)
    
    dom.btnCloseRaceLikesModal.addEventListener('click', closeRaceLikesModal);
    dom.raceLikesModalOverlay.addEventListener('click', closeRaceLikesModal);

    // --- Lightbox (V8) ---
    dom.lightboxClose.addEventListener('click', closeLightbox);
    dom.lightboxOverlay.addEventListener('click', closeLightbox);
    dom.lightboxPrev.addEventListener('click', showPrevLightbox);
    dom.lightboxNext.addEventListener('click', showNextLightbox);

    // --- Filtros de Conteúdo Público (V9.7) ---
    dom.btnShowRanking.addEventListener('click', () => showViewPublicContent('ranking'));
    dom.btnShowCopaAlcer.addEventListener('click', () => showViewPublicContent('copaAlcer'));
    dom.btnShowGeral.addEventListener('click', () => showViewPublicContent('geral'));

    // --- Listeners de Clique Dinâmico (Delegação de Eventos) ---

    // Lista Pública (clicar em um perfil)
    dom.publicListContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.public-list-item');
        if (item && item.dataset.uid) {
            loadUserProfile(item.dataset.uid);
        }
    });

    // Dashboard (Histórico e Mídia)
    dom.dashboardView.addEventListener('click', (e) => {
        
        // Botão Editar Corrida (Histórico)
        const editButton = e.target.closest('.btn-edit-race');
        if (editButton) {
            e.stopPropagation();
            openRaceModal(editButton.dataset.raceId);
            return;
        }
        
        // Botão Adicionar Mídia (Histórico)
        const addMediaButton = e.target.closest('.btn-add-media-direct');
        if (addMediaButton) {
            e.stopPropagation();
            openMediaUploadModal(addMediaButton.dataset.raceId, addMediaButton.dataset.raceName);
            return;
        }

        // Abrir Lightbox (Mídia)
        const mediaThumb = e.target.closest('.media-thumbnail');
        if (mediaThumb && mediaThumb.dataset.index) {
            // Não abrir se clicar no botão de excluir
            if (e.target.closest('.media-delete-btn')) {
                e.stopPropagation();
                handleMediaDelete(e.target.closest('.media-delete-btn').dataset.mediaId, e.target.closest('.media-delete-btn').dataset.raceId);
                return;
            }
            openLightbox(parseInt(mediaThumb.dataset.index, 10));
            return;
        }
        
        // V9.2: Ações Sociais (Likes e Comentários)
        handleSocialClicks(e);

        // V9.3: Mostrar Modal de Resultados
        const resultsButton = e.target.closest('.results-button');
        if (resultsButton) {
            e.preventDefault(); // Impede o link de navegar
            renderResultadosEtapas(resultsButton.dataset.raceId, resultsButton.dataset.raceName);
            return;
        }
        
        // Clicar em links de perfil (nos comentários)
        const profileLink = e.target.closest('[data-uid]');
        if (profileLink && (profileLink.tagName === 'STRONG' || profileLink.tagName === 'IMG')) {
            const uidToLoad = profileLink.dataset.uid;
            if (uidToLoad !== appState.currentViewingUid) {
                // Fecha modais se estiverem abertos
                closeRaceCommentsModal();
                closeRaceLikesModal();
                loadUserProfile(uidToLoad);
            }
        }
    });
    
    // View Pública (Resultados)
    dom.loginOrPublicView.addEventListener('click', (e) => {
        const resultsButton = e.target.closest('.results-button');
        if (resultsButton) {
            e.preventDefault(); // Impede o link de navegar
            renderResultadosEtapas(resultsButton.dataset.raceId, resultsButton.dataset.raceName);
            return;
        }
    });

    // Modais (Likes, Comentários)
    dom.raceCommentsModal.addEventListener('click', (e) => handleSocialClicks(e));
    dom.raceLikesModal.addEventListener('click', (e) => handleSocialClicks(e));
}

// Handler unificado para cliques sociais (V9.2)
function handleSocialClicks(e) {
    
    // Clicar no botão Like
    const likeButton = e.target.closest('.btn-like-race');
    if (likeButton) {
        e.stopPropagation();
        toggleLike(likeButton.dataset.raceId, likeButton.dataset.ownerUid, likeButton.dataset.likerPic, likeButton.dataset.likerName);
        return;
    }
    
    // Clicar na contagem de Likes (abrir modal)
    const likeCountSpan = e.target.closest('.like-count');
    if (likeCountSpan) {
        e.stopPropagation();
        const likeBtn = likeCountSpan.closest('.btn-like-race');
        if (likeBtn) {
            showRaceLikesModal(likeBtn.dataset.raceId, likeBtn.closest('.history-item').querySelector('strong').textContent);
        }
        return;
    }
    
    // Clicar no botão Comentários (abrir modal)
    const commentButton = e.target.closest('.btn-show-comments');
    if (commentButton) {
        e.stopPropagation();
        showRaceCommentsModal(commentButton.dataset.raceId, commentButton.dataset.raceName);
        return;
    }

    // Clicar em Excluir Comentário (V9.6)
    const deleteCommentButton = e.target.closest('.social-delete-comment');
    if (deleteCommentButton) {
        e.stopPropagation();
        handleDeleteComment(
            deleteCommentButton.dataset.id,
            deleteCommentButton.dataset.parentId,
            deleteCommentButton.dataset.type
        );
        return;
    }
}


// ==========================================
// SEÇÃO 10: UPLOAD DE FOTO DE PERFIL (V5.1)
// ==========================================
// (Esta é uma função separada do upload de mídia de corrida)

function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // (V10) Verifica se as chaves do Cloudinary existem
    if (typeof CLOUDINARY_CLOUD_NAME === "undefined" || !CLOUDINARY_CLOUD_NAME ||
        typeof CLOUDINARY_UNSIGNED_PRESET === "undefined" || !CLOUDINARY_UNSIGNED_PRESET) {
            
        console.error("Erro: Configuração do Cloudinary não encontrada.");
        alert("Erro: A função de upload não está configurada. (CLOUDINARY not found)");
        return;
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET);
    
    // (V9.6) Aplica transformação para foto de perfil (quadrada, 300x300)
    formData.append('tags', 'profile_pic');
    // As transformações podem ser aplicadas no upload, mas é mais fácil aplicar na entrega.
    // Vamos apenas fazer o upload simples.

    dom.profilePictureProgress.style.width = '0%';
    dom.profilePictureProgress.classList.remove('hidden');

    // Simula progresso
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        dom.profilePictureProgress.style.width = `${progress}%`;
        if (progress >= 90) clearInterval(interval);
    }, 100);

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(interval);
        dom.profilePictureProgress.style.width = '100%';
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        console.log("Upload da foto de perfil concluído:", data);
        
        // (V9.6) Cria uma URL de thumbnail quadrada
        const thumbnailUrl = data.secure_url.replace('/upload/', '/upload/c_thumb,w_300,h_300,g_face/');
        
        // Atualiza o campo de URL no formulário
        dom.profilePictureUrl.value = thumbnailUrl;
        
        setTimeout(() => {
            dom.profilePictureProgress.classList.add('hidden');
            dom.profilePictureProgress.style.width = '0%';
        }, 1000);
    })
    .catch((error) => {
        clearInterval(interval);
        console.error("Erro no upload da foto de perfil:", error);
        alert(`Erro no upload: ${error.message}`);
        dom.profilePictureProgress.classList.add('hidden');
    });
}

}

{
type: uploaded file
fileName: estrutura.zip/HistoricoRunner-main/css/styles-v2.css
fullContent:
/* ================================================= */
/* ESTILIZAÇÃO V2 (Layout Público V9.1)              */
/* ================================================= */

/* --- Títulos --- */
.section-title {
    font-size: 2.25rem; /* 36px */
    font-weight: 800; /* Extra-bold */
    text-align: center;
    margin-bottom: 3rem; /* 48px */
    color: white;
}

.text-blue-highlight {
    color: #60a5fa; /* Azul claro */
}

/* --- Grid do Calendário --- */
.calendar-grid {
    display: grid;
    /* Cria colunas responsivas: 
       - Tenta encaixar o máximo de colunas com 350px
       - Se não couber, cria uma coluna única de 1fr (100%)
    */
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
    margin-bottom: 40px; /* Espaço após cada grid */
}

/* --- Card de Corrida (Layout V2) --- */
.v2-race-card {
    background-color: #2a2a3a; /* #27272a no Tailwind (zinc-800) */
    border-radius: 0.75rem; /* 12px */
    box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);
    transition: all 0.2s ease-out;
    border: 1px solid #444; /* #52525b (zinc-600) */
    display: flex;
    overflow: hidden; /* Garante que os cantos arredondados funcionem */
}

.v2-race-card:hover {
    transform: translateY(-5px);
    border-color: #60a5fa; /* Azul ao passar o mouse */
}

/* --- Data (Lado Esquerdo) --- */
.v2-race-date {
    background-color: #60a5fa; /* Azul */
    color: white;
    padding: 1rem; /* 16px */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 90px; /* Largura mínima */
    text-align: center;
}

.v2-race-date-day {
    font-size: 2rem; /* 32px */
    font-weight: 700; /* Bold */
    line-height: 1; /* Remove altura extra da linha */
}

.v2-race-date-month {
    font-size: 1rem; /* 16px */
    font-weight: 600; /* Semi-bold */
}

/* --- Infos (Lado Direito) --- */
.v2-race-info {
    padding: 1rem; /* 16px */
    display: flex;
    flex-direction: column;
    justify-content: space-between; /* Empurra botões para baixo */
    flex-grow: 1; /* Ocupa o espaço restante */
}

.v2-race-info h3 {
    font-weight: bold;
    font-size: 1.2em;
    color: white;
}

.v2-race-info p {
    font-size: 0.9em;
    color: #b0b0b0; /* #a1a1aa (zinc-400) */
}

.v2-race-buttons {
    display: flex;
    gap: 0.5rem; /* 8px */
    margin-top: 1rem; /* 16px */
}

/* --- Botões de Ação --- */
.v2-results-button,
.v2-race-button-disabled,
.v2-inscricoes-button,
.v2-add-personal-button { /* V9.1 */
    text-align: center;
    font-weight: 600;
    padding: 0.5rem 1rem; /* 8px 16px */
    border-radius: 0.375rem; /* 6px */
    font-size: 0.875rem; /* 14px */
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    text-decoration: none; /* Para o <a> */
}

/* Botão Resultados */
.v2-results-button {
    background-color: #ca8a04; /* Amarelo-escuro */
    color: white;
}
.v2-results-button:hover {
    background-color: #a16207;
}

/* Botão Inscrições */
.v2-inscricoes-button {
    background-color: #16a34a; /* Verde */
    color: white;
}
.v2-inscricoes-button:hover {
    background-color: #15803d;
}

/* Botão Adicionar ao Histórico (V9.1) */
.v2-add-personal-button {
    background-color: #007bff; /* Azul (diferente do verde) */
    color: white;
}
.v2-add-personal-button:hover {
    background-color: #0056b3;
}


/* Botão Desabilitado */
.v2-race-button-disabled {
    background-color: #4b5563; /* Cinza-escuro */
    color: #9ca3af; /* Cinza-claro */
    cursor: not-allowed;
}


/* ================================================= */
/* MODAL DE RESULTADOS (V2)                          */
/* ================================================= */

/* Overlay */
.v2-modal-overlay {
    position: fixed;
    inset: 0; /* (top, right, bottom, left = 0) */
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
    transition: opacity 0.3s ease;
}

.v2-modal-overlay.hidden {
    display: none;
    opacity: 0;
}

/* Conteúdo do Modal */
.v2-modal-content {
    background: #2a2a3a;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 900px;
    max-height: 90vh; /* Limita a altura */
    display: flex;
    flex-direction: column;
    border: 1px solid #555;
    position: relative;
}

/* Botão de Fechar */
.v2-modal-close-btn {
    position: absolute;
    top: 15px;
    right: 20px;
    background: none;
    border: none;
    color: #b0b0b0;
    font-size: 2rem;
    cursor: pointer;
    z-index: 10;
}
.v2-modal-close-btn:hover { color: white; }

/* Header do Modal */
.v2-modal-header {
    padding: 20px 30px;
    background: #1f2027;
    border-bottom: 1px solid #444;
}
.v2-modal-title {
    font-size: 1.8em;
    font-weight: 700;
    color: #c5cae9;
}

/* Corpo do Modal */
.v2-modal-body {
    padding: 20px 30px;
    overflow-y: auto; /* Permite scroll se o conteúdo for maior */
    flex-grow: 1; /* Ocupa o espaço disponível */
}

/* Tabela de Resultados (V2) */
.v2-modal-category-title {
    font-size: 1.5rem; /* 24px */
    font-weight: 700; /* Bold */
    color: #60a5fa; /* Azul claro */
    margin-top: 1.5rem; /* 24px */
    margin-bottom: 1rem; /* 16px */
    padding-bottom: 0.5rem; /* 8px */
    border-bottom: 1px solid #444;
}

.v2-results-table {
    width: 100%;
    text-align: left;
    font-size: 0.9em;
}

.v2-results-table thead {
    background-color: #333345;
    color: #b0b0b0;
    font-size: 0.8em;
    text-transform: uppercase;
}

.v2-results-table th,
.v2-results-table td {
    padding: 10px 15px;
}

.v2-results-table tbody tr {
    border-bottom: 1px solid #444;
}

.v2-results-table tbody tr:hover {
    background-color: #333345;
}

/* Responsividade do Modal */
@media (max-width: 768px) {
    .v2-modal-content {
        width: 100%;
        max-width: 100%;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
    }
}

}

{
type: uploaded file
fileName: estrutura.zip/HistoricoRunner-main/manifest.json
fullContent:
{
  "name": "Currículo de Corredores",
  "short_name": "Corri 🏃🏻‍♂️🏃🏽‍♀️",
  "description": "Sua rede social para históricos e resultados de corridas de rua.",
  "start_url": "index.html",
  "display": "standalone",
  "background_color": "#1f2027",
  "theme_color": "#007bff",
  "orientation": "portrait-primary",
  "scope": ".",
  "icons": [
    {
      "src": "icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
