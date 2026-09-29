@echo off
setlocal
set "PID_FILE=%~dp0.server.pid"
if not exist "%PID_FILE%" (
  echo Calculator server is not running.
  exit /b 0
)
set /p SERVER_PID=<"%PID_FILE%"
taskkill /PID %SERVER_PID% /T /F >nul 2>&1
del "%PID_FILE%" >nul 2>&1
echo Calculator server stopped.