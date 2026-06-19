/**
 * api.js - Integração com a Xtream Codes API e Proxy CORS para Web
 * Gerencia a autenticação com o provedor IPTV e o carregamento dos conteúdos.
 */

import Platform from './platform.js';

class XtreamCodesAPI {
    constructor() {
        this.proxyUrl = 'http://localhost:4000';
        this.credentials = null;
        this.loadCredentials();
    }

    /**
     * Carrega as credenciais salvas no localStorage
     */
    loadCredentials() {
        const saved = localStorage.getItem('broztv_xtream_credentials');
        if (saved) {
            try {
                this.credentials = JSON.parse(saved);
            } catch (e) {
                console.error('[API] Erro ao carregar credenciais:', e);
                this.credentials = null;
            }
        }
    }

    /**
     * Salva as credenciais no localStorage e em memória
     */
    saveCredentials(serverUrl, username, password) {
        // Normaliza a URL do servidor (remove barra no final)
        const cleanUrl = serverUrl.replace(/\/$/, '');
        this.credentials = { serverUrl: cleanUrl, username, password };
        localStorage.setItem('broztv_xtream_credentials', JSON.stringify(this.credentials));
    }

    /**
     * Remove as credenciais salvas (logout)
     */
    clearCredentials() {
        this.credentials = null;
        localStorage.removeItem('broztv_xtream_credentials');
    }

    /**
     * Verifica se o usuário já tem credenciais salvas
     */
    isAuthenticated() {
        return this.credentials !== null && 
               this.credentials.serverUrl && 
               this.credentials.username && 
               this.credentials.password;
    }

    /**
     * Constrói a URL final, decidindo se passa pelo proxy CORS ou vai direto
     */
    buildUrl(action = '', extraParams = {}) {
        if (!this.credentials) {
            throw new Error('Nenhuma lista Xtream Codes está conectada.');
        }

        const { serverUrl, username, password } = this.credentials;
        
        // Monta os parâmetros padrões do Xtream Codes
        const urlParams = new URLSearchParams({
            username: username,
            password: password,
            ...extraParams
        });

        if (action) {
            urlParams.append('action', action);
        }

        // URL direta para o servidor de IPTV
        const targetUrl = `${serverUrl}/player_api.php?${urlParams.toString()}`;

        // Se estiver rodando na Web comum, passa pelo Proxy CORS
        if (Platform.useProxy) {
            return `${this.proxyUrl}/proxy?url=${encodeURIComponent(targetUrl)}`;
        }

        return targetUrl;
    }

    /**
     * Constrói a URL direta de reprodução de vídeo para VOD ou TV Ao Vivo
     */
    buildStreamUrl(streamId, type = 'movie', containerExtension = 'mp4') {
        if (!this.credentials) return '';
        const { serverUrl, username, password } = this.credentials;
        
        let targetUrl = '';
        if (type === 'movie') {
            const ext = containerExtension || 'mp4';
            targetUrl = `${serverUrl}/movie/${username}/${password}/${streamId}.${ext}`;
        } else if (type === 'series') {
            const ext = containerExtension || 'mp4';
            targetUrl = `${serverUrl}/series/${username}/${password}/${streamId}.${ext}`;
        } else if (type === 'live') {
            // Live streams usam HLS (.m3u8) ou MPEG-TS (.ts)
            const ext = containerExtension || 'ts';
            targetUrl = `${serverUrl}/live/${username}/${password}/${streamId}.${ext}`;
        }

        // Na web, mesmo o stream de vídeo precisa passar pelo proxy se a URL de origem for HTTP/CORS
        if (Platform.useProxy) {
            return `${this.proxyUrl}/proxy?url=${encodeURIComponent(targetUrl)}`;
        }

        return targetUrl;
    }

    /**
     * Realiza a autenticação da lista Xtream Codes
     */
    async login(serverUrl, username, password) {
        const cleanUrl = serverUrl.replace(/\/$/, '');
        
        const params = new URLSearchParams({
            username: username,
            password: password
        });

        const targetUrl = `${cleanUrl}/player_api.php?${params.toString()}`;
        
        let requestUrl = targetUrl;
        if (Platform.useProxy) {
            requestUrl = `${this.proxyUrl}/proxy?url=${encodeURIComponent(targetUrl)}`;
        }

        console.log('[API] Tentando login em:', cleanUrl, Platform.useProxy ? '(via proxy)' : '(direto)');

        try {
            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Servidor respondeu com código ${response.status}`);
            }

            const data = await response.json();

            // Valida a resposta do Xtream Codes
            if (data.user_info && data.user_info.auth === 1) {
                if (data.user_info.status !== 'Active') {
                    throw new Error('Esta conta IPTV está inativa ou expirada.');
                }
                
                // Salva localmente
                this.saveCredentials(cleanUrl, username, password);
                return data;
            } else {
                throw new Error('Usuário ou senha da lista inválidos.');
            }
        } catch (error) {
            console.error('[API] Erro no login Xtream Codes:', error);
            throw new Error(error.message || 'Falha ao conectar com o servidor. Verifique a URL e sua internet.');
        }
    }

    /**
     * Busca categorias da lista (filmes, séries ou canais ao vivo)
     */
    async getCategories(type) {
        let action = '';
        if (type === 'movies') action = 'get_vod_categories';
        else if (type === 'series') action = 'get_series_categories';
        else if (type === 'live') action = 'get_live_categories';
        else throw new Error('Tipo de categoria inválido');

        const url = this.buildUrl(action);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao buscar categorias.');
            return await response.json();
        } catch (e) {
            console.error(`[API] Erro ao buscar categorias de ${type}:`, e);
            return [];
        }
    }

    /**
     * Busca todos os streams/mídias de um tipo específico
     */
    async getStreams(type, categoryId = '') {
        let action = '';
        const params = {};

        if (type === 'movies') action = 'get_vod_streams';
        else if (type === 'series') action = 'get_series';
        else if (type === 'live') action = 'get_live_streams';
        else throw new Error('Tipo de conteúdo inválido');

        if (categoryId) {
            params.category_id = categoryId;
        }

        const url = this.buildUrl(action, params);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao buscar streams.');
            return await response.json();
        } catch (e) {
            console.error(`[API] Erro ao obter streams de ${type}:`, e);
            return [];
        }
    }

    /**
     * Busca informações completas de uma série específica (Temporadas e Episódios)
     */
    async getSeriesInfo(seriesId) {
        const url = this.buildUrl('get_series_info', { series_id: seriesId });

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao buscar detalhes da série.');
            return await response.json();
        } catch (e) {
            console.error(`[API] Erro ao obter informações da série ${seriesId}:`, e);
            return null;
        }
    }
}

// Expõe globalmente
window.XtreamAPI = new XtreamCodesAPI();
export default window.XtreamAPI;
