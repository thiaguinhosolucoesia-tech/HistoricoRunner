// scripts/publish_data.js
// Este script é executado pela GitHub Action para ler o Firebase RTDB
// e atualizar os arquivos JSON no repositório GitHub.

// Importa a biblioteca do Firebase Admin SDK (instalada pela Action)
const admin = require('firebase-admin');
// Importa o módulo 'https' nativo do Node.js para fazer chamadas à API do GitHub
const https = require('https');
// Importa 'Buffer' para codificar o conteúdo dos arquivos em Base64
const { Buffer } = require('buffer');

// --- Lê as Configurações e Segredos das Variáveis de Ambiente ---
// (Passadas pelo arquivo publish.yml)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
// Corrige possíveis problemas com quebras de linha na chave privada
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
const GITHUB_TOKEN = process.env.GH_PAT; // O PAT que você configurou como segredo
const [GITHUB_OWNER, GITHUB_REPO] = (process.env.GITHUB_REPOSITORY || '').split('/'); // Ex: "seuUsuario/seuRepo"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH; // Ex: "main"

// Caminhos onde os arquivos JSON serão salvos no repositório
const PROFILES_PATH = 'data/public_profiles.json';
const CORRIDAS_PATH = 'data/corridas.json';
const RESULTADOS_PATH = 'data/resultados.json';

// --- Validação Inicial ---
// Garante que todos os segredos necessários foram configurados
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_DATABASE_URL || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_BRANCH) {
    console.error("ERRO CRÍTICO: Uma ou mais variáveis de ambiente/segredos não estão configuradas corretamente na GitHub Action.");
    console.error("Verifique os segredos: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL, GH_PAT.");
    process.exit(1); // Interrompe a execução da Action com erro
}

// --- Inicializa o Firebase Admin SDK ---
// Usa as credenciais passadas pelos segredos para acessar o Firebase com privilégios de admin
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
    process.exit(1); // Interrompe a execução
}

// --- Funções para Interagir com a API do GitHub ---

/**
 * Faz uma requisição genérica para a API do GitHub.
 * @param {string} method Método HTTP (GET, PUT, etc.)
 * @param {string} path Caminho da API (ex: /contents/data/file.json)
 * @param {object|null} [data=null] Corpo da requisição (para PUT)
 * @returns {Promise<{statusCode: number, data: object|null}>}
 */
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

        // Se houver dados para enviar (PUT), configura o header
        if (data) {
            options.headers['Content-Type'] = 'application/json';
        }

        // Cria a requisição https
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                try {
                    // Tenta parsear a resposta como JSON
                    const parsedBody = responseBody ? JSON.parse(responseBody) : null;
                    // Verifica se a resposta foi bem-sucedida (status 2xx)
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, data: parsedBody });
                    } else {
                        // Cria um erro mais detalhado
                        const error = new Error(`Erro API GitHub (${method} ${options.path}): ${res.statusCode} - ${parsedBody?.message || responseBody}`);
                        error.statusCode = res.statusCode;
                        error.responseBody = parsedBody;
                        reject(error);
                    }
                } catch (e) {
                    // Erro ao parsear a resposta (pode acontecer com erros inesperados)
                    const error = new Error(`Erro ao parsear resposta da API GitHub (${method} ${options.path}): ${res.statusCode} - ${e.message}. Corpo: ${responseBody}`);
                    error.statusCode = res.statusCode;
                    reject(error);
                }
            });
        });

        // Trata erros na requisição (ex: falha de rede)
        req.on('error', (e) => {
            reject(new Error(`Falha na requisição para API GitHub (${method} ${options.path}): ${e.message}`));
        });

        // Envia o corpo da requisição, se houver
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end(); // Finaliza a requisição
    });
}

/**
 * Obtém o SHA (identificador de versão) de um arquivo no GitHub, se ele existir.
 * @param {string} filePath Caminho do arquivo no repositório.
 * @returns {Promise<string|null>} O SHA do arquivo ou null se não existir.
 */
async function getFileSha(filePath) {
    try {
        console.log(`Verificando SHA para ${filePath}...`);
        // Faz uma requisição GET para obter informações do arquivo
        const response = await githubApiRequest('GET', `/contents/${filePath}?ref=${GITHUB_BRANCH}`);
        console.log(`SHA encontrado para ${filePath}: ${response.data.sha}`);
        return response.data.sha; // Retorna o SHA do arquivo
    } catch (error) {
        // Se o erro for 404, significa que o arquivo não existe (o que é normal)
        if (error.statusCode === 404) {
            console.log(`Arquivo ${filePath} não encontrado. Será criado.`);
            return null; // Retorna null para indicar que é um arquivo novo
        }
        // Se for outro erro, propaga o erro para interromper a execução
        console.error(`Erro ao obter SHA para ${filePath}:`, error.message);
        throw error;
    }
}

/**
 * Cria um novo arquivo ou atualiza um existente no repositório GitHub.
 * @param {string} filePath Caminho do arquivo no repositório.
 * @param {string} content Conteúdo do arquivo (string).
 * @param {string} commitMessage Mensagem do commit.
 */
async function createOrUpdateFile(filePath, content, commitMessage) {
    // Obtém o SHA atual do arquivo (será null se for novo)
    const currentSha = await getFileSha(filePath);
    // Codifica o conteúdo em Base64, exigido pela API do GitHub
    const contentBase64 = Buffer.from(content).toString('base64');

    console.log(`Iniciando ${currentSha ? 'atualização' : 'criação'} de ${filePath}...`);
    // Faz a requisição PUT para criar ou atualizar o arquivo
    await githubApiRequest('PUT', `/contents/${filePath}`, {
        message: commitMessage, // Mensagem descritiva para o histórico do Git
        content: contentBase64, // Conteúdo codificado
        sha: currentSha, // SHA atual (se for atualização) ou null (se for criação)
        branch: GITHUB_BRANCH // Branch onde o arquivo será commitado
    });
    console.log(`Arquivo ${filePath} ${currentSha ? 'atualizado' : 'criado'} com sucesso no GitHub.`);
}

// --- Função Principal de Execução ---
async function run() {
    try {
        console.log("Iniciando processo de publicação...");
        const db = admin.database(); // Obtém referência ao banco de dados

        // 1. Ler os dados necessários do Realtime Database
        console.log("Lendo dados do Realtime Database...");
        // Usa Promise.all para buscar os 3 nós em paralelo
        const [profilesSnap, corridasSnap, resultadosSnap] = await Promise.all([
            db.ref('/publicProfiles').once('value'),
            db.ref('/corridas').once('value'),
            db.ref('/resultadosEtapas').once('value')
        ]);
        // Extrai os dados ou usa um objeto vazio como fallback
        const profilesData = profilesSnap.val() || {};
        const corridasData = corridasSnap.val() || {};
        const resultadosData = resultadosSnap.val() || {};
        console.log("Dados lidos com sucesso do RTDB.");

        // 2. Commitar os arquivos JSON atualizados no GitHub
        console.log("Iniciando commit dos arquivos JSON para o GitHub...");
        // Chama a função para cada arquivo, passando o caminho, conteúdo formatado e mensagem
        await createOrUpdateFile(PROFILES_PATH, JSON.stringify(profilesData, null, 2), `[Automated] Atualiza perfis públicos`);
        await createOrUpdateFile(CORRIDAS_PATH, JSON.stringify(corridasData, null, 2), `[Automated] Atualiza calendário de corridas`);
        await createOrUpdateFile(RESULTADOS_PATH, JSON.stringify(resultadosData, null, 2), `[Automated] Atualiza resultados de etapas`);
        console.log("Todos os arquivos JSON foram commitados com sucesso no GitHub.");

        console.log("====== PUBLICAÇÃO CONCLUÍDA COM SUCESSO ======");

    } catch (error) {
        // Captura e exibe qualquer erro que ocorra durante o processo
        console.error("====== ERRO DURANTE O PROCESSO DE PUBLICAÇÃO ======");
        console.error(`Status Code (se aplicável): ${error.statusCode || 'N/A'}`);
        console.error(`Mensagem: ${error.message}`);
        // Se o erro veio da API do GitHub, pode ter detalhes adicionais
        if (error.responseBody) {
            console.error("Detalhes (GitHub API):", JSON.stringify(error.responseBody, null, 2));
        }
        process.exit(1); // Finaliza a Action com status de erro
    }
}

// --- Inicia a execução do script ---
run();
