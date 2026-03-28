# Controle-Remoto
Controle Remoto Para Controlar o Pc Pelo o Celular Via 

Descrição:
Este projeto permite controlar totalmente um computador usando o celular através da mesma rede Wi-Fi. Ele funciona como um controle remoto completo, incluindo teclado, mouse e ações do sistema.

Funcionalidades principais:

Teclado remoto: digitar texto, números, letras, setas, Enter, Backspace, Tab e até Ctrl+Z / Ctrl+Y;

Mouse remoto: mover o cursor, clicar (esquerdo/direito), scroll vertical e arrastar;

Ações do sistema: abrir programas, navegar na web em perfis específicos do Chrome, trocar janelas e bloquear o PC;

Controle de navegadores: abrir YouTube, Netflix, HBO, etc., diretamente pelo celular;

Tecnologias usadas:

Backend: Node.js + Express
Simulação de teclado e mouse: @nut-tree-fork/nut-js
Manipulação de clipboard: clipboardy
Frontend: HTML, CSS e JavaScript (pode ser adaptado para Vue.js)

Como usar:

Rodar o servidor Node.js no computador (node server.js).
Acessar o endereço IP do computador no celular pelo navegador (http://<IP>:3000).
Usar a interface para digitar, clicar, mover o mouse ou executar ações do sistema.

Objetivo do projeto:
Criar um sistema personalizado e seguro, sem depender de aplicativos externos, para controlar o computador remotamente com total liberdade.

Observação:
Existe duas travas de segurança envolvendo o DOM
1 Trava; É uma sennha que você modifica ela no server.js 
2 Trava; Você so pode usar o ip do seu proprio celular, então antes de usar, modifique o ip do server.js para o seu proprio celular
modifique ele nessa parte, colocando o próprio ip do seu celular:
(!ip.startsWith("192.168.18.48"))

