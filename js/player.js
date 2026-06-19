/**
 * player.js - Gerenciador de Reprodução de Vídeo (HLS.js e MP4)
 * Cria e controla o player de vídeo em tela cheia de forma dinâmica e elegante.
 */

class VideoPlayer {
    constructor() {
        this.hls = null;
        this.modal = null;
        this.videoElement = null;
    }

    /**
     * Inicializa e exibe o player de vídeo em tela cheia
     * @param {string} streamUrl - URL do fluxo de vídeo (HLS .m3u8, MP4, etc.)
     * @param {string} title - Título da mídia sendo reproduzida
     */
    play(streamUrl, title = 'Reproduzindo Conteúdo') {
        console.log(`[Player] Iniciando reprodução de: ${title} | URL: ${streamUrl}`);
        
        // Destrói qualquer player anterior ativo
        this.destroy();

        // 1. Criar o container do player em tela cheia no DOM
        this.modal = document.createElement('div');
        this.modal.id = 'video-player-container';
        this.modal.className = 'video-player-fullscreen';

        // 2. Estilizar dinamicamente o container (estilo premium escuro)
        const style = document.createElement('style');
        style.id = 'video-player-styles';
        style.textContent = `
            .video-player-fullscreen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: #000;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                animation: fadeInPlayer 0.3s ease;
            }
            .video-player-header {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                padding: 1.5rem 2rem;
                background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
                display: flex;
                align-items: center;
                justify-content: space-between;
                z-index: 10;
                pointer-events: none;
            }
            .video-player-title {
                color: #fff;
                font-size: 1.2rem;
                font-weight: 600;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                font-family: 'Inter', sans-serif;
            }
            .btn-close-player {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #fff;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s, transform 0.2s;
                pointer-events: auto;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
            .btn-close-player:hover {
                background-color: rgba(229, 9, 20, 0.8);
                transform: scale(1.05);
            }
            .video-element-native {
                width: 100%;
                height: 100%;
                max-width: 100%;
                max-height: 100%;
                outline: none;
                object-fit: contain;
            }
            @keyframes fadeInPlayer {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // 3. Montar a estrutura HTML
        this.modal.innerHTML = `
            <div class="video-player-header">
                <span class="video-player-title">${title}</span>
                <button class="btn-close-player" id="js-btn-close-player" title="Fechar Reprodutor">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <video class="video-element-native" id="js-video-element" controls autoplay playsinline></video>
        `;

        document.body.appendChild(this.modal);
        
        // Desativa a rolagem da página ao fundo
        document.body.style.overflow = 'hidden';

        this.videoElement = document.getElementById('js-video-element');

        // Configura o evento de fechar
        document.getElementById('js-btn-close-player').addEventListener('click', () => {
            this.destroy();
        });

        // 4. Iniciar Fluxo de Reprodução (HLS vs MP4)
        const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('action=get_live_streams');
        let hasFallbackTriggered = false;
        let mediaErrorRetries = 0;

        const triggerNativeFallback = () => {
            if (hasFallbackTriggered) return;
            hasFallbackTriggered = true;

            console.warn('[Player] Hls.js falhou. Tentando reprodução nativa (fallback)...');
            
            try {
                const titleEl = this.modal.querySelector('.video-player-title');
                if (titleEl && !titleEl.textContent.includes('(Fallback Nativo)')) {
                    titleEl.textContent += ' (Fallback Nativo)';
                }
            } catch (err) {
                console.error('[Player] Falha ao ajustar título no fallback:', err);
            }

            if (this.hls) {
                try {
                    this.hls.destroy();
                } catch (err) {
                    console.error('[Player] Erro ao destruir HLS:', err);
                }
                this.hls = null;
            }

            this.videoElement.src = streamUrl;
            this.videoElement.load();
            this.videoElement.play().catch(err => {
                console.error('[Player] Falha na reprodução nativa pós-fallback:', err);
                this.destroy();
                alert('Erro de reprodução: O formato de vídeo ou codec não é suportado pelo seu navegador/dispositivo.');
            });
        };

        if (isHls) {
            if (Hls.isSupported()) {
                console.log('[Player] Usando Hls.js para reproduzir HLS.');
                this.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    // Otimizações de Buffer para evitar travamentos e buffering (Reclamação 1)
                    maxBufferLength: 60,             // Tamanho máximo do buffer à frente (segundos)
                    maxMaxBufferLength: 120,         // Tamanho máximo permitido de buffer antes de suspender carregamento
                    maxBufferSize: 80 * 1024 * 1024, // Tamanho limite do buffer em bytes (~80 MB)
                    maxBufferHole: 0.5,              // Tolerância de lacunas no buffer para evitar travamento
                    nudgeMaxRetry: 5,                // Tenta empurrar o player se parar em uma lacuna
                    nudgeOffset: 0.1,                // Offset do empurrão
                    liveSyncDurationCount: 5,        // Mantém 5 segmentos carregados para Live
                    liveMaxLatencyDurationCount: 10  // Latência máxima tolerada no ao vivo
                });
                this.hls.loadSource(streamUrl);
                this.hls.attachMedia(this.videoElement);
                
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('[Player] Erro de rede fatal. Tentando recuperar...', data);
                                this.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                mediaErrorRetries++;
                                if (mediaErrorRetries <= 3) {
                                    console.error(`[Player] Erro de mídia fatal (Tentativa ${mediaErrorRetries}/3). Tentando recuperar...`, data);
                                    this.hls.recoverMediaError();
                                } else {
                                    console.error('[Player] Limite de tentativas de recuperação atingido. Iniciando fallback...');
                                    triggerNativeFallback();
                                }
                                break;
                            default:
                                console.error('[Player] Erro fatal irrecuperável do Hls.js. Iniciando fallback...', data);
                                triggerNativeFallback();
                                break;
                        }
                    }
                });
            } 
            // Suporte nativo para HLS (Safari/iOS)
            else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                console.log('[Player] Usando suporte nativo para HLS.');
                this.videoElement.src = streamUrl;
            } 
            else {
                console.error('[Player] Este navegador não suporta reprodução HLS.');
                alert('Seu navegador não suporta reprodução de HLS. Para a melhor experiência, use o aplicativo nativo para Windows ou Android.');
                this.destroy();
            }
        } else {
            // Reprodução de MP4 normal (VODs do Xtream)
            console.log('[Player] Usando player de vídeo nativo.');
            this.videoElement.src = streamUrl;
        }

        // Trata erro na tag de vídeo
        this.videoElement.addEventListener('error', (e) => {
            console.error('[Player] Erro interno do elemento HTML5 Video:', e);
            if (this.hls && !hasFallbackTriggered) {
                triggerNativeFallback();
            } else if (!hasFallbackTriggered) {
                this.destroy();
                alert('Erro de reprodução: Não foi possível carregar o vídeo. Verifique se o canal/vídeo está online ou se é compatível.');
            }
        });
    }

    /**
     * Destrói a instância do player e remove os elementos do DOM
     */
    destroy() {
        console.log('[Player] Destruindo player de vídeo...');
        
        // Para o Hls.js se estiver rodando
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Para a tag video nativa
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
            this.videoElement.load();
            this.videoElement = null;
        }

        // Remove o modal do DOM
        const modal = document.getElementById('video-player-container');
        if (modal) {
            modal.remove();
        }

        // Remove a folha de estilos do player
        const style = document.getElementById('video-player-styles');
        if (style) {
            style.remove();
        }

        // Reabilita a rolagem do corpo da página
        document.body.style.overflow = '';
    }
}

// Expõe globalmente
window.VideoPlayer = new VideoPlayer();
export default window.VideoPlayer;
