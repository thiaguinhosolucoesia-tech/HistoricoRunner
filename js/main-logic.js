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
let authUser = null; // Armazena o objeto do usuário autenticado (ou null)
let currentViewingUid = null;
let isAdmin = false;
let hasRunner2 = false;

const RUNNER_1_KEY = "runner1";
const RUNNER_2_KEY = "runner2";

let RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
let RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };

// --- Cache de Elementos DOM (V1 + V2) ---
// Adiciona verificações para garantir que os seletores não quebrem se um elemento não existir
const dom = {
    get: (id) => document.getElementById(id), // Helper para pegar elemento

    // V1 (Perfis)
    get btnLogout() { return this.get('btn-logout'); },
    get btnBackToPublic() { return this.get('btn-back-to-public'); },
    get btnBackToMyDashboard() { return this.get('btn-back-to-my-dashboard'); },
    get userInfo() { return this.get('user-info'); },
    get userEmail() { return this.get('user-email'); },
    get loginOrPublicView() { return this.get('login-or-public-view'); },
    get loginView() { return this.get('login-view'); },
    get loginForm() { return this.get('login-form'); },
    get loginEmail() { return this.get('login-email'); },
    get loginPassword() { return this.get('login-password'); },
    get loginError() { return this.get('login-error'); },
    get loginTitle() { return this.get('login-title'); },
    get btnLoginSubmit() { return this.get('btn-login-submit'); },
    get btnSignUpSubmit() { return this.get('btn-signup-submit'); },
    get loginToggleLink() { return this.get('login-toggle-link'); },
    get signupFields() { return this.get('signup-fields'); },
    get signupRunner1Name() { return this.get('signup-runner1-name'); },
    get signupRunner2Name() { return this.get('signup-runner2-name'); },
    get signupTeamName() { return this.get('signup-team-name'); },
    get publicView() { return this.get('public-view'); },
    get publicProfileListPublic() { return this.get('public-profile-list-public'); },
    get publicProfileListLogged() { return this.get('public-profile-list-logged'); }, // <-- Lista restaurada
    get userContent() { return this.get('user-content'); },
    get headerSubtitle() { return this.get('header-subtitle'); },
    get prGrid() { return this.get('pr-grid'); },
    get summaryGrid() { return this.get('summary-grid'); },
    get controlsSection() { return this.get('controls-section'); },
    get btnAddnew() { return this.get('btn-add-new'); },
    get historyContainer() { return this.get('history-container'); },
    get modal() { return this.get('race-modal'); },
    get form() { return this.get('race-form'); },
    get modalTitle() { return this.get('modal-title'); },
    get btnDelete() { return this.get('btn-delete'); },
    get btnCloseModal() { return this.get('btn-close-modal'); },
    get btnCancel() { return this.get('btn-cancel'); },
    get runner1FormGroup() { return this.get('runner1-form-group'); },
    get runner2FormGroup() { return this.get('runner2-form-group'); },
    get pendingApprovalView() { return this.get('pending-approval-view'); },
    get rejectedView() { return this.get('rejected-view'); },
    get rejectedEmail() { return this.get('rejected-email'); },

    // V2 (Calendário Público)
    get copaContainerPublic() { return this.get('copa-container-public'); },
    get geralContainerPublic() { return this.get('geral-container-public'); },
    get resultadosContainerPublic() { return this.get('resultados-container-public'); },
    get copaContainerLogged() { return this.get('copa-container-logged'); },
    get geralContainerLogged() { return this.get('geral-container-logged'); },
    get resultadosContainerLogged() { return this.get('resultados-container-logged'); },

    // V2 (Modal de Resultados)
    get modalOverlay() { return this.get('modal-overlay'); },
    get modalTitleResults() { return this.get('modal-title-results'); },
    get modalContentResults() { return this.get('modal-content-results'); },
    get modalSearchInput() { return this.get('modal-search-input'); },
    get btnCloseResultsModal() { return this.get('btn-close-results-modal'); }
};

// ======================================================
// SEÇÃO V1: LÓGICA DE PERFIS DE USUÁRIO
// ======================================================

// --- Funções Utilitárias de Tempo e Pace ---
// ... (sem alterações) ...
function timeToSeconds(timeStr) { if (!timeStr || typeof timeStr !== 'string') return null; const parts = timeStr.split(':').map(Number).filter(n => !isNaN(n)); let s=0; if (parts.length === 2) s=parts[0]*60+parts[1]; else if (parts.length === 3) s=parts[0]*3600+parts[1]*60+parts[2]; else return null; return s; }
function secondsToTime(totalSeconds) { if(totalSeconds === null || isNaN(totalSeconds) || totalSeconds === Infinity) return 'N/A'; totalSeconds = Math.round(totalSeconds); const h=Math.floor(totalSeconds/3600); const m=Math.floor((totalSeconds%3600)/60); const s=totalSeconds%60; const p=(n)=>String(n).padStart(2,'0'); return(h>0)?`${p(h)}:${p(m)}:${p(s)}`:`${p(m)}:${p(s)}`; }
function normalizeTime(timeStr) { if(!timeStr) return null; const c=timeStr.replace(/[^0-9:]/g,''); const p=c.split(':'); if(p.length===2) return `00:${String(p[0]).padStart(2,'0')}:${String(p[1]).padStart(2,'0')}`; if(p.length===3) return `${String(p[0]).padStart(2,'0')}:${String(p[1]).padStart(2,'0')}:${String(p[2]).padStart(2,'0')}`; return null; }
function calculatePace(timeStr, distance) { const s=timeToSeconds(timeStr); const d=parseFloat(distance); if(!s||!d||d<=0) return 'N/A'; const pS=s/d; const pM=Math.floor(pS/60); const pSec=Math.round(pS%60); return `${String(pM).padStart(2,'0')}:${String(pSec).padStart(2,'0')} /km`; }

// --- Funções de Lógica da Aplicação (V1) ---
function updateProfileUI() {
    // ... (código do updateProfileUI permanece o mesmo) ...
    const profile = db.profile; hasRunner2 = false;
    RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' }; RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };
    if (profile?.runner1Name) { RUNNER_1_PROFILE = { name: profile.runner1Name, nameShort: profile.runner1Name.split(' ')[0] || "Corredor", emoji: '🏃‍♂️' }; }
    if (profile?.runner2Name && profile.runner2Name.trim() !== "") { hasRunner2 = true; RUNNER_2_PROFILE = { name: profile.runner2Name, nameShort: profile.runner2Name.split(' ')[0] || "Corredora", emoji: '🏃‍♀️' }; dom.runner2FormGroup?.classList.remove('hidden'); }
    else { dom.runner2FormGroup?.classList.add('hidden'); }
    let headerTitle = RUNNER_1_PROFILE.name; if (hasRunner2) { headerTitle += ` & ${RUNNER_2_PROFILE.name}`; }
    if (dom.headerSubtitle) dom.headerSubtitle.textContent = headerTitle;
    if (dom.runner1FormGroup) dom.runner1FormGroup.querySelector('h4').innerHTML = `${RUNNER_1_PROFILE.name} ${RUNNER_1_PROFILE.emoji}`;
    if (dom.runner2FormGroup) dom.runner2FormGroup.querySelector('h4').innerHTML = `${RUNNER_2_PROFILE.name} ${RUNNER_2_PROFILE.emoji}`;
}
function renderDashboard() {
    // ... (código do renderDashboard permanece o mesmo) ...
    const r=Object.values(db.races); const p={runner1:{},runner2:{}}; const d=[2,5,6,7,10,12,16,17]; let tk1=0,tk2=0,tj=0,cr1=0,cr2=0;
    d.forEach(i=>{p.runner1[i]={time:'N/A',seconds:Infinity}; p.runner2[i]={time:'N/A',seconds:Infinity};});
    r.forEach(a=>{const b=a[RUNNER_1_KEY];const c=a[RUNNER_2_KEY];if(a.juntos&&b?.status==='completed'&&c?.status==='completed')tj++;if(b?.status==='completed'){cr1++;const e=parseFloat(b.distance||a.distance);const f=timeToSeconds(b.time);if(e)tk1+=e;if(e&&p.runner1[e]&&f<p.runner1[e].seconds)p.runner1[e]={seconds:f,time:secondsToTime(f)};}if(c?.status==='completed'){cr2++;const e=parseFloat(c.distance||a.distance);const f=timeToSeconds(c.time);if(e)tk2+=e;if(e&&p.runner2[e]&&f<p.runner2[e].seconds)p.runner2[e]={seconds:f,time:secondsToTime(f)};}});
    if(dom.prGrid)dom.prGrid.innerHTML=d.map(i=>{const a=hasRunner2?`<div class="runner-pr"><strong class="runner-pr-thamis">${RUNNER_2_PROFILE.nameShort}: ${p.runner2[i].time}</strong></div>`:'';return`<div class="stat-card pr-card"><div class="stat-label">PR ${i}km</div><div class="stat-number"><div class="runner-pr"><span class="runner-pr-thiago">${RUNNER_1_PROFILE.nameShort}: ${p.runner1[i].time}</span></div>${a}</div></div>`}).join('');
    const tC=cr1+cr2;const tL=hasRunner2?" (Total)":"";const jH=hasRunner2?`<div class="stat-card"><div class="stat-number">${tj} 👩🏻‍❤️‍👨🏻</div><div class="stat-label">Corridas Juntos</div></div>`:'';const tKC=tk1+tk2;const tKL=hasRunner2?" (Casal)":"";
    const sKH=hasRunner2?`<div class="stat-card"><div class="stat-number"><span class="runner-pr-thiago">${tk1.toFixed(1)}</span> / <strong class="runner-pr-thamis">${tk2.toFixed(1)}</strong></div><div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort} / ${RUNNER_2_PROFILE.nameShort})</div></div>`:`<div class="stat-card"><div class="stat-number">${tk1.toFixed(1)} km</div><div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort})</div></div>`;
    if(dom.summaryGrid)dom.summaryGrid.innerHTML=`<div class="stat-card"><div class="stat-number">${tC}</div><div class="stat-label">Corridas Concluídas${tL}</div></div>${jH}<div class="stat-card"><div class="stat-number">${tKC.toFixed(1)} km</div><div class="stat-label">Total KM${tKL}</div></div>${sKH}`;
}
function renderHistory() {
    // ... (código do renderHistory permanece o mesmo) ...
    if(!dom.historyContainer) return; dom.historyContainer.innerHTML=''; const sR=Object.entries(db.races).map(([i,r])=>({...r,id:i})).sort((a,b)=>new Date(b.date)-new Date(a.date)); const rBY=sR.reduce((a,r)=>{const y=r.year||new Date(r.date+'T00:00:00Z').getFullYear().toString(); if(!a[y])a[y]=[]; a[y].push(r); return a;},{}); const sY=Object.keys(rBY).sort((a,b)=>b-a);
    if(sY.length===0){dom.historyContainer.innerHTML=`<div class="loader">${authUser?'Nenhuma corrida. Adicione uma!':'Perfil sem corridas.'}</div>`; return;}
    for(const y of sY){const yG=document.createElement('div');yG.className='year-group';const yE=y.split('').map(d=>['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'][d]).join('');yG.innerHTML=`<h2 class="year-title">${yE} (${rBY[y].length} provas)</h2>`; const rL=document.createElement('div');rL.className='race-card-list';rBY[y].forEach(r=>rL.appendChild(createRaceCard(r))); yG.appendChild(rL);dom.historyContainer.appendChild(yG);}
}
function createRaceCard(race) {
    // ... (código do createRaceCard permanece o mesmo) ...
    const c=document.createElement('div');const r1=race[RUNNER_1_KEY];const r2=race[RUNNER_2_KEY];if(!r1){console.warn("Dados incompletos:",race);return c;}let s='completed';if(r1.status==='planned'||(r2&&r2.status==='planned'))s='planned';if(r1.status==='skipped'&&(!r2||r2.status==='skipped'))s='skipped';c.className=`race-card status-${s}`;c.dataset.id=race.id;
    const d1=r1.distance||race.distance;const p1=calculatePace(r1.status==='completed'?r1.time:r1.goalTime,d1);let d2=null,p2=null;if(r2){d2=r2.distance||race.distance;p2=calculatePace(r2.status==='completed'?r2.time:r2.goalTime,d2);}let dD='';if(race.distance)dD=`${race.distance}km`;else if(d1&&r2&&d2&&d1!==d2)dD=`${d1||'?'}k / ${d2||'?'}k`;else dD=`${d1||(r2?d2:'')||'?'}km`;
    const cE=authUser&&authUser.uid===currentViewingUid;
    c.innerHTML=`<div class="race-card-header"><h3>${race.raceName}</h3><span class="date">${new Date(race.date).toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'})}</span></div><div class="race-card-body">${createRunnerInfoHTML(RUNNER_1_PROFILE,r1,d1,p1,'runner1')}${(hasRunner2&&r2)?createRunnerInfoHTML(RUNNER_2_PROFILE,r2,d2,p2,'runner2'):''}</div><div class="race-card-footer"><div><span class="juntos-icon">${(hasRunner2&&race.juntos)?'👩🏻‍❤️‍👨🏻':''}</span><span class="race-notes">${race.notes||''}</span></div><div style="display: flex; align-items: center;"><span class="race-distance">${dD}</span><div class="race-controls ${cE?'':'hidden'}"><button class="btn-control btn-edit" title="Editar">✏️</button><button class="btn-control btn-delete" title="Excluir">🗑️</button></div></div></div>`;
    if(cE){c.querySelector('.btn-edit').addEventListener('click',()=>openModal(race.id));c.querySelector('.btn-delete').addEventListener('click',()=>deleteRace(race.id));}return c;
}
function createRunnerInfoHTML(config, runnerData, distance, pace, cssClass) {
    // ... (código do createRunnerInfoHTML permanece o mesmo) ...
    let t='',pH='';if(!runnerData||!runnerData.status)return'';
    switch(runnerData.status){case'completed':t=`<div class="runner-time">${secondsToTime(timeToSeconds(runnerData.time))}</div>`;if(pace!=='N/A')pH=`<div class="runner-pace">${pace}</div>`;break;case'planned':const g=runnerData.goalTime||(runnerData.time&&runnerData.time.includes(':')?runnerData.time:null);t=`<div class="runner-time goal">⏳ ${g?secondsToTime(timeToSeconds(g)):'Planejada'}</div>`;if(g&&pace!=='N/A')pH=`<div class="runner-pace goal">(Meta Pace: ${calculatePace(g,distance)})</div>`;else if(pace!=='N/A')pH=`<div class="runner-pace goal">(Pace Estimado: ${pace})</div>`;break;case'skipped':t=`<div class="runner-time skipped">❌ Não Correu</div>`;break;default:t=`<div class="runner-time skipped">N/A</div>`;}
    if(runnerData.status==='skipped'){return`<div class="runner-info"><span class="runner-name ${cssClass}">${config.name} ${config.emoji}</span><div class="runner-details">${t}</div></div>`;}return`<div class="runner-info"><span class="runner-name ${cssClass}">${config.name} ${config.emoji}</span><div class="runner-details">${t}${pH}</div></div>`;
}


// --- Funções do Modal e CRUD (V1) ---
function openModal(raceId = null) {
    // ... (código do openModal permanece o mesmo) ...
    if(!dom.form||!dom.modal||!dom.btnDelete||!dom.modalTitle)return;dom.form.reset();document.getElementById('race-id').value='';dom.btnDelete.classList.add('hidden');updateProfileUI();
    if(raceId){dom.modalTitle.textContent='Editar Corrida';dom.btnDelete.classList.remove('hidden');const r=db.races[raceId];if(!r)return;document.getElementById('race-id').value=raceId;document.getElementById('raceName').value=r.raceName;document.getElementById('raceDate').value=r.date;document.getElementById('raceDistance').value=r.distance||'';document.getElementById('raceJuntos').checked=r.juntos;document.getElementById('raceNotes').value=r.notes||'';
    const r1=r[RUNNER_1_KEY];const r2=r[RUNNER_2_KEY];if(r1){document.getElementById('runner1Status').value=r1.status||'skipped';const t1=r1.status==='completed'?r1.time:(r1.goalTime||r1.time||'');document.getElementById('runner1Time').value=normalizeTime(t1)?secondsToTime(timeToSeconds(t1)):'';document.getElementById('runner1Distance').value=r1.distance||'';}if(r2){document.getElementById('runner2Status').value=r2.status||'skipped';const t2=r2.status==='completed'?r2.time:(r2.goalTime||r2.time||'');document.getElementById('runner2Time').value=normalizeTime(t2)?secondsToTime(timeToSeconds(t2)):'';document.getElementById('runner2Distance').value=r2.distance||'';}}
    else{dom.modalTitle.textContent='Adicionar Corrida';document.getElementById('raceDate').value=new Date().toISOString().split('T')[0];}if(typeof dom.modal.showModal==='function')dom.modal.showModal();
}
function closeModal() { if(dom.modal && typeof dom.modal.close === 'function') dom.modal.close(); }
function handleFormSubmit(e) {
    // ... (código do handleFormSubmit permanece o mesmo) ...
    e.preventDefault();if(!currentViewingUid||!authUser||currentViewingUid!==authUser.uid){alert("Erro: Não autorizado.");return;}const id=document.getElementById('race-id').value;const d=document.getElementById('raceDate').value;const t1R=document.getElementById('runner1Time').value;const t2R=document.getElementById('runner2Time').value;const s1=document.getElementById('runner1Status').value;const s2=document.getElementById('runner2Status').value;
    const rD={date:d,year:new Date(d+'T00:00:00Z').getFullYear().toString(),raceName:document.getElementById('raceName').value,distance:parseFloat(document.getElementById('raceDistance').value)||null,juntos:document.getElementById('raceJuntos').checked,notes:document.getElementById('raceNotes').value||null,[RUNNER_1_KEY]:{status:s1,time:s1==='completed'?normalizeTime(t1R):null,goalTime:s1==='planned'?normalizeTime(t1R):null,distance:parseFloat(document.getElementById('runner1Distance').value)||null},[RUNNER_2_KEY]:{status:s2,time:s2==='completed'?normalizeTime(t2R):null,goalTime:s2==='planned'?normalizeTime(t2R):null,distance:parseFloat(document.getElementById('runner2Distance').value)||null}};const dbP=`/users/${currentViewingUid}/races/`;
    if(id){firebase.database().ref(dbP).child(id).set(rD).then(closeModal).catch(err=>{console.error("ErrUpd:",err);alert("Err:"+err.message);});}else{const nR=firebase.database().ref(dbP).push();nR.set(rD).then(closeModal).catch(err=>{console.error("ErrCre:",err);alert("Err:"+err.message);});}
}
function deleteRace(raceId) {
    // ... (código do deleteRace permanece o mesmo) ...
    if(!currentViewingUid||!authUser||currentViewingUid!==authUser.uid){alert("Erro: Não autorizado.");return;}const r=db.races[raceId];if(!r||!confirm(`Excluir ${r.raceName} (${r.date})?`))return;firebase.database().ref(`/users/${currentViewingUid}/races/`).child(raceId).remove().then(closeModal).catch(err=>{console.error("ErrDel:",err);alert("Err:"+err.message);});
}


// --- Funções de Carregamento de Dados (V1 - Dados do Usuário RTDB) ---
function renderAllV1Profile() { updateProfileUI(); renderDashboard(); renderHistory(); }
function loadProfile(uid) {
    // ... (código do loadProfile permanece o mesmo) ...
    if(!database)return;const pR=database.ref(`/users/${uid}/profile`);pR.once('value').then(s=>{const d=s.val();if(d){db.profile=d;renderAllV1Profile();}});
}
function loadRaces(uid) {
    // ... (código do loadRaces permanece o mesmo) ...
    if(!database)return;currentViewingUid=uid;if(authUser&&authUser.uid===currentViewingUid){dom.controlsSection?.classList.remove('hidden');}else{dom.controlsSection?.classList.add('hidden');}const rR=database.ref(`/users/${uid}/races`);db.races={};
    if(dom.prGrid)dom.prGrid.innerHTML='<div class="loader">Carregando...</div>';if(dom.summaryGrid)dom.summaryGrid.innerHTML='<div class="loader">Carregando...</div>';if(dom.historyContainer)dom.historyContainer.innerHTML='<div class="loader">Carregando...</div>';rR.off('value');rR.on('value',(s)=>{db.races=s.val()||{};renderAllV1Profile();});
}


// --- Carregamento de Dados Públicos (V1 - Perfis do JSON) ---
// [FUNÇÃO CORRIGIDA - Restaura população de ambas as listas e adiciona logs]
function loadPublicView() {
    console.log("[loadPublicView] Iniciando..."); // Log inicial
    if (!authUser && dom.headerSubtitle) { dom.headerSubtitle.textContent = "Selecione um currículo ou faça login"; }

    // Limpa listas imediatamente e mostra loader
    if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = '<div class="loader">Carregando perfis...</div>';
    if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = '<div class="loader">Carregando perfis...</div>';

    fetch('./data/public_profiles.json', { cache: 'no-cache' }) // Usar no-cache ajuda a obter a versão mais recente
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar public_profiles.json`);
            return response.json();
        })
        .then(profiles => {
            console.log("[loadPublicView] Perfis carregados do JSON:", profiles); // Log dos dados crus

            // Verifica se os elementos DOM existem antes de limpá-los novamente
            if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = '';
            if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = '';

            if (profiles && Object.keys(profiles).length > 0) {
                // Função helper para criar o card (reutilizada)
                const createCard = (uid, profile) => {
                    const card = document.createElement('div'); card.className = 'profile-card';
                    const r2HTML = profile.runner2Name && profile.runner2Name.trim() !== "" ? `<h3 class="runner2-name">${profile.runner2Name}</h3>` : '';
                    card.innerHTML = `<h3>${profile.runner1Name || 'Corredor 1'}</h3>${r2HTML}<p>${profile.teamName || 'Equipe'}</p>`;
                    card.addEventListener('click', () => { // Lógica de clique para carregar dados do RTDB
                        if (!authUser) { dom.loginOrPublicView?.classList.add('hidden'); dom.userContent?.classList.remove('hidden'); dom.btnBackToPublic?.classList.remove('hidden'); dom.btnBackToMyDashboard?.classList.add('hidden'); }
                        else { dom.btnBackToPublic?.classList.add('hidden'); dom.btnBackToMyDashboard?.classList.remove('hidden'); }
                        loadProfile(uid); loadRaces(uid); // Chama RTDB aqui
                    }); return card;
                };

                // Popula AMBAS as listas
                Object.entries(profiles).forEach(([uid, profile]) => {
                    console.log(`[loadPublicView] Processando perfil: ${uid}`); // Log para cada perfil
                    // Adiciona ao container PÚBLICO
                    if (dom.publicProfileListPublic) {
                        dom.publicProfileListPublic.appendChild(createCard(uid, profile));
                    }
                    // Adiciona ao container LOGADO (exceto o próprio usuário)
                    if (dom.publicProfileListLogged) {
                        console.log(`[loadPublicView] Verificando para lista logada. UID: ${uid}, Auth UID: ${authUser?.uid}`); // Log da verificação
                        if (!(authUser && authUser.uid === uid)) { // Condição para não mostrar o próprio
                           console.log(`[loadPublicView] Adicionando ${uid} à lista logada.`); // Log se adicionar
                           dom.publicProfileListLogged.appendChild(createCard(uid, profile));
                        } else {
                           console.log(`[loadPublicView] Pulando próprio perfil ${uid} da lista logada.`); // Log se pular
                        }
                    }
                });

                 // Verifica se a lista logada ficou vazia APÓS o loop
                 if (dom.publicProfileListLogged && dom.publicProfileListLogged.children.length === 0) {
                     console.log("[loadPublicView] Lista logada vazia após processar perfis."); // Log lista vazia
                     const profileCount = Object.keys(profiles).length;
                     const loggedInUserWasOnlyProfile = profileCount === 1 && authUser && profiles[authUser.uid];

                     if(loggedInUserWasOnlyProfile){
                         dom.publicProfileListLogged.innerHTML = '<div class="loader">Nenhum outro perfil público encontrado.</div>';
                     } else if (authUser) { // Se logado, mas lista vazia por outra razão
                         dom.publicProfileListLogged.innerHTML = '<div class="loader">Nenhum outro perfil público encontrado.</div>'; // Mantém mensagem padrão
                     }
                     // Se não estiver logado, a lista deve ficar vazia (o que já acontece)
                 } else if (dom.publicProfileListLogged) {
                     console.log(`[loadPublicView] Lista logada finalizada com ${dom.publicProfileListLogged.children.length} perfis.`); // Log contagem final
                 }

            } else {
                // Mensagem se não houver NENHUM perfil no JSON
                console.log("[loadPublicView] Nenhum perfil encontrado no JSON."); // Log JSON vazio
                const msg = '<div class="loader">Nenhum perfil público encontrado.</div>';
                if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = msg;
                if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = msg;
            }
        })
        .catch(error => {
            console.error("[loadPublicView] Falha CRÍTICA ao carregar ou processar 'public_profiles.json':", error);
            const msg = `<div class="loader" style="color:red;">Erro ao carregar perfis (${error.message}). Verifique o console.</div>`;
            if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = msg;
            if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = msg;
        });
}


// --- Funções de Lógica de UI (V1 - Roteador) ---
// ... (código dos roteadores showLoggedOutView, showPendingView, showRejectedView, showUserDashboard permanece o mesmo) ...
function showLoggedOutView(){authUser=null;isAdmin=false;currentViewingUid=null;dom.btnLogout?.classList.add('hidden');dom.btnBackToPublic?.classList.add('hidden');dom.btnBackToMyDashboard?.classList.add('hidden');dom.userInfo?.classList.add('hidden');dom.controlsSection?.classList.add('hidden');dom.pendingApprovalView?.classList.add('hidden');dom.rejectedView?.classList.add('hidden');dom.loginOrPublicView?.classList.remove('hidden');dom.publicView?.classList.remove('hidden');dom.userContent?.classList.add('hidden');if(dom.loginError)dom.loginError.textContent='';if(dom.loginForm)dom.loginForm.reset();toggleLoginMode(false);db={races:{},profile:{}};loadPublicView();fetchAllData();}
function showPendingView(){dom.btnLogout?.classList.remove('hidden');dom.userInfo?.classList.remove('hidden');if(dom.userEmail)dom.userEmail.textContent=authUser?.email||'';dom.loginOrPublicView?.classList.add('hidden');dom.userContent?.classList.add('hidden');dom.btnBackToPublic?.classList.add('hidden');dom.rejectedView?.classList.add('hidden');dom.pendingApprovalView?.classList.remove('hidden');}
function showRejectedView(email){dom.btnLogout?.classList.remove('hidden');dom.userInfo?.classList.remove('hidden');if(dom.userEmail)dom.userEmail.textContent=email||'';dom.loginOrPublicView?.classList.add('hidden');dom.userContent?.classList.add('hidden');dom.btnBackToPublic?.classList.add('hidden');dom.pendingApprovalView?.classList.add('hidden');if(dom.rejectedEmail)dom.rejectedEmail.textContent=email||'';dom.rejectedView?.classList.remove('hidden');}
function showUserDashboard(user){if(!user)return;dom.btnLogout?.classList.remove('hidden');dom.userInfo?.classList.remove('hidden');if(dom.userEmail)dom.userEmail.textContent=user.email;dom.loginOrPublicView?.classList.add('hidden');dom.pendingApprovalView?.classList.add('hidden');dom.rejectedView?.classList.add('hidden');dom.btnBackToPublic?.classList.add('hidden');dom.btnBackToMyDashboard?.classList.add('hidden');dom.userContent?.classList.remove('hidden');loadProfile(user.uid);loadRaces(user.uid);fetchAllData();loadPublicView();if(isAdmin){dom.userInfo?.classList.add('admin-user');if(typeof initializeAdminPanel==='function'){initializeAdminPanel(user.uid,database);}else{console.error("initializeAdminPanel não encontrada.");}}else{dom.userInfo?.classList.remove('admin-user');const aP=document.getElementById('admin-panel');if(aP)aP.classList.add('hidden');}}


// --- Funções de Autenticação (V1) ---
// ... (código das funções de autenticação permanece o mesmo) ...
function showLoginError(message){if(dom.loginError)dom.loginError.textContent=message;}
function toggleLoginMode(isSigningUp){if(!dom.loginTitle||!dom.signupFields||!dom.btnLoginSubmit||!dom.btnSignUpSubmit||!dom.loginToggleLink||!dom.loginError)return;if(isSigningUp){dom.loginTitle.textContent="Cadastrar";dom.signupFields.classList.remove('hidden');dom.btnLoginSubmit.classList.add('hidden');dom.btnSignUpSubmit.classList.remove('hidden');dom.loginToggleLink.textContent="Já tem conta? Entrar";}else{dom.loginTitle.textContent="Acessar Currículo";dom.signupFields.classList.add('hidden');dom.btnLoginSubmit.classList.remove('hidden');dom.btnSignUpSubmit.classList.add('hidden');dom.loginToggleLink.textContent="Não tem conta? Cadastre-se";}dom.loginError.textContent='';}
function handleSignUp(e){e.preventDefault();if(!auth||!dom.loginEmail||!dom.loginPassword||!dom.signupRunner1Name)return;const m=dom.loginEmail.value;const p=dom.loginPassword.value;const r1=dom.signupRunner1Name.value;dom.loginError.textContent='';if(p.length<6){showLoginError("Senha curta (mín. 6).");return;}if(!r1){showLoginError("Nome Corredor 1 obrigatório.");return;}auth.createUserWithEmailAndPassword(m,p).then((c)=>{const u=c.user;if(!u||!database)return;const pR=database.ref('/pendingApprovals/'+u.uid);pR.set({email:u.email,requestDate:new Date().toISOString(),runner1Name:r1,runner2Name:dom.signupRunner2Name?.value||"",teamName:dom.signupTeamName?.value||""});console.log("Cadastrado:",u.uid);dom.loginForm?.reset();toggleLoginMode(false);showLoginError("Cadastro OK! Aguarde aprovação.");}).catch(err=>{console.error("ErrSignUp:",err);showLoginError(err.code==='auth/email-already-in-use'?"E-mail já existe.":"Erro:"+err.message);});}
function handleSignIn(e){e.preventDefault();if(!auth||!dom.loginEmail||!dom.loginPassword)return;const m=dom.loginEmail.value;const p=dom.loginPassword.value;dom.loginError.textContent='';auth.signInWithEmailAndPassword(m,p).catch(err=>{console.error("ErrSignIn:",err);showLoginError((err.code==='auth/user-not-found'||err.code==='auth/wrong-password'||err.code==='auth/invalid-credential'||err.code==='auth/invalid-email')?"E-mail/senha inválidos.":"Erro:"+err.message);});}
function signOut(){if(database){database.ref('/pendingApprovals').off();database.ref('/publicProfiles').off();if(currentViewingUid){database.ref(`/users/${currentViewingUid}/profile`).off();database.ref(`/users/${currentViewingUid}/races`).off();}}if(auth)auth.signOut().catch(err=>console.error("ErrLogout:",err));}

// ======================================================
// SEÇÃO V2: LÓGICA DO CALENDÁRIO PÚBLICO (Lê JSON)
// ======================================================
// ... (código de fetchAllData, renderContentV2, renderCalendar, showRaceResultsModal, etc. permanece o mesmo) ...
async function fetchAllData(){try{const[cR,rR,rkR]=await Promise.all([fetch('./data/corridas.json',{cache:'no-cache'}),fetch('./data/resultados.json',{cache:'no-cache'}),fetch('./data/ranking.json',{cache:'no-cache'})]);if(!cR.ok)throw new Error(`corridas.json: ${cR.statusText}`);if(!rR.ok)throw new Error(`resultados.json: ${rR.statusText}`);appState.allCorridas=await cR.json();appState.resultadosEtapas=await rR.json();appState.rankingData=rkR.ok?await rkR.json():{};console.log("V2(Corridas):",appState.allCorridas);console.log("V2(Resultados):",appState.resultadosEtapas);console.log("V2(Ranking):",appState.rankingData);renderContentV2();}catch(error){console.error("Falha JSON:",error);const eM=`<p class="loader" style="color:red;">Erro calendário (${error.message}).</p>`;const c=[dom.copaContainerPublic,dom.geralContainerPublic,dom.resultadosContainerPublic,dom.copaContainerLogged,dom.geralContainerLogged,dom.resultadosContainerLogged];c.forEach(el=>{if(el)el.innerHTML=eM;});}}
function renderContentV2(){const tC=Object.values(appState.allCorridas?.copaAlcer||{});const tG=Object.values(appState.allCorridas?.geral||{});const h=new Date();h.setHours(0,0,0,0);const aC=tC.filter(c=>c.data&&new Date(c.data)>=h);const r=tC.filter(c=>c.data&&new Date(c.data)<h);renderCalendar(aC,dom.copaContainerPublic,'inscrições');renderCalendar(tG,dom.geralContainerPublic,'inscrições');renderCalendar(r,dom.resultadosContainerPublic,'resultados');renderCalendar(aC,dom.copaContainerLogged,'inscrições');renderCalendar(tG,dom.geralContainerLogged,'inscrições');renderCalendar(r,dom.resultadosContainerLogged,'resultados');}
function renderCalendar(corridas,container,buttonType){if(!container)return;if(!corridas||corridas.length===0){container.innerHTML=`<p class="loader" style="font-size:0.9em;color:#999;">Nenhuma corrida.</p>`;return;}const s=corridas.sort((a,b)=>new Date(a.data)-new Date(b.data));container.innerHTML=s.map(c=>{if(!c||!c.data)return'';const dO=new Date(`${c.data}T12:00:00Z`);const d=String(dO.getDate()).padStart(2,'0');const m=dO.toLocaleString("pt-BR",{month:"short"}).replace(".","").toUpperCase();let bH='';if(buttonType==='inscrições'){bH=c.linkInscricao?`<a href="${c.linkInscricao}" target="_blank" rel="noopener noreferrer" class="v2-inscricoes-button"><i class='bx bx-link-external'></i>Inscrições</a>`:`<div class="v2-race-button-disabled">Encerradas</div>`;}else{bH=appState.resultadosEtapas?.[c.id]?`<button class="v2-results-button" data-race-id="${c.id}"><i class='bx bx-table'></i>Resultados</button>`:`<div class="v2-race-button-disabled">Em Breve</div>`;}return`<div class="v2-race-card"><div class="v2-race-date"><span class="v2-race-date-day">${d}</span><span class="v2-race-date-month">${m}</span></div><div class="v2-race-info"><div><h3 class="font-bold text-lg text-white">${c.nome||'N/D'}</h3><p class="text-sm text-gray-400"><i class='bx bxs-map'></i>${c.cidade||'N/D'}</p></div><div class="v2-race-buttons">${bH}</div></div></div>`;}).join('');container.querySelectorAll('.v2-results-button').forEach(b=>b.addEventListener('click',(e)=>showRaceResultsModal(e.currentTarget.dataset.raceId)));}
function showRaceResultsModal(raceId){if(!dom.modalTitleResults||!dom.modalContentResults||!dom.modalSearchInput||!dom.modalOverlay)return;const r=appState.allCorridas?.copaAlcer?.[raceId]||appState.allCorridas?.geral?.[raceId];const res=appState.resultadosEtapas?.[raceId];if(!r||!res){console.error("Dados N/D:",raceId);return;}dom.modalTitleResults.textContent=`Resultados - ${r.nome}`;let cH='';for(const p in res){for(const g in res[p]){const a=res[p][g];if(a?.length>0){cH+=`<h3 class="v2-modal-category-title">${p} - ${g.charAt(0).toUpperCase()+g.slice(1)}</h3><div style="overflow-x:auto;"><table class="v2-results-table"><thead><tr><th>#</th><th>Atleta</th><th>Equipe</th><th>Tempo</th></tr></thead><tbody>${a.map(at=>`<tr><td class="font-medium">${at.classificacao||'?'}</td><td>${at.nome||'?'}</td><td style="color:#b0b0b0;">${at.assessoria||'N/A'}</td><td style="font-family:monospace;">${at.tempo||'?'}</td></tr>`).join('')}</tbody></table></div>`;}}}dom.modalContentResults.innerHTML=cH||'<p class="text-gray-400">Nenhum resultado.</p>';dom.modalSearchInput.value='';dom.modalOverlay.classList.remove('hidden');}
function filterResultsInModal(){if(!dom.modalSearchInput||!dom.modalContentResults)return;const t=dom.modalSearchInput.value.toUpperCase();dom.modalContentResults.querySelectorAll('.v2-results-table tbody tr').forEach(r=>{const n=r.cells[1]?.textContent.toUpperCase()||'';r.style.display=n.includes(t)?'':'none';});}
function closeResultsModal(){dom.modalOverlay?.classList.add('hidden');}

// ======================================================
// PONTO DE ENTRADA PRINCIPAL (DOM LOADED)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
    // ... (código do DOMContentLoaded permanece o mesmo) ...
    if(typeof FIREBASE_CONFIG==='undefined'){alert("ERRO: FIREBASE_CONFIG N/D.");document.body.innerHTML='<h1>ERRO CFG</h1>';return;}if(typeof firebase==='undefined'||typeof firebase.initializeApp!=='function'){alert("ERRO: SDK Firebase N/D.");document.body.innerHTML='<h1>ERRO SDK</h1>';return;}try{firebaseApp=firebase.initializeApp(FIREBASE_CONFIG);database=firebase.database();auth=firebase.auth();}catch(error){console.error("Err FB Init:",error);alert(`ERRO FATAL FB: ${error.message}`);document.body.innerHTML=`<h1>ERRO: ${error.message}</h1>`;return;}
    if(dom.btnAddnew)dom.btnAddnew.addEventListener('click',()=>openModal());if(dom.btnCloseModal)dom.btnCloseModal.addEventListener('click',(e)=>{e.preventDefault();closeModal();});if(dom.btnCancel)dom.btnCancel.addEventListener('click',(e)=>{e.preventDefault();closeModal();});if(dom.form)dom.form.addEventListener('submit',handleFormSubmit);if(dom.btnDelete)dom.btnDelete.addEventListener('click',()=>{const id=document.getElementById('race-id')?.value;if(id)deleteRace(id);});
    if(dom.btnLoginSubmit)dom.btnLoginSubmit.addEventListener('click',handleSignIn);if(dom.btnSignUpSubmit)dom.btnSignUpSubmit.addEventListener('click',handleSignUp);if(dom.btnLogout)dom.btnLogout.addEventListener('click',signOut);if(dom.btnBackToPublic)dom.btnBackToPublic.addEventListener('click',showLoggedOutView);if(dom.loginToggleLink)dom.loginToggleLink.addEventListener('click',()=>{const iS=dom.signupFields?.classList.contains('hidden');toggleLoginMode(iS);});if(dom.btnBackToMyDashboard)dom.btnBackToMyDashboard.addEventListener('click',()=>{if(authUser){dom.btnBackToMyDashboard.classList.add('hidden');showUserDashboard(authUser);}});toggleLoginMode(false);
    if(dom.modalSearchInput)dom.modalSearchInput.addEventListener('keyup',filterResultsInModal);if(dom.btnCloseResultsModal)dom.btnCloseResultsModal.addEventListener('click',closeResultsModal);if(dom.modalOverlay)dom.modalOverlay.addEventListener('click',(e)=>{if(e.target===dom.modalOverlay){closeResultsModal();}});
    if(auth){auth.onAuthStateChanged((user)=>{if(user){authUser=user;isAdmin=user.uid==='29d30W4RS1WzK4SWZRZ5pEFnOdm1';if(!database){console.error("DB N/D Auth");return;}database.ref('/users/'+user.uid).once('value').then(uS=>{if(uS.exists()||isAdmin){showUserDashboard(user);}else{database.ref('/pendingApprovals/'+user.uid).once('value').then(pS=>{if(pS.exists()){showPendingView();}else{showRejectedView(user.email);}}).catch(err=>{if(err.code==="PERMISSION_DENIED"){console.error("Err Regras (pend):",err);showLoggedOutView();alert("Erro DB.");auth.signOut();}else{console.error("Err pending:",err);showLoggedOutView();}});}}).catch(err=>{console.error("Err /users:",err);showLoggedOutView();});}else{showLoggedOutView();}});
    }else{console.error("Auth N/D.");showLoggedOutView();}
}); // Fim DOMContentLoaded
