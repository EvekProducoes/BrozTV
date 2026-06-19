/**
 * player.js — Módulo do Video Player Customizado (Progresso de Vídeo e Internet Lenta)
 */

// --- Monkey Patch Global no Hls.js para Otimização de Buffering ---
if (typeof window !== 'undefined') {
    const patchHls = () => {
        if (window.Hls && !window.Hls._isPatched) {
            const OriginalHls = window.Hls;
            
            class PatchedHls extends OriginalHls {
                constructor(config) {
                    const optimizedConfig = Object.assign({}, config, {
                        maxBufferLength: 60,             // Aumenta o tamanho máximo do buffer à frente (segundos)
                        maxMaxBufferLength: 120,         // Aumenta tamanho máximo absoluto de buffer
                        maxBufferSize: 80 * 1024 * 1024, // Limite de buffer de ~80 MB em bytes
                        maxBufferHole: 0.5,              // Tolerância de lacunas menor
                        nudgeMaxRetry: 5,                // Empurra o player se travar
                        nudgeOffset: 0.1,                // Tamanho do empurrão
                        liveSyncDurationCount: 5,        // Segmentos carregados para Live
                        liveMaxLatencyDurationCount: 10  // Latência máxima de sincronização
                    });
                    
                    console.log('[CustomMods] Inicializando Hls.js otimizado:', optimizedConfig);
                    super(optimizedConfig);
                    
                    // Tratamento de erros automáticos de recuperação no nível da instância do Hls
                    let mediaErrorRetries = 0;
                    this.on(OriginalHls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            switch (data.type) {
                                case OriginalHls.ErrorTypes.NETWORK_ERROR:
                                    console.warn('[CustomMods-Hls] Erro de rede fatal detectado, tentando recarregar...', data);
                                    this.startLoad();
                                    break;
                                case OriginalHls.ErrorTypes.MEDIA_ERROR:
                                    mediaErrorRetries++;
                                    if (mediaErrorRetries <= 3) {
                                        console.warn(`[CustomMods-Hls] Erro de mídia fatal (Tentativa ${mediaErrorRetries}/3). Recuperando...`, data);
                                        this.recoverMediaError();
                                    } else {
                                        console.error('[CustomMods-Hls] Limite de recuperação de mídia atingido.');
                                    }
                                    break;
                            }
                        }
                    });
                }
            }
            
            // Copia propriedades estáticas essenciais (Events, ErrorTypes, etc.)
            Object.defineProperty(PatchedHls, '_isPatched', { value: true, writable: false });
            Object.assign(PatchedHls, OriginalHls);
            
            window.Hls = PatchedHls;
            console.log('[CustomMods] Monkey patch global no Hls.js configurado!');
        }
    };

    // Tenta executar imediatamente
    patchHls();
    // Registra listeners de segurança para carregar se for assíncrono
    window.addEventListener('DOMContentLoaded', patchHls);
    const hlsInterval = setInterval(() => {
        if (window.Hls) {
            patchHls();
            clearInterval(hlsInterval);
        }
    }, 500);
}

// Limpa URLs de streaming removendo tokens de query parameters para identificação única do vídeo
function cleanVideoUrl(url) {
    if (!url) return '';
    try {
        const u = new URL(url);
        // Exclui query params temporários que mudam a cada requisição (evita duplicar chaves no localStorage)
        return u.origin + u.pathname;
    } catch {
        return url;
    }
}

// Converte segundos em formato de tempo HH:MM:SS ou MM:SS
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds - (hrs * 3600)) / 60);
    const secs = Math.floor(seconds - (hrs * 3600) - (mins * 60));
    
    const formattedMins = mins < 10 ? '0' + mins : mins;
    const formattedSecs = secs < 10 ? '0' + secs : secs;
    
    if (hrs > 0) {
        const formattedHrs = hrs < 10 ? '0' + hrs : hrs;
        return `${formattedHrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
}

export function interceptVideoPlayer() {
    const videos = document.querySelectorAll('video');
    
    videos.forEach(video => {
        if (video.dataset.playerIntercepted === 'true') return;
        video.dataset.playerIntercepted = 'true';
        
        console.log('[Player Interceptor] Novo elemento <video> detectado! Injetando melhorias...');

        // Injeta listener de erros no vídeo para fallback automático
        video.addEventListener('error', (e) => {
            console.error('[Player Interceptor] Erro detectado no elemento <video>:', e);
            const currentSrc = video.src || video.currentSrc;
            
            // Evita loops infinitos de erro caso o próprio fallback falhe
            if (video.dataset.fallbackTriggered === 'true') return;
            
            if (currentSrc && (currentSrc.includes('.m3u8') || currentSrc.includes('action=get_live_streams'))) {
                console.warn('[Player Interceptor] Falha de codec/reprodução HLS. Tentando reprodução nativa (fallback)...');
                video.dataset.fallbackTriggered = 'true';
                
                try {
                    video.pause();
                    video.src = currentSrc;
                    video.load();
                    video.play().catch(err => {
                        console.error('[Player Interceptor] Falha na reprodução nativa pós-fallback:', err);
                    });
                } catch (err) {
                    console.error('[Player Interceptor] Erro ao tentar fallback nativo:', err);
                }
            }
        });
        
        const playerContainer = video.parentElement;
        if (!playerContainer) return;
        
        // Garante que o contêiner do player tem position relative para renderizar os banners flutuantes
        const computedStyle = window.getComputedStyle(playerContainer);
        if (computedStyle.position === 'static') {
            playerContainer.style.position = 'relative';
        }
        
        let lastSavedTime = 0;
        
        // 1. Escuta mudanças no tempo de reprodução para salvar o progresso (apenas para VOD/filmes)
        video.addEventListener('timeupdate', () => {
            const duration = video.duration;
            const current = video.currentTime;
            
            // Salva apenas se for um vídeo de duração finita (filmes/séries; não canais ao vivo)
            if (duration && duration !== Infinity && current > 5) {
                // A cada 4 segundos salva para não sobrecarregar o localStorage
                if (Math.abs(current - lastSavedTime) > 4) {
                    const cleanUrl = cleanVideoUrl(video.src || video.currentSrc);
                    if (cleanUrl) {
                        // Se estiver muito próximo do fim (menos de 25 segundos), deleta o progresso (evita começar nos créditos)
                        if (current > duration - 25) {
                            localStorage.removeItem(`broztv_progress_${cleanUrl}`);
                        } else {
                            localStorage.setItem(`broztv_progress_${cleanUrl}`, current);
                        }
                        lastSavedTime = current;
                    }
                }
            }
        });
        
        // 2. Verifica e sugere continuar assistindo de onde parou
        const checkAndRestoreProgress = () => {
            const duration = video.duration;
            if (!duration || duration === Infinity) return;
            
            const cleanUrl = cleanVideoUrl(video.src || video.currentSrc);
            if (!cleanUrl) return;
            
            const savedProgress = parseFloat(localStorage.getItem(`broztv_progress_${cleanUrl}`));
            
            // Sugere continuar apenas se tiver assistido a mais de 5 segundos e não estiver no final
            if (savedProgress && savedProgress > 5 && savedProgress < duration - 25) {
                // Remove banner antigo se houver
                const oldBanner = playerContainer.querySelector('#continue-watching-banner');
                if (oldBanner) oldBanner.remove();
                
                const banner = document.createElement('div');
                banner.id = 'continue-watching-banner';
                banner.className = 'absolute top-4 left-4 bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-2 z-[999] animate-fade-in max-w-xs text-left select-none';
                
                banner.innerHTML = `
                    <span class="text-xs font-black text-white flex items-center gap-1.5">⏱️ Continuar de onde parou?</span>
                    <span class="text-[10px] text-gray-400">Você já assistiu a este vídeo anteriormente. Deseja retomar a partir de <strong class="text-blue-400 font-bold">${formatTime(savedProgress)}</strong>?</span>
                    <div class="flex gap-2 mt-1">
                        <button id="js-btn-continue-yes" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black border-none cursor-pointer transition-colors">Sim, continuar</button>
                        <button id="js-btn-continue-no" class="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold border-none cursor-pointer transition-colors">Recomeçar</button>
                    </div>
                `;
                
                playerContainer.appendChild(banner);
                
                // Eventos dos botões do banner
                banner.querySelector('#js-btn-continue-yes').addEventListener('click', () => {
                    video.currentTime = savedProgress;
                    banner.remove();
                });
                
                banner.querySelector('#js-btn-continue-no').addEventListener('click', () => {
                    localStorage.removeItem(`broztv_progress_${cleanUrl}`);
                    banner.remove();
                });
                
                // Fecha automaticamente após 8 segundos
                setTimeout(() => {
                    if (playerContainer.contains(banner)) {
                        banner.remove();
                    }
                }, 8000);
            }
        };
        
        video.addEventListener('loadedmetadata', checkAndRestoreProgress);
        // Fallback caso loadedmetadata já tenha disparado
        if (video.readyState >= 1) {
            checkAndRestoreProgress();
        }
        
        // 3. Injeta a funcionalidade "Internet Lenta"
        const injectSlowInternetButton = () => {
            if (playerContainer.querySelector('#js-btn-slow-internet')) return;
            
            const btn = document.createElement('button');
            btn.id = 'js-btn-slow-internet';
            btn.className = 'absolute top-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/5 hover:border-white/20 text-white rounded-xl px-3 py-2 text-[10px] font-black flex items-center gap-1.5 z-[99] transition-all cursor-pointer shadow-lg select-none';
            btn.innerHTML = `🐌 Internet Lenta`;
            
            playerContainer.appendChild(btn);
            
            btn.addEventListener('click', () => {
                // Remove modal anterior se houver
                const oldModal = playerContainer.querySelector('#slow-internet-modal');
                if (oldModal) oldModal.remove();
                
                // Pausa a reprodução
                video.pause();
                
                const modal = document.createElement('div');
                modal.id = 'slow-internet-modal';
                modal.className = 'absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[999] p-4 text-center rounded-[inherit] select-none';
                
                modal.innerHTML = `
                    <div class="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
                    <h4 class="text-sm font-extrabold text-white flex items-center gap-1.5 justify-center">🐌 Modo Internet Lenta Ativo</h4>
                    <p class="text-xs text-gray-300 mt-2 max-w-xs leading-relaxed">
                        Pausando a reprodução por <strong class="text-orange-400 font-black text-sm" id="slow-timer">15</strong> segundos para carregar mais conteúdo no buffer do seu navegador e evitar travamentos.
                    </p>
                    <button id="js-cancel-slow" class="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold border-none cursor-pointer transition-all">
                        Ignorar e Dar Play
                    </button>
                `;
                
                playerContainer.appendChild(modal);
                
                let timeLeft = 15;
                const timerEl = modal.querySelector('#slow-timer');
                
                const countdown = setInterval(() => {
                    timeLeft--;
                    if (timerEl) timerEl.textContent = timeLeft;
                    
                    if (timeLeft <= 0) {
                        clearInterval(countdown);
                        if (playerContainer.contains(modal)) {
                            modal.remove();
                            video.play().catch(e => console.warn('Falha ao dar play automático:', e));
                        }
                    }
                }, 1000);
                
                // Botão de cancelar / pular espera
                modal.querySelector('#js-cancel-slow').addEventListener('click', () => {
                    clearInterval(countdown);
                    modal.remove();
                    video.play().catch(e => console.warn('Falha ao dar play:', e));
                });
            });
        };
        
        injectSlowInternetButton();

        // 4. Injeta Bloqueio de Conteúdo Adulto com PIN
        const checkAdultLock = () => {
            const currentSrc = video.src || video.currentSrc || '';
            const isAdult = isAdultUrl(currentSrc);
            
            if (isAdult) {
                const sessionUser = JSON.parse(localStorage.getItem('broz_session_user') || '{}');
                
                // 1. Verifica se conteúdo adulto é permitido na conta
                if (sessionUser.allowAdultContent === false) {
                    video.pause();
                    showAdultBlockedBanner(playerContainer, 'Conteúdo Bloqueado por Controle de Pais');
                    return;
                }
                
                // 2. Se for permitido, verifica se a sessão já está desbloqueada
                if (!window.adultUnlocked) {
                    video.pause();
                    showAdultPinModal(video, playerContainer, sessionUser.pin || '0000');
                }
            }
        };

        // Escuta mudanças de fonte e reprodução
        video.addEventListener('play', checkAdultLock);
        video.addEventListener('loadstart', checkAdultLock);
        
        // Executa imediatamente para canais já carregados
        checkAdultLock();
    });
}

function isAdultUrl(url) {
    if (!url) return false;
    const u = String(url).toLowerCase();
    
    // Lista de palavras-chave comuns de canais/vídeos adultos em IPTV
    const adultKeywords = [
        'adult', 'xxx', 'porn', 'manhunting', 'venus', 'playboy', 
        'sextreme', 'hustler', 'penthouse', 'formentera', 'redlight', 
        'sexy', 'erotico', 'erotica', 'privado', 'adulto', '18+', 'plus18'
    ];
    
    return adultKeywords.some(keyword => u.includes(keyword));
}

function showAdultBlockedBanner(container, message) {
    const oldBanner = container.querySelector('#adult-blocked-banner');
    if (oldBanner) oldBanner.remove();

    const banner = document.createElement('div');
    banner.id = 'adult-blocked-banner';
    banner.className = 'absolute inset-0 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center z-[9999] p-4 text-center rounded-[inherit] select-none';
    banner.innerHTML = `
        <div class="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500 text-3xl mb-4">
            🔒
        </div>
        <h4 class="text-base font-extrabold text-white">Controle de Pais</h4>
        <p class="text-xs text-gray-300 mt-2 max-w-xs leading-relaxed">
            ${message}
        </p>
    `;
    container.appendChild(banner);
}

function showAdultPinModal(video, container, correctPin) {
    if (container.querySelector('#adult-pin-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'adult-pin-modal';
    modal.className = 'absolute inset-0 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center z-[9999] p-4 text-center rounded-[inherit] select-none';

    modal.innerHTML = `
        <div class="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl mb-4">
            🔑
        </div>
        <h4 class="text-sm font-extrabold text-white">Conteúdo Adulto Protegido</h4>
        <p class="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
            Este canal possui classificação indicativa +18. Insira o seu PIN de 4 dígitos para desbloquear.
        </p>
        
        <!-- Campo PIN estilizado -->
        <div class="flex gap-3 justify-center my-6" id="pin-inputs-container">
            <input type="password" maxlength="1" class="pin-digit w-12 h-12 text-center text-lg font-bold bg-[#0b1220] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.35)]" autocomplete="new-password">
            <input type="password" maxlength="1" class="pin-digit w-12 h-12 text-center text-lg font-bold bg-[#0b1220] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.35)]" autocomplete="new-password">
            <input type="password" maxlength="1" class="pin-digit w-12 h-12 text-center text-lg font-bold bg-[#0b1220] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.35)]" autocomplete="new-password">
            <input type="password" maxlength="1" class="pin-digit w-12 h-12 text-center text-lg font-bold bg-[#0b1220] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.35)]" autocomplete="new-password">
        </div>
        
        <div id="pin-error-msg" class="text-[10px] font-bold text-red-400 mb-4 h-4"></div>

        <div class="flex gap-3">
            <button id="js-btn-confirm-pin" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black border-none cursor-pointer transition-colors shadow-[0_4px_12px_rgba(59,130,246,0.25)]">Confirmar PIN</button>
            <button id="js-btn-cancel-pin" class="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold border-none cursor-pointer transition-colors">Voltar / Cancelar</button>
        </div>
    `;

    container.appendChild(modal);

    const pinInputs = modal.querySelectorAll('.pin-digit');
    const errorMsg = modal.querySelector('#pin-error-msg');

    pinInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            input.value = input.value.replace(/\D/g, '');
            if (input.value && index < 3) {
                pinInputs[index + 1].focus();
            }
            if (Array.from(pinInputs).every(inp => inp.value !== '')) {
                validatePin();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    setTimeout(() => pinInputs[0].focus(), 100);

    const validatePin = () => {
        const pinString = Array.from(pinInputs).map(inp => inp.value).join('');
        if (pinString === correctPin) {
            window.adultUnlocked = true;
            modal.remove();
            video.play().catch(e => console.warn('Falha ao retomar vídeo:', e));
        } else {
            errorMsg.textContent = '❌ PIN incorreto. Tente novamente.';
            pinInputs.forEach(inp => inp.value = '');
            pinInputs[0].focus();
            setTimeout(() => {
                if (errorMsg) errorMsg.textContent = '';
            }, 3000);
        }
    };

    modal.querySelector('#js-btn-confirm-pin').addEventListener('click', validatePin);

    modal.querySelector('#js-btn-cancel-pin').addEventListener('click', () => {
        modal.remove();
        video.pause();
        try {
            video.src = '';
            video.load();
        } catch {}
        const backBtn = document.querySelector('.player-back-btn') || document.querySelector('[class*="back"]');
        if (backBtn) backBtn.click();
    });
}
