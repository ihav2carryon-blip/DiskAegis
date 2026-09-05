// ==========================================================================
// AI Client - 支持 OpenAI 兼容协议与 Anthropic Messages 协议
// ==========================================================================

/**
 * 规范化 OpenAI 接口完整地址
 */
function resolveOpenAIUrl(baseUrl) {
    if (!baseUrl) return 'https://api.deepseek.com/chat/completions';
    let url = baseUrl.trim().replace(/\/+$/, '');
    if (url.endsWith('/chat/completions')) {
        return url;
    }
    if (url.endsWith('/v1')) {
        return `${url}/chat/completions`;
    }
    // DeepSeek 官方支持直接 https://api.deepseek.com/chat/completions
    if (url.includes('deepseek.com') || url.includes('moonshot.cn') || url.includes('bigmodel.cn')) {
        return `${url}/chat/completions`;
    }
    // 其他一般如 api.openai.com 补全 /v1/chat/completions
    return `${url}/v1/chat/completions`;
}

/**
 * 规范化 Anthropic 接口完整地址
 */
function resolveAnthropicUrl(baseUrl) {
    if (!baseUrl) return 'https://api.anthropic.com/v1/messages';
    let url = baseUrl.trim().replace(/\/+$/, '');
    if (url.endsWith('/messages')) {
        return url;
    }
    if (url.endsWith('/v1')) {
        return `${url}/messages`;
    }
    return `${url}/v1/messages`;
}

/**
 * 通用统一 AI 模型调用函数
 * @param {Object} options
 * @param {string} options.protocol - 'openai' | 'anthropic'
 * @param {string} options.baseUrl - 用户输入的 Base URL
 * @param {string} options.apiKey - API Key
 * @param {string} options.model - 模型名
 * @param {string} options.systemPrompt - 系统级提示词
 * @param {string|Array} options.userContent - 用户输入内容
 * @param {number} [options.maxTokens] - 最大 token
 */
async function callAiModel({ protocol = 'openai', baseUrl, apiKey, model, systemPrompt, userContent, maxTokens = 3500 }) {
    const isAnthropic = (protocol || '').toLowerCase() === 'anthropic';
    const startTime = Date.now();

    let targetUrl;
    let headers = {
        'Content-Type': 'application/json'
    };
    let requestBody;

    if (isAnthropic) {
        // ================== Anthropic Messages API 协议 ==================
        targetUrl = resolveAnthropicUrl(baseUrl);
        headers['x-api-key'] = (apiKey || '').trim();
        // 兼容支持同时校验 Authorization 头的中转平台
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        }
        headers['anthropic-version'] = '2023-06-01';

        const textContent = typeof userContent === 'string' ? userContent : JSON.stringify(userContent);
        requestBody = {
            model: model || 'claude-3-5-sonnet-20241022',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
                { role: 'user', content: textContent }
            ]
        };
    } else {
        // ================== OpenAI 兼容 API 协议 ==================
        targetUrl = resolveOpenAIUrl(baseUrl);
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        }

        const textContent = typeof userContent === 'string' ? userContent : JSON.stringify(userContent);
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: textContent });

        requestBody = {
            model: model || 'deepseek-chat',
            messages: messages,
            temperature: 0.2
        };
    }

    console.log(`\n================== [AI 调用发起] ==================`);
    console.log(`[协议类型]: ${isAnthropic ? 'Anthropic Messages' : 'OpenAI 兼容'}`);
    console.log(`[目标接口]: ${targetUrl}`);
    console.log(`[使用模型]: ${requestBody.model}`);
    console.log(`[API Key 状态]: ${apiKey ? `已提供 (长度: ${apiKey.length}, 前缀: ${apiKey.slice(0, 5)}...)` : '未提供'}`);
    console.log(`====================================================\n`);

    let response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });

    // 针对 Anthropic 路由自适应：如果 /v1/messages 返回 404，自适应尝试 /messages
    if (response.status === 404 && isAnthropic && targetUrl.endsWith('/v1/messages')) {
        const fallbackUrl = targetUrl.replace('/v1/messages', '/messages');
        console.warn(`[路由自适应] ${targetUrl} 返回 404，尝试回退至: ${fallbackUrl}`);
        const fallbackRes = await fetch(fallbackUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        if (fallbackRes.ok || fallbackRes.status !== 404) {
            response = fallbackRes;
            targetUrl = fallbackUrl;
        }
    }

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI 调用失败] HTTP ${response.status}: ${errorText}`);
        throw new Error(`[${isAnthropic ? 'Anthropic' : 'OpenAI'} 接口返回错误 HTTP ${response.status}]: ${errorText.slice(0, 300)}`);
    }

    const data = await response.json();
    let replyText = '';

    if (isAnthropic) {
        if (data.content && Array.isArray(data.content)) {
            // 优先提取 type === 'text' 或具有 text 字段的 block（兼容带 thinking 块的模型）
            const textBlocks = data.content.filter(c => c && (c.type === 'text' || c.text));
            if (textBlocks.length > 0) {
                replyText = textBlocks.map(c => c.text || '').join('\n').trim();
            } else if (data.content[0]) {
                replyText = data.content[0].text || data.content[0].thinking || '';
            }
        } else if (typeof data.content === 'string') {
            replyText = data.content;
        } else if (data.completion) {
            replyText = data.completion;
        } else if (data.choices && Array.isArray(data.choices) && data.choices[0] && data.choices[0].message) {
            replyText = data.choices[0].message.content || '';
        } else if (data.text) {
            replyText = data.text;
        }
    } else {
        if (data.choices && Array.isArray(data.choices) && data.choices[0] && data.choices[0].message) {
            replyText = data.choices[0].message.content || '';
        } else if (data.content) {
            replyText = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
        } else if (data.text) {
            replyText = data.text;
        }
    }

    if (!replyText) {
        console.warn('[AI 响应解析警告] replyText 为空，原始数据结构:', JSON.stringify(data).slice(0, 500));
    }

    console.log(`[AI 调用成功] 耗时: ${latencyMs}ms, 返回长度: ${replyText.length} 字符\n`);

    return {
        text: replyText,
        latencyMs,
        targetUrl,
        protocol: isAnthropic ? 'anthropic' : 'openai',
        model: requestBody.model
    };
}

module.exports = {
    callAiModel,
    resolveOpenAIUrl,
    resolveAnthropicUrl
};
