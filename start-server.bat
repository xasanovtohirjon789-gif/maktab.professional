@echo off
REM Start the HTTP Server for the maktab application
REM This allows localStorage and proper session persistence to work

title Maktab HTTP Server
color 0A

echo.
echo ============================================
echo   Maktab Application HTTP Server
echo ============================================
echo.

cd /d "%~dp0"

echo Starting server on http://localhost:8000
echo.
echo After starting, you can access:
echo   - Main App: http://localhost:8000
echo   - Debug Console: http://localhost:8000/debug-session.html
echo.
echo Press Ctrl+C to stop the server.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "start-server.ps1"

pause
