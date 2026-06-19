/**
 * app.js - Lógica Principal, SPA Router e Controladores de View do BrozTV VIP+
 * Gerencia a navegação, login do Firebase, login do Xtream Codes e renderização do catálogo.
 */

import Platform from './platform.js';
import XtreamAPI from './api.js';
import VideoPlayer from './player.js';

class AppController {
    constructor() {
        this.currentContext = 'movies'; // 'movies' | 'series' | 'live'
        this.mediaCache = {
            movies: [],
            series: [],
            live: []
        };
        this.categoriesCache = {
            movies: [],
            series: [],
            live: []
        };
        this.selectedCategory = 'all';
        this.isFirebaseBypass = false;

        this.init();
    }

    async init() {
        this.detectFirebaseStatus();
        this.setupEventListeners();
        this.checkAuthAndRoute();
    }

    /**
     * Detecta se o Firebase está configurado ou se usaremos o bypass local de desenvolvimento.
     */
    detectFirebaseStatus() {
        const auth = window.firebaseAuth;
        // Verifica se a API Key é a padrão do placeholder
        const hasPlaceholderKey = auth && auth.app && auth.app.options && 
                                  auth.app.options.apiKey === 'COLOQUE_SUA_API_KEY_AQUI';

        if (!auth || hasPlaceholderKey) {
            this.isFirebaseBypass = true;
            console.warn('[Firebase] Firebase não configurado ou chave padrão detectada. Ativando Modo de Bypass Local (admin@broz.tv / admin123) para desenvolvimento.');
        } else {
            console.log('[Firebase] Firebase configurado e pronto para produção.');
        }
    }

    /**
     * Gerencia a exibição das views (SPA Router)
     */
    showView(viewId) {
        const views = document.querySelectorAll('.view');
        views.forEach(v => {
            v.classList.remove('active');
            v.classList.add('hidden');
        });

        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('active');
            console.log(`[SPA Router] View alterada para: ${viewId}`);
            
            // Tratamentos especiais ao mudar de view
            if (viewId === 'view-dashboard') {
                this.loadDashboardData();
            }
        }
    }

    /**
     * Roteador de inicialização baseado no estado do Firebase e do Xtream Codes
     */
    checkAuthAndRoute() {
        if (this.isFirebaseBypass) {
            // No modo de bypass, verifica o localStorage por uma sessão fake ativa
            const isFakeLoggedIn = localStorage.getItem('broztv_fake_login') === 'true';
            if (!isFakeLoggedIn) {
                this.showView('view-login-system');
            } else {
                this.checkXtreamAuth();
            }
        } else {
            // Modo Produção: Firebase Real
            window.onAuthStateChanged(window.firebaseAuth, (user) => {
                if (user) {
                    console.log('[Firebase] Usuário logado:', user.email);
                    this.checkXtreamAuth();
                } else {
                    console.log('[Firebase] Nenhum usuário logado.');
                    this.showView('view-login-system');
                }
            });
        }
    }

    /**
     * Verifica se a lista Xtream Codes está conectada
     */
    checkXtreamAuth() {
        if (XtreamAPI.isAuthenticated()) {
            console.log('[API] Lista Xtream Codes já conectada. Direcionando para Dashboard.');
            this.showView('view-dashboard');
        } else {
            console.log('[API] Nenhuma lista Xtream Codes conectada.');
            this.showView('view-login-xtream');
        }
    }

    /**
     * Configura todos os Listeners de Eventos do DOM
     */
    setupEventListeners() {
        // 1. Formulário de Login do Sistema (Firebase)
        const formLoginSystem = document.getElementById('form-login-system');
        if (formLoginSystem) {
            formLoginSystem.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('sys-email').value.trim();
                const pass = document.getElementById('sys-pass').value;
                const errorEl = document.getElementById('login-sys-error');
                
                errorEl.textContent = '';
                const btnSubmit = formLoginSystem.querySelector('button[type="submit"]');
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Autenticando...';

                try {
                    if (this.isFirebaseBypass) {
                        // Lógica de Bypass de Desenvolvimento
                        if (email === 'admin@broz.tv' && pass === 'admin123') {
                            localStorage.setItem('broztv_fake_login', 'true');
                            console.log('[Auth Bypass] Login de desenvolvedor aceito.');
                            this.checkXtreamAuth();
                        } else {
                            throw new Error('Credenciais de teste inválidas. Use admin@broz.tv / admin123');
                        }
                    } else {
                        // Login Real no Firebase Auth
                        await window.signInWithEmailAndPassword(window.firebaseAuth, email, pass);
                    }
                } catch (err) {
                    console.error('[Auth Error]', err);
                    errorEl.textContent = err.message || 'Falha ao autenticar.';
                } finally {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Entrar no Sistema';
                }
            });
        }

        // 2. Formulário de Login da Lista Xtream Codes
        const formLoginXtream = document.getElementById('form-login-xtream');
        if (formLoginXtream) {
            formLoginXtream.addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('xt-url').value.trim();
                const user = document.getElementById('xt-user').value.trim();
                const pass = document.getElementById('xt-pass').value;
                const errorEl = document.getElementById('login-xt-error');

                errorEl.textContent = '';
                const btnSubmit = formLoginXtream.querySelector('button[type="submit"]');
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Conectando à lista...';

                try {
                    await XtreamAPI.login(url, user, pass);
                    this.showView('view-dashboard');
                } catch (err) {
                    console.error('[Xtream Login Error]', err);
                    errorEl.textContent = err.message || 'Erro ao conectar à lista.';
                } finally {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Conectar Lista';
                }
            });
        }

        // 3. Botão Logout
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                const confirmLogout = confirm('Deseja realmente sair da sua conta?');
                if (!confirmLogout) return;

                // Limpa Xtream local e Firebase
                XtreamAPI.clearCredentials();
                localStorage.removeItem('broztv_fake_login');
                
                if (!this.isFirebaseBypass) {
                    try {
                        await window.signOut(window.firebaseAuth);
                    } catch (e) {
                        console.error('[Firebase Logout Error]', e);
                    }
                }
                
                this.showView('view-login-system');
            });
        }

        // 4. Cliques nos Cards do Dashboard
        const cardMovies = document.getElementById('card-movies');
        if (cardMovies) {
            cardMovies.addEventListener('click', () => {
                this.openCatalog('movies', 'Sala de Cinema');
            });
        }

        const cardSeries = document.getElementById('card-series');
        if (cardSeries) {
            cardSeries.addEventListener('click', () => {
                this.openCatalog('series', 'Séries VOD');
            });
        }

        const cardLive = document.getElementById('card-live');
        if (cardLive) {
            cardLive.addEventListener('click', () => {
                if (Platform.hasLiveTV) {
                    this.openCatalog('live', 'TV Ao Vivo');
                }
            });
        }

        // 5. Roteamento do Catálogo (Voltar ao Dashboard)
        const btnBackDashboard = document.getElementById('btn-back-dashboard');
        if (btnBackDashboard) {
            btnBackDashboard.addEventListener('click', () => {
                this.showView('view-dashboard');
            });
        }

        // 6. Campo de Busca no Catálogo (Filtro instantâneo)
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterAndRenderGrid(e.target.value.trim());
                }, 150); // Debounce sutil de 150ms
            });
        }
    }

    /**
     * Carrega as informações e contagens do Dashboard no background
     */
    async loadDashboardData() {
        // Exibe o email do usuário
        const userDisplay = document.getElementById('user-display-name');
        if (userDisplay) {
            if (this.isFirebaseBypass) {
                userDisplay.textContent = 'admin@broz.tv (Demo)';
            } else {
                const user = window.firebaseAuth.currentUser;
                userDisplay.textContent = user ? user.email : 'Usuário';
            }
        }

        // Atualiza os contadores em segundo plano
        this.updateCardCounters();
    }

    /**
     * Busca dados assíncronos das categorias da lista IPTV para contar o volume de itens
     */
    async updateCardCounters() {
        const countMoviesEl = document.getElementById('count-movies');
        const countSeriesEl = document.getElementById('count-series');
        const countLiveEl = document.getElementById('count-live');

        // Carrega Filmes
        try {
            if (this.mediaCache.movies.length === 0) {
                countMoviesEl.textContent = 'Carregando...';
                const movies = await XtreamAPI.getStreams('movies');
                this.mediaCache.movies = Array.isArray(movies) ? movies : [];
            }
            countMoviesEl.textContent = `${this.mediaCache.movies.length} títulos`;
        } catch (e) {
            countMoviesEl.textContent = 'Erro ao carregar';
        }

        // Carrega Séries
        try {
            if (this.mediaCache.series.length === 0) {
                countSeriesEl.textContent = 'Carregando...';
                const series = await XtreamAPI.getStreams('series');
                this.mediaCache.series = Array.isArray(series) ? series : [];
            }
            countSeriesEl.textContent = `${this.mediaCache.series.length} séries`;
        } catch (e) {
            countSeriesEl.textContent = 'Erro ao carregar';
        }

        // Carrega Canais Ao Vivo (Apenas se a plataforma suportar)
        if (Platform.hasLiveTV) {
            try {
                if (this.mediaCache.live.length === 0) {
                    countLiveEl.textContent = 'Carregando...';
                    const live = await XtreamAPI.getStreams('live');
                    this.mediaCache.live = Array.isArray(live) ? live : [];
                }
                countLiveEl.textContent = `${this.mediaCache.live.length} canais`;
            } catch (e) {
                countLiveEl.textContent = 'Erro ao carregar';
            }
        }
    }

    /**
     * Inicializa a Tela do Catálogo para o contexto selecionado
     */
    async openCatalog(context, title) {
        this.currentContext = context;
        this.selectedCategory = 'all';
        
        // Configura título
        const catalogTitle = document.getElementById('catalog-title');
        if (catalogTitle) catalogTitle.textContent = title;

        // Limpa campo de busca
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        // Aplica classe de contexto no container para o CSS aplicar os estilos corretos
        const catalogView = document.getElementById('view-catalog');
        if (catalogView) {
            catalogView.className = 'view active'; // reseta classes
            catalogView.classList.add(`context-${context}`);
        }

        // Mostra a view antes de buscar, dando feedback imediato
        this.showView('view-catalog');

        // Mostra loaders
        const categoriesList = document.getElementById('categories-list');
        const contentGrid = document.getElementById('content-grid');
        
        categoriesList.innerHTML = '<div style="padding: 1rem; color: var(--text-muted);">Carregando categorias...</div>';
        contentGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-secondary); font-size: 1.1rem;"><div class="icon-circle" style="margin: 0 auto 1.5rem auto; animation: livePulse 1.5s infinite alternate;"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>Buscando catálogo com o provedor IPTV...</div>';

        // Carrega categorias e mídias
        await Promise.all([
            this.loadCategories(),
            this.loadMediaData()
        ]);

        // Renderiza tudo
        this.renderCategories();
        this.filterAndRenderGrid();
    }

    /**
     * Carrega categorias para o contexto atual
     */
    async loadCategories() {
        if (this.categoriesCache[this.currentContext].length === 0) {
            const cats = await XtreamAPI.getCategories(this.currentContext);
            this.categoriesCache[this.currentContext] = Array.isArray(cats) ? cats : [];
        }
    }

    /**
     * Garante que os streams do contexto atual estão em memória
     */
    async loadMediaData() {
        if (this.mediaCache[this.currentContext].length === 0) {
            const streams = await XtreamAPI.getStreams(this.currentContext);
            this.mediaCache[this.currentContext] = Array.isArray(streams) ? streams : [];
        }
    }

    /**
     * Renderiza a Sidebar de Categorias
     */
    renderCategories() {
        const categoriesList = document.getElementById('categories-list');
        categoriesList.innerHTML = '';

        // Botão padrão "Todos"
        const btnAll = document.createElement('div');
        btnAll.className = `category-item ${this.selectedCategory === 'all' ? 'active' : ''}`;
        btnAll.textContent = '🌟 Todos os Conteúdos';
        btnAll.addEventListener('click', () => {
            this.selectCategory('all');
        });
        categoriesList.appendChild(btnAll);

        const list = this.categoriesCache[this.currentContext];
        list.forEach(cat => {
            const catItem = document.createElement('div');
            catItem.className = `category-item ${this.selectedCategory === cat.category_id ? 'active' : ''}`;
            catItem.textContent = cat.category_name;
            catItem.title = cat.category_name;
            catItem.addEventListener('click', () => {
                this.selectCategory(cat.category_id);
            });
            categoriesList.appendChild(catItem);
        });
    }

    /**
     * Manipula a seleção de uma categoria na barra lateral
     */
    selectCategory(categoryId) {
        this.selectedCategory = categoryId;
        
        // Atualiza estado visual ativo na sidebar
        const items = document.querySelectorAll('.category-item');
        items.forEach(item => item.classList.remove('active'));
        
        // Recalcula active
        this.renderCategories();

        // Filtra e renderiza grid
        const searchVal = document.getElementById('search-input').value.trim();
        this.filterAndRenderGrid(searchVal);
    }

    /**
     * Filtra a lista de mídias por Categoria e Busca e depois joga no Grid
     */
    filterAndRenderGrid(searchQuery = '') {
        const contentGrid = document.getElementById('content-grid');
        const streams = this.mediaCache[this.currentContext];

        // 1. Filtrar
        let filtered = streams;

        // Filtrar por categoria
        if (this.selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.category_id === this.selectedCategory);
        }

        // Filtrar por busca (texto)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => {
                const name = String(item.name || item.title || '').toLowerCase();
                return name.includes(query);
            });
        }

        // 2. Renderizar
        contentGrid.innerHTML = '';

        if (filtered.length === 0) {
            contentGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 5rem; color: var(--text-muted);">Nenhum conteúdo encontrado para o filtro aplicado.</div>';
            return;
        }

        // Classes específicas de Grid para canais
        if (this.currentContext === 'live') {
            contentGrid.className = 'grid-content grid-live';
        } else {
            contentGrid.className = 'grid-content';
        }

        // Renderiza itens em blocos (limita tamanho para performance extrema de renderização inicial no DOM)
        const limit = 200;
        const toRender = filtered.slice(0, limit);

        toRender.forEach(item => {
            const mediaCard = document.createElement('div');
            mediaCard.className = 'media-item';
            
            // Imagem do Poster (Filmes e Séries usam cover, canais usam stream_icon)
            let imgUrl = 'assets/images/placeholder-poster.png'; // Fazer fallback elegante
            if (item.stream_icon) {
                imgUrl = item.stream_icon;
            } else if (item.cover) {
                imgUrl = item.cover;
            }

            const title = item.name || item.title || 'Sem título';
            const streamId = item.stream_id || item.series_id;
            const metaInfo = this.currentContext === 'movies' ? `Ano: ${item.year || 'N/A'} | Nota: ${item.rating || 'N/A'}` : 
                             this.currentContext === 'series' ? `Lançamento: ${item.releaseDate || 'N/A'} | Nota: ${item.rating || 'N/A'}` : 
                             `Canal #${item.num || ''}`;

            mediaCard.innerHTML = `
                <div class="media-poster-wrapper">
                    <img class="media-poster" src="${imgUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/151b29/ffffff?text=BrozTV'">
                </div>
                <div class="media-info">
                    <h4 class="media-title" title="${title}">${title}</h4>
                    <span class="media-meta">${metaInfo}</span>
                </div>
            `;

            // Evento de clique para reproduzir ou ver temporadas
            mediaCard.addEventListener('click', () => {
                this.handleMediaSelect(item);
            });

            contentGrid.appendChild(mediaCard);
        });

        if (filtered.length > limit) {
            const loadMoreMsg = document.createElement('div');
            loadMoreMsg.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem;';
            loadMoreMsg.textContent = `Exibindo primeiros ${limit} de ${filtered.length} resultados. Refine sua busca para encontrar mais específicos.`;
            contentGrid.appendChild(loadMoreMsg);
        }
    }

    /**
     * Direciona a mídia selecionada para o player ou tela de temporadas
     */
    handleMediaSelect(item) {
        const title = item.name || item.title || 'Vídeo';
        const streamId = item.stream_id || item.series_id;

        if (this.currentContext === 'movies') {
            const url = XtreamAPI.buildStreamUrl(streamId, 'movie', item.container_extension || 'mp4');
            VideoPlayer.play(url, title);
        } else if (this.currentContext === 'live') {
            const url = XtreamAPI.buildStreamUrl(streamId, 'live', 'ts');
            VideoPlayer.play(url, title);
        } else if (this.currentContext === 'series') {
            this.openSeriesDetailsModal(item);
        }
    }

    /**
     * Cria e exibe um modal ultra premium com as Temporadas e Episódios de uma Série
     */
    async openSeriesDetailsModal(seriesItem) {
        const seriesId = seriesItem.series_id;
        const seriesTitle = seriesItem.name || 'Série';
        
        console.log(`[Séries] Carregando temporadas da série: ${seriesTitle} (ID: ${seriesId})`);

        // Cria modal flutuante de carregamento
        const loaderModal = document.createElement('div');
        loaderModal.id = 'series-loader-modal';
        loaderModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(10, 15, 26, 0.9); display: flex; flex-direction: column;
            justify-content: center; align-items: center; z-index: 10000; color: #fff;
            font-family: 'Inter', sans-serif;
        `;
        loaderModal.innerHTML = `
            <div style="animation: livePulse 1.5s infinite alternate; font-size: 1.2rem; font-weight: 500;">
                Obtendo episódios de "${seriesTitle}"...
            </div>
        `;
        document.body.appendChild(loaderModal);

        try {
            const seriesInfo = await XtreamAPI.getSeriesInfo(seriesId);
            loaderModal.remove();

            if (!seriesInfo || !seriesInfo.episodes) {
                throw new Error('Nenhum episódio encontrado para esta série.');
            }

            // Cria o modal de exibição de episódios real
            const modal = document.createElement('div');
            modal.id = 'series-detail-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(10, 15, 26, 0.95); backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px); z-index: 10000; display: flex;
                justify-content: center; align-items: center; padding: 2rem;
                font-family: 'Inter', sans-serif; color: #fff;
                animation: fadeInPlayer 0.3s ease;
            `;

            // Estilos CSS do Modal
            const style = document.createElement('style');
            style.id = 'series-modal-styles';
            style.textContent = `
                .series-modal-container {
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    max-width: 960px;
                    width: 100%;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: row;
                    overflow: hidden;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
                }
                .series-info-panel {
                    width: 35%;
                    padding: 2.5rem;
                    background-color: rgba(255,255,255,0.01);
                    border-right: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    overflow-y: auto;
                }
                .series-episodes-panel {
                    width: 65%;
                    padding: 2.5rem;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .series-modal-poster {
                    width: 100%;
                    max-width: 220px;
                    aspect-ratio: 2/3;
                    object-fit: cover;
                    border-radius: var(--border-radius-md);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.4);
                    margin-bottom: 1.5rem;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .series-modal-desc {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    margin-top: 1rem;
                    text-align: left;
                }
                .series-modal-title {
                    font-size: 1.6rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                .series-modal-close {
                    align-self: flex-end;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: var(--transition-fast);
                    margin-bottom: 1rem;
                }
                .series-modal-close:hover {
                    color: var(--text-primary);
                }
                .season-selector {
                    width: 100%;
                    padding: 12px;
                    background-color: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    color: #fff;
                    border-radius: var(--border-radius-sm);
                    font-size: 1rem;
                    margin-bottom: 1.5rem;
                    outline: none;
                    cursor: pointer;
                    font-weight: 600;
                }
                .episodes-list {
                    flex-grow: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    padding-right: 0.5rem;
                }
                .episode-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background-color: var(--bg-tertiary);
                    padding: 14px 20px;
                    border-radius: var(--border-radius-sm);
                    border: 1px solid transparent;
                    cursor: pointer;
                    transition: var(--transition-fast);
                }
                .episode-row:hover {
                    background-color: rgba(31, 163, 75, 0.08);
                    border-color: var(--accent-green);
                    transform: translateX(4px);
                }
                .episode-row h5 {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .btn-play-episode {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background-color: var(--accent-green);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 10px rgba(31, 163, 75, 0.4);
                }
                
                @media (max-width: 800px) {
                    .series-modal-container {
                        flex-direction: column;
                        max-height: 90vh;
                    }
                    .series-info-panel {
                        width: 100%;
                        height: 250px;
                        flex-direction: row;
                        text-align: left;
                        padding: 1.5rem;
                        border-right: none;
                        border-bottom: 1px solid var(--border-color);
                        gap: 1.5rem;
                        align-items: center;
                    }
                    .series-modal-poster {
                        max-width: 100px;
                        margin-bottom: 0;
                    }
                    .series-modal-desc {
                        display: none;
                    }
                    .series-episodes-panel {
                        width: 100%;
                        height: calc(100% - 250px);
                        padding: 1.5rem;
                    }
                }
            `;
            document.head.appendChild(style);

            // Coleta temporadas disponíveis
            const seasons = Object.keys(seriesInfo.episodes);
            let selectOptions = '';
            seasons.forEach(s => {
                selectOptions += `<option value="${s}">Temporada ${s}</option>`;
            });

            // Monta HTML inicial do modal
            const coverImg = seriesItem.cover || seriesItem.stream_icon || 'https://via.placeholder.com/300x450/151b29/ffffff?text=BrozTV';
            const plot = seriesInfo.info ? (seriesInfo.info.plot || 'Nenhuma sinopse disponível.') : 'Sem informações.';
            const release = seriesInfo.info ? (seriesInfo.info.releaseDate || 'N/A') : 'N/A';
            const rating = seriesInfo.info ? (seriesInfo.info.rating || 'N/A') : 'N/A';

            modal.innerHTML = `
                <div class="series-modal-container">
                    <div class="series-info-panel">
                        <img class="series-modal-poster" src="${coverImg}" alt="${seriesTitle}">
                        <div>
                            <h3 class="series-modal-title">${seriesTitle}</h3>
                            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">
                                Ano: ${release} | Nota: ⭐ ${rating}
                            </div>
                            <p class="series-modal-desc">${plot}</p>
                        </div>
                    </div>
                    <div class="series-episodes-panel">
                        <button class="series-modal-close" id="js-close-series-modal">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            Fechar Série
                        </button>
                        
                        <select class="season-selector" id="js-season-select">
                            ${selectOptions}
                        </select>
                        
                        <div class="episodes-list" id="js-episodes-container">
                            <!-- Episódios renderizados aqui dinamicamente -->
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden'; // trava scroll

            const seasonSelect = document.getElementById('js-season-select');
            const episodesContainer = document.getElementById('js-episodes-container');

            // Renderiza episódios da temporada
            const renderEpisodesForSeason = (seasonNum) => {
                episodesContainer.innerHTML = '';
                const eps = seriesInfo.episodes[seasonNum] || [];

                if (eps.length === 0) {
                    episodesContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum episódio cadastrado nesta temporada.</div>';
                    return;
                }

                // Xtream às vezes retorna os episódios ordenados incorretamente ou em objeto. Ordena por número.
                const sortedEps = [...eps].sort((a, b) => (parseInt(a.episode_num) || 0) - (parseInt(b.episode_num) || 0));

                sortedEps.forEach(ep => {
                    const epRow = document.createElement('div');
                    epRow.className = 'episode-row';
                    
                    const epTitle = ep.title || `Episódio ${ep.episode_num}`;
                    
                    epRow.innerHTML = `
                        <div>
                            <span style="color: var(--accent-green); font-weight: 700; margin-right: 10px; font-size: 0.9rem;">EPISÓDIO ${ep.episode_num || '?'}:</span>
                            <h5>${epTitle}</h5>
                        </div>
                        <div class="btn-play-episode">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                    `;

                    // Clique no episódio para tocar!
                    epRow.addEventListener('click', () => {
                        const streamUrl = XtreamAPI.buildStreamUrl(ep.id || ep.stream_id, 'series', ep.container_extension || 'mp4');
                        VideoPlayer.play(streamUrl, `${seriesTitle} - T${seasonNum}E${ep.episode_num} - ${epTitle}`);
                    });

                    episodesContainer.appendChild(epRow);
                });
            };

            // Escuta mudanças de temporada
            seasonSelect.addEventListener('change', (e) => {
                renderEpisodesForSeason(e.target.value);
            });

            // Renderiza a primeira temporada por padrão
            if (seasons.length > 0) {
                renderEpisodesForSeason(seasons[0]);
            }

            // Fecha o modal
            const destroySeriesModal = () => {
                modal.remove();
                style.remove();
                document.body.style.overflow = '';
            };

            document.getElementById('js-close-series-modal').addEventListener('click', destroySeriesModal);

        } catch (e) {
            loaderModal.remove();
            console.error('[Séries] Erro ao carregar detalhes:', e);
            alert(e.message || 'Falha ao buscar detalhes da série no servidor Xtream Codes.');
        }
    }
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
    window.App = new AppController();
});
