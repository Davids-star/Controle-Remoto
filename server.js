const fs = require('fs');
const os = require('os');
const express = require('express');
const cors = require('cors');
const { keyboard, Key, clipboard, mouse, Point, Button } = require("@nut-tree-fork/nut-js");
const { exec } = require('child_process');

// ==========================================
// 1. GESTÃO DE CONFIGURAÇÃO (ConfigManager)
// ==========================================
class ConfigManager {
    static init() {
        this.autoCreateEnv();
        require('dotenv').config();
    }

    static autoCreateEnv() {
        if (!fs.existsSync('.env')) {
            let envContent = "PORT=3000\nAUTH_TOKEN=1234\nALLOWED_IP_PREFIX=\nCHROME_PROFILE=Default\nURL_NETFLIX=https://www.netflix.com/browse\nURL_HBO=https://play.hbomax.com/\nURL_YOUTUBE=https://www.youtube.com/\n";
            if (fs.existsSync('.env.example')) envContent = fs.readFileSync('.env.example', 'utf8');

            const prefixo = this.detectLocalIpPrefix();
            if (prefixo) {
                envContent = envContent.replace(/ALLOWED_IP_PREFIX=.*/g, `ALLOWED_IP_PREFIX=${prefixo}`);
            }

            fs.writeFileSync('.env', envContent);
            console.log("==================================================");
            console.log(" ✅ Configuração .env gerada automaticamente!");
            console.log("==================================================");
        }
    }

    static detectLocalIpPrefix() {
        const interfaces = os.networkInterfaces();
        for (const name in interfaces) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address.split('.').slice(0, 3).join('.');
                }
            }
        }
        return null;
    }
}

// ==========================================
// 2. CAMADA DE AUTOMAÇÃO (Padrão Strategy/Inheritance)
// ==========================================

class ActionBase {
    async run(taskName, callback) {
        try {
            return await callback();
        } catch (err) {
            console.error(`❌ Erro em [${taskName}]:`, err.message);
            throw err;
        }
    }

    sanitize(str) {
        return str ? String(str).replace(/[;&|`$<>]/g, '') : '';
    }
}

class KeyboardHandler extends ActionBase {
    constructor() {
        super();
        keyboard.config.autoDelayMs = 0;
    }

    async press(key) {
        return this.run(`Teclar ${key}`, async () => {
            await keyboard.pressKey(key);
            await keyboard.releaseKey(key);
        });
    }

    async combo(modifier, key) {
        return this.run(`Combo ${modifier}+${key}`, async () => {
            await keyboard.pressKey(modifier);
            await keyboard.pressKey(key);
            await keyboard.releaseKey(key);
            await keyboard.releaseKey(modifier);
        });
    }

    async typeText(text) {
        return this.run('Digitar texto', async () => {
            if (!text) return;
            await clipboard.setContent(text);
            await this.combo(Key.LeftControl, Key.V);
        });
    }
}

class MouseHandler extends ActionBase {
    constructor() {
        super();
        mouse.config.mouseSpeed = 0;
    }

    async move(x, y) {
        return this.run('Mover mouse', () => mouse.move(new Point(Number(x), Number(y))));
    }

    async moveRelative(dx, dy) {
        return this.run('Mover relativo', async () => {
            const pos = await mouse.getPosition();
            await mouse.move(new Point(pos.x + (dx * 3), pos.y + (dy * 3)));
        });
    }

    async click(side = 'left', action = 'click') {
        const button = side === 'left' ? Button.LEFT : Button.RIGHT;
        return this.run(`Mouse ${side} ${action}`, async () => {
            if (action === 'down') await mouse.pressButton(button);
            else if (action === 'up') await mouse.releaseButton(button);
            else if (side === 'left') await mouse.leftClick();
            else await mouse.rightClick();
        });
    }
}

class SystemHandler extends ActionBase {
    execute(cmd, description = "Comando") {
        console.log(`💻 Executando: ${description}`);
        exec(cmd);
    }

    openBrowser(url) {
        const profile = this.sanitize(process.env.CHROME_PROFILE || "Default");
        const safeUrl = this.sanitize(url);
        this.execute(`start chrome --profile-directory="${profile}" ${safeUrl}`, `Abrir ${url}`);
    }
}

// ==========================================
// 3. NÚCLEO DO servidor (RemoteServer)
// ==========================================

class RemoteServer {
    constructor() {
        this.app = express();
        this.kb = new KeyboardHandler();
        this.mouse = new MouseHandler();
        this.sys = new SystemHandler();
        this.tentativas = new Map();
        
        this.initialize();
    }

    initialize() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('site'));
        this.app.use(this.securityMiddleware.bind(this));
        
        this.defineRoutes();
    }

    securityMiddleware(req, res, next) {
        if (req.method === 'OPTIONS') return next();

        const ip = req.ip ? req.ip.replace("::ffff:", "") : "unknown";
        const token = req.headers['x-token'];
        const validToken = (process.env.AUTH_TOKEN || "").trim();

        // Rate Limiting & Bloqueio
        const info = this.tentativas.get(ip) || { count: 0, blockUntil: 0 };
        if (info.blockUntil > Date.now()) {
            return res.status(429).json({ erro: "Bloqueado temporariamente." });
        }

        if (token !== validToken) {
            info.count++;
            if (info.count >= 5) info.blockUntil = Date.now() + (5 * 60 * 1000);
            this.tentativas.set(ip, info);
            console.log(`⛔ Token inválido de ${ip}`);
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        this.tentativas.delete(ip);
        if (!req.path.includes('mouse')) console.log(`✅ ${req.method} ${req.path} [${ip}]`);
        next();
    }

    defineRoutes() {
        const { app, kb, mouse, sys } = this;

        // --- Rotas de Escrita ---
        app.post('/digitar', async (req, res) => { await kb.typeText(req.body.texto); res.json({ ok: true }); });
        app.post('/enter', async (req, res) => { await kb.press(Key.Enter); res.json({ ok: true }); });
        app.post('/backspace', async (req, res) => { await kb.press(Key.Backspace); res.json({ ok: true }); });
        app.post('/limpar', async (req, res) => { await kb.combo(Key.LeftControl, Key.A); await kb.press(Key.Backspace); res.json({ ok: true }); });
        app.post('/linha', async (req, res) => { await kb.press(Key.Tab); res.json({ ok: true }); });
        app.post('/numero', async (req, res) => { if (req.body.n !== undefined) await keyboard.type(String(req.body.n)); res.json({ ok: true }); });

        // --- Atalhos & Edição ---
        app.post('/desfazer', async (req, res) => { await kb.combo(Key.LeftControl, Key.Z); res.json({ ok: true }); });
        app.post('/refazer', async (req, res) => { await kb.combo(Key.LeftControl, Key.Y); res.json({ ok: true }); });
        app.post('/tela_cheia', async (req, res) => { await kb.press(Key.F11); res.json({ ok: true }); });
        app.post('/trocar_janela', async (req, res) => { await kb.combo(Key.LeftAlt, Key.Tab); res.json({ ok: true }); });
        app.post('/fechar_guia', async (req, res) => { await kb.combo(Key.LeftControl, Key.W); res.json({ ok: true }); });
        app.post('/fechar_tudo', async (req, res) => { await kb.combo(Key.LeftAlt, Key.F4); res.json({ ok: true }); });
        app.post('/seta', async (req, res) => {
            const map = { up: Key.Up, down: Key.Down, left: Key.Left, right: Key.Right };
            if (map[req.body.direcao]) await kb.press(map[req.body.direcao]);
            res.json({ ok: true });
        });

        // --- Navegação & Volume ---
        app.post('/scroll-down', async (req, res) => { await kb.press(Key.PageDown); res.json({ ok: true }); });
        app.post('/scroll-up', async (req, res) => { await kb.press(Key.PageUp); res.json({ ok: true }); });
        app.post("/atualizar", async (req, res) => { await kb.press(Key.F5); res.json({ ok: true }); });
        app.post('/volume-up', async (req, res) => { await kb.press(Key.AudioVolUp); res.json({ ok: true }); });
        app.post('/volume-down', async (req, res) => { await kb.press(Key.AudioVolDown); res.json({ ok: true }); });

        // --- Mouse ---
        app.post('/mouse-mover', async (req, res) => { await mouse.move(req.body.x, req.body.y); res.json({ ok: true }); });
        app.post('/mouse-mover-relativo', async (req, res) => { await mouse.moveRelative(req.body.dx, req.body.dy); res.json({ ok: true }); });
        app.post('/mouse-clique', async (req, res) => { await mouse.click('left'); res.json({ ok: true }); });
        app.post('/mouse-clique-direito', async (req, res) => { await mouse.click('right'); res.json({ ok: true }); });
        app.post('/mouse-down', async (req, res) => { await mouse.click('left', 'down'); res.json({ ok: true }); });
        app.post('/mouse-up', async (req, res) => { await mouse.click('left', 'up'); res.json({ ok: true }); });

        // --- Apps & Sistema ---
        app.post('/abrir-site', (req, res) => { sys.openBrowser(process.env.URL_NETFLIX); res.json({ ok: true }); });
        app.post('/abrir-hbo', (req, res) => { sys.openBrowser(process.env.URL_HBO); res.json({ ok: true }); });
        app.post('/abrir-yt', (req, res) => { sys.openBrowser(process.env.URL_YOUTUBE); res.json({ ok: true }); });
        app.post('/Bloquear_pc', (req, res) => { sys.execute('rundll32.exe user32.dll,LockWorkStation', 'Bloquear PC'); res.json({ ok: true }); });
        app.post('/cancelar_desligar', (req, res) => { sys.execute('shutdown /a', 'Cancelar Desligamento'); res.json({ ok: true }); });
        app.post('/desligar_pc', (req, res) => {
            sys.execute('msg * "O computador será desligado em 10 segundos"', 'Notificar Desligamento');
            setTimeout(() => sys.execute("shutdown /s /t 10", 'Shutdown'), 2000);
            res.json({ ok: true });
        });

        // --- Status ---
        app.get('/seguranca-status', (req, res) => {
            const token = (process.env.AUTH_TOKEN || "").trim();
            res.json({
                seguranca: token.length >= 6 ? "Alta" : "Média/Baixa",
                sistema: os.platform(),
                uptime: os.uptime()
            });
        });
    }

    start() {
        const PORT = process.env.PORT || 3000;
        this.app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 Controle Remoto Ativo na porta ${PORT}`);
            this.showWelcomeMsg(PORT);
        });
    }

    showWelcomeMsg(port) {
        const interfaces = os.networkInterfaces();
        console.log(`🌐 Acesse pelo celular usando um destes IPs:\n`);
        for (const name in interfaces) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    console.log(`   👉 http://${iface.address}:${port}`);
                }
            }
        }
        
        try {
            const qrcode = require('qrcode-terminal');
            const primaryIp = Object.values(interfaces).flat().find(i => i.family === 'IPv4' && !i.internal).address;
            console.log(`\n📱 QR Code para conexão rápida:`);
            qrcode.generate(`http://${primaryIp}:${port}`, { small: true });
        } catch (e) {}
    }
}

// ==========================================
// 4. BOOTSTRAP
// ==========================================
ConfigManager.init();
const server = new RemoteServer();
server.start();
