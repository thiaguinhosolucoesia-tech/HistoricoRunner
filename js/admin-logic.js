// =================================================================
// ARQUIVO DE LÓGICA DO PAINEL DE ADMIN (V6 - FINAL CORRIGIDO)
// CORREÇÃO: Tratamento robusto de erros no upload de resultados + Mapeamento de Chaves
// =================================================================

// Esta função é o ponto de entrada, chamada pelo main-logic.js se o usuário for admin
function initializeAdminPanel(adminUid, db) {
    console.log("Inicializando Painel de Admin...");
    
    // --- Cache de Elementos DOM do Admin ---
    const adminDom = {
        adminPanel: document.getElementById('admin-panel'),
        adminToggleBtn: document.getElementById('admin-toggle-btn'),
        adminPanelContent: document.getElementById('admin-panel-content'),
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
        if (adminDom.adminToggleBtn) { 
            adminDom.adminToggleBtn.addEventListener('click', toggleAdminPanel);
        }

        // V2
        adminDom.raceForm.addEventListener('submit', handleRaceFormSubmit);
        adminDom.clearFormButton.addEventListener('click', clearForm);
        adminDom.uploadResultsButton.addEventListener('click', handleResultsUpload);
        adminDom.uploadRankingButton.addEventListener('click', handleRankingUpload);
    }
    
    function toggleAdminPanel() {
        const isCollapsed = adminDom.adminPanel.classList.toggle('collapsed');
        adminDom.adminToggleBtn.textContent = isCollapsed ? 'Mostrar' : 'Ocultar';
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
                if (uid === adminUid) return; 
                
                const item = document.createElement('div');
                item.className = 'approved-item';
                
                item.innerHTML = `
                    <div class="approved-item-info">
                        ${profile.runner1Name} ${profile.runner2Name ? '& ' + profile.runner2Name : ''}
                        <span>Equipe: ${profile.teamName || 'N/A'}</span>
                    </div>
                    <div class="admin-buttons">
                        <button class="btn-edit-user" 
                            data-uid="${uid}" 
                            data-r1="${profile.runner1Name || ''}" 
                            data-r2="${profile.runner2Name || ''}" 
                            data-team="${profile.teamName || ''}">
                            Editar
                        </button>
                        <button class="btn-delete-user" data-uid="${uid}" data-name="${profile.runner1Name}">Excluir</button>
                    </div>
                `;
                adminDom.approvedList.appendChild(item);
            });

            adminDom.approvedList.querySelectorAll('.btn-edit-user').forEach(button => {
                button.addEventListener('click', (e) => {
                    const data = e.target.dataset;
                    editUser(data.uid, data.r1, data.r2, data.team);
                });
            });
            
            adminDom.approvedList.querySelectorAll('.btn-delete-user').forEach(button => {
                button.addEventListener('click', (e) => {
                    const data = e.target.dataset;
                    deleteUser(data.uid, data.name);
                });
            });
        });
    }

    function editUser(uid, currentR1, currentR2, currentTeam) {
        const newR1 = prompt("Nome Corredor 1:", currentR1);
        if (newR1 === null) return; 
        if (newR1.trim() === "") {
            alert("O 'Nome Corredor 1' não pode ficar vazio.");
            return;
        }

        const newR2 = prompt("Nome Corredor 2 (Deixe VAZIO para remover):", currentR2);
        if (newR2 === null) return; 

        const newTeam = prompt("Nome da Equipe:", currentTeam);
        if (newTeam === null) return; 

        const updates = {};
        const profileData = {
            runner1Name: newR1.trim(),
            runner2Name: newR2.trim() || "", 
            teamName: newTeam.trim() || "Equipe" 
        };

        updates[`/users/${uid}/profile`] = profileData;
        updates[`/publicProfiles/${uid}`] = profileData; 

        db.ref().update(updates)
            .then(() => {
                alert(`Usuário ${newR1} atualizado com sucesso!`);
            })
            .catch((err) => {
                console.error("Erro ao atualizar usuário:", err);
                alert("Erro ao atualizar usuário.");
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
        if (!confirm(`ATENÇÃO!\n\nTem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário ${name}?\n\nTODOS os dados (perfil, corridas) serão apagados e não poderão ser recuperados.\n\n(Obs: O login do usuário ainda precisará ser excluído manualmente no painel do Firebase Authentication).`)) return;
        
        const updates = {};
        updates[`/users/${uid}`] = null; 
        updates[`/publicProfiles/${uid}`] = null; 

        db.ref().update(updates)
            .then(() => {
                alert(`Usuário ${name} excluído com sucesso!`);
            })
            .catch((err) => {
                console.error("Erro ao excluir usuário:", err);
                alert("Erro ao excluir usuário.");
            });
    }


    // ======================================================
    // SEÇÃO DE ADMIN V2: GESTÃO DE CORRIDAS
    // ======================================================

    function loadAndDisplayRaces() {
        const copaRef = db.ref('/corridas/copaAlcer');
        const geralRef = db.ref('/corridas/geral');

        let allRaces = {};

        copaRef.on('value', (snapshot) => {
            const copaRaces = snapshot.val() || {};
            displayRaceList(copaRaces, adminDom.copaRaceList, 'copaAlcer');
            
            // Combina as corridas da Copa Alcer com as Corridas Gerais
            allRaces = { ...allRaces, ...copaRaces };
            populateResultsRaceSelect(allRaces);
        });

        geralRef.on('value', (snapshot) => {
            const geralRaces = snapshot.val() || {};
            displayRaceList(geralRaces, adminDom.geralRaceList, 'geral');
            
            // Combina as Corridas Gerais com as corridas da Copa Alcer
            allRaces = { ...allRaces, ...geralRaces };
            populateResultsRaceSelect(allRaces);
        });
    }

    function displayRaceList(races, container, calendar) {
        container.innerHTML = '';
        if (!races) {
            container.innerHTML = '<div class="loader" style="color:#1f2027; padding: 10px;">Nenhuma corrida cadastrada.</div>';
            return;
        }

        const sortedRaces = Object.values(races).sort((a, b) => new Date(b.data) - new Date(a.data));
        sortedRaces.forEach(race => {
            const item = document.createElement('div');
            item.className = 'race-item-admin';
            item.innerHTML = `
                <div class="race-item-info">
                    <strong>${race.nome}</strong>
                    <span>${race.cidade} - ${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')}</span
                </div>
                <div class="admin-buttons">
                    <button class="btn-edit-race" data-id="${race.id}" data-calendar="${calendar}">Editar</button>
                    <button class="btn-delete-race" data-id="${race.id}" data-calendar="${calendar}" data-name="${race.nome}">Excluir</button>
                </div>
            `;
            container.appendChild(item);
        });

        container.querySelectorAll('.btn-edit-race').forEach(button => {
            button.addEventListener('click', (e) => {
                const raceId = e.target.dataset.id;
                const calendar = e.target.dataset.calendar;
                editRace(raceId, calendar);
            });
        });

        container.querySelectorAll('.btn-delete-race').forEach(button => {
            button.addEventListener('click', (e) => {
                const raceId = e.target.dataset.id;
                const calendar = e.target.dataset.calendar;
                const raceName = e.target.dataset.name;
                deleteRace(raceId, calendar, raceName);
            });
        });
    }

    function handleRaceFormSubmit(e) {
        e.preventDefault();
        const raceId = adminDom.raceIdInput.value;
        const raceName = adminDom.raceNameInput.value.trim();
        const raceCity = adminDom.raceCityInput.value.trim();
        const raceDate = adminDom.raceDateInput.value;
        const raceLink = adminDom.raceLinkInput.value.trim();
        const calendar = adminDom.raceCalendarSelect.value;

        if (!raceName || !raceCity || !raceDate || !calendar) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        const raceData = {
            id: raceId || db.ref().push().key,
            nome: raceName,
            cidade: raceCity,
            data: raceDate,
            link: raceLink || ""
        };

        db.ref(`/corridas/${calendar}/${raceData.id}`).set(raceData)
            .then(() => {
                alert(`Corrida "${raceName}" salva com sucesso!`);
                clearForm();
            })
            .catch((error) => {
                console.error("Erro ao salvar corrida:", error);
                alert("Erro ao salvar corrida.");
            });
    }

    function editRace(raceId, calendar) {
        db.ref(`/corridas/${calendar}/${raceId}`).once('value', (snapshot) => {
            const race = snapshot.val();
            if (!race) {
                alert("Corrida não encontrada.");
                return;
            }

            adminDom.formTitle.textContent = "Editar Corrida";
            adminDom.raceIdInput.value = race.id;
            adminDom.raceNameInput.value = race.nome;
            adminDom.raceCityInput.value = race.cidade;
            adminDom.raceDateInput.value = race.data;
            adminDom.raceLinkInput.value = race.link || "";
            adminDom.raceCalendarSelect.value = calendar;

            adminDom.raceForm.scrollIntoView({ behavior: 'smooth' });
        });
    }

    function deleteRace(raceId, calendar, raceName) {
        if (!confirm(`Tem certeza que deseja EXCLUIR a corrida "${raceName}"?`)) return;

        db.ref(`/corridas/${calendar}/${raceId}`).remove()
            .then(() => {
                alert(`Corrida "${raceName}" excluída com sucesso!`);
            })
            .catch((error) => {
                console.error("Erro ao excluir corrida:", error);
                alert("Erro ao excluir corrida.");
            });
    }
    
    function clearForm() {
        adminDom.formTitle.textContent = "Cadastrar Nova Corrida";
        adminDom.raceForm.reset();
        adminDom.raceIdInput.value = '';
    }

    function populateResultsRaceSelect(allRaces) {
        adminDom.resultsRaceSelect.innerHTML = '<option value="">Selecione uma etapa</option>';
        if(!allRaces || Object.keys(allRaces).length === 0) return;
        
        const sortedRaces = Object.values(allRaces).sort((a,b) => new Date(b.data) - new Date(a.data));
        
        sortedRaces.forEach(race => {
            const option = document.createElement('option');
            option.value = race.id;
            option.textContent = `${race.nome} (${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')})`;
            adminDom.resultsRaceSelect.appendChild(option);
        });
    }

    // =================================================================
    // FUNÇÃO DE TRADUÇÃO DE CHAVES (MAPEAMENTO)
    // Traduz as chaves do JSON de entrada (ex: apuradora) para o formato interno (Corri_RP)
    // =================================================================
    function mapResultsKeys(resultsData) {
        const mappedResults = [];
        // Mapeamento de chaves comuns de apuradoras para o formato interno
        const keyMap = {
            'Fx.Et.': 'category', // Faixa Etária -> Categoria
            'Cl.Fx.': 'category_placement', // Colocação por Faixa Etária -> category_placement (CORRIGE ERRO DE PONTO)
            'Coloc.': 'placement', // Colocação -> Placement
            'Tempo': 'time', // Tempo -> Time
            'Nome': 'name', // Nome -> Name
            'Equipe': 'team', // Equipe -> Team
            'Num.': 'bib', // Número de Peito -> Bib
            // Adicione outros mapeamentos conforme necessário
        };

        if (!Array.isArray(resultsData)) {
            console.error("mapResultsKeys: Dados de entrada não são um array.");
            return resultsData;
        }

        resultsData.forEach(athlete => {
            const newAthlete = {};
            for (const oldKey in athlete) {
                if (athlete.hasOwnProperty(oldKey)) {
                    const newKey = keyMap[oldKey] || oldKey; // Usa a chave mapeada ou a chave original
                    newAthlete[newKey] = athlete[oldKey];
                }
            }
            mappedResults.push(newAthlete);
        });

        return mappedResults;
    }

    function handleResultsUpload() {
        const raceId = adminDom.resultsRaceSelect.value;
        const file = adminDom.resultsFileInput.files[0];
        if (!raceId || !file) {
            updateStatus("Selecione uma corrida e um arquivo JSON.", "error", 'results');
            return;
        }
        readFileAsJson(file, (data) => {
            const mappedData = mapResultsKeys(data); // 1. Mapeia as chaves
            processAndUploadResults(raceId, mappedData); // 2. Processa e faz upload
        }, 'results');
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
    
    // =================================================================
    // FUNÇÃO CORRIGIDA: processAndUploadResults
    // CORREÇÃO: Tratamento robusto de erros e validação de dados
    // =================================================================
    function processAndUploadResults(raceId, resultsData) {
        updateStatus("Processando e enviando resultados da etapa...", "loading", 'results');

        // VALIDAÇÃO: Verifica se resultsData é um array
        if (!Array.isArray(resultsData)) {
            updateStatus("Erro: O arquivo JSON deve conter um array de atletas.", "error", 'results');
            console.error("Dados inválidos recebidos:", resultsData);
            return;
        }

        // VALIDAÇÃO: Verifica se há dados
        if (resultsData.length === 0) {
            updateStatus("Erro: O arquivo JSON está vazio.", "error", 'results');
            return;
        }

        console.log(`[Admin] Processando ${resultsData.length} atletas para a corrida ${raceId}`);

        try {
            // 1. Agrupar por categoria para calcular o total
            const groupedByCategory = {};
            resultsData.forEach((athlete, index) => {
                // VALIDAÇÃO: Verifica se o atleta tem categoria
                if (!athlete.category) {
                    console.warn(`[Admin] Atleta no índice ${index} sem categoria. Usando 'SEM CATEGORIA'.`, athlete);
                    athlete.category = "SEM CATEGORIA"; // Categoria padrão
                }
                
                const category = athlete.category;
                if (!groupedByCategory[category]) {
                    groupedByCategory[category] = [];
                }
                groupedByCategory[category].push(athlete);
            });

            console.log(`[Admin] Categorias encontradas:`, Object.keys(groupedByCategory));

            // 2. Adicionar a informação de colocação/total a cada registro
            const processedResults = [];
            for (const category in groupedByCategory) {
                const athletes = groupedByCategory[category];
                const totalParticipants = athletes.length;
                
                athletes.forEach(athlete => {
                    try {
                        const placement = parseInt(athlete.placement);
                        if (!isNaN(placement)) {
                            // Formato solicitado: "Colocação de um total de Total"
                            athlete.placement_info = `${placement} de um total de ${totalParticipants}`;
                        } else {
                            athlete.placement_info = `- de um total de ${totalParticipants}`;
                        }
                    } catch (e) {
                        athlete.placement_info = `- de um total de ${totalParticipants}`;
                    }
                    processedResults.push(athlete);
                });
            }

            console.log(`[Admin] Total de atletas processados: ${processedResults.length}`);

            // 3. Upload para o Firebase COM TRATAMENTO DE ERRO ROBUSTO
            const uploadStartTime = Date.now();
            
            db.ref('resultadosEtapas/' + raceId).set(processedResults)
                .then(() => {
                    const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
                    console.log(`[Admin] Upload concluído em ${uploadTime}s`);
                    updateStatus(
                        `✅ Resultados atualizados com sucesso! (${processedResults.length} atletas em ${uploadTime}s)`, 
                        "success", 
                        'results'
                    );
                    // Limpa o input de arquivo após sucesso
                    adminDom.resultsFileInput.value = '';
                })
                .catch(error => {
                    console.error("[Admin] Erro ao enviar resultados para Firebase:", error);
                    
                    // TRATAMENTO ESPECÍFICO DE ERROS
                    let errorMessage = "Falha no envio: ";
                    
                    if (error.code === 'PERMISSION_DENIED') {
                        errorMessage += "Permissão negada. Verifique as regras do Firebase.";
                    } else if (error.message && error.message.includes('quota')) {
                        errorMessage += "Cota de armazenamento excedida. O Service Worker foi corrigido, mas o erro pode ser devido ao tamanho do upload. Tente novamente ou reduza o tamanho dos dados.";
                    } else if (error.message && error.message.includes('network')) {
                        errorMessage += "Erro de rede. Verifique sua conexão e tente novamente.";
                    } else {
                        errorMessage += error.message || "Erro desconhecido.";
                    }
                    
                    updateStatus(errorMessage, "error", 'results');
                    
                    // Sugestão de ação
                    if (processedResults.length > 2000) {
                        updateStatus(
                            `⚠️ Arquivo muito grande (${processedResults.length} atletas). Considere dividir em múltiplos uploads.`, 
                            "error", 
                            'results'
                        );
                    }
                });
                
        } catch (processingError) {
            console.error("[Admin] Erro ao processar dados:", processingError);
            updateStatus(
                `Erro ao processar dados: ${processingError.message}. Verifique o formato do arquivo JSON.`, 
                "error", 
                'results'
            );
        }
    }

    function uploadFinalRanking(rankingData) {
        updateStatus("Enviando ranking final...", "loading", 'ranking');
        
        // VALIDAÇÃO
        if (!Array.isArray(rankingData)) {
            updateStatus("Erro: O arquivo JSON deve conter um array.", "error", 'ranking');
            return;
        }
        
        db.ref('rankingCopaAlcer').set(rankingData)
            .then(() => {
                updateStatus(`✅ Ranking final atualizado com sucesso! (${rankingData.length} registros)`, "success", 'ranking');
                adminDom.rankingFileInput.value = '';
            })
            .catch(error => {
                console.error("[Admin] Erro ao enviar ranking:", error);
                updateStatus(`Falha no envio: ${error.message}`, "error", 'ranking');
            });
    }

    function updateStatus(message, type, target) {
        const statusElement = target === 'ranking' ? adminDom.uploadRankingStatus : adminDom.uploadResultsStatus;
        statusElement.textContent = message;
        statusElement.className = 'upload-status ';
        if (type === 'success') statusElement.classList.add('text-green-500'); 
        else if (type === 'error') statusElement.classList.add('text-red-500'); 
        else statusElement.classList.add('text-yellow-500'); 
    }
}
