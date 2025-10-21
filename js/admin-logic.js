// =================================================================
// ARQUIVO DE LÓGICA DO PAINEL DE ADMIN (V3 - Fundido V1+V2)
// =================================================================

// Esta função é o ponto de entrada, chamada pelo main-logic.js se o usuário for admin
function initializeAdminPanel(adminUid, db) {
    console.log("Inicializando Painel de Admin...");

    // --- Cache de Elementos DOM do Admin ---
    const adminDom = {
        get: (id) => document.getElementById(id), // Helper

        get adminPanel() { return this.get('admin-panel'); },
        // Seções Colapsáveis
        get usersSection() { return this.get('admin-users-section'); },
        get racesSection() { return this.get('admin-races-section'); },
        get usersSectionContent() { return this.usersSection?.querySelector('.admin-section-content'); },
        get racesSectionContent() { return this.racesSection?.querySelector('.admin-section-content'); },
        get usersToggleIcon() { return this.usersSection?.querySelector('.admin-toggle-icon'); },
        get racesToggleIcon() { return this.racesSection?.querySelector('.admin-toggle-icon'); },
        // V1 (Usuários)
        get pendingList() { return this.get('pending-list'); },
        get approvedList() { return this.get('approved-list'); },
        // V2 (Corridas)
        get raceForm() { return this.get('race-form-admin'); },
        get formTitle() { return this.get('form-title'); },
        get raceIdInput() { return this.get('race-id-admin'); },
        get raceNameInput() { return this.get('race-name'); },
        get raceCityInput() { return this.get('race-city'); },
        get raceDateInput() { return this.get('race-date-admin'); },
        get raceLinkInput() { return this.get('race-link'); },
        get raceCalendarSelect() { return this.get('race-calendar'); },
        get copaRaceList() { return this.get('copa-race-list'); },
        get geralRaceList() { return this.get('geral-race-list'); },
        get resultsRaceSelect() { return this.get('race-select-results'); },
        get uploadResultsButton() { return this.get('upload-results-button'); },
        get resultsFileInput() { return this.get('results-file'); },
        get uploadResultsStatus() { return this.get('upload-results-status'); },
        get rankingFileInput() { return this.get('ranking-file'); },
        get uploadRankingButton() { return this.get('upload-ranking-button'); },
        get uploadRankingStatus() { return this.get('upload-ranking-status'); },
        get clearFormButton() { return this.get('clear-form-button'); },
        // Modal Edição Usuário
        get userEditModal() { return this.get('user-edit-modal'); },
        get userEditForm() { return this.get('user-edit-form'); },
        get userEditModalTitle() { return this.get('user-edit-modal-title'); },
        get userEditUidInput() { return this.get('user-edit-uid'); },
        get userEditRunner1Input() { return this.get('user-edit-runner1-name'); },
        get userEditRunner2Input() { return this.get('user-edit-runner2-name'); },
        get userEditTeamInput() { return this.get('user-edit-team-name'); },
        get userEditError() { return this.get('user-edit-error'); },
        get userEditBtnClose() { return this.get('user-edit-btn-close-modal'); },
        get userEditBtnCancel() { return this.get('user-edit-btn-cancel'); }
    };

    // Verifica se os elementos principais existem antes de continuar
    if (!adminDom.adminPanel || !adminDom.usersSection || !adminDom.racesSection) {
        console.error("Painel de Admin não pôde ser inicializado - Elementos essenciais ausentes.");
        return;
    }

    // Mostra o painel de admin
    adminDom.adminPanel.classList.remove('hidden');

    // Inicializa os listeners e carregadores
    addAdminEventListeners();
    loadPendingList();
    loadApprovedUsersList();
    loadAndDisplayRaces();
    restoreCollapsedState(); // Restaura estado colapsado

    // --- Listeners de Eventos do Admin ---
    function addAdminEventListeners() {
        // Forms V2
        adminDom.raceForm?.addEventListener('submit', handleRaceFormSubmit);
        adminDom.clearFormButton?.addEventListener('click', clearForm);
        adminDom.uploadResultsButton?.addEventListener('click', handleResultsUpload);
        adminDom.uploadRankingButton?.addEventListener('click', handleRankingUpload);

        // Listeners Colapso
        adminDom.usersSection?.querySelector('.admin-section-toggle')?.addEventListener('click', () => toggleSectionCollapse('users'));
        adminDom.racesSection?.querySelector('.admin-section-toggle')?.addEventListener('click', () => toggleSectionCollapse('races'));

        // Listeners Modal Edição Usuário
        adminDom.userEditForm?.addEventListener('submit', handleUserEditFormSubmit);
        adminDom.userEditBtnClose?.addEventListener('click', closeUserEditModal);
        adminDom.userEditBtnCancel?.addEventListener('click', closeUserEditModal);

        // Listener para fechar modal clicando fora (opcional)
        adminDom.userEditModal?.addEventListener('click', (event) => {
            if (event.target === adminDom.userEditModal) {
                closeUserEditModal();
            }
        });
    }

    // ======================================================
    // LÓGICA DE COLAPSO DAS SEÇÕES DO ADMIN
    // ======================================================
    const COLLAPSED_STATE_KEY = 'adminCollapsedSections_v1'; // Chave única

    function toggleSectionCollapse(sectionName) {
        const content = sectionName === 'users' ? adminDom.usersSectionContent : adminDom.racesSectionContent;
        const icon = sectionName === 'users' ? adminDom.usersToggleIcon : adminDom.racesToggleIcon;
        const section = sectionName === 'users' ? adminDom.usersSection : adminDom.racesSection;

        if (!content || !icon || !section) {
             console.warn("Elemento de colapso não encontrado para:", sectionName);
             return;
        }

        const isCurrentlyCollapsed = content.style.display === 'none';
        content.style.display = isCurrentlyCollapsed ? '' : 'none'; // Alterna visibilidade
        icon.classList.toggle('rotated', !isCurrentlyCollapsed); // Gira o ícone
        section.classList.toggle('collapsed-section', !isCurrentlyCollapsed);

        // Salva estado no localStorage
        try {
            const collapsedStates = JSON.parse(localStorage.getItem(COLLAPSED_STATE_KEY)) || {};
            collapsedStates[sectionName] = !isCurrentlyCollapsed; // Salva o novo estado (se está colapsado ou não)
            localStorage.setItem(COLLAPSED_STATE_KEY, JSON.stringify(collapsedStates));
        } catch (e) {
            console.error("Erro ao salvar estado colapsado no localStorage:", e);
        }
    }

    function restoreCollapsedState() {
        try {
            const collapsedStates = JSON.parse(localStorage.getItem(COLLAPSED_STATE_KEY)) || {};
            if (collapsedStates['users']) {
                if(adminDom.usersSectionContent) adminDom.usersSectionContent.style.display = 'none';
                adminDom.usersToggleIcon?.classList.add('rotated');
                adminDom.usersSection?.classList.add('collapsed-section');
            } else {
                 if(adminDom.usersSectionContent) adminDom.usersSectionContent.style.display = ''; // Garante que esteja visível se não colapsado
            }
            if (collapsedStates['races']) {
                if(adminDom.racesSectionContent) adminDom.racesSectionContent.style.display = 'none';
                adminDom.racesToggleIcon?.classList.add('rotated');
                adminDom.racesSection?.classList.add('collapsed-section');
            } else {
                 if(adminDom.racesSectionContent) adminDom.racesSectionContent.style.display = ''; // Garante visibilidade
            }
        } catch (e) {
             console.error("Erro ao restaurar estado colapsado do localStorage:", e);
             // Reseta o estado se houver erro na leitura
             if(adminDom.usersSectionContent) adminDom.usersSectionContent.style.display = '';
             if(adminDom.racesSectionContent) adminDom.racesSectionContent.style.display = '';
             localStorage.removeItem(COLLAPSED_STATE_KEY);
        }
    }


    // ======================================================
    // SEÇÃO DE ADMIN V1: GESTÃO DE USUÁRIOS
    // ======================================================
    // Baseado no código original fornecido por você

    function loadPendingList() {
        if (!adminDom.pendingList) return;
        const pendingRef = db.ref('/pendingApprovals');
        // Limpa listener antigo para evitar duplicação se initializeAdminPanel for chamado mais de uma vez
        pendingRef.off('value');
        pendingRef.on('value', (snapshot) => {
            adminDom.pendingList.innerHTML = '<div class="loader...">Carregando Pendentes...</div>'; // Feedback
            const requests = snapshot.val();
            if (!requests) {
                adminDom.pendingList.innerHTML = '<div class="loader...">Nenhuma aprovação pendente.</div>';
                return;
            }

            adminDom.pendingList.innerHTML = ''; // Limpa antes de adicionar
            Object.entries(requests).forEach(([uid, request]) => {
                const item = document.createElement('div');
                item.className = 'pending-item';
                // Adiciona tratamento defensivo para caso request não tenha todas as props
                const r1 = request.runner1Name || '?';
                const r2 = request.runner2Name || '';
                const team = request.teamName || 'S/ Equipe';
                const email = request.email || '?';
                item.innerHTML = `
                    <div class="pending-item-info">
                        ${email}
                        <span>${r1} ${r2 ? '& ' + r2 : ''} (${team})</span>
                    </div>
                    <div class="admin-buttons">
                        <button class="btn-approve" data-uid="${uid}" data-r1="${r1}" data-r2="${r2}" data-team="${team}">Aprovar</button>
                        <button class="btn-reject" data-uid="${uid}" data-email="${email}">Recusar</button>
                    </div>
                `;
                adminDom.pendingList.appendChild(item);
            });

            // Reatribui listeners após recriar os botões
            adminDom.pendingList.querySelectorAll('.btn-approve').forEach(button => button.addEventListener('click', (e) => { const data = e.target.dataset; approveUser(data.uid, data.r1, data.r2, data.team); }));
            adminDom.pendingList.querySelectorAll('.btn-reject').forEach(button => button.addEventListener('click', (e) => { const data = e.target.dataset; rejectUser(data.uid, data.email); }));
        });
    }

    function loadApprovedUsersList() {
        if (!adminDom.approvedList) return;
        const publicProfilesRef = db.ref('/publicProfiles');
        // Limpa listener antigo
        publicProfilesRef.off('value');
        publicProfilesRef.on('value', (snapshot) => {
            adminDom.approvedList.innerHTML = '<div class="loader...">Carregando Aprovados...</div>'; // Feedback
            const profiles = snapshot.val();
            if (!profiles) {
                adminDom.approvedList.innerHTML = '<div class="loader...">Nenhum usuário aprovado.</div>';
                return;
            }

            adminDom.approvedList.innerHTML = ''; // Limpa antes de adicionar
            Object.entries(profiles).forEach(([uid, profile]) => {
                if (uid === adminUid) return; // Não listar o próprio admin

                const item = document.createElement('div');
                item.className = 'approved-item';
                 // Tratamento defensivo para profile
                 const r1 = profile.runner1Name || '?';
                 const r2 = profile.runner2Name || '';
                 const team = profile.teamName || 'N/A';
                item.innerHTML = `
                    <div class="approved-item-info">
                        ${r1} ${r2 ? '& ' + r2 : ''}
                        <span>Equipe: ${team}</span>
                    </div>
                    <div class="admin-buttons">
                        <button class="btn-edit-user btn-secondary" data-uid="${uid}"><i class='bx bx-pencil'></i> Editar</button>
                        <button class="btn-delete-user" data-uid="${uid}" data-name="${r1}">Excluir</button>
                    </div>
                `;
                adminDom.approvedList.appendChild(item);
            });

            // Reatribui listeners
            adminDom.approvedList.querySelectorAll('.btn-delete-user').forEach(button => button.addEventListener('click', (e) => { const data = e.target.dataset; deleteUser(data.uid, data.name); }));
            adminDom.approvedList.querySelectorAll('.btn-edit-user').forEach(button => button.addEventListener('click', (e) => { const uid = e.currentTarget.dataset.uid; openUserEditModal(uid); }));
        });
    }

    function approveUser(uid, runner1Name, runner2Name, teamName) {
        // ... (código original sem alterações) ...
        const p1 = { runner1Name: runner1Name, runner2Name: runner2Name || "", teamName: teamName || "Equipe" };
        const p2 = { runner1Name: runner1Name, runner2Name: runner2Name || "", teamName: teamName || "Equipe" };
        const updates = {}; updates[`/users/${uid}/profile`] = p1; updates[`/publicProfiles/${uid}`] = p2; updates[`/pendingApprovals/${uid}`] = null;
        db.ref().update(updates).then(() => alert(`Aprovado: ${runner1Name}`)).catch((err) => { console.error("Erro aprovar:", err); alert("Erro ao aprovar."); });
    }

    function rejectUser(uid, email) {
        // ... (código original sem alterações) ...
        if (!confirm(`RECUSAR ${email}?`)) return;
        db.ref('/pendingApprovals/' + uid).remove().then(() => alert(`Recusado: ${email}`)).catch((err) => { console.error("Erro recusar:", err); alert("Erro ao recusar."); });
    }

    function deleteUser(uid, name) {
        // ... (código original sem alterações) ...
        if (!confirm(`EXCLUIR PERMANENTEMENTE ${name}? Dados serão apagados!`)) return;
        const updates = {}; updates[`/users/${uid}`] = null; updates[`/publicProfiles/${uid}`] = null;
        db.ref().update(updates).then(() => alert(`Excluído: ${name}`)).catch((err) => { console.error("Erro excluir:", err); alert("Erro ao excluir."); });
    }

    // ======================================================
    // LÓGICA DE EDIÇÃO DE USUÁRIO (NOVA)
    // ======================================================

    function openUserEditModal(uid) {
        if (!adminDom.userEditModal || !adminDom.userEditForm || !adminDom.userEditUidInput) return;
        adminDom.userEditForm.reset();
        if(adminDom.userEditError) adminDom.userEditError.textContent = '';
        adminDom.userEditUidInput.value = uid;

        console.log("Abrindo modal para editar UID:", uid); // Log

        // Busca os dados atuais do perfil
        Promise.all([
            db.ref(`/users/${uid}/profile`).once('value'),
            db.ref(`/publicProfiles/${uid}`).once('value') // Verifica ambos por segurança
        ]).then(([userSnap, publicSnap]) => {
            const userData = userSnap.val();
            const publicData = publicSnap.val(); // Poderia usar para fallback se necessário

            if (!userData) { throw new Error("Dados do usuário não encontrados em /users."); }
            if (!publicData) { console.warn("Dados públicos não encontrados em /publicProfiles para UID:", uid); /* Continua mesmo assim */ }

            console.log("Dados carregados para edição:", userData); // Log

            // Popula o formulário
            if(adminDom.userEditRunner1Input) adminDom.userEditRunner1Input.value = userData.runner1Name || '';
            if(adminDom.userEditRunner2Input) adminDom.userEditRunner2Input.value = userData.runner2Name || '';
            if(adminDom.userEditTeamInput) adminDom.userEditTeamInput.value = userData.teamName || '';
            if(adminDom.userEditModalTitle) adminDom.userEditModalTitle.textContent = `Editando: ${userData.runner1Name || uid}`;

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
        if(!adminDom.userEditError || !adminDom.userEditUidInput || !adminDom.userEditRunner1Input) return;

        adminDom.userEditError.textContent = '';
        const saveButton = adminDom.userEditForm.querySelector('button[type="submit"]');
        if(saveButton) { saveButton.disabled = true; saveButton.textContent = 'Salvando...'; }

        const uid = adminDom.userEditUidInput.value;
        const runner1Name = adminDom.userEditRunner1Input.value.trim();
        const runner2Name = adminDom.userEditRunner2Input.value.trim();
        const teamName = adminDom.userEditTeamInput.value.trim();

        if (!uid || !runner1Name) {
            adminDom.userEditError.textContent = 'O Nome do Corredor 1 é obrigatório.';
            if(saveButton) { saveButton.disabled = false; saveButton.textContent = 'Salvar Alterações'; }
            return;
        }

        console.log(`Salvando edições para UID: ${uid}`, { runner1Name, runner2Name, teamName }); // Log

        // Prepara atualizações atômicas
        const updates = {};
        updates[`/users/${uid}/profile/runner1Name`] = runner1Name;
        updates[`/users/${uid}/profile/runner2Name`] = runner2Name; // Salva "" se vazio
        updates[`/users/${uid}/profile/teamName`] = teamName;
        updates[`/publicProfiles/${uid}/runner1Name`] = runner1Name;
        updates[`/publicProfiles/${uid}/runner2Name`] = runner2Name; // Salva "" se vazio
        updates[`/publicProfiles/${uid}/teamName`] = teamName;

        db.ref().update(updates)
            .then(() => {
                console.log(`Perfil ${uid} atualizado.`);
                closeUserEditModal();
                alert('Perfil atualizado!');
            })
            .catch((error) => {
                console.error("Erro ao atualizar perfil:", error);
                adminDom.
