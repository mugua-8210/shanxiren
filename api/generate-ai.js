// API: AI 生成名人介绍（使用 GitHub Models - 完全免费）

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function callGitHubModel(prompt) {
    if (!GITHUB_TOKEN) {
        console.error('GITHUB_TOKEN 未配置');
        return null;
    }

    console.log('调用 GitHub Models，prompt:', prompt.substring(0, 100));

    try {
        const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: '你是山西地方志专家，擅长介绍山西历史名人。回答要准确、生动，150字左右。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GitHub Models API 错误:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        return null;
    } catch (error) {
        console.error('调用 GitHub Models 异常:', error);
        return null;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { id, personId } = req.method === 'GET' ? req.query : req.body;
        const pid = parseInt(id || personId);

        if (!pid) {
            return res.status(400).json({ success: false, error: '缺少人物ID' });
        }

        // 获取人物信息
        const { data: person, error: personError } = await supabase
            .from('person')
            .select('name, dynasty, county, main_achievement')
            .eq('id', pid)
            .single();

        if (personError || !person) {
            return res.status(404).json({ success: false, error: '人物不存在' });
        }

        // 构造 prompt
        let prompt = `请介绍山西名人${person.name}。`;
        if (person.dynasty) prompt += ` 朝代：${person.dynasty}。`;
        if (person.county) prompt += ` 籍贯：${person.county}。`;
        if (person.main_achievement) prompt += ` 主要事迹：${person.main_achievement}。`;
        prompt += ` 写一段150字左右的介绍。`;

        // 调用 GitHub Models
        const article = await callGitHubModel(prompt);
        
        // 如果 AI 调用失败，使用备用内容
        const finalArticle = article || `关于${person.name}的详细介绍正在生成中，请稍后再试。`;

        // 保存到数据库
        await supabase
            .from('ai_content')
            .upsert({
                person_id: pid,
                content_type: 'long_article',
                content_json: finalArticle
            }, { onConflict: 'person_id, content_type' });

        if (req.method === 'GET') {
            return res.status(200).json({ success: true, data: { long_article: finalArticle } });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('AI生成失败:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
