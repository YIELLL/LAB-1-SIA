@echo off
setlocal
start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8765"