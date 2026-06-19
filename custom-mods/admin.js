/**
 * admin.js — Painel Administrativo de Gestão estilo ClouDDy Console
 */
import { initFirebase } from './firebase.js';

let _cachedClients = [];
let _editingUsername = null;

const ADMIN_PRESET_LISTS = {
    list1: {
        name: 'BrozTV - Grade Completa VIP',
        url: 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/master/CanaisBR01.m3u8'
    },
    list2: {
        name: 'BrozTV - Cine Club VOD',
        url: 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/master/CanaisBR02.m3u8'
    }
};

export function injectAdminDashboardWeb(proxyUrl) {
    if (document.getElementById('broztv-admin-dashboard-web')) return;

    // Oculta a interface original do player React na Web
    // NOTA: Usamos o dashboard como OVERLAY fixed, portanto não aplicamos display: none ao root
    // Isso evita que o React quebre por falta de dimensões (height/width 0) durante a inicialização.

    // Injeta os estilos CSS necessários para o Dashboard Admin
    injectAdminStyles();

    const sessionUser = JSON.parse(localStorage.getItem('broz_session_user') || '{}');
    const adminUser = sessionUser.username || 'evekproducoes';

    const dashboard = document.createElement('div');
    dashboard.id = 'broztv-admin-dashboard-web';
    // Overlay fixed cobrindo toda a tela para não interagir com o render do React
    dashboard.className = 'fixed inset-0 z-[9990] w-full h-full overflow-y-auto bg-[#070c14] text-[#e2e8f0] font-sans flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200';
    document.body.appendChild(dashboard);

    dashboard.innerHTML = `
        <!-- Header Superior -->
        <header class="bg-[#0b111e] text-white h-14 px-6 flex justify-between items-center select-none shadow-md z-30 border-b border-white/5">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-sm text-white shadow-md">
                    A_D
                </div>
                <span class="font-extrabold tracking-wider text-base text-emerald-400">BrozTV <span class="text-white font-normal">Painel Admin</span></span>
            </div>
            <div class="flex items-center gap-4 text-xs font-semibold">
                <span id="admin-db-status" class="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-3 py-1 rounded-full text-[10px] font-bold select-none animate-pulse">
                    ⏳ Carregando...
                </span>
                <span class="text-gray-400 cursor-pointer hover:text-white transition-colors">Português ▼</span>
                <button id="js-admin-logout" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors border-none font-sans">
                    🚪 Sair
                </button>
            </div>
        </header>

        <!-- Corpo Principal (Sidebar + Content) -->
        <div class="flex flex-1 flex-col md:flex-row relative">
            <!-- Sidebar Lateral -->
            <aside class="w-full md:w-60 bg-[#090e1a] border-r border-white/5 flex flex-col justify-between p-4 select-none">
                <div class="flex flex-col gap-1.5" id="js-admin-sidebar-menu">
                    <button data-target="admin-section-mesa" class="admin-sidebar-btn active w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm font-black text-white bg-gradient-to-r from-emerald-500/25 to-teal-500/25 shadow-[0_0_15px_rgba(16,185,129,0.15)] border-l-4 border-l-emerald-500 border-none cursor-pointer font-sans transition-all duration-200">
                        🏠 Início / Resumo
                    </button>
                    <button data-target="admin-section-cadastro" class="admin-sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
                        📝 Cadastrar Usuário
                    </button>
                    <button data-target="admin-section-usuarios" class="admin-sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
                        👥 Usuários Cadastrados
                    </button>
                    <button data-target="admin-section-tarifas" class="admin-sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
                        🎫 Tarifas
                    </button>
                    <button data-target="admin-section-pagamentos" class="admin-sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
                        💳 Pagamentos
                    </button>
                    <button data-target="admin-section-listas" class="admin-sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
                        📡 Listas IPTV
                    </button>
                    <button data-target="admin-section-cupons" class="admin-sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
                        🏷️ Cupons de Desconto
                    </button>
                    <button data-target="admin-section-perfil" class="admin-sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 border-none cursor-pointer transition-all duration-200 font-sans">
                        👤 Perfil Admin
                    </button>
                </div>

                <div class="flex flex-col gap-2 pt-4 mt-6 border-t border-white/5 text-[10px] text-gray-500">
                    <span class="font-bold text-gray-400">BrozTV VIP+ Gestor</span>
                    <span>Firestore Database: <strong class="text-green-500">🟢 Conectado</strong></span>
                </div>
            </aside>

            <!-- Conteúdo Central -->
            <main class="flex-1 p-6 md:p-8 overflow-y-auto" id="js-admin-main-content">
                
                <!-- SEÇÃO 1: MESA (DASHBOARD COM ESTATÍSTICAS E RESUMO DO SISTEMA) -->
                <section id="admin-section-mesa" class="admin-dashboard-section">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-lg font-bold text-white">🏠 Resumo do Sistema</h2>
                        <span class="text-xs text-gray-400 font-semibold">Consolidado em tempo real</span>
                    </div>
                    
                    <!-- Cards Estatísticos Premium (clicáveis) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-8">

                        <!-- Total de Clientes -->
                        <button type="button" data-stat-action="all"
                            class="stat-card group relative glass-card p-5 text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-500/40 overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/8 to-transparent rounded-bl-full pointer-events-none"></div>
                            <div class="flex items-start justify-between mb-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0088cc] to-[#0066aa] flex items-center justify-center shadow-md">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </div>
                                <svg class="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                            <div class="text-3xl font-black text-white mb-1 tracking-tight" id="stat-total">0</div>
                            <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total de Clientes</div>
                            <div class="text-[10px] text-gray-550">Contas registradas no banco</div>
                        </button>

                        <!-- Assinaturas Ativas -->
                        <button type="button" data-stat-action="active"
                            class="stat-card group relative glass-card p-5 text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-green-400/50 overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/8 to-transparent rounded-bl-full pointer-events-none"></div>
                            <div class="flex items-start justify-between mb-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                                <svg class="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                            <div class="text-3xl font-black text-green-400 mb-1 tracking-tight" id="stat-active">0</div>
                            <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assinaturas Ativas</div>
                            <!-- Mini barra de progresso -->
                            <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-700" id="stat-active-bar" style="width:0%"></div>
                            </div>
                            <div class="text-[10px] text-green-400/80 font-semibold mt-1" id="stat-active-perc">0% ativos</div>
                        </button>

                        <!-- Assinaturas Expiradas -->
                        <button type="button" data-stat-action="expired"
                            class="stat-card group relative glass-card p-5 text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-red-400/50 overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/8 to-transparent rounded-bl-full pointer-events-none"></div>
                            <div class="flex items-start justify-between mb-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                </div>
                                <svg class="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                            <div class="text-3xl font-black text-red-400 mb-1 tracking-tight" id="stat-expired">0</div>
                            <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assinaturas Expiradas</div>
                            <!-- Mini barra de progresso -->
                            <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-700" id="stat-expired-bar" style="width:0%"></div>
                            </div>
                            <div class="text-[10px] text-red-400/80 font-semibold mt-1" id="stat-expired-perc">0% expirados</div>
                        </button>

                        <!-- Faturamento -->
                        <button type="button" data-stat-action="payments"
                            class="stat-card group relative glass-card p-5 text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-yellow-400/60 overflow-hidden">
                            <div class="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-yellow-400/15 to-transparent rounded-bl-full pointer-events-none"></div>
                            <div class="flex items-start justify-between mb-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-md shadow-yellow-500/30">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                                </div>
                                <svg class="w-4 h-4 text-gray-500 group-hover:text-yellow-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                            <div class="text-2xl font-black text-yellow-400 mb-1 tracking-tight drop-shadow-sm" id="stat-revenue">R$ 0,00</div>
                            <div class="text-[11px] font-bold text-yellow-200/60 uppercase tracking-wider mb-1">Faturamento (Mês)</div>
                            <div class="text-[10px] text-yellow-200/40">Soma das licenças ativas</div>
                        </button>

                    </div>

                    <!-- Informações do Sistema e Atalhos -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="glass-card p-6">
                            <h4 class="text-sm font-extrabold text-white mb-4 flex items-center gap-2">⚡ Ações Rápidas</h4>
                            <div class="flex flex-col gap-2.5">
                                <button onclick="document.querySelector('[data-target=\'admin-section-cadastro\']').click()" class="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs cursor-pointer transition-all border-none shadow-[0_4px_15px_rgba(16,185,129,0.25)]">
                                    📝 Cadastrar Novo Assinante
                                </button>
                                <button onclick="document.querySelector('[data-target=\'admin-section-usuarios\']').click()" class="w-full py-3.5 bg-[#0b1220] hover:bg-white/5 text-gray-300 border border-white/5 rounded-xl font-bold text-xs cursor-pointer transition-all">
                                    👥 Gerenciar Assinantes Cadastrados
                                </button>
                            </div>
                        </div>
                        <div class="glass-card p-6 flex flex-col justify-between">
                            <div>
                                <h4 class="text-sm font-extrabold text-white mb-4 flex items-center gap-2">🛠️ Status dos Serviços</h4>
                                <div class="flex flex-col gap-2 text-xs">
                                    <div class="flex justify-between items-center py-2.5 border-b border-white/5">
                                        <span class="text-gray-400">Firestore Database</span>
                                        <span class="text-green-400 font-bold flex items-center gap-1">🟢 Conectado</span>
                                    </div>
                                    <div class="flex justify-between items-center py-2.5 border-b border-white/5">
                                        <span class="text-gray-400">Servidor de Transmissão</span>
                                        <span class="text-green-400 font-bold flex items-center gap-1">🟢 Ativo</span>
                                    </div>
                                    <div class="flex justify-between items-center py-2.5">
                                        <span class="text-gray-400">API Mercado Pago</span>
                                        <span class="text-green-400 font-bold flex items-center gap-1">🟢 Operacional</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- SEÇÃO 1.2: CADASTRO DE CLIENTE (TELA INDEPENDENTE) -->
                <section id="admin-section-cadastro" class="admin-dashboard-section hidden">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-lg font-bold text-white" id="admin-form-title">📝 Cadastrar Novo Assinante</h2>
                        <button onclick="document.querySelector('[data-target=\'admin-section-usuarios\']').click()" class="bg-[#0b1220] hover:bg-white/5 border border-white/5 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer">
                            👥 Ver Usuários
                        </button>
                    </div>

                    <!-- Formulário de Cadastro Rápido / Edição -->
                    <div class="glass-card p-6 mb-8 max-w-4xl">
                        <form id="js-admin-register-form" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">E-mail (Login)</label>
                                <input type="email" id="admin-reg-user" class="w-full rounded-lg p-3 text-xs focus:outline-none" placeholder="Ex: joao@gmail.com" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Nome completo</label>
                                <input type="text" id="admin-reg-name" class="w-full rounded-lg p-3 text-xs focus:outline-none" placeholder="Ex: João Silva" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Senha</label>
                                <input type="text" id="admin-reg-pass" class="w-full rounded-lg p-3 text-xs focus:outline-none" placeholder="Ex: 8899" required>
                            </div>

                            <div class="md:col-span-3">
                                <label class="block text-xs font-semibold text-gray-400 mb-1">🎫 Selecionar Plano</label>
                                <select id="admin-reg-plan" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white cursor-pointer font-semibold">
                                    <option value="">— Selecione um plano ou preencha manualmente —</option>
                                    <option value="mensal" data-price="27.75" data-days="30">📅 Mensal · R$ 27,75 · 30 dias</option>
                                    <option value="semestral" data-price="139.90" data-days="180">📆 Semestral · R$ 139,90 · 180 dias</option>
                                    <option value="anual" data-price="239.90" data-days="365">🏆 Anual · R$ 239,90 · 365 dias</option>
                                </select>
                                <p class="text-[10px] text-gray-500 mt-1">Selecionar um plano preenche automaticamente o preço e a data de vencimento.</p>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Preço Cobrado (R$)</label>
                                <input type="number" step="0.01" id="admin-reg-price" class="w-full rounded-lg p-3 text-xs focus:outline-none font-bold text-green-400" value="27.75" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Data de Início</label>
                                <input type="date" id="admin-reg-start" class="w-full rounded-lg p-3 text-xs focus:outline-none text-white bg-[#0b1220]" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Data de Vencimento</label>
                                <input type="date" id="admin-reg-end" class="w-full rounded-lg p-3 text-xs focus:outline-none text-white bg-[#0b1220]" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Tipo de Cadastro</label>
                                <select id="admin-reg-type" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white cursor-pointer font-bold">
                                    <option value="adm">Cadastro ADM (Gerenciado pelo Admin)</option>
                                    <option value="site">Cadastro Site (Gerenciado pelo Assinante)</option>
                                </select>
                            </div>

                            <div class="md:col-span-3 flex flex-col sm:flex-row gap-3 mt-2">
                                <button type="submit" id="js-admin-register-submit" class="neon-btn-primary flex-1 py-3.5 rounded-xl text-xs font-bold border-none">
                                    + Cadastrar Assinante
                                </button>
                                <button type="button" id="js-admin-cancel-edit" class="neon-btn-danger py-3.5 px-6 rounded-xl font-bold text-xs border-none hidden">
                                    Cancelar Edição
                                </button>
                            </div>
                        </form>

                        <div class="flex gap-2 mt-4 flex-wrap items-center" id="js-admin-date-shortcuts">
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prorrogar vencimento:</span>
                            <button data-days="7" class="px-3 py-1.5 bg-[#0b1220] hover:bg-white/5 rounded-lg text-[9px] font-bold border border-white/5 transition-all cursor-pointer text-white">7 Dias</button>
                            <button data-days="15" class="px-3 py-1.5 bg-[#0b1220] hover:bg-white/5 rounded-lg text-[9px] font-bold border border-white/5 transition-all cursor-pointer text-white">15 Dias</button>
                            <button data-days="30" class="px-3 py-1.5 bg-[#0b1220] hover:bg-white/5 rounded-lg text-[9px] font-bold border border-white/5 transition-all cursor-pointer text-white">30 Dias (1 Mês)</button>
                            <button data-days="180" class="px-3 py-1.5 bg-[#0b1220] hover:bg-white/5 rounded-lg text-[9px] font-bold border border-white/5 transition-all cursor-pointer text-white">6 Meses</button>
                            <button data-days="365" class="px-3 py-1.5 bg-[#0b1220] hover:bg-white/5 rounded-lg text-[9px] font-bold border border-white/5 transition-all cursor-pointer text-white">1 Ano</button>
                        </div>
                    </div>
                </section>

                <!-- SEÇÃO 1.3: LISTA DE USUÁRIOS (TELA INDEPENDENTE) -->
                <section id="admin-section-usuarios" class="admin-dashboard-section hidden">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-lg font-bold text-white">👥 Assinantes Cadastrados</h2>
                        <button onclick="document.querySelector('[data-target=\'admin-section-cadastro\']').click()" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-[0_4px_15px_rgba(16,185,129,0.25)]">
                            ➕ Cadastrar Novo Assinante
                        </button>
                    </div>

                    <!-- Lista de Assinantes -->
                    <div class="glass-card p-6">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <h3 class="text-sm font-bold text-white">📋 Assinantes</h3>
                            <div class="flex w-full sm:w-auto gap-2">
                                <input type="text" id="js-admin-search" class="rounded-lg p-2 text-xs focus:outline-none w-full sm:w-64" placeholder="🔍 Buscar por nome ou e-mail...">
                                <select id="js-admin-filter-status" class="rounded-lg p-2 text-xs focus:outline-none cursor-pointer bg-[#0b1220] text-white">
                                    <option value="all">Todos</option>
                                    <option value="active">Ativos</option>
                                    <option value="expired">Vencidos</option>
                                </select>
                            </div>
                        </div>

                        <div class="overflow-x-auto w-full">
                            <table class="w-full text-left border-collapse text-xs text-[#e2e8f0]">
                                <thead>
                                    <tr class="bg-gray-900/40 text-gray-400 border-b border-white/5">
                                        <th class="p-3 font-bold">Status</th>
                                        <th class="p-3 font-bold">Assinante / E-mail</th>
                                        <th class="p-3 font-bold">Preço</th>
                                        <th class="p-3 font-bold">Expiração</th>
                                        <th class="p-3 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="js-admin-table-body">
                                    <tr>
                                        <td colspan="6" class="text-center text-gray-400 py-8">
                                            ⏳ Carregando lista de assinantes...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- SEÇÃO 2: PERFIL DO ADMIN -->
                <section id="admin-section-perfil" class="admin-dashboard-section hidden">
                    <h2 class="text-lg font-bold text-white mb-4">Perfil</h2>
                    
                    <div class="glass-card p-6 max-w-xl">
                        <form id="js-admin-profile-form" class="flex flex-col gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">Administrador</label>
                                <input type="text" id="admin-profile-email" class="w-full bg-slate-900/40 border border-white/5 rounded-lg p-3 text-sm text-gray-500 cursor-not-allowed" readonly>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 font-sans">Senha do Admin</label>
                                <input type="text" id="admin-profile-password" class="w-full rounded-lg p-3 text-sm focus:outline-none" required>
                            </div>
                            <div>
                                <button type="submit" id="js-btn-save-admin-profile" class="neon-btn-success mt-2 rounded-lg px-6 py-3 border-none text-sm">
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </section>

                <!-- SEÇÃO 3: TARIFAS DO ADMIN (EDITÁVEIS) -->
                <section id="admin-section-tarifas" class="admin-dashboard-section hidden">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-lg font-bold text-white">🎫 Tarifas / Planos</h2>
                        <span class="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-3 py-1 rounded-full">Alterações são salvas automaticamente no Firestore</span>
                    </div>

                    <!-- Seletor de Telas nas Tarifas -->
                    <div class="flex gap-2.5 mb-6 bg-[#090e1a] p-1.5 rounded-xl border border-white/5 w-fit select-none">
                        <button type="button" id="js-admin-tarifa-telas-3" class="px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none bg-blue-600 text-white cursor-pointer shadow-md">
                            3 Telas Simultâneas (Padrão)
                        </button>
                        <button type="button" id="js-admin-tarifa-telas-6" class="px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none text-gray-400 hover:text-white cursor-pointer bg-transparent">
                            6 Telas Simultâneas (Dobrado)
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="js-tarifas-grid">

                        <!-- CARD: Plano Mensal -->
                        <div class="glass-card border-2 border-blue-500/25 overflow-hidden flex flex-col justify-between">
                            <div class="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 flex items-center justify-between">
                                <div>
                                    <div class="text-white font-black text-sm uppercase tracking-wider">📅 Mensal</div>
                                    <div class="text-blue-100 text-[10px] font-medium">Plano de 30 dias</div>
                                </div>
                                <div class="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                </div>
                            </div>
                            <form class="tarifa-form p-5 flex flex-col gap-3" data-plan="mensal" data-days="30">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preço (R$)</label>
                                    <input type="number" step="0.01" name="price" class="w-full border border-white/5 rounded-lg p-2.5 text-lg font-black text-blue-400 focus:outline-none text-center" value="27.75" required>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição</label>
                                    <input type="text" name="desc" class="w-full rounded-lg p-2 text-xs focus:outline-none" value="Acesso por 30 dias, 3 dispositivos simultâneos" required>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Limite de Dispositivos</label>
                                    <input type="number" name="devices" class="w-full rounded-lg p-2 text-xs focus:outline-none text-center" value="3" min="1" max="99" required>
                                </div>
                                <button type="submit" class="neon-btn-primary mt-1 w-full py-2.5 rounded-lg text-xs border-none">
                                    💾 Salvar Plano Mensal
                                </button>
                                <div class="tarifa-save-msg text-center text-[10px] text-green-400 font-semibold hidden">✅ Salvo com sucesso!</div>
                            </form>
                        </div>

                        <!-- CARD: Plano Semestral -->
                        <div class="glass-card border-2 border-purple-500/25 overflow-hidden flex flex-col justify-between">
                            <div class="bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-4 flex items-center justify-between">
                                <div>
                                    <div class="text-white font-black text-sm uppercase tracking-wider">📆 Semestral</div>
                                    <div class="text-purple-200 text-[10px] font-medium">Plano de 180 dias</div>
                                </div>
                                <div class="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                </div>
                            </div>
                            <form class="tarifa-form p-5 flex flex-col gap-3" data-plan="semestral" data-days="180">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preço (R$)</label>
                                    <input type="number" step="0.01" name="price" class="w-full border border-white/5 rounded-lg p-2.5 text-lg font-black text-purple-400 focus:outline-none text-center" value="139.90" required>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição</label>
                                    <input type="text" name="desc" class="w-full rounded-lg p-2 text-xs focus:outline-none" value="Acesso por 6 meses, 3 dispositivos simultâneos" required>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Limite de Dispositivos</label>
                                    <input type="number" name="devices" class="w-full rounded-lg p-2 text-xs focus:outline-none text-center" value="3" min="1" max="99" required>
                                </div>
                                <button type="submit" class="neon-btn-primary mt-1 w-full py-2.5 rounded-lg text-xs border-none" style="background: linear-gradient(135deg, #a855f7, #7e22ce) !important; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35) !important;">
                                    💾 Salvar Plano Semestral
                                </button>
                                <div class="tarifa-save-msg text-center text-[10px] text-green-400 font-semibold hidden">✅ Salvo com sucesso!</div>
                            </form>
                        </div>

                        <!-- CARD: Plano Anual -->
                        <div class="glass-card border-2 border-emerald-500/25 overflow-hidden flex flex-col justify-between">
                            <div class="bg-gradient-to-r from-emerald-600 to-emerald-800 px-5 py-4 flex items-center justify-between">
                                <div>
                                    <div class="text-white font-black text-sm uppercase tracking-wider">🏆 Anual</div>
                                    <div class="text-green-100 text-[10px] font-medium">Plano de 365 dias</div>
                                </div>
                                <div class="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                                </div>
                            </div>
                            <form class="tarifa-form p-5 flex flex-col gap-3" data-plan="anual" data-days="365">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preço (R$)</label>
                                    <input type="number" step="0.01" name="price" class="w-full border border-white/5 rounded-lg p-2.5 text-lg font-black text-emerald-400 focus:outline-none text-center" value="239.90" required>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição</label>
                                    <input type="text" name="desc" class="w-full rounded-lg p-2 text-xs focus:outline-none" value="Acesso por 12 meses, 3 dispositivos simultâneos" required>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Limite de Dispositivos</label>
                                    <input type="number" name="devices" class="w-full rounded-lg p-2 text-xs focus:outline-none text-center" value="3" min="1" max="99" required>
                                </div>
                                <button type="submit" class="neon-btn-success mt-1 w-full py-2.5 rounded-lg text-xs border-none">
                                    💾 Salvar Plano Anual
                                </button>
                                <div class="tarifa-save-msg text-center text-[10px] text-green-400 font-semibold hidden">✅ Salvo com sucesso!</div>
                            </form>
                        </div>

                    </div>
                </section>

                <!-- SEÇÃO 4: PAGAMENTOS DO ADMIN (HISTÓRICO DE TRANSACÕES CONSOLIDADO) -->
                <section id="admin-section-pagamentos" class="admin-dashboard-section hidden">
                    <h2 class="text-lg font-bold text-white mb-4">Pagamentos Registrados no Sistema</h2>
                    
                    <div class="glass-card overflow-hidden">
                        <table class="w-full text-left border-collapse text-xs text-[#e2e8f0]">
                            <thead>
                                <tr class="bg-gray-900/40 text-gray-400 border-b border-white/5">
                                    <th class="p-3 font-bold">Transação ID</th>
                                    <th class="p-3 font-bold">Assinante / E-mail</th>
                                    <th class="p-3 font-bold">Valor</th>
                                    <th class="p-3 font-bold">Detalhes</th>
                                    <th class="p-3 font-bold">Tempo de pagamento</th>
                                </tr>
                            </thead>
                            <tbody id="js-admin-pagamentos-table-body">
                                <tr>
                                    <td colspan="5" class="text-center text-gray-400 py-8">
                                        Nenhum pagamento registrado no sistema.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="p-3 bg-gray-900/40 border-t border-white/5 text-[10px] text-gray-400" id="js-admin-pagamentos-total">
                            Total de itens: 0
                        </div>
                    </div>
                </section>

                <!-- SEÇÃO 4.5: CUPONS DE DESCONTO -->
                <section id="admin-section-cupons" class="admin-dashboard-section hidden">
                    <h2 class="text-lg font-bold text-white mb-4">🏷️ Cupons de Desconto</h2>

                    <!-- Formulário de Criação de Cupom -->
                    <div class="glass-card p-6 mb-6 max-w-xl">
                        <h3 class="text-sm font-bold text-white mb-4" id="coupon-form-title">➕ Cadastrar Novo Cupom</h3>
                        <form id="js-coupon-form" class="flex flex-col gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Código do Cupom <span class="text-red-500">*</span></label>
                                <input type="text" id="coupon-code-input" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="Ex: BROZ10" required>
                                <p class="text-[10px] text-gray-500 mt-1">Será convertido automaticamente em letras maiúsculas.</p>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-semibold text-gray-400 mb-1">Tipo de Desconto</label>
                                    <select id="coupon-type-input" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white cursor-pointer font-semibold">
                                        <option value="percentage">Porcentagem (%)</option>
                                        <option value="fixed">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-400 mb-1">Valor do Desconto <span class="text-red-500">*</span></label>
                                    <input type="number" step="0.01" id="coupon-value-input" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="Ex: 10" required>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <input type="checkbox" id="coupon-active-input" class="w-4 h-4 rounded cursor-pointer bg-[#0b1220]" checked>
                                <label for="coupon-active-input" class="text-xs font-semibold text-gray-300 cursor-pointer">Cupom Ativo (Permitir uso no checkout)</label>
                            </div>
                            <button type="submit" id="js-coupon-submit" class="neon-btn-primary py-3.5 rounded-xl text-xs font-bold border-none">
                                💾 Salvar Cupom
                            </button>
                        </form>
                    </div>

                    <!-- Tabela de Cupons Salvos -->
                    <div class="glass-card overflow-hidden">
                        <div class="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 class="text-sm font-bold text-white">📋 Cupons Cadastrados</h3>
                            <span class="text-[10px] text-gray-400 font-bold" id="js-coupons-count">0 cupons</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse text-xs text-[#e2e8f0]">
                                <thead>
                                    <tr class="bg-gray-900/40 text-gray-400 border-b border-white/5">
                                        <th class="p-3 font-bold">Código</th>
                                        <th class="p-3 font-bold">Desconto</th>
                                        <th class="p-3 font-bold">Status</th>
                                        <th class="p-3 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="js-coupons-table-body">
                                    <tr>
                                        <td colspan="4" class="text-center text-gray-400 py-8">⏳ Carregando cupons...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- SEÇÃO 5: LISTAS IPTV -->
                <section id="admin-section-listas" class="admin-dashboard-section hidden">
                    <h2 class="text-lg font-bold text-white mb-4">📡 Listas IPTV</h2>

                    <!-- Formulário de criação / edição de lista -->
                    <div class="glass-card p-6 mb-6">
                        <h3 class="text-sm font-bold text-white mb-4" id="lista-form-title">➕ Adicionar Nova Lista</h3>
                        <form id="js-lista-form" class="flex flex-col gap-4">
                            <!-- Nome da Lista (Geral) -->
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Nome da Lista / Identificação <span class="text-red-500">*</span></label>
                                <input type="text" id="lista-nome" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="Ex: BrozTV – Grade Completa VIP" required>
                            </div>

                            <!-- Abas / Tabs de Seleção de Tipo de Conexão -->
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-2">Selecione o Tipo de Playlist / Conexão</label>
                                <div class="flex flex-wrap gap-2 mb-2" id="admin-connection-tabs">
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
                            <div id="admin-tabs-content">
                                <!-- ABA 1: M3U -->
                                <div id="admin-tab-m3u" class="tab-content grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Link para Playlist M3U / M3U8 <span class="text-red-500">*</span></label>
                                        <input type="url" id="lista-m3u" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="https://...">
                                    </div>
                                    
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Link para Fonte EPG Adicional (Guia de Programação)</label>
                                        <input type="url" id="lista-epg" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="https://... (opcional)">
                                    </div>

                                    <!-- Upload de arquivo local M3U -->
                                    <div class="sm:col-span-2 bg-[#090e1a] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
                                        <div class="text-left">
                                            <span class="text-xs font-bold text-white block">📁 Importar Playlist do Computador (.m3u)</span>
                                            <span class="text-[10px] text-gray-400">Hospede seu arquivo de forma segura na nuvem da BrozTV</span>
                                        </div>
                                        <input type="file" id="js-admin-m3u-file-input" accept=".m3u,.m3u8" class="hidden">
                                        <button type="button" id="js-admin-btn-attach-m3u" class="px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/35 text-blue-300 text-xs font-black rounded-lg cursor-pointer transition-all">
                                            📎 Selecionar Arquivo
                                        </button>
                                    </div>
                                </div>

                                <!-- ABA 2: Xtream Codes -->
                                <div id="admin-tab-xtream" class="tab-content grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">URL do Servidor Xtream Codes <span class="text-red-500">*</span></label>
                                        <input type="url" id="lista-xtream-server" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="Ex: http://servidor.com:8080">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Usuário <span class="text-red-500">*</span></label>
                                        <input type="text" id="lista-xtream-user" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="Seu usuário Xtream">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Senha <span class="text-red-500">*</span></label>
                                        <input type="text" id="lista-xtream-pass" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="Sua senha Xtream">
                                    </div>
                                </div>

                                <!-- ABA 3: Guia EPG (XML) -->
                                <div id="admin-tab-epg" class="tab-content grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Link para Fonte EPG XMLTV (.xml / .xml.gz) <span class="text-red-500">*</span></label>
                                        <input type="url" id="lista-epg-only" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="https://...">
                                    </div>

                                    <!-- Upload de arquivo local XML -->
                                    <div class="sm:col-span-2 bg-[#090e1a] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
                                        <div class="text-left">
                                            <span class="text-xs font-bold text-white block">📁 Importar Guia EPG do Computador (.xml)</span>
                                            <span class="text-[10px] text-gray-400">Hospede seu arquivo .xml ou .xml.gz na nuvem do servidor</span>
                                        </div>
                                        <input type="file" id="js-admin-xml-file-input" accept=".xml,.xml.gz" class="hidden">
                                        <button type="button" id="js-admin-btn-attach-xml" class="px-5 py-2.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/35 text-purple-300 text-xs font-black rounded-lg cursor-pointer transition-all">
                                            📎 Selecionar Arquivo XML
                                        </button>
                                    </div>
                                </div>

                                <!-- ABA 4: Stalker Portal -->
                                <div id="admin-tab-stalker" class="tab-content grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">URL do Portal Stalker <span class="text-red-500">*</span></label>
                                        <input type="url" id="lista-stalker-server" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="Ex: http://stalkerserver.com/c/">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-semibold text-gray-400 mb-1">Endereço MAC (MAC Address) <span class="text-red-500">*</span></label>
                                        <input type="text" id="lista-stalker-mac" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white" placeholder="Ex: 00:1A:79:XX:XX:XX">
                                    </div>
                                </div>
                            </div>

                            <!-- BARRA SEPARADORA HORIZONTAL -->
                            <div class="h-px bg-gradient-to-r from-transparent via-blue-500/35 to-transparent my-4"></div>

                            <!-- SEÇÃO DE SALVAMENTO / CONFIGURAÇÕES -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-semibold text-gray-400 mb-1">Tipo / Categoria de Conteúdo</label>
                                    <select id="lista-tipo" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white cursor-pointer">
                                        <option value="tv">📺 TV ao Vivo</option>
                                        <option value="vod">🎬 VOD / Filmes</option>
                                        <option value="series">📂 Séries</option>
                                        <option value="misto">🌐 Misto (TV + VOD)</option>
                                    </select>
                                </div>
                                
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-semibold text-gray-400 mb-1">Observações / Notas Internas</label>
                                    <textarea id="lista-obs" rows="2" class="w-full rounded-lg p-3 text-xs focus:outline-none bg-[#0b1220] text-white resize-none" placeholder="Notas internas sobre esta lista (opcional)"></textarea>
                                </div>

                                <div class="sm:col-span-2 flex gap-3 mt-2">
                                    <button type="submit" id="js-lista-submit" class="neon-btn-primary flex-1 py-3.5 rounded-xl text-xs font-bold border-none">
                                        💾 Salvar Lista
                                    </button>
                                    <button type="button" id="js-lista-cancel" class="neon-btn-danger py-3 px-6 rounded-lg font-bold text-xs border-none hidden">
                                        Cancelar Edição
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Tabela de listas salvas -->
                    <div class="glass-card overflow-hidden">
                        <div class="flex justify-between items-center p-4 border-b border-white/5">
                            <h3 class="text-sm font-bold text-white">📋 Listas Cadastradas</h3>
                            <span class="text-[10px] text-gray-400" id="js-lista-count">0 listas</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse text-xs text-[#e2e8f0]">
                                <thead>
                                    <tr class="bg-gray-900/40 text-gray-400 border-b border-white/5">
                                        <th class="p-3 font-bold">Nome</th>
                                        <th class="p-3 font-bold">Tipo</th>
                                        <th class="p-3 font-bold">M3U / Link</th>
                                        <th class="p-3 font-bold">EPG</th>
                                        <th class="p-3 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="js-lista-table-body">
                                    <tr>
                                        <td colspan="5" class="text-center text-gray-400 py-8">⏳ Carregando listas...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    `;

    // Configura datas padrões no formulário (Início: hoje, Término: +30 dias)
    document.getElementById('admin-reg-start').valueAsDate = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    document.getElementById('admin-reg-end').valueAsDate = expiry;

    // Carrega as listas IPTV no dropdown do formulário de cadastro
    loadIptvListsIntoSelect();


    const menuButtons = dashboard.querySelectorAll('.admin-sidebar-btn');
    const sections = dashboard.querySelectorAll('.admin-dashboard-section');

    menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;

            // Remove active style from all buttons
            menuButtons.forEach(b => {
                b.className = 'admin-sidebar-btn w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 border-none cursor-pointer transition-all duration-200 font-sans';
            });
            btn.className = 'admin-sidebar-btn active w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 text-sm font-black text-white bg-gradient-to-r from-emerald-500/25 to-teal-500/25 shadow-[0_0_15px_rgba(16,185,129,0.15)] border-l-4 border-l-emerald-500 border-none cursor-pointer font-sans transition-all duration-200';

            // Hide all sections
            sections.forEach(sec => sec.classList.add('hidden'));

            // Show selected section
            const activeSec = dashboard.querySelector(`#${target}`);
            if (activeSec) activeSec.classList.remove('hidden');

            // Se for a aba de pagamentos do admin, renderiza a lista consolidada
            if (target === 'admin-section-pagamentos') {
                renderAdminAllPayments();
            }

            // Se for a aba de Listas IPTV, carrega as listas
            if (target === 'admin-section-listas') {
                loadIptvLists();
            }

            // Se for a aba de Cupons de Desconto, carrega os cupons
            if (target === 'admin-section-cupons') {
                loadCouponsAdmin();
            }
        });
    });

    // Ouvintes de eventos do formulário e listagem do admin
    setupAdminListeners(proxyUrl, adminUser);

    // Inicia carregamento do Firestore
    loadClients(proxyUrl);
}

// Configura listeners do painel de administração
function setupAdminListeners(proxyUrl, adminUser) {
    // Alternância de abas de telas nas Tarifas
    const btnTelas3 = document.getElementById('js-admin-tarifa-telas-3');
    const btnTelas6 = document.getElementById('js-admin-tarifa-telas-6');

    if (btnTelas3 && btnTelas6) {
        const setTarifaTab = (telas) => {
            adminTarifaTelasActive = telas;
            if (telas === 3) {
                btnTelas3.className = 'px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none bg-blue-600 text-white cursor-pointer shadow-md';
                btnTelas6.className = 'px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none text-gray-400 hover:text-white cursor-pointer bg-transparent';
                
                // Altera os títulos dos cards
                document.querySelectorAll('.tarifa-form').forEach((form, idx) => {
                    const planNames = ['📅 Mensal (3 Telas)', '📆 Semestral (3 Telas)', '🏆 Anual (3 Telas)'];
                    const cardHeader = form.parentElement.querySelector('.text-white.font-black');
                    if (cardHeader) cardHeader.textContent = planNames[idx];
                });
            } else {
                btnTelas6.className = 'px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none bg-blue-600 text-white cursor-pointer shadow-md';
                btnTelas3.className = 'px-5 py-2.5 rounded-lg text-xs font-bold transition-all border-none text-gray-400 hover:text-white cursor-pointer bg-transparent';
                
                // Altera os títulos dos cards
                document.querySelectorAll('.tarifa-form').forEach((form, idx) => {
                    const planNames = ['📅 Mensal (6 Telas)', '📆 Semestral (6 Telas)', '🏆 Anual (6 Telas)'];
                    const cardHeader = form.parentElement.querySelector('.text-white.font-black');
                    if (cardHeader) cardHeader.textContent = planNames[idx];
                });
            }
            loadPlansIntoAdminDashboard();
        };

        btnTelas3.addEventListener('click', () => setTarifaTab(3));
        btnTelas6.addEventListener('click', () => setTarifaTab(6));
    }

    // Submissão do formulário de Cupons
    const couponForm = document.getElementById('js-coupon-form');
    if (couponForm) {
        couponForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('js-coupon-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Salvando...';

            const codeInput = document.getElementById('coupon-code-input');
            const typeInput = document.getElementById('coupon-type-input');
            const valueInput = document.getElementById('coupon-value-input');
            const activeInput = document.getElementById('coupon-active-input');

            const code = codeInput.value.trim().toUpperCase();
            const discountType = typeInput.value;
            const discountValue = parseFloat(valueInput.value);
            const active = activeInput.checked;

            if (!code || isNaN(discountValue)) {
                alert('Preencha os campos obrigatórios.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 Salvar Cupom';
                return;
            }

            try {
                const db = await initFirebase();
                if (!db) throw new Error('Sem conexão com o banco.');

                await db.collection('coupons').doc(code).set({
                    id: code,
                    discountType,
                    discountValue,
                    active,
                    createdAt: new Date().toISOString()
                });

                alert(`Cupom "${code}" salvo com sucesso!`);
                
                // Limpa campos
                codeInput.value = '';
                valueInput.value = '';
                activeInput.checked = true;

                loadCouponsAdmin();
            } catch (err) {
                alert('Erro ao salvar cupom: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 Salvar Cupom';
            }
        });
    }

    // Ouvinte do seletor de planos no cadastro para preenchimento automático
    const regPlanSelect = document.getElementById('admin-reg-plan');
    if (regPlanSelect) {
        regPlanSelect.addEventListener('change', () => {
            const selectedOpt = regPlanSelect.options[regPlanSelect.selectedIndex];
            if (!selectedOpt || !selectedOpt.value) return;

            const price = selectedOpt.dataset.price;
            const days = parseInt(selectedOpt.dataset.days);

            const priceInput = document.getElementById('admin-reg-price');
            if (priceInput && price) {
                priceInput.value = price;
            }

            if (days) {
                const today = new Date();
                const futureDate = new Date();
                futureDate.setDate(today.getDate() + days);

                const startInput = document.getElementById('admin-reg-start');
                if (startInput) {
                    startInput.valueAsDate = today;
                }
                const endInput = document.getElementById('admin-reg-end');
                if (endInput) {
                    endInput.valueAsDate = futureDate;
                }
            }
        });
    }

    // Sair do painel
    document.getElementById('js-admin-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.reload();
    });

    // ── Cliques nos cards de estatísticas ─────────────────────────────────────
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const action = card.dataset.statAction;
            const filterSelect = document.getElementById('js-admin-filter-status');
            const proxyUrlRef = proxyUrl;

            if (action === 'payments') {
                // Navega para a aba de Pagamentos
                const paymBtn = document.querySelector('[data-target="admin-section-pagamentos"]');
                if (paymBtn) paymBtn.click();
            } else {
                // Navega para a aba de Usuários Cadastrados
                const usersBtn = document.querySelector('[data-target="admin-section-usuarios"]');
                if (usersBtn) usersBtn.click();

                // Aplica filtro
                if (filterSelect) {
                    filterSelect.value = action === 'active' ? 'active' : action === 'expired' ? 'expired' : 'all';
                    filterAndRenderTable(proxyUrlRef);
                }
            }
        });
    });

    const cancelEditBtn = document.getElementById('js-admin-cancel-edit');

    // Função interna para resetar o form para modo criação
    const resetFormToCreate = () => {
        _editingUsername = null;

        const titleEl = document.getElementById('admin-form-title');
        if (titleEl) titleEl.textContent = '📝 Cadastrar Novo Assinante';

        const submitBtn = document.getElementById('js-admin-register-submit');
        if (submitBtn) {
            submitBtn.textContent = '+ Cadastrar Assinante';
            submitBtn.className = 'flex-1 py-3 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-lg font-bold text-xs cursor-pointer transition-all border-none';
        }

        if (cancelEditBtn) cancelEditBtn.classList.add('hidden');

        // Reabilita o input do e-mail
        const userEl = document.getElementById('admin-reg-user');
        if (userEl) userEl.disabled = false;

        // Limpa os campos
        document.getElementById('admin-reg-user').value = '';
        document.getElementById('admin-reg-name').value = '';
        document.getElementById('admin-reg-pass').value = '';
        document.getElementById('admin-reg-price').value = '27.75';

        document.getElementById('admin-reg-start').valueAsDate = new Date();
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        document.getElementById('admin-reg-end').valueAsDate = expiry;

        // Reseta o select de lista IPTV
        const iptvSel = document.getElementById('admin-reg-iptv-list');
        if (iptvSel) iptvSel.value = '';

        // Reseta o select de tipo de cadastro
        const regTypeEl = document.getElementById('admin-reg-type');
        if (regTypeEl) regTypeEl.value = 'adm';
    };

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            resetFormToCreate();
            // Retorna para a aba de usuários cadastrados
            const usersBtn = document.querySelector('[data-target="admin-section-usuarios"]');
            if (usersBtn) usersBtn.click();
        });
    }

    // Atalhos de validade de data
    document.getElementById('js-admin-date-shortcuts').addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const days = parseInt(e.target.dataset.days);
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        document.getElementById('admin-reg-start').valueAsDate = today;
        document.getElementById('admin-reg-end').valueAsDate = futureDate;
    });

    // Submissão do cadastro rápido/edição (direto no Firestore)
    document.getElementById('js-admin-register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('js-admin-register-submit');

        const userVal = document.getElementById('admin-reg-user').value.trim().toLowerCase();
        const nameVal = document.getElementById('admin-reg-name').value.trim();
        const passVal = document.getElementById('admin-reg-pass').value.trim();
        const startVal = document.getElementById('admin-reg-start').value;
        const endVal = document.getElementById('admin-reg-end').value;
        const priceVal = parseFloat(document.getElementById('admin-reg-price').value);
        const regTypeVal = document.getElementById('admin-reg-type').value;
        const planSelectVal = document.getElementById('admin-reg-plan').value;

        // Lê a lista IPTV selecionada (pode estar vazia se "Sem lista")
        const iptvListSelect = document.getElementById('admin-reg-iptv-list');
        const iptvListId = iptvListSelect ? iptvListSelect.value : '';
        const iptvListData = iptvListId
            ? JSON.parse(iptvListSelect.options[iptvListSelect.selectedIndex]?.dataset?.list || 'null')
            : null;

        if (userVal.length < 4 || passVal.length < 4) {
            alert('E-mail e senha devem possuir pelo menos 4 caracteres.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Salvando...';

        try {
            const db = await initFirebase();
            if (!db) throw new Error('Não foi possível conectar ao banco de dados Firestore.');

            const userDocRef = db.collection('users').doc(userVal);
            const doc = await userDocRef.get();

            let clientPayload = {};
            if (doc.exists) {
                const existingData = doc.data();
                clientPayload = {
                    ...existingData,
                    password: passVal,
                    name: nameVal,
                    email: userVal,
                    startDate: startVal,
                    endDate: endVal,
                    price: priceVal,
                    registrationType: regTypeVal,
                    plan: planSelectVal || existingData.plan || 'mensal',
                    // Atualiza lista apenas se uma foi selecionada explicitamente
                    ...(iptvListData ? {
                        m3uUrl: iptvListData.m3u || '',
                        listName: iptvListData.nome || '',
                        epgUrl: iptvListData.epg || '',
                        iptvListId: iptvListId
                    } : iptvListId === '' ? {
                        m3uUrl: null,
                        listName: null,
                        epgUrl: null,
                        iptvListId: null
                    } : {}),
                    updatedAt: new Date().toISOString()
                };
            } else {
                clientPayload = {
                    id: 'client_' + Date.now(),
                    username: userVal,
                    name: nameVal,
                    email: userVal,
                    password: passVal,
                    pin: '0000',
                    timezone: 'America/Sao_Paulo',
                    payments: [],
                    startDate: startVal,
                    endDate: endVal,
                    price: priceVal,
                    recurrence: 'mensal',
                    plan: planSelectVal || 'mensal',
                    isActive: true,
                    registrationType: regTypeVal,
                    allowDownload: true,
                    allowTvPairing: true,
                    allowAdultContent: true,
                    allowThemeChange: true,
                    maxDevices: 3,
                    // Lista atribuída pelo admin (ou null = usuário cadastra a própria)
                    m3uUrl: iptvListData ? (iptvListData.m3u || null) : null,
                    listName: iptvListData ? (iptvListData.nome || null) : null,
                    epgUrl: iptvListData ? (iptvListData.epg || null) : null,
                    iptvListId: iptvListId || null,
                    createdAt: new Date().toISOString()
                };
            }

            await userDocRef.set(clientPayload);
            alert(`Assinante ${userVal} salvo com sucesso!`);

            // Reseta e recarrega
            resetFormToCreate();
            loadClients(proxyUrl);

            // Redireciona para a lista de usuários para visualizar a conta
            const usersBtn = document.querySelector('[data-target="admin-section-usuarios"]');
            if (usersBtn) usersBtn.click();

        } catch (err) {
            alert(err.message || 'Erro ao cadastrar ou salvar alterações.');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ─── Listeners da seção Listas IPTV ────────────────────────────────────────
    let _editingListId = null;

    // Lógica para importar arquivo M3U local do computador
    const fileInput = document.getElementById('js-admin-m3u-file-input');
    const attachBtn = document.getElementById('js-admin-btn-attach-m3u');

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
                            username: adminUser,
                            fileName: file.name,
                            content: content
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Falha ao enviar arquivo M3U ao servidor.');
                    }

                    const resData = await response.json();
                    if (resData.success && resData.url) {
                        const m3uInput = document.getElementById('lista-m3u');
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
            };
            reader.onerror = () => {
                alert('Erro ao ler arquivo local.');
                attachBtn.disabled = false;
                attachBtn.textContent = originalText;
                fileInput.value = '';
            };
            reader.readAsText(file);
        };
    }

    // ── Lógica de Abas de Conexão (IPTV Lists) ─────────────────────────
    let activeTab = 'm3u';

    function setActiveTabAdmin(tabName) {
        activeTab = tabName;
        const tabs = document.querySelectorAll('#admin-connection-tabs .connection-tab-btn');
        tabs.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.className = 'connection-tab-btn active px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-blue-500/35 bg-blue-600/20 text-blue-300 cursor-pointer';
            } else {
                btn.className = 'connection-tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5 bg-[#0b1220] text-gray-400 hover:text-white cursor-pointer';
            }
        });

        const tabContents = {
            m3u: document.getElementById('admin-tab-m3u'),
            xtream: document.getElementById('admin-tab-xtream'),
            epg: document.getElementById('admin-tab-epg'),
            stalker: document.getElementById('admin-tab-stalker')
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
    document.querySelectorAll('#admin-connection-tabs .connection-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveTabAdmin(btn.dataset.tab);
        });
    });

    // Configura o botão de anexo para upload de EPG XML local
    const xmlFileInput = document.getElementById('js-admin-xml-file-input');
    const xmlAttachBtn = document.getElementById('js-admin-btn-attach-xml');
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
                            username: adminUser,
                            fileName: file.name,
                            content: content
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Falha ao enviar arquivo XML ao servidor.');
                    }

                    const resData = await response.json();
                    if (resData.success && resData.url) {
                        const xmlInput = document.getElementById('lista-epg-only');
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

    const resetListForm = () => {
        _editingListId = null;
        const titleEl = document.getElementById('lista-form-title');
        if (titleEl) titleEl.textContent = '➕ Adicionar Nova Lista';
        const submitBtn = document.getElementById('js-lista-submit');
        if (submitBtn) {
            submitBtn.textContent = '💾 Salvar Lista';
            submitBtn.className = 'flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs cursor-pointer transition-all border-none';
        }
        const cancelBtn = document.getElementById('js-lista-cancel');
        if (cancelBtn) cancelBtn.classList.add('hidden');
        document.getElementById('lista-nome').value = '';
        document.getElementById('lista-m3u').value = '';
        document.getElementById('lista-epg').value = '';
        document.getElementById('lista-xtream-server').value = '';
        document.getElementById('lista-xtream-user').value = '';
        document.getElementById('lista-xtream-pass').value = '';
        document.getElementById('lista-epg-only').value = '';
        document.getElementById('lista-stalker-server').value = '';
        document.getElementById('lista-stalker-mac').value = '';
        document.getElementById('lista-tipo').value = 'tv';
        document.getElementById('lista-obs').value = '';
        setActiveTabAdmin('m3u');
    };

    document.getElementById('js-lista-cancel').addEventListener('click', resetListForm);

    document.getElementById('js-lista-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('js-lista-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Salvando...';

        const nome = document.getElementById('lista-nome').value.trim();
        const tipo = document.getElementById('lista-tipo').value;
        const obs = document.getElementById('lista-obs').value.trim();

        let m3u = '';
        let epg = '';
        let listUser = '';
        let listPass = '';
        let xtreamServer = '';
        let stalkerServer = '';

        if (activeTab === 'm3u') {
            m3u = document.getElementById('lista-m3u').value.trim();
            epg = document.getElementById('lista-epg').value.trim();
            if (!m3u) {
                alert('O link da playlist M3U é obrigatório para este tipo de conexão.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 Salvar Lista';
                return;
            }
        } else if (activeTab === 'xtream') {
            xtreamServer = document.getElementById('lista-xtream-server').value.trim();
            listUser = document.getElementById('lista-xtream-user').value.trim();
            listPass = document.getElementById('lista-xtream-pass').value.trim();

            if (!xtreamServer || !listUser || !listPass) {
                alert('Todos os campos da API Xtream Codes (Servidor, Usuário e Senha) são obrigatórios.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 Salvar Lista';
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
            epg = document.getElementById('lista-epg-only').value.trim();
            m3u = 'epg_only'; // Marcador de lista que contém apenas guia de programação

            if (!epg) {
                alert('O link do guia de programação EPG é obrigatório.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 Salvar Lista';
                return;
            }
        } else if (activeTab === 'stalker') {
            stalkerServer = document.getElementById('lista-stalker-server').value.trim();
            listUser = document.getElementById('lista-stalker-mac').value.trim(); // MAC vai no user
            listPass = 'stalker'; // Marcador de tipo stalker
            
            if (!stalkerServer || !listUser) {
                alert('Todos os campos do Stalker Portal (Servidor e Endereço MAC) são obrigatórios.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 Salvar Lista';
                return;
            }

            let formattedServer = stalkerServer.replace(/\/$/, '');
            if (!formattedServer.startsWith('http://') && !formattedServer.startsWith('https://')) {
                formattedServer = 'http://' + formattedServer;
            }
            stalkerServer = formattedServer;
            m3u = stalkerServer; // Usado como canal principal
        }

        try {
            const db = await initFirebase();
            if (!db) throw new Error('Não foi possível conectar ao banco de dados.');

            const listId = _editingListId || ('lista_' + Date.now());
            const payload = {
                id: listId,
                nome,
                m3u,
                epg: epg || '',
                tipo,
                user: listUser || '',
                pass: listPass || '',
                obs: obs || '',
                tipo_conexao: activeTab,
                xtream_server: xtreamServer,
                stalker_server: stalkerServer,
                updatedAt: new Date().toISOString()
            };
            if (!_editingListId) payload.createdAt = new Date().toISOString();

            await db.collection('iptv_lists').doc(listId).set(payload, { merge: true });
            alert(`Lista "${nome}" salva com sucesso!`);
            resetListForm();
            loadIptvLists();
        } catch (err) {
            alert('Erro ao salvar lista: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '💾 Salvar Lista';
        }
    });

    // Expõe funções globais para edição/exclusão das listas via onclick no HTML
    window.adminEditLista = function (listId) {
        initFirebase().then(db => {
            if (!db) return;
            db.collection('iptv_lists').doc(listId).get().then(doc => {
                if (!doc.exists) return;
                const data = doc.data();
                _editingListId = listId;
                
                document.getElementById('lista-nome').value = data.nome || '';
                document.getElementById('lista-tipo').value = data.tipo || 'tv';
                document.getElementById('lista-obs').value = data.obs || '';

                const tipoConexao = data.tipo_conexao || 'm3u';
                setActiveTabAdmin(tipoConexao);

                if (tipoConexao === 'm3u') {
                    document.getElementById('lista-m3u').value = data.m3u || '';
                    document.getElementById('lista-epg').value = data.epg || '';
                } else if (tipoConexao === 'xtream') {
                    document.getElementById('lista-xtream-server').value = data.xtream_server || '';
                    document.getElementById('lista-xtream-user').value = data.user || '';
                    document.getElementById('lista-xtream-pass').value = data.pass || '';
                } else if (tipoConexao === 'epg') {
                    document.getElementById('lista-epg-only').value = data.epg || '';
                } else if (tipoConexao === 'stalker') {
                    document.getElementById('lista-stalker-server').value = data.stalker_server || '';
                    document.getElementById('lista-stalker-mac').value = data.user || '';
                }

                const titleEl = document.getElementById('lista-form-title');
                if (titleEl) titleEl.textContent = `✏️ Editando: ${data.nome}`;
                const submitBtn = document.getElementById('js-lista-submit');
                if (submitBtn) {
                    submitBtn.textContent = '💾 Salvar Alterações';
                    submitBtn.className = 'flex-1 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer transition-all border-none';
                }
                const cancelBtn = document.getElementById('js-lista-cancel');
                if (cancelBtn) cancelBtn.classList.remove('hidden');

                document.getElementById('lista-form-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    };

    window.adminDeleteLista = async function (listId, nome) {
        if (!confirm(`Deseja excluir permanentemente a lista "${nome}"?`)) return;
        try {
            const db = await initFirebase();
            if (!db) throw new Error('Sem conexão com o banco.');
            await db.collection('iptv_lists').doc(listId).delete();
            alert(`Lista "${nome}" excluída com sucesso!`);
            loadIptvLists();
        } catch (err) {
            alert('Erro ao excluir: ' + err.message);
        }
    };

    // Perfil do Admin
    document.getElementById('admin-profile-email').value = adminUser;

    // Busca senha do admin para exibir
    initFirebase().then(db => {
        if (!db) return;
        db.collection('users').doc(adminUser).get().then(doc => {
            if (doc.exists) {
                document.getElementById('admin-profile-password').value = doc.data().password || '';
            }
        });
    });

    const adminProfileForm = document.getElementById('js-admin-profile-form');
    adminProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSave = document.getElementById('js-btn-save-admin-profile');
        btnSave.disabled = true;
        btnSave.textContent = 'Salvando...';

        try {
            const passVal = document.getElementById('admin-profile-password').value.trim();
            const db = await initFirebase();
            if (!db) throw new Error('Falha ao conectar no banco.');

            await db.collection('users').doc(adminUser).update({
                password: passVal
            });

            // Atualiza localStorage
            localStorage.setItem('broz_saved_credentials', JSON.stringify({ u: adminUser, p: passVal }));
            alert('Perfil do administrador atualizado com sucesso!');
        } catch (err) {
            alert('Erro: ' + err.message);
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = 'Salvar Alterações';
        }
    });

    // Listener das tarifas (Mensal, Semestral, Anual)
    document.querySelectorAll('.tarifa-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const plan = form.dataset.plan;
            const days = parseInt(form.dataset.days);
            const price = parseFloat(form.querySelector('input[name="price"]').value);
            const desc = form.querySelector('input[name="desc"]').value.trim();
            const devices = parseInt(form.querySelector('input[name="devices"]').value);
            const msgEl = form.querySelector('.tarifa-save-msg');

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Salvando...';
            if (msgEl) msgEl.classList.add('hidden');

            try {
                const db = await initFirebase();
                if (!db) throw new Error('Não foi possível conectar ao banco de dados.');

                await db.collection('plans').doc(plan).set({
                    id: plan,
                    name: plan.charAt(0).toUpperCase() + plan.slice(1),
                    price,
                    desc,
                    devices,
                    days,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                if (msgEl) {
                    msgEl.classList.remove('hidden');
                    setTimeout(() => msgEl.classList.add('hidden'), 3000);
                }
                alert(`Plano ${plan.toUpperCase()} atualizado com sucesso!`);
                loadPlansIntoAdminDashboard();
            } catch (err) {
                alert('Erro ao salvar plano: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    });

    // Campo de busca com debounce simples
    let searchTimeout;
    document.getElementById('js-admin-search').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => filterAndRenderTable(proxyUrl), 250);
    });

    // Filtro de status
    document.getElementById('js-admin-filter-status').addEventListener('change', () => {
        filterAndRenderTable(proxyUrl);
    });

    // Vincula o cancelador de edição de forma global
    window.adminGestorCancelEdit = resetFormToCreate;
}

// Carrega dados da coleção clients do Firestore
async function loadClients(proxyUrl) {
    const statusBadge = document.getElementById('admin-db-status');
    loadPlansIntoAdminDashboard();
    try {
        const db = await initFirebase();
        if (!db) throw new Error('Não foi possível inicializar Firestore no cliente.');

        const snapshot = await db.collection('users').get();
        const clientsList = [];
        snapshot.forEach(doc => {
            clientsList.push({ id: doc.id, ...doc.data() });
        });

        _cachedClients = clientsList.filter(c => c.username !== 'admin' && c.username !== 'evekproducoes');

        if (statusBadge) {
            statusBadge.textContent = `✅ Banco ativo: ${_cachedClients.length} clientes`;
            statusBadge.className = 'bg-[#2ca01c] text-white px-3 py-1 rounded-full text-[10px] font-bold select-none';
        }

        renderStats();
        filterAndRenderTable(proxyUrl);

    } catch (e) {
        console.error('[Admin Panel] Falha ao carregar dados:', e);
        if (statusBadge) {
            statusBadge.textContent = '❌ Erro de conexão';
            statusBadge.className = 'bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-bold select-none';
        }
    }
}

// Renderiza os painéis numéricos de estatísticas
function renderStats() {
    const total = _cachedClients.length;
    const todayStr = new Date().toISOString().split('T')[0];

    const active = _cachedClients.filter(c => c.isActive && c.endDate >= todayStr).length;
    const expired = total - active;

    const activePerc = total > 0 ? Math.round((active / total) * 100) : 0;
    const expiredPerc = total > 0 ? Math.round((expired / total) * 100) : 0;

    const revenue = _cachedClients
        .filter(c => c.isActive && c.endDate >= todayStr)
        .reduce((acc, c) => acc + (parseFloat(c.price) || 27.75), 0);

    const totalEl = document.getElementById('stat-total');
    const activeEl = document.getElementById('stat-active');
    const activePercEl = document.getElementById('stat-active-perc');
    const activeBar = document.getElementById('stat-active-bar');
    const expiredEl = document.getElementById('stat-expired');
    const expiredPercEl = document.getElementById('stat-expired-perc');
    const expiredBar = document.getElementById('stat-expired-bar');
    const revenueEl = document.getElementById('stat-revenue');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (activePercEl) activePercEl.textContent = `${activePerc}% ativos`;
    if (expiredEl) expiredEl.textContent = expired;
    if (expiredPercEl) expiredPercEl.textContent = `${expiredPerc}% vencidos`;
    if (revenueEl) revenueEl.textContent = `R$ ${revenue.toFixed(2).replace('.', ',')}`;

    // Anima barras de progresso com leve delay para suavidade
    setTimeout(() => {
        if (activeBar) activeBar.style.width = `${activePerc}%`;
        if (expiredBar) expiredBar.style.width = `${expiredPerc}%`;
    }, 120);
}

// Filtra a lista com base na busca/status e renderiza na tabela
function filterAndRenderTable(proxyUrl) {
    const tbody = document.getElementById('js-admin-table-body');
    if (!tbody) return;

    const query = document.getElementById('js-admin-search').value.toLowerCase().trim();
    const filter = document.getElementById('js-admin-filter-status').value;
    const todayStr = new Date().toISOString().split('T')[0];

    let filtered = [..._cachedClients];

    // Filtro por busca de texto
    if (query) {
        filtered = filtered.filter(c =>
            (c.username || '').toLowerCase().includes(query) ||
            (c.name || '').toLowerCase().includes(query) ||
            (c.id || '').toLowerCase().includes(query)
        );
    }

    // Filtro por status
    if (filter === 'active') {
        filtered = filtered.filter(c => c.isActive && c.endDate >= todayStr);
    } else if (filter === 'expired') {
        filtered = filtered.filter(c => !c.isActive || c.endDate < todayStr);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-gray-500 py-8 text-xs font-semibold">
                    Nenhum assinante encontrado para o filtro atual.
                </td>
            </tr>
        `;
        return;
    }

    // Ordenar de forma que os expirados fiquem em cima, ou por ordem alfabética do usuário
    filtered.sort((a, b) => {
        const aActive = a.isActive && a.endDate >= todayStr;
        const bActive = b.isActive && b.endDate >= todayStr;
        if (aActive !== bActive) return aActive ? 1 : -1; // inativos em cima
        return (a.name || a.username || '').localeCompare(b.name || b.username || '');
    });

    tbody.innerHTML = filtered.map(client => {
        const isExpired = !client.isActive || client.endDate < todayStr;
        const statusClass = isExpired ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
        const statusLabel = isExpired ? '🔴 Expirado' : '🟢 Ativo';

        const isSite = client.registrationType === 'site';
        const typeClass = isSite ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400';
        const typeLabel = isSite ? '🌐 Site' : '👤 ADM';

        const price = parseFloat(client.price) || 27.75;
        const endFormatted = (client.endDate || '----/--/--').split('-').reverse().join('/');

        // Link rápido de cobrança WhatsApp
        const phoneClean = (client.phone || '').replace(/\D/g, '');
        const msg = encodeURIComponent(`Olá! A validade da sua assinatura BrozTV VIP+ vence no dia ${endFormatted}. Acesse o aplicativo ou o nosso portal web para renovar: https://broztv.web.app/`);
        const waLink = phoneClean ? `https://wa.me/55${phoneClean}?text=${msg}` : `https://wa.me/?text=${msg}`;

        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td class="p-3 align-middle">
                    <div class="flex flex-col gap-1.5 items-start">
                        <span class="px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase ${statusClass}">
                            ${statusLabel}
                        </span>
                        <span class="px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase ${typeClass}">
                            ${typeLabel}
                        </span>
                    </div>
                </td>
                <td class="p-3 align-middle">
                    <div class="font-bold text-white text-xs">${client.name || 'Sem Nome'}</div>
                    <div class="text-[10px] text-gray-400 font-mono">${client.username}</div>
                    <div class="text-[9px] text-gray-500">Senha: <strong class="text-gray-300 select-all font-mono">${client.password}</strong> | PIN: <strong class="text-gray-300 font-mono">${client.pin || '0000'}</strong></div>
                </td>
                <td class="p-3 align-middle font-bold text-xs text-green-400">
                    R$ ${price.toFixed(2).replace('.', ',')}
                </td>
                <td class="p-3 align-middle text-xs text-gray-300 font-medium">
                    <div>${endFormatted}</div>
                    <div class="text-[9px] text-gray-400 uppercase tracking-wider">${calculateDaysText(client.endDate, isExpired)}</div>
                </td>
                <td class="p-3 align-middle text-right">
                    <div class="flex gap-1.5 justify-end">
                        <button onclick="window.adminGestorEdit('${client.username}')" class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all">
                            Editar
                        </button>
                        <button onclick="window.adminGestorRenew('${client.username}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer border-none transition-all">
                            +30d
                        </button>
                        <a href="${waLink}" target="_blank" class="px-2.5 py-1.5 bg-green-950/20 hover:bg-green-950/40 border border-green-500/30 text-green-400 rounded-lg text-[10px] font-black cursor-pointer transition-all text-decoration-none inline-flex items-center justify-center">
                            Cobrar-Whats
                        </a>
                        <a href="mailto:${client.username}?subject=Aviso Assinatura BrozTV&body=${msg}" target="_blank" class="px-2.5 py-1.5 bg-blue-950/20 hover:bg-blue-950/40 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-black cursor-pointer transition-all text-decoration-none inline-flex items-center justify-center">
                            Cobrar-Email
                        </a>
                        <button onclick="window.adminGestorDelete('${client.username}')" class="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold cursor-pointer transition-all">
                            Excluir
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Helper para calcular a diferença de dias
function calculateDaysText(dateStr, isExpired) {
    if (!dateStr) return '';
    const end = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isExpired) {
        return diffDays === 0 ? 'Vence hoje!' : `Vencido há ${Math.abs(diffDays)}d`;
    }
    return diffDays === 0 ? 'Vence hoje!' : `Faltam ${diffDays} dias`;
}

// Renderiza a listagem unificada de pagamentos de todos os clientes no sistema
function renderAdminAllPayments() {
    const tbody = document.getElementById('js-admin-pagamentos-table-body');
    const totalEl = document.getElementById('js-admin-pagamentos-total');
    if (!tbody) return;

    let allPayments = [];
    _cachedClients.forEach(c => {
        const username = c.username || c.email || 'Cliente';
        const name = c.name || username;
        const payments = c.payments || [];
        payments.forEach(p => {
            allPayments.push({
                ...p,
                username,
                name
            });
        });
    });

    if (allPayments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-gray-400 py-8">
                    Nenhum pagamento registrado no sistema.
                </td>
            </tr>
        `;
        if (totalEl) totalEl.textContent = 'Total de itens: 0';
        return;
    }

    // Ordenar por data decrescente de transação
    allPayments.sort((a, b) => b.id.localeCompare(a.id));

    tbody.innerHTML = allPayments.map(p => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="p-3 font-mono text-blue-400 font-semibold">${p.id}</td>
            <td class="p-3">
                <div class="font-bold text-white">${p.name}</div>
                <div class="text-[10px] text-gray-400 font-mono">${p.username}</div>
            </td>
            <td class="p-3 font-bold text-green-400">${p.amount}</td>
            <td class="p-3 text-gray-300">${p.details}</td>
            <td class="p-3 text-gray-400">${p.timestamp}</td>
        </tr>
    `).join('');

    if (totalEl) totalEl.textContent = `Total de itens: ${allPayments.length}`;
}

// Preenche o dropdown de Lista IPTV no formulário de cadastro
async function loadIptvListsIntoSelect() {
    const sel = document.getElementById('admin-reg-iptv-list');
    if (!sel) return;

    try {
        const db = await initFirebase();
        if (!db) return;

        const snapshot = await db.collection('iptv_lists').get();
        const listas = [];
        snapshot.forEach(doc => listas.push(doc.data()));

        // Remove opções antigas exceto a primeira (Sem lista)
        while (sel.options.length > 1) sel.remove(1);

        const tipoEmoji = { tv: '📺', vod: '🎬', series: '📂', misto: '🌐' };

        listas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        listas.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = `${tipoEmoji[l.tipo] || '📡'} ${l.nome}`;
            // Armazena os dados completos no data attribute para recuperar no submit
            opt.dataset.list = JSON.stringify({ id: l.id, nome: l.nome, m3u: l.m3u, epg: l.epg || '', tipo: l.tipo });
            sel.appendChild(opt);
        });
    } catch (err) {
        console.warn('[Admin] Não foi possível carregar listas IPTV no select:', err.message);
    }
}

// Carrega as listas IPTV da coleção iptv_lists do Firestore
async function loadIptvLists() {
    const tbody = document.getElementById('js-lista-table-body');
    const countEl = document.getElementById('js-lista-count');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-400 py-8">⏳ Carregando listas...</td></tr>`;

    try {
        const db = await initFirebase();
        if (!db) throw new Error('Sem conexão.');

        const snapshot = await db.collection('iptv_lists').get();
        const listas = [];
        snapshot.forEach(doc => listas.push(doc.data()));

        if (countEl) countEl.textContent = `${listas.length} lista${listas.length !== 1 ? 's' : ''}`;

        if (listas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-400 py-8">Nenhuma lista cadastrada ainda. Use o formulário acima para adicionar.</td></tr>`;
            return;
        }

        // Ordena por nome
        listas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

        const tipoLabel = { tv: '📺 TV ao Vivo', vod: '🎬 VOD', series: '📂 Séries', misto: '🌐 Misto' };

        tbody.innerHTML = listas.map(l => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td class="p-3 align-middle">
                    <div class="font-bold text-white text-xs">${l.nome || '-'}</div>
                    ${l.obs ? `<div class="text-[10px] text-gray-400 mt-0.5">${l.obs}</div>` : ''}
                </td>
                <td class="p-3 align-middle">
                    <span class="px-2 py-0.5 bg-blue-950/20 border border-blue-500/30 rounded text-[10px] font-bold text-blue-400">${tipoLabel[l.tipo] || l.tipo || '-'}</span>
                </td>
                <td class="p-3 align-middle">
                    <div class="text-[10px] font-mono text-blue-400 max-w-[220px] truncate" title="${l.m3u || ''}">${l.m3u || '-'}</div>
                    ${l.user ? `<div class="text-[9px] text-gray-400">User: <strong class="text-gray-300">${l.user}</strong></div>` : ''}
                    ${l.pass ? `<div class="text-[9px] text-gray-400">Pass: <strong class="text-gray-300">${l.pass}</strong></div>` : ''}
                </td>
                <td class="p-3 align-middle">
                    ${l.epg
                ? `<div class="text-[10px] font-mono text-purple-400 max-w-[180px] truncate" title="${l.epg}">${l.epg}</div>`
                : `<span class="text-[10px] text-gray-400">—</span>`
            }
                </td>
                <td class="p-3 align-middle text-right">
                    <div class="flex gap-1.5 justify-end">
                        <button onclick="adminEditLista('${l.id}')" class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all">Editar</button>
                        <button onclick="adminDeleteLista('${l.id}', '${(l.nome || '').replace(/'/g, "\\'")}')"
                            class="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold cursor-pointer transition-all">Excluir</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-red-400 py-8">Erro ao carregar listas: ${err.message}</td></tr>`;
    }
}

// Injeta estilos básicos
function injectAdminStyles() {
    if (document.getElementById('clouddy-admin-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'clouddy-admin-dashboard-styles';
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;900&display=swap');
        
        body {
            background-color: #070c14 !important;
            font-family: 'Outfit', sans-serif !important;
        }
        #broztv-admin-dashboard-web {
            background-color: #070c14 !important;
            color: #e2e8f0 !important;
            font-family: 'Outfit', sans-serif !important;
        }
        #broztv-admin-dashboard-web select,
        #broztv-admin-dashboard-web input[type="date"] {
            color-scheme: dark !important;
        }
        
        /* Formulários e Inputs */
        #broztv-admin-dashboard-web input:not([type="checkbox"]):not([type="radio"]), 
        #broztv-admin-dashboard-web select, 
        #broztv-admin-dashboard-web textarea {
            background-color: #0b1220 !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
            outline: none !important;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5) !important;
            transition: all 0.3s ease !important;
            font-family: 'Outfit', sans-serif !important;
        }
        #broztv-admin-dashboard-web input:not([type="checkbox"]):not([type="radio"]):focus, 
        #broztv-admin-dashboard-web select:focus, 
        #broztv-admin-dashboard-web textarea:focus {
            border-color: rgba(16, 185, 129, 0.8) !important;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(0, 0, 0, 0.6) !important;
        }
        
        /* Cards de Vidro (Glassmorphism) */
        #broztv-admin-dashboard-web .glass-card {
            background: rgba(13, 20, 35, 0.7) !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.45) !important;
            backdrop-filter: blur(16px) !important;
            border-radius: 1rem !important;
            transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
        }
        #broztv-admin-dashboard-web .glass-card:hover {
            border-color: rgba(16, 185, 129, 0.2) !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55), 0 0 20px rgba(16, 185, 129, 0.05) !important;
        }
        
        /* Botões neon */
        #broztv-admin-dashboard-web .neon-btn-primary {
            background: linear-gradient(135deg, #10b981, #059669) !important;
            color: white !important;
            font-weight: 700 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35) !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
            font-family: 'Outfit', sans-serif !important;
        }
        #broztv-admin-dashboard-web .neon-btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #34d399, #10b981) !important;
            box-shadow: 0 6px 22px rgba(16, 185, 129, 0.55) !important;
            transform: translateY(-1px) !important;
        }
        #broztv-admin-dashboard-web .neon-btn-primary:disabled {
            background: #1e293b !important;
            color: #64748b !important;
            border-color: #334155 !important;
            box-shadow: none !important;
            cursor: not-allowed !important;
        }
        
        #broztv-admin-dashboard-web .neon-btn-success {
            background: linear-gradient(135deg, #059669, #10b981) !important;
            color: white !important;
            font-weight: 700 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35) !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
            font-family: 'Outfit', sans-serif !important;
        }
        #broztv-admin-dashboard-web .neon-btn-success:hover {
            background: linear-gradient(135deg, #10b981, #34d399) !important;
            box-shadow: 0 6px 22px rgba(16, 185, 129, 0.55) !important;
            transform: translateY(-1px) !important;
        }
        
        #broztv-admin-dashboard-web .neon-btn-danger {
            background: linear-gradient(135deg, #b91c1c, #dc2626) !important;
            color: white !important;
            font-weight: 700 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3) !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
            font-family: 'Outfit', sans-serif !important;
        }
        #broztv-admin-dashboard-web .neon-btn-danger:hover {
            background: linear-gradient(135deg, #dc2626, #f87171) !important;
            box-shadow: 0 6px 20px rgba(220, 38, 38, 0.45) !important;
            transform: translateY(-1px) !important;
        }

        /* Custom Scrollbar */
        #broztv-admin-dashboard-web ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        #broztv-admin-dashboard-web ::-webkit-scrollbar-track {
            background: #070c14;
        }
        #broztv-admin-dashboard-web ::-webkit-scrollbar-thumb {
            background: rgba(16, 185, 129, 0.2);
            border-radius: 999px;
        }
        #broztv-admin-dashboard-web ::-webkit-scrollbar-thumb:hover {
            background: rgba(16, 185, 129, 0.4);
        }
    `;
    document.head.appendChild(style);
}

// Atribui funções globais de edit, renew, delete
window.adminGestorEdit = function (username) {
    const client = _cachedClients.find(c => c.username === username);
    if (!client) return;

    _editingUsername = username;

    // Atualiza título do form e botões
    const formTitle = document.getElementById('admin-form-title');
    if (formTitle) formTitle.textContent = `📝 Editar Assinante: ${client.name || client.username}`;

    const submitBtn = document.getElementById('js-admin-register-submit');
    if (submitBtn) {
        submitBtn.textContent = '💾 Salvar Alterações';
        submitBtn.className = 'flex-1 py-3 bg-[#2ca01c] hover:bg-green-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-all border-none';
    }

    const cancelBtn = document.getElementById('js-admin-cancel-edit');
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    // Preenche os inputs
    const userEl = document.getElementById('admin-reg-user');
    if (userEl) {
        userEl.value = client.username;
        userEl.disabled = true;
    }

    const nameEl = document.getElementById('admin-reg-name');
    if (nameEl) nameEl.value = client.name || '';

    const passEl = document.getElementById('admin-reg-pass');
    if (passEl) passEl.value = client.password || '';

    const priceEl = document.getElementById('admin-reg-price');
    if (priceEl) priceEl.value = client.price || '27.75';

    const startEl = document.getElementById('admin-reg-start');
    if (startEl && client.startDate) startEl.value = client.startDate;

    const endEl = document.getElementById('admin-reg-end');
    if (endEl && client.endDate) endEl.value = client.endDate;

    const regTypeEl = document.getElementById('admin-reg-type');
    if (regTypeEl) regTypeEl.value = client.registrationType || 'adm';

    const iptvListSelect = document.getElementById('admin-reg-iptv-list');
    if (iptvListSelect) {
        iptvListSelect.value = client.iptvListId || '';
    }

    // Navega para a aba de Cadastro automaticamente para ver o formulário
    const cadBtn = document.querySelector('[data-target="admin-section-cadastro"]');
    if (cadBtn) {
        cadBtn.click();
    }
};

window.adminGestorRenew = async function (username) {
    if (!confirm(`Deseja adicionar +30 dias de validade e reativar a assinatura do usuário "${username}"?`)) return;

    const proxyUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4000'
        : 'https://api-broztv-vip.onrender.com';

    try {
        const db = await initFirebase();
        if (!db) throw new Error('Não foi possível conectar ao banco de dados Firestore.');

        const userDocRef = db.collection('users').doc(username);
        const doc = await userDocRef.get();
        if (!doc.exists) throw new Error('Usuário não encontrado.');

        const clientData = doc.data();
        const currentEnd = new Date(clientData.endDate);
        const today = new Date();

        const baseDate = currentEnd < today ? today : currentEnd;
        baseDate.setDate(baseDate.getDate() + 30);
        const newEndDate = baseDate.toISOString().split('T')[0];

        // Cria a transação de pagamento correspondente no histórico do usuário
        const newPayment = {
            id: '1' + Math.floor(Math.random() * 900000 + 100000),
            amount: `R$ ${(clientData.price || 27.75).toFixed(2).replace('.', ',')}`,
            details: 'Aprovado pelo Admin (Renovação)',
            timestamp: new Date().toLocaleString('pt-BR') + ' -0300'
        };

        const existingPayments = clientData.payments || [];
        existingPayments.push(newPayment);

        await userDocRef.update({
            isActive: true,
            endDate: newEndDate,
            payments: existingPayments
        });

        alert(`Assinatura de "${username}" renovada com sucesso!`);

        if (_editingUsername === username) {
            if (window.adminGestorCancelEdit) window.adminGestorCancelEdit();
        }

        loadClients(proxyUrl);

    } catch (err) {
        alert(err.message || 'Erro ao efetuar renovação.');
    }
};

window.adminGestorDelete = async function (username) {
    if (!confirm(`⚠️ ALERTA CRÍTICO: Tem certeza absoluta que deseja deletar permanentemente o assinante "${username}" do banco de dados?`)) return;

    const proxyUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4000'
        : 'https://api-broztv-vip.onrender.com';

    try {
        const db = await initFirebase();
        if (!db) throw new Error('Não foi possível conectar ao banco de dados Firestore.');

        const userDocRef = db.collection('users').doc(username);
        const doc = await userDocRef.get();
        if (!doc.exists) throw new Error('Usuário não encontrado.');

        await userDocRef.delete();
        alert(`Assinante "${username}" excluído com sucesso!`);

        if (_editingUsername === username) {
            if (window.adminGestorCancelEdit) window.adminGestorCancelEdit();
        }

        loadClients(proxyUrl);

    } catch (err) {
        alert(err.message || 'Erro ao excluir assinante.');
    }
};

let adminTarifaTelasActive = 3;

async function loadPlansIntoAdminDashboard() {
    try {
        const db = await initFirebase();
        if (!db) return;

        let plans = {};
        try {
            const snapshot = await db.collection('plans').get();
            snapshot.forEach(doc => {
                plans[doc.id] = doc.data();
            });
        } catch (dbErr) {
            console.warn('[Admin] Não foi possível ler planos do banco, usando valores locais:', dbErr.message);
        }

        const is6T = adminTarifaTelasActive === 6;
        const planSuffix = is6T ? '_6t' : '';

        // 1. Atualizar formulários das tarifas no Admin
        const basePlans = ['mensal', 'semestral', 'anual'];
        basePlans.forEach(basePlan => {
            const planKey = basePlan + planSuffix;
            let data = plans[planKey];
            
            // Fallbacks se não existirem no Firestore
            if (!data) {
                if (is6T) {
                    const priceFallback = basePlan === 'mensal' ? 55.50 : basePlan === 'semestral' ? 275.50 : 475.50;
                    const daysFallback = basePlan === 'mensal' ? 30 : basePlan === 'semestral' ? 180 : 365;
                    data = {
                        price: priceFallback,
                        desc: `Acesso por ${daysFallback} dias, até 6 dispositivos simultâneos`,
                        devices: 6,
                        days: daysFallback
                    };
                } else {
                    const priceFallback = basePlan === 'mensal' ? 27.75 : basePlan === 'semestral' ? 137.75 : 237.75;
                    const daysFallback = basePlan === 'mensal' ? 30 : basePlan === 'semestral' ? 180 : 365;
                    data = {
                        price: priceFallback,
                        desc: `Acesso por ${daysFallback} dias, 3 dispositivos simultâneos`,
                        devices: 3,
                        days: daysFallback
                    };
                }
            } else {
                // Auto-correção caso o plano de 6 telas tenha sido salvo acidentalmente com dados de 3 telas
                // Verifica se devices == 3 ou se o preço é igual ao preço original de 3 telas
                const is3TelasPrice = data.price == 27.75 || data.price == 137.75 || data.price == 237.75;
                if (is6T && (data.devices == 3 || data.devices == '3' || is3TelasPrice)) {
                    data.devices = 6;
                    data.price = data.price * 2;
                    if (data.desc) data.desc = data.desc.replace('3 dispositivos', '6 dispositivos');
                }
            }

            // Acha o form correspondente à posição (primeiro = mensal, segundo = semestral, terceiro = anual)
            const forms = document.querySelectorAll('.tarifa-form');
            let form = null;
            if (basePlan === 'mensal') form = forms[0];
            else if (basePlan === 'semestral') form = forms[1];
            else if (basePlan === 'anual') form = forms[2];

            if (form) {
                // Atualiza atributos e valores
                form.dataset.plan = planKey;
                form.querySelector('input[name="price"]').value = data.price;
                form.querySelector('input[name="desc"]').value = data.desc;
                form.querySelector('input[name="devices"]').value = data.devices || (is6T ? 6 : 3);
                
                // Salvar botão text
                const btn = form.querySelector('button[type="submit"]');
                if (btn) {
                    btn.textContent = `💾 Salvar Plano ${basePlan.charAt(0).toUpperCase() + basePlan.slice(1)} ${is6T ? '6 Telas' : '3 Telas'}`;
                }
            }
        });

        // 2. Atualizar dropdown do formulário de cadastro de clientes
        const regPlanSelect = document.getElementById('admin-reg-plan');
        if (regPlanSelect) {
            // Remove opções anteriores exceto a primeira
            while (regPlanSelect.options.length > 1) regPlanSelect.remove(1);

            const planEmojis = { mensal: '📅', semestral: '📆', anual: '🏆' };
            const planNames = { mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual' };
            
            // Adiciona planos de 3 telas
            basePlans.forEach(plan => {
                const planKey = plan;
                const data = plans[planKey] || {
                    price: plan === 'mensal' ? 27.75 : plan === 'semestral' ? 137.75 : 237.75,
                    days: plan === 'mensal' ? 30 : plan === 'semestral' ? 180 : 365,
                    name: planNames[plan]
                };
                const opt = document.createElement('option');
                opt.value = planKey;
                opt.dataset.price = data.price;
                opt.dataset.days = data.days;
                opt.textContent = `${planEmojis[plan] || '🎫'} [3 Telas] ${data.name || planNames[plan]} · R$ ${String(data.price).replace('.', ',')} · ${data.days} dias`;
                regPlanSelect.appendChild(opt);
            });

            // Adiciona planos de 6 telas
            basePlans.forEach(plan => {
                const planKey = plan + '_6t';
                let data = plans[planKey];
                
                // Auto-correção caso exista no banco mas com dados de 3 telas
                if (data) {
                    const is3TelasPrice = data.price == 27.75 || data.price == 137.75 || data.price == 237.75;
                    if (data.devices == 3 || data.devices == '3' || is3TelasPrice) {
                        data.devices = 6;
                        data.price = data.price * 2;
                    }
                }
                
                data = data || {
                    price: plan === 'mensal' ? 55.50 : plan === 'semestral' ? 275.50 : 475.50,
                    days: plan === 'mensal' ? 30 : plan === 'semestral' ? 180 : 365,
                    name: planNames[plan] + ' 6 Telas'
                };
                const opt = document.createElement('option');
                opt.value = planKey;
                opt.dataset.price = data.price;
                opt.dataset.days = data.days;
                opt.textContent = `${planEmojis[plan] || '🎫'} [6 Telas] ${data.name || (planNames[plan] + ' 6 Telas')} · R$ ${String(data.price).replace('.', ',')} · ${data.days} dias`;
                regPlanSelect.appendChild(opt);
            });

            // Adiciona Plano Teste 3 Dias Free
            const testOpt = document.createElement('option');
            testOpt.value = 'teste_3d';
            testOpt.dataset.price = '0.00';
            testOpt.dataset.days = '3';
            testOpt.textContent = '⏱️ [Grátis] Teste 3 Dias Free · R$ 0,00 · 3 dias';
            regPlanSelect.appendChild(testOpt);
        }
    } catch (err) {
        console.warn('[Admin] Erro ao carregar planos do Firestore:', err.message);
    }
}

// Carrega os cupons da coleção coupons do Firestore
async function loadCouponsAdmin() {
    const tbody = document.getElementById('js-coupons-table-body');
    const countEl = document.getElementById('js-coupons-count');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 py-8">⏳ Carregando cupons...</td></tr>`;

    try {
        const db = await initFirebase();
        if (!db) throw new Error('Sem conexão.');

        const snapshot = await db.collection('coupons').get();
        const coupons = [];
        snapshot.forEach(doc => coupons.push({ id: doc.id, ...doc.data() }));

        if (countEl) countEl.textContent = `${coupons.length} cupo${coupons.length !== 1 ? 'ns' : 'm'}`;

        if (coupons.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 py-8">Nenhum cupom cadastrado ainda. Use o formulário acima para adicionar.</td></tr>`;
            return;
        }

        // Ordena por código
        coupons.sort((a, b) => a.id.localeCompare(b.id));

        tbody.innerHTML = coupons.map(c => {
            const statusLabel = c.active ? '🟢 Ativo' : '🔴 Inativo';
            const statusClass = c.active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400';
            const discountLabel = c.discountType === 'percentage' ? `${c.discountValue}%` : `R$ ${parseFloat(c.discountValue).toFixed(2).replace('.', ',')}`;

            return `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td class="p-3 align-middle font-bold text-white text-xs font-mono select-all">${c.id}</td>
                    <td class="p-3 align-middle font-bold text-xs text-blue-400">${discountLabel}</td>
                    <td class="p-3 align-middle">
                        <span class="px-2 py-0.5 border rounded text-[10px] font-bold ${statusClass}">${statusLabel}</span>
                    </td>
                    <td class="p-3 align-middle text-right">
                        <div class="flex gap-1.5 justify-end">
                            <button onclick="adminToggleCoupon('${c.id}', ${c.active})" class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all">
                                ${c.active ? 'Inativar' : 'Ativar'}
                            </button>
                            <button onclick="adminDeleteCoupon('${c.id}')" class="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold cursor-pointer transition-all">Excluir</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-center text-red-400 py-8">Erro ao carregar cupons: ${err.message}</td></tr>`;
    }
}

window.adminToggleCoupon = async function (couponId, currentStatus) {
    try {
        const db = await initFirebase();
        if (!db) throw new Error('Sem conexão.');
        await db.collection('coupons').doc(couponId).update({ active: !currentStatus });
        loadCouponsAdmin();
    } catch (err) {
        alert('Erro ao alterar status do cupom: ' + err.message);
    }
};

window.adminDeleteCoupon = async function (couponId) {
    if (!confirm(`Deseja excluir permanentemente o cupom "${couponId}"?`)) return;
    try {
        const db = await initFirebase();
        if (!db) throw new Error('Sem conexão.');
        await db.collection('coupons').doc(couponId).delete();
        loadCouponsAdmin();
    } catch (err) {
        alert('Erro ao excluir cupom: ' + err.message);
    }
};
