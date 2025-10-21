// =================================================================
// ARQUIVO DE LÓGICA DO PAINEL DE ADMIN (V3 - Fundido V1+V2)
// =================================================================

// Esta função é o ponto de entrada, chamada pelo main-logic.js se o usuário for admin
function initializeAdminPanel(adminUid, db) {
    console.log("Inicializando Painel de Admin...");
    
    // --- Cache de Elementos DOM do Admin ---
    const adminDom = {
        adminPanel: document.getElementById('admin-panel'),
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
        clearFormButton: document.getElementById('clear-form-button')
    };

    // Mostra o painel de admin
    adminDom.adminPanel.classList.remove('hidden');
    
    // Inicializa os listeners e carregadores
    addAdminEventListeners();
    loadPendingList();
    loadApprovedUsersList();
    loadAndDisplayRaces();

    // --- Listeners de Eventos do Admin ---
    function addAdminEventListeners() {
        adminDom.raceForm.addEventListener('submit', handleRaceFormSubmit);
        adminDom.clearFormButton.addEventListener('click', clearForm);
        adminDom.uploadResultsButton.addEventListener('click', handleResultsUpload);
        adminDom.uploadRankingButton.addEventListener('click', handleRankingUpload);
    }

    // ======================================================
    // SEÇÃO DE ADMIN V1: GESTÃO DE USUÁRIOS
    // ======================================================

    function loadPendingList() {
        const pendingRef = db.ref('/pendingApprovals');
        pendingRef.on('value', (snapshot) => {
            const requests = snapshot.val();
            if (!requests) {
                adminDom.pendingList.innerHTML = '<div class="loader" style="color:#1f2027; padding: 10px;">Nenhuma aprovação pendente.</div>';
                return;
            }
            
            adminDom.pendingList.innerHTML = '';
            Object.entries(requests).forEach(([uid, request]) => {
                const item = document.createElement('div');
                item.className = 'pending-item';
                item.innerHTML = `
                    <div class="pending-item-info">
                        ${request.email}
                        <span>${request.runner1Name} ${request.runner2Name ? '& ' + request.runner2Name : ''} (${request.teamName || 'Sem Equipe'})</span>
                    </div>
                    <div class="admin-buttons">
                        <button class="btn-approve" 
                            data-uid="${uid}" 
                            data-r1="${request.runner1Name}" 
                            data-r2="${request.runner2Name || ''}" 
                            data-team="${request.teamName || ''}">
                            Aprovar
                        </button>
                        <button class="btn-reject" data-uid="${uid}" data-email="${request.email}">Recusar</button>
                    </div>
                `;
                adminDom.pendingList.appendChild(item);
            });
            
            adminDom.pendingList.querySelectorAll('.btn-approve').forEach(button => {
                button.addEventListener('click', (e) => {
                    const data = e.target.dataset;
                    approveUser(data.uid, data.r1, data.r2, data.team);
                });
            });
            
            adminDom.pendingList.querySelectorAll('.btn-reject').forEach(button => {
                button.addEventListener('click', (e) => {
                    const data = e.target.dataset;
                    rejectUser(data.uid, data.email);
                });
            });
        });
    }

    function loadApprovedUsersList() {
        const publicProfilesRef = db.ref('/publicProfiles');
        publicProfilesRef.on('value', (snapshot) => {
            const profiles = snapshot.val();
            adminDom.approvedList.innerHTML = ''; 
            if (!profiles) {
                adminDom.approvedList.innerHTML = '<div class="loader" style="color:#1f2027; padding: 10px;">Nenhum usuário aprovado.</div>';
                return;
            }
            
            Object.entries(profiles).forEach(([uid, profile]) => {
                // O Admin não aparece na lista para ser excluído
                if (uid === adminUid) return; 
                
                const item = document.createElement('div');
                item.className = 'approved-item';
                item.innerHTML = `
                    <div class="approved-item-info">
                        ${profile.runner1Name} ${profile.runner2Name ? '& ' + profile.runner2Name : ''}
                        <span>Equipe: ${profile.teamName || 'N/A'}</span>
                    </div>
                    <div class="admin-buttons">
                        <button class="btn-delete-user" data-uid="${uid}" data-name="${profile.runner1Name}">Excluir</button>
                    </div>
                `;
                adminDom.approvedList.appendChild(item);
            });

            adminDom.approvedList.querySelectorAll('.btn-delete-user').forEach(button => {
                button.addEventListener('click', (e) => {
                    const data = e.target.dataset;
                    deleteUser(data.uid, data.name);
                });
            });
        });
    }

    function approveUser(uid, runner1Name, runner2Name, teamName) {
        const defaultProfile = {
            runner1Name: runner1Name,
            runner2Name: runner2Name || "", 
            teamName: teamName || "Equipe"
        };
        
        const defaultPublicProfile = {
            runner1Name: runner1Name,
            runner2Name: runner2Name || "",
            teamName: teamName || "Equipe"
        };
        
        const updates = {};
        updates[`/users/${uid}/profile`] = defaultProfile;
        updates[`/publicProfiles/${uid}`] = defaultPublicProfile;
        updates[`/pendingApprovals/${uid}`] = null; 

        db.ref().update(updates)
            .then(() => {
                alert(`Usuário ${runner1Name} aprovado com sucesso!`);
            })
            .catch((err) => {
                console.error("Erro ao aprovar:", err);
                alert("Erro ao aprovar usuário.");
            });
    }

    function rejectUser(uid, email) {
        if (!confirm(`Tem certeza que deseja RECUSAR o cadastro de ${email}?\n\nIsso removerá a solicitação. O usuário não poderá acessar o sistema.`)) return;

        db.ref('/pendingApprovals/' + uid).remove()
            .then(() => {
                alert(`Usuário ${email} recusado.`);
            })
            .catch((err) => {
                console.error("Erro ao recusar:", err);
                alert("Erro ao recusar usuário.");
            });
    }

    function deleteUser(uid, name) {
        if (!confirm(`ATENÇÃO!\n\nTem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário ${name}?\n\TODOS os dados (perfil, corridas) serão apagados e não poderão ser recuperados.\n\n(Obs: O login do usuário ainda precisará ser excluído manualmente no painel do Firebase Authentication).`)) return;
        
        const updates = {};
        updates[`/users/${uid}`] = null; 
        updates[`/publicProfiles/${uid}`] = null; 
        
         db.ref().update(updates)
            .then(() => {
                alert(`Usuário ${name} excluído com sucesso do banco de dados.`);
            })
            .catch((err) => {
                console.error("Erro ao excluir:", err);
                alert("Erro ao excluir usuário.");
            });
    }

    // ======================================================
    // SEÇÃO DE ADMIN V2: GESTÃO DE CORRIDAS
    // ======================================================

    function loadAndDisplayRaces() {
        db.ref('corridas').on('value', snapshot => {
            const allCorridas = snapshot.val() || { copaAlcer: {}, geral: {} };
            renderRaceList(allCorridas.copaAlcer, adminDom.copaRaceList, 'copaAlcer');
            renderRaceList(allCorridas.geral, adminDom.geralRaceList, 'geral');
            populateResultsRaceSelect({ ...allCorridas.copaAlcer, ...allCorridas.geral });
        });
    }

    function renderRaceList(races, element, calendar) {
        element.innerHTML = '';
        if (!races || Object.keys(races).length === 0) {
            element.innerHTML = '<p class="loader" style="font-size: 0.9em; color: #555; padding: 10px;">Nenhuma corrida cadastrada.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        Object.keys(races).forEach(raceId => {
            const race = races[raceId];
            const item = document.createElement('div');
            item.className = 'admin-race-item';
            item.innerHTML = `
                <div>
                    <p>${race.nome}</p>
                    <span>${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')} - ${race.cidade}</span>
                </div>
                <div class="admin-race-item-controls">
                    <button class="btn-control edit-btn" data-id="${raceId}" data-calendar="${calendar}"><i class='bx bx-pencil'></i></button>
                    <button class="btn-control delete-btn" data-id="${raceId}" data-calendar="${calendar}"><i class='bx bx-trash'></i></button>
                </div>
            `;
            fragment.appendChild(item);
        });
        element.appendChild(fragment);

        element.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => populateRaceFormForEdit(btn.dataset.id, btn.dataset.calendar)));
        element.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteRace(btn.dataset.id, btn.dataset.calendar)));
    }

    function handleRaceFormSubmit(e) {
        e.preventDefault();
        const raceData = {
            nome: adminDom.raceNameInput.value,
            cidade: adminDom.raceCityInput.value,
            data: adminDom.raceDateInput.value,
            linkInscricao: adminDom.raceLinkInput.value
        };
        const id = adminDom.raceIdInput.value;
        const calendar = adminDom.raceCalendarSelect.value;
        const refPath = `corridas/${calendar}`;

        let promise;
        if (id) {
            promise = db.ref(`${refPath}/${id}`).update(raceData);
        } else {
            const newRaceRef = db.ref(refPath).push();
            raceData.id = newRaceRef.key; // Salva o ID autogerado
            promise = newRaceRef.set(raceData);
        }

        promise.then(() => {
            console.log("Corrida salva com sucesso!");
            clearForm();
        }).catch(error => console.error("Erro ao salvar corrida:", error));
    }
    
    function populateRaceFormForEdit(id, calendar) {
        db.ref(`corridas/${calendar}/${id}`).once('value', snapshot => {
            const race = snapshot.val();
            if (race) {
                adminDom.formTitle.textContent = "Editando Corrida";
                adminDom.raceIdInput.value = id;
                adminDom.raceNameInput.value = race.nome;
                adminDom.raceCityInput.value = race.cidade;
                adminDom.raceDateInput.value = race.data;
                adminDom.raceLinkInput.value = race.linkInscricao || '';
                adminDom.raceCalendarSelect.value = calendar;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    function deleteRace(id, calendar) {
        if (confirm("Tem certeza que deseja excluir esta corrida? Os resultados (se houver) NÃO serão excluídos, mas a corrida sumirá do calendário.")) {
            db.ref(`corridas/${calendar}/${id}`).remove()
              .then(() => console.log("Corrida excluída com sucesso."))
              .catch(error => console.error("Erro ao excluir corrida:", error));
        }
    }
    
    function clearForm() {
        adminDom.formTitle.textContent = "Cadastrar Nova Corrida";
        adminDom.raceForm.reset();
        adminDom.raceIdInput.value = '';
    }

    function populateResultsRaceSelect(races) {
        adminDom.resultsRaceSelect.innerHTML = '<option value="">Selecione uma etapa</option>';
        if(!races) return;
        const sortedRaces = Object.values(races).sort((a,b) => new Date(b.data) - new Date(a.data));
        sortedRaces.forEach(race => {
            const option = document.createElement('option');
            option.value = race.id;
            option.textContent = `${race.nome} (${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')})`;
            adminDom.resultsRaceSelect.appendChild(option);
        });
    }

    function handleResultsUpload() {
        const raceId = adminDom.resultsRaceSelect.value;
        const file = adminDom.resultsFileInput.files[0];
        if (!raceId || !file) {
            updateStatus("Selecione uma corrida e um arquivo JSON.", "error", 'results');
            return;
        }
        readFileAsJson(file, (data) => processAndUploadResults(raceId, data), 'results');
    }

    function handleRankingUpload() {
        const file = adminDom.rankingFileInput.files[0];
        if (!file) {
            updateStatus("Selecione um arquivo JSON de ranking.", "error", 'ranking');
            return;
        }
        readFileAsJson(file, (data) => uploadFinalRanking(data), 'ranking');
    }

    function readFileAsJson(file, callback, type) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                callback(jsonData);
            } catch (error) {
                updateStatus(`Erro no formato do arquivo JSON: ${error.message}`, "error", type);
            }
        };
        reader.readAsText(file);
    }
    
    function processAndUploadResults(raceId, resultsData) {
        updateStatus("Enviando resultados da etapa...", "loading", 'results');
        db.ref('resultadosEtapas/' + raceId).set(resultsData)
            .then(() => updateStatus("Resultados da etapa atualizados com sucesso!", "success", 'results'))
            .catch(error => updateStatus(`Falha no envio: ${error.message}`, "error", 'results'));
    }

    function uploadFinalRanking(rankingData) {
        updateStatus("Enviando ranking final...", "loading", 'ranking');
        // NOTA: O V2 envia para 'rankingCopaAlcer'. Vamos manter essa estrutura.
        db.ref('rankingCopaAlcer').set(rankingData)
            .then(() => updateStatus("Ranking final atualizado com sucesso!", "success", 'ranking'))
            .catch(error => updateStatus(`Falha no envio: ${error.message}`, "error", 'ranking'));
    }

    function updateStatus(message, type, target) {
        const statusElement = target === 'ranking' ? adminDom.uploadRankingStatus : adminDom.uploadResultsStatus;
        statusElement.textContent = message;
        statusElement.className = 'upload-status ';
        if (type === 'success') statusElement.classList.add('text-green-500'); // Corrigido para verde
        else if (type === 'error') statusElement.classList.add('text-red-500'); // Corrigido para vermelho
        else statusElement.classList.add('text-yellow-500'); // Corrigido para amarelo
    }
}
