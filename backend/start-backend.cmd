@echo off
title BusTrack backend (porta 3001)
cd /d "%~dp0"

rem Log cresce pouco (uma linha por conexao), mas nao vale deixar sem teto:
rem passando de ~5 MB, comeca de novo.
for %%A in (server.log) do if %%~zA GTR 5000000 del server.log

:loop
echo. >> server.log
echo === %date% %time% - iniciando backend === >> server.log
node --env-file-if-exists=../.env src/index.js >> server.log 2>&1
echo === %date% %time% - backend parou (codigo %errorlevel%), reiniciando em 5s === >> server.log
timeout /t 5 /nobreak >nul
goto loop
