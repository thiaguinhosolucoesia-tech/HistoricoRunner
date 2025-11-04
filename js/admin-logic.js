// ==========================================
// ARQUIVO DE LÓGICA DO PAINEL DE ADMIN (V10 - Rede Social)
// VERSÃO ESTÁVEL (V10.0) - CORREÇÃO COMPLETA
// ==========================================

// --- Variáveis Globais do Painel Admin ---
let adminDom = {}; // Objeto para cachear elementos do DOM do admin

// --- Ponto de Entrada do Admin ---
// Esta função é o ponto de entrada, chamada pelo main-logic.js se o usuário for admin
function initializeAdminPanel(adminUid, db) {
    console.log("Inicializando Painel de Admin...");

    // Cachear Elementos do DOM do Admin (V10)
    // (Garante que todos os seletores estejam corretos e únicos)
    adminDom = {
        adminPanel: document.getElementById('admin-panel'),
        adminDomToggleBtn: document.getElementById('btn-toggle-admin'),
        pendingList: document.getElementById('admin-pending-list'),
        
        // Formulário de Corrida (CRUD)
        raceForm: document.getElementById('admin-race-form'),
        raceIdInput: document.getElementById('race-id'),
        raceNameInput: document.getElementById('race-name'),
        raceDateInput: document.getElementById('race-date'),
        raceDistanceInput: document.getElementById('race-distance'),
        raceLocalInput: document.getElementById('race-local'),
        raceNotesInput: document.getElementById('race-notes'),
        raceLinkInput: document.getElementById('race-link'),
        raceCalendarSelect: document.getElementById('race-calendar'),
        copaRaceList: document.getElementById('copa-race-list'),
        geralRaceList: document.getElementById('geral-race-list'),
        
        // Upload de Resultados (V10 - Foco da Correção)
        resultsFileInput: document.getElementById('results-file-input'),
        resultsRaceSelect: document.getElementById('select-results-race'),
        uploadResultsButton: document.getElementById('upload-results-button'),
        uploadResultsStatus: document.getElementById('upload-results-status'),

        // Upload de Ranking (Copa Alcer)
        rankingFileInput: document.getElementById('ranking-file-input'),
        uploadRankingButton: document.getElementById('upload-ranking-button'),
        uploadRankingStatus: document.getElementById('upload-ranking-status')
    };

    // --- Inicialização dos Listeners do Admin ---
    setupAdminEventListeners(db);

    // Carregar listas iniciais
    loadPendingList(db);
    loadAndDisplayRaces(db); // Para preencher os <select>
}

// ==========================================
// SEÇÃO 1: LISTENERS DE EVENTOS DO ADMIN
// ==========================================
function setupAdminEventListeners(db) {
    
    // Listener para mostrar/esconder o painel de admin
    if (adminDom.adminDomToggleBtn) {
        adminDom.adminDomToggleBtn.addEventListener('click', () => {
            adminDom.adminPanel.classList.toggle('hidden');
        });
    }

    // Listener para o formulário de Corrida (Criar/Editar)
    if (adminDom.raceForm) {
        adminDom.raceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRaceFormSubmit(e, db);
        });
    }

    // Listener para o botão de Upload de Resultados (JSON)
    if (adminDom.uploadResultsButton) {
        adminDom.uploadResultsButton.addEventListener('click', () => {
            handleResultsUpload(db);
        });
    }

    // Listener para o botão de Upload de Ranking (Copa Alcer)
    if (adminDom.uploadRankingButton) {
        adminDom.uploadRankingButton.addEventListener('click', () => {
            handleRankingUpload(db);
        });
    }
}

// ==========================================
// SEÇÃO 2: GESTÃO DE USUÁRIOS (APROVAÇÃO)
// ==========================================

// Carrega a lista de usuários pendentes
function loadPendingList(db) {
    const pendingRef = db.ref('/pendingApprovals');
    pendingRef.on('value', (snapshot) => {
        if (!adminDom.pendingList) return; // Proteção

        adminDom.pendingList.innerHTML = ''; // Limpa a lista
        if (!snapshot.exists() || snapshot.numChildren() === 0) {
            adminDom.pendingList.innerHTML = '<div class="pending-item" style="color:#1f2027; padding: 10px;">Nenhuma aprovação pendente.</div>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        snapshot.forEach((childSnapshot) => {
            const uid = childSnapshot.key;
            const request = childSnapshot.val();
            
            const item = document.createElement('div');
            item.className = 'pending-item';
            
            let teamDisplay = request.teamName ? ` (Equipe: ${request.teamName})` : '';
            let runner2Display = request.runner2Name ? ` & ${request.runner2Name}` : '';
            
            item.innerHTML = `
                <div class="pending-item-info">
                    <span>${request.email}</span>
                    <span class="pending-item-name">${request.runner1Name}${runner2Display}${teamDisplay}</span>
                </div>
                <div class="admin-buttons">
                    <button classa="btn-approve-user" data-uid="${uid}">Aprovar</button>
                    <button class="btn-reject-user" data-uid="${uid}">Rejeitar</button>
                </div>
            `;
            
            // Listeners para os botões de ação
            item.querySelector('.btn-approve-user').addEventListener('click', () => {
                approveUser(db, uid, request.runner1Name, request.runner2Name, request.teamName);
            });
            item.querySelector('.btn-reject-user').addEventListener('click', () => {
                rejectUser(db, uid);
            });
            
            fragment.appendChild(item);
        });
        adminDom.pendingList.appendChild(fragment);
    });
}

// Aprova um usuário
function approveUser(db, uid, runner1Name, runner2Name, teamName) {
    console.log(`Aprovando usuário: ${uid}`);
    // Define nomes padrão caso sejam nulos ou vazios
    const defaultRunner1Name = runner1Name || "Corredor 1";
    const defaultRunner2Name = runner2Name || "";
    const defaultTeamName = teamName || "Equipe";

    // Cria o perfil público padrão
    const defaultPublicProfile = {
        profile: {
            runner1Name: defaultRunner1Name,
            runner2Name: defaultRunner2Name,
            teamName: defaultTeamName,
            bio: "",
            location: "",
            profilePictureUrl: "icons/icon-192x192.png" // Foto padrão
        }
    };

    // Prepara as atualizações atômicas
    const updates = {};
    updates[`/users/${uid}`] = defaultPublicProfile; // Cria o perfil do usuário
    updates[`/pendingApprovals/${uid}`] = null;      // Remove da lista de pendentes
    updates[`/approvedUsers/${uid}`] = true;         // Adiciona à lista de aprovados (para regras de segurança)

    db.ref().update(updates)
        .then(() => {
            alert(`Usuário ${uid} aprovado com sucesso!`);
            console.log("Usuário aprovado.");
        })
        .catch((error) => {
            console.error("Erro ao aprovar usuário: ", error);
            alert("Erro ao aprovar usuário.");
        });
}

// Rejeita um usuário
function rejectUser(db, uid) {
    console.log(`Rejeitando usuário: ${uid}`);
    const updates = {};
    updates[`/pendingApprovals/${uid}`] = null; // Remove da lista de pendentes
    // (Opcional: mover para uma lista de "rejeitados")

    db.ref().update(updates)
        .then(() => {
            alert(`Usuário ${uid} rejeitado.`);
            console.log("Usuário rejeitado.");
        })
        .catch((error) => {
            console.error("Erro ao rejeitar usuário: ", error);
            alert("Erro ao rejeitar usuário.");
        });
}

// ==========================================
// SEÇÃO 3: GESTÃO DE CORRIDAS (CRUD)
// ==========================================

// Carrega as corridas nos seletores <select>
function loadAndDisplayRaces(db) {
    const racesRef = db.ref('/corridas');
    racesRef.on('value', (snapshot) => {
        if (!adminDom.resultsRaceSelect || !adminDom.copaRaceList || !adminDom.geralRaceList) return;

        // Limpa os seletores
        adminDom.resultsRaceSelect.innerHTML = '<option value="">Selecione uma corrida...</option>';
        adminDom.copaRaceList.innerHTML = '';
        adminDom.geralRaceList.innerHTML = '';

        if (!snapshot.exists()) {
            console.warn("Nenhuma corrida encontrada no DB.");
            return;
        }

        const races = snapshot.val();
        const fragmentResults = document.createDocumentFragment();
        const fragmentCopa = document.createDocumentFragment();
        const fragmentGeral = document.createDocumentFragment();

        Object.keys(races).forEach((calendarKey) => {
            const calendarRaces = races[calendarKey];
            Object.keys(calendarRaces).forEach((raceId) => {
                const race = calendarRaces[raceId];
                
                // Option para o seletor de upload de resultados
                const option = document.createElement('option');
                option.value = raceId;
                option.textContent = `${race.nome} (${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')})`; // Adiciona T12:00:00Z para evitar problemas de fuso
                option.dataset.calendar = calendarKey; // Salva o calendário (copaAlcer ou geral)
                fragmentResults.appendChild(option);

                // Item para a lista de CRUD (Copa ou Geral)
                const raceItem = createRaceListItem(raceId, race, calendarKey, db);
                
                if (calendarKey === 'copaAlcer') {
                    fragmentCopa.appendChild(raceItem);
                } else if (calendarKey === 'geral') {
                    fragmentGeral.appendChild(raceItem);
                }
            });
        });

        adminDom.resultsRaceSelect.appendChild(fragmentResults);
        adminDom.copaRaceList.appendChild(fragmentCopa);
        adminDom.geralRaceList.appendChild(fragmentGeral);
    });
}

// Cria o <li> para a lista de gerenciamento de corridas
function createRaceListItem(raceId, race, calendarKey, db) {
    const item = document.createElement('li');
    item.className = 'admin-race-item';
    
    // Formata a data
    const raceDate = new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR');
    
    item.innerHTML = `
        <div class="race-item-info">
            <strong>${race.nome}</strong>
            <span>${race.cidade} - ${raceDate}</span>
        </div>
        <div class="admin-buttons">
            <button class="btn-edit-user" data-race-id="${raceId}" data-calendar="${calendarKey}"><i class='bx bx-pencil'></i> Editar</button>
            <button class="btn-delete-user" data-race-id="${raceId}" data-calendar="${calendarKey}"><i class='bx bx-trash'></i> Excluir</button>
        </div>
    `;

    // Listener para Editar
    item.querySelector('.btn-edit-user').addEventListener('click', () => {
        populateRaceForm(raceId, race, calendarKey);
    });

    // Listener para Excluir
    item.querySelector('.btn-delete-user').addEventListener('click', () => {
        if (confirm(`Tem certeza que deseja excluir a corrida "${race.nome}"? ISSO É IRREVERSÍVEL.`)) {
            deleteRace(db, raceId, calendarKey);
        }
    });

    return item;
}

// Preenche o formulário para edição de uma corrida existente
function populateRaceForm(raceId, race, calendarKey) {
    adminDom.raceIdInput.value = raceId;
    adminDom.raceNameInput.value = race.nome || '';
    adminDom.raceDateInput.value = race.data || '';
    adminDom.raceDistanceInput.value = race.distancia || '';
    adminDom.raceLocalInput.value = race.cidade || '';
    adminDom.raceNotesInput.value = race.notas || '';
    adminDom.raceLinkInput.value = race.link || '';
    adminDom.raceCalendarSelect.value = calendarKey || 'geral';
    
    // Rola a tela para o formulário
    adminDom.raceForm.scrollIntoView({ behavior: 'smooth' });
}

// Salva (Cria ou Atualiza) uma corrida
function handleRaceFormSubmit(e, db) {
    const raceData = {
        nome: adminDom.raceNameInput.value,
        data: adminDom.raceDateInput.value,
        distancia: adminDom.raceDistanceInput.value,
        cidade: adminDom.raceLocalInput.value,
        notas: adminDom.raceNotesInput.value,
        link: adminDom.raceLinkInput.value,
    };
    
    const calendar = adminDom.raceCalendarSelect.value;
    let raceId = adminDom.raceIdInput.value;
    
    let dbRef;
    
    if (raceId) {
        // Atualiza (Update)
        dbRef = db.ref(`/corridas/${calendar}/${raceId}`);
    } else {
        // Cria (Create)
        dbRef = db.ref(`/corridas/${calendar}`).push();
        raceId = dbRef.key; // Pega o novo ID gerado
        raceData.raceId = raceId; // Salva o ID autogerado dentro do objeto da corrida
    }
    
    dbRef.set(raceData)
        .then(() => {
            alert("Corrida salva com sucesso!");
            console.log("Corrida salva:", raceId);
            adminDom.raceForm.reset();
            adminDom.raceIdInput.value = ''; // Limpa o ID oculto
        })
        .catch((error) => {
            console.error("Erro ao salvar corrida: ", error);
            alert("Erro ao salvar corrida.");
        });
}

// Exclui uma corrida
function deleteRace(db, raceId, calendarKey) {
    // TODO: Excluir também resultados, mídias, likes e comentários associados.
    // Por enquanto, apenas exclui a corrida.
    
    const dbRef = db.ref(`/corridas/${calendarKey}/${raceId}`);
    dbRef.remove()
        .then(() => {
            alert("Corrida excluída com sucesso!");
            console.log("Corrida excluída:", raceId);
        })
        .catch((error) => {
            console.error("Erro ao excluir corrida: ", error);
            alert("Erro ao excluir corrida.");
        });
}

// ==========================================
// SEÇÃO 4: UPLOAD DE RESULTADOS (JSON V10 - CORRIGIDO)
// ==========================================

function handleResultsUpload(db) {
    const raceId = adminDom.resultsRaceSelect.value;
    const selectedOption = adminDom.resultsRaceSelect.options[adminDom.resultsRaceSelect.selectedIndex];
    const calendar = selectedOption.dataset.calendar;
    
    const file = adminDom.resultsFileInput.files[0];
    
    if (!raceId || !calendar) {
        updateStatus(adminDom.uploadResultsStatus, "Selecione uma corrida primeiro.", "error");
        return;
    }
    if (!file) {
        updateStatus(adminDom.uploadResultsStatus, "Selecione um arquivo JSON.", "error");
        return;
    }
    
    updateStatus(adminDom.uploadResultsStatus, "Processando arquivo...", "loading");
    
    // Usa o utilitário para ler o JSON
    readAsJson(file, (data) => {
        // Envia os dados lidos para a função de processamento (V10)
        processAndUploadResults(db, data, raceId, calendar);
    }, (error) => {
        updateStatus(adminDom.uploadResultsStatus, `Erro ao ler arquivo: ${error}`, "error");
    });
}

// Função de Upload de Ranking (Copa Alcer)
function handleRankingUpload(db) {
    const file = adminDom.rankingFileInput.files[0];
    if (!file) {
        updateStatus(adminDom.uploadRankingStatus, "Selecione um arquivo JSON de ranking.", "error");
        return;
    }

    updateStatus(adminDom.uploadRankingStatus, "Enviando ranking...", "loading");

    readAsJson(file, (rankingData) => {
        // Envia os dados lidos para a função específica de ranking
        uploadFinalRanking(db, rankingData);
    }, (error) => {
        updateStatus(adminDom.uploadRankingStatus, `Erro ao ler arquivo: ${error}`, "error");
    });
}

// ==========================================
// SEÇÃO 5: LÓGICA DE PROCESSAMENTO DE DADOS (V10 - CORRIGIDO)
// ==========================================

// Utilitário para ler o arquivo JSON
function readAsJson(file, onSuccess, onError) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            onSuccess(data);
        } catch (e) {
            console.error("Erro no parse do JSON: ", e);
            onError(e.message);
        }
    };
    reader.onerror = (event) => {
        console.error("Erro ao ler o arquivo: ", event.target.error);
        onError(event.target.error);
    };
    reader.readAsText(file);
}

/**
 * (V10 - CORRIGIDO)
 * Processa o JSON (Rodobens) e faz o upload para o Firebase.
 * Esta é a função central que foi corrigida.
 */
function processAndUploadResults(db, jsonData, raceId, calendar) {
    
    // 1. Mapeia os dados do JSON (Array de atletas)
    const normalizedData = jsonData.map(atleta => {
        const cleanAtleta = {};
        
        // Itera pelas chaves do objeto original (ex: "Coloc.", "Atleta", "Fx.Et.")
        for (const originalKey in atleta) {
            if (Object.hasOwnProperty.call(atleta, originalKey)) {
                
                // Remove espaços e converte para minúsculas
                const cleanKey = originalKey.trim().toLowerCase();
                let newKey = null;

                // 2. Normaliza (Traduz) as chaves
                // (Baseado na "Solução O JSON Correto" do vídeo ...555.mp4)
                if (cleanKey.includes('coloc.') || cleanKey.includes('cl.fx.')) {
                    // Prioriza Cl.Fx. (Classificação na Faixa) se existir
                    if (cleanKey.includes('cl.fx.')) {
                         newKey = 'placement';
                    } else if (!cleanAtleta.placement) {
                        // Usa Coloc. (Geral) apenas se Cl.Fx. não foi definido
                        newKey = 'placement'; 
                    }
                } else if (cleanKey.includes('atleta') || cleanKey.includes('nome')) {
                    newKey = 'name';
                } else if (cleanKey.includes('categoria') || cleanKey.includes('fx.et.')) {
                    newKey = 'category';
                } else if (cleanKey.includes('equipe')) {
                    newKey = 'team';
                } else if (cleanKey.includes('tempo')) {
                    newKey = 'time';
                }
                
                // Atribui o valor à nova chave
                if (newKey) {
                    cleanAtleta[newKey] = atleta[originalKey];
                }
            }
        }
        
        // Garante que os campos essenciais existam
        cleanAtleta.category = cleanAtleta.category || "GERAL"; // Categoria padrão
        
        return cleanAtleta;
    });

    // 3. Agrupa os atletas por Categoria
    const groupedByCategory = normalizedData.reduce((acc, atleta) => {
        const category = atleta.category;
        
        // Se a categoria ainda não existe no acumulador, cria
        if (!acc[category]) {
            acc[category] = [];
        }
        
        // Adiciona o atleta à sua categoria
        acc[category].push(atleta);
        return acc;
    }, {});
    
    // 4. Ordena os atletas dentro de cada categoria por 'placement' (numérico)
    for (const category in groupedByCategory) {
        groupedByCategory[category].sort((a, b) => {
            const placementA = parseInt(a.placement, 10) || 0;
            const placementB = parseInt(b.placement, 10) || 0;
            return placementA - placementB;
        });
    }

    // 5. Salva o array processado e agrupado no Firebase
    const resultsRef = db.ref(`/resultadosEtapas/${raceId}`);
    
    resultsRef.set(groupedByCategory)
        .then(() => {
            updateStatus(adminDom.uploadResultsStatus, "Resultados enviados com sucesso!", "success");
            console.log("Resultados salvos com sucesso para a corrida:", raceId);
            adminDom.resultsFileInput.value = ''; // Limpa o input
        })
        .catch((error) => {
            updateStatus(adminDom.uploadResultsStatus, `Falha no envio: ${error.message}`, "error");
            console.error("Erro ao salvar resultados: ", error);
        });
}


/**
 * Salva o JSON do Ranking (Copa Alcer)
 */
function uploadFinalRanking(db, rankingData) {
    const rankingRef = db.ref('rankingCopaAlcer');
    
    rankingRef.set(rankingData)
        .then(() => {
            updateStatus(adminDom.uploadRankingStatus, "Ranking Copa Alcer atualizado!", "success");
            console.log("Ranking Copa Alcer salvo com sucesso.");
            adminDom.rankingFileInput.value = ''; // Limpa o input
        })
        .catch((error) => {
            updateStatus(adminDom.uploadRankingStatus, `Falha no envio: ${error.message}`, "error");
            console.error("Erro ao salvar Ranking Copa Alcer: ", error);
        });
}


// ==========================================
// SEÇÃO 6: UTILITÁRIOS DO ADMIN
// ==========================================

// Atualiza a mensagem de status para o usuário
function updateStatus(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.classList.remove('success', 'error', 'loading');
    
    if (type) {
        element.classList.add(type);
    }
}
