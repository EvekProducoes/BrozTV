/**
 * custom-mods/index.js — Módulo principal do BrozTV custom-mods (refatorado)
 *
 * Substitui o arquivo monolítico custom-mods.js (1691 linhas) por módulos organizados:
 *   config.js      → Constantes e links
 *   firebase.js    → Inicialização do Firestore
 *   styles.js      → CSS customizados (neon, animações)
 *   login.js       → Interceptação do login e autenticação
 *   register.js    → Cadastro de novos clientes
 *   dashboard.js   → Área do Assinante (licença + Pix)
 *   downloads.js   → Botões de download no HUB
 *   tv-block.js    → Bloqueio de TV Ao Vivo na Web
 *   admin.js       → Controles do painel administrativo
 *   cast.js        → Transmissão para TV (Electron)
 */

import { injectCustomStyles } from './styles.js?v=2.1.9';
import { initFirebase, syncClientsFromFirestore } from './firebase.js';
import { injectLandingDownloads, interceptLoginForm, showLoginError } from './login.js?v=2.1.9';
import { renderPremiumLogin } from './premium-login.js';
import { showRegisterForm } from './register.js';
import { injectClientDashboardWeb } from './dashboard.js?v=2.1.9';
import { injectHubDownloads } from './downloads.js';
import { interceptTvLiveOnWeb } from './tv-block.js';
import { injectAdminDashboardWeb } from './admin.js?v=2.1.9';
import { interceptCastButtons } from './cast.js';
import { interceptVideoPlayer } from './player.js';

// ─── Ocultação Imediata do Player React na Web (antes do DOM carregar) ──────
(function () {
    const isElectron = typeof window !== 'undefined' &&
        (window.process && window.process.type === 'renderer' ||
            navigator.userAgent.indexOf('Electron') >= 0);
    const isCapacitor = typeof window !== 'undefined' &&
        (window.Capacitor !== undefined ||
            window.location.protocol === 'capacitor:');

    if (!isElectron && !isCapacitor) {
        try {
            const userSession = localStorage.getItem('broz_session_user');
            if (userSession) {
                const style = document.createElement('style');
                style.id = 'hide-root-mods-style';
                // Não usamos display: none nem position: absolute para não quebrar as dimensões (width/height) do React!
                style.textContent = '#root { opacity: 0 !important; pointer-events: none !important; }';
                if (document.documentElement) {
                    document.documentElement.appendChild(style);
                    document.documentElement.classList.add('not-native-web-logged');
                }
            }
        } catch (e) {
            console.error('[CustomMods] Falha na ocultação imediata:', e);
        }
    }
})();

// ─── Captura URL de stream interceptando console.log do React ────────────────
window.currentStreamUrl = '';
const _originalLog = console.log;
console.log = function (...args) {
    _originalLog.apply(console, args);
    try {
        const msg = args.join(' ');
        if (msg.includes('Setting up simple video player with URL:')) {
            const parts = msg.split('Setting up simple video player with URL:');
            if (parts[1]) {
                window.currentStreamUrl = parts[1].trim();
            }
        }
    } catch (e) { /* silencioso */ }
};

// ─── Classe Principal ─────────────────────────────────────────────────────────
class CustomUiMods {
    constructor() {
        this.observer = null;
        this.isNative = false;
        this.proxyUrl = 'http://localhost:4000';
        this.isHandlingChanges = false;
        this._detectPlatform();
        this._init();
    }

    _detectPlatform() {
        const isElectron = typeof window !== 'undefined' &&
            (window.process && window.process.type === 'renderer' ||
                navigator.userAgent.indexOf('Electron') >= 0);
        const isCapacitor = typeof window !== 'undefined' &&
            (window.Capacitor !== undefined ||
                window.location.protocol === 'capacitor:');

        this.isNative = isElectron || isCapacitor;
        console.log(`[CustomMods] Modo do app: ${this.isNative ? 'NATIVO (CORS Bypass & TV Ativa)' : 'WEB (TV Bloqueada nativamente)'}`);

        if (typeof window !== 'undefined' && window.location) {
            const host = window.location.hostname;
            const isLocal = host === 'localhost' || host === '127.0.0.1';
            const isIp = /^(192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(host);
            if (!isLocal && !isIp && !host.includes('loca.lt') && !host.includes('ngrok')) {
                this.proxyUrl = 'https://api-broztv-vip.onrender.com';
            } else if (isLocal) {
                this.proxyUrl = 'http://localhost:4000';
            } else {
                this.proxyUrl = `http://${host}:4000`;
            }
        }
    }

    async _init() {
        console.log('[CustomMods] Inicializando injeção de recursos no sistema antigo...');

        // Inicializa Firebase e migra localStorage
        initFirebase().then(() => {
            syncClientsFromFirestore().catch(() => {});
            // Sincroniza dados do assinante logado se for ambiente nativo
            if (this.isNative && this._checkUserLoggedIn()) {
                this._syncUserPlaylistAndLicenseFromFirestoreSilently();
            }
        }).catch(() => {});
        this._migrateLocalStorage();

        // Injeta estilos CSS globais
        injectCustomStyles();

        // Observa mudanças no DOM (React SPA navega sem recarregar a página)
        this.observer = new MutationObserver(() => this._handleDomChanges());
        this.observer.observe(document.body, { childList: true, subtree: true });

        // Verificação inicial
        this._handleDomChanges();

        // Loop de limpeza persistente para esconder botões de Smart TV na Web
        if (!this.isNative) {
            setInterval(() => {
                this._removeSmartTvPairingOnWeb();
            }, 100);
        }
    }

    _migrateLocalStorage() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('broz_data_') || key === 'broz_data_default')) {
                    const rawData = localStorage.getItem(key);
                    if (rawData) {
                        let lists = JSON.parse(rawData);
                        if (Array.isArray(lists)) {
                            let updated = false;
                            lists = lists.map(list => {
                                if (list && list.url && list.url.includes('Iptv-Brasil-2026/main/')) {
                                    list.url = list.url.replace('Iptv-Brasil-2026/main/', 'Iptv-Brasil-2026/master/');
                                    updated = true;
                                    console.log(`[CustomMods] Migração de URL M3U concluída com sucesso para a chave (${key}).`);
                                }
                                return list;
                            });
                            if (updated) localStorage.setItem(key, JSON.stringify(lists));
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[CustomMods] Falha ao executar migração de localStorage:', e);
        }
    }

    _checkUserLoggedIn() {
        try {
            return localStorage.getItem('broz_session_user') !== null;
        } catch (e) {
            return false;
        }
    }

    async _syncUserPlaylistAndLicenseFromFirestoreSilently() {
        try {
            const sessionUser = JSON.parse(localStorage.getItem('broz_session_user') || '{}');
            const username = sessionUser.username;
            if (!username) return;

            const db = window.firebase.firestore();
            if (!db) return;

            const userDoc = await db.collection('users').doc(username).get();
            if (!userDoc.exists) return;

            const client = userDoc.data();
            const todayStr = new Date().toISOString().split('T')[0];
            const isUserAdmin = client.isAdmin || username === 'admin' || username === 'evekproducoes';

            // 1. Valida se a licença expirou ou está inativa
            if (!isUserAdmin && (client.endDate < todayStr || !client.isActive)) {
                console.log('[CustomMods] Assinatura expirada detectada na inicialização do app nativo. Deslogando...');
                
                // Limpa sessão local
                localStorage.removeItem('broz_session_user');
                localStorage.removeItem('broz_saved_credentials');
                localStorage.removeItem('broztv_xtream_credentials');
                
                // Exibe alerta visual na tela de login após recarregar
                localStorage.setItem('broz_login_alert_message', 'Sua assinatura expirou ou está inativa! Acesse a Área do Assinante na Web (http://broztv.web.app) para efetuar o pagamento e renovar.');
                
                window.location.reload();
                return;
            }

            // 2. Atualiza a lista/credenciais IPTV
            let updated = false;

            if (client.xtreamServer && client.xtreamUser && client.xtreamPassword) {
                const xtreamCredentials = {
                    serverUrl: client.xtreamServer.replace(/\/$/, ''),
                    username: client.xtreamUser,
                    password: client.xtreamPassword
                };
                const currentXtreamRaw = localStorage.getItem('broztv_xtream_credentials');
                let currentXtream = {};
                try { if (currentXtreamRaw) currentXtream = JSON.parse(currentXtreamRaw); } catch(e) {}

                if (currentXtream.serverUrl !== xtreamCredentials.serverUrl ||
                    currentXtream.username !== xtreamCredentials.username ||
                    currentXtream.password !== xtreamCredentials.password) {
                    
                    localStorage.setItem('broztv_xtream_credentials', JSON.stringify(xtreamCredentials));
                    localStorage.removeItem(`broz_data_${username}`);
                    localStorage.removeItem('broz_data_default');
                    updated = true;
                    console.log('[CustomMods] Credenciais Xtream atualizadas silenciosamente do Firestore.');
                }
            } else if (client.m3uUrl) {
                const userListKey = `broz_data_${username}`;
                const newList = [{
                    id: 'broz_list_brasil_2026_id',
                    name: client.listName || 'IPTV - Assinatura BrozTV',
                    url: client.m3uUrl,
                    epgUrl: client.epgUrl || '',
                    date: new Date().toLocaleDateString("pt-BR")
                }];
                
                const currentListRaw = localStorage.getItem(userListKey);
                let currentList = null;
                try { if (currentListRaw) currentList = JSON.parse(currentListRaw); } catch(e) {}
                
                if (!Array.isArray(currentList) || currentList.length === 0 || 
                    currentList[0].url !== client.m3uUrl || 
                    currentList[0].name !== client.listName || 
                    currentList[0].epgUrl !== client.epgUrl) {
                    
                    localStorage.setItem(userListKey, JSON.stringify(newList));
                    localStorage.setItem('broz_data_default', JSON.stringify(newList));
                    localStorage.removeItem('broztv_xtream_credentials');
                    updated = true;
                    console.log('[CustomMods] Lista IPTV M3U atualizada silenciosamente do Firestore.');
                }
            }

            // Se mudou a lista, recarrega o app para aplicar
            if (updated) {
                console.log('[CustomMods] Alterações na playlist aplicadas. Recarregando...');
                setTimeout(() => {
                    window.location.reload();
                }, 800);
            }

        } catch (e) {
            console.warn('[CustomMods] Erro ao sincronizar dados do usuário silenciosamente:', e);
        }
    }

    _handleDomChanges() {
        if (this.isHandlingChanges) return;
        this.isHandlingChanges = true;

        if (this.observer) {
            this.observer.disconnect();
        }

        try {
            const isLogged = this._checkUserLoggedIn();

            if (!this.isNative) {
                this._removeSmartTvPairingOnWeb();
            }

            if (!isLogged) {
                if (!this.isNative) {
                    // Se estiver na Web, não logado, e não veio da Landing Page (sem ?login=true), redireciona para a Landing Page
                    if (!window.location.search.includes('login=true') && window.location.pathname !== '/landing.html') {
                        window.location.href = '/landing.html';
                        return;
                    }

                    const textContent = document.body.textContent || '';
                    if (textContent.includes('Seja Bem-vindo') || 
                        textContent.includes('TV Digital') || 
                        textContent.includes('T V Digital') || 
                        textContent.includes('Sala de Cinema') ||
                        document.querySelector('button[title="Sair"]') ||
                        (textContent.includes('Início') && textContent.includes('Filmes') && textContent.includes('Sair'))) {
                        
                        console.warn('[CustomMods] Sessão órfã do player React detectada na Web. Limpando localStorage e recarregando...');
                        localStorage.clear();
                        window.location.reload();
                        return;
                    }

                    // A landing page original da Web agora é exibida normalmente.
                    // O formulário de login será interceptado assim que o usuário clicar em "Acessar Player".
                }
                // Só injetamos a nova tela de login premium se o formulário de login do React aparecer (ex: página de login)
                const loginForm = document.querySelector('form');
                if (loginForm) {
                    renderPremiumLogin(this.isNative, this.proxyUrl);
                } else {
                    // Se não tiver formulário, pode ser a landing page, então deixamos o React rodar sem injetar o login premium ainda.
                }
            } else {
                if (!this.isNative) {
                    // Na Web: Oculta o player original React e exibe o dashboard correspondente
                    interceptTvLiveOnWeb();
                    this._blockListsAndSettings(); // Oculta configurações e conta no Web Player
                    
                    const sessionUser = JSON.parse(localStorage.getItem('broz_session_user') || '{}');
                    const username = sessionUser.username || '';
                    const isAdmin = sessionUser.isAdmin || username.toLowerCase() === 'admin' || username.toLowerCase() === 'evekproducoes';
                    
                    if (isAdmin) {
                        injectAdminDashboardWeb(this.proxyUrl);
                    } else {
                        injectClientDashboardWeb(this.proxyUrl);
                    }
                } else {
                    // No Executável/APK: Exibe o player React e injeta os botões de download
                    injectHubDownloads();
                    
                    interceptCastButtons();
                    interceptVideoPlayer();
                    
                    // Bloqueia adição de listas / configurações no executável
                    this._blockListsAndSettings();
                }
            }
        } catch (e) {
            console.error('[CustomMods] Erro no observer:', e);
        } finally {
            if (this.observer) {
                this.observer.observe(document.body, { childList: true, subtree: true });
            }
            this.isHandlingChanges = false;
        }
    }
    _removeSmartTvPairingOnWeb() {
        // Oculta botões que dizem "Conectar Smart TV" apenas nos elementos clicáveis reais
        const clickableElements = document.querySelectorAll('button, a, [role="button"]');
        clickableElements.forEach(el => {
            const text = String(el.textContent || '').trim().toLowerCase();
            const html = String(el.innerHTML || '').toLowerCase();
            if (text.includes('conectar smart tv') || text.includes('smart tv') || html.includes('smart tv')) {
                el.style.setProperty('display', 'none', 'important');
                // Oculta também o pai caso seja um wrapper
                if (el.parentElement && el.parentElement.tagName !== 'DIV' && el.parentElement.tagName !== 'BODY') {
                    el.parentElement.style.setProperty('display', 'none', 'important');
                }
            }
        });

        // Oculta o card de feature "Link com Smart TV" nas configurações originais
        const headings = document.querySelectorAll('h3, h4, h5, p, span');
        headings.forEach(el => {
            const text = String(el.textContent || '').trim();
            if (text === 'Link com Smart TV' || text.includes('Smart TV')) {
                const card = el.closest('.bg-zinc-900\\/50') || el.closest('.border-zinc-800\\/80') || el.closest('div[class*="bg-"]') || el.parentElement;
                if (card) {
                    card.style.setProperty('display', 'none', 'important');
                }
            }
        });
    }

    _blockListsAndSettings() {
        const sessionUser = JSON.parse(localStorage.getItem('broz_session_user') || '{}');
        const isAdmin = sessionUser.isAdmin || sessionUser.username?.toLowerCase() === 'admin' || sessionUser.username?.toLowerCase() === 'evekproducoes';
        
        // Se for admin, não bloqueia nada (o admin pode gerenciar listas no app se quiser)
        if (isAdmin) return;

        // 1. Oculta botões de atalho/navegação para Configurações/Playlists no HUB e nos menus
        const buttons = document.querySelectorAll('button, a, div[role="button"]');
        buttons.forEach(btn => {
            const title = String(btn.getAttribute('title') || '').toLowerCase();
            const text = String(btn.textContent || '').toLowerCase();
            
            const isSettingsButton = title.includes('configura') || 
                                     title.includes('playlist') || 
                                     title.includes('lista') ||
                                     title.includes('conta') ||
                                     text.includes('configura') || 
                                     text.includes('playlist') || 
                                     text.includes('lista') ||
                                     text === 'conta' ||
                                     btn.querySelector('svg')?.nextSibling?.textContent?.toLowerCase().includes('configura') ||
                                     btn.querySelector('svg')?.nextSibling?.textContent?.toLowerCase().includes('lista') ||
                                     btn.querySelector('svg')?.nextSibling?.textContent?.toLowerCase().trim() === 'conta';

            // Ignora botões do player de vídeo, modais nossos, e dos painéis VIP para não escondê-los por engano!
            if (btn.closest('#broztv-tv-blocked-modal') || btn.closest('#slow-internet-modal') || btn.closest('#continue-watching-banner') || btn.closest('#broztv-client-dashboard-web') || btn.closest('#broztv-admin-dashboard-web')) {
                return;
            }

            if (isSettingsButton && !text.includes('todos os canais') && !text.includes('categorias') && !text.includes('tv ao vivo') && !text.includes('filmes') && !text.includes('séries') && !text.includes('favoritos')) {
                btn.style.display = 'none';
            }

            // Centraliza os cards principais (TV Digital, Sala de Cinema, Séries)
            if (text.includes('sala de cinema') || text.includes('tv digital') || text.includes('séries')) {
                if (btn.parentElement && btn.parentElement.tagName === 'DIV') {
                    btn.parentElement.style.justifyContent = 'center';
                }
            }
        });

        // 2. Se por acaso a tela de configurações (K.SETTINGS) for renderizada, bloqueia e exibe mensagem
        // Identificamos a tela de configurações pela presença de inputs específicos de playlist
        const m3uInput = document.querySelector('input[placeholder*="Link para playlist"], input[placeholder*="M3U"], input[placeholder*="m3u"]');
        const nameInput = document.querySelector('input[placeholder*="Nome da Lista"]');
        
        if (m3uInput || nameInput) {
            const configContainer = m3uInput.closest('.p-8, .max-w-7xl, .p-6, .bg-[#0d1b2a]') || m3uInput.parentElement?.parentElement?.parentElement;
            if (configContainer && !configContainer.querySelector('#broztv-native-blocked-settings-msg')) {
                configContainer.innerHTML = `
                    <div id="broztv-native-blocked-settings-msg" class="flex flex-col items-center justify-center p-10 text-center bg-[#0d1b2a] border border-white/5 rounded-2xl max-w-2xl mx-auto shadow-2xl mt-10 animate-fade-in select-none">
                         <div class="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                             <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><path d="M17 2l-5 5-5-5"></path></svg>
                         </div>
                         <h3 class="text-xl font-extrabold text-white mb-3 tracking-wide">📡 Configuração de Playlists</h3>
                         <p class="text-sm text-gray-300 mb-6 leading-relaxed">
                             Para a segurança e integridade das licenças de uso do sistema, a inclusão e o gerenciamento de playlists são realizados exclusivamente pela Área do Assinante na Web.
                         </p>
                         <div class="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-300 text-xs font-bold leading-relaxed mb-6">
                             Acesse: <a href="http://broztv.web.app/" target="_blank" class="text-yellow-400 hover:underline">http://broztv.web.app/</a><br>
                             Faça login com a sua conta e configure as listas. Elas serão sincronizadas automaticamente com este aplicativo nativo!
                         </div>
                         <button id="js-back-to-hub" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-md shadow-blue-500/20 active:scale-95">
                             🏠 Voltar ao Início
                         </button>
                    </div>
                `;

                document.getElementById('js-back-to-hub').addEventListener('click', () => {
                    window.location.reload(); 
                });
            }
        }
    }
}

// ─── Inicialização ────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CustomUiMods());
} else {
    new CustomUiMods();
}
