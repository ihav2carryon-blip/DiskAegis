$ErrorActionPreference = 'SilentlyContinue'

$targets = @(
    @{ Name = "Red-Dead-Redemption (荒野大镖客2)"; Path = "D:\Red-Dead-Redemption"; Drive = "D"; Cat = "game" },
    @{ Name = "ggsl 游戏分卷压缩包"; Path = "D:\ggsl"; Drive = "D"; Cat = "game" },
    @{ Name = "The Incident at Galley House (解谜游戏)"; Path = "D:\The Incident at Galley House"; Drive = "D"; Cat = "game" },
    @{ Name = "ev录屏 (历史操作录像)"; Path = "D:\ev录屏"; Drive = "D"; Cat = "media" },
    @{ Name = "剪映 视频工程缓存"; Path = "D:\剪映"; Drive = "D"; Cat = "media" },
    @{ Name = "openEuler 安装光盘 ISO"; Path = "D:\openEuler_ios"; Drive = "D"; Cat = "iso_installer" },
    @{ Name = "百度网盘下载 (高清壁纸与大文件)"; Path = "D:\BaiduNetdiskDownload"; Drive = "D"; Cat = "iso_installer" },
    @{ Name = "QQ音乐播放缓存"; Path = "D:\QQMusicCache"; Drive = "D"; Cat = "media" },
    @{ Name = "Steam 客户端与游戏库"; Path = "D:\steam"; Drive = "D"; Cat = "game" },
    @{ Name = "SteamLibrary 独立游戏库"; Path = "D:\SteamLibrary"; Drive = "D"; Cat = "game" },
    @{ Name = "CloudMusic 网易云音乐缓存"; Path = "D:\CloudMusic"; Drive = "D"; Cat = "media" },
    @{ Name = "cxdownload 历史下载合集"; Path = "D:\cxdownload"; Drive = "D"; Cat = "iso_installer" },
    @{ Name = "WeGame 游戏与应用"; Path = "D:\WeGameApps"; Drive = "D"; Cat = "game" },
    @{ Name = "NeverRead Rust/Tauri 构建 target"; Path = "D:\workspace\NeverRead\src-tauri\target"; Drive = "D"; Cat = "dev_cache" },
    @{ Name = "v5-sankeshutl 前端 node_modules 依赖"; Path = "D:\workspace\v5-sankeshutl-front\node_modules"; Drive = "D"; Cat = "dev_cache" },
    @{ Name = "sociomart 前端 node_modules 依赖"; Path = "D:\workspace\sociomart\sociomart-frontend\node_modules"; Drive = "D"; Cat = "dev_cache" },
    @{ Name = "用户 Temp 临时垃圾目录"; Path = "$env:LOCALAPPDATA\Temp"; Drive = "C"; Cat = "system_temp" },
    @{ Name = "Windows 更新安装包下载缓存"; Path = "C:\Windows\SoftwareDistribution\Download"; Drive = "C"; Cat = "system_temp" },
    @{ Name = "Python pip 安装包缓存"; Path = "$env:LOCALAPPDATA\pip\cache"; Drive = "C"; Cat = "dev_cache" },
    @{ Name = "Chrome 浏览器网页静态缓存"; Path = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"; Drive = "C"; Cat = "system_temp" },
    @{ Name = "Edge 浏览器网页静态缓存"; Path = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"; Drive = "C"; Cat = "system_temp" },
    @{ Name = "Notion 客户端离线缓存"; Path = "$env:APPDATA\Notion"; Drive = "C"; Cat = "media" },
    @{ Name = "抖音直播伴侣媒体与运行日志"; Path = "$env:APPDATA\webcast_mate"; Drive = "C"; Cat = "media" },
    @{ Name = "企业微信历史接收文件与文档"; Path = "$env:USERPROFILE\OneDrive\文档\WXWork"; Drive = "C"; Cat = "media" },
    @{ Name = "OneDrive 本地高清视频与图片"; Path = "$env:USERPROFILE\OneDrive\图片"; Drive = "C"; Cat = "media" }
)

$results = [System.Collections.Generic.List[PSCustomObject]]::new()

foreach ($item in $targets) {
    if (Test-Path $item.Path) {
        $measure = (Get-ChildItem -LiteralPath $item.Path -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($measure -gt 10MB) {
            $sizeGB = [math]::Round($measure / 1GB, 2)
            $sizeMB = [math]::Round($measure / 1MB, 2)
            $lastWrite = (Get-Item $item.Path).LastWriteTime.ToString("yyyy-MM-dd HH:mm")

            $results.Add([PSCustomObject]@{
                id = "item_" + [System.Guid]::NewGuid().ToString().Substring(0,8)
                drive = $item.Drive
                name = $item.Name
                path = $item.Path
                sizeGB = $sizeGB
                sizeMB = $sizeMB
                category = $item.Cat
                lastModified = $lastWrite
            })
        }
    }
}

$outputFile = Join-Path $PSScriptRoot "temp_scan.json"
$json = $results | Sort-Object sizeMB -Descending | ConvertTo-Json -Depth 4
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($outputFile, $json, $utf8NoBom)
Write-Output "SCAN_SUCCESS:$($results.Count)"
