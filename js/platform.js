/**
 * platform.js - Detecção de Ambiente e Recursos para o BrozTV VIP+
 * Detecta se o aplicativo está rodando na Web (Browser), APK (Capacitor) ou EXE (Electron)
 * e gerencia a visibilidade de elementos dependentes da plataforma.
 */

class PlatformDetector {
    constructor() {
        this.current = 'browser';
        this.isNative = false;
        this.hasLiveTV = false;
        this.useProxy = true;
        
        this.detect();
        this.applyPlatformOverrides();
    }

    detect() {
        // 1. Detectar Electron
        const isElectron = typeof window !== 'undefined' && 
                           (window.process && window.process.type === 'renderer' || 
                            navigator.userAgent.indexOf('Electron') >= 0);

        // 2. Detectar Capacitor / Native Mobile
        const isCapacitor = typeof window !== 'undefined' && 
                            (window.Capacitor !== undefined || 
                             window.location.protocol === 'capacitor:');

        if (isElectron) {
            this.current = 'electron';
            this.isNative = true;
            this.hasLiveTV = true;
            this.useProxy = false;
        } else if (isCapacitor) {
            this.current = 'capacitor';
            this.isNative = true;
            this.hasLiveTV = true;
            this.useProxy = false;
        } else {
            this.current = 'browser';
            this.isNative = false;
            this.hasLiveTV = false;
            this.useProxy = true;
        }

        console.log(`[PlatformDetector] Plataforma detectada: ${this.current.toUpperCase()} (Nativo: ${this.isNative}, Tem Live TV: ${this.hasLiveTV}, Usa Proxy CORS: ${this.useProxy})`);
    }

    applyPlatformOverrides() {
        document.addEventListener('DOMContentLoaded', () => {
            const cardLive = document.getElementById('card-live');
            const downloadBanner = document.getElementById('download-banner');

            if (this.hasLiveTV) {
                // Exibe o card de Canais Ao Vivo para plataformas nativas (APK/EXE)
                if (cardLive) {
                    cardLive.classList.remove('hidden');
                }
                // Oculta o banner de download, pois o usuário já está no app nativo
                if (downloadBanner) {
                    downloadBanner.classList.add('hidden');
                }
            } else {
                // Oculta o card ao vivo na web devido ao bloqueio de CORS / streams HLS mistos
                if (cardLive) {
                    cardLive.classList.add('hidden');
                }
                // Mostra o banner para incentivar a baixar as versões nativas
                if (downloadBanner) {
                    downloadBanner.classList.remove('hidden');
                }
            }
        });
    }
}

// Expõe globalmente
window.Platform = new PlatformDetector();
export default window.Platform;
