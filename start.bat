@echo off
echo ===============================================
echo   AutoVideo - AI Video Generator
echo ===============================================
echo.

REM Check if .env exists
if not exist backend\.env (
    echo [!] backend\.env not found. Copying from .env.example...
    copy backend\.env.example backend\.env
    echo [!] Please edit backend\.env and add your API keys, then re-run this script.
    pause
    exit /b 1
)

REM Start backend in new window
echo [1] Starting backend (FastAPI on port 8000)...
start "AutoVideo Backend" cmd /k "cd backend && pip install -r requirements.txt -q && python main.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Install frontend deps if needed
if not exist frontend\node_modules (
    echo [2] Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

REM Start frontend in new window
echo [3] Starting frontend (Next.js on port 3000)...
start "AutoVideo Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===============================================
echo   App running at: http://localhost:3000
echo   API running at: http://localhost:8000
echo ===============================================
echo.
echo Press any key to open the browser...
pause > nul
start http://localhost:3000
