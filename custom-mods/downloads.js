/**
 * downloads.js — Injeção de botões de download na Landing e no HUB
 */
import { DOWNLOAD_LINKS } from './config.js';

export function injectHubDownloads() {
    if (document.getElementById('broztv-downloads-hub')) return;

    const hubButtons = document.querySelectorAll('.hub-btn');
    if (hubButtons.length === 0) return;

    console.log('[CustomMods] HUB de Controle detectado. Injetando opções multiplataforma...');

    const hubContainer = hubButtons[0].parentElement;
    if (!hubContainer) return;

    const downloadSection = document.createElement('div');
    downloadSection.id = 'broztv-downloads-hub';
    downloadSection.className = 'w-full mt-8 md:mt-12 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-black/45 backdrop-blur-xl border border-white/5 shadow-2xl neon-border-blue col-span-full animate-fade-in text-center';

    downloadSection.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <h3 class="text-xs md:text-sm font-black uppercase tracking-widest text-orange-500 mb-3 select-none neon-text-orange">
                👑 ACESSE DE QUALQUER DISPOSITIVO
            </h3>
            <p class="text-xs md:text-sm text-gray-300 mb-6 leading-relaxed">
                Você está autenticado no sistema premium! Acesse sua grade por outros dispositivos ou instale os aplicativos nativos para máxima estabilidade e recursos completos:
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a href="${DOWNLOAD_LINKS.windows}" class="flex flex-col items-center justify-center p-5 rounded-2xl neon-btn-orange text-white cursor-pointer transition-all text-decoration-none group" download>
                    <div class="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
                    </div>
                    <span class="text-xs font-bold">Aplicativo Windows</span>
                    <span class="text-[10px] text-gray-400 mt-1">Baixar Instalador .EXE</span>
                </a>
                <a href="${DOWNLOAD_LINKS.android}" class="flex flex-col items-center justify-center p-5 rounded-2xl neon-btn-green text-white cursor-pointer transition-all text-decoration-none group" download>
                    <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"/><path d="M12 6v12M6 12h12"/></svg>
                    </div>
                    <span class="text-xs font-bold">Aplicativo Android</span>
                    <span class="text-[10px] text-gray-400 mt-1">Baixar Instalação .APK</span>
                </a>
                <a href="${DOWNLOAD_LINKS.webPlayer}" target="_blank" class="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-br from-blue-600/10 to-blue-800/10 border border-blue-500/35 hover:border-blue-500 shadow-lg text-white cursor-pointer transition-all text-decoration-none group">
                    <div class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </div>
                    <span class="text-xs font-bold text-blue-300">Versão Web Player</span>
                    <span class="text-[10px] text-gray-400 mt-1">Acessar no Navegador</span>
                </a>
            </div>
        </div>
    `;

    hubContainer.appendChild(downloadSection);
}
