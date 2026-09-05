# DiskAegis Windows Release 构建脚本
Write-Host ">>> 步骤 1/4: 准备构建环境与安全隔离..." -ForegroundColor Cyan

# 备份用户私密配置
if (Test-Path "config.json") {
    Copy-Item "config.json" "config.json.user_bak" -Force
}

try {
    # 替换为干净的示例配置
    if (Test-Path "config.example.json") {
        Copy-Item "config.example.json" "config.json" -Force
    }

    # 创建或清理输出目录
    if (-not (Test-Path "dist")) {
        New-Item -ItemType Directory -Path "dist" | Out-Null
    }

    Write-Host ">>> 步骤 2/4: 执行 Electron 构建打包 (x64)..." -ForegroundColor Cyan
    npx electron-packager . DiskAegis --platform=win32 --arch=x64 --out=dist --overwrite --prune=true --ignore="^/(\.git|dist|scratch|\.vscode|config\.json\.user_bak|build_release\.ps1)"

    if (-not (Test-Path "dist\DiskAegis-win32-x64\DiskAegis.exe")) {
        throw "构建失败: 未检测到 dist\DiskAegis-win32-x64\DiskAegis.exe"
    }

    Write-Host ">>> 步骤 3/4: 打包生成 Release 压缩包 (.zip)..." -ForegroundColor Cyan
    $zipPath = "dist\DiskAegis-v1.0.0-windows-x64.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    Compress-Archive -Path "dist\DiskAegis-win32-x64\*" -DestinationPath $zipPath -CompressionLevel Optimal

    $zipFile = Get-Item $zipPath
    $sizeMB = [math]::Round($zipFile.Length / 1MB, 2)
    Write-Host ">>> 步骤 4/4: 打包完成! 文件生成于: $zipPath (体积: ${sizeMB} MB)" -ForegroundColor Green

} finally {
    # 无论成功失败，必须百分之百还原用户的敏感配置
    if (Test-Path "config.json.user_bak") {
        Move-Item "config.json.user_bak" "config.json" -Force
        Write-Host ">>> 安全恢复: 用户本地 config.json 已恢复原样。" -ForegroundColor Yellow
    }
}
