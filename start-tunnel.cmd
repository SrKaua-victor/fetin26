@echo off
title BusTrack - tunel ngrok (endereco fixo do app)
cd /d "%~dp0"

rem Mantem o app do motorista alcancavel de qualquer rede, no endereco fixo que
rem esta embutido no APK. Sem este tunel o app para de falar com o servidor
rem depois de um reinicio da maquina, mesmo com o backend rodando.

set NGROK=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe

if not exist "%NGROK%" (
  echo ngrok nao encontrado em "%NGROK%" >> tunnel.log
  echo Instale com: winget install ngrok.ngrok >> tunnel.log
  timeout /t 20 /nobreak >nul
  exit /b 1
)

rem Corta o log passando de ~5 MB
for %%A in (tunnel.log) do if %%~zA GTR 5000000 del tunnel.log

:loop
echo. >> tunnel.log
echo === %date% %time% - subindo tunel === >> tunnel.log
"%NGROK%" http --url=https://hatless-harmonize-fragment.ngrok-free.dev 3001 --log=stdout --log-format=logfmt >> tunnel.log 2>&1
echo === %date% %time% - tunel caiu (codigo %errorlevel%), religando em 10s === >> tunnel.log
timeout /t 10 /nobreak >nul
goto loop
