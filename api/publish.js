// api/publish.js
const admin = require('firebase-admin');
const { Octokit } = require('@octokit/rest');

// --- Configuração ---
// Vercel buscará estas variáveis do ambiente. Configure-as nas settings do seu projeto Vercel.
const GITHUB_PAT = process.env.GITHUB_PAT; // Seu Personal Access Token do GitHub
const GITHUB_OWNER = process.env.GITHUB_OWNER; // Seu usuário/organização do GitHub
const GITHUB_REPO = process.env.GITHUB_REPO; // Nome do seu repositório
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'; // Branch do site (geralmente main ou gh-pages)
const ADMIN_UID = '29d30W4RS1WzK4SWZRZ5pEFnOdm1'; // UID do admin permitido

// Caminhos dos arquivos no repositório GitHub
const PROFILES_PATH = 'data/public_profiles.json';
const CORRIDAS_PATH = 'data/corridas.json';
const RESULTADOS_PATH = 'data/resultados.json';

// --- Inicialização do Firebase Admin ---
// Vercel lida com isso via variáveis de ambiente ou integração.
// Variáveis necessárias: GOOGLE_APPLICATION_CREDENTIALS_JSON (o conteúdo do JSON da chave de serviço) OU
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// E também FIREBASE_DATABASE_URL
try {
  if (!admin.apps.length) {
    // Tenta usar as credenciais padrão se configuradas via JSON
    let credential;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        credential = admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        // Tenta usar variáveis individuais (formate a private key corretamente)
         credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') // Corrige quebras de linha
        });
    } else {
         console.warn("Credenciais Firebase Admin não encontradas nas variáveis de ambiente. A inicialização pode falhar.");
         // Tenta inicialização padrão (pode funcionar em alguns ambientes, mas Vercel geralmente precisa de config explícita)
         credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
        credential,
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log("Firebase Admin SDK inicializado.");
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error.message);
  // Se falhar aqui, a função não funcionará.
}

// --- Inicialização do Octokit (GitHub API) ---
const octokit = new Octokit({ auth: GITHUB_PAT });

// --- Função Principal (Handler da Vercel) ---
module.exports = async (req, res) => {
  // 1. Segurança: Permitir apenas POST e verificar Admin
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']); // Informa ao cliente que apenas POST é permitido
    return res.status(405).send('Method Not Allowed');
  }

  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).send('Unauthorized: No token provided.');
  }

  // Verifica se o Firebase Admin SDK foi inicializado
  if (!admin.apps.length || !admin.auth()) {
      console.error("Firebase Admin SDK não inicializado corretamente.");
      return res.status(500).send("Internal Server Error: Configuração do servidor incompleta.");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.uid !== ADMIN_UID) {
      console.warn('Attempted publish by non-admin:', decodedToken.uid);
      return res.status(403).send('Forbidden: Only admins can publish.');
    }
    console.log('Admin verified:', decodedToken.uid);

    // 2. Ler Dados do Realtime Database
    console.log('Fetching data from RTDB...');
    const db = admin.database();
    const [profilesSnap, corridasSnap, resultadosSnap] = await Promise.all([
      db.ref('/publicProfiles').once('value'),
      db.ref('/corridas').once('value'),
      db.ref('/resultadosEtapas').once('value')
    ]);

    const profilesData = profilesSnap.val() || {};
    const corridasData = corridasSnap.val() || {};
    const resultadosData = resultadosSnap.val() || {};
    console.log('Data fetched successfully.');

    // 3. Preparar Conteúdo JSON para o GitHub
    const filesToCommit = [
      { path: PROFILES_PATH, content: JSON.stringify(profilesData, null, 2) },
      { path: CORRIDAS_PATH, content: JSON.stringify(corridasData, null, 2) },
      { path: RESULTADOS_PATH, content: JSON.stringify(resultadosData, null, 2) }
    ];

    // 4. Commitar Arquivos no GitHub
    console.log('Attempting to commit files to GitHub...');
    for (const file of filesToCommit) {
      await createOrUpdateFile(file.path, file.content, `[Automated] Update ${file.path}`);
      console.log(`Successfully committed ${file.path}`);
    }

    console.log('All files committed successfully.');
    // Configura CORS para permitir a resposta para o seu domínio do GitHub Pages/Vercel
    res.setHeader('Access-Control-Allow-Origin', '*'); // Ou especifique seu domínio: 'https://seu-usuario.github.io'
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    // Responde a requisições OPTIONS (preflight)
     if (req.method === 'OPTIONS') {
       return res.status(200).end();
     }

    return res.status(200).json({ message: 'Dados publicados no site com sucesso!' });

  } catch (error) {
    console.error('Error during publish process:', error);
     // Configura CORS também para erros
    res.setHeader('Access-Control-Allow-Origin', '*'); // Ou seu domínio
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (error.code === 'auth/id-token-expired') {
        return res.status(401).send('Unauthorized: Token expired.');
    }
    // Melhor tratamento de erros da API do GitHub
    if (error.response && error.response.status) {
         if (error.response.status === 404) {
             return res.status(500).send(`Error: Arquivo não encontrado no repositório GitHub (${error.request.url}). Verifique os caminhos e o branch.`);
         }
         if (error.response.status === 401 || (error.response.data && error.response.data.message.includes('Bad credentials'))) {
             return res.status(500).send(`Error: Credenciais do GitHub (PAT) inválidas. Verifique o token nas variáveis de ambiente da Vercel.`);
         }
          if (error.response.status === 403) {
             return res.status(500).send(`Error: Permissão negada pelo GitHub. Verifique se o PAT tem permissão de 'repo'.`);
         }
         return res.status(500).send(`GitHub API Error: ${error.response.status} - ${error.message}`);
    }
    // Erros genéricos
    return res.status(500).send(`Internal Server Error: ${error.message}`);
  }
};

// --- Função Auxiliar para Commitar no GitHub ---
async function createOrUpdateFile(filePath, content, commitMessage) {
  let currentSha = null;
  try {
    // Tenta obter o SHA do arquivo existente
    console.log(`Getting content for ${filePath}...`);
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      ref: GITHUB_BRANCH,
       // Adiciona um timestamp para tentar evitar cache da API do GitHub
      headers: { 'If-None-Match': '' }
    });
    currentSha = data.sha;
    console.log(`Found existing file ${filePath} with SHA: ${currentSha}`);
  } catch (error) {
    if (error.status !== 404) {
      console.error(`Error fetching content for ${filePath}:`, error.status, error.message);
      throw error; // Relança o erro se não for 404
    }
    console.log(`File ${filePath} not found. Creating new file.`);
  }

  // Cria ou atualiza o arquivo
  console.log(`Creating/Updating file ${filePath}...`);
  await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: filePath,
    message: commitMessage,
    content: Buffer.from(content).toString('base64'),
    sha: currentSha, // Será null se o arquivo for novo
    branch: GITHUB_BRANCH,
  });
   console.log(`File ${filePath} processed.`);
}
