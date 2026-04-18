// API: AI 生成名人介绍

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function callDeepSeek(prompt) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.error('DeepSeek API Key 未配置');
        throw new Error('DeepSeek API Key 未配置');
    }

    console.log('调用 DeepSeek API，prompt 长度:', prompt.length);

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: '你是山西地方志专家，擅长介绍山西历史名人。回答要准确、生动，200字左右。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API 错误:', response.status, errorText);
        throw new Error(`DeepSeek API 错误: ${response.status}`);
    }

    const data = await response.json();
    console.log('DeepSeek API 返回成功');
    
    // 安全地获取返回内容
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
    } else {
        console.error('DeepSeek 返回格式异常:', data);
        throw new Error('DeepSeek 返回格式异常');
    }
}

export default async function handler(req, res) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 获取人物 ID（支持 GET 和 POST）
        const { id, personId } = req.method === 'GET' ? req.query : req.body;
        const pid = parseInt(id || personId);

        if (!pid) {
            return res.status(400).json({ success: false, error: '缺少人物ID' });
        }

        console.log('开始为人物 ID:', pid, '生成 AI 介绍');

        // 获取人物信息
        const { data: person, error: personError } = await supabase
            .from('person')
            .select('name, dynasty, county, main_achievement')
            .eq('id', pid)
            .single();

        if (personError || !person) {
            console.error('获取人物失败:', personError);
            return res.status(404).json({ success: false, error: '人物不存在' });
        }

        console.log('人物信息:', person.name);

        // 构造 prompt
        let prompt = `请介绍山西名人 ${person.name}。`;
        if (person.dynasty) prompt += ` 朝代：${person.dynasty}。`;
        if (person.county) prompt += ` 籍贯：${person.county}。`;
        if (person.main_achievement) prompt += ` 主要事迹：${person.main_achievement}。`;
        prompt += ` 写一段200字左右的介绍。`;

        // 调用 DeepSeek
        const article = await callDeepSeek(prompt);

        // 保存到数据库
        const { error: upsertError } = await supabase
            .from('ai_content')
            .upsert({
                person_id: pid,
                content_type: 'long_article',
                content_json: article
            }, { onConflict: 'person_id, content_type' });

        if (upsertError) {
            console.error('保存 AI 内容失败:', upsertError);
        }

        console.log('AI 介绍生成并保存成功');

        // 返回结果
        if (req.method === 'GET') {
            return res.status(200).json({ 
                success: true, 
                data: { long_article: article }
            });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('AI生成失败:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '服务器错误'
        });
    }
}
