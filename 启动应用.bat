@echo off
chcp 65001 >nul
title AI Disk & RAM Cleaner Desktop Launcher
echo ===================================================
echo   正在唤起 AI Disk & RAM Cleaner 智能桌面大师...
echo ===================================================
cd /d "%~dp0"

:: 检查 node 是否存在
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境，请先安装 Node.js (https://nodejs.org/)
    pause
    exit /b 1
)

:: 启动桌面模式
npm run electron
if %errorlevel% neq 0 (
    echo [提示] 正在切换至极速原生桌面窗口模式...
    npm run app
)
