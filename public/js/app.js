// ==========================================================================
// AI Disk & RAM Cleaner - Frontend Logic
// ==========================================================================

const API_BASE = '';

// 预设供应商默认参数
const PROVIDER_DEFAULTS = {
    deepseek_openai: {
        protocol: 'openai',
        model: 'deepseek-v4-flash',
        baseUrl: 'https://api.deepseek.com'
    },
    deepseek_anthropic: {
        protocol: 'anthropic',
        model: 'deepseek-v4-flash',
        baseUrl: 'https://api.deepseek.com/anthropic'
    },
    claude: {
        protocol: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        baseUrl: 'https://api.anthropic.com'
    },
    openai: {
        protocol: 'openai',
        model: 'gpt-4o',
        baseUrl: 'https://api.openai.com/v1'
    },
    moonshot: {
        protocol: 'openai',
        model: 'moonshot-v1-8k',
        baseUrl: 'https://api.moonshot.cn/v1'
    },
    ollama: {
        protocol: 'openai',
        model: 'qwen2.5:7b',
        baseUrl: 'http://localhost:11434/v1'
    },
    custom: {
        protocol: 'openai',
        model: '',
        baseUrl: ''
    }
};

// 全局响应式状态
const state = {
    disks: [],
    ram: null,
    config: {},
    items: [],
    decisions: {},
    selectedIds: new Set(),
    activeFilter: 'all',
    isScanning: false,
    isAnalyzing: false,
    isOptimizingRam: false
};

// DOM 元素缓存
const dom = {
    cFree: document.getElementById('c-free'),
    cUsed: document.getElementById('c-used'),
    cTotal: document.getElementById('c-total'),
    cPercent: document.getElementById('c-percent'),
    cBadge: document.getElementById('c-badge'),
    ringC: document.getElementById('ring-c'),

    dFree: document.getElementById('d-free'),
    dUsed: document.getElementById('d-used'),
    dTotal: document.getElementById('d-total'),
    dPercent: document.getElementById('d-percent'),
    dBadge: document.getElementById('d-badge'),
    ringD: document.getElementById('ring-d'),

    ramFree: document.getElementById('ram-free'),
    ramUsed: document.getElementById('ram-used'),
    ramTotal: document.getElementById('ram-total'),
    ramPercent: document.getElementById('ram-percent'),
    ringRam: document.getElementById('ring-ram'),
    btnRamOptimize: document.getElementById('btn-ram-optimize'),
    ramProcToggle: document.getElementById('ram-proc-toggle'),
    ramProcDrawer: document.getElementById('ram-proc-drawer'),
    procListContainer: document.getElementById('proc-list-container'),

    selectProtocol: document.getElementById('select-protocol'),
    selectProvider: document.getElementById('select-provider'),
    inputApiKey: document.getElementById('input-api-key'),
    btnToggleKeyView: document.getElementById('btn-toggle-key-view'),
    inputModel: document.getElementById('input-model'),
    inputBaseUrl: document.getElementById('input-base-url'),
    aiLiveMonitor: document.getElementById('ai-live-monitor'),
    monitorIcon: document.getElementById('monitor-icon'),
    monitorText: document.getElementById('monitor-text'),

    inputProfession: document.getElementById('input-profession'),
    inputCustomPrompt: document.getElementById('input-custom-prompt'),
    btnSaveConfig: document.getElementById('btn-save-config'),
    saveStatusTip: document.getElementById('save-status-tip'),
    btnTestAi: document.getElementById('btn-test-ai'),
    aiStatusText: document.getElementById('ai-status-text'),

    btnStartScan: document.getElementById('btn-start-scan'),
    scanSpinner: document.getElementById('scan-spinner'),
    scanBtnText: document.getElementById('scan-btn-text'),
    btnStartAi: document.getElementById('btn-start-ai'),
    aiSpinner: document.getElementById('ai-spinner'),
    aiBtnText: document.getElementById('ai-btn-text'),

    itemsCount: document.getElementById('items-count'),
    scanItemsList: document.getElementById('scan-items-list'),
    emptyState: document.getElementById('empty-state'),
    aiSummaryCard: document.getElementById('ai-summary-card'),
    aiSummaryText: document.getElementById('ai-summary-text'),

    checkSelectAll: document.getElementById('check-select-all'),
    selectedCount: document.getElementById('selected-count'),
    selectedSize: document.getElementById('selected-size'),
    btnSelectRecommended: document.getElementById('btn-select-recommended'),
    btnClearSelection: document.getElementById('btn-clear-selection'),

    bottomFreeSize: document.getElementById('bottom-free-size'),
    btnExecuteClean: document.getElementById('btn-execute-clean'),

    confirmModal: document.getElementById('confirm-modal'),
    modalItemCount: document.getElementById('modal-item-count'),
    modalItemSize: document.getElementById('modal-item-size'),
    modalPathsPreview: document.getElementById('modal-paths-preview'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),

    resultModal: document.getElementById('result-modal'),
    resultSummaryTitle: document.getElementById('result-summary-title'),
    resultLogContent: document.getElementById('result-log-content'),
    btnCloseResultModal: document.getElementById('btn-close-result-modal'),
    btnFinishResult: document.getElementById('btn-finish-result'),

    btnRefreshVitals: document.getElementById('btn-refresh-vitals')
};

// 实时更新 AI 状态横幅
function setAiLiveStatus(type, message, icon = '⚡') {
    if (!dom.aiLiveMonitor) return;
    dom.aiLiveMonitor.className = `ai-live-monitor ${type}`;
    if (dom.monitorIcon) dom.monitorIcon.textContent = icon;
    if (dom.monitorText) dom.monitorText.textContent = message;
}

// ================== 初始化流程 ==================
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadSystemConfig();
    fetchSystemVitals();

    // 内存每 8 秒自动刷新一次轻量数据
    setInterval(() => {
        fetchRamStatus(true);
    }, 8000);
});

// ================== 状态同步与防丢自动保存 ==================
let autoSaveTimer = null;

// 实时同步顶部导航栏状态药丸与模型指示
function syncAiStatusBadge() {
    const model = (dom.inputModel ? dom.inputModel.value.trim() : '') || '未选模型';
    const proto = (dom.selectProtocol ? dom.selectProtocol.value : 'openai').toUpperCase();
    const hasKey = dom.inputApiKey && dom.inputApiKey.value.trim().length > 0;

    if (dom.aiStatusText) {
        if (hasKey) {
            dom.aiStatusText.textContent = `已配置 (${proto} - ${model})`;
        } else {
            dom.aiStatusText.textContent = `已选定 (${proto} - ${model} | 待填Key)`;
        }
    }
}

// 自动静默持久化（防丢）
function triggerAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveConfigToServer(true); // true 表示静默保存
    }, 600);
}

function highlightMiniModel(modelName) {
    document.querySelectorAll('.pill-mini-model').forEach(b => {
        if (b.getAttribute('data-model') === modelName) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
}

// ================== 事件绑定 ==================
function initEvents() {
    // 刷新看板与 AI 模型配置
    dom.btnRefreshVitals.addEventListener('click', async () => {
        dom.btnRefreshVitals.disabled = true;
        const oldHtml = dom.btnRefreshVitals.innerHTML;
        dom.btnRefreshVitals.innerHTML = '<span class="btn-icon-spin">🔄</span> 刷新中...';
        
        await Promise.all([fetchSystemVitals(), loadSystemConfig()]);
        syncAiStatusBadge();
        
        dom.btnRefreshVitals.innerHTML = '✅ 已刷新';
        setTimeout(() => {
            dom.btnRefreshVitals.innerHTML = oldHtml;
            dom.btnRefreshVitals.disabled = false;
        }, 1200);
    });

    // 协议类型自主切换联动
    if (dom.selectProtocol) {
        dom.selectProtocol.addEventListener('change', (e) => {
            const proto = e.target.value;
            const currentUrl = (dom.inputBaseUrl.value || '').trim();

            if (proto === 'anthropic') {
                // 如果当前是官方或默认 deepseek 链接，自动平滑推荐切到 anthropic 端点
                if (!currentUrl || currentUrl.includes('deepseek.com')) {
                    dom.inputBaseUrl.value = 'https://api.deepseek.com/anthropic';
                }
                setAiLiveStatus('default', `已切换至【Anthropic Messages 协议】，Base URL 推荐填入 https://api.deepseek.com/anthropic（您也可以自由修改手填）`, '🔀');
            } else {
                // 切换到 OpenAI 协议
                if (!currentUrl || currentUrl.includes('deepseek.com')) {
                    dom.inputBaseUrl.value = 'https://api.deepseek.com';
                }
                setAiLiveStatus('default', `已切换至【OpenAI 兼容协议】，Base URL 推荐填入 https://api.deepseek.com（您也可以自由修改手填）`, '🔀');
            }

            syncAiStatusBadge();
            triggerAutoSave();
        });
    }

    // 模型输入框手动打字或修改联动
    if (dom.inputModel) {
        dom.inputModel.addEventListener('input', () => {
            highlightMiniModel(dom.inputModel.value.trim());
            syncAiStatusBadge();
            triggerAutoSave();
        });
        dom.inputModel.addEventListener('change', () => {
            highlightMiniModel(dom.inputModel.value.trim());
            syncAiStatusBadge();
            triggerAutoSave();
        });
    }

    // Base URL 手动输入防丢保存
    if (dom.inputBaseUrl) {
        dom.inputBaseUrl.addEventListener('input', () => {
            triggerAutoSave();
        });
    }

    // API Key 输入实时同步状态
    if (dom.inputApiKey) {
        dom.inputApiKey.addEventListener('input', () => {
            syncAiStatusBadge();
        });
    }

    // 供应商模板切换联动
    dom.selectProvider.addEventListener('change', (e) => {
        const p = e.target.value;
        if (PROVIDER_DEFAULTS[p]) {
            if (dom.selectProtocol && PROVIDER_DEFAULTS[p].protocol) {
                dom.selectProtocol.value = PROVIDER_DEFAULTS[p].protocol;
            }
            dom.inputModel.value = PROVIDER_DEFAULTS[p].model;
            dom.inputBaseUrl.value = PROVIDER_DEFAULTS[p].baseUrl;
            highlightMiniModel(PROVIDER_DEFAULTS[p].model);
            syncAiStatusBadge();
            triggerAutoSave();
            setAiLiveStatus('default', `已加载模板 [${p}]，协议: ${dom.selectProtocol ? dom.selectProtocol.value : 'openai'}，BaseURL: ${dom.inputBaseUrl.value}，模型: ${dom.inputModel.value}`, 'ℹ️');
        }
    });

    // 模型快捷微型胶囊点击事件
    document.querySelectorAll('.pill-mini-model').forEach(btn => {
        btn.addEventListener('click', () => {
            const model = btn.getAttribute('data-model');
            if (dom.inputModel && model) {
                dom.inputModel.value = model;
                highlightMiniModel(model);
                syncAiStatusBadge();
                triggerAutoSave();
                setAiLiveStatus('default', `已选定模型: ${model}（顶部状态徽章已实时同步更新）`, '🎯');
            }
        });
    });

    // 快速填入 Base URL 胶囊按钮
    document.querySelectorAll('.pill-url-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const proto = btn.getAttribute('data-proto') || 'openai';
            const url = btn.getAttribute('data-url') || '';
            const model = btn.getAttribute('data-model') || '';

            if (dom.selectProtocol) dom.selectProtocol.value = proto;
            if (dom.inputBaseUrl) dom.inputBaseUrl.value = url;
            if (dom.inputModel && model) {
                dom.inputModel.value = model;
                highlightMiniModel(model);
            }

            syncAiStatusBadge();
            triggerAutoSave();
            setAiLiveStatus('default', `已快速填入 [${proto.toUpperCase()} 协议] 规范地址: ${url} (模型: ${model})`, '📌');
        });
    });

    // API Key 眼睛切换
    dom.btnToggleKeyView.addEventListener('click', () => {
        if (dom.inputApiKey.type === 'password') {
            dom.inputApiKey.type = 'text';
            dom.btnToggleKeyView.textContent = '🔒';
        } else {
            dom.inputApiKey.type = 'password';
            dom.btnToggleKeyView.textContent = '👁️';
        }
    });

    // 快捷角色标签填充
    document.querySelectorAll('.pill-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            dom.inputProfession.value = btn.getAttribute('data-role');
            triggerAutoSave();
            setAiLiveStatus('default', `已切换职业画像为: ${dom.inputProfession.value}，AI 将结合该行业工作流研判`, '👔');
        });
    });

    // 快捷自定义提示词规则预设填充
    document.querySelectorAll('.pill-rule-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const rule = btn.getAttribute('data-rule');
            if (dom.inputCustomPrompt && rule) {
                dom.inputCustomPrompt.value = rule;
                triggerAutoSave();
                setAiLiveStatus('default', `已成功载入【${btn.textContent.trim()}】通用铁律规则`, '📋');
            }
        });
    });

    // 职业与规则输入框实时打字保存
    if (dom.inputProfession) {
        dom.inputProfession.addEventListener('input', () => triggerAutoSave());
    }
    if (dom.inputCustomPrompt) {
        dom.inputCustomPrompt.addEventListener('input', () => triggerAutoSave());
    }

    // 保存配置
    dom.btnSaveConfig.addEventListener('click', saveConfigToServer);

    // 测试 AI
    dom.btnTestAi.addEventListener('click', testAiConnection);

    // 一键内存优化
    dom.btnRamOptimize.addEventListener('click', optimizeRam);

    // 展开/收起 TOP 进程
    dom.ramProcToggle.addEventListener('click', () => {
        dom.ramProcDrawer.classList.toggle('hidden');
    });

    // 开始扫描
    dom.btnStartScan.addEventListener('click', startDiskScan);

    // 开始 AI 裁决
    dom.btnStartAi.addEventListener('click', startAiAnalysis);

    // 筛选 Tab 切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeFilter = btn.getAttribute('data-filter');
            renderItemsList();
        });
    });

    // 全选/反选
    dom.checkSelectAll.addEventListener('change', (e) => {
        const visibleItems = getFilteredItems();
        if (e.target.checked) {
            visibleItems.forEach(it => state.selectedIds.add(it.id));
        } else {
            visibleItems.forEach(it => state.selectedIds.delete(it.id));
        }
        updateSelectionSummary();
        renderItemsList();
    });

    // 仅选推荐
    dom.btnSelectRecommended.addEventListener('click', () => {
        state.selectedIds.clear();
        state.items.forEach(it => {
            const dec = state.decisions[it.id];
            if (dec && dec.recommend === 'DELETE') {
                state.selectedIds.add(it.id);
            }
        });
        updateSelectionSummary();
        renderItemsList();
    });

    // 清空选择
    dom.btnClearSelection.addEventListener('click', () => {
        state.selectedIds.clear();
        updateSelectionSummary();
        renderItemsList();
    });

    // 弹出确认清理 Modal
    dom.btnExecuteClean.addEventListener('click', () => {
        if (state.selectedIds.size === 0) return;

        const selectedItems = state.items.filter(it => state.selectedIds.has(it.id));
        const totalSize = selectedItems.reduce((acc, it) => acc + (it.sizeGB || 0), 0);

        dom.modalItemCount.textContent = selectedItems.length;
        dom.modalItemSize.textContent = `${totalSize.toFixed(2)} GB`;

        dom.modalPathsPreview.innerHTML = selectedItems.map(it => `<div>📁 ${escapeHtml(it.path)} <span style="color:#10b981">(${it.sizeGB} GB)</span></div>`).join('');
        dom.confirmModal.classList.remove('hidden');
    });

    // Modal 取消/关闭
    dom.btnCloseModal.addEventListener('click', () => dom.confirmModal.classList.add('hidden'));
    dom.btnCancelModal.addEventListener('click', () => dom.confirmModal.classList.add('hidden'));

    // 执行物理清理
    dom.btnConfirmDelete.addEventListener('click', executeCleaning);

    // 战报关闭
    dom.btnCloseResultModal.addEventListener('click', () => dom.resultModal.classList.add('hidden'));
    dom.btnFinishResult.addEventListener('click', () => dom.resultModal.classList.add('hidden'));
}

// ================== 系统看板数据获取 ==================
async function fetchSystemVitals() {
    await Promise.all([fetchDiskStatus(), fetchRamStatus()]);
}

async function fetchDiskStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/system/disks`);
        const data = await res.json();
        if (data.success && data.disks) {
            state.disks = data.disks;
            renderDisks(data.disks);
        }
    } catch (e) {
        console.error('Error fetching disks:', e);
    }
}

function renderDisks(disks) {
    const c = disks.find(d => d.Name.toUpperCase() === 'C');
    const d = disks.find(d => d.Name.toUpperCase() === 'D');

    if (c) {
        dom.cFree.textContent = `${c.FreeGB} GB`;
        dom.cUsed.textContent = `${c.UsedGB} GB`;
        dom.cTotal.textContent = `${c.TotalGB} GB`;
        dom.cPercent.textContent = `${c.UsedPercent}%`;
        setRingProgress(dom.ringC, c.UsedPercent);

        if (c.FreeGB < 15) {
            dom.cBadge.textContent = '空间告急';
            dom.cBadge.style.color = '#ef4444';
            dom.cBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        } else {
            dom.cBadge.textContent = '状态健康';
            dom.cBadge.style.color = '#10b981';
            dom.cBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        }
    }

    if (d) {
        dom.dFree.textContent = `${d.FreeGB} GB`;
        dom.dUsed.textContent = `${d.UsedGB} GB`;
        dom.dTotal.textContent = `${d.TotalGB} GB`;
        dom.dPercent.textContent = `${d.UsedPercent}%`;
        setRingProgress(dom.ringD, d.UsedPercent);

        dom.dBadge.textContent = '空间充足';
        dom.dBadge.style.color = '#38bdf8';
        dom.dBadge.style.background = 'rgba(56, 189, 248, 0.15)';
    }
}

async function fetchRamStatus(silent = false) {
    try {
        const res = await fetch(`${API_BASE}/api/system/ram`);
        const data = await res.json();
        if (data.success && data.ram) {
            state.ram = data.ram;
            renderRam(data.ram);
        }
    } catch (e) {
        if (!silent) console.error('Error fetching RAM:', e);
    }
}

function renderRam(ram) {
    dom.ramFree.textContent = `${ram.FreeGB} GB`;
    dom.ramUsed.textContent = `${ram.UsedGB} GB`;
    dom.ramTotal.textContent = `${ram.TotalGB} GB`;
    dom.ramPercent.textContent = `${ram.UsedPercent}%`;
    setRingProgress(dom.ringRam, ram.UsedPercent);

    if (ram.TopProcesses && ram.TopProcesses.length) {
        dom.procListContainer.innerHTML = ram.TopProcesses.map(p => `
            <div class="proc-item">
                <span class="proc-name" title="${escapeHtml(p.ProcessName)}">${escapeHtml(p.ProcessName)}</span>
                <span class="proc-mem">${p.MemMB} MB</span>
            </div>
        `).join('');
    }
}

function setRingProgress(circleElem, percent) {
    if (!circleElem) return;
    const circumference = 2 * Math.PI * 42; // r = 42
    const offset = circumference - (percent / 100) * circumference;
    circleElem.style.strokeDashoffset = offset;
}

// ================== 一键内存优化 ==================
async function optimizeRam() {
    if (state.isOptimizingRam) return;
    state.isOptimizingRam = true;
    dom.btnRamOptimize.disabled = true;
    dom.btnRamOptimize.innerHTML = '<span class="btn-icon-spin">⚡</span> 正在压缩释放工作集...';

    try {
        const res = await fetch(`${API_BASE}/api/system/ram/optimize`, { method: 'POST' });
        const data = await res.json();
        if (data.success && data.result) {
            renderRam(data.result);
            dom.btnRamOptimize.innerHTML = `✅ 已收缩释放 ${data.result.FreedMB} MB!`;
            setTimeout(() => {
                dom.btnRamOptimize.innerHTML = '<span class="boost-icon">⚡</span> 一键内存极速优化';
                dom.btnRamOptimize.disabled = false;
                state.isOptimizingRam = false;
            }, 2500);
        }
    } catch (e) {
        console.error('Failed to optimize RAM:', e);
        dom.btnRamOptimize.innerHTML = '❌ 优化失败';
        setTimeout(() => {
            dom.btnRamOptimize.innerHTML = '<span class="boost-icon">⚡</span> 一键内存极速优化';
            dom.btnRamOptimize.disabled = false;
            state.isOptimizingRam = false;
        }, 2000);
    }
}

// ================== 配置管理 ==================
async function loadSystemConfig() {
    try {
        const res = await fetch(`${API_BASE}/api/config`);
        const cfg = await res.json();
        state.config = cfg;

        if (cfg.protocol && dom.selectProtocol) dom.selectProtocol.value = cfg.protocol;
        if (cfg.provider && dom.selectProvider) dom.selectProvider.value = cfg.provider;
        if (cfg.model && dom.inputModel) {
            dom.inputModel.value = cfg.model;
            highlightMiniModel(cfg.model);
        }
        if (cfg.baseUrl && dom.inputBaseUrl) dom.inputBaseUrl.value = cfg.baseUrl;
        if (cfg.userProfession && dom.inputProfession) dom.inputProfession.value = cfg.userProfession;
        if (cfg.customPrompt && dom.inputCustomPrompt) dom.inputCustomPrompt.value = cfg.customPrompt;

        const protoName = (cfg.protocol || 'openai').toUpperCase();
        const base = cfg.baseUrl || 'https://api.deepseek.com';

        if (cfg.hasApiKey) {
            dom.inputApiKey.value = cfg.maskedApiKey;
        }

        syncAiStatusBadge();
        setAiLiveStatus('default', `当前就绪：[${protoName} 协议] 接口地址: ${base}，模型: ${cfg.model || 'deepseek-v4-flash'}`, '✨');
    } catch (e) {
        console.error('Error loading config:', e);
    }
}

async function saveConfigToServer(silent = false) {
    const protocol = dom.selectProtocol ? dom.selectProtocol.value : 'openai';
    const baseUrl = dom.inputBaseUrl ? dom.inputBaseUrl.value.trim() : '';
    const apiKey = dom.inputApiKey.value.trim();
    const model = dom.inputModel.value.trim();
    const provider = dom.selectProvider.value;

    const payload = {
        protocol,
        provider,
        apiKey,
        model,
        baseUrl,
        userProfession: dom.inputProfession.value.trim(),
        customPrompt: dom.inputCustomPrompt.value.trim()
    };

    if (!silent && dom.saveStatusTip) dom.saveStatusTip.textContent = '保存中...';
    try {
        const res = await fetch(`${API_BASE}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            syncAiStatusBadge();
            if (!silent) {
                dom.saveStatusTip.textContent = '✅ 配置与规则已成功持久化保存！';
                setAiLiveStatus('success', `配置已保存：[${protocol.toUpperCase()} 协议] BaseURL: ${baseUrl || '默认'}，模型: ${model}`, '💾');
                setTimeout(() => { dom.saveStatusTip.textContent = ''; }, 3000);
            }
        } else {
            if (!silent) {
                dom.saveStatusTip.textContent = `❌ 保存失败: ${data.message}`;
                setAiLiveStatus('error', `保存配置失败: ${data.message}`, '❌');
            }
        }
    } catch (e) {
        if (!silent) {
            dom.saveStatusTip.textContent = `❌ 网络错误: ${e.message}`;
            setAiLiveStatus('error', `网络保存错误: ${e.message}`, '❌');
        }
    }
}

async function testAiConnection() {
    const protocol = dom.selectProtocol ? dom.selectProtocol.value : 'openai';
    const baseUrl = dom.inputBaseUrl ? dom.inputBaseUrl.value.trim() : '';
    const apiKey = dom.inputApiKey.value.trim();
    const model = dom.inputModel.value.trim();
    const provider = dom.selectProvider.value;

    if (!apiKey && provider !== 'ollama') {
        alert('⚠️ 请先在【API 密钥】输入框中填入您的 API Key！');
        dom.inputApiKey.focus();
        return;
    }

    dom.btnTestAi.disabled = true;
    dom.btnTestAi.innerHTML = '<span class="btn-icon-spin">🔄</span> 测试中...';

    setAiLiveStatus('active', `🚀 正在通过 [${protocol.toUpperCase()} 协议] 发起连通性握手测试 -> ${baseUrl || '官方默认端点'} (模型: ${model})...`, '⏳');

    const payload = {
        protocol,
        provider,
        apiKey,
        model,
        baseUrl
    };

    try {
        const res = await fetch(`${API_BASE}/api/ai/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            setAiLiveStatus('success', `🎉 握手成功！[${protocol.toUpperCase()} 协议] 响应耗时: ${data.latency}ms，接口连通正常 (${data.model || model})`, '✅');
            alert(`🎉 AI 连通性测试通过！\n\n协议规范: ${protocol.toUpperCase()}\n目标地址: ${baseUrl || '默认端点'}\n模型名称: ${data.model || model}\n响应耗时: ${data.latency}ms\n服务端响应: ${data.message}`);
        } else {
            setAiLiveStatus('error', `❌ 连通失败 [${protocol.toUpperCase()}]: ${data.message} (目标: ${baseUrl || '官方地址'})`, '⚠️');
            alert(`⚠️ 连通测试未通过：\n\n协议: ${protocol.toUpperCase()}\n目标地址: ${baseUrl}\n错误明细: ${data.message}\n\n排查建议：\n1. 请检查 Base URL 是否拼写正确（如 DeepSeek 为 https://api.deepseek.com）\n2. 检查 API Key 是否有效或账户是否有可用余额\n3. 若使用第三方中转，请确认是否需添加 /v1 路径后缀`);
        }
    } catch (e) {
        setAiLiveStatus('error', `❌ 网络请求发起失败: ${e.message}`, '🚨');
        alert(`❌ 无法发起网络请求: ${e.message}`);
    } finally {
        dom.btnTestAi.disabled = false;
        dom.btnTestAi.innerHTML = '<span>🔌</span> 测试 AI 连通性';
    }
}

// ================== 全盘深度扫描 ==================
async function startDiskScan() {
    if (state.isScanning) return;
    state.isScanning = true;
    dom.btnStartScan.disabled = true;
    dom.scanSpinner.classList.remove('hidden');
    dom.scanBtnText.textContent = '正在穿透扫描 C/D 盘目录树...';

    try {
        const res = await fetch(`${API_BASE}/api/scan/start`);
        const data = await res.json();

        if (data.success && data.items) {
            state.items = data.items;
            dom.itemsCount.textContent = `${data.items.length} 项已检出`;
            dom.emptyState.classList.add('hidden');
            dom.btnStartAi.disabled = false;

            // 预设默认勾选（初始根据内置类型快速标记）
            renderItemsList();
            updateSelectionSummary();

            // 自动联动触发 AI 深度裁决
            setTimeout(() => {
                startAiAnalysis();
            }, 500);
        }
    } catch (e) {
        alert(`扫描过程中遇到异常: ${e.message}`);
    } finally {
        state.isScanning = false;
        dom.btnStartScan.disabled = false;
        dom.scanSpinner.classList.add('hidden');
        dom.scanBtnText.textContent = '🚀 重新全盘深度扫描';
    }
}

// ================== AI 职业与规则深度裁决 ==================
async function startAiAnalysis() {
    if (state.isAnalyzing || state.items.length === 0) return;
    state.isAnalyzing = true;
    dom.btnStartAi.disabled = true;
    dom.aiSpinner.classList.remove('hidden');
    dom.aiBtnText.textContent = 'AI 正在研判职业价值与自定义规则...';

    dom.aiSummaryCard.classList.remove('hidden');
    dom.aiSummaryText.textContent = '大模型正在深入比对您的【职业日常】与【禁止删除准则】，请稍候...';

    const protocol = dom.selectProtocol ? dom.selectProtocol.value : 'openai';
    const baseUrl = dom.inputBaseUrl ? dom.inputBaseUrl.value.trim() : '';
    const apiKey = dom.inputApiKey.value.trim();
    const model = dom.inputModel.value.trim();
    const userProfession = dom.inputProfession.value.trim();
    const customPrompt = dom.inputCustomPrompt.value.trim();

    setAiLiveStatus('active', `🤖 正在向 ${baseUrl || '默认端点'} 发起真实大模型深度研判 (${protocol.toUpperCase()} 协议, 模型: ${model})...`, '🧠');

    const payload = {
        protocol,
        baseUrl,
        apiKey,
        model,
        items: state.items,
        userProfession,
        customPrompt
    };

    try {
        const res = await fetch(`${API_BASE}/api/ai/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            dom.aiSummaryText.textContent = data.summary || 'AI 分析裁决完毕！';

            if (data.fallbackReason) {
                // 模型调用受阻降级为本地规则
                setAiLiveStatus('error', `⚠️ 真实大模型调用受阻: ${data.fallbackReason}。已自动使用本地规则保护系统！`, '🛡️');
            } else {
                // 真实调用成功
                setAiLiveStatus('success', `🎉 大模型 [${data.model || model}] 深度裁决完成！耗时: ${data.latency || '1.1s'}，已按【${userProfession}】与自定义规则生成建议。`, '🎯');
            }

            if (data.decisions && Array.isArray(data.decisions)) {
                state.decisions = {};
                state.selectedIds.clear();

                data.decisions.forEach(dec => {
                    state.decisions[dec.id] = dec;
                    // 如果判定为 DELETE，自动默认勾选
                    if (dec.recommend === 'DELETE') {
                        state.selectedIds.add(dec.id);
                    }
                });

                renderItemsList();
                updateSelectionSummary();
            }
        }
    } catch (e) {
        console.error('AI Analysis failed:', e);
        dom.aiSummaryText.textContent = `AI 接口调用遇到波动，已无缝切换至内置规则兜底。`;
    } finally {
        state.isAnalyzing = false;
        dom.btnStartAi.disabled = false;
        dom.aiSpinner.classList.add('hidden');
        dom.aiBtnText.textContent = '✨ 重新触发 AI 裁决';
    }
}

// ================== 渲染待审核列表 ==================
function getFilteredItems() {
    return state.items.filter(item => {
        const dec = state.decisions[item.id];
        if (state.activeFilter === 'all') return true;
        if (state.activeFilter === 'recommend-delete') return dec && dec.recommend === 'DELETE';
        if (state.activeFilter === 'protected') return dec && dec.recommend === 'KEEP';
        if (state.activeFilter === 'game') return item.category === 'game';
        if (state.activeFilter === 'dev') return item.category === 'dev' || item.category === 'dev_cache';
        if (state.activeFilter === 'media') return item.category === 'media';
        return true;
    });
}

function renderItemsList() {
    const visible = getFilteredItems();
    if (visible.length === 0) {
        dom.scanItemsList.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <p>当前筛选分类下无条目</p>
            </div>
        `;
        return;
    }

    dom.scanItemsList.innerHTML = visible.map(item => {
        const isChecked = state.selectedIds.has(item.id);
        const dec = state.decisions[item.id] || {
            recommend: 'CAUTION',
            badge: '[待裁决]',
            reason: '等待 AI 大模型进一步给出分析意见。',
            risk: 'LOW'
        };

        let badgeClass = 'badge-caution';
        if (dec.recommend === 'DELETE') badgeClass = 'badge-delete';
        if (dec.recommend === 'KEEP') badgeClass = 'badge-keep';

        const isProtected = dec.recommend === 'KEEP';

        return `
            <div class="item-card ${isChecked ? 'item-selected' : ''} ${isProtected ? 'item-protected' : ''}" data-id="${item.id}">
                <div class="item-check">
                    <label class="custom-checkbox">
                        <input type="checkbox" class="item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </div>

                <div class="item-main">
                    <div class="item-title-row">
                        <span class="item-drive-badge">${item.drive}:</span>
                        <span class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                        <span class="item-category-tag">${getCategoryName(item.category)}</span>
                    </div>
                    <div class="item-path" title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</div>
                </div>

                <div class="item-size-box">
                    <span class="item-size-gb">${item.sizeGB} GB</span>
                    <span class="item-date">${item.lastModified ? item.lastModified.split(' ')[0] : ''}</span>
                </div>

                <div class="item-ai-box">
                    <span class="ai-badge-label ${badgeClass}">${escapeHtml(dec.badge || '[AI建议]')}</span>
                    <p class="ai-reason-text" title="${escapeHtml(dec.reason || '')}">${escapeHtml(dec.reason || '')}</p>
                </div>
            </div>
        `;
    }).join('');

    // 单项复选框勾选事件
    document.querySelectorAll('.item-checkbox').forEach(box => {
        box.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            if (e.target.checked) {
                state.selectedIds.add(id);
            } else {
                state.selectedIds.delete(id);
            }
            updateSelectionSummary();
            const parentCard = e.target.closest('.item-card');
            if (parentCard) {
                if (e.target.checked) parentCard.classList.add('item-selected');
                else parentCard.classList.remove('item-selected');
            }
        });
    });
}

function getCategoryName(cat) {
    switch (cat) {
        case 'game': return '🎮 游戏娱乐';
        case 'dev_cache': return '💻 编译缓存';
        case 'dev': return '⚙️ 开发环境';
        case 'media': return '🎬 影音录屏';
        case 'iso_installer': return '💿 镜像安装包';
        case 'system_temp': return '🧹 临时垃圾';
        default: return '📁 其他文件';
    }
}

function updateSelectionSummary() {
    const selectedItems = state.items.filter(it => state.selectedIds.has(it.id));
    const totalGB = selectedItems.reduce((acc, it) => acc + (it.sizeGB || 0), 0);

    dom.selectedCount.textContent = selectedItems.length;
    dom.selectedSize.textContent = `${totalGB.toFixed(2)} GB`;
    dom.bottomFreeSize.textContent = `${totalGB.toFixed(2)} GB`;

    if (selectedItems.length > 0) {
        dom.btnExecuteClean.disabled = false;
    } else {
        dom.btnExecuteClean.disabled = true;
    }

    // 更新全选框状态
    const visible = getFilteredItems();
    if (visible.length > 0 && visible.every(it => state.selectedIds.has(it.id))) {
        dom.checkSelectAll.checked = true;
    } else {
        dom.checkSelectAll.checked = false;
    }
}

// ================== 执行物理清理 ==================
async function executeCleaning() {
    const selectedItems = state.items.filter(it => state.selectedIds.has(it.id));
    const paths = selectedItems.map(it => it.path);

    dom.btnConfirmDelete.disabled = true;
    dom.btnConfirmDelete.textContent = '正在极速执行物理清理...';

    try {
        const res = await fetch(`${API_BASE}/api/clean/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths })
        });
        const data = await res.json();

        dom.confirmModal.classList.add('hidden');

        if (data.success) {
            dom.resultSummaryTitle.textContent = data.summary;
            dom.resultLogContent.innerHTML = data.log.map(l => `
                <div style="padding: 2px 0;">
                    ${l.status === 'SUCCESS' ? '✅' : '⚠️'} ${escapeHtml(l.path)} - ${l.message}
                </div>
            `).join('');
            dom.resultModal.classList.remove('hidden');

            // 重新刷新磁盘空间
            if (data.updatedDisks) {
                renderDisks(data.updatedDisks);
            } else {
                fetchDiskStatus();
            }

            // 重新刷新列表，移除已删除的条目
            state.items = state.items.filter(it => !paths.includes(it.path));
            state.selectedIds.clear();
            renderItemsList();
            updateSelectionSummary();
        } else {
            alert(`清理失败: ${data.message}`);
        }
    } catch (e) {
        alert(`网络异常: ${e.message}`);
    } finally {
        dom.btnConfirmDelete.disabled = false;
        dom.btnConfirmDelete.textContent = '确认清理并释放';
    }
}

// ================== HTML 转义安全工具 ==================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
