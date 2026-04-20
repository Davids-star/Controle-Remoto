@echo off
title Servidor PS4 Mobile
echo ===================================
echo   INICIANDO O SERVIDOR PS4 MOBILE
echo ===================================

if not exist "node_modules\qrcode-terminal" (
    echo Instalando dependencias pendentes...
    call npm install qrcode-terminal --no-save >nul 2>nul
)

node server.js
pause
<<<<<<< HEAD
=======


>>>>>>> 3cba9cc2315352bd1b8224070eeda76e311c64d9
