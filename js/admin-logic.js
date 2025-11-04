// ARQUIVO: js/admin-logic.js (V6 - FINAL CORRIGIDO)
// CORREÇÕES: Permissão Denied, Filtro de Corridas, Mapeamento de Chaves, Tratamento de Erros.


// Função para mapear chaves de resultados de apuradoras para o formato interno
function mapResultsKeys(result) {
    const mappedResult = {};
    for (const key in result) {
        if (result.hasOwnProperty(key)) {
            let newKey = key;
            // Mapeamento de chaves com caracteres especiais (Firebase não aceita '.')
            if (key === 'Fx.Et.') {
                newKey = 'category';
            } else if (key === 'Cl.Fx.') {
                newKey = 'category_placement'; // Corrigido para evitar o '.'
            } else if (key === 'Coloc.') {
                newKey = 'placement';
            } else if (key === 'Num.') {
                newKey = 'bib';
            } else if (key === 'Tempo') {
                newKey = 'time';
            } else if (key === 'Nome') {
                newKey = 'name';
            } else if (key === 'Equipe') {
                newKey = 'team';
            }
            mappedResult[newKey] = result[key];
        }
    }
    return mappedResult;
}


// Função para popular o seletor de upload de resultados
function populateResultsRaceSelect(copaRaces, geralRaces) {
    const select = document.getElementById('results-race-select');
    select.innerHTML = '<option value="">Selecione uma etapa</option>';

    const allRaces = { ...copaRaces, ...geralRaces }; // Combina todas as corridas

    for (const raceId in allRaces) {
        if (allRaces.hasOwnProperty(raceId)) {
            const race = allRaces[raceId];
            const option = document.createElement('option');
            option.value = raceId;
            option.textContent = `${race.nome} (${race.data.split('-').reverse().join('/')})`;
            select.appendChild(option);
        }
    }
}


// Função principal de carregamento de dados (CORRIGIDA PARA CARREGAR TODAS AS CORRIDAS)
function loadAndDisplayRaces() {
    const copaRef = db.ref('corridas/copaAlcer'); // CORRIGIDO: Adicionado '/corridas'
    const geralRef = db.ref('corridas/geral'); // CORRIGIDO: Adicionado '/corridas'

    let copaRaces = {};
    let geralRaces = {};

    // Carrega Corridas da Copa Alcer
    copaRef.on('value', (snapshot) => {
        copaRaces = snapshot.val() || {};
        displayRaceList(copaRaces, adminDom.copaRaceList, 'copaAlcer');
        // Popula o seletor após carregar ambos os conjuntos
        populateResultsRaceSelect(copaRaces, geralRaces);
    });

    // Carrega Corridas da Região (Geral)
    geralRef.on('value', (snapshot) => {
        geralRaces = snapshot.val() || {};
        displayRaceList(geralRaces, adminDom.geralRaceList, 'geral');
        // Popula o seletor após carregar ambos os conjuntos
        populateResultsRaceSelect(copaRaces, geralRaces);
    });
}


// Função para salvar nova corrida (CORRIGIDA PARA USAR O CAMINHO CORRETO)
function handleRaceFormSubmit(event) {
    const calendar = adminDom.raceCalendar.value;
    const raceData = {
    };

    // CORRIGIDO: Usa o caminho correto '/corridas/'
    db.ref(`corridas/${calendar}/${raceData.id}`).set(raceData)
        .then(() => {
        })
        .catch(error => {
        });
}


// Função de upload de resultados
function processAndUploadResults(raceId, resultsJson) {
    const raceRef = db.ref(`corridas/${calendar}/${raceId}`); // CORRIGIDO: Usa o caminho correto


    // Processa cada resultado
    const processedResults = resultsJson.map(result => {
        const mappedResult = mapResultsKeys(result); // Mapeia as chaves
        return mappedResult;
    });


    // Salva no Firebase
    db.ref(`resultadosEtapas/${raceId}`).set(processedResults)
        .then(() => {
        })
        .catch(error => {
        });
}
