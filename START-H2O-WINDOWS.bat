@echo off
title H2O 1.0.0-rc.5 - Minimal AI Coding Environment
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.12+ is required. Download from https://nodejs.org/
  pause
  exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number);const ok=(v[0]===22&&v[1]>=12)||v[0]>22;process.exit(ok?0:1)"
if errorlevel 1 (
  echo Unsupported Node.js version. Use Node.js 22.12 or newer.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing H2O dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check your network and npm configuration.
    pause
    exit /b 1
  )
)
node src/index.js
pause
