/**
 * login.js — Interceptação do formulário de login e autenticação via Firestore
 */
import { initFirebase } from './firebase.js';
import { DOWNLOAD_LINKS } from './config.js';

export function showLoginError(message) {
    const oldError = document.getElementById('custom-login-error');
    if (oldError) oldError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.id = 'custom-login-error';
    errorDiv.className = 'mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/35 text-red-400 text-xs font-semibold animate-fade-in text-center';
    errorDiv.textContent = message;

    const loginForm = document.querySelector('form');
    if (loginForm) loginForm.appendChild(errorDiv);
    else alert(message);
}

export function injectLandingDownloads(isNative, showRegisterFormCallback) {
    if (document.getElementById('broztv-downloads-landing')) return;

    const loginForm = document.querySelector('form');
    if (!loginForm) return;

    console.log('[CustomMods] Tela de Login detectada. Injetando bloco de downloads...');

    // Botão de cadastro (apenas na Web)
    if (!isNative) {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn && !document.getElementById('js-show-register')) {
            const registerBtnContainer = document.createElement('div');
            registerBtnContainer.className = 'w-full text-center mt-3';
            registerBtnContainer.innerHTML = `
                <button type="button" id="js-show-register" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400 hover:border-emerald-300 text-white rounded-xl text-base font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.5)] transition-all duration-300 cursor-pointer select-none active:scale-[0.98]">
                    📝 Criar Conta / Ativar Licença
                </button>
                <button type="button" id="js-google-login" class="w-full py-4 mt-3.5 bg-gradient-to-r from-[#1e293b] to-[#0f172a] hover:from-[#25354c] hover:to-[#142035] text-white border border-[#334155] hover:border-[#475569] rounded-xl text-base font-black tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-[0_4px_15px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_20px_rgba(30,41,59,0.5)] transition-all duration-300 cursor-pointer select-none active:scale-[0.98]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
                    Entrar com Google
                </button>
            `;
            submitBtn.parentNode.insertBefore(registerBtnContainer, submitBtn.nextSibling);

            const btnReg = document.getElementById('js-show-register');
            if (btnReg) btnReg.addEventListener('click', showRegisterFormCallback);

            const btnGoogle = document.getElementById('js-google-login');
            // Como precisamos do proxyUrl no callback do Google, vamos puxar o proxyUrl dinamicamente ou passar como argumento
            if (btnGoogle) {
                // Procuramos identificar o proxyUrl que a classe CustomUiMods detecta
                let dynamicProxy = 'http://localhost:4000';
                if (typeof window !== 'undefined' && window.location) {
                    const host = window.location.hostname;
                    if (host !== 'localhost' && host !== '127.0.0.1' && !host.includes('loca.lt') && !host.includes('ngrok')) {
                        dynamicProxy = 'https://api-broztv-vip.onrender.com';
                    } else if (host !== 'localhost') {
                        dynamicProxy = `http://${host}:4000`;
                    }
                }
                btnGoogle.addEventListener('click', () => handleGoogleLogin(dynamicProxy));
            }
        }
    }

    // Bloco de downloads
    const downloadContainer = document.createElement('div');
    downloadContainer.id = 'broztv-downloads-landing';
    downloadContainer.className = 'w-full max-w-md mx-auto mt-8 p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/5 shadow-2xl neon-border-blue animate-fade-in text-center';

    downloadContainer.innerHTML = `
        <h3 class="text-sm font-black uppercase tracking-widest text-blue-400 mb-4 select-none">
            📥 INSTALAR APLICATIVOS
        </h3>
        <p class="text-xs text-gray-400 mb-5 leading-relaxed">
            Para a experiência completa com TV Ao Vivo estável, instale nossos aplicativos oficiais:
        </p>
        <div class="flex flex-col sm:flex-row justify-center gap-4">
            <a href="${DOWNLOAD_LINKS.windows}" class="flex items-center justify-center gap-2 px-5 py-3 rounded-xl neon-btn-orange text-white text-xs font-bold transition-all text-decoration-none" download>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
                Instalar no Windows (.EXE)
            </a>
            <a href="${DOWNLOAD_LINKS.android}" class="flex items-center justify-center gap-2 px-5 py-3 rounded-xl neon-btn-green text-white text-xs font-bold transition-all text-decoration-none" download>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"/><path d="M12 6v12M6 12h12"/></svg>
                Instalar Android (.APK)
            </a>
        </div>
    `;

    const parent = loginForm.parentElement;
    if (parent) parent.appendChild(downloadContainer);
}

export function interceptLoginForm(isNative, proxyUrl) {
    // Exibe alertas salvos no localStorage (ex: expiração de licença)
    const pendingAlert = localStorage.getItem('broz_login_alert_message');
    if (pendingAlert) {
        localStorage.removeItem('broz_login_alert_message');
        setTimeout(() => {
            showLoginError(pendingAlert);
        }, 600);
    }

    const loginForm = document.querySelector('form');
    if (!loginForm) return;

    // Atualiza placeholders e labels para E-mail
    const usernameInput = loginForm.querySelector('input[type="text"], input[placeholder*="usuário"], input[placeholder*="Usuário"], input[placeholder*="email"], input[placeholder*="E-mail"]');
    if (usernameInput) {
        if (usernameInput.placeholder !== 'seuemail@gmail.com') {
            usernameInput.placeholder = 'seuemail@gmail.com';
        }
        const label = usernameInput.parentElement?.querySelector('label') || loginForm.querySelector('label[for="' + usernameInput.id + '"]');
        if (label && (label.textContent.toLowerCase().includes('usuário') || label.textContent.toLowerCase().includes('usuario') || label.textContent.toLowerCase().includes('login') || label.textContent.toLowerCase().includes('username'))) {
            label.textContent = 'E-mail';
        }
    }

    if (loginForm.dataset.loginIntercepted === 'true') return;
    loginForm.dataset.loginIntercepted = 'true';

    console.log('[CustomMods] Interceptando formulário de login do React...');

    const inputs = loginForm.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });

    loginForm.addEventListener('submit', async (e) => {
        const usernameInput = loginForm.querySelector('input[type="text"], input[placeholder*="usuário"], input[placeholder*="Usuário"], input[placeholder*="gmail"]');
        const passwordInput = loginForm.querySelector('input[type="password"], input[placeholder*="senha"], input[placeholder*="Senha"]');

        if (!usernameInput || !passwordInput) return;

        const username = usernameInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();

        if (!username || !password) return;

        e.preventDefault();
        e.stopPropagation();

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Entrar';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⚡ Autenticando...';
        }

        try {
            const db = await initFirebase();
            if (!db) throw new Error('Servidor de licenças fora do ar.');

            const userDoc = await db.collection('users').doc(username).get();

            if (!userDoc.exists) {
                if (username === 'admin' || username === 'evekproducoes') {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
                    return;
                }
                showLoginError('Usuário não encontrado.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
                return;
            }

            const client = userDoc.data();

            if (client.password !== password) {
                showLoginError('Senha incorreta.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
                return;
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const isUserAdmin = client.isAdmin || username === 'admin' || username === 'evekproducoes';
            if (!isUserAdmin && (client.endDate < todayStr || !client.isActive)) {
                if (isNative) {
                    showLoginError('Assinatura expirada ou inativa! Acesse a Área do Assinante na Web (http://broztv.web.app) para efetuar o pagamento e renovar.');
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
                    return;
                }
                // Na Web: permite login para acessar área do assinante e pagar via Pix
            }

            console.log(`[CustomMods] Login aprovado via Firestore: ${client.username}`);

            const sessionUser = {
                username: client.username,
                name: client.name || client.username,
                plan: client.plan || 'vip',
                isActive: true,
                isAdmin: client.isAdmin || username === 'admin' || username === 'evekproducoes' || false,
                allowDownload: client.allowDownload !== false,
                allowTvPairing: client.allowTvPairing !== false,
                allowAdultContent: client.allowAdultContent !== false,
                allowThemeChange: client.allowThemeChange !== false,
                maxDevices: client.maxDevices || 1,
                registrationType: client.registrationType || 'adm'
            };
            localStorage.setItem('broz_session_user', JSON.stringify(sessionUser));
            localStorage.setItem('broz_saved_credentials', JSON.stringify({ u: client.username, p: client.password }));

            if (client.xtreamServer && client.xtreamUser && client.xtreamPassword) {
                const xtreamCredentials = {
                    serverUrl: client.xtreamServer.replace(/\/$/, ''),
                    username: client.xtreamUser,
                    password: client.xtreamPassword
                };
                localStorage.setItem('broztv_xtream_credentials', JSON.stringify(xtreamCredentials));
            } else if (client.m3uUrl) {
                const userListKey = `broz_data_${username}`;
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

            if (submitBtn) submitBtn.innerHTML = '🎉 Conectado! Entrando...';

            setTimeout(() => { window.location.reload(); }, 500);

        } catch (err) {
            console.error('[CustomMods] Falha ao autenticar:', err);
            showLoginError(err.message || 'Erro de conexão. Tente novamente.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
        }
    }, true);
}

async function handleGoogleLogin(proxyUrl) {
    const btnGoogle = document.getElementById('js-google-login');
    const originalBtnText = btnGoogle ? btnGoogle.innerHTML : 'Entrar com Google';
    if (btnGoogle) {
        btnGoogle.disabled = true;
        btnGoogle.innerHTML = '⏳ Conectando...';
    }

    try {
        const db = await initFirebase();
        if (!db) throw new Error('Não foi possível inicializar o Firebase.');

        const provider = new window.firebase.auth.GoogleAuthProvider();
        const result = await window.firebase.auth().signInWithPopup(provider);
        const user = result.user;

        if (!user || !user.email) {
            throw new Error('Falha ao obter informações do usuário da conta Google.');
        }

        const email = user.email.trim().toLowerCase();
        const name = user.displayName || email;

        if (btnGoogle) btnGoogle.innerHTML = '⚡ Autenticando...';

        const userDocRef = db.collection('users').doc(email);
        const doc = await userDocRef.get();

        let client = null;

        if (doc.exists) {
            client = doc.data();
        } else {
            // Cria um novo usuário de autocadastro (Cadastro Site)
            const randomPass = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digitos
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
                endDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // expirado
                price: 27.75,
                recurrence: 'mensal',
                isActive: false, // inativo para forçar pagamento
                registrationType: 'site', // Cadastro no site
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
            console.log(`[Cadastro Google] Nova conta criada com sucesso para: ${email}`);
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const isUserAdmin = client.isAdmin || email === 'admin' || email === 'evekproducoes';

        const sessionUser = {
            username: client.username,
            name: client.name || client.username,
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
        localStorage.setItem('broz_saved_credentials', JSON.stringify({ u: client.username, p: client.password }));

        if (client.m3uUrl) {
            const userListKey = `broz_data_${email}`;
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

        if (btnGoogle) btnGoogle.innerHTML = '🎉 Conectado! Entrando...';
        setTimeout(() => { window.location.reload(); }, 500);

    } catch (err) {
        console.error('[Google Login] Erro ao autenticar:', err);
        showLoginError(err.message || 'Erro de conexão Google. Tente novamente.');
        if (btnGoogle) {
            btnGoogle.disabled = false;
            btnGoogle.innerHTML = originalBtnText;
        }
    }
}
