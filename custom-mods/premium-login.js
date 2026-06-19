import { initFirebase } from './firebase.js';
import { DOWNLOAD_LINKS } from './config.js';

export function renderPremiumLogin(isNative, proxyUrl) {
    const rootEl = document.getElementById('root');
    if (rootEl) {
        rootEl.style.display = 'none'; // Hide the React App completely
    }

    if (document.getElementById('premium-login-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'premium-login-wrapper';
    wrapper.className = 'w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#050505]';

    // Background gradient effect
    wrapper.innerHTML = `
        <div class="absolute inset-0 z-0">
            <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-900/20 via-[#0a0a0a] to-[#0a0a0a]"></div>
            <div class="absolute top-[20%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        <div class="relative z-10 w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[24px] p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-fade-in flex flex-col gap-6">
            
            <!-- Logo & Title -->
            <div class="text-center">
                <div class="w-20 h-20 mx-auto bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                    <span class="text-3xl font-black text-white tracking-tighter">BTV</span>
                </div>
                <h1 class="text-2xl font-black text-white tracking-tight mb-1">Broz.TV.VIP+</h1>
                <p class="text-sm text-gray-400 font-medium">Faça login para acessar o streaming premium.</p>
            </div>

            <!-- Login Form -->
            <form id="premium-login-form" class="flex flex-col gap-4">
                <div>
                    <label class="block text-[11px] uppercase text-gray-400 mb-1.5 font-bold tracking-wider">E-mail</label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </span>
                        <input type="email" id="login-email" class="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600" placeholder="seuemail@gmail.com" required>
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] uppercase text-gray-400 mb-1.5 font-bold tracking-wider">Senha</label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </span>
                        <input type="password" id="login-password" class="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-12 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600" placeholder="••••••••" required>
                        <button type="button" id="toggle-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                </div>

                <div id="premium-login-error" class="hidden p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl text-center"></div>

                <button type="submit" id="btn-login-submit" class="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-black tracking-wide shadow-[0_4px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.5)] transition-all active:scale-[0.98]">
                    ENTRAR AGORA
                </button>
            </form>

            <div class="relative flex items-center py-2">
                <div class="flex-grow border-t border-white/10"></div>
                <span class="flex-shrink-0 mx-4 text-gray-500 text-xs font-semibold">ou continue com</span>
                <div class="flex-grow border-t border-white/10"></div>
            </div>

            <!-- Google Login -->
            <button type="button" id="btn-google-auth" class="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-3 text-sm font-semibold text-white transition-all active:scale-[0.98]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
                Google
            </button>

            <!-- Links (Terms, Privacy, Register) -->
            <div class="text-center text-xs text-gray-400 mt-2 flex flex-col gap-2">
                <div>
                    Não tem uma conta? 
                    <a href="#" id="link-show-register" class="text-blue-400 font-bold hover:text-blue-300">Criar agora</a>
                </div>
                <div class="flex items-center justify-center gap-3 mt-4 text-[10px]">
                    <a href="/termos-de-uso.html" target="_blank" class="hover:text-white">Termos de Uso</a>
                    <span>•</span>
                    <a href="/politica-de-privacidade.html" target="_blank" class="hover:text-white">Privacidade</a>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);

    // Toggle Password Visibility
    const passInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
            const isText = passInput.type === 'text';
            passInput.type = isText ? 'password' : 'text';
            toggleBtn.innerHTML = isText ? 
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' :
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        });
    }

    // Attach Login Logic
    const form = document.getElementById('premium-login-form');
    if (form) {
        form.addEventListener('submit', (e) => handleEmailLogin(e, isNative, proxyUrl));
    }

    // Attach Google Auth Logic
    const btnGoogle = document.getElementById('btn-google-auth');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', () => handleGoogleLogin(isNative, proxyUrl));
    }

    // Attach Registration Trigger (We will implement a premium registration wrapper too)
    const registerLink = document.getElementById('link-show-register');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            // TODO: call the premium registration UI
            alert('Tela de cadastro premium será aberta aqui');
        });
    }
}

function showPremiumError(message) {
    const errDiv = document.getElementById('premium-login-error');
    if (errDiv) {
        errDiv.textContent = message;
        errDiv.classList.remove('hidden');
    } else {
        alert(message);
    }
}

async function handleEmailLogin(e, isNative, proxyUrl) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value.trim();
    const btnSubmit = document.getElementById('btn-login-submit');

    if (!email || !password) return;

    btnSubmit.disabled = true;
    const oldText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = 'AUTENTICANDO...';
    const errDiv = document.getElementById('premium-login-error');
    if (errDiv) errDiv.classList.add('hidden');

    try {
        const db = await initFirebase();
        if (!db) throw new Error('Servidor de licenças fora do ar.');

        const userDoc = await db.collection('users').doc(email).get();

        if (!userDoc.exists) {
            showPremiumError('Conta não encontrada. Verifique seu e-mail.');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = oldText;
            return;
        }

        const client = userDoc.data();

        if (client.password !== password) {
            showPremiumError('Senha incorreta.');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = oldText;
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const isUserAdmin = client.isAdmin || email === 'admin' || email === 'evekproducoes';
        if (!isUserAdmin && (client.endDate < todayStr || !client.isActive)) {
            if (isNative) {
                showPremiumError('Assinatura inativa! Acesse o site para renovar.');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = oldText;
                return;
            }
        }

        // Sucesso
        finalizeLogin(client, email, isUserAdmin);
        btnSubmit.innerHTML = 'CONECTADO!';
        
        setTimeout(() => { window.location.reload(); }, 500);

    } catch (err) {
        console.error(err);
        showPremiumError(err.message || 'Erro de conexão.');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = oldText;
    }
}

async function handleGoogleLogin(isNative, proxyUrl) {
    const btnGoogle = document.getElementById('btn-google-auth');
    btnGoogle.disabled = true;
    const oldText = btnGoogle.innerHTML;
    btnGoogle.innerHTML = '⏳ Conectando...';

    const errDiv = document.getElementById('premium-login-error');
    if (errDiv) errDiv.classList.add('hidden');

    try {
        const db = await initFirebase();
        if (!db) throw new Error('Não foi possível inicializar o Firebase.');

        const provider = new window.firebase.auth.GoogleAuthProvider();
        const result = await window.firebase.auth().signInWithPopup(provider);
        const user = result.user;

        if (!user || !user.email) {
            throw new Error('Falha ao obter conta Google.');
        }

        const email = user.email.trim().toLowerCase();
        const name = user.displayName || email;

        btnGoogle.innerHTML = '⚡ Autenticando...';

        const userDocRef = db.collection('users').doc(email);
        const doc = await userDocRef.get();

        let client = null;

        if (doc.exists) {
            client = doc.data();
        } else {
            const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
            const endDateObj = new Date();
            endDateObj.setDate(endDateObj.getDate() + 3);

            client = {
                id: 'client_' + Date.now(),
                username: email,
                name: name,
                email: email,
                password: randomPass,
                pin: '0000',
                timezone: 'America/Sao_Paulo',
                payments: [],
                startDate: new Date().toISOString().split('T')[0],
                endDate: endDateObj.toISOString().split('T')[0], 
                price: 6.85,
                recurrence: 'mensal',
                isActive: true, 
                registrationType: 'site',
                allowDownload: true,
                allowTvPairing: true,
                allowAdultContent: true,
                allowThemeChange: true,
                maxDevices: 3,
                m3uUrl: 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/master/CanaisBR01.m3u8',
                listName: 'IPTV - Assinatura BrozTV',
                createdAt: new Date().toISOString()
            };
            await userDocRef.set(client);
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const isUserAdmin = client.isAdmin || email === 'admin' || email === 'evekproducoes';

        finalizeLogin(client, email, isUserAdmin);

        btnGoogle.innerHTML = '🎉 Conectado!';
        setTimeout(() => { window.location.reload(); }, 500);

    } catch (err) {
        console.error(err);
        showPremiumError(err.message || 'Erro Google.');
        btnGoogle.disabled = false;
        btnGoogle.innerHTML = oldText;
    }
}

function finalizeLogin(client, email, isUserAdmin) {
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionUser = {
        username: client.username || email,
        name: client.name || client.username || email,
        plan: client.plan || 'vip',
        isActive: isUserAdmin ? true : (client.isActive && client.endDate >= todayStr),
        isAdmin: isUserAdmin,
        allowDownload: client.allowDownload !== false,
        allowTvPairing: client.allowTvPairing !== false,
        allowAdultContent: client.allowAdultContent !== false,
        allowThemeChange: client.allowThemeChange !== false,
        maxDevices: client.maxDevices || 1,
        registrationType: client.registrationType || 'site'
    };

    localStorage.setItem('broz_session_user', JSON.stringify(sessionUser));
    localStorage.setItem('broz_saved_credentials', JSON.stringify({ u: client.username || email, p: client.password }));

    if (client.m3uUrl) {
        const userListKey = \`broz_data_\${client.username || email}\`;
        const newList = [{
            id: 'broz_list_brasil_2026_id',
            name: client.listName || 'IPTV - Assinatura BrozTV',
            url: client.m3uUrl,
            epgUrl: client.epgUrl || '',
            date: new Date().toLocaleDateString("pt-BR")
        }];
        localStorage.setItem(userListKey, JSON.stringify(newList));
        localStorage.setItem('broz_data_default', JSON.stringify(newList));
    }
}
