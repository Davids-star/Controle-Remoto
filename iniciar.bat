@echo off
title Iniciar Controle PS4
echo ===================================
echo   INICIANDO O SERVIDOR PS4 MOBILE
echo ===================================

echo.
echo Verificando configuracoes (.env)...
if not exist ".env" (
    echo Arquivo .env nao encontrado! Criando a partir do .env.example...
    copy .env.example .env
    echo [AVISO] Um arquivo .env padrao foi criado. Lembre-se de mudar a senha AUTH_TOKEN depois!
)

echo.
echo Verificando dependencias do painel (QR Code)...
if not exist "node_modules\qrcode-terminal" (
    echo Instalando pacote qrcode-terminal para mostrar o QR code...
    call npm install qrcode-terminal
)

echo.
echo Iniciando o sistema...
node server.js

echo.
pause
