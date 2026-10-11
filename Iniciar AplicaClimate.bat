@echo off
chcp 65001 >nul
title AplicaClimate - servidor local
cd /d "%~dp0"

rem --- Busca Node.js: primero en el PATH, despues en las ubicaciones habituales ---
set "NODE_EXE="
for %%I in (node.exe) do if not defined NODE_EXE if exist "%%~$PATH:I" set "NODE_EXE=%%~$PATH:I"
if not defined NODE_EXE if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo.
  echo   No se encontro Node.js en este equipo.
  echo   Instalalo desde https://nodejs.org y volve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

echo.
echo   AplicaClimate - servidor local
echo   Node:       %NODE_EXE%
echo   Direccion:  http://127.0.0.1:4173/
echo.
echo   Deja esta ventana abierta mientras usas la app.
echo   Para detener el servidor: Ctrl + C
echo.

rem Abre el navegador 3 segundos despues, cuando el servidor ya esta escuchando
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:4173/'"

"%NODE_EXE%" "%~dp0scripts\serve.js" 4173

echo.
echo   El servidor se detuvo.
pause
