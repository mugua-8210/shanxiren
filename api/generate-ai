const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function callDeepSeek(prompt) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1500
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
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

        // 生成介绍
        const prompt = `请介绍山西名人 ${person.name}。${person.dynasty ? `朝代：${person.dynasty}。` : ''}${person.county ? `籍贯：${person.county}。` : ''}${person.main_achievement ? `主要事迹：${person.main_achievement}。` : ''}写一段200字左右的介绍。`;

        const article = await callDeepSeek(prompt);

        // 保存到数据库
        await supabase
            .from('ai_content')
            .upsert({
                person_id: pid,
                content_type: 'long_article',
                content_json: article
            }, { onConflict: 'person_id, content_type' });

        if (req.method === 'GET') {
            return res.status(200).json({ success: true, data: { long_article: article } });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('AI生成失败:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
