/**
 * tv-block.js — Bloqueio de TV Ao Vivo na versão Web e modal explicativo
 */
import { DOWNLOAD_LINKS } from './config.js';

export function interceptTvLiveOnWeb() {
    const buttons = document.querySelectorAll('button, a, .hub-btn');

    buttons.forEach(btn => {
        // ── Ignora botões dentro dos painéis customizados do BrozTV ──────────
        if (
            btn.closest('#broztv-admin-dashboard-web') ||
            btn.closest('#broztv-client-dashboard-web') ||
            btn.closest('#broztv-tv-blocked-modal') ||
            btn.closest('#custom-register-form') ||
            btn.closest('#broztv-downloads-landing')
        ) return;

        const text = String(btn.textContent || '').toLowerCase();

        const isTvButton = text.includes('canais') ||
                           text.includes('tv ao vivo') ||
                           (text.includes('tv') &&
                            !text.includes('smart tv') &&
                            !text.includes('broztv') &&
                            !text.includes('broz tv') &&
                            !text.includes('dispositivo') &&
                            !text.includes('assinante') &&
                            !text.includes('área'));

        if (isTvButton && btn.dataset.intercepted !== 'true') {
            btn.dataset.intercepted = 'true';
            console.log('[CustomMods] Interceptador de TV Ao Vivo configurado no botão:', btn.textContent.trim());
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showTvBlockedModal();
            }, true);
        }
    });
}

export function showTvBlockedModal() {
    if (document.getElementById('broztv-tv-blocked-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'broztv-tv-blocked-modal';
    modal.className = 'fixed inset-0 bg-black/85 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 animate-fade-in';

    modal.innerHTML = `
        <div class="bg-[#151b29] border border-red-500/30 rounded-[1.5rem] md:rounded-[2rem] max-w-lg w-full p-6 md:p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
            <button id="js-close-tv-modal" class="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" class="animate-pulse"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
            </div>
            <h3 class="text-lg md:text-xl font-extrabold text-white mb-3 tracking-wide">
                📺 Canais Ao Vivo Bloqueados no Browser
            </h3>
            <p class="text-xs md:text-sm text-gray-300 mb-4 leading-relaxed">
                Devido a políticas de segurança rígidas de CORS e tráfego misto dos navegadores modernos, transmissões estáveis de TV Ao Vivo não funcionam na versão Web comum.
            </p>
            <p class="text-xs md:text-sm text-orange-400 font-bold mb-6 leading-relaxed neon-text-orange">
                Para acessar a TV Ao Vivo, junto com nossa biblioteca completa de Filmes e Séries, instale nosso sistema:
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="${DOWNLOAD_LINKS.windows}" class="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl neon-btn-orange text-white text-xs font-bold transition-all text-decoration-none" download>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
                    Baixar para Windows (.EXE)
                </a>
                <a href="${DOWNLOAD_LINKS.android}" class="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl neon-btn-green text-white text-xs font-bold transition-all text-decoration-none" download>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"/><path d="M12 6v12M6 12h12"/></svg>
                    Baixar Android (.APK)
                </a>
            </div>
            <button id="js-continue-web" class="mt-6 text-xs text-gray-400 hover:text-white underline cursor-pointer bg-transparent border-none font-medium transition-colors">
                Continuar no Navegador (Apenas Filmes e Séries)
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = originalOverflow;
    };

    document.getElementById('js-close-tv-modal').addEventListener('click', closeModal);
    document.getElementById('js-continue-web').addEventListener('click', closeModal);
}
