@echo off
title BusTrack - tunel Cloudflare (bustrack.app.br)
cd /d "%~dp0"

rem Publica o backend em https://bustrack.app.br. O tunel e nomeado ("bustrack"),
rem entao o endereco nao muda entre reinicios — ao contrario do quick tunnel, que
rem sorteia um nome novo a cada subida. As credenciais ficam em
rem %USERPROFILE%\.cloudflared\ e sao criadas por `cloudflared tunnel login`.

set CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe
if not exist "%CF%" set CF=%ProgramFiles%\cloudflared\cloudflared.exe

if not exist "%CF%" (
  echo cloudflared nao encontrado >> tunnel.log
  echo Instale com: winget install Cloudflare.cloudflared >> tunnel.log
  timeout /t 20 /nobreak >nul
  exit /b 1
)

rem Corta o log passando de ~5 MB
for %%A in (tunnel.log) do if %%~zA GTR 5000000 del tunnel.log

:loop
echo. >> tunnel.log
echo === %date% %time% - subindo tunel bustrack.app.br === >> tunnel.log
"%CF%" tunnel --url http://localhost:3001 run bustrack >> tunnel.log 2>&1
echo === %date% %time% - tunel caiu (codigo %errorlevel%), religando em 10s === >> tunnel.log
timeout /t 10 /nobreak >nul
goto loop
