const express = require('express')
const cors = require('cors')
const { keyboard, Key, clipboard } = require("@nut-tree-fork/nut-js")
const { mouse, Point, Button } = require("@nut-tree-fork/nut-js");
const { exec } = require('child_process')


//tempo de escrever
keyboard.config.autoDelayMs = 0

const app = express()
app.use(cors())
app.use(express.json())

// Filtro de IP ativado globalmente (Antes até do HTML carregar)
function ipFilter(req, res, next) {
    const ip = req.ip ? req.ip.replace("::ffff:", "") : "";

    if (!ip.startsWith("192.168.18.48") && ip !== "127.0.0.1" && ip !== "::1") {
        console.log("🚫 IP ACESSO NEGADO:", ip);
        return res.status(403).send("Acesso totalmente bloqueado para este IP.");
    }
    next();
}
app.use(ipFilter);

app.use(express.static('site'))

// Middleware de proteção por Token (Protege tudo que vier depois)
app.use((req, res, next) => {
    const token = req.headers['x-token'];

    if (token !== '3598') {
        console.log("⛔ API NEGADA. Token inválido! Recebido:", token);
        return res.status(403).json({ erro: 'Acesso negado: Token inválido' });
    }

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

//Abrir chrome com o cmd
app.post('/abrir-site', (req, res) => {
    exec('start chrome --profile-directory="Default" https://www.netflix.com/browse')
    res.json({ ok: true })

})
//abrir o hbo com o cmd
app.post('/abrir-hbo', (req, res) => {
    exec('start chrome --profile-directory="Default"  https://play.hbomax.com/')
    res.json({ ok: true })
})

//youtube
app.post('/abrir-yt', (req, res) => {
    exec('start chrome --profile-directory="Default" https://www.youtube.com/')
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


app.listen(3000, '0.0.0.0', () => {
    console.log('servidor rodando na port 3000')
})
