// =================================================================
// ARQUIVO DE CONFIGURAÇÃO (V4 - Rede Social) - CORRIGIDO
// PREENCHA OS CAMPOS ABAIXO COM SUAS CHAVES
// =================================================================

// 1. COLE AQUI SEU OBJETO DE CONFIGURAÇÃO DO FIREBASE
// (Configurações do Projeto -> Seus apps -> SDK de configuração)
// CORREÇÃO: Renomeado de firebaseConfig para FIREBASE_CONFIG (maiúsculas)
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDJ5E0OeVZyyegT1dPLhk7WN9qSsmSSlrE", // Mantenha sua chave real aqui
    authDomain: "rede-social-corridas.firebaseapp.com", // Mantenha seu domínio real aqui
    databaseURL: "https://rede-social-corridas-default-rtdb.firebaseio.com", // Mantenha sua URL real aqui
    projectId: "rede-social-corridas", // Mantenha seu ID real aqui
    storageBucket: "rede-social-corridas.firebasestorage.app", // Mantenha seu bucket real aqui
    messagingSenderId: "189038379811", // Mantenha seu ID real aqui
    appId: "1:189038379811:web:b92f89e34b246b4547c296" // Mantenha seu App ID real aqui
  };

// 2. COLE AQUI SEU CLOUD NAME DO CLOUDINARY
// (Dashboard -> Cloud Name)
const CLOUDINARY_CLOUD_NAME = "dpaayfwlj"; // Mantenha seu Cloud Name real aqui

// 3. COLE AQUI SEU UPLOAD PRESET DO CLOUDINARY
// (Settings -> Upload -> Upload Presets -> Nome do seu preset "Unsigned")
const CLOUDINARY_UPLOAD_PRESET = "rede_corridas_unsigned"; // Mantenha seu Preset real aqui

// =================================================================
// NOVAS CONFIGURAÇÕES - INTEGRAÇÃO STRAVA (Parte 4)
// =================================================================

// 4. SEU CLIENT ID DO STRAVA (Da Parte 1)
const STRAVA_CLIENT_ID = "180023";

// 5. URL DO SEU WORKFLOW 1 (OAUTH) DO PIPEDREAM (Da Parte 2)
const PIPEDREAM_OAUTH_URL = "https://eo9o1qisbc8fpyu.m.pipedream.net"; 

// 6. URL DO SEU WORKFLOW 2 (REFRESH/BUSCA) DO PIPEDREAM (Da Parte 2)
const PIPEDREAM_REFRESH_AND_FETCH_URL = "https://eoex4dd33w443lh.m.pipedream.net";
