// scripts/publish_data.js
// Este script é executado pela GitHub Action para ler o Firebase RTDB
// e atualizar os arquivos JSON no repositório GitHub.

const admin = require('firebase-admin');
const https = require('https');
const { Buffer } = require('buffer');

// --- Configuração Lida do Ambiente (GitHub Secrets/Env) ---
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
const GITHUB_TOKEN = process.env.GH_PAT;
const [GITHUB_OWNER, GITHUB_REPO] = (process.env.GITHUB_REPOSITORY || '').split('/');
const GITHUB_BRANCH = process.env.GITHUB_BRANCH;

// Caminhos dos arquivos no repositório GitHub (relativos à raiz)
const PROFILES_PATH = 'data/public_profiles.json';
const CORRIDAS_PATH = 'data/corridas.json';
const RESULTADOS_PATH = 'data/resultados.json';
const RANKING_PATH = 'data/ranking.json'; // <-- NOVO CAMINHO

// --- Validação Inicial ---
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_DATABASE_URL || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_BRANCH) {
    console.error("ERRO CRÍTICO: Uma ou mais variáveis de ambiente/segredos não estão configuradas corretamente na GitHub Action.");
    console.error("Verifique os segredos: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL, GH_PAT.");
    process.exit(1);
}

// --- Inicializa o Firebase Admin SDK ---
try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY,
        }),
        databaseURL: FIREBASE_DATABASE_URL
    });
    console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
    console.error('Falha ao inicializar o Firebase Admin SDK:', error.message);
    process.exit(1);
}

// --- Funções para Interagir com a API do GitHub ---
// ... (Funções githubApiRequest, getFileSha, createOrUpdateFile - SEM ALTERAÇÕES) ...
function githubApiRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, // Monta a URL completa
            method: method,
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`, // Usa o PAT para autenticar
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitHubAction-PublishDataScript-Node', // Exigido pela API
                'X-GitHub-Api-Version': '2022-11-28' // Versão recomendada da API
            }
        };
        if (data) { options.headers['Content-Type'] = 'application/json'; }
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                try {
                    const parsedBody = responseBody ? JSON.parse(responseBody) : null;
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, data: parsedBody });
                    } else {
                        const error = new Error(`Erro API GitHub (${method} ${options.path}): ${res.statusCode} - ${parsedBody?.message || responseBody}`);
                        error.statusCode = res.statusCode; error.responseBody = parsedBody; reject(error);
                    }
                } catch (e) {
                    const error = new Error(`Erro ao parsear resposta da API GitHub (${method} ${options.path}): ${res.statusCode} - ${e.message}. Corpo: ${responseBody}`);
                    error.statusCode = res.statusCode; reject(error);
                }
            });
        });
        req.on('error', (e) => { reject(new Error(`Falha na requisição para API GitHub (${method} ${options.path}): ${e.message}`)); });
        if (data) { req.write(JSON.stringify(data)); }
        req.end();
    });
}
async function getFileSha(filePath) {
    try {
        console.log(`Verificando SHA para ${filePath}...`);
        const response = await githubApiRequest('GET', `/contents/${filePath}?ref=${GITHUB_BRANCH}`);
        console.log(`SHA encontrado para ${filePath}: ${response.data.sha}`);
        return response.data.sha;
    } catch (error) {
        if (error.statusCode === 404) { console.log(`Arquivo ${filePath} não encontrado. Será criado.`); return null; }
        console.error(`Erro ao obter SHA para ${filePath}:`, error.message); throw error;
    }
}
async function createOrUpdateFile(filePath, content, commitMessage) {
    const currentSha = await getFileSha(filePath);
    const contentBase64 = Buffer.from(content).toString('base64');
    console.log(`Iniciando ${currentSha ? 'atualização' : 'criação'} de ${filePath}...`);
    await githubApiRequest('PUT', `/contents/${filePath}`, {
        message: commitMessage, content: contentBase64, sha: currentSha, branch: GITHUB_BRANCH
    });
    console.log(`Arquivo ${filePath} ${currentSha ? 'atualizado' : 'criado'} com sucesso no GitHub.`);
}

// --- Lógica Principal do Script ---
async function run() {
    try {
        console.log("Iniciando processo de publicação...");
        const db = admin.database();

        // 1. Ler os dados necessários do Realtime Database
        console.log("Lendo dados do Realtime Database...");
        // Usa Promise.all para buscar os 4 nós em paralelo AGORA
        const [profilesSnap, corridasSnap, resultadosSnap, rankingSnap] = await Promise.all([ // <-- ADICIONADO rankingSnap
            db.ref('/publicProfiles').once('value'),
            db.ref('/corridas').once('value'),
            db.ref('/resultadosEtapas').once('value'),
            db.ref('/rankingCopaAlcer').once('value') // <-- ADICIONADA LEITURA DO RANKING
        ]);
        // Extrai os dados ou usa um objeto vazio como fallback
        const profilesData = profilesSnap.val() || {};
        const corridasData = corridasSnap.val() || {};
        const resultadosData = resultadosSnap.val() || {};
        const rankingData = rankingSnap.val() || {}; // <-- ADICIONADO DADO DO RANKING
        console.log("Dados lidos com sucesso do RTDB.");

        // 2. Commitar os arquivos JSON atualizados no GitHub
        console.log("Iniciando commit dos arquivos JSON para o GitHub...");
        await createOrUpdateFile(PROFILES_PATH, JSON.stringify(profilesData, null, 2), `[Automated] Update ${PROFILES_PATH}`);
        await createOrUpdateFile(CORRIDAS_PATH, JSON.stringify(corridasData, null, 2), `[Automated] Update ${CORRIDAS_PATH}`);
        await createOrUpdateFile(RESULTADOS_PATH, JSON.stringify(resultadosData, null, 2), `[Automated] Update ${RESULTADOS_PATH}`);
        await createOrUpdateFile(RANKING_PATH, JSON.stringify(rankingData, null, 2), `[Automated] Update ${RANKING_PATH}`); // <-- ADICIONADO COMMIT DO RANKING
        console.log("Todos os arquivos JSON foram commitados com sucesso no GitHub.");

        console.log("====== PUBLICAÇÃO CONCLUÍDA COM SUCESSO ======");

    } catch (error) {
        console.error("====== ERRO DURANTE O PROCESSO DE PUBLICAÇÃO ======");
        console.error(`Status Code (se aplicável): ${error.statusCode || 'N/A'}`);
        console.error(`Mensagem: ${error.message}`);
        if (error.responseBody) { console.error("Detalhes (GitHub API):", JSON.stringify(error.responseBody, null, 2)); }
        process.exit(1);
    }
}

// --- Inicia a execução do script ---
run();
