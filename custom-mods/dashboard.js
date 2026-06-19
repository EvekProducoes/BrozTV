/**
 * dashboard.js — Área do Assinante Web (Console de Usuário estilo ClouDDy)
 */
import { initFirebase } from './firebase.js';
import { DOWNLOAD_LINKS } from './config.js';
export function injectClientDashboardWeb(proxyUrl) {
    if (document.getElementById('broztv-client-dashboard-web')) return;

    const sessionUser = JSON.parse(localStorage.getItem('broz_session_user') || '{}');
    const username = sessionUser.username || 'Cliente';
    const name = sessionUser.name || username;
    const isAdmin = sessionUser.isAdmin || username.toLowerCase() === 'admin';

    // Removemos as alterações no rootEl para não quebrar o React
    // O Dashboard agora será um Overlay que cobre a tela toda!
    if (isAdmin) {
        // Apenas para admin, se houver outras telas antigas que precisamos esconder
        const mainContent = document.querySelector('.flex-1') || document.querySelector('main');
        if (mainContent) {
            Array.from(mainContent.children).forEach(child => {
                if (child.id !== 'broztv-client-dashboard-web' && child.id !== 'custom-mods-styles' && child.id !== 'root') {
                    child.classList.add('original-hub-ui');
                }
            });
        }
    }

    // Injeta os estilos CSS globais do visual escuro premium
    injectPremiumDarkStyles();

    const dashboard = document.createElement('div');
    dashboard.id = 'broztv-client-dashboard-web';
    // Modificado para fixed, z-[9990] para cobrir toda a interface React sem interferir nela
    dashboard.className = 'fixed inset-0 z-[9990] w-full h-full overflow-y-auto bg-[#070c14] text-[#e2e8f0] font-sans flex flex-col selection:bg-blue-500/30 selection:text-blue-200';

    const sidebarHtml = `
        <button data-target="section-mesa" class="sidebar-btn active w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm font-bold text-white bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-l-blue-500 border-none cursor-pointer font-sans transition-all duration-200">
            🏠 Mesa / Início
        </button>
        <button data-target="section-perfil" class="sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
            👤 Perfil
        </button>
        <button data-target="section-tarifas" class="sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
            🎫 Planos / Tarifas
        </button>
        <button data-target="section-pagamentos" class="sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
            💳 Pagamentos
        </button>
        <button data-target="section-listas" class="sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
            📡 Playlist - Minha Lista
        </button>
        <div class="mt-4 border-t border-white/5 pt-4">
            <button id="js-btn-open-web-player" class="w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm font-bold text-white bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 cursor-pointer transition-all duration-200 font-sans shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                ▶️ Acessar Web Player
            </button>
        </div>
    `;

    dashboard.innerHTML = `
        <!-- Header Superior -->
        <header class="bg-[#0b111e] text-white h-14 px-6 flex justify-between items-center select-none shadow-md z-30 border-b border-white/5">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow-md">
                    B_V
                </div>
                <span class="font-extrabold tracking-wider text-base text-blue-400">BrozTV <span class="text-white font-normal">Área do Assinante</span></span>
            </div>
            <div class="flex items-center gap-4 text-xs font-semibold">
                <span class="text-gray-400 cursor-pointer hover:text-white transition-colors">Português ▼</span>
                <button id="js-dashboard-logout" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors border-none font-sans">
                    🚪 Sair
                </button>
            </div>
        </header>

        <!-- Corpo Principal (Sidebar + Content) -->
        <div class="flex flex-1 flex-col md:flex-row relative">
            <!-- Sidebar Lateral -->
            <aside class="w-full md:w-60 bg-[#090e1a] border-r border-white/5 flex flex-col justify-between p-4 select-none">
                <div class="flex flex-col gap-1.5" id="js-sidebar-menu">
                    ${sidebarHtml}
                </div>

                <div class="flex flex-col gap-2 pt-4 mt-6 border-t border-white/5 text-[10px] text-gray-500">
                    <span>Estado do Serviço: <strong class="text-green-500 font-bold">🟢 Online</strong></span>
                </div>
            </aside>

            <!-- Conteúdo Central -->
            <main class="flex-1 p-6 md:p-8 overflow-y-auto" id="js-main-content">
                
                <!-- Alerta de Expiração -->
                <div id="expiration-banner" class="p-4 mb-6 bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex justify-between items-center hidden animate-fade-in">
                    <span>⚠️ Sua assinatura expirou ou está inativa! Efetue o pagamento de um plano para reativar o serviço.</span>
                    <button id="js-pay-now-banner" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold border-none cursor-pointer transition-colors">Pagar Agora</button>
                </div>

                <!-- SEÇÃO 1: MESA (DASHBOARD RESUMO) -->
                <section id="section-mesa" class="dashboard-section">
                    <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">🏠 Mesa / Início</h2>
                    
                    <!-- Grid de Resumo da Conta -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-6">
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Assinante ID</span>
                            <div class="text-sm font-bold text-blue-400 mt-2 truncate" id="clouddy-id">Carregando...</div>
                        </div>
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">E-mail de Login</span>
                            <div class="text-sm font-bold text-white mt-2 truncate" id="clouddy-email">Carregando...</div>
                        </div>
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Status do Serviço</span>
                            <div class="mt-2"><span class="clouddy-value-badge" id="clouddy-state">Carregando...</span></div>
                        </div>
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Vencimento da Licença</span>
                            <div class="mt-2"><span class="clouddy-value-badge" id="clouddy-end">Carregando...</span></div>
                        </div>
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Plano Ativo</span>
                            <div class="text-sm font-bold text-white mt-2" id="clouddy-tariff">Carregando...</div>
                        </div>
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Custo Periódico</span>
                            <div class="text-sm font-bold text-green-400 mt-2 font-mono" id="clouddy-cost">Carregando...</div>
                        </div>
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Ativação do Serviço</span>
                            <div class="text-xs font-semibold text-gray-300 mt-2" id="clouddy-start">Carregando...</div>
                        </div>
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Dispositivos Permitidos</span>
                            <div class="text-sm font-bold text-white mt-2" id="clouddy-limit">3</div>
                        </div>
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo de Cadastro</span>
                            <div class="mt-2"><span class="clouddy-value-badge bg-green" id="clouddy-regtype">Carregando...</span></div>
                        </div>
                    </div>

                    <!-- Downloads Oficiais -->
                    <div class="glass-card p-6">
                        <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">📥 Instalar Aplicativos BrozTV</h3>
                        <p class="text-xs text-gray-400 mb-5 leading-relaxed">
                            Para assistir com estabilidade total de canais de TV ao vivo, utilize nossos aplicativos oficiais:
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <a href="${DOWNLOAD_LINKS.windows}" class="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl neon-btn-orange text-white text-xs font-black transition-all text-decoration-none cursor-pointer" download>
                                Instalar no Windows (.EXE)
                            </a>
                            <a href="${DOWNLOAD_LINKS.android}" class="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl neon-btn-green text-white text-xs font-black transition-all text-decoration-none cursor-pointer" download>
                                Instalar no Android (.APK)
                            </a>
                        </div>
                    </div>
                </section>

                <!-- SEÇÃO 2: PERFIL -->
                <section id="section-perfil" class="dashboard-section hidden">
                    <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">👤 Perfil do Assinante</h2>
                    
                    <div class="glass-card p-6 max-w-2xl mb-6">
                        <form id="js-profile-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="sm:col-span-2">
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">Nome Completo</label>
                                <input type="text" id="profile-name" class="w-full rounded-lg p-3 text-sm" placeholder="Seu nome completo" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">E-mail (Login)</label>
                                <input type="email" id="profile-email" class="w-full rounded-lg p-3 text-sm" placeholder="seuemail@gmail.com" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">Telefone</label>
                                <input type="text" id="profile-phone" class="w-full rounded-lg p-3 text-sm" placeholder="Ex: (11) 99999-9999">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">Cidade</label>
                                <input type="text" id="profile-city" class="w-full rounded-lg p-3 text-sm" placeholder="Ex: São Paulo">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">Estado</label>
                                <input type="text" id="profile-state" class="w-full rounded-lg p-3 text-sm" placeholder="Ex: SP" maxlength="2" style="text-transform: uppercase;">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">Senha</label>
                                <input type="text" id="profile-password" class="w-full rounded-lg p-3 text-sm" placeholder="Sua senha" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">PIN</label>
                                <input type="text" id="profile-pin" class="w-full rounded-lg p-3 text-sm" placeholder="Ex: 0000" maxlength="4" required>
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">Fuso Horário</label>
                                <select id="profile-timezone" class="w-full rounded-lg p-3 text-sm cursor-pointer bg-[#0b1220] text-white">
                                    <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                                    <option value="America/Manaus">America/Manaus</option>
                                    <option value="America/Bahia">America/Bahia</option>
                                    <option value="America/New_York">America/New_York</option>
                                    <option value="Europe/London">Europe/London</option>
                                </select>
                            </div>
                            <div class="sm:col-span-2 mt-2">
                                <button type="submit" id="js-btn-save-profile" class="neon-btn-success w-full sm:w-auto rounded-lg px-6 py-3 cursor-pointer border-none transition-colors text-sm">
                                    💾 Salvar Perfil
                                </button>
                            </div>
                        </form>
                    </div>
                </section>

                <!-- SEÇÃO 3: TARIFAS -->
                <section id="section-tarifas" class="dashboard-section hidden">
                    <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">🎫 Planos e Tarifas</h2>

                    <!-- Seletor de Telas do Assinante -->
                    <div class="flex gap-2.5 mb-6 bg-[#090e1a] p-1.5 rounded-xl border border-white/5 w-fit select-none mx-auto">
                        <button type="button" id="js-tarifa-telas-3" class="px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none bg-blue-600 text-white cursor-pointer shadow-md">
                            3 Telas Simultâneas (Recomendado)
                        </button>
                        <button type="button" id="js-tarifa-telas-6" class="px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none text-gray-400 hover:text-white cursor-pointer bg-transparent">
                            6 Telas Simultâneas
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" id="js-tarifas-container">
                        <div class="col-span-3 text-center text-xs text-gray-400 py-12">
                            ⏳ Carregando planos e preços...
                        </div>
                    </div>

                    <!-- Checkout removido (Mercado Pago desativado) -->
                </section>

                <!-- SEÇÃO 4: PAGAMENTOS -->
                <section id="section-pagamentos" class="dashboard-section hidden">
                    <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">💳 Histórico de Pagamentos</h2>
                    
                    <div class="glass-card overflow-hidden">
                        <table class="w-full text-left border-collapse text-xs text-[#e2e8f0]">
                            <thead>
                                <tr class="bg-gray-900/40 text-gray-400 border-b border-white/5">
                                    <th class="p-3 font-bold">ID</th>
                                    <th class="p-3 font-bold">Valor</th>
                                    <th class="p-3 font-bold">Detalhes</th>
                                    <th class="p-3 font-bold">Tempo de pagamento</th>
                                </tr>
                            </thead>
                            <tbody id="js-pagamentos-table-body">
                                <tr>
                                    <td colspan="4" class="text-center text-gray-400 py-8">
                                        Nenhum pagamento registrado.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="p-3 bg-gray-900/40 border-t border-white/5 text-[10px] text-gray-500" id="js-pagamentos-total">
                            Total de itens: 0
                        </div>
                    </div>
                </section>

                <!-- SEÇÃO 5: PLAYLIST (MINHAS LISTAS IPTV) -->
                <section id="section-listas" class="dashboard-section hidden">
                    <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">📡 Playlist - Minha Lista IPTV</h2>

                    <div class="glass-card p-6 mb-6 max-w-3xl" id="js-playlist-form-container">
                        <h3 class="text-sm font-bold text-white mb-4" id="user-lista-form-title">➕ Adicionar Nova Lista IPTV</h3>
                        <form id="js-user-lista-form" class="flex flex-col gap-4">
                            <!-- Nome da Lista (Geral) -->
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Nome da Lista <span class="text-red-500">*</span></label>
                                <input type="text" id="user-lista-nome" class="w-full rounded-lg p-3 text-xs" placeholder="Ex: Minha Lista Premium" required>
                            </div>

                            <!-- Abas / Tabs de Seleção de Tipo de Conexão -->
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-2">Selecione o Tipo de Playlist / Conexão</label>
                                <div class="flex flex-wrap gap-2 mb-2" id="user-connection-tabs">
                                    <button type="button" data-tab="m3u" class="connection-tab-btn active px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-blue-500/35 bg-blue-600/20 text-blue-300 cursor-pointer">
                                        🔗 M3U / M3U8
                                    </button>
                                    <button type="button" data-tab="xtream" class="connection-tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5 bg-[#0b1220] text-gray-400 hover:text-white cursor-pointer">
                                        ⚡ Xtream Codes API
                                    </button>
                                    <button type="button" data-tab="epg" class="connection-tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5 bg-[#0b1220] text-gray-400 hover:text-white cursor-pointer">
                                        📅 Guia EPG (XMLTV)
                                    </button>
                                    <button type="button" data-tab="stalker" class="connection-tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5 bg-[#0b1220] text-gray-400 hover:text-white cursor-pointer">
                                        📟 Stalker Portal (MAC)
                                    </button>
                                </div>
                            </div>

                            <!-- Container dos Inputs de Cada Aba -->
                            <div id="user-tabs-content">
                                <!-- ABA 1: M3U -->
                                <div id="user-tab-m3u" class="tab-content grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Link para Playlist M3U / M3U8 <span class="text-red-500">*</span></label>
                                        <input type="url" id="user-lista-m3u" class="w-full rounded-lg p-3 text-xs" placeholder="https://...">
                                    </div>
                                    
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Link para Fonte EPG (Guia de Programação)</label>
                                        <input type="url" id="user-lista-epg" class="w-full rounded-lg p-3 text-xs" placeholder="https://... (opcional)">
                                    </div>

                                    <!-- Upload de arquivo local M3U -->
                                    <div class="sm:col-span-2 bg-[#090e1a] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
                                        <div class="text-left">
                                            <span class="text-xs font-bold text-white block">📁 Importar Playlist do Computador (.m3u)</span>
                                            <span class="text-[10px] text-gray-400">Selecione um arquivo .m3u ou .m3u8 para hospedar na nuvem da BrozTV</span>
                                        </div>
                                        <input type="file" id="js-m3u-file-input" accept=".m3u,.m3u8" class="hidden">
                                        <button type="button" id="js-btn-attach-m3u" class="px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/35 text-blue-300 text-xs font-black rounded-lg cursor-pointer transition-all">
                                            📎 Selecionar Arquivo
                                        </button>
                                    </div>
                                </div>

                                <!-- ABA 2: Xtream Codes -->
                                <div id="user-tab-xtream" class="tab-content grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">URL do Servidor Xtream Codes <span class="text-red-500">*</span></label>
                                        <input type="url" id="user-lista-xtream-server" class="w-full rounded-lg p-3 text-xs" placeholder="Ex: http://servidor.com:8080">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Usuário <span class="text-red-500">*</span></label>
                                        <input type="text" id="user-lista-xtream-user" class="w-full rounded-lg p-3 text-xs" placeholder="Seu usuário Xtream">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Senha <span class="text-red-500">*</span></label>
                                        <input type="text" id="user-lista-xtream-pass" class="w-full rounded-lg p-3 text-xs" placeholder="Sua senha Xtream">
                                    </div>
                                </div>

                                <!-- ABA 3: Guia EPG (XML) -->
                                <div id="user-tab-epg" class="tab-content grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Link para Fonte EPG XMLTV (.xml / .xml.gz) <span class="text-red-500">*</span></label>
                                        <input type="url" id="user-lista-epg-only" class="w-full rounded-lg p-3 text-xs" placeholder="https://...">
                                    </div>

                                    <!-- Upload de arquivo local XML -->
                                    <div class="sm:col-span-2 bg-[#090e1a] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
                                        <div class="text-left">
                                            <span class="text-xs font-bold text-white block">📁 Importar Guia EPG do Computador (.xml)</span>
                                            <span class="text-[10px] text-gray-400">Selecione seu arquivo .xml ou .xml.gz para hospedar no servidor</span>
                                        </div>
                                        <input type="file" id="js-xml-file-input" accept=".xml,.xml.gz" class="hidden">
                                        <button type="button" id="js-btn-attach-xml" class="px-5 py-2.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/35 text-purple-300 text-xs font-black rounded-lg cursor-pointer transition-all">
                                            📎 Selecionar Arquivo XML
                                        </button>
                                    </div>
                                </div>

                                <!-- ABA 4: Stalker Portal -->
                                <div id="user-tab-stalker" class="tab-content grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">URL do Portal Stalker <span class="text-red-500">*</span></label>
                                        <input type="url" id="user-lista-stalker-server" class="w-full rounded-lg p-3 text-xs" placeholder="Ex: http://stalkerserver.com/c/">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Endereço MAC (MAC Address) <span class="text-red-500">*</span></label>
                                        <input type="text" id="user-lista-stalker-mac" class="w-full rounded-lg p-3 text-xs" placeholder="Ex: 00:1A:79:XX:XX:XX">
                                    </div>
                                </div>
                            </div>

                            <!-- BARRA SEPARADORA HORIZONTAL -->
                            <div class="h-px bg-gradient-to-r from-transparent via-blue-500/35 to-transparent my-4"></div>

                            <!-- SEÇÃO DE SALVAMENTO / CONFIGURAÇÕES -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-semibold text-gray-400 mb-1">Tipo da Lista</label>
                                    <select id="user-lista-tipo" class="w-full rounded-lg p-3 text-xs cursor-pointer bg-[#0b1220] text-white">
                                        <option value="tv">📺 TV ao Vivo</option>
                                        <option value="vod">🎬 VOD / Filmes</option>
                                        <option value="misto">🌐 Misto (TV + VOD)</option>
                                    </select>
                                </div>
                                
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-semibold text-gray-400 mb-1">Observações / Notas</label>
                                    <textarea id="user-lista-obs" rows="2" class="w-full rounded-lg p-3 text-xs resize-none" placeholder="Notas internas sobre esta lista (opcional)"></textarea>
                                </div>

                                <div class="sm:col-span-2 flex gap-3 mt-2">
                                    <button type="submit" id="js-user-lista-submit" class="neon-btn-primary flex-1 py-3 rounded-lg text-xs border-none font-bold">
                                        💾 Salvar Lista
                                    </button>
                                    <button type="button" id="js-user-lista-cancel" class="py-3 px-6 bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 rounded-lg font-bold text-xs cursor-pointer transition-all border-none hidden">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </form>
                        
                        <!-- Bloqueio de Assinatura Vencida -->
                        <div id="playlist-blocked-overlay" class="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-bold leading-relaxed text-center hidden animate-fade-in">
                            🔒 Acesso Bloqueado: A ativação e o gerenciamento de playlists estão desabilitados porque sua assinatura está vencida. Renove seu plano na aba "Planos / Tarifas" para liberar!
                        </div>
                    </div>

                    <div class="glass-card overflow-hidden">
                        <div class="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 class="text-sm font-bold text-white">📋 Listas Salvas</h3>
                            <span class="text-[10px] text-gray-400 font-bold" id="js-user-lista-count">0 listas</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse text-xs text-[#e2e8f0]">
                                <thead>
                                    <tr class="bg-gray-900/40 text-gray-400 border-b border-white/5">
                                        <th class="p-3 font-bold">Status</th>
                                        <th class="p-3 font-bold">Nome</th>
                                        <th class="p-3 font-bold">Tipo</th>
                                        <th class="p-3 font-bold">Link M3U</th>
                                        <th class="p-3 font-bold">Fonte EPG</th>
                                        <th class="p-3 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="js-user-lista-table-body">
                                    <tr>
                                        <td colspan="5" class="text-center text-gray-400 py-8">Nenhuma lista cadastrada.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    `;

    if (!isAdmin) {
        document.body.appendChild(dashboard);
    } else {
        const mainContent = document.querySelector('.flex-1') || document.querySelector('main') || document.body;
        if (mainContent) mainContent.appendChild(dashboard);
    }

    setupSidebarClickListeners(dashboard);

    // Pagar agora no banner de expiração
    const bannerPayBtn = document.getElementById('js-pay-now-banner');
    if (bannerPayBtn) {
        bannerPayBtn.addEventListener('click', () => {
            const tarifasBtn = dashboard.querySelector('[data-target="section-tarifas"]');
            if (tarifasBtn) tarifasBtn.click();
        });
    }

    // Ouvinte de logout
    document.getElementById('js-dashboard-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.reload();
    });

    // Alternância de abas de telas nas Tarifas do Assinante
    const btnTelas3 = document.getElementById('js-tarifa-telas-3');
    const btnTelas6 = document.getElementById('js-tarifa-telas-6');

    if (btnTelas3 && btnTelas6) {
        const setTarifaTab = (telas) => {
            userTarifaTelasActive = telas;
            if (telas === 3) {
                btnTelas3.className = 'px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none bg-blue-600 text-white cursor-pointer shadow-md';
                btnTelas6.className = 'px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none text-gray-400 hover:text-white cursor-pointer bg-transparent';
            } else {
                btnTelas6.className = 'px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none bg-blue-600 text-white cursor-pointer shadow-md';
                btnTelas3.className = 'px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none text-gray-400 hover:text-white cursor-pointer bg-transparent';
            }
            // Recarrega planos
            initFirebase().then(db => {
                if (db) loadPlansIntoDashboard(db, dashboard);
            });
        };

        btnTelas3.addEventListener('click', () => setTarifaTab(3));
        btnTelas6.addEventListener('click', () => setTarifaTab(6));
    }

    // Lógica do Cupom movida temporariamente ou removida.

    // Botão flutuante para voltar ao Painel VIP (inicia oculto)
    let backToPanelBtn = document.getElementById('js-btn-back-to-panel');
    if (!backToPanelBtn) {
        backToPanelBtn = document.createElement('button');
        backToPanelBtn.id = 'js-btn-back-to-panel';
        backToPanelBtn.className = 'fixed top-6 right-36 z-[99999] bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2 px-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] cursor-pointer hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all hidden border-2 border-white/20 text-xs md:text-sm font-sans flex items-center gap-2';
        backToPanelBtn.innerHTML = '⬅️ Voltar ao Painel VIP';
        document.body.appendChild(backToPanelBtn);

        backToPanelBtn.addEventListener('click', () => {
            dashboard.style.display = 'flex'; // Exibe o overlay do painel
            
            // Oculta novamente o root usando opacity
            let styleEl = document.getElementById('hide-root-mods-style');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'hide-root-mods-style';
                styleEl.textContent = '#root { opacity: 0 !important; pointer-events: none !important; }';
                document.documentElement.appendChild(styleEl);
            }

            backToPanelBtn.classList.add('hidden');
        });
    }

    // Ação do Botão "Acessar Web Player" no painel
    const btnOpenWebPlayer = dashboard.querySelector('#js-btn-open-web-player');
    if (btnOpenWebPlayer) {
        btnOpenWebPlayer.addEventListener('click', (e) => {
            e.preventDefault();
            dashboard.style.display = 'none'; // Esconde painel VIP (overlay)

            // Remove o estilo que deixava o root invisível
            const hideRootStyle = document.getElementById('hide-root-mods-style');
            if (hideRootStyle) hideRootStyle.remove();

            backToPanelBtn.classList.remove('hidden');
        });
    }

    // Carregar informações do Firestore
    loadUserDataAndSetup(username, proxyUrl, dashboard);
}

function setupSidebarClickListeners(dashboard) {
    const menuButtons = dashboard.querySelectorAll('.sidebar-btn');
    const sections = dashboard.querySelectorAll('.dashboard-section');

    // Remove active style e oculta sections
    menuButtons.forEach(btn => {
        const btnClone = btn.cloneNode(true);
        btn.parentNode.replaceChild(btnClone, btn);
    });

    const activeButtons = dashboard.querySelectorAll('.sidebar-btn');
    activeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            
            activeButtons.forEach(b => {
                b.className = 'sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 border-none cursor-pointer transition-all duration-200 font-sans';
            });
            btn.className = 'sidebar-btn active w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm font-black text-white bg-gradient-to-r from-blue-500/25 to-purple-500/25 shadow-[0_0_15px_rgba(59,130,246,0.15)] border-l-4 border-l-blue-500 border-none cursor-pointer font-sans';

            sections.forEach(sec => sec.classList.add('hidden'));

            const activeSec = dashboard.querySelector(`#${target}`);
            if (activeSec) activeSec.classList.remove('hidden');
        });
    });
}

// Estilos de visual do ClouDDy
function injectPremiumDarkStyles() {
    if (document.getElementById('broztv-custom-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'broztv-custom-dashboard-styles';
    style.textContent = `
        body {
            background-color: #070c14 !important;
        }
        #broztv-client-dashboard-web {
            background-color: #070c14 !important;
            color: #e2e8f0 !important;
        }
        
        /* Custom row para o resumo da Mesa */
        .clouddy-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(17, 24, 39, 0.45);
            font-size: 13px;
        }
        .clouddy-row:last-child {
            border-bottom: none;
        }
        .clouddy-label {
            font-weight: 600;
            color: #9ca3af;
        }
        .clouddy-value-badge {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
            padding: 4px 14px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            display: inline-block;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.1);
        }
        .clouddy-value-badge.bg-green {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border-color: rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.1);
        }
        .clouddy-value-badge.bg-red {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.3);
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
        }
        .clouddy-value-badge.bg-yellow {
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
            border-color: rgba(245, 158, 11, 0.3);
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.1);
        }
        
        /* Formulários e Inputs */
        input:not([type="checkbox"]):not([type="radio"]), select, textarea {
            background-color: #0b1220 !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
            outline: none !important;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5) !important;
            transition: all 0.3s ease !important;
        }
        input:not([type="checkbox"]):not([type="radio"]):focus, select:focus, textarea:focus {
            border-color: rgba(59, 130, 246, 0.8) !important;
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.35), inset 0 2px 4px rgba(0, 0, 0, 0.6) !important;
        }
        
        /* Cards de Vidro (Glassmorphism) */
        .glass-card {
            background: rgba(13, 20, 35, 0.7) !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.45) !important;
            backdrop-filter: blur(16px) !important;
            border-radius: 1rem !important;
        }
        
        /* Checkout Panel */
        #clouddy-checkout-panel {
            background: rgba(13, 20, 35, 0.85) !important;
            border: 1px solid rgba(59, 130, 246, 0.25) !important;
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.15), 0 20px 45px rgba(0, 0, 0, 0.6) !important;
        }
        #pix-qrcode-container {
            background: #ffffff !important;
            padding: 8px !important;
            border-radius: 0.75rem !important;
        }
        #pix-loading {
            background: rgba(255, 255, 255, 0.96) !important;
        }
        
        /* Botões */
        .neon-btn-primary {
            background: linear-gradient(135deg, #2563eb, #7c3aed) !important;
            color: white !important;
            font-weight: 700 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.35) !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
        }
        .neon-btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
            box-shadow: 0 6px 22px rgba(59, 130, 246, 0.55) !important;
            transform: translateY(-1px) !important;
        }
        .neon-btn-primary:active:not(:disabled) {
            transform: translateY(0) !important;
        }
        .neon-btn-primary:disabled {
            background: #1e293b !important;
            color: #64748b !important;
            border-color: #334155 !important;
            box-shadow: none !important;
            cursor: not-allowed !important;
        }
        
        .neon-btn-success {
            background: linear-gradient(135deg, #059669, #10b981) !important;
            color: white !important;
            font-weight: 700 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35) !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
        }
        .neon-btn-success:hover:not(:disabled) {
            background: linear-gradient(135deg, #10b981, #34d399) !important;
            box-shadow: 0 6px 22px rgba(16, 185, 129, 0.55) !important;
            transform: translateY(-1px) !important;
        }
        .neon-btn-success:disabled {
            background: #1e293b !important;
            color: #64748b !important;
            border-color: #334155 !important;
            box-shadow: none !important;
            cursor: not-allowed !important;
        }

        .neon-btn-danger {
            background: linear-gradient(135deg, #b91c1c, #dc2626) !important;
            color: white !important;
            font-weight: 700 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3) !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
        }
        .neon-btn-danger:hover {
            background: linear-gradient(135deg, #dc2626, #f87171) !important;
            box-shadow: 0 6px 20px rgba(220, 38, 38, 0.45) !important;
        }
        .neon-btn-danger:active {
            transform: translateY(0) !important;
        }
        
        .neon-btn-orange {
            background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(194, 65, 12, 0.15)) !important;
            border: 1px solid rgba(249, 115, 22, 0.3) !important;
            box-shadow: 0 0 15px rgba(249, 115, 22, 0.1) !important;
            transition: all 0.3s ease !important;
        }
        .neon-btn-orange:hover {
            background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(194, 65, 12, 0.25)) !important;
            border-color: rgba(249, 115, 22, 0.8) !important;
            box-shadow: 0 0 25px rgba(249, 115, 22, 0.4) !important;
            transform: translateY(-2px) !important;
        }
        
        .neon-btn-green {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(4, 120, 87, 0.15)) !important;
            border: 1px solid rgba(16, 185, 129, 0.3) !important;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.1) !important;
            transition: all 0.3s ease !important;
        }
        .neon-btn-green:hover {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(4, 120, 87, 0.25)) !important;
            border-color: rgba(16, 185, 129, 0.8) !important;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.4) !important;
            transform: translateY(-2px) !important;
        }
    `;
    document.head.appendChild(style);
}

async function loadUserDataAndSetup(username, proxyUrl, dashboard) {
    try {
        const db = await initFirebase();
        if (!db) return;

        const userDocRef = db.collection('users').doc(username);
        const doc = await userDocRef.get();
        if (!doc.exists) return;

        const client = doc.data();
        const todayStr = new Date().toISOString().split('T')[0];
        const isLicenseActive = client.isActive && client.endDate >= todayStr;

        // Inicializa o gerenciador de listas do usuário
        setupUserListsManager(db, username, client, proxyUrl);

        // Bloqueia ou libera o formulário de playlists conforme o status da licença
        const playlistForm = document.getElementById('js-user-lista-form');
        const blockedOverlay = document.getElementById('playlist-blocked-overlay');
        const btnAttach = document.getElementById('js-btn-attach-m3u');

        if (playlistForm) {
            const inputsAndButtons = playlistForm.querySelectorAll('input, select, button');
            if (!isLicenseActive) {
                inputsAndButtons.forEach(el => el.disabled = true);
                if (btnAttach) btnAttach.disabled = true;
                if (blockedOverlay) blockedOverlay.classList.remove('hidden');
            } else {
                inputsAndButtons.forEach(el => el.disabled = false);
                if (btnAttach) btnAttach.disabled = false;
                if (blockedOverlay) blockedOverlay.classList.add('hidden');
            }
        }

        // Carrega planos e preços dinâmicos
        loadPlansIntoDashboard(db, dashboard);

        // Preenche Mesa (Resumo)
        document.getElementById('clouddy-id').textContent = client.id || 'N/A';
        document.getElementById('clouddy-email').textContent = client.username;
        document.getElementById('clouddy-regtype').textContent = client.registrationType === 'site' ? '🌐 Cadastro Site' : '👤 Cadastro ADM';
        
        const stateEl = document.getElementById('clouddy-state');
        const endEl = document.getElementById('clouddy-end');
        const expBanner = document.getElementById('expiration-banner');

        if (isLicenseActive) {
            stateEl.textContent = 'Serviço ativo';
            stateEl.className = 'clouddy-value-badge bg-green';
            endEl.textContent = (client.endDate || '').split('-').reverse().join('/') + ' 23:59:59 -0300';
            endEl.className = 'clouddy-value-badge bg-green';
            if (expBanner) expBanner.classList.add('hidden');
        } else {
            stateEl.textContent = 'Serviço vencido';
            stateEl.className = 'clouddy-value-badge bg-red';
            endEl.textContent = (client.endDate || '').split('-').reverse().join('/') + ' 23:59:59 -0300';
            endEl.className = 'clouddy-value-badge bg-red';
            if (expBanner) expBanner.classList.remove('hidden');
        }

        // Carrega as informações do plano atual do usuário dinamicamente do Firestore
        let planName = 'Mensal';
        let planCost = 'R$ 27,75';
        const userPlanId = client.plan || 'mensal';

        try {
            const planDoc = await db.collection('plans').doc(userPlanId).get();
            if (planDoc.exists) {
                const planData = planDoc.data();
                planName = planData.name || (userPlanId.charAt(0).toUpperCase() + userPlanId.slice(1));
                planCost = `R$ ${(planData.price || 27.75).toFixed(2).replace('.', ',')}`;
            } else {
                planName = userPlanId === 'semestral' ? 'Semestral' : userPlanId === 'anual' ? 'Anual' : 'Mensal';
                planCost = userPlanId === 'semestral' ? 'R$ 139,90' : userPlanId === 'anual' ? 'R$ 239,90' : 'R$ 27,75';
            }
        } catch (err) {
            console.warn('[Dashboard] Erro ao obter dados do plano do Firestore:', err.message);
            planName = userPlanId === 'semestral' ? 'Semestral' : userPlanId === 'anual' ? 'Anual' : 'Mensal';
            planCost = userPlanId === 'semestral' ? 'R$ 139,90' : userPlanId === 'anual' ? 'R$ 239,90' : 'R$ 27,75';
        }

        document.getElementById('clouddy-tariff').textContent = planName;
        document.getElementById('clouddy-cost').textContent = planCost;
        
        document.getElementById('clouddy-start').textContent = (client.startDate || '').split('-').reverse().join('/') + ' 00:00:00 -0300';

        // Preenche Perfil Form
        document.getElementById('profile-name').value = client.name || '';
        document.getElementById('profile-email').value = client.username;
        document.getElementById('profile-phone').value = client.phone || '';
        document.getElementById('profile-city').value = client.city || '';
        const profileStateEl = document.getElementById('profile-state');
        if (profileStateEl) profileStateEl.value = client.state || '';
        document.getElementById('profile-password').value = client.password || '';
        document.getElementById('profile-pin').value = client.pin || '0000';
        document.getElementById('profile-timezone').value = client.timezone || 'America/Sao_Paulo';

        // Preenche Pagamentos
        renderPaymentsTable(client.payments || [], client.startDate, client.price, client.plan);

        // Configura submissão do perfil
        const profileForm = document.getElementById('js-profile-form');
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSave = document.getElementById('js-btn-save-profile');
            btnSave.disabled = true;
            btnSave.textContent = 'Salvando...';

            try {
                const nameVal = document.getElementById('profile-name').value.trim();
                const emailVal = document.getElementById('profile-email').value.trim().toLowerCase();
                const phoneVal = document.getElementById('profile-phone').value.trim();
                const cityVal = document.getElementById('profile-city').value.trim();
                const profileStateEl = document.getElementById('profile-state');
                const stateVal = profileStateEl ? profileStateEl.value.trim().toUpperCase() : '';
                const passVal = document.getElementById('profile-password').value.trim();
                const pinVal = document.getElementById('profile-pin').value.trim();
                const tzVal = document.getElementById('profile-timezone').value;

                const oldEmail = username.toLowerCase();

                if (emailVal !== oldEmail) {
                    const checkDoc = await db.collection('users').doc(emailVal).get();
                    if (checkDoc.exists) {
                        throw new Error('O e-mail digitado já está sendo usado por outro assinante.');
                    }

                    if (!confirm(`Você está alterando seu e-mail de login de "${oldEmail}" para "${emailVal}". Confirmar alteração?`)) {
                        btnSave.disabled = false;
                        btnSave.textContent = '💾 Salvar Perfil';
                        return;
                    }

                    // Duplica o documento
                    const updatedClient = {
                        ...client,
                        username: emailVal,
                        email: emailVal,
                        name: nameVal,
                        phone: phoneVal,
                        city: cityVal,
                        state: stateVal,
                        password: passVal,
                        pin: pinVal,
                        timezone: tzVal
                    };

                    await db.collection('users').doc(emailVal).set(updatedClient);
                    await db.collection('users').doc(oldEmail).delete();

                    const sessionUser = JSON.parse(localStorage.getItem('broz_session_user') || '{}');
                    sessionUser.username = emailVal;
                    sessionUser.name = nameVal;
                    localStorage.setItem('broz_session_user', JSON.stringify(sessionUser));
                    localStorage.setItem('broz_saved_credentials', JSON.stringify({ u: emailVal, p: passVal }));

                    alert('E-mail e Perfil atualizados com sucesso! Reconectando...');
                    window.location.reload();
                } else {
                    await db.collection('users').doc(oldEmail).update({
                        name: nameVal,
                        phone: phoneVal,
                        city: cityVal,
                        state: stateVal,
                        password: passVal,
                        pin: pinVal,
                        timezone: tzVal
                    });

                    const sessionUser = JSON.parse(localStorage.getItem('broz_session_user') || '{}');
                    sessionUser.name = nameVal;
                    localStorage.setItem('broz_session_user', JSON.stringify(sessionUser));
                    localStorage.setItem('broz_saved_credentials', JSON.stringify({ u: oldEmail, p: passVal }));

                    alert('Perfil atualizado com sucesso!');
                    window.location.reload();
                }
            } catch (err) {
                alert('Erro ao atualizar perfil: ' + err.message);
            } finally {
                btnSave.disabled = false;
                btnSave.textContent = '💾 Salvar Perfil';
            }
        });

        // ── Minha Lista IPTV (Visualização apenas se ADM) ─────────────────────────
        const mylistNameEl = document.getElementById('mylist-name');
        const mylistM3uEl = document.getElementById('mylist-m3u');
        const mylistEpgEl = document.getElementById('mylist-epg');
        const listInfoEl = document.getElementById('profile-list-info');

        if (mylistNameEl) mylistNameEl.value = client.listName || '';
        if (mylistM3uEl) mylistM3uEl.value = client.m3uUrl || '';
        if (mylistEpgEl) mylistEpgEl.value = client.epgUrl || '';

        if (listInfoEl) {
            if (client.iptvListId) {
                listInfoEl.innerHTML = `<span class="text-blue-600 font-semibold">✅ Lista atribuída pelo administrador: <strong>${client.listName || 'Lista do Admin'}</strong></span>`;
            } else {
                listInfoEl.textContent = 'Lista IPTV ativa no aplicativo: ' + (client.listName || 'Lista Padrão');
            }
        }

        // Listener em tempo real para ativação de licença (caso esteja inativa)
        if (!isLicenseActive) {
            db.collection('users').doc(username).onSnapshot((docSnapshot) => {
                if (docSnapshot.exists) {
                    const updated = docSnapshot.data();
                    const nowToday = new Date().toISOString().split('T')[0];
                    if (updated.isActive && updated.endDate >= nowToday) {
                        console.log('[CustomMods] Licença ativada remotamente detectada via snapshot!');
                        window.location.reload();
                    }
                }
            });
        }

    } catch (e) {
        console.error('[CustomMods] Falha ao carregar dados do usuário:', e);
    }
}

// Renderiza histórico de transações/pagamentos
function renderPaymentsTable(paymentsList, startDate, price, plan) {
    const tbody = document.getElementById('js-pagamentos-table-body');
    const totalEl = document.getElementById('js-pagamentos-total');
    if (!tbody) return;

    let displayList = [...paymentsList];

    // Se a lista estiver vazia, gera uma transação inicial baseada no histórico de início do serviço do usuário para não ficar em branco
    if (displayList.length === 0 && startDate) {
        const initialDateStr = startDate.split('-').reverse().join('/') + ' 12:00:00 -0300';
        const costStr = plan === 'semestral' ? 'R$ 139,90' : plan === 'anual' ? 'R$ 239,90' : 'R$ 27,75';
        displayList.push({
            id: '1' + Math.floor(Math.random() * 900000 + 100000),
            amount: costStr,
            details: 'MercadoPago Pix: Ativação Inicial',
            timestamp: initialDateStr
        });
    }

    if (displayList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-gray-400 py-8">
                    Nenhum pagamento registrado.
                </td>
            </tr>
        `;
        if (totalEl) totalEl.textContent = 'Total de itens: 0';
        return;
    }

    // Ordena por data decrescente
    displayList.sort((a, b) => b.id.localeCompare(a.id));

    tbody.innerHTML = displayList.map(p => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="p-3 font-mono text-blue-400 font-semibold">${p.id}</td>
            <td class="p-3 font-bold text-green-400">${p.amount}</td>
            <td class="p-3 text-gray-300">${p.details}</td>
            <td class="p-3 text-gray-400">${p.timestamp}</td>
        </tr>
    `).join('');

    if (totalEl) totalEl.textContent = `Total de itens: ${displayList.length}`;
}

let userTarifaTelasActive = 3;

// Função generatePix removida, pois Mercado Pago foi desativado

// Carrega os planos dinamicamente do Firestore
async function loadPlansIntoDashboard(db, dashboard) {
    const container = document.getElementById('js-tarifas-container');
    if (!container) return;

    try {
        let plansMap = {};
        try {
            const snapshot = await db.collection('plans').get();
            snapshot.forEach(doc => {
                plansMap[doc.id] = doc.data();
            });
        } catch (dbErr) {
            console.warn('[Dashboard] Não foi possível ler planos do banco, usando valores locais:', dbErr.message);
        }

        const is6T = userTarifaTelasActive === 6;
        const planSuffix = is6T ? '_6t' : '';
        const basePlansKeys = ['mensal', 'semestral', 'anual'];

        const plansToShow = [];

        basePlansKeys.forEach(basePlan => {
            const planKey = basePlan + planSuffix;
            let pData = plansMap[planKey];
            if (!pData) {
                // Fallbacks se não existirem no Firestore
                if (is6T) {
                    const priceFallback = basePlan === 'mensal' ? 55.50 : basePlan === 'semestral' ? 275.50 : 475.50;
                    const daysFallback = basePlan === 'mensal' ? 30 : basePlan === 'semestral' ? 180 : 365;
                    pData = {
                        id: planKey,
                        name: basePlan.charAt(0).toUpperCase() + basePlan.slice(1) + ' 6 Telas',
                        price: priceFallback,
                        desc: `Acesso por ${daysFallback} dias, até 6 dispositivos simultâneos`,
                        devices: 6,
                        days: daysFallback
                    };
                } else {
                    const priceFallback = basePlan === 'mensal' ? 27.75 : basePlan === 'semestral' ? 137.75 : 237.75;
                    const daysFallback = basePlan === 'mensal' ? 30 : basePlan === 'semestral' ? 180 : 365;
                    pData = {
                        id: planKey,
                        name: basePlan.charAt(0).toUpperCase() + basePlan.slice(1),
                        price: priceFallback,
                        desc: `Acesso por ${daysFallback} dias, 3 dispositivos simultâneos`,
                        devices: 3,
                        days: daysFallback
                    };
                }
            } else {
                // Auto-correção caso o plano de 6 telas tenha sido salvo acidentalmente com dados de 3 telas
                const is3TelasPrice = pData.price == 27.75 || pData.price == 137.75 || pData.price == 237.75;
                if (is6T && (pData.devices == 3 || pData.devices == '3' || is3TelasPrice)) {
                    pData.devices = 6;
                    pData.price = pData.price * 2;
                    if (pData.desc) pData.desc = pData.desc.replace('3 dispositivos', '6 dispositivos');
                    if (pData.name && !pData.name.includes('6 Telas')) pData.name += ' 6 Telas';
                }
            }
            plansToShow.push(pData);
        });

        const emojis = { mensal: '📅', semestral: '📆', anual: '🏆' };
        const colors = { mensal: '#3b82f6', semestral: '#a855f7', anual: '#10b981' };
        const stripeLinks = {
            'mensal': 'https://buy.stripe.com/eVq4gzfwY34N9gtgNhaR20b',
            'anual': 'https://buy.stripe.com/8x214n0C4gVDakxcx1aR20c',
            'semestral': 'https://buy.stripe.com/6oU14n3OgdJr64heF9aR20d',
            'mensal_6t': 'https://buy.stripe.com/5kQaEX1G834N1O17cHaR20e',
            'anual_6t': 'https://buy.stripe.com/3cI8wP2Kc9tb78l7cHaR20f',
            'semestral_6t': 'https://buy.stripe.com/6oUcN5bgIeNv64h8gLaR20g'
        };

        container.innerHTML = plansToShow.map(p => {
            // Acha o base ID para emoji e cor
            const baseId = p.id.replace('_6t', '');
            const emoji = emojis[baseId] || '🎫';
            const color = colors[baseId] || '#3b82f6';
            const borderStyle = `border-t-4 border-t-[${color}]`;
            const sLink = stripeLinks[p.id];

            // Cálculo dos descontos comparado ao mensal proporcional
            let discountHtml = '';
            if (baseId === 'semestral') {
                discountHtml = `
                    <div class="mt-1.5"><span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-[#a855f7] bg-[#a855f7]/10 border border-[#a855f7]/20">🔥 Economize 17%</span></div>
                    <div class="text-[10px] text-gray-500 mt-1 font-semibold">Proporcional: R$ ${(p.price / 6).toFixed(2).replace('.', ',')}/mês</div>
                `;
            } else if (baseId === 'anual') {
                discountHtml = `
                    <div class="mt-1.5"><span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20">🏆 Economize 28%</span></div>
                    <div class="text-[10px] text-gray-500 mt-1 font-semibold">Proporcional: R$ ${(p.price / 12).toFixed(2).replace('.', ',')}/mês</div>
                `;
            } else {
                discountHtml = `
                    <div class="mt-1.5"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase text-gray-400 bg-gray-400/5">Melhor Custo-benefício</span></div>
                    <div class="text-[10px] text-gray-500 mt-1">&nbsp;</div>
                `;
            }

            return `
                <div class="glass-card p-6 text-center flex flex-col justify-between ${borderStyle}">
                    <div>
                        <h3 class="text-xl text-white font-bold mb-2">${emoji} Plano ${p.name || baseId.toUpperCase()}</h3>
                        <div class="text-3xl font-black my-4 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" style="color: ${color}">R$ ${p.price.toFixed(2).replace('.', ',')}</div>
                        ${discountHtml}
                    </div>
                    <div class="text-xs text-gray-400 leading-relaxed mb-6 mt-4 font-medium">
                        Periodicidade <strong class="text-white">por ${p.days} dias</strong><br>
                        Limite de dispositivos <strong class="text-white">${p.devices || 3}</strong> simultâneos<br>
                        ${p.desc || ''}
                    </div>
                    <div class="flex flex-col gap-2">
                        <button onclick="window.open('${sLink}?client_reference_id=' + JSON.parse(localStorage.getItem('broz_session_user') || '{}').username, '_blank')" class="w-full bg-[#635BFF] hover:bg-[#4b45d6] text-white rounded-lg py-4 text-sm font-bold transition-all cursor-pointer border-none shadow-[0_0_15px_rgba(99,91,255,0.3)]">
                            💳 Pagar via Stripe
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Recria listeners dos botões de pagamento
        // Removido listener de pix

    } catch (err) {
        console.error('[Dashboard Plans] Erro ao carregar planos:', err);
        container.innerHTML = '<span class="text-xs text-red-500">Erro ao carregar tarifas de planos.</span>';
    }
}

// Configura o gerenciador de listas do próprio usuário no Cadastro Site
let _editingUserListId = null;

function setupUserListsManager(db, username, client, proxyUrl) {
    const form = document.getElementById('js-user-lista-form');
    const tbody = document.getElementById('js-user-lista-table-body');
    const countEl = document.getElementById('js-user-lista-count');
    const cancelBtn = document.getElementById('js-user-lista-cancel');
    const submitBtn = document.getElementById('js-user-lista-submit');
    const formTitle = document.getElementById('user-lista-form-title');
    const fileInput = document.getElementById('js-m3u-file-input');
    const attachBtn = document.getElementById('js-btn-attach-m3u');

    if (!form || !tbody) return;

    let customLists = client.customLists || [];

    // Se customLists estiver vazio, mas houver m3uUrl na raiz, adiciona a lista padrão/admin para migrar o usuário
    if (customLists.length === 0 && client.m3uUrl) {
        const initialList = {
            id: 'list_initial_admin',
            nome: client.listName || 'Lista Padrão Assinante',
            m3u: client.m3uUrl,
            epg: client.epgUrl || '',
            tipo: 'misto'
        };
        customLists.push(initialList);
        db.collection('users').doc(username).update({
            customLists: customLists
        }).catch(err => console.error('[setupUserListsManager] Erro ao migrar lista inicial:', err));
    }

    // Configura o botão de anexo para upload de M3U local
    if (attachBtn && fileInput) {
        attachBtn.onclick = () => {
            fileInput.click();
        };

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const originalText = attachBtn.textContent;
            attachBtn.disabled = true;
            attachBtn.textContent = '⏳ Carregando...';

            const reader = new FileReader();
            reader.onload = async (evt) => {
                const content = evt.target.result;
                try {
                    const response = await fetch(`${proxyUrl}/api/playlists/upload-file`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username: username,
                            fileName: file.name,
                            content: content
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Falha ao enviar arquivo M3U ao servidor.');
                    }

                    const resData = await response.json();
                    if (resData.success && resData.url) {
                        const m3uInput = document.getElementById('user-lista-m3u');
                        if (m3uInput) {
                            m3uInput.value = resData.url;
                        }
                        alert('Arquivo M3U enviado com sucesso!');
                    } else {
                        throw new Error(resData.error || 'Resposta inválida do servidor.');
                    }
                } catch (err) {
                    alert('Erro no upload da lista: ' + err.message);
                } finally {
                    attachBtn.disabled = false;
                    attachBtn.textContent = originalText;
                    fileInput.value = ''; // Limpa o input
                }
               // ── Lógica de Abas de Conexão (Área do Cliente) ───────────────────────
    let activeTab = 'm3u';

    function setActiveTabUser(tabName) {
        activeTab = tabName;
        const tabs = document.querySelectorAll('#user-connection-tabs .connection-tab-btn');
        tabs.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.className = 'connection-tab-btn active px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-blue-500/35 bg-blue-600/20 text-blue-300 cursor-pointer';
            } else {
                btn.className = 'connection-tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5 bg-[#0b1220] text-gray-400 hover:text-white cursor-pointer';
            }
        });

        const tabContents = {
            m3u: document.getElementById('user-tab-m3u'),
            xtream: document.getElementById('user-tab-xtream'),
            epg: document.getElementById('user-tab-epg'),
            stalker: document.getElementById('user-tab-stalker')
        };

        Object.keys(tabContents).forEach(key => {
            const el = tabContents[key];
            if (el) {
                if (key === tabName) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            }
        });
    }

    // Vincula cliques nas abas
    document.querySelectorAll('#user-connection-tabs .connection-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveTabUser(btn.dataset.tab);
        });
    });

    // Configura o botão de anexo para upload de EPG XML local
    const xmlFileInput = document.getElementById('js-xml-file-input');
    const xmlAttachBtn = document.getElementById('js-btn-attach-xml');
    if (xmlAttachBtn && xmlFileInput) {
        xmlAttachBtn.onclick = () => {
            xmlFileInput.click();
        };

        xmlFileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const originalText = xmlAttachBtn.textContent;
            xmlAttachBtn.disabled = true;
            xmlAttachBtn.textContent = '⏳ Carregando...';

            const reader = new FileReader();
            reader.onload = async (evt) => {
                const content = evt.target.result;
                try {
                    const response = await fetch(`${proxyUrl}/api/playlists/upload-file`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username: username,
                            fileName: file.name,
                            content: content
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Falha ao enviar arquivo XML ao servidor.');
                    }

                    const resData = await response.json();
                    if (resData.success && resData.url) {
                        const xmlInput = document.getElementById('user-lista-epg-only');
                        if (xmlInput) {
                            xmlInput.value = resData.url;
                        }
                        alert('Arquivo XML de EPG enviado com sucesso!');
                    } else {
                        throw new Error(resData.error || 'Resposta inválida do servidor.');
                    }
                } catch (err) {
                    alert('Erro no upload do XML: ' + err.message);
                } finally {
                    xmlAttachBtn.disabled = false;
                    xmlAttachBtn.textContent = originalText;
                    xmlFileInput.value = '';
                }
            };
            reader.onerror = () => {
                alert('Erro ao ler arquivo XML local.');
                xmlAttachBtn.disabled = false;
                xmlAttachBtn.textContent = originalText;
                xmlFileInput.value = '';
            };
            reader.readAsText(file);
        };
    }

    const renderTable = () => {
        if (countEl) countEl.textContent = `${customLists.length} lista${customLists.length !== 1 ? 's' : ''}`;
        
        if (customLists.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-gray-400 py-8">
                        Nenhuma lista cadastrada. Adicione uma nova lista usando o formulário acima.
                    </td>
                </tr>
            `;
            return;
        }

        const tipoEmoji = { tv: '📺 TV ao Vivo', vod: '🎬 VOD', misto: '🌐 Misto' };

        tbody.innerHTML = customLists.map(l => {
            const isActive = l.m3u === client.m3uUrl;
            const statusBadge = isActive 
                ? `<span class="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 font-bold rounded text-[9px] uppercase">✓ Ativa</span>`
                : `<span class="px-2 py-0.5 bg-gray-500/10 border border-gray-500/20 text-gray-400 font-bold rounded text-[9px] uppercase">Inativa</span>`;
            
            const activeBtn = isActive
                ? `<button class="px-2.5 py-1.5 bg-slate-800 text-slate-500 rounded-lg text-[10px] font-bold cursor-not-allowed border-none" disabled>Ativo</button>`
                : `<button onclick="window.activateUserList('${l.id}')" class="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black cursor-pointer border-none transition-colors">Ativar</button>`;

            return `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td class="p-3 align-middle">${statusBadge}</td>
                    <td class="p-3 align-middle">
                        <div class="font-bold text-white">${l.nome}</div>
                        ${l.obs ? `<div class="text-[10px] text-gray-400 mt-0.5">${l.obs}</div>` : ''}
                    </td>
                    <td class="p-3 align-middle">
                        <span class="px-2 py-0.5 bg-blue-950/20 border border-blue-500/30 rounded text-[10px] font-bold text-blue-400">${tipoEmoji[l.tipo] || l.tipo || 'Misto'}</span>
                    </td>
                    <td class="p-3 align-middle">
                        <div class="font-mono text-blue-400 truncate max-w-[200px]" title="${l.m3u}">${l.m3u}</div>
                        ${l.user ? `<div class="text-[9px] text-gray-400">User: <strong class="text-gray-300 font-mono">${l.user}</strong></div>` : ''}
                        ${l.pass ? `<div class="text-[9px] text-gray-400">Pass: <strong class="text-gray-300 font-mono">${l.pass}</strong></div>` : ''}
                    </td>
                    <td class="p-3 align-middle font-mono text-purple-400 truncate max-w-[150px]" title="${l.epg || ''}">${l.epg || '—'}</td>
                    <td class="p-3 align-middle text-right">
                        <div class="flex gap-1.5 justify-end">
                            ${activeBtn}
                            <button onclick="window.editUserList('${l.id}')" class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none transition-colors">Editar</button>
                            <button onclick="window.deleteUserList('${l.id}')" class="px-2.5 py-1.5 bg-red-900/20 hover:bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Excluir</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };

    const resetForm = () => {
        _editingUserListId = null;
        if (formTitle) formTitle.textContent = '➕ Adicionar Nova Lista IPTV';
        if (submitBtn) {
            submitBtn.textContent = '💾 Salvar Lista';
            submitBtn.className = 'neon-btn-primary flex-1 py-3 rounded-lg text-xs border-none font-bold';
        }
        if (cancelBtn) cancelBtn.classList.add('hidden');
        document.getElementById('user-lista-nome').value = '';
        document.getElementById('user-lista-m3u').value = '';
        document.getElementById('user-lista-epg').value = '';
        document.getElementById('user-lista-xtream-server').value = '';
        document.getElementById('user-lista-xtream-user').value = '';
        document.getElementById('user-lista-xtream-pass').value = '';
        document.getElementById('user-lista-epg-only').value = '';
        document.getElementById('user-lista-stalker-server').value = '';
        document.getElementById('user-lista-stalker-mac').value = '';
        document.getElementById('user-lista-tipo').value = 'tv';
        document.getElementById('user-lista-obs').value = '';
        setActiveTabUser('m3u');
    };

    if (cancelBtn) cancelBtn.addEventListener('click', resetForm);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('user-lista-nome').value.trim();
        const tipo = document.getElementById('user-lista-tipo').value;
        const obs = document.getElementById('user-lista-obs').value.trim();

        if (!nome) {
            alert('Por favor, preencha o Nome da Lista lá em cima!');
            return;
        }

        let m3u = '';
        let epg = '';
        let listUser = '';
        let listPass = '';
        let xtreamServer = '';
        let stalkerServer = '';

        if (activeTab === 'm3u') {
            m3u = document.getElementById('user-lista-m3u').value.trim();
            epg = document.getElementById('user-lista-epg').value.trim();
            if (!m3u) {
                alert('O link da playlist M3U é obrigatório para este tipo de conexão.');
                return;
            }
        } else if (activeTab === 'xtream') {
            xtreamServer = document.getElementById('user-lista-xtream-server').value.trim();
            listUser = document.getElementById('user-lista-xtream-user').value.trim();
            listPass = document.getElementById('user-lista-xtream-pass').value.trim();

            if (!xtreamServer || !listUser || !listPass) {
                alert('Todos os campos da API Xtream Codes (Servidor, Usuário e Senha) são obrigatórios.');
                return;
            }

            // Garante formatação adequada do servidor
            let formattedServer = xtreamServer.replace(/\/$/, '');
            if (!formattedServer.startsWith('http://') && !formattedServer.startsWith('https://')) {
                formattedServer = 'http://' + formattedServer;
            }
            xtreamServer = formattedServer;

            // Monta URLs equivalentes
            m3u = `${xtreamServer}/get.php?username=${listUser}&password=${listPass}&type=m3u_plus&output=ts`;
            epg = `${xtreamServer}/xmltv.php?username=${listUser}&password=${listPass}`;
        } else if (activeTab === 'epg') {
            epg = document.getElementById('user-lista-epg-only').value.trim();
            m3u = 'epg_only'; // Marcador de lista que contém apenas guia de programação

            if (!epg) {
                alert('O link do guia de programação EPG é obrigatório.');
                return;
            }
        } else if (activeTab === 'stalker') {
            stalkerServer = document.getElementById('user-lista-stalker-server').value.trim();
            listUser = document.getElementById('user-lista-stalker-mac').value.trim(); // MAC vai no user
            listPass = 'stalker'; // Marcador de tipo stalker
            
            if (!stalkerServer || !listUser) {
                alert('Todos os campos do Stalker Portal (Servidor e Endereço MAC) são obrigatórios.');
                return;
            }

            let formattedServer = stalkerServer.replace(/\/$/, '');
            if (!formattedServer.startsWith('http://') && !formattedServer.startsWith('https://')) {
                formattedServer = 'http://' + formattedServer;
            }
            stalkerServer = formattedServer;
            m3u = stalkerServer; // Usado como canal principal
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Salvando...';

        try {
            const userDocRef = db.collection('users').doc(username);
            
            if (_editingUserListId) {
                // Atualiza lista existente no array
                customLists = customLists.map(l => {
                    if (l.id === _editingUserListId) {
                        return { 
                            ...l, 
                            nome, 
                            m3u, 
                            epg, 
                            tipo, 
                            user: listUser, 
                            pass: listPass, 
                            obs,
                            tipo_conexao: activeTab,
                            xtream_server: xtreamServer,
                            stalker_server: stalkerServer
                        };
                    }
                    return l;
                });
            } else {
                // Adiciona nova lista
                const newList = {
                    id: 'list_' + Date.now(),
                    nome,
                    m3u,
                    epg,
                    tipo,
                    user: listUser,
                    pass: listPass,
                    obs,
                    tipo_conexao: activeTab,
                    xtream_server: xtreamServer,
                    stalker_server: stalkerServer
                };
                customLists.push(newList);
            }

            // Atualiza no Firestore
            await userDocRef.update({
                customLists: customLists
            });

            // Se for a única lista cadastrada, ou se estivermos editando a lista ativa, atualiza também a raiz
            const isActive = _editingUserListId ? (client.m3uUrl === client.customLists?.find(l => l.id === _editingUserListId)?.m3u) : false;
            if (customLists.length === 1 || isActive) {
                const activeList = customLists.find(l => l.m3u === m3u) || customLists[0];
                await userDocRef.update({
                    m3uUrl: activeList.m3u,
                    listName: activeList.nome,
                    epgUrl: activeList.epg || null,
                    iptvListId: null
                });
                client.m3uUrl = activeList.m3u;
                client.listName = activeList.nome;
                client.epgUrl = activeList.epg;
            }

            client.customLists = customLists;
            alert('Lista salva com sucesso!');
            resetForm();
            renderTable();

            // Se a lista foi definida como ativa na raiz (m3uUrl), recarrega para o React carregar!
            if (customLists.length === 1 || isActive) {
                window.location.reload();
            }

        } catch (err) {
            alert('Erro ao salvar lista: ' + err.message);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Expor funções globalmente para o D.O.M.
    window.editUserList = function(id) {
        const l = customLists.find(item => item.id === id);
        if (!l) return;

        _editingUserListId = id;
        document.getElementById('user-lista-nome').value = l.nome || '';
        document.getElementById('user-lista-tipo').value = l.tipo || 'tv';
        document.getElementById('user-lista-obs').value = l.obs || '';

        const tipoConexao = l.tipo_conexao || 'm3u';
        setActiveTabUser(tipoConexao);

        if (tipoConexao === 'm3u') {
            document.getElementById('user-lista-m3u').value = l.m3u || '';
            document.getElementById('user-lista-epg').value = l.epg || '';
        } else if (tipoConexao === 'xtream') {
            document.getElementById('user-lista-xtream-server').value = l.xtream_server || '';
            document.getElementById('user-lista-xtream-user').value = l.user || '';
            document.getElementById('user-lista-xtream-pass').value = l.pass || '';
        } else if (tipoConexao === 'epg') {
            document.getElementById('user-lista-epg-only').value = l.epg || '';
        } else if (tipoConexao === 'stalker') {
            document.getElementById('user-lista-stalker-server').value = l.stalker_server || '';
            document.getElementById('user-lista-stalker-mac').value = l.user || '';
        }

        if (formTitle) formTitle.textContent = `✏️ Editando: ${l.nome}`;
        if (submitBtn) {
            submitBtn.textContent = '💾 Salvar Alterações';
            submitBtn.className = 'neon-btn-success flex-1 py-3 rounded-lg text-xs border-none font-bold';
        }
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.deleteUserList = async function(id) {
        const l = customLists.find(item => item.id === id);
        if (!l) return;

        if (!confirm(`Deseja excluir a lista "${l.nome}"?`)) return;

        try {
            const userDocRef = db.collection('users').doc(username);
            customLists = customLists.filter(item => item.id !== id);

            const updates = { customLists: customLists };

            // Se deletou a lista ativa, reseta os campos raiz de reprodução
            if (client.m3uUrl === l.m3u) {
                if (customLists.length > 0) {
                    updates.m3uUrl = customLists[0].m3u;
                    updates.listName = customLists[0].nome;
                    updates.epgUrl = customLists[0].epg || null;
                    client.m3uUrl = customLists[0].m3u;
                    client.listName = customLists[0].nome;
                    client.epgUrl = customLists[0].epg;
                } else {
                    updates.m3uUrl = null;
                    updates.listName = null;
                    updates.epgUrl = null;
                    client.m3uUrl = null;
                    client.listName = null;
                    client.epgUrl = null;
                }
                updates.iptvListId = null;
            }

            await userDocRef.update(updates);
            client.customLists = customLists;
            alert('Lista excluída com sucesso!');
            renderTable();

        } catch (err) {
            alert('Erro ao excluir lista: ' + err.message);
        }
    };

    window.activateUserList = async function(id) {
        const l = customLists.find(item => item.id === id);
        if (!l) return;

        try {
            const userDocRef = db.collection('users').doc(username);
            
            await userDocRef.update({
                m3uUrl: l.m3u,
                listName: l.nome,
                epgUrl: l.epg || null,
                iptvListId: null
            });

            client.m3uUrl = l.m3u;
            client.listName = l.nome;
            client.epgUrl = l.epg;

            alert(`Lista "${l.nome}" ativada com sucesso! Seu aplicativo carregará essa lista automaticamente.`);
            renderTable();

            // Atualiza localStorage para o player Web/Nativo atual
            const userListKey = `broz_data_${username}`;
            const newList = [{
                id: 'broz_list_brasil_2026_id',
                name: l.nome,
                url: l.m3u,
                epgUrl: l.epg || '',
                date: new Date().toLocaleDateString("pt-BR")
            }];
            localStorage.setItem(userListKey, JSON.stringify(newList));
            localStorage.setItem('broz_data_default', JSON.stringify(newList));

        } catch (err) {
            alert('Erro ao ativar lista: ' + err.message);
        }
    };

    renderTable();
}
}
}
}
