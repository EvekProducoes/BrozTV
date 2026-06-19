/**
 * BrozTV VIP+ | Admin Panel Logic
 * Comunica-se de forma segura com o proxy.js
 */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:4000/api/admin' 
    : 'https://api-broztv-vip.onrender.com/api/admin';

// Estado global
let adminKey = sessionStorage.getItem('broz_admin_key');
let clientsData = [];

// Elementos da UI
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('admin-login-form');
const passInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const loginSpinner = document.getElementById('login-spinner');
const logoutBtn = document.getElementById('btn-logout');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (adminKey) {
        verifyAndLoad();
    }
});

// Evento de Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = passInput.value.trim();
    if (!pass) return;

    loginSpinner.classList.remove('hidden');
    loginError.classList.add('hidden');
    
    adminKey = pass;
    const success = await verifyAndLoad();
    
    loginSpinner.classList.add('hidden');
    
    if (!success) {
        loginError.classList.remove('hidden');
        sessionStorage.removeItem('broz_admin_key');
        adminKey = null;
    } else {
        sessionStorage.setItem('broz_admin_key', pass);
    }
});

// Evento de Logout
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('broz_admin_key');
    adminKey = null;
    dashboard.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    passInput.value = '';
});

// Função para testar a chave e carregar os dados
async function verifyAndLoad() {
    try {
        const response = await fetch(`${API_BASE}/users`, {
            headers: { 'x-admin-key': adminKey }
        });
        
        if (!response.ok) return false;
        
        const data = await response.json();
        clientsData = data.users || [];
        
        // Transição de tela
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        
        renderDashboard();
        renderTable();
        return true;
    } catch (err) {
        console.error('Erro de conexão:', err);
        return false;
    }
}

// Renderiza o Dashboard
function renderDashboard() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const active = clientsData.filter(c => c.endDate && c.endDate >= todayStr).length;
    const expired = clientsData.length - active;
    
    const revenue = clientsData
        .filter(c => c.endDate && c.endDate >= todayStr)
        .reduce((acc, c) => acc + (parseFloat(c.price) || 37.75), 0);
        
    document.getElementById('dash-total').textContent = clientsData.length;
    document.getElementById('dash-ativos').textContent = active;
    document.getElementById('dash-vencidos').textContent = expired;
    document.getElementById('dash-receita').textContent = `R$ ${revenue.toFixed(2).replace('.', ',')}`;
}

// Renderiza a Tabela
function renderTable(filter = '') {
    const tbody = document.getElementById('clients-tbody');
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Filtro de busca
    let filtered = clientsData;
    if (filter) {
        const f = filter.toLowerCase();
        filtered = clientsData.filter(c => c.username.toLowerCase().includes(f));
    }
    
    // Ordena por vencimento mais próximo
    filtered.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">Nenhum cliente encontrado.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(client => {
        const isExpired = !client.endDate || client.endDate < todayStr;
        const statusClass = isExpired ? 'bg-red-500' : 'bg-emerald-500';
        const statusText = isExpired ? 'Vencido' : 'Ativo';
        
        // Calcula dias restantes
        const end = new Date(client.endDate);
        const now = new Date();
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysText = isExpired ? `Venceu há ${Math.abs(diffDays)} dias` : `Faltam ${diffDays} dias`;
        
        // Mensagem de cobrança pro WhatsApp
        const endDateBr = client.endDate ? client.endDate.split('-').reverse().join('/') : 'Indefinida';
        const msg = encodeURIComponent(`Olá! Sua assinatura BrozTV VIP+ vence no dia ${endDateBr}. Segue link para renovação: `);
        
        return `
            <tr class="group">
                <td>
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full ${statusClass} ${!isExpired ? 'animate-pulse' : ''}"></span>
                        <span class="${isExpired ? 'text-red-400' : 'text-emerald-400'} font-bold text-xs uppercase">${statusText}</span>
                    </div>
                </td>
                <td>
                    <div class="font-bold text-white text-sm">${client.username}</div>
                    <div class="text-[10px] text-gray-400 font-mono mt-0.5">Senha: <span class="text-blue-300 select-all">${client.password || '---'}</span></div>
                </td>
                <td>
                    <div class="text-gray-200 text-sm">${endDateBr}</div>
                    <div class="text-[10px] ${isExpired ? 'text-red-500' : 'text-gray-400'} font-semibold">${daysText}</div>
                </td>
                <td class="text-right">
                    <div class="flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onclick="renewClient('${client.username}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded transition-colors" title="Adicionar 30 Dias">
                            +30d
                        </button>
                        <a href="https://wa.me/?text=${msg}" target="_blank" class="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase rounded transition-colors" title="Cobrar no WhatsApp">
                            Whats
                        </a>
                        <button onclick="deleteClient('${client.username}')" class="px-2.5 py-1.5 bg-red-900/80 hover:bg-red-600 text-white text-[10px] font-bold uppercase rounded transition-colors border border-red-700/50">
                            Del
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Busca dinâmica
document.getElementById('search-client').addEventListener('input', (e) => {
    renderTable(e.target.value);
});

// AÇÃO: Criar Cliente
document.getElementById('new-client-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-create-client');
    const spinner = document.getElementById('create-spinner');
    
    const username = document.getElementById('nc-user').value.trim();
    const password = document.getElementById('nc-pass').value.trim();
    const daysToAdd = document.getElementById('nc-days').value;
    
    if (!username || !password) return;
    
    btn.disabled = true;
    spinner.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/create-user`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': adminKey 
            },
            body: JSON.stringify({ username, password, daysToAdd })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Cliente criado e liberado com sucesso!');
            document.getElementById('nc-user').value = '';
            document.getElementById('nc-pass').value = '';
            await verifyAndLoad(); // Recarrega os dados
        } else {
            alert(`Erro: ${data.error}`);
        }
    } catch (err) {
        alert('Erro de conexão ao criar cliente.');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
    }
});

// AÇÃO: Renovar Cliente
async function renewClient(username) {
    if (!confirm(`Deseja adicionar +30 dias de acesso para o usuário "${username}"?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/renew-user`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': adminKey 
            },
            body: JSON.stringify({ username, daysToAdd: 30 })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`Plano renovado! Novo vencimento: ${data.newEndDate.split('-').reverse().join('/')}`);
            await verifyAndLoad();
        } else {
            alert(`Erro: ${data.error}`);
        }
    } catch (err) {
        alert('Erro de conexão ao renovar cliente.');
    }
}

// AÇÃO: Deletar Cliente
async function deleteClient(username) {
    if (!confirm(`ATENÇÃO! Tem certeza que deseja DELETAR PERMANENTEMENTE o usuário "${username}"?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/delete-user`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': adminKey 
            },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            await verifyAndLoad();
        } else {
            alert(`Erro: ${data.error}`);
        }
    } catch (err) {
        alert('Erro de conexão ao deletar cliente.');
    }
}
