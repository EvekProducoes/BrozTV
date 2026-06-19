/**
 * firebase.js — Inicialização e acesso ao Firebase Firestore
 */
import { FIREBASE_CONFIG } from './config.js';

let _db = null;

export function getDb() { return _db; }

const loadScript = (src) => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    document.head.appendChild(script);
});

export async function initFirebase() {
    if (_db) return _db;

    // Reutiliza instância já carregada pelo app React
    if (window.firebase && window.firebase.firestore) {
        _db = window.firebase.firestore();
        return _db;
    }

    try {
        await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
        await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
        await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js");

        if (!window.firebase.apps.length) {
            window.firebase.initializeApp(FIREBASE_CONFIG);
        }

        _db = window.firebase.firestore();
        console.log('[Firebase] Banco de dados Firestore inicializado com sucesso!');
    } catch (e) {
        console.error('[Firebase] Falha ao inicializar Firestore:', e);
    }

    return _db;
}

/**
 * Sincroniza dados de clientes do Firestore para o localStorage
 */
export async function syncClientsFromFirestore() {
    const db = await initFirebase();
    if (!db) return;

    try {
        const snapshot = await db.collection('users').get();
        const clients = [];
        snapshot.forEach(doc => clients.push({ id: doc.id, ...doc.data() }));

        if (clients.length > 0) {
            localStorage.setItem('broz_clients_data', JSON.stringify(clients));
            console.log(`[Firebase Interceptor] Sincronização de ${clients.length} cliente(s) concluída!`);
            console.log(`[Firebase] Dados de assinantes carregados da nuvem: ${clients.length}`);
        }
    } catch (e) {
        console.warn('[Firebase] Erro ao sincronizar clientes:', e.message);
    }
}
