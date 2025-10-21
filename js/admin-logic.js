// =================================================================
// ARQUIVO DE LÓGICA DO PAINEL DE ADMIN (V3 - Fundido V1+V2)
// =================================================================

// Esta função é o ponto de entrada, chamada pelo main-logic.js se o usuário for admin
function initializeAdminPanel(adminUid, db) {
    console.log("Inicializando Painel de Admin...");

    // --- Cache de Elementos DOM do Admin ---
    const adminDom = {
        adminPanel: document.getElementById('admin-panel'),
        // Seções Colapsáveis
        usersSection: document.getElementById('admin-users-section'),
        racesSection: document.getElementById('admin-races-section'),
        usersSectionContent: document.querySelector('#admin-users-section .admin-section-content'),
        racesSectionContent: document.querySelector('#admin-races-section .admin-section-content'),
        usersToggleIcon: document.querySelector('#admin-users-section .admin-toggle-icon'),
        racesToggleIcon: document.querySelector('#admin-races-section .admin-toggle-icon'),
        // V1 (Usuários)
        pendingList: document.getElementById('pending-list'),
        approvedList: document.getElementById('approved-list'),
        // V2 (Corridas)
        raceForm: document.getElementById('race-form-admin'),
        formTitle: document.getElementById('form-title'),
        raceIdInput: document.getElementById('race-id-admin'),
        raceNameInput: document.getElementById('race-name'),
        raceCityInput: document.getElementById('race-city'),
        raceDateInput: document.getElementById('race-date-admin'),
        raceLinkInput: document.getElementById('race-link'),
        raceCalendarSelect: document.getElementById('race-calendar'),
        copaRaceList: document.getElementById('copa-race-list'),
        geralRaceList: document.getElementById('geral-race-list'),
        resultsRaceSelect: document.getElementById('race-select-results'),
        uploadResultsButton: document.getElementById('upload-results-button'),
        resultsFileInput: document.getElementById('results-file'),
        uploadResultsStatus: document.getElementById('upload-results-status'),
        rankingFileInput: document.getElementById('ranking-file'),
        uploadRankingButton: document.getElementById('upload-ranking-button'),
        uploadRankingStatus: document.getElementById('upload-ranking-status'),
        clearFormButton: document.getElementById('clear-form-button'),
        // [NOVO] Modal Edição Usuário
        userEditModal: document.getElementById('user-edit-modal'),
        userEditForm: document.getElementById('user-edit-form'),
        userEditModalTitle: document.getElementById('user-edit-modal-title'),
        userEditUidInput: document.getElementById('user-edit-uid'),
        userEditRunner1Input: document.getElementById('user-edit-runner1-name'),
        userEditRunner2Input: document.getElementById('user-edit-runner2-name'),
        userEditTeamInput: document.getElementById('user-edit-team-name'),
        userEditError: document.getElementById('user-edit-error'),
        userEditBtnClose: document.getElementById('user-edit-btn-close-modal'),
        userEditBtnCancel: document.getElementById('user-edit-btn-cancel')
    };

    // Mostra o painel de admin
    if (adminDom.adminPanel) adminDom.adminPanel.classList.remove('hidden');

    // Inicializa os listeners e carregadores
    addAdminEventListeners();
    loadPendingList();
    loadApprovedUsersList();
    loadAndDisplayRaces();
    // [NOVO] Restaura estado colapsado
    restoreCollapsedState();

    // --- Listeners de Eventos do Admin ---
    function addAdminEventListeners() {
        // Forms V2
        adminDom.raceForm?.addEventListener('submit', handleRaceFormSubmit);
        adminDom.clearFormButton?.addEventListener('click', clearForm);
        adminDom.uploadResultsButton?.addEventListener('click', handleResultsUpload);
        adminDom.uploadRankingButton?.addEventListener('click', handleRankingUpload);

        // [NOVO] Listeners Colapso
        adminDom.usersSection?.querySelector('.admin-section-toggle')?.addEventListener('click', () => toggleSectionCollapse('users'));
        adminDom.racesSection?.querySelector('.admin-section-toggle')?.addEventListener('click', () => toggleSectionCollapse('races'));

        // [NOVO] Listeners Modal Edição Usuário
        adminDom.userEditForm?.addEventListener('submit', handleUserEditFormSubmit);
        adminDom.userEditBtnClose?.addEventListener('click', closeUserEditModal);
        adminDom.userEditBtnCancel?.addEventListener('click', closeUserEditModal);
    }

    // ======================================================
    // [NOVA SEÇÃO] LÓGICA DE COLAPSO
    // ======================================================
    const COLLAPSED_STATE_KEY = 'adminCollapsedSections';

    function toggleSectionCollapse(sectionName) {
        const content = sectionName === 'users' ? adminDom.usersSectionContent : adminDom.racesSectionContent;
        const icon = sectionName === 'users' ? adminDom.usersToggleIcon : adminDom.racesToggleIcon;
        const section = sectionName === 'users' ? adminDom.usersSection : adminDom.racesSection;

        if (!content || !icon || !section) return;

        const isCollapsed = content.style.display === 'none';
        content.style.display = isCollapsed ? '' : 'none'; // Alterna display
        icon.classList.toggle('rotated', !isCollapsed); // Gira o ícone
        section.classList.toggle('collapsed-section', !isCollapsed); // Adiciona classe ao container (opcional, para estilo)

        // Salva estado no localStorage
        const collapsedStates = JSON.parse(localStorage.getItem(COLLAPSED_STATE_KEY)) || {};
        collapsedStates[sectionName] = !isCollapsed;
        localStorage.setItem(COLLAPSED_STATE_KEY, JSON.stringify(collapsedStates));
    }

    function restoreCollapsedState() {
        const collapsedStates = JSON.parse(localStorage.getItem(COLLAPSED_STATE_KEY)) || {};
        if (collapsedStates['users']) {
            adminDom.usersSectionContent.style.display = 'none';
            adminDom.usersToggleIcon?.classList.add('rotated');
            adminDom.usersSection?.classList.add('collapsed-section');
        }
        if (collapsedStates['races']) {
            adminDom.racesSectionContent.style.display = 'none';
            adminDom.racesToggleIcon?.classList.add('rotated');
            adminDom.racesSection?.classList.add('collapsed-section');
        }
    }


    // ======================================================
    // SEÇÃO DE ADMIN V1: GESTÃO DE USUÁRIOS
    // ======================================================

    function loadPendingList() {
        // ... (código original sem alterações) ...
         if(!adminDom.pendingList) return;
        const pendingRef = db.ref('/pendingApprovals');
        pendingRef.on('value', (snapshot) => {
            const requests = snapshot.val();
            if (!requests) { adminDom.pendingList.innerHTML = '<div class="loader..." >Nenhuma aprovação pendente.</div>'; return; }
            adminDom.pendingList.innerHTML = '';
            Object.entries(requests).forEach(([uid, request]) => { /* ... cria item ... */
                 const item = document.createElement('div'); item.className = 'pending-item';
                item.innerHTML = `<div class="pending-item-info">${request.email}<span>${request.runner1Name} ${request.runner2Name ? '& ' + request.runner2Name : ''} (${request.teamName || 'S/ Equipe'})</span></div><div class="admin-buttons"><button class="btn-approve" data-uid="${uid}" data-r1="${request.runner1Name}" data-r2="${request.runner2Name || ''}" data-team="${request.teamName || ''}">Aprovar</button><button class="btn-reject" data-uid="${uid}" data-email="${request.email}">Recusar</button></div>`;
                adminDom.pendingList.appendChild(item);
             });
            adminDom.pendingList.querySelectorAll('.btn-approve').forEach(b => b.addEventListener('click', (e) => { const d = e.target.dataset; approveUser(d.uid, d.r1, d.r2, d.team); }));
            adminDom.pendingList.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', (e) => { const d = e.target.dataset; rejectUser(d.uid, d.email); }));
        });
    }

    // [MODIFICADO] Adiciona botão Editar
    function loadApprovedUsersList() {
         if(!adminDom.approvedList) return;
        const publicProfilesRef = db.ref('/publicProfiles');
        publicProfilesRef.on('value', (snapshot) => {
            const profiles = snapshot.val();
            adminDom.approvedList.innerHTML = '';
            if (!profiles) { adminDom.approvedList.innerHTML = '<div class="loader...">Nenhum usuário aprovado.</div>'; return; }

            Object.entries(profiles).forEach(([uid, profile]) => {
                if (uid === adminUid) return; // Não listar o próprio admin

                const item = document.createElement('div');
                item.className = 'approved-item';
                item.innerHTML = `
                    <div class="approved-item-info">
                        ${profile.runner1Name} ${profile.runner2Name ? '& ' + profile.runner2Name : ''}
                        <span>Equipe: ${profile.teamName || 'N/A'}</span>
                    </div>
                    <div class="admin-buttons">
                        <button class="btn-edit-user btn-secondary" data-uid="${uid}"><i class='bx bx-pencil'></i> Editar</button> <button class="btn-delete-user" data-uid="${uid}" data-name="${profile.runner1Name}">Excluir</button>
                    </div>
                `;
                adminDom.approvedList.appendChild(item);
            });

            // Listener para Excluir (sem alterações)
            adminDom.approvedList.querySelectorAll('.btn-delete-user').forEach(button => {
                button.addEventListener('click', (e) => {
                    const data = e.target.dataset;
                    deleteUser(data.uid, data.name);
                });
            });

            // [NOVO] Listener para Editar
             adminDom.approvedList.querySelectorAll('.btn-edit-user').forEach(button => {
                button.addEventListener('click', (e) => {
                    const uid = e.currentTarget.dataset.uid; // Pegar uid do botão clicado
                    openUserEditModal(uid);
                });
            });
        });
    }

    function approveUser(uid, runner1Name, runner2Name, teamName) {
        // ... (código original sem alterações) ...
        const p1 = { runner1Name: runner1Name, runner2Name: runner2Name || "", teamName: teamName || "Equipe" };
        const p2 = { runner1Name: runner1Name, runner2Name: runner2Name || "", teamName: teamName || "Equipe" };
        const updates = {}; updates[`/users/${uid}/profile`] = p1; updates[`/publicProfiles/${uid}`] = p2; updates[`/pendingApprovals/${uid}`] = null;
        db.ref().update(updates).then(() => alert(`Aprovado: ${runner1Name}`)).catch((err) => { console.error("Erro:", err); alert("Erro ao aprovar."); });
    }

    function rejectUser(uid, email) {
        // ... (código original sem alterações) ...
        if (!confirm(`RECUSAR ${email}?`)) return;
        db.ref('/pendingApprovals/' + uid).remove().then(() => alert(`Recusado: ${email}`)).catch((err) => { console.error("Erro:", err); alert("Erro ao recusar."); });
    }

    function deleteUser(uid, name) {
        // ... (código original sem alterações) ...
        if (!confirm(`EXCLUIR PERMANENTEMENTE ${name}? Dados serão apagados!`)) return;
        const updates = {}; updates[`/users/${uid}`] = null; updates[`/publicProfiles/${uid}`] = null;
        db.ref().update(updates).then(() => alert(`Excluído: ${name}`)).catch((err) => { console.error("Erro:", err); alert("Erro ao excluir."); });
    }

    // ======================================================
    // [NOVA SEÇÃO] LÓGICA DE EDIÇÃO DE USUÁRIO
    // ======================================================

    function openUserEditModal(uid) {
        if (!adminDom.userEditModal) return;
        adminDom.userEditForm.reset(); // Limpa o formulário
        adminDom.userEditError.textContent = ''; // Limpa erros
        adminDom.userEditUidInput.value = uid; // Armazena o UID

        // Busca os dados atuais do perfil (tanto privado quanto público para garantir)
        Promise.all([
            db.ref(`/users/${uid}/profile`).once('value'),
            db.ref(`/publicProfiles/${uid}`).once('value')
        ]).then(([userSnap, publicSnap]) => {
            const userData = userSnap.val();
            const publicData = publicSnap.val();

            if (!userData || !publicData) {
                throw new Error("Dados do usuário não encontrados.");
            }

            // Popula o formulário
            adminDom.userEditRunner1Input.value = userData.runner1Name || '';
            adminDom.userEditRunner2Input.value = userData.runner2Name || ''; // Mostra vazio se não existir
            adminDom.userEditTeamInput.value = userData.teamName || '';
            adminDom.userEditModalTitle.textContent = `Editando: ${userData.runner1Name}`;

            // Abre o modal
            if (typeof adminDom.userEditModal.showModal === 'function') {
                adminDom.userEditModal.showModal();
            } else {
                adminDom.userEditModal.classList.remove('hidden'); // Fallback
            }

        }).catch(error => {
            console.error("Erro ao carregar dados do usuário para edição:", error);
            alert(`Erro ao carregar dados: ${error.message}`);
        });
    }

    function closeUserEditModal() {
        if (adminDom.userEditModal) {
             if (typeof adminDom.userEditModal.close === 'function') {
                adminDom.userEditModal.close();
             } else {
                 adminDom.userEditModal.classList.add('hidden'); // Fallback
             }
        }
    }

    function handleUserEditFormSubmit(e) {
        e.preventDefault();
        adminDom.userEditError.textContent = ''; // Limpa erros anteriores
        const saveButton = adminDom.userEditForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        const uid = adminDom.userEditUidInput.value;
        const runner1Name = adminDom.userEditRunner1Input.value.trim();
        const runner2Name = adminDom.userEditRunner2Input.value.trim(); // Usa trim() para salvar "" se vazio
        const teamName = adminDom.userEditTeamInput.value.trim();

        if (!uid || !runner1Name) {
            adminDom.userEditError.textContent = 'O Nome do Corredor 1 é obrigatório.';
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar Alterações';
            return;
        }

        const updatedProfileData = {
            runner1Name: runner1Name,
            runner2Name: runner2Name, // Salva string vazia se campo estiver vazio
            teamName: teamName
        };

        // Prepara atualizações para ambos os nós
        const updates = {};
        updates[`/users/${uid}/profile/runner1Name`] = runner1Name;
        updates[`/users/${uid}/profile/runner2Name`] = runner2Name;
        updates[`/users/${uid}/profile/teamName`] = teamName;
        updates[`/publicProfiles/${uid}/runner1Name`] = runner1Name;
        updates[`/publicProfiles/${uid}/runner2Name`] = runner2Name;
        updates[`/publicProfiles/${uid}/teamName`] = teamName;

        db.ref().update(updates)
            .then(() => {
                console.log(`Perfil ${uid} atualizado com sucesso.`);
                closeUserEditModal();
                alert('Perfil atualizado com sucesso!');
                // A lista de usuários aprovados será atualizada automaticamente pelo listener 'on value'
            })
            .catch((error) => {
                console.error("Erro ao atualizar perfil:", error);
                adminDom.userEditError.textContent = `Erro ao salvar: ${error.message}`;
            })
            .finally(() => {
                 saveButton.disabled = false;
                 saveButton.textContent = 'Salvar Alterações';
            });
    }


    // ======================================================
    // SEÇÃO DE ADMIN V2: GESTÃO DE CORRIDAS
    // ======================================================
    // ... (código original sem alterações) ...
     function loadAndDisplayRaces(){if(!adminDom.copaRaceList||!adminDom.geralRaceList)return;db.ref('corridas').on('value',s=>{const a=s.val()||{copaAlcer:{},geral:{}};renderRaceList(a.copaAlcer,adminDom.copaRaceList,'copaAlcer');renderRaceList(a.geral,adminDom.geralRaceList,'geral');populateResultsRaceSelect({...a.copaAlcer,...a.geral});});}
    function renderRaceList(races,element,calendar){element.innerHTML='';if(!races||Object.keys(races).length===0){element.innerHTML='<p class="loader...">Nenhuma corrida.</p>';return;}const f=document.createDocumentFragment();Object.keys(races).forEach(id=>{const r=races[id];const i=document.createElement('div');i.className='admin-race-item';i.innerHTML=`<div><p>${r.nome}</p><span>${new Date(r.data+'T12:00:00Z').toLocaleDateString('pt-BR')} - ${r.cidade}</span></div><div class="admin-race-item-controls"><button class="btn-control edit-btn" data-id="${id}" data-calendar="${calendar}"><i class='bx bx-pencil'></i></button><button class="btn-control delete-btn" data-id="${id}" data-calendar="${calendar}"><i class='bx bx-trash'></i></button></div>`;f.appendChild(i);});element.appendChild(f);element.querySelectorAll('.edit-btn').forEach(b=>b.addEventListener('click',()=>populateRaceFormForEdit(b.dataset.id,b.dataset.calendar)));element.querySelectorAll('.delete-btn').forEach(b=>b.addEventListener('click',()=>deleteRace(b.dataset.id,b.dataset.calendar)));}
    function handleRaceFormSubmit(e){e.preventDefault();if(!adminDom.raceNameInput)return;const rD={nome:adminDom.raceNameInput.value,cidade:adminDom.raceCityInput.value,data:adminDom.raceDateInput.value,linkInscricao:adminDom.raceLinkInput.value};const id=adminDom.raceIdInput.value;const c=adminDom.raceCalendarSelect.value;const rP=`corridas/${c}`;let p;if(id){p=db.ref(`${rP}/${id}`).update(rD);}else{const nR=db.ref(rP).push();rD.id=nR.key;p=nR.set(rD);}p.then(()=>{console.log("Corrida salva!");clearForm();}).catch(err=>console.error("Erro:",err));}
    function populateRaceFormForEdit(id,calendar){db.ref(`corridas/${calendar}/${id}`).once('value',s=>{const r=s.val();if(r){if(adminDom.formTitle)adminDom.formTitle.textContent="Editando Corrida";adminDom.raceIdInput.value=id;adminDom.raceNameInput.value=r.nome;adminDom.raceCityInput.value=r.cidade;adminDom.raceDateInput.value=r.data;adminDom.raceLinkInput.value=r.linkInscricao||'';adminDom.raceCalendarSelect.value=calendar;window.scrollTo({top:0,behavior:'smooth'});}}); }
    function deleteRace(id,calendar){if(confirm("Excluir corrida?")){db.ref(`corridas/${calendar}/${id}`).remove().then(()=>console.log("Excluída.")).catch(err=>console.error("Erro:",err));}}
    function clearForm(){if(adminDom.formTitle)adminDom.formTitle.textContent="Cadastrar Corrida";adminDom.raceForm?.reset();if(adminDom.raceIdInput)adminDom.raceIdInput.value='';}
    function populateResultsRaceSelect(races){if(!adminDom.resultsRaceSelect)return;adminDom.resultsRaceSelect.innerHTML='<option value="">Selecione etapa</option>';if(!races)return;const sR=Object.values(races).sort((a,b)=>new Date(b.data)-new Date(a.data));sR.forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=`${r.nome} (${new Date(r.data+'T12:00:00Z').toLocaleDateString('pt-BR')})`;adminDom.resultsRaceSelect.appendChild(o);});}
    function handleResultsUpload(){const rId=adminDom.resultsRaceSelect?.value;const f=adminDom.resultsFileInput?.files[0];if(!rId||!f){updateStatus("Selecione corrida e JSON.", "error",'results');return;}readFileAsJson(f,(d)=>processAndUploadResults(rId,d),'results');}
    function handleRankingUpload(){const f=adminDom.rankingFileInput?.files[0];if(!f){updateStatus("Selecione JSON ranking.", "error",'ranking');return;}readFileAsJson(f,(d)=>uploadFinalRanking(d),'ranking');}
    function readFileAsJson(file,callback,type){const r=new FileReader();r.onload=(e)=>{try{const j=JSON.parse(e.target.result);callback(j);}catch(err){updateStatus(`Erro JSON:${err.message}`,"error",type);}};r.readAsText(file);}
    function processAndUploadResults(raceId,resultsData){updateStatus("Enviando...", "loading",'results');db.ref('resultadosEtapas/'+raceId).set(resultsData).then(()=>updateStatus("Resultados OK!","success",'results')).catch(err=>updateStatus(`Falha:${err.message}`,"error",'results'));}
    function uploadFinalRanking(rankingData){updateStatus("Enviando...", "loading",'ranking');db.ref('rankingCopaAlcer').set(rankingData).then(()=>updateStatus("Ranking OK!","success",'ranking')).catch(err=>updateStatus(`Falha:${err.message}`,"error",'ranking'));}
    function updateStatus(message,type,target){const sE=target==='ranking'?adminDom.uploadRankingStatus:adminDom.uploadResultsStatus;if(!sE)return;sE.textContent=message;sE.className='upload-status ';if(type==='success')sE.classList.add('text-green-500');else if(type==='error')sE.classList.add('text-red-500');else sE.classList.add('text-yellow-500');}

} // Fim da função initializeAdminPanel
