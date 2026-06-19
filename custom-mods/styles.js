/**
 * styles.js — Injeção de estilos CSS customizados (efeitos neon e animações)
 */

export function injectCustomStyles() {
    if (document.getElementById('custom-mods-styles')) return;

    const style = document.createElement('style');
    style.id = 'custom-mods-styles';
    style.textContent = `
        .neon-border-blue {
            border-color: rgba(59, 130, 246, 0.4);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.15), inset 0 0 15px rgba(59, 130, 246, 0.05);
            transition: all 0.3s ease;
        }
        .neon-border-blue:hover {
            border-color: rgba(59, 130, 246, 0.8);
            box-shadow: 0 0 25px rgba(59, 130, 246, 0.4), inset 0 0 15px rgba(59, 130, 246, 0.1);
        }
        .neon-text-orange {
            color: #f97316;
            text-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
        }
        .neon-btn-green {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(4, 120, 87, 0.15));
            border: 1px solid rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
            transition: all 0.3s ease;
        }
        .neon-btn-green:hover {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(4, 120, 87, 0.25));
            border-color: rgba(16, 185, 129, 0.8);
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.4);
            transform: translateY(-2px);
        }
        .neon-btn-orange {
            background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(194, 65, 12, 0.15));
            border: 1px solid rgba(249, 115, 22, 0.3);
            box-shadow: 0 0 15px rgba(249, 115, 22, 0.1);
            transition: all 0.3s ease;
        }
        .neon-btn-orange:hover {
            background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(194, 65, 12, 0.25));
            border-color: rgba(249, 115, 22, 0.8);
            box-shadow: 0 0 25px rgba(249, 115, 22, 0.4);
            transform: translateY(-2px);
        }
        .animate-fade-in {
            animation: fadeInMods 0.3s ease-out forwards;
        }
        @keyframes fadeInMods {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Estilização Premium para o Formulário de Login */
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 {
            max-width: 500px !important;
            padding: 2.5rem !important;
            border-radius: 1.5rem !important;
            border: 1px solid rgba(59, 130, 246, 0.25) !important;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 
                        0 0 35px rgba(59, 130, 246, 0.15),
                        inset 0 0 25px rgba(59, 130, 246, 0.05) !important;
            background: linear-gradient(145deg, rgba(10, 15, 29, 0.96), rgba(15, 23, 42, 0.96)) !important;
            backdrop-filter: blur(20px) !important;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85:hover {
            border-color: rgba(59, 130, 246, 0.45) !important;
            box-shadow: 0 30px 70px rgba(0, 0, 0, 0.95), 
                        0 0 45px rgba(99, 102, 241, 0.25),
                        inset 0 0 30px rgba(99, 102, 241, 0.08) !important;
            transform: translateY(-2px);
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 h2 {
            font-size: 1.85rem !important;
            line-height: 2.35rem !important;
            background: linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #c084fc 100%) !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            font-weight: 900 !important;
            margin-bottom: 1.8rem !important;
            text-shadow: 0 2px 12px rgba(0,0,0,0.6) !important;
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 input {
            font-size: 1.1rem !important;
            padding: 1.1rem 1.35rem !important;
            border-radius: 0.9rem !important;
            background-color: #060b16 !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.7) !important;
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 input:focus {
            border-color: rgba(59, 130, 246, 0.85) !important;
            box-shadow: 0 0 18px rgba(59, 130, 246, 0.35), inset 0 2px 4px rgba(0, 0, 0, 0.8) !important;
            background-color: #0a1226 !important;
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 input::placeholder {
            color: #4b5563 !important;
            font-weight: 500 !important;
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 button:not(#js-show-register):not(#js-google-login):not(.text-gray-400):not(.text-xs) {
            font-size: 1.15rem !important;
            padding: 1.15rem !important;
            border-radius: 0.9rem !important;
            background: linear-gradient(135deg, #1d4ed8, #7c3aed) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            box-shadow: 0 5px 25px rgba(37, 99, 235, 0.35) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.06em !important;
            cursor: pointer !important;
            color: #ffffff !important;
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 button:not(#js-show-register):not(#js-google-login):not(.text-gray-400):not(.text-xs):hover {
            background: linear-gradient(135deg, #2563eb, #8b5cf6) !important;
            box-shadow: 0 7px 30px rgba(59, 130, 246, 0.55) !important;
            transform: translateY(-2px) !important;
            border-color: rgba(255, 255, 255, 0.25) !important;
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 button:not(#js-show-register):not(#js-google-login):not(.text-gray-400):not(.text-xs):active {
            transform: translateY(0) !important;
            box-shadow: 0 2px 12px rgba(37, 99, 235, 0.3) !important;
        }
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 label, 
        .max-w-md.w-full.space-y-6.bg-\[\#0a0f1d\]\/85 span {
            font-size: 0.92rem !important;
            font-weight: 600 !important;
            color: #9ca3af !important;
        }
    `;
    document.head.appendChild(style);
}
