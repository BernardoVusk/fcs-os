@echo off
rem Worker do WhatsApp (Grupos de Ofertas) no proprio computador.
rem Dois cliques para iniciar; fechar a janela ou Ctrl+C para parar.
title Worker do WhatsApp - FCS ERP
cd /d "%~dp0"
call npm run local
pause
