# 🚀 AI Disk & RAM Cleaner (智能磁盘与运行内存双优化桌面大师)

<div align="center">

![Platform](https://img.shields.io/badge/Platform-Windows%2010%2B-blue?style=flat-square&logo=windows)
![Node](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js)
![Electron](https://img.shields.io/badge/Electron-v33-47848F?style=flat-square&logo=electron)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)
![DeepSeek](https://img.shields.io/badge/AI-DeepSeek%20%7C%20Claude%20%7C%20OpenAI-orange?style=flat-square)

**专为全行业数字化工作者打造的 AI 驱动型磁盘与内存治理桌面级应用**  
结合使用者【职业画像】与【自定义自然语言铁律】，由大模型进行深度资产裁决，安全释放海量存储，瞬间恢复电脑极速性能！

</div>

---

## 🌟 核心功能亮点

### 1. 🧠 AI 智能资产裁决中枢 (全行业通用自适应)
- **双协议深度兼容**：
  - **OpenAI 兼容协议**：原生适配 DeepSeek 官方 (`https://api.deepseek.com`)、OpenAI (`gpt-4o`)、月之暗面 Kimi、智谱 GLM 及各类 OneAPI/NewAPI 代理中转。
  - **Anthropic Messages 协议**：原生适配 DeepSeek Anthropic 兼容端点 (`https://api.deepseek.com/anthropic`) 与 Claude 官方端点 (`https://api.anthropic.com`)。
- **自定义 Base URL**：允许用户完全自主手填或修改任何第三方中转接口或本地私有化大模型地址（如 Ollama `http://localhost:11434/v1`）。
- **全行业职业画像研判**：拒绝生搬硬套！无论您是**通用职场办公、财务会计/法务、影视剪辑/自媒体、视觉设计/3D建模、软件开发工程师、还是高校学生/科研学者**，系统均能结合您的专业日常给出精准、客观的判定建议。
- **✨ 最高优先级【用户自定义指令提示词 (Guardrails Prompt)】**：
  - 拥有最高优先权与一票否决权！用自然语言即可下达规则（例如：*“绝对保留我的财务账套与业务合同，各类软件的中间构建包、过期的安装镜像与闲置的大游戏可以放心清理”*）。
  - 内置**动态自然语言意图提取引擎**，哪怕在离线本地模式下也能 100% 捕获并严格执行用户的保护与清理准则！

### 2. 📊 C 盘 / D 盘真实容量实时透视仪表盘
- 毫秒级探测 C 盘、D 盘的总空间、已用容量、可用容量与动态环形负荷进度条。
- 采用靶向极速扫描引擎，7 秒内深度穿透数百个目录，检出数十至上百 GB 的可释放大资产清单。

### 3. ⚡ 物理运行内存 (RAM) 监控与一键工作集加速
- 实时监控物理内存占用负荷、可用空闲量。
- 动态透视当前系统占用内存最高的 **TOP 8 内存大户应用进程**。
- **一键内存极速优化**：调用底层进程工作集收缩回收机制，瞬间压缩闲置常驻内存（实测瞬间释放 1 ~ 2 GB 闲置内存）。

### 4. 🛡️ 交互式安全审核控制台与零误删保障
- 卡片化全维度展示：条目路径、大小、最近修改时间、AI 判定标签与客观理由。
- 自由筛选、全选/反选、仅勾选推荐、防误删二次确认弹窗。
- 核心系统关键路径底层安全防护拦截，物理清理完毕后自动复测磁盘容量并生成成果战报。

### 5. 💎 现代极客美学界面设计
- 赛博深色主题 + 磨砂玻璃拟态（Glassmorphism）。
- 实时 AI 调用动态监听横幅（AI Live Monitor），请求耗时、协议、目标端点与服务端回显一目了然。

---

## 🖥️ 快速运行与使用方式

### 方式一：Windows 一键双击直接运行（最便捷）
项目根目录下已准备好专属桌面启动器：
- 双击 **`启动应用.bat`**：自动检查环境并拉起桌面客户端窗口；
- 双击 **`静默启动.vbs`**：无黑框全静默拉起桌面应用！

### 方式二：命令行启动

```bash
# 1. 安装项目依赖
npm install

# 2. 启动桌面应用窗口 (Electron 模式)
npm run electron

# 或启动本地 Web 服务模式
npm start
# 浏览器访问：http://localhost:3928
```

---

## 📦 打包为独立桌面程序 (.exe)

如果您需要将应用打包分发给他人或制作独立 Windows 安装包/绿色版：

```bash
# 执行打包脚本
npm run pack
```
打包完成后将在 `dist/` 目录下生成独立的桌面可执行程序文件夹，双击即可运行，无需预装环境。

---

## 🚀 推送到 GitHub 完整步骤指南

本项目已预先配置好安全的 `.gitignore`，**已严格阻断您的真实 API Key、`node_modules` 与临时日志被意外推送到公开代码库**。

请在项目根目录下依次执行以下命令推送到您的 GitHub 仓库：

```bash
# 1. 初始化本地 Git 仓库（如未初始化）
git init

# 2. 暂存所有代码文件
git add .

# 3. 提交本地版本
git commit -m "feat: 🚀 release AI Disk & RAM Cleaner v1.0.0"

# 4. 关联您的 GitHub 远程仓库 (将 YOUR_USERNAME 替换为您的 GitHub 用户名)
git remote add origin https://github.com/YOUR_USERNAME/ai-disk-cleaner.git

# 5. 切换主分支并推送到 GitHub
git branch -M main
git push -u origin main
```

> **安全提示**：任何人在从 GitHub 克隆本项目后，系统会自动根据 `config.example.json` 生成干净的初始配置，只需输入自己的 API Key 即可使用，绝不会发生密钥泄露！

---

## 🤖 常见大模型配置参考

| 供应商 / 协议 | 调用协议规范 | 接口 Base URL | 推荐模型名 (Model) |
| :--- | :--- | :--- | :--- |
| **DeepSeek (OpenAI 协议)** | `OpenAI 兼容协议` | `https://api.deepseek.com` | `deepseek-v4-flash` / `deepseek-chat` / `deepseek-reasoner` |
| **DeepSeek (Anthropic 协议)** | `Anthropic Messages 协议` | `https://api.deepseek.com/anthropic` | `deepseek-v4-flash` / `deepseek-v4-pro` |
| **Anthropic Claude 官方** | `Anthropic Messages 协议` | `https://api.anthropic.com` | `claude-3-5-sonnet-20241022` |
| **OpenAI 官方** | `OpenAI 兼容协议` | `https://api.openai.com/v1` | `gpt-4o` / `gpt-4o-mini` |
| **本地私有化 Ollama** | `OpenAI 兼容协议` | `http://localhost:11434/v1` | `qwen2.5:7b` / `llama3.1` |
| **第三方聚合中转站** | 根据中转站协议选择 | `https://your-api-proxy.com/v1` | 自定义填写 |

---

## 📂 项目结构全览

```text
ai-disk-cleaner/
├── 启动应用.bat             # Windows 一键双击运行脚本
├── 静默启动.vbs             # Windows 无黑框静默启动脚本
├── main.js                  # Electron 桌面窗口主进程
├── server.js                # Express 后端核心服务 (磁盘扫描引擎/内存压缩/规则研判)
├── ai_client.js             # 双协议统一 AI 客户端 (OpenAI & Anthropic 双协议自适应)
├── scan_engine.ps1          # 底层高性能靶向磁盘扫描引擎
├── config.example.json      # 开源示例配置文件 (公开模板)
├── package.json             # 项目元数据、依赖及打包 Scripts
├── .gitignore               # Git 忽略规则 (严密保护个人 API Key 与本地构建)
├── README.md                # 详尽使用与技术文档
└── public/                  # 前端界面静态资源
    ├── index.html           # 现代单页前端结构 (全行业画像/BaseURL/实时横幅)
    ├── css/
    │   └── style.css        # 玻璃拟态深色主题样式系统
    └── js/
        └── app.js           # 前端数据交互、图表渲染与状态同步逻辑
```

---

## 🛡️ 安全与隐私说明 (Security & Privacy)

1. **API Key 纯本地保存**：您的 API Key 仅保存在您本地电脑的 `config.json` 中，由本地进程直接发起网络调用，**绝不会经过任何第三方中间代理服务器或云端上报**。
2. **底层安全拦截保障**：内置绝对安全防护过滤器，Windows 系统关键目录（如 `C:\Windows`, `System32`）、磁盘根目录受到严格写保护，杜绝误操作。
3. **二次人工审核机制**：AI 仅提供诊断建议，所有拟清理条目必须经过用户界面手动复核与二次弹窗确认后方可物理执行。

---

## 📄 开源协议 (License)

本项目采用 [MIT License](LICENSE) 开源授权。欢迎提交 Issue 或 Pull Request！
