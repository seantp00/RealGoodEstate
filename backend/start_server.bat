@echo off
echo ============================================================
echo Real Good Estate - ML Backend Server Startup
echo ============================================================
echo.

echo [1/3] Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)
echo.

echo [2/3] Installing required packages...
pip install -q flask flask-cors numpy scikit-learn
if %errorlevel% neq 0 (
    echo ERROR: Failed to install packages
    pause
    exit /b 1
)
echo Packages installed successfully!
echo.

echo [3/3] Starting ML prediction server...
echo.
echo The server will start on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
python server.py

