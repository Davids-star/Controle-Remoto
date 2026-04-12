require('dotenv').config();
const express = require('express')
const cors = require('cors')
const os = require('os')
const { keyboard, Key, clipboard } = require("@nut-tree-fork/nut-js")
const { mouse, Point, Button } = require("@nut-tree-fork/nut-js");
const { exec } = require('child_process')


//tempo de escrever
keyboard.config.autoDelayMs = 0

const app = express()
app.use(cors())
app.use(express.json())

// Prevenção de Brute Force (Rate Limiting básico em memória)
const tentativasErradas = new Map();
function rateLimit(req, res, next) {
    const ip = req.ip;
    const agora = Date.now();
    const info = tentativasErradas.get(ip) || { count: 0, blockUntil: 0 };

    if (info.blockUntil > agora) {
        return res.status(429).json({ erro: "Muitas tentativas. Bloqueado temporariamente." });
    }
    next();
}
app.use(rateLimit);

// Filtro de IP ativado globalmente (Antes até do HTML carregar)
function ipFilter(req, res, next) {
    const ip = req.ip ? req.ip.replace("::ffff:", "") : "";
    const allowedPrefix = (process.env.ALLOWED_IP_PREFIX || "").trim();

    // Permitir localhost e IP da configuração
    if (ip === "127.0.0.1" || ip === "::1") return next();
    if (allowedPrefix && ip.startsWith(allowedPrefix)) return next();

    // Permitir acesso dinâmico de aparelhos na mesma rede do notebook
    const networkInterfaces = require('os').networkInterfaces();
    let isLocalNetwork = false;

    for (const name in networkInterfaces) {
        for (const iface of networkInterfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                // Pega os 3 primeiros octetos (ex: 192.168.1)
                const hostPrefix = iface.address.split('.').slice(0, 3).join('.');
                if (ip.startsWith(hostPrefix)) {
                    isLocalNetwork = true;
                }
            }
        }
    }

    if (!isLocalNetwork) {
        console.log(`🚫 IP ACESSO NEGADO: [${ip}] | Fora da rede local permitida.`);
        return res.status(403).send("Acesso totalmente bloqueado para este IP.");
    }
    next();
}
app.use(ipFilter);

app.use(express.static('site'))

// Middleware de proteção por Token (Protege tudo que vier depois)
app.use((req, res, next) => {
    // 🔥 Permite OPTIONS sem validar token (Necessário para CORS)
    if (req.method === 'OPTIONS') {
        return next();
    }

    const token = req.headers['x-token'];
    const validToken = (process.env.AUTH_TOKEN || "").trim();

    // Segurança extra: Se o token do .env estiver vazio por erro, bloqueia tudo
    if (!validToken || validToken.length < 4) {
        console.error("❌ ERRO CRÍTICO: AUTH_TOKEN não configurado ou muito curto!");
        return res.status(500).json({ erro: 'Erro interno de configuração de segurança' });
    }

    if (token !== validToken) {
        const ip = req.ip;
        const info = tentativasErradas.get(ip) || { count: 0, blockUntil: 0 };
        info.count++;
        
        // Se errar 5 vezes, bloqueia por 5 minutos
        if (info.count >= 5) {
            info.blockUntil = Date.now() + (5 * 60 * 1000); 
            console.log(`🚫 IP BLOQUEADO POR BRUTE FORCE: ${ip}`);
        }
        
        tentativasErradas.set(ip, info);
        console.log(`⛔ API NEGADA. Token inválido! Recebido: [${token}]`);
        return res.status(403).json({ erro: 'Acesso negado: Token inválido' });
    }

    // Se acertar o token, reseta as tentativas
    tentativasErradas.delete(req.ip);

    let ip = req.ip ? req.ip.replace("::ffff:", "") : "desconhecido";
    console.log("✅ Comando autorizado. IP conectado:", ip);
    next();
});
//digitar texto
app.post('/digitar', async (req, res) => {
    const { texto } = req.body
    console.log("Recebido do celular:", texto);
    // copia o texto pro clipboard
    await clipboard.setContent(texto);

    // cola o texto com Ctrl+V
    await keyboard.pressKey(Key.LeftControl, Key.V);
    await keyboard.releaseKey(Key.V, Key.LeftControl);
    res.json({ ok: true })
})

//tecla enter
app.post('/enter', async (req, res) => {
    await keyboard.pressKey(Key.Enter)
    await keyboard.releaseKey(Key.Enter)
    res.json({ ok: true })
})


//backspace - apaga uma letra
app.post('/backspace', async (req, res) => {
    await keyboard.pressKey(Key.Backspace)
    await keyboard.releaseKey(Key.Backspace)
    console.log("Backspace acionado")
    res.json({ ok: true })
})
//setas:cima
app.post('/seta', async (req, res) => {
    const { direcao } = req.body; // up, down, left, right
    const map = { up: Key.Up, down: Key.Down, left: Key.Left, right: Key.Right };
    await keyboard.pressKey(map[direcao]); await keyboard.releaseKey(map[direcao]);
    res.json({ ok: true });
});

//tela cheia 
app.post('/tela_cheia', async (req, res) => {
    console.log("Limpando corretamente...")
    await keyboard.pressKey(Key.F11)
    await keyboard.releaseKey(Key.F11)
    res.json({ ok: true })
})


//apagar tudo (Ctrl+A + Delete)
app.post('/limpar', async (req, res) => {
    console.log("Limpando corretamente...")

    // coloca vazio no clipboard
    await clipboard.setContent("")

    // CTRL + A (seleciona tudo)
    await keyboard.pressKey(Key.LeftControl)
    await keyboard.pressKey(Key.A)

    await keyboard.releaseKey(Key.A)
    await keyboard.releaseKey(Key.LeftControl)

    // pequeno delay
    await new Promise(r => setTimeout(r, 150))

    // CTRL + V (substitui tudo)
    await keyboard.pressKey(Key.LeftControl)
    await keyboard.pressKey(Key.V)

    await keyboard.releaseKey(Key.V)
    await keyboard.releaseKey(Key.LeftControl)

    res.json({ ok: true })
})
// desfazer crtl +z
app.post('/desfazer', async (req, res) => {
    await clipboard.setContent("")

    await keyboard.pressKey(Key.LeftControl)
    await keyboard.pressKey(Key.Z)
    await keyboard.releaseKey(Key.Z)
    await keyboard.releaseKey(Key.LeftControl)

    console.log("voltando..")
    await new Promise(r => setTimeout(r, 150))

    res.json({ ok: true })
})
//crtl+y
app.post('/refazer', async (req, res) => {
    await clipboard.setContent("")

    await keyboard.pressKey(Key.LeftControl)
    await keyboard.pressKey(Key.Y)
    await keyboard.releaseKey(Key.Y)
    await keyboard.releaseKey(Key.LeftControl)

    console.log("Refazendo..")
    await new Promise(r => setTimeout(r, 150))

    res.json({ ok: true })

})
//tab
app.post('/linha', async (req, res) => {

    await keyboard.pressKey(Key.Tab)
    await keyboard.releaseKey(Key.Tab)

    console.log("Linha")

    res.json({ ok: true })
})

//Bloquear o pc
app.post('/Bloquear_pc', async (req, res) => {

    exec('rundll32.exe user32.dll,LockWorkStation');
    console.log("Bloqueando..")
    await new Promise(r => setTimeout(r, 150))

    res.json({ ok: true })

})
//desligar o pc
app.post('/desligar_pc', async(req, res)=>{ 
    exec('msg * "O computador será desligado em 10 segundos"')
    await new Promise(r => setTimeout(r,150 ))
    exec("shutdown /s /t 10")

    res.json({ ok : true})

})
//cancelar o deligamento do pc
app.post('/cancelar_desligar', async(req, res) =>{

    exec("shutdown /a")
    await new Promise(r => setTimeout(r,150 ))

    res.json({ ok : true})

})

// Trocar janela (Alt + Tab)
app.post('/trocar_janela', async (req, res) => {
    await keyboard.pressKey(Key.LeftAlt)
    await keyboard.pressKey(Key.Tab)
    await keyboard.releaseKey(Key.Tab)
    await keyboard.releaseKey(Key.LeftAlt)

    console.log("Alt + Tab acionado")
    res.json({ ok: true })
})

// Fechar Guia / Aba (Ctrl + W ou Ctrl + F4)
app.post('/fechar_guia', async (req, res) => {
    await keyboard.pressKey(Key.LeftControl)
    await keyboard.pressKey(Key.W)
    await keyboard.releaseKey(Key.W)
    await keyboard.releaseKey(Key.LeftControl)

    console.log("Fechar guia acionado (Ctrl+W)")
    res.json({ ok: true })
})

// Fechar Tudo / Programa (Alt + F4)
app.post('/fechar_tudo', async (req, res) => {
    await keyboard.pressKey(Key.LeftAlt)
    await keyboard.pressKey(Key.F4)
    await keyboard.releaseKey(Key.F4)
    await keyboard.releaseKey(Key.LeftAlt)

    console.log("Fechar programa acionado (Alt+F4)")
    res.json({ ok: true })
})


// NAvegador
const CHROME_PROFILE = process.env.CHROME_PROFILE || "Default";

// Função para sanitizar entradas de shell
function sanitize(str) {
    return str.replace(/[;&|`$<>]/g, '');
}

//Abrir chrome com o cmd
app.post('/abrir-site', (req, res) => {
    const url = process.env.URL_NETFLIX || "https://www.netflix.com/browse";
    const profile = sanitize(CHROME_PROFILE);
    const safeUrl = sanitize(url);
    exec(`start chrome --profile-directory="${profile}" ${safeUrl}`)
    res.json({ ok: true })
})

//abrir o hbo com o cmd
app.post('/abrir-hbo', (req, res) => {
    const url = process.env.URL_HBO || "https://play.hbomax.com/";
    exec(`start chrome --profile-directory="${CHROME_PROFILE}" ${url}`)
    res.json({ ok: true })
})

//youtube
app.post('/abrir-yt', (req, res) => {
    const url = process.env.URL_YOUTUBE || "https://www.youtube.com/";
    const profile = sanitize(CHROME_PROFILE);
    const safeUrl = sanitize(url);
    exec(`start chrome --profile-directory="${profile}" ${safeUrl}`)
    res.json({ ok: true })
})


//subir e descer tela
app.post('/scroll-down', async (req, res) => {
    await keyboard.pressKey(Key.PageDown)
    await keyboard.releaseKey(Key.PageDown)

    res.json({ ok: true })
})

app.post('/scroll-up', async (req, res) => {
    await keyboard.pressKey(Key.PageUp)
    await keyboard.releaseKey(Key.PageUp)

    res.json({ ok: true })
})
//atualizar tela f5
app.post("/atualizar", async (req, res) => {
    await keyboard.pressKey(Key.F5);
    await keyboard.releaseKey(Key.F5);
    res.json({ ok: true });
});

// Teclado numérico
app.post('/numero', async (req, res) => {
    const { n } = req.body;

    if (n !== undefined) {
        await keyboard.type(String(n));
    }

    res.json({ ok: true });
});

//volume

app.post('/volume-up', async (req, res) => {
    await keyboard.pressKey(Key.AudioVolUp);
    await keyboard.releaseKey(Key.AudioVolUp);
    res.json({ ok: true });
});

// diminuir volume
app.post('/volume-down', async (req, res) => {
    await keyboard.pressKey(Key.AudioVolDown);
    await keyboard.releaseKey(Key.AudioVolDown);
    res.json({ ok: true });
});


///MAUSE
//Position fixa(bom ppara barra de pesquisa)(adicionar )
app.post('/mouse-mover', async (req, res) => {
    try {
        const { x, y } = req.body;
        await mouse.move(new Point(x, y));
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, erro: err.message });
    }
})
// position relative
app.post('/mouse-mover-relativo', async (req, res) => {
    try {
        const { dx, dy } = req.body;
        const pos = await mouse.getPosition();
        let newX = pos.x + (dx * 3);
        let newY = pos.y + (dy * 3);

        await mouse.move(new Point(newX, newY));
        res.json({ ok: true });
    } catch (err) {
        console.error("Erro ao mover mouse:", err);
        res.status(500).json({ ok: false });
    }
});

// Clique esquerdo
app.post('/mouse-clique', async (req, res) => {
    await mouse.leftClick();
    res.json({ ok: true });
});

// Clique direito
app.post('/mouse-clique-direito', async (req, res) => {
    await mouse.rightClick();
    res.json({ ok: true });
});

// Pressionar botão esquerdo (para arrastar)
app.post('/mouse-down', async (req, res) => {
    await mouse.pressButton(Button.LEFT);
    res.json({ ok: true });
});

// Soltar botão esquerdo
app.post('/mouse-up', async (req, res) => {
    await mouse.releaseButton(Button.LEFT);
    res.json({ ok: true });
});


// Diagnóstico de Segurança (Para o usuário ver o próprio status)
app.get('/seguranca-status', (req, res) => {
    const token = (process.env.AUTH_TOKEN || "").trim();
    const score = token.length >= 8 ? 100 : (token.length * 10);
    const ipFiltro = !!(process.env.ALLOWED_IP_PREFIX);
    
    res.json({
        protecao_token: token.length >= 6 ? "Forte" : "Fraca (adicione mais dígitos)",
        filtro_ip_ativo: ipFiltro ? "Sim" : "Não (perigo!)",
        total_score: score + (ipFiltro ? 30 : 0)
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    
    const networkInterfaces = os.networkInterfaces();
    console.log(`🌐 Descubra seu IP para acessar pelo celular:`);
    
    let firstIp = null;
    
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const interfaceInfo of interfaces) {
            if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
                const link = `http://${interfaceInfo.address}:${PORT}`;
                console.log(`   👉 ${link}`);
                if (!firstIp) firstIp = link;
            }
        }
    }

    if (firstIp) {
        try {
            const qrcode = require('qrcode-terminal');
            console.log(`\n📱 Escaneie o QR Code abaixo com a câmera do celular para acessar:\n`);
            qrcode.generate(firstIp, { small: true });
        } catch (e) {
            console.log(`\n(Instale o pacote qrcode-terminal para ver o QR code na tela)`);
        }
    }
})
