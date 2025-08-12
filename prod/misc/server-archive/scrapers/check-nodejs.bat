@echo off
echo 🔍 Checking Node.js Installation...
echo.

:: Check if node command exists
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js found in PATH
    node --version
) else (
    echo ❌ Node.js not found in PATH
    echo.
    echo Checking common installation paths:
    if exist "C:\Program Files\nodejs\node.exe" (
        echo ✅ Found Node.js at: C:\Program Files\nodejs\node.exe
        "C:\Program Files\nodejs\node.exe" --version
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        echo ✅ Found Node.js at: C:\Program Files (x86)\nodejs\node.exe
        "C:\Program Files (x86)\nodejs\node.exe" --version
    ) else (
        echo ❌ Node.js not found in common locations
        echo.
        echo Please install Node.js from: https://nodejs.org/
        pause
        exit /b 1
    )
)

echo.
:: Check npm
where npm >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm found
    npm --version
) else (
    echo ❌ npm not found
)

echo.
echo 📦 Checking required packages...
cd /d "%~dp0"

:: Check if package.json exists
if exist "..\..\package.json" (
    echo ✅ package.json found
) else (
    echo ❌ package.json not found
)

:: Check if node_modules exists
if exist "..\..\node_modules" (
    echo ✅ node_modules directory exists
    echo.
    echo Testing scraper diagnostic script...
    node debug-scrapers.js
) else (
    echo ❌ node_modules directory not found
    echo.
    echo Run this command to install dependencies:
    echo cd "%~dp0..\..\" && npm install
)

pause 