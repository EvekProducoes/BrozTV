/**
 * cast.js — Funcionalidades de Transmissão (Cast) para Smart TV via Electron
 */

export function createToast(title, message) {
    const toastId = 'broztv-custom-toast';
    let toast = document.getElementById(toastId);
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'fixed bottom-20 right-6 bg-[#1b263b] border border-blue-500/40 text-white px-5 py-4 rounded-xl shadow-2xl z-[99999] max-w-sm animate-fade-in flex flex-col gap-1';
    toast.innerHTML = `
        <span class="text-xs font-black uppercase text-blue-400 select-none">📺 ${title}</span>
        <span class="text-xs text-gray-300 leading-normal font-medium">${message}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }
    }, 7000);
}

export function showCastOptionsModal() {
    if (document.getElementById('broztv-cast-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'broztv-cast-modal';
    modal.className = 'fixed inset-0 bg-black/85 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 animate-fade-in';

    const streamUrl = window.currentStreamUrl || (document.querySelector('video') ? document.querySelector('video').src : '');
    const isBlob = streamUrl.startsWith('blob:');

    modal.innerHTML = `
        <div class="bg-[#151b29] border border-blue-500/30 rounded-[1.5rem] p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative max-w-md w-full">
            <button id="js-close-cast-modal" class="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6M2 20h.01"></path></svg>
            </div>
            <h3 class="text-base font-extrabold text-white mb-2 tracking-wide">
                📺 Opções de Transmissão para a TV
            </h3>
            <p class="text-xs text-gray-400 mb-6 leading-relaxed">
                Escolha a melhor forma de espelhar o conteúdo nativo na sua Smart TV, Xbox ou Chromecast:
            </p>
            <div class="flex flex-col gap-3.5">
                <button id="js-cast-screen" class="flex items-center justify-start gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-blue-600/15 hover:border-blue-500/50 cursor-pointer text-left transition-all group border-none w-full">
                    <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    </div>
                    <div class="flex-1">
                        <span class="block text-xs font-bold text-white">Transmitir Tela do Aplicativo</span>
                        <span class="block text-[10px] text-gray-500 mt-0.5">Abre a barra nativa do Windows (Miracast/Chromecast)</span>
                    </div>
                </button>
                <button id="js-cast-vlc" class="flex items-center justify-start gap-4 p-4 rounded-xl border border-white/5 bg-white/5 ${isBlob ? 'opacity-40 cursor-not-allowed' : 'hover:bg-emerald-600/15 hover:border-emerald-500/50 cursor-pointer'} text-left transition-all group border-none w-full" ${isBlob ? 'disabled title="Não suportado em transmissões criptografadas"' : ''}>
                    <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                    <div class="flex-1">
                        <span class="block text-xs font-bold text-white">Assistir no VLC Player (Recomendado)</span>
                        <span class="block text-[10px] text-gray-500 mt-0.5">${isBlob ? 'Indisponível para esta stream' : 'Transmite a stream via VLC → Renderizador → Sua TV'}</span>
                    </div>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = originalOverflow;
    };

    document.getElementById('js-close-cast-modal').addEventListener('click', closeModal);

    document.getElementById('js-cast-screen').addEventListener('click', () => {
        closeModal();
        window.electronAPI.openCastMenu();
        createToast('Transmitir tela', 'Selecione a sua Smart TV ou dispositivo no painel do Windows que abriu no canto direito.');
    });

    if (!isBlob && streamUrl) {
        document.getElementById('js-cast-vlc').addEventListener('click', () => {
            closeModal();
            window.electronAPI.openInVlc(streamUrl);
            createToast('Abrir no VLC', 'O VLC abrirá em instantes. Para transmitir na TV: Vá em "Reproduzir" → "Renderizador" e escolha sua TV.');
        });
    }
}

export function interceptCastButtons(createToastFn) {
    const sidebarCastBtn = document.querySelector('button[title="Transmitir tela"], button[title="Espelhar Tela"], button[aria-label="Transmitir"]');
    if (sidebarCastBtn && sidebarCastBtn.dataset.intercepted !== 'true') {
        sidebarCastBtn.dataset.intercepted = 'true';
        sidebarCastBtn.addEventListener('click', (e) => {
            if (window.electronAPI) {
                e.preventDefault();
                e.stopPropagation();
                window.electronAPI.openCastMenu();
                createToast('Transmitir tela', 'Iniciando transmissão de tela... Escolha a sua Smart TV ou Chromecast na barra lateral do Windows que abriu à direita.');
            }
        }, true);
    }

    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        const text = String(btn.textContent || '').trim();
        if ((text === 'Transmitir' || text === 'Espelhar' || text === 'Transmitir tela' || btn.title === 'Transmitir' || btn.title === 'Transmitir tela') && btn.dataset.intercepted !== 'true') {
            btn.dataset.intercepted = 'true';
            btn.addEventListener('click', (e) => {
                if (window.electronAPI) {
                    e.preventDefault();
                    e.stopPropagation();
                    showCastOptionsModal();
                }
            }, true);
        }
    });
}
