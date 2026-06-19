// Simple Node.js proxy server for bypassing CORS
// Usage: node proxy.js

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

// Inicialização do Firebase Admin SDK com suporte a fallback
let firebaseAdminApp = null;
let firestoreDb = null;

try {
  let serviceAccountPath = null;
  const genericPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  const customPath = path.resolve(process.cwd(), 'broztv-firebase-adminsdk-fbsvc-195f41b7fd.json');

  if (fs.existsSync(customPath)) {
    serviceAccountPath = customPath;
  } else if (fs.existsSync(genericPath)) {
    serviceAccountPath = genericPath;
  } else {
    // Busca dinâmica por qualquer arquivo contendo o padrão
    const files = fs.readdirSync(process.cwd());
    const matched = files.find(f => f.startsWith('broztv-firebase-adminsdk-') && f.endsWith('.json'));
    if (matched) {
      serviceAccountPath = path.resolve(process.cwd(), matched);
    }
  }
  
  // Primeiro tenta carregar da variável de ambiente com o JSON completo
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firestoreDb = admin.firestore();
    console.log('[Firebase Admin] Inicializado com sucesso usando variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON!');
  } else if (serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firestoreDb = admin.firestore();
    console.log(`[Firebase Admin] Inicializado com sucesso usando ${path.basename(serviceAccountPath)}!`);
  } else {
    // Tenta carregar de variáveis de ambiente individuais
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'broztv';
    
    if (privateKey && clientEmail) {
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
      firestoreDb = admin.firestore();
      console.log('[Firebase Admin] Inicializado com sucesso usando variáveis de ambiente individuais!');
    } else {
      console.warn('[Firebase Admin] ALERTA: Nenhuma chave JSON de Admin SDK (ex: broztv-firebase-adminsdk-fbsvc-195f41b7fd.json) foi encontrada na raiz e nenhuma variável de ambiente configurada. O cadastro de usuários e webhooks de pagamento ficarão inativos.');
    }
  }
} catch (err) {
  console.error('[Firebase Admin] Erro crítico ao tentar inicializar Firebase Admin SDK:', err.message);
}

// Carrega variáveis do .env.local de forma nativa se existir
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
    console.log('[Env] Variáveis carregadas do .env.local com sucesso!');
  }
} catch (err) {
  console.warn('[Env] Falha ao carregar .env.local:', err.message);
}

const app = express();
const PORT = process.env.PORT || 4000;

// Cache memory map for M3U playlists
const playlistCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

app.use(cors());
// Habilita o parsing de JSON, salvando o corpo cru (raw) para validação de webhooks (Stripe)
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/payments/stripe-webhook')) {
      req.rawBody = buf.toString();
    }
  }
})); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/status', (req, res) => {
  res.json({ status: 'online' });
});

app.post('/api/playlists/upload-file', (req, res) => {
  const { username, fileName, content } = req.body;
  if (!username || !content) {
    return res.status(400).json({ error: 'Parâmetros inválidos: username e content são obrigatórios.' });
  }

  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const cleanUsername = String(username).replace(/[^a-zA-Z0-9]/g, '_');
    const safeFileName = `${cleanUsername}_${Date.now()}_${String(fileName || 'playlist.m3u').replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeFileName);

    fs.writeFileSync(filePath, content, 'utf8');

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${safeFileName}`;
    console.log(`[Upload] Arquivo M3U salvo para ${username}: ${safeFileName}`);
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error('[Upload] Erro ao gravar arquivo:', err);
    res.status(500).json({ error: 'Erro interno do servidor ao salvar arquivo.' });
  }
});


// ==================================================================================
// MEMÓRIA PARA O SISTEMA DE PAREAMENTO DE SMART TV (DEVICE LINK)
// ==================================================================================
const deviceCodesMap = new Map(); // deviceId -> { code, expiresAt, status: 'pending'|'paired', credentials: null }
const codeToDeviceMap = new Map(); // code -> deviceId

// Gera um código alfanumérico curto e amigável (sem I, O para evitar confusão)
const generatePairingCode = () => {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Limpa códigos expirados periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [deviceId, entry] of deviceCodesMap.entries()) {
    if (now > entry.expiresAt) {
      codeToDeviceMap.delete(entry.code);
      deviceCodesMap.delete(deviceId);
    }
  }
}, 60 * 1000); // Roda a cada minuto

// Rota 1: TV solicita um novo código
app.get('/api/tv/get-code', (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) {
    return res.status(400).json({ error: 'DeviceId ausente' });
  }

  // Limpa código antigo para este dispositivo se já existir
  const oldEntry = deviceCodesMap.get(deviceId);
  if (oldEntry) {
    codeToDeviceMap.delete(oldEntry.code);
  }

  // Gera código único que ainda não está ativo
  let code = generatePairingCode();
  while (codeToDeviceMap.has(code)) {
    code = generatePairingCode();
  }

  const expiresAt = Date.now() + 10 * 60 * 1000; // Válido por 10 minutos
  const entry = {
    code,
    expiresAt,
    status: 'pending',
    credentials: null
  };

  deviceCodesMap.set(deviceId, entry);
  codeToDeviceMap.set(code, deviceId);

  console.log(`[Pareamento] Código gerado para TV (${deviceId}): ${code}`);
  res.json({ code, deviceId, expiresAt });
});

// Rota 2: TV faz polling para saber se foi pareada
app.get('/api/tv/check-pairing', (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) {
    return res.status(400).json({ error: 'DeviceId ausente' });
  }

  const entry = deviceCodesMap.get(deviceId);
  if (!entry) {
    return res.json({ paired: false, error: 'Código expirado ou não gerado' });
  }

  if (Date.now() > entry.expiresAt) {
    codeToDeviceMap.delete(entry.code);
    deviceCodesMap.delete(deviceId);
    return res.json({ paired: false, error: 'Código expirado' });
  }

  if (entry.status === 'paired') {
    console.log(`[Pareamento] TV (${deviceId}) pareada com sucesso! Enviando credenciais.`);
    res.json({ paired: true, credentials: entry.credentials });
    // Limpa a memória após o consumo de login bem-sucedido
    codeToDeviceMap.delete(entry.code);
    deviceCodesMap.delete(deviceId);
  } else {
    res.json({ paired: false });
  }
});

// Rota 3: Celular ativa o código digitado
app.post('/api/tv/activate-code', (req, res) => {
  const { code, credentials } = req.body;
  if (!code || !credentials) {
    return res.status(400).json({ error: 'Código ou credenciais ausentes' });
  }

  const normalizedCode = String(code).trim().toUpperCase().replace('-', '');
  const deviceId = codeToDeviceMap.get(normalizedCode);
  if (!deviceId) {
    return res.status(404).json({ error: 'Código de pareamento inválido ou expirado.' });
  }

  const entry = deviceCodesMap.get(deviceId);
  if (!entry || Date.now() > entry.expiresAt) {
    codeToDeviceMap.delete(normalizedCode);
    if (deviceId) deviceCodesMap.delete(deviceId);
    return res.status(410).json({ error: 'Este código expirou. Gere um novo código na TV.' });
  }

  // Define como pareado e associa as credenciais recebidas
  entry.status = 'paired';
  entry.credentials = credentials;

  console.log(`[Pareamento] Código ${normalizedCode} ativado. TV (${deviceId}) pareada.`);
  res.json({ success: true, message: 'Dispositivo pareado com sucesso! Sua TV atualizará em instantes.' });
});

// ==================================================================================
// MONITORAMENTO DE CONEXÕES SIMULTÂNEAS
// ==================================================================================
const activeSessionsMap = new Map(); // username -> Map(deviceId -> lastPingTime)

// Rota 4: Registro/Ping de dispositivo ativo
app.post('/api/sessions/ping', (req, res) => {
  const { username, deviceId, maxDevices } = req.body;
  if (!username || !deviceId) {
    return res.status(400).json({ error: 'Username ou DeviceId ausente' });
  }

  const limit = parseInt(maxDevices) || 1;
  const now = Date.now();
  const timeout = 45000; // 45 segundos de tolerância

  // Limpa e obtém sessões do usuário
  let userSessions = activeSessionsMap.get(username);
  if (!userSessions) {
    userSessions = new Map();
    activeSessionsMap.set(username, userSessions);
  }

  // Remove expiradas por inatividade
  for (const [id, lastPing] of userSessions.entries()) {
    if (now - lastPing > timeout) {
      userSessions.delete(id);
    }
  }

  // Se o dispositivo já está ativo, apenas atualiza o tempo e permite
  if (userSessions.has(deviceId)) {
    userSessions.set(deviceId, now);
    return res.json({ success: true, activeCount: userSessions.size });
  }

  // Se é um novo dispositivo tentando logar, verifica se já estourou o limite de acessos simultâneos
  if (userSessions.size >= limit) {
    console.warn(`[Conexões] Limite excedido para ${username}. Tentativa de: ${deviceId}. Ativos: ${userSessions.size}/${limit}`);
    return res.status(403).json({ 
      success: false, 
      error: 'limit_exceeded', 
      activeCount: userSessions.size, 
      limit 
    });
  }

  // Registra novo dispositivo e atualiza
  userSessions.set(deviceId, now);
  console.log(`[Conexões] Novo dispositivo registrado para ${username}: ${deviceId}. Ativos: ${userSessions.size}/${limit}`);
  res.json({ success: true, activeCount: userSessions.size });
});
// ==================================================================================
// SISTEMA DE PAGAMENTOS DESATIVADO (APENAS STRIPE AGORA)
// ==================================================================================

// ==================================================================================
// STRIPE WEBHOOK (Pagamentos em Dólar via Cartão)
// ==================================================================================
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123'); // Fallback para não quebrar se não tiver env

app.post('/api/payments/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_vyLzJxPrtSjDY8F3GOh6PL7lDiz0qDBJ';
  
  let event;

  try {
    // Se tivermos o rawBody e o segredo, validamos a assinatura criptográfica
    if (req.rawBody && sig) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } else {
      // Fallback inseguro caso o rawBody não tenha sido capturado (apenas para debug)
      event = req.body;
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Erro na assinatura: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Responder imediatamente ao gateway
  res.status(200).send('OK');

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // O Payment Link foi configurado para receber o ?client_reference_id na URL
    const username = session.client_reference_id;
    const amountTotal = session.amount_total; // Em centavos

    if (!username) {
      console.error('[Stripe Webhook] Pagamento aprovado, mas sem client_reference_id (usuário).');
      return;
    }

    console.log(`[Stripe Webhook] Pagamento aprovado via Cartão para o usuário: ${username}`);

    let currentEndDate = '';
    let isClientActive = false;

    if (firestoreDb) {
      try {
        const userDoc = await firestoreDb.collection('users').doc(username.toLowerCase()).get();
        if (userDoc.exists) {
          const clientData = userDoc.data();
          currentEndDate = clientData.endDate || '';
          isClientActive = clientData.isActive || false;
        }
      } catch (err) {
        console.warn(`[Stripe Webhook] Erro ao ler Firestore:`, err.message);
      }
    }

    // Inferindo o plano pelo valor pago (amount_total em centavos de dólar)
    let plan = 'mensal';
    let daysToAdd = 30;

    if (amountTotal === 685) { plan = 'mensal'; daysToAdd = 30; }
    else if (amountTotal === 3685) { plan = 'semestral'; daysToAdd = 180; }
    else if (amountTotal === 7385) { plan = 'anual'; daysToAdd = 365; }
    else if (amountTotal === 1375) { plan = 'mensal_6t'; daysToAdd = 30; }
    else if (amountTotal === 7375) { plan = 'semestral_6t'; daysToAdd = 180; }
    else if (amountTotal === 14775) { plan = 'anual_6t'; daysToAdd = 365; }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let baseDate = new Date();

    if (currentEndDate && isClientActive && currentEndDate >= todayStr) {
      baseDate = new Date(currentEndDate);
    }
    
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    const newEndDate = baseDate.toISOString().split('T')[0];

    // Atualiza o Firestore com a nova data e status ativo
    if (firestoreDb) {
      try {
        await firestoreDb.collection('users').doc(username.toLowerCase()).update({
          isActive: true,
          endDate: newEndDate,
          plan: plan
        });
        
        // Registrar o pagamento no histórico do usuário
        const paymentRecord = {
          id: session.payment_intent || session.id,
          amount: `US$ ${(amountTotal / 100).toFixed(2)}`,
          details: 'Stripe Cartão: Pagamento Aprovado',
          timestamp: new Date().toISOString().split('T')[0].split('-').reverse().join('/') + ' 12:00:00 -0300'
        };
        
        const docSnap = await firestoreDb.collection('users').doc(username.toLowerCase()).get();
        const paymentsList = docSnap.data().payments || [];
        paymentsList.push(paymentRecord);
        await firestoreDb.collection('users').doc(username.toLowerCase()).update({ payments: paymentsList });

        console.log(`[Stripe Webhook] Licença de ${username} ativada com sucesso até ${newEndDate} (${plan})!`);
      } catch (err) {
        console.error(`[Stripe Webhook] Erro ao ativar usuário ${username}:`, err);
      }
    }
  }
});

// ==================================================================================
// ROTAS ADMINISTRATIVAS DO GESTOR DE ASSINANTES (FIREBASE ADMIN)
// ==================================================================================

// 1. Criar ou Atualizar Usuário Completo
app.post('/api/admin/save-user', async (req, res) => {
  const { username, password, name, startDate, endDate, price, isActive, maxDevices, m3uUrl, listName, registrationType } = req.body;

  if (!firestoreDb) {
    return res.status(503).json({ error: 'Banco de dados administrativo inativo no servidor (credenciais ausentes).' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Nome de usuário é obrigatório.' });
  }

  const user = String(username).trim().toLowerCase();

  try {
    const userDocRef = firestoreDb.collection('users').doc(user);
    const doc = await userDocRef.get();

    let clientPayload = {};
    if (doc.exists) {
      // Atualização de usuário existente
      const existingData = doc.data();
      clientPayload = {
        ...existingData,
        password: password !== undefined ? String(password).trim() : existingData.password,
        name: name !== undefined ? String(name).trim() : (existingData.name || ''),
        email: user,
        startDate: startDate || existingData.startDate,
        endDate: endDate || existingData.endDate,
        price: price !== undefined ? parseFloat(price) : existingData.price,
        isActive: isActive !== undefined ? Boolean(isActive) : existingData.isActive,
        maxDevices: maxDevices !== undefined ? parseInt(maxDevices) : (existingData.maxDevices || 1),
        m3uUrl: m3uUrl || existingData.m3uUrl,
        listName: listName || existingData.listName,
        registrationType: registrationType !== undefined ? registrationType : (existingData.registrationType || 'adm'),
        updatedAt: new Date().toISOString()
      };
    } else {
      // Criação de novo usuário
      clientPayload = {
        id: 'client_' + Date.now(),
        username: user,
        name: name !== undefined ? String(name).trim() : '',
        email: user,
        password: password !== undefined ? String(password).trim() : '1234',
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: price !== undefined ? parseFloat(price) : 27.75,
        recurrence: 'mensal',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        allowDownload: true,
        allowTvPairing: true,
        allowAdultContent: true,
        allowThemeChange: true,
        maxDevices: maxDevices !== undefined ? parseInt(maxDevices) : 1,
        m3uUrl: m3uUrl || 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/master/CanaisBR01.m3u8',
        listName: listName || 'IPTV - Assinatura BrozTV',
        registrationType: registrationType || 'adm',
        createdAt: new Date().toISOString()
      };
    }

    await userDocRef.set(clientPayload);
    console.log(`[Admin] Usuário salvo/atualizado com sucesso: ${user}`);
    res.json({ success: true, message: 'Usuário salvo com sucesso!', user: clientPayload });

  } catch (err) {
    console.error('[Admin] Erro ao salvar usuário:', err);
    res.status(500).json({ error: 'Erro ao salvar usuário no banco de dados.' });
  }
});

// 2. Excluir Usuário Definitivamente
app.post('/api/admin/delete-user', async (req, res) => {
  const { username } = req.body;

  if (!firestoreDb) {
    return res.status(503).json({ error: 'Banco de dados administrativo inativo no servidor (credenciais ausentes).' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Nome de usuário é obrigatório.' });
  }

  const user = String(username).trim().toLowerCase();

  try {
    const userDocRef = firestoreDb.collection('users').doc(user);
    const doc = await userDocRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    await userDocRef.delete();
    console.log(`[Admin] Usuário deletado do Firestore: ${user}`);
    res.json({ success: true, message: 'Usuário excluído com sucesso!' });

  } catch (err) {
    console.error('[Admin] Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário no banco de dados.' });
  }
});

// 3. Renovar / Prorrogar Validade de Assinatura (+30 Dias)
app.post('/api/admin/renew-user', async (req, res) => {
  const { username } = req.body;

  if (!firestoreDb) {
    return res.status(503).json({ error: 'Banco de dados administrativo inativo no servidor (credenciais ausentes).' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Nome de usuário é obrigatório.' });
  }

  const user = String(username).trim().toLowerCase();

  try {
    const userDocRef = firestoreDb.collection('users').doc(user);
    const doc = await userDocRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const clientData = doc.data();
    const currentEnd = new Date(clientData.endDate);
    const today = new Date();
    
    // Se já estiver vencido, 30 dias a partir de hoje. Se não, 30 dias a partir da data de vencimento.
    const baseDate = currentEnd < today ? today : currentEnd;
    baseDate.setDate(baseDate.getDate() + 30);
    const newEndDate = baseDate.toISOString().split('T')[0];

    await userDocRef.update({
      isActive: true,
      endDate: newEndDate
    });

    console.log(`[Admin] Usuário ${user} renovado com sucesso até ${newEndDate}`);
    res.json({ success: true, endDate: newEndDate, message: 'Assinatura renovada por 30 dias com sucesso!' });

  } catch (err) {
    console.error('[Admin] Erro ao renovar usuário:', err);
    res.status(500).json({ error: 'Erro ao renovar assinatura no banco de dados.' });
  }
});

// ==================================================================================
// ROTAS ADMINISTRATIVAS DO GESTOR (Seguras via x-admin-key)
// ==================================================================================

// Middleware de segurança do Admin
function adminAuth(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_PASSWORD || 'brozadmin123';
  
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Acesso não autorizado. Senha mestra incorreta.' });
  }
  if (!firestoreDb) {
    return res.status(503).json({ error: 'Serviço de banco de dados offline.' });
  }
  next();
}

// Listar todos os usuários
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const snapshot = await firestoreDb.collection('users').get();
    const users = [];
    snapshot.forEach(doc => users.push(doc.data()));
    
    // Ocultar dados sensíveis se necessário? Vamos deixar a senha visível para o Admin enviar no WhatsApp.
    res.json({ success: true, users });
  } catch (err) {
    console.error('[Admin] Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
});

// Criar usuário manualmente (Cortesia/Manual)
app.post('/api/admin/create-user', adminAuth, async (req, res) => {
  const { username, password, daysToAdd } = req.body;
  if (!username || !password || !daysToAdd) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }

  const user = String(username).trim().toLowerCase();
  const pass = String(password).trim();
  const days = parseInt(daysToAdd);

  try {
    const userDocRef = firestoreDb.collection('users').doc(user);
    const doc = await userDocRef.get();
    
    if (doc.exists) {
      return res.status(409).json({ error: 'Este nome de usuário já existe.' });
    }
    
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const clientPayload = {
      id: 'client_' + Date.now(),
      username: user,
      name: user,
      email: `${user}@broztv.com`, // mock email se não fornecido
      password: pass,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      price: 37.75, // Valor padrão de visualização
      recurrence: 'mensal',
      isActive: true,
      allowDownload: true,
      allowTvPairing: true,
      allowAdultContent: true,
      allowThemeChange: true,
      maxDevices: 1,
      plan: days === 30 ? 'mensal' : (days === 180 ? 'semestral' : 'anual'),
      m3uUrl: 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/master/CanaisBR01.m3u8',
      listName: 'IPTV - Iptv-Brasil-2026',
      createdAt: today.toISOString()
    };
    
    await userDocRef.set(clientPayload);
    res.status(201).json({ success: true, message: 'Usuário criado com sucesso!', user: clientPayload });
  } catch (err) {
    console.error('[Admin] Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

// Renovar usuário existente
app.post('/api/admin/renew-user', adminAuth, async (req, res) => {
  const { username, daysToAdd } = req.body;
  if (!username || !daysToAdd) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }

  const user = String(username).trim().toLowerCase();
  const days = parseInt(daysToAdd);

  try {
    const userDocRef = firestoreDb.collection('users').doc(user);
    const doc = await userDocRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    const clientData = doc.data();
    let baseDate = new Date();
    const todayStr = baseDate.toISOString().split('T')[0];

    // Se ainda está ativo, soma a partir do vencimento. Senão, soma a partir de hoje.
    if (clientData.endDate && clientData.endDate >= todayStr) {
      baseDate = new Date(clientData.endDate);
    }

    baseDate.setDate(baseDate.getDate() + days);
    const newEndDate = baseDate.toISOString().split('T')[0];

    await userDocRef.update({
      isActive: true,
      endDate: newEndDate
    });

    res.json({ success: true, message: 'Plano renovado com sucesso!', newEndDate });
  } catch (err) {
    console.error('[Admin] Erro ao renovar usuário:', err);
    res.status(500).json({ error: 'Erro ao renovar plano.' });
  }
});

// Excluir usuário
app.delete('/api/admin/delete-user', adminAuth, async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username não fornecido.' });
  }

  const user = String(username).trim().toLowerCase();

  try {
    await firestoreDb.collection('users').doc(user).delete();
    res.json({ success: true, message: 'Usuário excluído permanentemente.' });
  } catch (err) {
    console.error('[Admin] Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

// ==================================================================================


const shouldTreatAsM3U = (url, contentType) => {
  const u = String(url || '').toLowerCase();
  const ct = String(contentType || '').toLowerCase();
  return u.includes('.m3u8') || u.endsWith('.m3u') || ct.includes('application/vnd.apple.mpegurl') || ct.includes('application/x-mpegurl') || ct.includes('audio/mpegurl');
};

const rewriteM3U = (playlistText, baseUrl, requestHost, requestProto = 'http') => {
  const base = new URL(baseUrl);
  const proxyHost = requestHost || 'localhost:4000';
  const proto = requestProto || 'http';
  
  return String(playlistText)
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Reescreve atributos URI="..." mesmo em linhas de tag (#EXT-X-KEY, #EXT-X-MAP, etc.)
      if (line.includes('URI="')) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
          try {
            const abs = new URL(uri, base).toString();
            return `URI="${proto}://${proxyHost}/proxy?url=${encodeURIComponent(abs)}"`;
          } catch {
            return `URI="${proto}://${proxyHost}/proxy?url=${encodeURIComponent(uri)}"`;
          }
        });
      }

      // Linhas de comentário/tag não devem virar URL
      if (trimmed.startsWith('#')) return line;

      try {
        const abs = new URL(trimmed, base).toString();
        return `${proto}://${proxyHost}/proxy?url=${encodeURIComponent(abs)}`;
      } catch {
        return `${proto}://${proxyHost}/proxy?url=${encodeURIComponent(trimmed)}`;
      }
    })
    .join('\n');
};

const normalizeTargetUrl = (raw) => {
  let current = String(raw || '');
  // desfaz encodes comuns e evita loop de proxy dentro de proxy
  for (let i = 0; i < 5; i++) {
    // Se for uma URL do próprio proxy (contendo /proxy?url=), extrai o parâmetro interno
    if (current.includes('/proxy?url=')) {
      try {
        const u = new URL(current);
        const inner = u.searchParams.get('url');
        if (inner && inner !== current) {
          current = inner;
          continue;
        }
      } catch {
        // Se falhar o parse da URL completa, tenta via regex simples
        const match = current.match(/[?&]url=([^&]+)/);
        if (match) {
          try {
            const inner = decodeURIComponent(match[1]);
            if (inner && inner !== current) {
              current = inner;
              continue;
            }
          } catch {}
        }
      }
    }

    // Tenta decode se parecer url-encoded
    if (/%[0-9a-fA-F]{2}/.test(current)) {
      try {
        const decoded = decodeURIComponent(current);
        if (decoded !== current) {
          current = decoded;
          continue;
        }
      } catch {
        // ignore
      }
    }
    break;
  }
  return current;
};

app.get(['/proxy', '/api/proxy'], async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  const url = normalizeTargetUrl(rawUrl);
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid url (must start with http/https)' });
  }

  // Check cache first for playlists
  const isPlaylistReq = url.includes('.m3u') || url.includes('get.php');
  if (isPlaylistReq) {
    const cached = playlistCache.get(url);
    if (cached && (Date.now() - cached.timestamp < 300000)) {
      console.log(`[Proxy] Servindo do CACHE: ${url}`);
      res.status(200);
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(cached.content);
    }
  }

  try {
    console.log(`[Proxy] Requisitando: ${url}`);
    const upstreamHeaders = {
      'User-Agent': 'IPTVSmartersPlayer', // Simula um aplicativo IPTV real para evitar bloqueios 403 Forbidden em streams .ts e .m3u8
      'Accept': '*/*',
      'Accept-Language': req.headers['accept-language'] || 'pt-BR,pt;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
    };
    // Range é importante para TS/MP4 (seek). Só envia se existir.
    if (req.headers['range']) upstreamHeaders['Range'] = req.headers['range'];
    
    const response = await fetch(url, {
      headers: upstreamHeaders,
      redirect: 'follow',
    });
    console.log(`[Proxy] Status: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`[Proxy] Upstream error ${response.status} for ${url}\nBody: ${text}`);
      return res.status(response.status).json({ error: `Upstream server responded with status ${response.status}`, body: text });
    }

    const contentType = response.headers.get('content-type') || '';

    // Cache memory block
    const isPlaylist = shouldTreatAsM3U(url, contentType) || url.includes('get.php');
    if (isPlaylist) {
      const playlistText = await response.text();
      // Obtém o host e protocolo da requisição dinamicamente para resiliência na rede local / túneis
      const requestHost = req.headers.host || 'localhost:4000';
      const requestProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      
      const rewritten = rewriteM3U(playlistText, response.url || String(url), requestHost, requestProto);
      
      // Save to cache (5 minutes)
      playlistCache.set(url, {
        content: rewritten,
        contentType: contentType || 'application/vnd.apple.mpegurl',
        timestamp: Date.now()
      });

      res.status(response.status);
      res.setHeader('Content-Type', contentType || 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache header
      return res.send(rewritten);
    }

    // Streaming binário (ts/mp4/etc): repassa status e headers essenciais
    res.status(response.status);
    const passHeaders = [
      'content-type',
      'content-length',
      'accept-ranges',
      'content-range',
      'cache-control',
      'expires',
      'last-modified',
      'etag',
    ];
    for (const h of passHeaders) {
      const v = response.headers.get(h);
      if (v) res.setHeader(h, v);
    }

    response.body.on('error', (e) => {
      console.error('[Proxy] Stream error', e);
      try { res.end(); } catch {}
    });

    response.body.pipe(res);
  } catch (err) {
    console.error('[Proxy] Erro ao buscar', url, err);
    res.status(500).json({ error: 'Failed to fetch', details: err.message, stack: err.stack });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
