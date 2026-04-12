const IP = window.location.origin;

// Tenta pegar a senha salva no navegador/celular
let TOKEN = localStorage.getItem('controle_senha');

// Se não tiver a senha salva, pede para o usuário digitar
if (!TOKEN) {
  TOKEN = prompt("🔒 Digite a senha para acessar o controle:");
  if (TOKEN) {
    localStorage.setItem('controle_senha', TOKEN);
  }
}

function api(url, method = "POST", body = null){
  return fetch(`${IP}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-token": TOKEN
    },
    body: body ? JSON.stringify(body) : null
  }).then(async res => {
    // Se a API retornar erro 403 (Senha incorreta ou IP bloqueado)
    if (res.status === 403) {
      alert("❌ Acesso Negado! Senha incorreta ou IP bloqueado.");
      localStorage.removeItem('controle_senha');
      location.reload(); // Recarrega a página para pedir a senha novamente
    }
    return res;
  });
}
//enviar

function enviar() {
  const texto = document.getElementById("texto").value
  console.log("Enviando:", texto)

  api('/digitar', 'POST', { texto })
  .then(r => r.json())
  .then(d => console.log("Resposta:", d))
  .catch(err => {
    console.error("Erro:", err)
    alert("Erro: " + err.message)
  })
}
//botãoo enter
function enter() {
  console.log("Enviando Enter")
  api('/enter')
  .then(r => r.json())
  .then(d => console.log("Resposta:", d))
  .catch(err => {
    console.error("Erro:", err)
    alert("Erro: " + err.message)
  })
}
// 🔥 DETECTAR ENTER
document.getElementById("texto").addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    enviar()
  }
})
//apagar e limpar
function backspace() {
  api('/backspace')
}

function limpar() {
  api('/limpar')
}

function desfazer(){
  api('/desfazer')
}

function refazer(){
  api('/refazer')
}

function linha(){
  api('/linha')
}

function bloquear(){
  api('/Bloquear_pc')
}

function desligar_pc(){
  api('/desligar_pc')

}
function cancelar_desligar(){
  api('/cancelar_desligar')
}

function janela(){
  api('/trocar_janela')
}

 //fechar pagina ou abas
function fechar_pagina(){
  api('/fechar_guia')
}
function fechar_janela(){
  api('/fechar_tudo')
}


function Netflix(){
  api('/abrir-site')
  .then(r => r.json())
  .then(d => console.log("Netflix aberto:", d))
  .catch(err => {
    console.error("Erro ao abrir Netflix:", err)
    alert("Erro: " + err.message)
  })
}
function Hbo(){
  api('/abrir-hbo')
  .then(r => r.json())
  .then(d => console.log("HBO aberto:", d))
  .catch(err => {
    console.error("Erro ao abrir HBO:", err)
    alert("Erro: " + err.message)
  })
}
function Youtube(){
  api('/abrir-yt')
  .then(r => r.json())
  .then(d => console.log("YouTube aberto:", d))
  .catch(err => {
    console.error("Erro ao abrir YouTube:", err)
    alert("Erro: " + err.message)
  })
}

//subir ou descer paginas
function scrollDown() {
  api('/scroll-down')
}

function scrollUp() {
  api('/scroll-up')
}
//atualizar
function atualizar(){
  api('/atualizar')
  .then(r => r.json())
  .then(d => console.log("Página atualizada:", d))
  .catch(err => {
    console.error("Erro ao atualizar:", err)
  })
}
// tela cheia
function tela_cheia(){
  api('/tela_cheia')
  .then(r => r.json())
  .then(d => console.log("Tela cheia:", d))
  .catch(err => {
    console.error("Erro ao tela cheia:", err)
  })
}

//setas
function seta(d){ 
  api('/seta', 'POST', { direcao: d })
}
//numeros
function num(n){
  api('/numero', 'POST', { n })
}

//volume
let intervalVolume = null;

function volumeUp(){
  if (!intervalVolume) {
    api('/volume-up');
    intervalVolume = setInterval(() => {
      api('/volume-up');
    }, 100);
  }
}

function volumeDown(){
  if (!intervalVolume) {
    api('/volume-down');
    intervalVolume = setInterval(() => {
      api('/volume-down');
    }, 100);
  }
}

function soltarVolume(){
  if (intervalVolume) {
    clearInterval(intervalVolume);
    intervalVolume = null;
  }
}



                  //MAUSE
function mouseMover(x,y){ 
  api('/mouse-mover', 'POST', { x, y }) 
}

function mouseMoverRelativo(dx,dy){
  api('/mouse-mover-relativo', 'POST', { dx, dy })
}
//clique do mause
function clique(){
  api('/mouse-clique');
  feedbackClique();
}

function cliqueDireito()
{ 
  api('/mouse-clique-direito');
  feedbackClique();
}

function mouseDown() {
  api('/mouse-down')
}

function mouseUp() {
  api('/mouse-up')
}

//ÁREA ONDE MOVE O MAUSE NO CELULAR
const area = document.getElementById("mouse-area");
let lastX, lastY;
let draggingMouse = false; // Se está movendo o cursor
let isDoubleTapDragging = false; // Se está no modo de arrastar (segundo toque)
let lastTapTime = 0;
let movedSinceStart = false;

area.addEventListener("touchstart", e => {
    e.preventDefault();
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;

    draggingMouse = true;
    movedSinceStart = false;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;

    // Detecta o início do segundo toque para arraste
    if (timeSinceLastTap < 400 && timeSinceLastTap > 50) {
        isDoubleTapDragging = true;
        mouseDown(); // Pressiona o botão do mouse no servidor
        area.style.background = "rgba(255, 255, 255, 0.3)"; // Destaque para arraste
    }
}, { passive: false });

area.addEventListener("touchmove", e => {
    if (!draggingMouse) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - lastX;
    const dy = e.touches[0].clientY - lastY;

    // Se moveu mais que 3px, consideramos movimento
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        movedSinceStart = true;
    }

    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;

    // Movimentação do mouse
    mouseMoverRelativo(dx * 1.5, dy * 1.5); 
}, { passive: false });

area.addEventListener("touchend", e => {
    e.preventDefault();
    draggingMouse = false;
    const now = Date.now();

    if (isDoubleTapDragging) {
        // Final de um arraste (double tap hold release)
        mouseUp(); // Solta o botão do mouse
        isDoubleTapDragging = false;
        lastTapTime = 0;
        area.style.background = ""; // Remove destaque
    } else {
        // Se não moveu, é um toque (clique)
        if (!movedSinceStart) {
            clique(); // Clique esquerdo simples
            lastTapTime = now;
        } else {
            // Se moveu e soltou, não é um double tap dragging
            lastTapTime = 0;
        }
    }
    movedSinceStart = false;
}, { passive: false });

// Monitor de Segurança
function verificarSeguranca() {
  const badge = document.getElementById("status-seguranca");
  
  api('/seguranca-status', 'GET')
  .then(res => res.json())
  .then(data => {
    badge.className = "security-status";
    if (data.total_score >= 100) {
      badge.classList.add("ok");
      badge.innerHTML = `<span class="status-dot"></span> Protegido`;
    } else if (data.total_score >= 50) {
      badge.classList.add("warn");
      badge.innerHTML = `<span class="status-dot"></span> Vulnerável (Melhore o Token)`;
    } else {
      badge.classList.add("danger");
      badge.innerHTML = `<span class="status-dot"></span> Crítico!`;
    }
    console.log("Status de Segurança:", data);
  })
  .catch(err => {
    badge.classList.add("danger");
    badge.innerHTML = `<span class="status-dot"></span> Offline`;
  });
}

// Verifica ao carregar
verificarSeguranca();

// Feedback visual na área de mouse
function feedbackClique() {
    const originalBg = area.style.background;
    area.style.background = "rgba(255, 255, 255, 0.2)";
    setTimeout(() => {
        area.style.background = originalBg;
    }, 100);
}
