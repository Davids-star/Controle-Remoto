const fs = require('fs');
const os = require('os');
const express = require('express');
const cors = require('cors');
const { keyboard, Key, clipboard, mouse, Point, Button } = require("@nut-tree-fork/nut-js");
const { exec } = require('child_process');

// ==========================================
// 1. CLASSE DE CONFIGURAÇÃO
// ==========================================
class ConfigManager {
    static init() {
        if (!fs.existsSync('.env')) {
            let envContent = "PORT=3000\nAUTH_TOKEN=1234\nALLOWED_IP_PREFIX=\nCHROME_PROFILE=Default\nURL_NETFLIX=https://www.netflix.com/browse\nURL_HBO=https://play.hbomax.com/\nURL_YOUTUBE=https://www.youtube.com/\n";
            if (fs.existsSync('.env.example')) envContent = fs.readFileSync('.env.example', 'utf8');

            const prefixo = this.getLocalIpPrefix();
            if (prefixo) {
                envContent = envContent.replace(/ALLOWED_IP_PREFIX=.*/g, `ALLOWED_IP_PREFIX=${prefixo}`);
            }

            fs.writeFileSync('.env', envContent);
            console.log("✅ .env criado com IP:", prefixo);
        }
        require('dotenv').config();
    }

    static getLocalIpPrefix() {
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address.split('.').slice(0, 3).join('.');
                }
            }
        }
        return null;
    }
}

// ==========================================
// 2. SISTEMA DE HERANÇA PARA AÇÕES
// ==========================================

// Classe Base (Pai)
class AutomationAction {
    constructor() {
        this.name = "BaseAction";
    }

    async logAction(msg) {
        console.log(`[${this.constructor.name}] ${msg}`);
    }

    sanitize(str) {
        return str ? str.replace(/[;&|`$<>]/g, '') : '';
    }
}

// Classe Teclado (Herda de AutomationAction)
class KeyboardHandler extends AutomationAction {
    constructor() {
        super();
        keyboard.config.autoDelayMs = 0;
    }

    async press(key) {
        await keyboard.pressKey(key);
        await keyboard.releaseKey(key);
    }

    async combo(modifier, key) {
        await keyboard.pressKey(modifier);
        await keyboard.pressKey(key);
        await keyboard.releaseKey(key);
        await keyboard.releaseKey(modifier);
    }

    async typeText(text) {
        if (!text) return;
        await clipboard.setContent(text);
        await this.combo(Key.LeftControl, Key.V);
    }
}

// Classe Mouse (Herda de AutomationAction)
class MouseHandler extends AutomationAction {
    constructor() {
        super();
        mouse.config.mouseSpeed = 0;
    }

    async move(x, y) {
        await mouse.move(new Point(x, y));
    }

    async moveRelative(dx, dy) {
        const pos = await mouse.getPosition();
        await mouse.move(new Point(pos.x + (dx * 3), pos.y + (dy * 3)));
    }

    async click(button = Button.LEFT) {
        if (button === Button.LEFT) await mouse.leftClick();
        else await mouse.rightClick();
    }
}

// Classe Sistema (Herda de AutomationAction)
class SystemHandler extends AutomationAction {
    execute(command) {
        exec(command);
    }

    openBrowser(url) {
        const profile = this.sanitize(process.env.CHROME_PROFILE || "Default");
        const safeUrl = this.sanitize(url);
        this.execute(`start chrome --profile-directory="${profile}" ${safeUrl}`);
    }
}

// ==========================================
// 3. CLASSE PRINCIPAL DO SERVIDOR
// ==========================================
class RemoteControlServer {
    constructor() {
        this.app = express();
        this.kb = new KeyboardHandler();
        this.mouse = new MouseHandler();
        this.sys = new SystemHandler();
        this.localPrefixes = [];

        this.setupMiddlewares();
        this.setupRoutes();
        this.startIpCache();
    }

    setupMiddlewares() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('site'));

        // Filtro de IP e Token (simplificado para o exemplo)
        this.app.use(this.securityMiddleware.bind(this));
    }

    securityMiddleware(req, res, next) {
        if (req.method === 'OPTIONS') return next();
        
        const ip = req.ip ? req.ip.replace("::ffff:", "") : "";
        const token = req.headers['x-token'];
        const validToken = (process.env.AUTH_TOKEN || "").trim();

        // Verificação Básica
        if (token !== validToken) {
            return res.status(403).json({ erro: 'Token inválido' });
        }
        next();
    }

    startIpCache() {
        const update = () => {
            const interfaces = os.networkInterfaces();
            const newPrefixes = [];
            for (const name in interfaces) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        newPrefixes.push(iface.address.split('.').slice(0, 3).join('.'));
                    }
                }
            }
            this.localPrefixes = newPrefixes;
        };
        update();
        setInterval(update, 10000);
    }

    setupRoutes() {
        const { app, kb, mouse, sys } = this;

        // Rotas Teclado
        app.post('/digitar', async (req, res) => { await kb.typeText(req.body.texto); res.json({ ok: true }); });
        app.post('/enter', async (req, res) => { await kb.press(Key.Enter); res.json({ ok: true }); });
        app.post('/backspace', async (req, res) => { await kb.press(Key.Backspace); res.json({ ok: true }); });
        app.post('/limpar', async (req, res) => { await kb.combo(Key.LeftControl, Key.A); await kb.press(Key.Backspace); res.json({ ok: true }); });
        app.post('/seta', async (req, res) => {
            const map = { up: Key.Up, down: Key.Down, left: Key.Left, right: Key.Right };
            if (map[req.body.direcao]) await kb.press(map[req.body.direcao]);
            res.json({ ok: true });
        });

        // Rotas Mouse
        app.post('/mouse-mover', async (req, res) => { await mouse.move(req.body.x, req.body.y); res.json({ ok: true }); });
        app.post('/mouse-mover-relativo', async (req, res) => { await mouse.moveRelative(req.body.dx, req.body.dy); res.json({ ok: true }); });
        app.post('/mouse-clique', async (req, res) => { await mouse.click(); res.json({ ok: true }); });

        // Rotas Sistema / Apps
        app.post('/abrir-site', (req, res) => { sys.openBrowser(process.env.URL_NETFLIX); res.json({ ok: true }); });
        app.post('/Bloquear_pc', (req, res) => { sys.execute('rundll32.exe user32.dll,LockWorkStation'); res.json({ ok: true }); });
        
        // Status
        app.get('/seguranca-status', (req, res) => {
            res.json({ status: "OK", devices: this.localPrefixes });
        });
    }

    listen() {
        const PORT = process.env.PORT || 3000;
        this.app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor OO rodando na porta ${PORT}`);
            this.showNetworkInfo(PORT);
        });
    }

    showNetworkInfo(port) {
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    console.log(`👉 http://${net.address}:${port}`);
                }
            }
        }
    }
}

// ==========================================
// 4. EXECUÇÃO
// ==========================================
ConfigManager.init();
const server = new RemoteControlServer();
server.listen();
