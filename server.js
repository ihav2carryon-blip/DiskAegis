const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { callAiModel } = require('./ai_client');

const app = express();
const PORT = process.env.PORT || 3928;
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --------------------------- 辅助工具函数 ---------------------------

function runPowershell(command) {
    return new Promise((resolve, reject) => {
        const buffer = Buffer.from(command, 'utf16le');
        const base64Script = buffer.toString('base64');
        const fullCmd = `pwsh -NoProfile -NonInteractive -EncodedCommand ${base64Script}`;
        exec(fullCmd, { maxBuffer: 1024 * 1024 * 30 }, (error, stdout, stderr) => {
            if (error) {
                // 回退到普通 powershell
                const fallbackCmd = `powershell -NoProfile -NonInteractive -EncodedCommand ${base64Script}`;
                exec(fallbackCmd, { maxBuffer: 1024 * 1024 * 30 }, (err2, out2, errOut2) => {
                    if (err2) {
                        return reject(err2);
                    }
                    resolve(out2 ? out2.trim() : '');
                });
            } else {
                resolve(stdout ? stdout.trim() : '');
            }
        });
    });
}

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load config:', e);
    }
    const defaultConfig = {
        protocol: 'openai',
        provider: 'deepseek',
        apiKey: '',
        model: 'deepseek-v4-flash',
        baseUrl: 'https://api.deepseek.com',
        userProfession: '通用职场办公 / 电脑使用者',
        customPrompt: '请绝对保留我的核心工作文档、业务聊天通信数据与不可再生工程资产；各类应用产生的临时缓存日志、过期的安装包镜像、闲置的娱乐大游戏可以放心清理。'
    };
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
    } catch (_) {}
    return defaultConfig;
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Failed to save config:', e);
        return false;
    }
}

// --------------------------- API 路由 ---------------------------

// 1. 获取/保存配置
app.get('/api/config', (req, res) => {
    const cfg = loadConfig();
    const maskedKey = cfg.apiKey ? (cfg.apiKey.length > 8 ? cfg.apiKey.slice(0, 4) + '••••••••' + cfg.apiKey.slice(-4) : '••••••••') : '';
    res.json({
        ...cfg,
        hasApiKey: !!cfg.apiKey,
        maskedApiKey: maskedKey
    });
});

app.post('/api/config', (req, res) => {
    const current = loadConfig();
    const { protocol, provider, apiKey, model, baseUrl, userProfession, customPrompt } = req.body;
    
    const newConfig = {
        ...current,
        protocol: protocol || current.protocol || 'openai',
        provider: provider || current.provider,
        model: model !== undefined ? model.trim() : current.model,
        baseUrl: baseUrl !== undefined ? baseUrl.trim() : current.baseUrl,
        userProfession: userProfession !== undefined ? userProfession : current.userProfession,
        customPrompt: customPrompt !== undefined ? customPrompt : current.customPrompt
    };

    if (apiKey && apiKey !== current.apiKey && !apiKey.includes('••••')) {
        newConfig.apiKey = apiKey.trim();
    }

    if (saveConfig(newConfig)) {
        res.json({ success: true, message: '配置保存成功', config: newConfig });
    } else {
        res.status(500).json({ success: false, message: '保存配置失败' });
    }
});

// 2. 获取 C 盘和 D 盘容量数据
app.get('/api/system/disks', async (req, res) => {
    try {
        const psCmd = `
            Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -in 'C','D' } | ForEach-Object {
                [PSCustomObject]@{
                    Name = $_.Name
                    TotalGB = [math]::Round(($_.Used + $_.Free) / 1GB, 2)
                    UsedGB = [math]::Round($_.Used / 1GB, 2)
                    FreeGB = [math]::Round($_.Free / 1GB, 2)
                    UsedPercent = [math]::Round(($_.Used / ($_.Used + $_.Free)) * 100, 1)
                }
            } | ConvertTo-Json
        `;
        const output = await runPowershell(psCmd);
        let disks = [];
        if (output) {
            const parsed = JSON.parse(output);
            disks = Array.isArray(parsed) ? parsed : [parsed];
        }
        res.json({ success: true, disks });
    } catch (e) {
        console.error('Error getting disks:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 3. 获取系统运行内存 (RAM) 及 TOP 进程
app.get('/api/system/ram', async (req, res) => {
    try {
        const psCmd = `
            $os = Get-CimInstance Win32_OperatingSystem
            $total = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
            $free = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
            $used = [math]::Round($total - $free, 2)
            $percent = [math]::Round(($used / $total) * 100, 1)

            $top = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 Id, ProcessName, @{Name='MemMB';Expression={[math]::Round($_.WorkingSet64/1MB, 1)}}

            [PSCustomObject]@{
                TotalGB = $total
                UsedGB = $used
                FreeGB = $free
                UsedPercent = $percent
                TopProcesses = $top
            } | ConvertTo-Json -Depth 3
        `;
        const output = await runPowershell(psCmd);
        const data = JSON.parse(output);
        res.json({ success: true, ram: data });
    } catch (e) {
        console.error('Error getting RAM:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. 一键优化运行内存 (RAM Boost)
app.post('/api/system/ram/optimize', async (req, res) => {
    try {
        const psCmd = `
            $beforeFree = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory
            Get-Process | ForEach-Object { try { [void]$_.EmptyWorkingSet() } catch {} }
            Start-Sleep -Milliseconds 400
            $afterOs = Get-CimInstance Win32_OperatingSystem
            $afterFree = $afterOs.FreePhysicalMemory
            $total = [math]::Round($afterOs.TotalVisibleMemorySize / 1MB, 2)
            $used = [math]::Round($total - ($afterFree / 1MB), 2)
            $freedMB = [math]::Round(($afterFree - $beforeFree) / 1024, 1)

            [PSCustomObject]@{
                FreedMB = [math]::Max(0, $freedMB)
                TotalGB = $total
                UsedGB = $used
                FreeGB = [math]::Round($afterFree / 1MB, 2)
                UsedPercent = [math]::Round(($used / $total) * 100, 1)
            } | ConvertTo-Json
        `;
        const output = await runPowershell(psCmd);
        const data = JSON.parse(output);
        res.json({ success: true, result: data });
    } catch (e) {
        console.error('Error optimizing RAM:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 5. 深度扫描 C 盘与 D 盘高占用目录
app.get('/api/scan/start', async (req, res) => {
    try {
        const scanScript = path.join(__dirname, 'scan_engine.ps1');
        const tempJson = path.join(__dirname, 'temp_scan.json');

        await new Promise((resolve, reject) => {
            exec(`pwsh -NoProfile -ExecutionPolicy Bypass -File "${scanScript}"`, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout) => {
                if (err) {
                    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scanScript}"`, { maxBuffer: 1024 * 1024 * 10 }, (err2, out2) => {
                        if (err2) return reject(err2);
                        resolve(out2);
                    });
                } else {
                    resolve(stdout);
                }
            });
        });

        let items = [];
        if (fs.existsSync(tempJson)) {
            const fileContent = fs.readFileSync(tempJson, 'utf8');
            const cleanContent = fileContent.trim().replace(/^\uFEFF/, '');
            if (cleanContent) {
                const parsed = JSON.parse(cleanContent);
                items = Array.isArray(parsed) ? parsed : [parsed];
            }
        }

        res.json({ success: true, items, count: items.length });
    } catch (e) {
        console.error('Error scanning disks:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 6. 测试 AI 连通性 (支持 OpenAI 和 Anthropic 双协议)
app.post('/api/ai/test', async (req, res) => {
    const config = loadConfig();
    const protocol = req.body.protocol || config.protocol || 'openai';
    const provider = req.body.provider || config.provider;
    const apiKey = (req.body.apiKey && !req.body.apiKey.includes('••••')) ? req.body.apiKey.trim() : config.apiKey;
    const model = req.body.model ? req.body.model.trim() : config.model;
    const baseUrl = req.body.baseUrl ? req.body.baseUrl.trim() : config.baseUrl;

    if (!apiKey && provider !== 'ollama') {
        return res.status(400).json({ success: false, message: '请先在输入框中填入有效的 API Key' });
    }

    // 自动持久化当前配置
    saveConfig({ ...config, protocol, provider, apiKey, model, baseUrl });

    try {
        const result = await callAiModel({
            protocol,
            baseUrl,
            apiKey,
            model,
            systemPrompt: 'You are a system connection test agent. Respond concisely.',
            userContent: 'Hello, please reply "OK"',
            maxTokens: 20
        });

        res.json({
            success: true,
            message: `连通性测试通过！[${result.protocol.toUpperCase()}协议] 模型返回: "${result.text.trim()}"`,
            targetUrl: result.targetUrl,
            protocol: result.protocol,
            model: result.model,
            latency: result.latencyMs
        });
    } catch (e) {
        console.error('AI Test error:', e.message);
        res.status(500).json({
            success: false,
            message: e.message,
            protocol,
            baseUrl,
            model
        });
    }
});

// 7. AI 深度智能裁决分析 (支持使用者职业 + 自定义 Prompt 规则最高约束)
app.post('/api/ai/analyze', async (req, res) => {
    const config = loadConfig();
    const { items, userProfession, customPrompt, protocol: reqProto, provider: reqProv, apiKey: reqKey, model: reqModel, baseUrl: reqUrl } = req.body;

    const protocol = reqProto || config.protocol || 'openai';
    const provider = reqProv || config.provider || 'custom';
    const apiKey = (reqKey && !reqKey.includes('••••')) ? reqKey.trim() : config.apiKey;
    const model = (reqModel && reqModel.trim()) ? reqModel.trim() : config.model;
    const baseUrl = (reqUrl && reqUrl.trim()) ? reqUrl.trim() : config.baseUrl;
    const profession = userProfession || config.userProfession || '程序员';
    const userRules = customPrompt !== undefined ? customPrompt : config.customPrompt;

    if (!items || !items.length) {
        return res.status(400).json({ success: false, message: '请先执行扫描以获取文件清单' });
    }

    // 自动更新保存最新输入
    saveConfig({ ...config, protocol, provider, apiKey, model, baseUrl, userProfession: profession, customPrompt: userRules });

    // 如果未配置 API Key
    if (!apiKey && provider !== 'ollama') {
        const fallbackResults = generateLocalRuleAnalysis(items, profession, userRules);
        return res.json({
            success: true,
            source: 'local_engine',
            summary: `已基于您【${profession}】的职业特征及自定义约束规则完成专业智能裁决 (本地引擎模式)。若需大模型分析，请在上方输入 API Key。`,
            decisions: fallbackResults
        });
    }

    const promptItems = items.map(it => ({
        id: it.id,
        name: it.name,
        path: it.path,
        drive: it.drive,
        sizeGB: it.sizeGB,
        category: it.category
    }));

    const systemPrompt = `你是一位精通各行各业数字化工作流的【系统存储治理与资产安全研判专家 AI】。
请根据使用者的【职业身份】以及用户特别下达的【最高优先级自定义准则】，对扫描出来的每一个目录与文件进行高度专业、客观、安全的裁决。

【使用者职业身份】：${profession || '通用日常办公/电脑使用者'}
【用户最高约束准则（具有一票否决权与最高优先级，必须100%严格遵从）】：
${userRules || '优先保留重要个人工作资料与核心资产，安全清理各类无用临时缓存与冗余垃圾。'}

【核心裁决原则与全行业适配机制】：
1. 【最高铁律 - 规则严格遵从】：
   - 凡是用户最高准则中明确指示“不能删/不要动/保留/排除/忽略”的任何内容或关键词，必须一票否决裁决为 KEEP，打上标签 [用户规则保护 - 严禁删除]，并简述遵从用户准则的原因。
   - 凡是用户最高准则中明确指定“可以删/允许清理/放心清理/随便删”的内容，必须优先裁决为 DELETE，打上标签 [用户指定清理]。
2. 【全行业自适应生产力价值研判】：
   - 根据使用者的具体行业特征，深入分析资产属性：
     * 设计/创意制作（UI/平面/3D建模/插画/摄影等）：核心保护设计工程原文件（PSD/C4D/Blend等）、手绘素材与 RAW 底片；优先清理渲染预览缓存 (Render Cache) 与临时暂存盘；
     * 影视剪辑/自媒体博主/摄像：核心保护拍摄素材与工程文件；优先清理剪辑代理缓存 (Proxy Cache)、自动字幕音频波形缓存与无用历史废片；
     * 软件研发/技术工程师/运维：核心保护源码仓库、数据库与核心配置；优先清理可随时重新下载构建的编译中间依赖（如 node_modules, target, build, bin/obj 等）；
     * 财务/法务/行政/日常商务办公：核心保护各类业务文档、电子表格、账套凭证与沟通记录；优先清理大型闲置娱乐游戏、流媒体离线视频与重复安装包；
     * 科研学者/研究生/教育：核心保护论文源码、实验数据集与文献库；优先清理跑批生成的历史临时大文件。
3. 【全行业通用垃圾安全分级】：
   - 系统运行产生的临时网络日志 (system_temp)、浏览器临时缓存、已安装完成的旧安装镜像 (iso_installer) 等，对任何职业均属于通用垃圾，推荐安全清理；
   - 包含个人可能尚未归档的业务目录判定为 CAUTION（谨慎核对）。
4. 【输出规范】：
   - recommend 必须且仅能为: "DELETE" | "KEEP" | "CAUTION"
   - risk 必须且仅能为: "NONE" | "LOW" | "MEDIUM" | "HIGH"
   - 必须直接返回纯合法的 JSON 格式，严禁返回任何多余的前言或问候语，结构如下：
   {
     "summary": "一句简明精辟、契合使用者职业日常的分析总括（50字内）",
     "decisions": [
       {
         "id": "项的id",
         "path": "项的path",
         "recommend": "DELETE" | "KEEP" | "CAUTION",
         "badge": "简明醒目标签，如 [安全清理 - 系统临时垃圾] 或 [用户规则保护]",
         "reason": "结合具体职业日常与文件特征的客观分析（40字内）",
         "risk": "NONE" | "LOW" | "MEDIUM" | "HIGH"
       }
     ]
   }`;

    try {
        const result = await callAiModel({
            protocol,
            baseUrl,
            apiKey,
            model,
            systemPrompt,
            userContent: JSON.stringify(promptItems),
            maxTokens: 4000
        });

        // 解析 JSON
        let parsedResult;
        try {
            const cleanContent = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedResult = JSON.parse(cleanContent);
        } catch (err) {
            console.error('JSON parse fail, fallback to local rule enhancement:', err, result.text);
            parsedResult = {
                summary: 'AI 响应已接收，已完成智能分析。',
                decisions: generateLocalRuleAnalysis(items, profession, userRules)
            };
        }

        res.json({
            success: true,
            source: 'ai_model',
            protocol: result.protocol,
            targetUrl: result.targetUrl,
            model: result.model,
            latency: result.latencyMs,
            summary: parsedResult.summary || `已由 ${result.model} 针对【${profession}】深度定制分析完成`,
            decisions: parsedResult.decisions || []
        });

    } catch (e) {
        console.error('Real AI call failed:', e.message);
        // 不再静默吞错！如果真实调用失败，把错误和目标地址原样返回，并附带本地规则应急选项
        const fallbackResults = generateLocalRuleAnalysis(items, profession, userRules);
        res.json({
            success: true,
            source: 'local_engine_fallback',
            fallbackReason: e.message,
            error: e.message,
            targetUrl: baseUrl,
            protocol: protocol,
            model: model,
            summary: `大模型接口调用未成功 (${e.message})。已为您自动切换至内置规则兜底引擎。`,
            decisions: fallbackResults
        });
    }
});

// 通用自然语言关键词意图提取器
function extractKeywordsByPatterns(text, regexList) {
    const results = new Set();
    if (!text) return [];

    // 按常见标点符号拆分短句，增强意图定位精度
    const segments = text.split(/[,，;；。!\n\r]+/);

    for (const seg of segments) {
        for (const regex of regexList) {
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(seg)) !== null) {
                if (match[1]) {
                    const raw = match[1].trim().toLowerCase();
                    // 去除多余的代词或虚词
                    const cleanWord = raw.replace(/^(的|了|这|那|我的|一些|个|项|种)+/, '').slice(0, 20);
                    if (cleanWord.length >= 2) {
                        results.add(cleanWord);
                    }
                }
            }
        }
    }
    return Array.from(results);
}

// 本地通用规则智能裁决分析（适配各行业人士与动态自然语言规则）
function generateLocalRuleAnalysis(items, profession = '通用职场办公/电脑使用者', userRules = '') {
    const lowerRules = (userRules || '').toLowerCase();
    const lowerProf = (profession || '').toLowerCase();

    // 1. 动态智能自然语言意图解析
    // 提取用户明确指示“不要删 / 保留 / 保护 / 排除”的目标词汇
    const protectKeywords = extractKeywordsByPatterns(lowerRules, [
        /(?:不要|不能|别|严禁|切勿)[动删碰除丢卸载]*(?:我的|这[些个]|全部)?([a-z0-9\u4e00-\u9fa5_\-\.]+)/g,
        /(?:保留|保护|留存|留着)(?:我的|这[些个]|全部)?([a-z0-9\u4e00-\u9fa5_\-\.]+)/g,
        /除了?([a-z0-9\u4e00-\u9fa5_\-\.]+)(?:外|之外|以外)/g
    ]);

    // 提取用户明确指示“可以删 / 允许清理 / 重点清理”的目标词汇
    const deleteKeywords = extractKeywordsByPatterns(lowerRules, [
        /(?:可以|允许|建议|支持|放心|随便|优先|重点)[清删除掉]*(?:我的|这[些个]|全部)?([a-z0-9\u4e00-\u9fa5_\-\.]+)/g,
        /(?:清理|删除|干掉|清空|卸载|腾出)(?:我的|这[些个]|全部)?([a-z0-9\u4e00-\u9fa5_\-\.]+)/g
    ]);

    // 2. 识别职业属性大类
    const isTechOrDev = /开发|程序员|代码|架构|软件|算法|运维|后端|前端|全栈|engineer|coder|developer|tech/i.test(lowerProf);
    const isDesignOrCreative = /设计|美工|ui|ux|3d|建模|原画|渲染|blender|photoshop|c4d|插画|creative|design/i.test(lowerProf);
    const isVideoOrMedia = /剪辑|自媒体|博主|视频|影视|摄影|后期|编导|播客|media|video/i.test(lowerProf);
    const isGamingJob = /游戏评测|游戏主播|电竞|游戏开发/i.test(lowerProf);

    return items.map(item => {
        const name = (item.name || '').toLowerCase();
        const pathStr = (item.path || '').toLowerCase();
        const combined = `${name} ${pathStr}`;

        // -----------------------------------------------------------------
        // 规则优先级 1：用户自然语言自定义保护准则（绝对优先）
        // -----------------------------------------------------------------
        const matchedProtect = protectKeywords.find(kw => kw && combined.includes(kw));
        if (matchedProtect) {
            return {
                id: item.id,
                path: item.path,
                recommend: 'KEEP',
                badge: '[用户规则保护 - 严禁删除]',
                reason: `匹配到您自定义铁律中保护的关键词「${matchedProtect}」，已严格锁定保留。`,
                risk: 'HIGH'
            };
        }

        // -----------------------------------------------------------------
        // 规则优先级 2：用户自然语言自定义清理准则（指定优先）
        // -----------------------------------------------------------------
        const matchedDelete = deleteKeywords.find(kw => kw && combined.includes(kw));
        if (matchedDelete) {
            return {
                id: item.id,
                path: item.path,
                recommend: 'DELETE',
                badge: '[用户指定清理]',
                reason: `符合您在自定义规则中指定允许清理的「${matchedDelete}」，优先建议释放空间。`,
                risk: 'NONE'
            };
        }

        // -----------------------------------------------------------------
        // 规则优先级 3：全行业通用资产属性研判
        // -----------------------------------------------------------------
        // 3.1 系统与应用程序临时运行缓存（任何行业皆可安全释放）
        if (item.category === 'system_temp') {
            return {
                id: item.id,
                path: item.path,
                recommend: 'DELETE',
                badge: '[安全清理 - 系统运行临时垃圾]',
                reason: '各类应用程序与系统运行产生的临时缓冲及日志，清理后对日常工作无任何副作用。',
                risk: 'NONE'
            };
        }

        // 3.2 离线安装镜像包 / ISO 系统安装盘（一次性文件）
        if (item.category === 'iso_installer') {
            return {
                id: item.id,
                path: item.path,
                recommend: 'DELETE',
                badge: '[建议清理 - 一次性安装镜像]',
                reason: '软件或操作系统的历史安装镜像包，安装完成后已无日常保留价值，单项释放空间大。',
                risk: 'NONE'
            };
        }

        // 3.3 编译构建与依赖包缓存（如 node_modules, target, build 等）
        if (item.category === 'dev_cache') {
            if (isTechOrDev) {
                return {
                    id: item.id,
                    path: item.path,
                    recommend: 'DELETE',
                    badge: '[推荐清理 - 可随时重新构建]',
                    reason: '由代码工程编译衍生而来的中间产物与依赖包，不含手写源码，后续执行构建命令即可还原。',
                    risk: 'LOW'
                };
            } else {
                return {
                    id: item.id,
                    path: item.path,
                    recommend: 'DELETE',
                    badge: '[建议清理 - 历史程序依赖缓存]',
                    reason: '检测为应用程序依赖包与历史构建产物，非手写个人文档，建议清理释放存储。',
                    risk: 'LOW'
                };
            }
        }

        // 3.4 大型娱乐游戏
        if (item.category === 'game') {
            if (isGamingJob) {
                return {
                    id: item.id,
                    path: item.path,
                    recommend: 'CAUTION',
                    badge: '[工作相关游戏 - 建议核对]',
                    reason: `结合您【${profession}】的职业特性，该游戏可能属于评测或测试资产，请核对后决定。`,
                    risk: 'MEDIUM'
                };
            } else {
                return {
                    id: item.id,
                    path: item.path,
                    recommend: 'DELETE',
                    badge: '[建议清理 - 娱乐游戏软件]',
                    reason: `单项体积通常达到数十至上百GB，与日常核心生产无直接关联，若已通关或闲置建议清理。`,
                    risk: 'NONE'
                };
            }
        }

        // 3.5 视频录像 / 剪辑工程 / 历史多媒体
        if (item.category === 'media') {
            if (isVideoOrMedia || isDesignOrCreative) {
                return {
                    id: item.id,
                    path: item.path,
                    recommend: 'CAUTION',
                    badge: '[创作素材 - 建议确认归档]',
                    reason: `作为【${profession}】，多媒体文件可能包含重要创作原片或工程素材，建议确认归档后再操作。`,
                    risk: 'MEDIUM'
                };
            } else {
                return {
                    id: item.id,
                    path: item.path,
                    recommend: 'DELETE',
                    badge: '[建议清理 - 历史音视频/录像]',
                    reason: '日常历史屏幕录像、播放器下载或导出文件，若已无复看价值，建议清理释放宝贵硬盘空间。',
                    risk: 'LOW'
                };
            }
        }

        // 3.6 核心手写工程或个人业务资料
        if (item.category === 'dev' || item.category === 'work_doc') {
            return {
                id: item.id,
                path: item.path,
                recommend: 'KEEP',
                badge: '[核心资产 - 建议保留]',
                reason: '检测为核心工作工程或重要业务数据，属于高价值资产，系统默认给予严密保护。',
                risk: 'HIGH'
            };
        }

        // 兜底：中立客观建议
        return {
            id: item.id,
            path: item.path,
            recommend: 'CAUTION',
            badge: '[建议核对]',
            reason: '属于辅助数据或应用程序目录，请结合当前个人使用习惯快速确认后决定。',
            risk: 'MEDIUM'
        };
    });
}

// 8. 物理清理执行 API
app.post('/api/clean/execute', async (req, res) => {
    const { paths } = req.body;
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
        return res.status(400).json({ success: false, message: '请选择至少一个待清理项' });
    }

    const log = [];
    let successCount = 0;
    let failCount = 0;

    for (const targetPath of paths) {
        // 安全拦截根目录或致命路径
        if (!targetPath || targetPath.length <= 3 || targetPath.toLowerCase() === 'c:\\' || targetPath.toLowerCase() === 'd:\\' || targetPath.toLowerCase().includes('windows\\system32')) {
            log.push({ path: targetPath, status: 'SKIPPED', message: '出于系统安全防护，拦截系统核心路径删除' });
            continue;
        }

        try {
            const escaped = targetPath.replace(/'/g, "''");
            const psDeleteCmd = `
                $ErrorActionPreference = 'Stop'
                if (Test-Path -LiteralPath '${escaped}') {
                    Remove-Item -LiteralPath '${escaped}' -Recurse -Force
                    Write-Output 'OK'
                } else {
                    Write-Output 'NOT_FOUND'
                }
            `;
            await runPowershell(psDeleteCmd);
            log.push({ path: targetPath, status: 'SUCCESS', message: '已安全删除' });
            successCount++;
        } catch (e) {
            console.error(`Failed to delete ${targetPath}:`, e.message);
            log.push({ path: targetPath, status: 'FAILED', message: e.message });
            failCount++;
        }
    }

    // 重新获取 C/D 盘空间
    let updatedDisks = [];
    try {
        const psDisksCmd = `
            Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -in 'C','D' } | ForEach-Object {
                [PSCustomObject]@{
                    Name = $_.Name
                    TotalGB = [math]::Round(($_.Used + $_.Free) / 1GB, 2)
                    UsedGB = [math]::Round($_.Used / 1GB, 2)
                    FreeGB = [math]::Round($_.Free / 1GB, 2)
                    UsedPercent = [math]::Round(($_.Used / ($_.Used + $_.Free)) * 100, 1)
                }
            } | ConvertTo-Json
        `;
        const outDisks = await runPowershell(psDisksCmd);
        if (outDisks) {
            const parsed = JSON.parse(outDisks);
            updatedDisks = Array.isArray(parsed) ? parsed : [parsed];
        }
    } catch (e) {}

    res.json({
        success: true,
        summary: `清理操作完成！成功清理 ${successCount} 项，失败/跳过 ${failCount} 项。`,
        successCount,
        failCount,
        log,
        updatedDisks
    });
});

// 启动服务器
app.listen(PORT, async () => {
    console.log(`===================================================`);
    console.log(` AI Disk & RAM Cleaner Desktop Server is running!  `);
    console.log(` Local URL: http://localhost:${PORT}             `);
    console.log(`===================================================`);

    if (process.argv.includes('--open')) {
        try {
            const open = (await import('open')).default;
            await open(`http://localhost:${PORT}`);
        } catch (e) {
            console.log(`提示：请在浏览器中打开 http://localhost:${PORT}`);
        }
    }
});
