import { initFirebase } from './firebase.js';

export function showRegisterForm(proxyUrl) {
    const loginForm = document.querySelector('form');
    if (!loginForm) return;

    loginForm.style.display = 'none';

    let registerForm = document.getElementById('custom-register-form');
    if (registerForm) { registerForm.style.display = 'flex'; return; }

    registerForm = document.createElement('form');
    registerForm.id = 'custom-register-form';
    registerForm.className = 'flex flex-col gap-4 text-left w-full animate-fade-in bg-[#162032]/80 p-6 rounded-2xl border border-white/5 shadow-2xl';

    registerForm.innerHTML = `
        <h3 class="text-sm font-black uppercase tracking-widest text-blue-400 mb-2 select-none text-center">
            📝 CRIAR CONTA BROZTV
        </h3>
        <div>
            <label class="block text-[10px] uppercase text-gray-400 mb-1 font-bold">E-mail</label>
            <input type="email" id="reg-email" class="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: joao@gmail.com" required>
        </div>
        <div>
            <label class="block text-[10px] uppercase text-gray-400 mb-1 font-bold">Como quer ser chamado (Nome)</label>
            <input type="text" id="reg-name" class="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: João Silva" required>
        </div>
        <div>
            <label class="block text-[10px] uppercase text-gray-400 mb-1 font-bold">Senha</label>
            <input type="password" id="reg-pass" class="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Crie uma senha" required>
        </div>
        <div>
            <label class="block text-[10px] uppercase text-gray-400 mb-1 font-bold">Confirmar Senha</label>
            <input type="password" id="reg-pass-confirm" class="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Confirme sua senha" required>
        </div>
        
        <div class="flex items-start gap-2 mt-2">
            <input type="checkbox" id="reg-terms" class="mt-1 w-4 h-4 rounded border-gray-600 bg-black/50 text-blue-500 focus:ring-blue-500" required>
            <label for="reg-terms" class="text-xs text-gray-400 leading-tight">
                Li e concordo com os <a href="/termos-de-uso.html" target="_blank" class="text-blue-400 hover:underline">Termos de Uso</a> e a <a href="/politica-de-privacidade.html" target="_blank" class="text-blue-400 hover:underline">Política de Privacidade</a>.
            </label>
        </div>
        
        <div id="reg-error-msg" class="p-3 bg-red-950/40 border border-red-500/35 text-red-400 text-xs font-semibold rounded-xl text-center hidden"></div>
        <button type="submit" id="js-btn-register-submit" class="mt-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all border-none">
            Criar Conta & Ir para Ativação
        </button>
        <button type="button" id="js-back-to-login" class="text-xs text-gray-400 hover:text-white underline text-center cursor-pointer bg-transparent border-none mt-2 font-medium">
            Já tenho conta. Fazer Login
        </button>
    `;

    loginForm.parentNode.insertBefore(registerForm, loginForm.nextSibling);

    const inputs = registerForm.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });

    document.getElementById('js-back-to-login').addEventListener('click', hideRegisterForm);

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const name = document.getElementById('reg-name').value.trim();
        const pass = document.getElementById('reg-pass').value.trim();
        const passConf = document.getElementById('reg-pass-confirm').value.trim();
        const errMsg = document.getElementById('reg-error-msg');
        const submitBtn = document.getElementById('js-btn-register-submit');

        errMsg.classList.add('hidden');

        if (pass !== passConf) {
            errMsg.textContent = 'As senhas não coincidem.';
            errMsg.classList.remove('hidden');
            return;
        }

        if (email.length < 5 || !email.includes('@')) {
            errMsg.textContent = 'Informe um e-mail válido.';
            errMsg.classList.remove('hidden');
            return;
        }

        if (pass.length < 4) {
            errMsg.textContent = 'A senha deve ter pelo menos 4 caracteres.';
            errMsg.classList.remove('hidden');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Criando conta...';

        try {
            const db = await initFirebase();
            if (!db) throw new Error('Não foi possível conectar ao banco de dados Firestore.');

            const userDocRef = db.collection('users').doc(email);
            const doc = await userDocRef.get();

            if (doc.exists) {
                throw new Error('Este e-mail já está cadastrado.');
            }

            // Define expiração para 3 dias no futuro (Free Trial)
            const endDateObj = new Date();
            endDateObj.setDate(endDateObj.getDate() + 3);

            const clientPayload = {
                id: 'client_' + Date.now(),
                username: email,
                name: name,
                email: email,
                password: pass,
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
                termsAccepted: true,
                termsAcceptedAt: new Date().toISOString(),
                m3uUrl: 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/master/CanaisBR01.m3u8',
                listName: 'IPTV - Assinatura BrozTV',
                createdAt: new Date().toISOString()
            };

            await userDocRef.set(clientPayload);
            console.log(`[Cadastro] Conta criada de forma segura no Firestore para: ${email}`);

            const sessionUser = {
                username: email,
                name: name,
                plan: 'vip',
                isActive: false, // começa inativo para forçar pagamento
                isAdmin: false,
                allowDownload: true,
                allowTvPairing: true,
                allowAdultContent: true,
                allowThemeChange: true,
                maxDevices: 3,
                registrationType: 'site'
            };
            localStorage.setItem('broz_session_user', JSON.stringify(sessionUser));
            localStorage.setItem('broz_saved_credentials', JSON.stringify({ u: email, p: pass }));

            submitBtn.innerHTML = '🎉 Conta criada! Redirecionando...';
            setTimeout(() => { window.location.reload(); }, 500);

        } catch (err) {
            console.error('[Cadastro] Erro ao cadastrar:', err);
            errMsg.textContent = err.message || 'Erro ao criar conta. Tente novamente.';
            errMsg.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Criar Conta & Ir para Ativação';
        }
    });
}

export function hideRegisterForm() {
    const loginForm = document.querySelector('form');
    const registerForm = document.getElementById('custom-register-form');
    if (registerForm) registerForm.style.display = 'none';
    if (loginForm) loginForm.style.display = '';
}
