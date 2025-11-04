// =================================================================
// ARQUIVO DE LÓGICA PRINCIPAL (V9.2 - Estrutura BD Separada + Layout + Add Corrida Pública + Correções)
// ATUALIZADO (V9.3) COM TAREFAS 2 (Excluir Mídia) e 3 (Ver Classificação)
// CORREÇÃO (V9.4) DO ERRO 'sort' of undefined em openMediaUploadModal
// ATUALIZADO (V9.5) COM TAREFA 4 (Exibição de Faixa Etária nos Resultados)
// CORREÇÃO (V9.5.1) DE ERRO DE DIGITAÇÃO NA DECLARAÇÃO 'dom' (getElementById_TODO_REVISAR)
// CORREÇÃO (V9.5.2) DE "RACE CONDITION" EM loadUserProfile (db.profile undefined)
// =================================================================

// --- Variáveis Globais do App ---\
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

// V3.7: Nomes dos Corredores (para os botões)
let RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Cor1', emoji: '🏃‍♂️' };
let RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Cor2', emoji: '🏃‍♀️' };

// V3.7: Chaves de status de corrida
const STATUS_COMPLETED = 'completed';
const STATUS_PLANNED = 'planned';
const STATUS_SKIPPED = 'skipped';


// --- Cache de Elementos DOM ---
const dom = {
    // V1 - Autenticação
    appLoading: document.getElementById('app-loading'),
    loginOrPublicView: document.getElementById('login-or-public-view'),
    loginView: document.getElementById('login-view'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    loginTitle: document.getElementById('login-title'),
    btnLoginSubmit: document.getElementById('btn-login-submit'),
    btnShowSignUp: document.getElementById('btn-show-signup'),
    btnShowLogin: document.getElementById('btn-show-login'),
    signUpView: document.getElementById('signup-view'),
    signUpForm: document.getElementById('signup-form'),
    signUpEmail: document.getElementById('signup-email'),
    signUpPassword: document.getElementById('signup-password'),
    signUpRunner1Name: document.getElementById('signup-runner1-name'),
    signUpRunner2Name: document.getElementById('signup-runner2-name'),
    signUpTeamName: document.getElementById('signup-team-name'),
    signUpError: document.getElementById('signup-error'),
    btnSignUpSubmit: document.getElementById('btn-signup-submit'),
    
    // V1 - Status (Pendente/Rejeitado)
    pendingView: document.getElementById('pending-view'),
    rejectedView: document.getElementById('rejected-view'),
    rejectedEmailText: document.getElementById('rejected-email-text'),
    btnTrySignUpAgain: document.getElementById('btn-try-signup-again'),

    // V1 - Navegação Principal
    btnLogout: document.getElementById('btn-logout'),
    btnBackToPublic: document.getElementById('btn-back-to-public'),
    btnBackToMyDashboard: document.getElementById('btn-back-to-my-dashboard'),
    userDashboard: document.getElementById('user-dashboard'),
    publicListView: document.getElementById('public-list-view'),
    userEmail: document.getElementById('user-email'), // V8: Movido para cá
    
    // V1 - Cabeçalho (V8: Movido para cá)
    header: document.querySelector('.header'),
    headerProfileInfo: document.getElementById('profile-header-info'),
    headerProfilePicture: document.getElementById('header-profile-picture'),
    headerProfileName: document.getElementById('header-profile-name'),
    headerProfileTeam: document.getElementById('header-profile-team'),

    // V1 - Lista Pública
    publicListContainer: document.getElementById('public-list-container'),
    searchInput: document.getElementById('search-input'),

    // V1 - Dashboard do Usuário
    profileSection: document.getElementById('profile-section'),
    profileName: document.getElementById('profile-name'),
    profileTeam: document.getElementById('profile-team'),
    profileBio: document.getElementById('profile-bio'),
    profileLocation: document.getElementById('profile-location'),
    profileBirthdate: document.getElementById('profile-birthdate'),
    profilePicture: document.getElementById('profile-picture'),
    profileStats: document.getElementById('profile-stats'),
    btnEditProfile: document.getElementById('btn-edit-profile'),
    
    // V1 - Histórico de Corridas
    historySection: document.getElementById('history-section'),
    historyList: document.getElementById('history-list'),
    historyTotal: document.getElementById('history-total'),
    historyFilters: document.getElementById('history-filters'),
    filterYear: document.getElementById('filter-year'),
    filterStatus: document.getElementById('filter-status'),
    filterRunner: document.getElementById('filter-runner'),
    btnAddRace: document.getElementById('btn-add-race'),
    
    // V2 - Seção Pública (Ranking e Calendário)
    publicContentSection: document.getElementById('public-content-section'),
    publicContentTitle: document.getElementById('public-content-title'),
    publicContentFilters: document.getElementById('public-content-filters'),
    publicContentContainer: document.getElementById('public-content-container'),
    btnShowRanking: document.getElementById('btn-show-ranking'),
    btnShowCopaAlcer: document.getElementById('btn-show-copa-alcer'),
    btnShowGeral: document.getElementById('btn-show-geral'),

    // V4/V5/V8/V9 - Modais
    modalOverlay: document.getElementById('modal-overlay'),
    
    // V1 - Modal de Corrida (CRUD)
    raceModal: document.getElementById('race-modal'),
    raceModalTitle: document.getElementById('race-modal-title'),
    raceForm: document.getElementById('race-form'),
    raceId: document.getElementById('race-id'),
    raceName: document.getElementById('race-name-modal'),
    raceDate: document.getElementById('race-date-modal'),
    raceDistance: document.getElementById('race-distance'),
    // (V9.5.1)
    raceNotes: document.getElementById('race-notes'), // Corrigido
    
    // V3.7 - Status da Corrida (Runners 1 e 2)
    raceStatusRunner1: document.getElementById('race-status-runner1'),
    raceTimeRunner1: document.getElementById('race-time-runner1'),
    raceStatusRunner2: document.getElementById('race-status-runner2'),
    raceTimeRunner2: document.getElementById('race-time-runner2'),
    runner1Fields: document.getElementById('runner1-fields'),
    runner2Fields: document.getElementById('runner2-fields'),
    runner1Label: document.getElementById('runner1-label'),
    runner2Label: document.getElementById('runner2-label'),
    juntosCheckboxContainer: document.getElementById('juntos-checkbox-container'),
    juntosCheckbox: document.getElementById('juntos-checkbox'),
    
    btnSaveRace: document.getElementById('btn-save-race'),
    btnDeleteRace: document.getElementById('btn-delete-race'),
    btnCloseRaceModal: document.getElementById('btn-close-race-modal'),

    // V1 - Modal de Edição de Perfil
    profileEditModal: document.getElementById('profile-edit-modal'),
    profileEditForm: document.getElementById('profile-edit-form'),
    profileRunner1Name: document.getElementById('profile-runner1-name'),
    profileRunner2Name: document.getElementById('profile-runner2-name'),
    profileTeamName: document.getElementById('profile-team-name'),
    profileBioEdit: document.getElementById('profile-bio-edit'),
    profileLocationEdit: document.getElementById('profile-location-edit'),
    profileBirthdateEdit: document.getElementById('profile-birthdate-edit'),
    profilePictureUrl: document.getElementById('profile-picture-url'),
    profilePictureUpload: document.getElementById('profile-picture-upload'),
    profilePictureProgress: document.getElementById('profile-picture-progress'),
    btnSaveProfile: document.getElementById('btn-save-profile'),
    btnCloseProfileModal: document.getElementById('btn-close-profile-modal'),

    // V2 - Modal de Resultados da Etapa (V9.3: Atualizado)
    raceResultsModal: document.getElementById('v2-modal-race-results'),
    raceResultsTitle: document.getElementById('v2-modal-title'),
    raceResultsFilters: document.getElementById('v2-modal-filters'),
    raceResultsFilterName: document.getElementById('v2-modal-filter-name'),
    raceResultsContent: document.getElementById('v2-modal-content'),
    raceResultsCloseBtn: document.getElementById('v2-modal-close'),

    // V5 - Modal de Mídia (Upload) (V9.4: Corrigido)
    mediaUploadModal: document.getElementById('media-upload-modal'),
    mediaUploadForm: document.getElementById('media-upload-form'),
    mediaRaceIdInput: document.getElementById('media-race-id'),
    mediaRaceNameText: document.getElementById('media-race-name'),
    mediaFileInput: document.getElementById('media-file-input'),
    mediaUploadProgress: document.getElementById('media-upload-progress'),
    mediaUploadPreview: document.getElementById('media-upload-preview'),
    mediaUploadError: document.getElementById('media-upload-error'),
    mediaListContainer: document.getElementById('media-list-container'), // V9.4
    btnSubmitMedia: document.getElementById('btn-submit-media'),
    btnCloseMediaModal: document.getElementById('btn-close-media-modal'),

    // V8 - Lightbox
    lightbox: document.getElementById('lightbox-overlay'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxCaption: document.getElementById('lightbox-caption'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),

    // V9.2 - Seção de Comentários (Mural)
    profileCommentsSection: document.getElementById('profile-comments-section'),
    profileCommentsList: document.getElementById('profile-comments-list'),
    profileCommentsForm: document.getElementById('profile-comments-form'),
    profileCommentText: document.getElementById('profile-comment-text'),
    btnSubmitProfileComment: document.getElementById('btn-submit-profile-comment'),
    
    // V9.2 - Modal de Comentários (Corrida)
    raceCommentsModal: document.getElementById('race-comments-modal'),
    raceCommentsTitle: document.getElementById('race-comments-modal-title'),
    raceCommentsList: document.getElementById('race-comments-modal-list'),
    raceCommentsForm: document.getElementById('race-comments-modal-form'),
    raceCommentText: document.getElementById('race-comment-text'),
    raceCommentRaceId: document.getElementById('race-comment-race-id'),
    raceCommentOwnerUid: document.getElementById('race-comment-owner-uid'),
    btnSubmitRaceComment: document.getElementById('btn-submit-race-comment'),
    btnCloseRaceCommentsModal: document.getElementById('btn-close-race-comments-modal'),

    // V9.2 - Modal de Likes (Corrida)
    raceLikesModal: document.getElementById('race-likes-modal'),
    raceLikesTitle: document.getElementById('race-likes-modal-title'),
    raceLikesList: document.getElementById('race-likes-modal-list'),
    btnCloseRaceLikesModal: document.getElementById('btn-close-race-likes-modal'),

    // V13 - Alternador de Seção (Recolher/Expandir)
    toggleHistoryBtn: document.getElementById('toggle-history-btn'),
    toggleHistoryContent: document.getElementById('history-content-collapsible'),
    toggleCommentsBtn: document.getElementById('toggle-comments-btn'),
    toggleCommentsContent: document.getElementById('comments-content-collapsible')
};


// --- Inicialização do App ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o Firebase
    try {
        if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey) {
            throw new Error("FIREBASE_CONFIG não encontrado. Verifique o config.js");
        }
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        database = firebase.database();
        auth = firebase.auth();
        functions = firebase.functions(); // V9.2
        
        // Inicia o listener de autenticação
        setupAuthListener();
        
        // Inicializa os listeners de UI (modais, etc)
        setupEventListeners();

        // Carrega os dados públicos (Corridas, Ranking)
        loadPublicData();

    } catch (error) {
        console.error("Erro fatal na inicialização:", error.message);
        dom.appLoading.innerHTML = `Erro fatal. Verifique o console. Detalhe: ${error.message}`;
        dom.appLoading.classList.remove('hidden');
    }
});

// =================================================================
// SEÇÃO 1: AUTENTICAÇÃO E FLUXO DE VISUALIZAÇÃO
// =================================================================

// --- Setup do Listener Principal de Autenticação ---
function setupAuthListener() {
    auth.onAuthStateChanged((user) => {
        dom.appLoading.classList.remove('hidden'); // Mostra o loader durante a verificação
        
        // Limpa listeners antigos para evitar duplicação
        cleanupListeners();

        if (user) {
            // --- USUÁRIO LOGADO ---
            authUser = user;
            
            // 1. Ele é Admin?
            database.ref('/admins/' + user.uid).once('value', (adminSnapshot) => {
                isAdmin = adminSnapshot.exists() && adminSnapshot.val() === true;

                // 2. Ele existe na lista de usuários APROVADOS?
                database.ref('/users/' + user.uid).once('value', (userSnapshot) => {
                    
                    if (userSnapshot.exists() || isAdmin) {
                        // --- CASO 1: APROVADO ou ADMIN ---
                        showUserDashboard(user);
                        
                        // Se for admin, inicializa o painel de admin
                        if (isAdmin && typeof initializeAdminPanel === 'function') {
                            initializeAdminPanel(user.uid, database);
                        }

                    } else {
                        // --- CASO 2: NÃO APROVADO ---
                        // 3. Ele está na lista de PENDENTES?
                        database.ref('/pendingApprovals/' + user.uid).once('value', (pendingSnapshot) => {
                            if (pendingSnapshot.exists()) {
                                // --- CASO 2a: PENDENTE ---
                                showPendingView();
                            } else {
                                // --- CASO 2b: REJEITADO/EXCLUÍDO ---
                                showRejectedView(user.email);
                            }
                        }, (error) => { // Tratamento de Erro (Regras de Segurança)
                            if(error.code === "PERMISSION_DENIED") {
                                console.error("ERRO DE REGRAS: Verifique as regras de leitura em /pendingApprovals.");
                                signOut(); 
                                alert("Erro de configuração. Contate o administrador.");
                            } else {
                                console.error("Erro ao verificar pendingApprovals:", error);
                                signOut(); 
                                alert("Erro ao verificar seu status. Tente novamente.");
                            }
                        });
                    }
                });
            });

        } else {
            // --- USUÁRIO DESLOGADO ---
            authUser = null;
            isAdmin = false;
            showLoggedOutView();
        }
    });
}

// --- Funções de Troca de View (Gerenciamento de Estado da UI) ---

function showView(viewToShow) {
    // Esconde todas as views principais
    dom.loginOrPublicView.classList.add('hidden');
    dom.userDashboard.classList.add('hidden');
    dom.pendingView.classList.add('hidden');
    dom.rejectedView.classList.add('hidden');
    
    // Esconde sub-views do dashboard
    dom.profileSection.classList.add('hidden');
    dom.historySection.classList.add('hidden');
    dom.publicListView.classList.add('hidden');
    dom.publicContentSection.classList.add('hidden');
    
    // Esconde botões de navegação
    dom.btnBackToPublic.classList.add('hidden');
    dom.btnBackToMyDashboard.classList.add('hidden');
    dom.btnLogout.classList.add('hidden');
    dom.headerProfileInfo.classList.add('hidden'); // V8

    // Mostra a view solicitada
    if (viewToShow === 'login') {
        dom.loginOrPublicView.classList.remove('hidden');
        dom.loginView.classList.remove('hidden');
        dom.signUpView.classList.add('hidden');
        dom.loginTitle.textContent = "Login";
    } else if (viewToShow === 'signup') {
        dom.loginOrPublicView.classList.remove('hidden');
        dom.loginView.classList.add('hidden');
        dom.signUpView.classList.remove('hidden');
        dom.loginTitle.textContent = "Cadastro";
    } else if (viewToShow === 'dashboard') {
        dom.userDashboard.classList.remove('hidden');
        dom.profileSection.classList.remove('hidden');
        dom.historySection.classList.remove('hidden');
        dom.btnLogout.classList.remove('hidden');
        dom.headerProfileInfo.classList.remove('hidden'); // V8
    } else if (viewToShow === 'publicList') {
        dom.userDashboard.classList.remove('hidden');
        dom.publicListView.classList.remove('hidden');
        dom.btnLogout.classList.remove('hidden');
        dom.btnBackToMyDashboard.classList.remove('hidden');
    } else if (viewToShow === 'pending') {
        dom.pendingView.classList.remove('hidden');
        dom.btnLogout.classList.remove('hidden');
    } else if (viewToShow === 'rejected') {
        dom.rejectedView.classList.remove('hidden');
        dom.btnLogout.classList.remove('hidden');
    } else if (viewToShow === 'publicContent') { // V2
        dom.userDashboard.classList.remove('hidden');
        dom.publicContentSection.classList.remove('hidden');
        dom.btnLogout.classList.remove('hidden');
        dom.btnBackToMyDashboard.classList.remove('hidden');
    }

    dom.appLoading.classList.add('hidden'); // Esconde o loader
}

// --- Funções de Ação de Autenticação (Login, Logout, SignUp) ---

function handleLogin(e) {
    e.preventDefault();
    const email = dom.loginEmail.value;
    const password = dom.loginPassword.value;
    
    setLoadingState(dom.btnLoginSubmit, true, "Aguarde...");

    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            console.error("Erro no Login:", error.code);
            let msg = "Erro desconhecido.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = "E-mail ou senha incorretos.";
            }
            dom.loginError.textContent = msg;
            dom.loginError.classList.remove('hidden');
            setLoadingState(dom.btnLoginSubmit, false, "Login");
        });
}

function handleSignUp(e) {
    e.preventDefault();
    const email = dom.signUpEmail.value;
    const password = dom.signUpPassword.value;
    const runner1Name = dom.signUpRunner1Name.value.trim();
    const runner2Name = dom.signUpRunner2Name.value.trim();
    const teamName = dom.signUpTeamName.value.trim();

    if (runner1Name.length < 3) {
        dom.signUpError.textContent = "O Nome do Corredor 1 é obrigatório.";
        dom.signUpError.classList.remove('hidden');
        return;
    }
    
    setLoadingState(dom.btnSignUpSubmit, true, "Registrando...");

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Cria a solicitação de aprovação
            const approvalData = {
                email: user.email,
                runner1Name: runner1Name,
                runner2Name: runner2Name || "",
                teamName: teamName || "Equipe",
                requestDate: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Salva em /pendingApprovals/UID
            return database.ref('pendingApprovals/' + user.uid).set(approvalData);
        })
        .then(() => {
            // O usuário é criado mas logado automaticamente.
            // O onAuthStateChanged vai detectar e direcioná-lo para a tela 'pending'.
            console.log("Usuário registrado e aguardando aprovação.");
        })
        .catch((error) => {
            console.error("Erro no Cadastro:", error.code);
            let msg = "Erro desconhecido. Tente novamente.";
            if (error.code === 'auth/email-already-in-use') {
                msg = "Este e-mail já está em uso.";
            } else if (error.code === 'auth/weak-password') {
                msg = "A senha deve ter pelo menos 6 caracteres.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Formato de e-mail inválido.";
            }
            dom.signUpError.textContent = msg;
            dom.signUpError.classList.remove('hidden');
            setLoadingState(dom.btnSignUpSubmit, false, "Registrar");
        });
}

function signOut() {
    // V9.2: Limpa listeners antes de deslogar
    cleanupListeners();
    auth.signOut();
}

// --- Funções de View Específicas ---

function showLoggedOutView() {
    currentViewingUid = null;
    dom.loginForm.reset();
    dom.signUpForm.reset();
    dom.loginError.classList.add('hidden');
    dom.signUpError.classList.add('hidden');
    setLoadingState(dom.btnLoginSubmit, false, "Login");
    setLoadingState(dom.btnSignUpSubmit, false, "Registrar");
    showView('login');
}

function showUserDashboard(user) {
    dom.userEmail.textContent = `Logado como: ${user.email} ${isAdmin ? '(Admin)' : ''}`;
    loadUserProfile(user.uid); // Carrega o perfil do PRÓPRIO usuário
    showView('dashboard');
}

function showPendingView() {
    showView('pending');
}

function showRejectedView(email) {
    dom.rejectedEmailText.textContent = email;
    showView('rejected');
}

function showPublicListView() {
    loadPublicList();
    showView('publicList');
}

// =================================================================
// SEÇÃO 2: LÓGICA DE DADOS (CARREGAMENTO E RENDERIZAÇÃO)
// =================================================================

// =================================================================
// INÍCIO DA ALTERAÇÃO (V9.5.2) - CORREÇÃO DO RACE CONDITION
// =================================================================
function loadUserProfile(uid) {
    // Se já estamos vendo esse perfil, não recarrega
    if (currentViewingUid === uid) {
        showView('dashboard');
        dom.appLoading.classList.add('hidden');
        return;
    }
    
    // Limpa listeners antigos
    cleanupListeners();
    
    currentViewingUid = uid;
    dom.appLoading.classList.remove('hidden');

    // Define quem pode editar
    const canEdit = (authUser && authUser.uid === uid) || isAdmin;
    dom.btnEditProfile.classList.toggle('hidden', !canEdit);
    dom.btnAddRace.classList.toggle('hidden', !canEdit);
    
    // V9.2 - Define quem pode postar no mural
    dom.profileCommentsForm.classList.toggle('hidden', !authUser);
    
    // Define os botões de navegação
    if (authUser && authUser.uid === uid) {
        // Vendo o próprio perfil
        dom.btnBackToPublic.classList.add('hidden');
        dom.btnBackToMyDashboard.classList.add('hidden');
    } else {
        // Vendo o perfil de outro
        dom.btnBackToPublic.classList.remove('hidden');
        dom.btnBackToMyDashboard.classList.add('hidden');
    }

    // --- CORREÇÃO V9.5.2 ---
    // 1. Carrega os dados do perfil (profile) PRIMEIRO
    const profileRef = database.ref(`/users/${uid}/profile`);
    profileRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.error(`Perfil ${uid} não encontrado em /users/`);
            if (authUser && authUser.uid === uid) signOut(); 
            else showPublicListView(); 
            return;
        }
        db.profile = snapshot.val() || {};
        renderProfile(db.profile); // Renderiza o perfil
        dom.appLoading.classList.add('hidden');
        
        // 2. SOMENTE APÓS o perfil ser carregado (db.profile estar definido),
        // carregamos os dados das corridas (races)
        const racesRef = database.ref(`/users/${uid}/races`);
        racesRef.on('value', (snapshot) => {
            db.races = snapshot.val() || {};
            renderHistory(db.races); // Renderiza o histórico
            renderStats(db.races); // Renderiza as estatísticas
        }, (error) => {
            console.error("Erro ao carregar corridas:", error);
        });

        // 3. Carrega os comentários do perfil (mural)
        // (Isso pode rodar em paralelo, não depende de db.profile)
        loadProfileComments(uid);

    }, (error) => {
        console.error("Erro ao carregar perfil:", error);
        dom.appLoading.classList.add('hidden');
    });
}
// =================================================================
// FIM DA ALTERAÇÃO (V9.5.2)
// =================================================================

// --- Carregamento da Lista Pública ---
function loadPublicList() {
    dom.appLoading.classList.remove('hidden');
    dom.publicListContainer.innerHTML = '';
    
    // Define o botão "Voltar"
    if (authUser) {
        dom.btnBackToMyDashboard.classList.remove('hidden');
    } else {
        dom.btnBackToMyDashboard.classList.add('hidden');
    }

    database.ref('/publicProfiles').once('value', (snapshot) => {
        const profiles = snapshot.val();
        if (!profiles) {
            dom.publicListContainer.innerHTML = '<p>Nenhum corredor encontrado.</p>';
            dom.appLoading.classList.add('hidden');
            return;
        }
        
        // V8: Pré-processa a lista para a busca
        window.allPublicProfiles = Object.entries(profiles).map(([uid, profile]) => ({
            uid, ...profile
        }));
        
        renderPublicList(window.allPublicProfiles);
        dom.appLoading.classList.add('hidden');

    }, (error) => {
        console.error("Erro ao carregar lista pública:", error);
        dom.publicListContainer.innerHTML = '<p>Erro ao carregar corredores.</p>';
        dom.appLoading.classList.add('hidden');
    });
}

// --- Carregamento de Dados Públicos (V2) ---
function loadPublicData() {
    // 1. Corridas (Calendários)
    database.ref('corridas').on('value', snapshot => {
        appState.allCorridas = snapshot.val() || { copaAlcer: {}, geral: {} };
        // Se a view pública estiver aberta, atualiza
        if (!dom.publicContentSection.classList.contains('hidden')) {
            const activeFilter = dom.publicContentFilters.querySelector('button.active');
            if (activeFilter) {
                if (activeFilter.id === 'btn-show-copa-alcer') renderPublicCalendar(appState.allCorridas.copaAlcer, 'Copa Alcer');
                if (activeFilter.id === 'btn-show-geral') renderPublicCalendar(appSTATE.allCorridas.geral, 'Calendário Geral');
            }
        }
    });

    // 2. Ranking
    database.ref('rankingCopaAlcer').on('value', snapshot => {
        appState.rankingData = snapshot.val() || {};
        if (!dom.publicContentSection.classList.contains('hidden') && 
             dom.publicContentFilters.querySelector('#btn-show-ranking.active')) {
            renderRanking(appState.rankingData);
        }
    });

    // 3. Resultados das Etapas
    database.ref('resultadosEtapas').on('value', snapshot => {
        appState.resultadosEtapas = snapshot.val() || {};
        // Não precisa renderizar nada agora, só armazena
    });
}


// --- Renderização do Perfil ---
function renderProfile(profile) {
    // V3.7: Atualiza as variáveis globais de nome
    RUNNER_1_PROFILE.name = profile.runner1Name || 'Corredor 1';
    RUNNER_1_PROFILE.nameShort = profile.runner1Name ? profile.runner1Name.split(' ')[0] : 'Cor1';
    
    // V8: Atualiza o cabeçalho
    dom.headerProfilePicture.src = profile.profilePictureUrl || 'icons/icon-192x192.png';
    dom.headerProfileName.textContent = RUNNER_1_PROFILE.name;
    
    let runner2Name = profile.runner2Name || '';
    hasRunner2 = runner2Name.length > 0;
    
    if (hasRunner2) {
        RUNNER_2_PROFILE.name = runner2Name;
        RUNNER_2_PROFILE.nameShort = runner2Name.split(' ')[0];
        dom.profileName.textContent = `${RUNNER_1_PROFILE.name} & ${RUNNER_2_PROFILE.name}`;
        dom.headerProfileName.textContent = `${RUNNER_1_PROFILE.nameShort} & ${RUNNER_2_PROFILE.nameShort}`;
    } else {
        RUNNER_2_PROFILE.name = 'Corredora 2';
        RUNNER_2_PROFILE.nameShort = 'Cor2';
        dom.profileName.textContent = RUNNER_1_PROFILE.name;
    }
    
    dom.profileTeam.textContent = profile.teamName || 'Equipe';
    dom.headerProfileTeam.textContent = profile.teamName || 'Equipe'; // V8
    
    dom.profileBio.textContent = profile.bio || 'Sem biografia.';
    dom.profileLocation.textContent = profile.location || 'Localização não informada.';
    
    if (profile.birthdate) {
        try {
            // Formata a data (YYYY-MM-DD) para (DD/MM/YYYY)
            const [year, month, day] = profile.birthdate.split('-');
            dom.profileBirthdate.textContent = `Nascimento: ${day}/${month}/${year}`;
        } catch (e) {
            dom.profileBirthdate.textContent = 'Data inválida.';
        }
    } else {
        dom.profileBirthdate.textContent = 'Data de nascimento não informada.';
    }
    
    dom.profilePicture.src = profile.profilePictureUrl || 'icons/icon-192x192.png';

    // V3.7: Atualiza os filtros e modais
    updateRunnerFiltersAndForms();
}

// --- Renderização do Histórico de Corridas ---
function renderHistory(races) {
    dom.historyList.innerHTML = '';
    dom.historyTotal.textContent = `Total: 0 corridas`;
    
    // V9.2: Limpa listeners de likes/comentários de corridas
    Object.values(currentRaceLikesListeners).forEach(ref => ref.off());
    currentRaceLikesListeners = {};
    Object.values(currentRaceCommentsListeners).forEach(ref => ref.off());
    currentRaceCommentsListeners = {};


    if (Object.keys(races).length === 0) {
        dom.historyList.innerHTML = '<li class="history-item-empty">Nenhuma corrida registrada.</li>';
        return;
    }

    const filteredRaces = filterRaces(races);
    const raceCount = filteredRaces.length;
    dom.historyTotal.textContent = `Exibindo: ${raceCount} ${raceCount === 1 ? 'corrida' : 'corridas'}`;

    if (raceCount === 0) {
        dom.historyList.innerHTML = '<li class="history-item-empty">Nenhuma corrida encontrada para este filtro.</li>';
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredRaces.forEach(([raceId, race]) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.dataset.raceId = raceId;

        const canEdit = (authUser && authUser.uid === currentViewingUid) || isAdmin;

        // Formata a Data (YYYY-MM-DD -> DD/MM)
        const [year, month, day] = race.date.split('-');
        const formattedDate = `${day}/${month}/${year}`;

        // V3.7: Status dos Corredores
        const r1_status = race.runner1 ? race.runner1.status : STATUS_PLANNED;
        const r1_time = race.runner1 && race.runner1.time ? `(${race.runner1.time})` : '';
        let r2_html = '';
        if (hasRunner2) {
            const r2_status = race.runner2 ? race.runner2.status : STATUS_PLANNED;
            const r2_time = race.runner2 && race.runner2.time ? `(${race.runner2.time})` : '';
            r2_html = `<span class="runner-status status-${r2_status}">${RUNNER_2_PROFILE.nameShort} ${r2_time}</span>`;
        }
        
        // V5: Mídia
        const mediaCount = race.media ? Object.keys(race.media).length : 0;
        
        // V9.2: Likes e Comentários (IDs únicos para os contadores)
        const likeCountId = `like-count-${raceId}`;
        const commentCountId = `comment-count-${raceId}`;
        const likeButtonId = `like-btn-${raceId}`;

        li.innerHTML = `
            <div class="history-item-main">
                <div class="history-item-date">${formattedDate}</div>
                <div class="history-item-info">
                    <strong>${race.raceName}</strong>
                    <span>${race.distance ? race.distance + 'km' : ''} ${race.notes || ''}</span>
                </div>
                ${canEdit ? `<button class="btn-icon btn-edit-race"><i class='bx bx-pencil'></i></button>` : ''}
            </div>
            <div class="history-item-details">
                <span class="runner-status status-${r1_status}">${RUNNER_1_PROFILE.nameShort} ${r1_time}</span>
                ${r2_html}
            </div>
            
            <div class="history-item-media">
                <button class="btn-icon btn-media ${mediaCount > 0 ? 'has-media' : ''}" data-race-id="${raceId}" data-race-name="${race.raceName}">
                    <i class='bx bx-camera'></i>
                    <span class="media-count">${mediaCount}</span>
                </button>
            </div>

            <div class="history-item-actions">
                <button class="btn-social" id="${likeButtonId}" data-race-id="${raceId}" data-owner-uid="${currentViewingUid}">
                    <i class='bx bx-heart'></i>
                    <span id="${likeCountId}">0</span>
                </button>
                <button class="btn-social btn-show-comments" data-race-id="${raceId}" data-owner-uid="${currentViewingUid}" data-race-name="${race.raceName}">
                    <i class='bx bx-comment'></i>
                    <span id="${commentCountId}">0</span>
                </button>
            </div>
        `;
        fragment.appendChild(li);

        // V9.2: Inicia os listeners de Likes e Comentários para esta corrida
        setupRaceLikesListener(raceId, likeCountId, likeButtonId);
        setupRaceCommentsListener(raceId, commentCountId);
    });
    
    dom.historyList.appendChild(fragment);
}

// --- Renderização da Lista Pública ---
function renderPublicList(profiles) {
    dom.publicListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // V8: Ordena por nome (runner1Name)
    profiles.sort((a, b) => a.runner1Name.localeCompare(b.runner1Name));

    profiles.forEach(profile => {
        const div = document.createElement('div');
        div.className = 'public-list-item';
        div.dataset.uid = profile.uid; // Adiciona o UID para o clique

        const runnerName = (profile.runner2Name)
            ? `${profile.runner1Name} & ${profile.runner2Name}`
            : profile.runner1Name;

        div.innerHTML = `
            <img src="${profile.profilePictureUrl || 'icons/icon-192x192.png'}" alt="Foto">
            <div class="public-list-info">
                <strong>${runnerName}</strong>
                <span>${profile.teamName || 'Equipe'}</span>
            </div>
        `;
        fragment.appendChild(div);
    });
    dom.publicListContainer.appendChild(fragment);
}

// --- Renderização das Estatísticas ---
function renderStats(races) {
    let completed = 0;
    let totalKm = 0;
    const years = new Set();

    Object.values(races).forEach(race => {
        years.add(race.date.substring(0, 4)); // Adiciona o ano (YYYY)
        
        // V3.7: Contabiliza por corredor
        const r1_completed = race.runner1 && race.runner1.status === STATUS_COMPLETED;
        const r2_completed = hasRunner2 && race.runner2 && race.runner2.status === STATUS_COMPLETED;

        if (r1_completed || r2_completed) {
            completed++;
            if (race.distance && typeof race.distance === 'number') {
                // Se ambos completaram (juntos ou não), conta a distância 1x
                // Se só R1 completou, conta
                // Se só R2 completou, conta
                totalKm += race.distance;
            }
        }
    });

    dom.profileStats.innerHTML = `
        <li><strong>${completed}</strong><span>Corridas Completas</span></li>
        <li><strong>${totalKm.toFixed(0)}</strong><span>Km Registrados</span></li>
    `;
    
    // Popula o filtro de ano
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    dom.filterYear.innerHTML = '<option value="">Todos os Anos</option>';
    sortedYears.forEach(year => {
        dom.filterYear.innerHTML += `<option value="${year}">${year}</option>`;
    });
}

// --- Renderização do Calendário Público (V2) ---
function renderPublicCalendar(racesData, title) {
    dom.publicContentContainer.innerHTML = '';
    dom.publicContentTitle.textContent = title;
    
    if (!racesData || Object.keys(racesData).length === 0) {
        dom.publicContentContainer.innerHTML = '<div class="public-item-empty">Nenhuma corrida encontrada.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    // Ordena as corridas pela data
    const sortedRaces = Object.values(racesData).sort((a,b) => new Date(a.data) - new Date(b.data));
    
    sortedRaces.forEach(race => {
        const raceDate = new Date(race.data + 'T12:00:00Z'); // Trata a data como local
        const today = new Date();
        today.setHours(0,0,0,0); // Zera a hora para comparação
        
        const isPast = raceDate < today;
        const [year, month, day] = race.data.split('-');
        
        const div = document.createElement('div');
        div.className = `v2-calendar-item ${isPast ? 'past-race' : ''}`;
        
        let resultsButton = '';
        // V9.3: Verifica se existe resultado para esta corrida
        const hasResults = appState.resultadosEtapas[race.id];
        
        if (isPast && hasResults) {
            resultsButton = `<button class="v2-btn-results" data-race-id="${race.id}" data-race-name="${race.nome}">Ver Classificação</button>`;
        } else if (isPast && !hasResults) {
            resultsButton = `<span class="v2-no-results">Resultados (N/D)</span>`;
        } else {
            resultsButton = `<a href="${race.linkInscricao || '#'}" class="v2-btn-subscribe" target="_blank" rel="noopener noreferrer">Inscrever-se</a>`;
        }

        div.innerHTML = `
            <div class="v2-calendar-date">
                <span class="day">${day}</span>
                <span class="month">${getMonthName(month)}</span>
                <span class="year">${year}</span>
            </div>
            <div class="v2-calendar-info">
                <strong>${race.nome}</strong>
                <span>${race.cidade}</span>
            </div>
            <div class="v2-calendar-action">
                ${resultsButton}
            </div>
        `;
        fragment.appendChild(div);
    });
    
    dom.publicContentContainer.appendChild(fragment);
}

// --- Renderização do Ranking (V2) ---
function renderRanking(rankingData) {
    dom.publicContentContainer.innerHTML = '';
    dom.publicContentTitle.textContent = 'Ranking Copa Alcer (Beta)';

    if (!rankingData || Object.keys(rankingData).length === 0) {
        dom.publicContentContainer.innerHTML = '<div class="public-item-empty">Ranking ainda não disponível.</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    // Itera sobre as categorias (ex: "GERAL MASCULINO")
    Object.entries(rankingData).forEach(([categoryName, results]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'v2-ranking-category';
        
        let tableHtml = `
            <h3 class="v2-ranking-title">${categoryName}</h3>
            <table class="v2-ranking-table">
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Atleta</th>
                        <th>Equipe</th>
                        <th>Et 1</th>
                        <th>Et 2</th>
                        <th>Et 3</th>
                        <th>Et 4</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Itera sobre os resultados (Array de atletas)
        results.forEach(atleta => {
            tableHtml += `
                <tr>
                    <td>${atleta.pos}º</td>
                    <td>${atleta.atleta}</td>
                    <td>${atleta.equipe}</td>
                    <td>${atleta.et1 || 0}</td>
                    <td>${atleta.et2 || 0}</td>
                    <td>${atleta.et3 || 0}</td>
                    <td>${atleta.et4 || 0}</td>
                    <td><strong>${atleta.total || 0}</strong></td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        categoryDiv.innerHTML = tableHtml;
        fragment.appendChild(categoryDiv);
    });

    dom.publicContentContainer.appendChild(fragment);
}


// =================================================================
// SEÇÃO 3: EVENT LISTENERS DA UI
// =================================================================

function setupEventListeners() {
    // --- Autenticação ---
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.signUpForm.addEventListener('submit', handleSignUp);
    dom.btnLogout.addEventListener('click', signOut);
    dom.btnShowSignUp.addEventListener('click', () => showView('signup'));
    dom.btnShowLogin.addEventListener('click', () => showView('login'));
    dom.btnTrySignUpAgain.addEventListener('click', signOut); // Desloga para ir ao 'login'

    // --- Navegação ---
    dom.btnBackToPublic.addEventListener('click', showPublicListView);
    dom.btnBackToMyDashboard.addEventListener('click', () => {
        if (authUser) loadUserProfile(authUser.uid);
    });
    // V8: Clicar no header leva ao topo do perfil
    dom.headerProfileInfo.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Lista Pública (Busca) ---
    dom.searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (!window.allPublicProfiles) return;
        
        const filteredProfiles = window.allPublicProfiles.filter(profile => 
            (profile.runner1Name && profile.runner1Name.toLowerCase().includes(searchTerm)) ||
            (profile.runner2Name && profile.runner2Name.toLowerCase().includes(searchTerm)) ||
            (profile.teamName && profile.teamName.toLowerCase().includes(searchTerm))
        );
        renderPublicList(filteredProfiles);
    });

    // --- Dashboard (Cliques na lista pública) ---
    dom.publicListContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.public-list-item');
        if (item && item.dataset.uid) {
            loadUserProfile(item.dataset.uid);
        }
    });

    // --- Histórico (Filtros) ---
    dom.historyFilters.addEventListener('change', () => {
        renderHistory(db.races);
    });

    // --- Histórico (CRUD) ---
    dom.btnAddRace.addEventListener('click', openRaceModal);
    dom.historyList.addEventListener('click', (e) => {
        const editButton = e.target.closest('.btn-edit-race');
        const mediaButton = e.target.closest('.btn-media');
        
        if (editButton) {
            const raceId = e.target.closest('.history-item').dataset.raceId;
            openRaceModal(raceId, db.races[raceId]);
            return;
        }

        if (mediaButton) { // V5
            const raceId = mediaButton.dataset.raceId;
            const raceName = mediaButton.dataset.raceName;
            openMediaUploadModal(raceId, raceName, db.races[raceId].media);
            return;
        }
    });

    // --- Modal de Corrida (CRUD) ---
    dom.raceForm.addEventListener('submit', handleRaceSave);
    dom.btnDeleteRace.addEventListener('click', handleRaceDelete);
    dom.btnCloseRaceModal.addEventListener('click', closeRaceModal);
    // V3.7: Sincroniza status se 'juntos' estiver marcado
    dom.juntosCheckbox.addEventListener('change', syncRunnerStatus);
    dom.raceStatusRunner1.addEventListener('change', syncRunnerStatus);

    // --- Modal de Perfil ---
    dom.btnEditProfile.addEventListener('click', openProfileModal);
    dom.profileEditForm.addEventListener('submit', handleProfileSave);
    dom.btnCloseProfileModal.addEventListener('click', closeProfileModal);
    dom.profilePictureUpload.addEventListener('change', handleProfilePictureUpload);
    
    // --- V2: Filtros de Conteúdo Público ---
    dom.publicContentFilters.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        // Remove 'active' de todos
        dom.publicContentFilters.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        // Adiciona 'active' ao clicado
        button.classList.add('active');

        if (button.id === 'btn-show-ranking') {
            renderRanking(appState.rankingData);
            showView('publicContent');
        }
        if (button.id === 'btn-show-copa-alcer') {
            renderPublicCalendar(appState.allCorridas.copaAlcer, 'Copa Alcer');
            showView('publicContent');
        }
        if (button.id === 'btn-show-geral') {
            renderPublicCalendar(appState.allCorridas.geral, 'Calendário Geral');
            showView('publicContent');
        }
    });

    // --- V2/V9.3: Modal de Resultados ---
    dom.publicContentContainer.addEventListener('click', (e) => {
        const resultsButton = e.target.closest('.v2-btn-results');
        if (resultsButton) {
            const { raceId, raceName } = resultsButton.dataset;
            showRaceResultsModal(raceId, raceName);
        }
    });
    dom.raceResultsCloseBtn.addEventListener('click', () => {
        dom.raceResultsModal.classList.add('hidden');
        dom.modalOverlay.classList.add('hidden');
    });
    // V9.3: Filtro de Nome
    dom.raceResultsFilterName.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = dom.raceResultsContent.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const nameCell = row.cells[1]; // A segunda coluna (Nome)
            if (nameCell) {
                const name = nameCell.textContent.toLowerCase();
                row.style.display = name.includes(searchTerm) ? '' : 'none';
            }
        });
    });


    // --- V5: Modal de Mídia ---
    dom.mediaUploadForm.addEventListener('submit', handleMediaUploadSubmit);
    dom.btnCloseMediaModal.addEventListener('click', closeMediaUploadModal);
    // V8: Clicar na galeria de mídias (delegação de evento)
    dom.mediaListContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.media-thumbnail');
        if (item) {
            const index = parseInt(item.dataset.index, 10);
            openLightbox(index);
        }
    });

    // --- V8: Lightbox ---
    dom.lightboxClose.addEventListener('click', closeLightbox);
    dom.lightboxPrev.addEventListener('click', showPrevImage);
    dom.lightboxNext.addEventListener('click', showNextImage);
    dom.lightbox.addEventListener('click', (e) => {
        // Fecha se clicar fora da imagem
        if (e.target.id === 'lightbox-overlay') closeLightbox();
    });
    
    // --- V9.2: Ações Sociais (Likes/Comentários) ---
    // Clicar no botão de Like
    dom.historyList.addEventListener('click', (e) => {
        const likeButton = e.target.closest('.btn-social[id^="like-btn-"]');
        if (likeButton) {
            handleRaceLike(likeButton.dataset.raceId, likeButton.dataset.ownerUid);
        }
    });
    // Clicar no contador de Likes (abrir modal)
    dom.historyList.addEventListener('click', (e) => {
        const likeCountSpan = e.target.closest('span[id^="like-count-"]');
        if (likeCountSpan) {
            const likeButton = likeCountSpan.closest('button');
            showRaceLikesModal(likeButton.dataset.raceId);
        }
    });
    // Clicar no botão de Comentário (abrir modal)
    dom.historyList.addEventListener('click', (e) => {
        const commentButton = e.target.closest('.btn-show-comments');
        if (commentButton) {
            showRaceCommentsModal(commentButton.dataset.raceId, commentButton.dataset.ownerUid, commentButton.dataset.raceName);
        }
    });
    
    // Fechar Modal de Likes
    dom.btnCloseRaceLikesModal.addEventListener('click', () => {
        dom.raceLikesModal.classList.add('hidden');
        if (dom.mediaUploadModal.classList.contains('hidden') && 
            dom.raceCommentsModal.classList.contains('hidden')) {
            dom.modalOverlay.classList.add('hidden');
        }
    });

    // Fechar Modal de Comentários
    dom.btnCloseRaceCommentsModal.addEventListener('click', () => {
        dom.raceCommentsModal.classList.add('hidden');
        if (dom.mediaUploadModal.classList.contains('hidden') &&
            dom.raceLikesModal.classList.contains('hidden')) {
            dom.modalOverlay.classList.add('hidden');
        }
    });
    
    // Submeter Comentário (Corrida)
    dom.raceCommentsForm.addEventListener('submit', handleRaceCommentSubmit);

    // Submeter Comentário (Mural/Perfil)
    dom.profileCommentsForm.addEventListener('submit', handleProfileCommentSubmit);

    // V13: Recolher/Expandir Seções
    dom.toggleHistoryBtn.addEventListener('click', () => toggleCollapsibleSection(dom.toggleHistoryContent, dom.toggleHistoryBtn));
    dom.toggleCommentsBtn.addEventListener('click', () => toggleCollapsibleSection(dom.toggleCommentsContent, dom.toggleCommentsBtn));
}

// =================================================================
// SEÇÃO 4: LÓGICA DE CRUD (Corridas, Perfil, Mídia)
// =================================================================

// --- CRUD de Corrida ---
function openRaceModal(raceId = null, raceData = null) {
    dom.raceForm.reset();
    dom.modalOverlay.classList.remove('hidden');
    dom.raceModal.classList.remove('hidden');
    
    // V3.7: Atualiza labels e visibilidade
    updateRunnerFiltersAndForms();
    
    if (raceId && raceData) {
        // Editando
        dom.raceModalTitle.textContent = "Editar Corrida";
        dom.raceId.value = raceId;
        dom.raceName.value = raceData.raceName;
        dom.raceDate.value = raceData.date;
        dom.raceDistance.value = raceData.distance || '';
        dom.raceNotes.value = raceData.notes || '';
        dom.btnDeleteRace.classList.remove('hidden');

        // V3.7: Preenche status e tempos
        if (raceData.runner1) {
            dom.raceStatusRunner1.value = raceData.runner1.status;
            dom.raceTimeRunner1.value = raceData.runner1.time || '';
        }
        if (hasRunner2 && raceData.runner2) {
            dom.raceStatusRunner2.value = raceData.runner2.status;
            dom.raceTimeRunner2.value = raceData.runner2.time || '';
        }
        dom.juntosCheckbox.checked = raceData.juntos || false;

    } else {
        // Adicionando
        dom.raceModalTitle.textContent = "Adicionar Corrida";
        dom.raceId.value = '';
        dom.btnDeleteRace.classList.add('hidden');
        // V3.7: Define 'Planejada' como padrão
        dom.raceStatusRunner1.value = STATUS_PLANNED;
        dom.raceStatusRunner2.value = STATUS_PLANNED;
    }
}

function closeRaceModal() {
    dom.raceModal.classList.add('hidden');
    dom.modalOverlay.classList.add('hidden');
}

function handleRaceSave(e) {
    e.preventDefault();
    const raceId = dom.raceId.value;
    const uid = currentViewingUid;

    const raceData = {
        raceName: dom.raceName.value.trim(),
        date: dom.raceDate.value,
        distance: parseFloat(dom.raceDistance.value) || null,
        notes: dom.raceNotes.value.trim(),
        year: dom.raceDate.value.substring(0, 4), // V3
        
        // V3.7: Dados dos corredores
        runner1: {
            status: dom.raceStatusRunner1.value,
            time: dom.raceTimeRunner1.value.trim()
        },
        juntos: dom.juntosCheckbox.checked
    };
    
    // V3.7: Adiciona R2 apenas se o perfil tiver R2
    if (hasRunner2) {
        raceData.runner2 = {
            status: dom.raceStatusRunner2.value,
            time: dom.raceTimeRunner2.value.trim()
        };
    }
    
    if (!raceData.raceName || !raceData.date) {
        alert("Nome da Corrida e Data são obrigatórios.");
        return;
    }

    let promise;
    if (raceId) {
        // Atualiza
        promise = database.ref(`/users/${uid}/races/${raceId}`).update(raceData);
    } else {
        // Cria
        promise = database.ref(`/users/${uid}/races`).push(raceData);
    }

    promise.then(() => {
        closeRaceModal();
    }).catch(error => {
        console.error("Erro ao salvar corrida:", error);
        alert("Erro ao salvar. Verifique o console.");
    });
}

function handleRaceDelete() {
    const raceId = dom.raceId.value;
    const uid = currentViewingUid;
    
    if (!raceId || !uid) return;

    if (confirm("Tem certeza que deseja excluir esta corrida? Todas as mídias (fotos) associadas a ela serão perdidas.")) {
        
        // V9.2: Exclui também os nós de likes e comentários
        const updates = {};
        updates[`/users/${uid}/races/${raceId}`] = null;
        updates[`/raceLikes/${raceId}`] = null;
        updates[`/raceComments/${raceId}`] = null;
        
        database.ref().update(updates)
            .then(() => {
                closeRaceModal();
            })
            .catch(error => {
                console.error("Erro ao excluir corrida:", error);
                alert("Erro ao excluir. Verifique o console.");
            });
    }
}

// --- CRUD de Perfil ---
function openProfileModal() {
    // Carrega os dados atuais do DB (db.profile)
    dom.profileRunner1Name.value = db.profile.runner1Name || '';
    dom.profileRunner2Name.value = db.profile.runner2Name || '';
    dom.profileTeamName.value = db.profile.teamName || '';
    dom.profileBioEdit.value = db.profile.bio || '';
    dom.profileLocationEdit.value = db.profile.location || '';
    dom.profileBirthdateEdit.value = db.profile.birthdate || '';
    dom.profilePictureUrl.value = db.profile.profilePictureUrl || '';
    
    dom.profilePictureProgress.classList.add('hidden');
    dom.profilePictureUpload.value = null; // Limpa o file input

    dom.modalOverlay.classList.remove('hidden');
    dom.profileEditModal.classList.remove('hidden');
}

function closeProfileModal() {
    dom.profileEditModal.classList.add('hidden');
    dom.modalOverlay.classList.add('hidden');
}

function handleProfileSave(e) {
    e.preventDefault();
    setLoadingState(dom.btnSaveProfile, true, "Salvando...");

    const uid = currentViewingUid;
    
    const profileData = {
        runner1Name: dom.profileRunner1Name.value.trim(),
        runner2Name: dom.profileRunner2Name.value.trim() || "",
        teamName: dom.profileTeamName.value.trim() || "Equipe",
        bio: dom.profileBioEdit.value.trim(),
        location: dom.profileLocationEdit.value.trim(),
        birthdate: dom.profileBirthdateEdit.value || null,
        profilePictureUrl: dom.profilePictureUrl.value.trim() || null
    };
    
    // V4: Desnormalização. Salva também em /publicProfiles
    const publicProfileData = {
        runner1Name: profileData.runner1Name,
        runner2Name: profileData.runner2Name,
        teamName: profileData.teamName,
        profilePictureUrl: profileData.profilePictureUrl
    };

    const updates = {};
    updates[`/users/${uid}/profile`] = profileData;
    updates[`/publicProfiles/${uid}`] = publicProfileData;
    
    // V9.2: Atualiza o nome nos comentários de perfil
    database.ref(`/profileComments/${uid}`).once('value', snapshot => {
        if(snapshot.exists()) {
            snapshot.forEach(commentSnap => {
                if (commentSnap.val().commenterUid === uid) {
                    updates[`/profileComments/${uid}/${commentSnap.key}/commenterName`] = profileData.runner1Name;
                }
            });
        }
    }).then(() => {
        // V9.2: Atualiza o nome nos comentários de corridas
        return database.ref('raceComments').once('value');
    }).then(snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(raceCommentsSnap => {
                const raceId = raceCommentsSnap.key;
                raceCommentsSnap.child('comments').forEach(commentSnap => {
                    if (commentSnap.val().commenterUid === uid) {
                        updates[`/raceComments/${raceId}/comments/${commentSnap.key}/commenterName`] = profileData.runner1Name;
                    }
                });
            });
        }
    }).then(() => {
        // V9.2: Atualiza o nome/pic nos 'likers'
        return database.ref('raceLikes').once('value');
    }).then(snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(raceLikesSnap => {
                const raceId = raceLikesSnap.key;
                if (raceLikesSnap.child(`likers/${uid}`).exists()) {
                    updates[`/raceLikes/${raceId}/likers/${uid}/name`] = profileData.runner1Name;
                    updates[`/raceLikes/${raceId}/likers/${uid}/pic`] = profileData.profilePictureUrl;
                }
            });
        }
    }).then(() => {
        // Finalmente, executa todas as atualizações
        return database.ref().update(updates);
    })
    .then(() => {
        setLoadingState(dom.btnSaveProfile, false, "Salvar");
        closeProfileModal();
    })
    .catch(error => {
        console.error("Erro ao salvar perfil:", error);
        alert("Erro ao salvar. Verifique o console.");
        setLoadingState(dom.btnSaveProfile, false, "Salvar");
    });
}

// --- Upload de Mídia (V5 - Cloudinary) ---
function handleProfilePictureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UNSIGNED_PRESET) {
        alert("Erro: Configuração do Cloudinary não encontrada (config.js).");
        return;
    }
    
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET);
    
    dom.profilePictureProgress.classList.remove('hidden');
    dom.profilePictureProgress.value = 0;

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.secure_url) {
            dom.profilePictureUrl.value = data.secure_url;
            dom.profilePictureProgress.value = 100;
        } else {
            throw new Error(data.error.message || 'Erro no upload');
        }
    })
    .catch(error => {
        console.error("Erro no upload (Cloudinary):", error);
        alert("Erro ao enviar imagem: " + error.message);
        dom.profilePictureProgress.classList.add('hidden');
    });
}

// --- V5: Modal de Mídia (CRUD) ---
function openMediaUploadModal(raceId, raceName, mediaData) {
    dom.mediaRaceIdInput.value = raceId;
    dom.mediaRaceNameText.textContent = raceName;
    dom.mediaUploadError.classList.add('hidden');
    dom.mediaUploadProgress.classList.add('hidden');
    dom.mediaUploadPreview.classList.add('hidden');
    dom.mediaUploadPreview.src = '';
    dom.mediaUploadForm.reset();
    
    // V8: Limpa o estado do Lightbox
    lightboxState.images = [];
    lightboxState.currentIndex = 0;

    // V9.4: Renderiza a lista de mídias existentes
    dom.mediaListContainer.innerHTML = '';
    if (mediaData) {
        // V9.4: Ordena por data de upload, da mais nova para a mais antiga
        const sortedMedia = Object.values(mediaData).sort((a, b) => b.uploadedAt - a.uploadedAt);
        
        lightboxState.images = sortedMedia; // V8: Salva no estado
        
        sortedMedia.forEach((media, index) => {
            const div = document.createElement('div');
            div.className = 'media-thumbnail';
            div.dataset.index = index; // V8: Índice para o Lightbox
            div.dataset.mediaId = media.id; // V13: ID para exclusão
            
            div.innerHTML = `
                <img src="${media.url}" alt="Mídia da corrida">
                ${(isAdmin || (authUser && authUser.uid === currentViewingUid)) ?
                    '<button class="btn-delete-media" data-media-id="'+media.id+'">&times;</button>'
                    : ''}
            `;
            dom.mediaListContainer.appendChild(div);
        });
    }
    
    if (lightboxState.images.length === 0) {
        dom.mediaListContainer.innerHTML = '<p class="media-empty-msg">Nenhuma foto adicionada a esta corrida.</p>';
    }

    // V13: Adiciona listener para exclusão de mídia
    setupMediaDeleteListeners();

    dom.modalOverlay.classList.remove('hidden');
    dom.mediaUploadModal.classList.remove('hidden');
}

function closeMediaUploadModal() {
    dom.mediaUploadModal.classList.add('hidden');
    // V9.2: Só fecha o overlay se os outros modais sociais também estiverem fechados
    if (dom.raceLikesModal.classList.contains('hidden') &&
        dom.raceCommentsModal.classList.contains('hidden')) {
        dom.modalOverlay.classList.add('hidden');
    }
}

function handleMediaUploadSubmit(e) {
    e.preventDefault();
    const file = dom.mediaFileInput.files[0];
    const raceId = dom.mediaRaceIdInput.value;
    const uid = currentViewingUid;

    if (!file) {
        dom.mediaUploadError.textContent = "Selecione um arquivo de imagem.";
        dom.mediaUploadError.classList.remove('hidden');
        return;
    }
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UNSIGNED_PRESET) {
        alert("Erro: Configuração do Cloudinary não encontrada (config.js).");
        return;
    }
    
    dom.mediaUploadError.classList.add('hidden');
    setLoadingState(dom.btnSubmitMedia, true, "Enviando...");
    dom.mediaUploadProgress.classList.remove('hidden');
    dom.mediaUploadProgress.value = 0;

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET);

    // Simula progresso (Fetch API não suporta nativamente)
    dom.mediaUploadProgress.value = 30; 
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        dom.mediaUploadProgress.value = 70;
        return response.json();
    })
    .then(data => {
        if (data.secure_url) {
            dom.mediaUploadProgress.value = 100;
            // Salva no Firebase
            const newMediaRef = database.ref(`/users/${uid}/races/${raceId}/media`).push();
            const mediaData = {
                id: newMediaRef.key,
                url: data.secure_url,
                type: 'image', // Futuramente pode ser 'video'
                uploadedAt: firebase.database.ServerValue.TIMESTAMP
            };
            return newMediaRef.set(mediaData);
        } else {
            throw new Error(data.error.message || 'Erro no upload');
        }
    })
    .then(() => {
        setLoadingState(dom.btnSubmitMedia, false, "Enviar Mídia");
        // Recarrega o modal para mostrar a nova imagem (V9.4)
        openMediaUploadModal(raceId, dom.mediaRaceNameText.textContent, db.races[raceId].media);
    })
    .catch(error => {
        console.error("Erro no upload:", error);
        dom.mediaUploadError.textContent = `Erro: ${error.message}`;
        dom.mediaUploadError.classList.remove('hidden');
        setLoadingState(dom.btnSubmitMedia, false, "Enviar Mídia");
        dom.mediaUploadProgress.classList.add('hidden');
    });
}

// V13: Excluir Mídia
function setupMediaDeleteListeners() {
    dom.mediaListContainer.querySelectorAll('.btn-delete-media').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede que o clique abra o lightbox
            
            const mediaId = e.target.dataset.mediaId;
            const raceId = dom.mediaRaceIdInput.value;
            const uid = currentViewingUid;

            if (confirm("Tem certeza que deseja excluir esta foto?")) {
                database.ref(`/users/${uid}/races/${raceId}/media/${mediaId}`).remove()
                    .then(() => {
                        // Recarrega o modal (V9.4)
                        openMediaUploadModal(raceId, dom.mediaRaceNameText.textContent, db.races[raceId].media);
                    })
                    .catch(err => {
                        console.error("Erro ao excluir mídia:", err);
                        alert("Erro ao excluir foto.");
                    });
            }
        });
    });
}


// =================================================================
// SEÇÃO 5: LÓGICA DE FILTROS E UTILITÁRIOS
// =================================================================

// --- Filtragem de Corridas ---
function filterRaces(races) {
    const year = dom.filterYear.value;
    const status = dom.filterStatus.value;
    const runner = dom.filterRunner.value;

    return Object.entries(races)
        .filter(([_, race]) => {
            // Filtro de Ano
            if (year && race.year !== year) return false;
            
            // V3.7: Filtro de Status
            if (status) {
                const r1_match = race.runner1 && race.runner1.status === status;
                const r2_match = hasRunner2 && race.runner2 && race.runner2.status === status;
                if (status === STATUS_COMPLETED && !(r1_match || r2_match)) return false;
                if (status === STATUS_PLANNED && !(r1_match || r2_match)) return false;
                if (status === STATUS_SKIPPED && !(r1_match || r2_match)) return false;
            }
            
            // V3.7: Filtro de Corredor
            if (runner && hasRunner2) {
                if (runner === 'runner1' && !(race.runner1 && race.runner1.status !== STATUS_SKIPPED)) return false;
                if (runner === 'runner2' && !(race.runner2 && race.runner2.status !== STATUS_SKIPPED)) return false;
            }
            
            return true;
        })
        .sort(([, a], [, b]) => b.date.localeCompare(a.date)); // Ordena pela data (mais nova primeiro)
}

// --- V3.7: Atualiza UI baseada em R1/R2 ---
function updateRunnerFiltersAndForms() {
    // Labels do formulário
    dom.runner1Label.textContent = RUNNER_1_PROFILE.nameShort;
    dom.runner2Label.textContent = RUNNER_2_PROFILE.nameShort;
    
    // Visibilidade dos campos R2
    const showR2 = hasRunner2;
    dom.runner2Fields.classList.toggle('hidden', !showR2);
    dom.juntosCheckboxContainer.classList.toggle('hidden', !showR2);
    
    // Filtro do histórico
    const runnerFilterOptionR2 = dom.filterRunner.querySelector('option[value="runner2"]');
    if (runnerFilterOptionR2) {
        runnerFilterOptionR2.classList.toggle('hidden', !showR2);
        runnerFilterOptionR2.textContent = `Apenas ${RUNNER_2_PROFILE.nameShort}`;
    }
    const runnerFilterOptionR1 = dom.filterRunner.querySelector('option[value="runner1"]');
    if (runnerFilterOptionR1) {
        runnerFilterOptionR1.textContent = `Apenas ${RUNNER_1_PROFILE.nameShort}`;
        // Esconde o filtro de R1 se R2 não existir (pois não faz sentido filtrar)
        runnerFilterOptionR1.classList.toggle('hidden', !showR2);
    }
}

// V3.7: Sincroniza R2 com R1 se 'Juntos' estiver marcado
function syncRunnerStatus() {
    if (dom.juntosCheckbox.checked) {
        dom.raceStatusRunner2.value = dom.raceStatusRunner1.value;
    }
}

// --- Utilitários ---
function setLoadingState(button, isLoading, loadingText = "...") {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

function getMonthName(monthNumber) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[parseInt(monthNumber, 10) - 1] || '';
}

function cleanupListeners() {
    // V9.2: Limpa todos os listeners dinâmicos
    if (currentViewingUid) {
        database.ref(`/users/${currentViewingUid}/profile`).off();
        database.ref(`/users/${currentViewingUid}/races`).off();
        currentViewingUid = null;
    }
    Object.values(currentRaceLikesListeners).forEach(ref => ref.off());
    currentRaceLikesListeners = {};
    Object.values(currentRaceCommentsListeners).forEach(ref => ref.off());
    currentRaceCommentsListeners = {};
    if (currentProfileCommentsListener) {
        currentProfileCommentsListener.off();
        currentProfileCommentsListener = null;
    }
}


// =================================================================
// SEÇÃO 6: LÓGICA V2/V9.3 (MODAL DE RESULTADOS)
// =================================================================

// =================================================================
// INÍCIO DA ALTERAÇÃO: Função de Exibição de Resultados (V9.5)
// =================================================================
function showRaceResultsModal(raceId, raceName) {
    dom.raceResultsTitle.textContent = raceName;
    dom.raceResultsContent.innerHTML = '<div class="loader">Carregando resultados...</div>';
    dom.raceResultsFilterName.value = ''; // Limpa o filtro
    
    dom.modalOverlay.classList.remove('hidden');
    dom.raceResultsModal.classList.remove('hidden');

    const results = appState.resultadosEtapas[raceId];
    
    if (!results) {
        dom.raceResultsContent.innerHTML = '<div class="public-item-empty">Resultados não encontrados.</div>';
        return;
    }

    // V9.3: Verifica se 'results' é o formato antigo (Objeto) ou novo (Array)
    let resultsArray = [];
    if (Array.isArray(results)) {
        resultsArray = results; // Novo formato (JSON direto)
    } else {
        resultsArray = Object.values(results); // Formato antigo (baseado em UID)
    }

    // V9.3: Agrupa por categoria (Ex: "GERAL - Feminino", "GERAL - Masculino")
    const groupedResults = resultsArray.reduce((acc, atleta) => {
        // Normaliza a busca pela categoria (para gestao.json e gestao_2_corrigido.json)
        const category = atleta.category || atleta.CATEGORIA || "Categoria Desconhecida";
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(atleta);
        return acc;
    }, {});
    
    // Ordena as categorias por nome
    const sortedCategories = Object.keys(groupedResults).sort((a, b) => a.localeCompare(b));

    let fullHtml = '';

    // Renderiza uma tabela para cada categoria
    sortedCategories.forEach(categoryName => {
        
        const atletas = groupedResults[categoryName];
        
        // Ordena atletas pela colocação (placement ou Col)
        atletas.sort((a, b) => (parseInt(a.placement || a.Col) || 0) - (parseInt(b.placement || b.Col) || 0));

        fullHtml += `<h3 class="v2-modal-category-title">${categoryName}</h3>`;
        fullHtml += `
            <table class="v2-results-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Atleta</th>
                        <th>Equipe</th>
                        <th>Tempo</th>
                        <th>Class. Cat.</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Popula a tabela
        let tableContent = '';
        atletas.forEach(atleta => {
            // Normaliza as colunas principais (para gestao.json e gestao_2_corrigido.json)
            const placement = atleta.placement || atleta.Col || 'N/A';
            const name = atleta.name || atleta.NOME || 'N/A';
            const equipe = atleta.team || atleta.assessoria || atleta.Equipe || 'N/A';
            const tempo = atleta.time || atleta.tempo || atleta.TEMPO || 'N/A';
            const placementInfo = atleta.placement_info || placement; // O 'placement_info' (ex: 54 de 245) é o principal

            // --- V9.5: Lógica para exibir Faixa Etária (A SUA SOLICITAÇÃO) ---
            // Procura pelas chaves de ambos os formatos de JSON
            const fxEtaria = atleta['Fx.Et.'] || atleta.age_group || '';
            const clFx = atleta['Cl.Fx.'] || atleta.class_fx || '';
            
            let fxEtariaInfo = '';
            if (fxEtaria) {
                // Se temos a Fx.Et., formatamos a string.
                // O 'clFx' pode ser '-' (Geral) ou um número (1, 2, 3...)
                fxEtariaInfo = `<br><span style="font-size: 0.85em; opacity: 0.8; line-height: 1;">(Fx: ${fxEtaria} / Cl: ${clFx})</span>`;
            }
            // ---------------------------------------------

            tableContent += `
                <tr>
                    <td>${placement}</td>
                    <td>${name}</td>
                    <td>${equipe}</td>
                    <td>${tempo}</td>
                    <td>${placementInfo}${fxEtariaInfo}</td> 
                </tr>
            `;
        });
        
        fullHtml += tableContent;
        fullHtml += `</tbody></table>`;
    });

    dom.raceResultsContent.innerHTML = fullHtml;
}
// =================================================================
// FIM DA ALTERAÇÃO (V9.5)
// =================================================================


// =================================================================
// SEÇÃO 7: LÓGICA V8 (LIGHTBOX)
// =================================================================

function openLightbox(index) {
    if (index < 0 || index >= lightboxState.images.length) return;
    
    lightboxState.currentIndex = index;
    lightboxState.isOpen = true;
    
    const media = lightboxState.images[index];
    dom.lightboxImage.src = media.url;
    dom.lightboxCaption.textContent = `Foto ${index + 1} de ${lightboxState.images.length}`;
    
    // Mostra/esconde botões de navegação
    dom.lightboxPrev.classList.toggle('hidden', index === 0);
    dom.lightboxNext.classList.toggle('hidden', index === lightboxState.images.length - 1);
    
    dom.lightbox.classList.remove('hidden');
    // V9.2: O Lightbox deve ficar SOBRE todos os modais
    dom.lightbox.style.zIndex = "1002"; 
}

function closeLightbox() {
    lightboxState.isOpen = false;
    dom.lightbox.classList.add('hidden');
    dom.lightboxImage.src = '';
    dom.lightbox.style.zIndex = ""; // Reseta o z-index
}

function showPrevImage() {
    if (lightboxState.currentIndex > 0) {
        openLightbox(lightboxState.currentIndex - 1);
    }
}

function showNextImage() {
    if (lightboxState.currentIndex < lightboxState.images.length - 1) {
        openLightbox(lightboxState.currentIndex + 1);
    }
}


// =================================================================
// SEÇÃO 8: LÓGICA V9.2 (SOCIAL - LIKES E COMENTÁRIOS)
// =================================================================

// --- LIKES ---

function setupRaceLikesListener(raceId, countElementId, buttonElementId) {
    const likeRef = database.ref(`raceLikes/${raceId}`);
    
    // Salva o listener para poder removê-lo depois
    currentRaceLikesListeners[raceId] = likeRef;

    likeRef.on('value', snapshot => {
        const countEl = document.getElementById(countElementId);
        const buttonEl = document.getElementById(buttonElementId);
        if (!countEl || !buttonEl) return; // Elemento não está mais na tela

        let likeCount = 0;
        let userLiked = false;
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            likeCount = data.likeCount || 0;
            if (authUser && data.likes) {
                userLiked = data.likes[authUser.uid] === true;
            }
        }
        
        countEl.textContent = likeCount;
        buttonEl.classList.toggle('liked', userLiked);
    });
}

function handleRaceLike(raceId, ownerUid) {
    if (!authUser) {
        alert("Você precisa estar logado para curtir.");
        return;
    }
    
    const uid = authUser.uid;
    const likeRef = database.ref(`raceLikes/${raceId}`);
    
    // V9.2: Usa a Cloud Function 'toggleLike'
    // Isso garante que os dados (likeCount, likers, ownerUid) sejam tratados atomicamente.
    
    const toggleLike = firebase.functions().httpsCallable('toggleLike');
    toggleLike({ 
        raceId: raceId, 
        ownerUid: ownerUid,
        // (V9.5.2) A CORREÇÃO DO RACE CONDITION GARANTE QUE 'db.profile' EXISTA AQUI
        likerName: db.profile.runner1Name || authUser.email, 
        likerPic: db.profile.profilePictureUrl || null
    })
    .catch(error => {
        console.error("Erro ao chamar toggleLike function:", error);
        alert(`Erro ao processar curtida: ${error.message}`);
    });
}

function showRaceLikesModal(raceId) {
    dom.raceLikesList.innerHTML = '<div class="loader">Carregando...</div>';
    dom.modalOverlay.classList.remove('hidden');
    dom.raceLikesModal.classList.remove('hidden');
    
    database.ref(`raceLikes/${raceId}/likers`).once('value', snapshot => {
        if (!snapshot.exists() || !snapshot.hasChildren()) {
            dom.raceLikesList.innerHTML = '<p class="social-empty-msg">Ninguém curtiu isso ainda.</p>';
            return;
        }
        
        const likers = snapshot.val();
        dom.raceLikesList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        Object.entries(likers).forEach(([uid, liker]) => {
            const div = document.createElement('div');
            div.className = 'social-user-item';
            div.innerHTML = `
                <img src="${liker.pic || 'icons/icon-192x192.png'}" alt="Foto ${liker.name}">
                <span>${liker.name}</span>
            `;
            // V9.2: Permite clicar para visitar o perfil
            div.dataset.uid = uid;
            div.addEventListener('click', () => {
                closeRaceLikesModal();
                loadUserProfile(uid);
            });
            
            fragment.appendChild(div);
        });
        dom.raceLikesList.appendChild(fragment);
    });
}

function closeRaceLikesModal() {
    dom.raceLikesModal.classList.add('hidden');
    // V9.2: Só fecha o overlay se os outros modais sociais também estiverem fechados
    if (dom.mediaUploadModal.classList.contains('hidden') &&
        dom.raceCommentsModal.classList.contains('hidden')) {
        dom.modalOverlay.classList.add('hidden');
    }
}


// --- COMENTÁRIOS DE CORRIDA ---

function setupRaceCommentsListener(raceId, countElementId) {
    const commentsRef = database.ref(`raceComments/${raceId}/comments`);
    
    // Salva o listener para poder removê-lo depois
    currentRaceCommentsListeners[raceId] = commentsRef;
    
    commentsRef.on('value', snapshot => {
        const countEl = document.getElementById(countElementId);
        if (!countEl) return; // Elemento não está mais na tela

        countEl.textContent = snapshot.exists() ? snapshot.numChildren() : 0;
    });
}

function showRaceCommentsModal(raceId, ownerUid, raceName) {
    dom.raceCommentsTitle.textContent = `Comentários em: ${raceName}`;
    dom.raceCommentText.value = '';
    dom.raceCommentsList.innerHTML = '<div class="loader">Carregando...</div>';
    
    // Configura o formulário
    dom.raceCommentRaceId.value = raceId;
    dom.raceCommentOwnerUid.value = ownerUid;
    dom.raceCommentsForm.classList.toggle('hidden', !authUser); // Esconde se não logado
    
    dom.modalOverlay.classList.remove('hidden');
    dom.raceCommentsModal.classList.remove('hidden');

    const commentsRef = database.ref(`raceComments/${raceId}/comments`).orderByChild('timestamp');
    
    // Usa .once() para carregar os comentários
    commentsRef.once('value', snapshot => {
        if (!snapshot.exists() || !snapshot.hasChildren()) {
            dom.raceCommentsList.innerHTML = '<p class="social-empty-msg">Nenhum comentário ainda.</p>';
            return;
        }
        
        dom.raceCommentsList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        snapshot.forEach(commentSnap => {
            const comment = commentSnap.val();
            const commentId = commentSnap.key;
            fragment.appendChild(createCommentElement(comment, raceId, commentId, 'raceComments'));
        });
        
        dom.raceCommentsList.appendChild(fragment);
    });
}

function handleRaceCommentSubmit(e) {
    e.preventDefault();
    if (!authUser) return;

    const text = dom.raceCommentText.value.trim();
    const raceId = dom.raceCommentRaceId.value;
    const ownerUid = dom.raceCommentOwnerUid.value;
    
    if (text.length === 0) return;

    setLoadingState(dom.btnSubmitRaceComment, true, "...");

    // V9.2: Chama a Cloud Function 'addRaceComment'
    const addRaceComment = firebase.functions().httpsCallable('addRaceComment');
    addRaceComment({
        raceId: raceId,
        ownerUid: ownerUid,
        text: text,
        // (V9.5.2) A CORREÇÃO DO RACE CONDITION GARANTE QUE 'db.profile' EXISTA AQUI
        commenterName: db.profile.runner1Name || authUser.email,
        commenterPic: db.profile.profilePictureUrl || null
    })
    .then(() => {
        dom.raceCommentText.value = '';
        setLoadingState(dom.btnSubmitRaceComment, false, "Enviar");
        // Recarrega os comentários
        showRaceCommentsModal(raceId, ownerUid, dom.raceCommentsTitle.textContent.replace('Comentários em: ', ''));
    })
    .catch(error => {
        console.error("Erro ao chamar addRaceComment function:", error);
        alert(`Erro ao enviar comentário: ${error.message}`);
        setLoadingState(dom.btnSubmitRaceComment, false, "Enviar");
    });
}


// --- COMENTÁRIOS DE PERFIL (MURAL) ---

function loadProfileComments(profileUid) {
    dom.profileCommentsList.innerHTML = '<div class="loader">Carregando mural...</div>';
    
    // Limpa listener antigo (se houver)
    if (currentProfileCommentsListener) {
        currentProfileCommentsListener.off();
    }

    const commentsRef = database.ref(`profileComments/${profileUid}`).orderByChild('timestamp');
    currentProfileCommentsListener = commentsRef; // Salva o novo listener
    
    commentsRef.on('value', snapshot => {
        if (!snapshot.exists() || !snapshot.hasChildren()) {
            dom.profileCommentsList.innerHTML = '<p class="social-empty-msg">Nenhum recado no mural.</p>';
            return;
        }
        
        dom.profileCommentsList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        snapshot.forEach(commentSnap => {
            const comment = commentSnap.val();
            const commentId = commentSnap.key;
            fragment.appendChild(createCommentElement(comment, profileUid, commentId, 'profileComments'));
        });
        
        dom.profileCommentsList.appendChild(fragment);
    });
}

function handleProfileCommentSubmit(e) {
    e.preventDefault();
    if (!authUser) return;
    
    const text = dom.profileCommentText.value.trim();
    const profileUid = currentViewingUid;
    
    if (text.length === 0) return;

    setLoadingState(dom.btnSubmitProfileComment, true, "...");
    
    // V9.2: Chama a Cloud Function 'addProfileComment'
    const addProfileComment = firebase.functions().httpsCallable('addProfileComment');
    addProfileComment({
        profileUid: profileUid,
        text: text,
        // (V9.5.2) A CORREÇÃO DO RACE CONDITION GARANTE QUE 'db.profile' EXISTA AQUI
        commenterName: db.profile.runner1Name || authUser.email,
        commenterPic: db.profile.profilePictureUrl || null
    })
    .then(() => {
        dom.profileCommentText.value = '';
        setLoadingState(dom.btnSubmitProfileComment, false, "Enviar");
        // O listener 'on()' atualizará a lista automaticamente
    })
    .catch(error => {
        console.error("Erro ao chamar addProfileComment function:", error);
        alert(`Erro ao enviar recado: ${error.message}`);
        setLoadingState(dom.btnSubmitProfileComment, false, "Enviar");
    });
}


// --- UTIlITÁRIO SOCIAL (Criação de Elemento de Comentário) ---

function createCommentElement(comment, parentId, commentId, type) {
    const div = document.createElement('div');
    div.className = 'social-comment-item';
    
    const timestamp = new Date(comment.timestamp).toLocaleString('pt-BR', {
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });
    
    // V9.2: Verifica se o usuário pode excluir o comentário
    // (É o autor, OU é o dono do perfil/corrida, OU é admin)
    const canDelete = authUser && (
        authUser.uid === comment.commenterUid ||
        authUser.uid === currentViewingUid ||
        isAdmin
    );

    div.innerHTML = `
        <img src="${comment.commenterPic || 'icons/icon-192x192.png'}" alt="Foto ${comment.commenterName}" class="social-comment-pic" data-uid="${comment.commenterUid}">
        <div class="social-comment-content">
            <div class="social-comment-header">
                <strong class="social-comment-name" data-uid="${comment.commenterUid}">${comment.commenterName}</strong>
                <span class="social-comment-date">${timestamp}</span>
                ${canDelete ? `<button class="btn-delete-comment" data-id="${commentId}" data-parent-id="${parentId}" data-type="${type}">&times;</button>` : ''}
            </div>
            <p class="social-comment-text">${comment.text.replace(/\n/g, '<br>')}</p>
        </div>
    `;

    // Adiciona listeners para exclusão e clique no nome/foto
    div.querySelector('.btn-delete-comment')?.addEventListener('click', handleDeleteComment);
    
    div.querySelector('.social-comment-pic').addEventListener('click', (e) => {
        const uid = e.target.dataset.uid;
        if (type === 'raceComments') closeRaceCommentsModal(); // Fecha o modal de comentários da corrida
        loadUserProfile(uid); // Carrega o perfil do comentarista
    });
    div.querySelector('.social-comment-name').addEventListener('click', (e) => {
        const uid = e.target.dataset.uid;
        if (type === 'raceComments') closeRaceCommentsModal();
        loadUserProfile(uid);
    });

    return div;
}

function handleDeleteComment(e) {
    const { id, parentId, type } = e.target.dataset;
    
    if (confirm("Tem certeza que deseja excluir este comentário?")) {
        let refPath = '';
        if (type === 'raceComments') {
            refPath = `raceComments/${parentId}/comments/${id}`;
        } else if (type === 'profileComments') {
            refPath = `profileComments/${parentId}/${id}`;
        } else {
            return;
        }

        database.ref(refPath).remove()
            .then(() => {
                // O listener 'on()' (para profileComments) ou o .once() (para raceComments no modal)
                // atualizará a UI. Se for raceComments, precisamos reabrir/recarregar o modal.
                if (type === 'raceComments') {
                    showRaceCommentsModal(parentId, dom.raceCommentOwnerUid.value, dom.raceCommentsTitle.textContent.replace('Comentários em: ', ''));
                }
            })
            .catch(error => {
                console.error("Erro ao excluir comentário:", error);
                alert("Erro ao excluir.");
            });
    }
}

// =================================================================
// SEÇÃO 9: LÓGICA V13 (RECOLHER/EXPANDIR SEÇÕES)
// =================================================================

function toggleCollapsibleSection(contentElement, buttonElement) {
    const isCollapsed = contentElement.classList.toggle('collapsed');
    
    // Gira o ícone do botão
    const icon = buttonElement.querySelector('i');
    if (icon) {
        icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
    
    // (Opcional) Salvar o estado no localStorage
    // if (contentElement.id) {
    //     localStorage.setItem(contentElement.id + '_collapsed', isCollapsed);
    // }
}

// (Opcional) Carregar o estado salvo ao iniciar
// document.addEventListener('DOMContentLoaded', () => {
//     if (localStorage.getItem(dom.toggleHistoryContent.id + '_collapsed') === 'true') {
//         toggleCollapsibleSection(dom.toggleHistoryContent, dom.toggleHistoryBtn);
    }
//     if (localStorage.getItem(dom.toggleCommentsContent.id + '_collapsed') === 'true') {
//         toggleCollapsibleSection(dom.toggleCommentsContent, dom.toggleCommentsBtn);
//     }
// });
