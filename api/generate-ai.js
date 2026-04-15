// API: 调用 DeepSeek AI 生成名人介绍（A/B/C 三类内容）

const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// 调用 DeepSeek API
async function callDeepSeek(prompt) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
        throw new Error('DeepSeek API Key 未配置');
    }

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
                    content: '你是山西地方志专家，擅长介绍山西历史名人。回答要准确、生动，体现山西文化特色。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// 生成 A 类内容：结构化信息（官职、著作、家族等）
async function generateStructuredContent(name, dynasty, county) {
    const prompt = `请为山西名人【${name}】生成结构化信息。
朝代：${dynasty || '未知'}
籍贯：${county || '山西'}
要求输出JSON格式，包含以下字段（如果没有就写"暂无"）：
{
    "official_position": "官职",
    "major_works": "主要著作/作品",
    "family": "家族背景",
    "honors": "后世封号/荣誉",
    "influence": "历史影响"
}`;
    
    const result = await callDeepSeek(prompt);
    // 尝试解析 JSON
    try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('解析结构化内容失败:', e);
    }
    return { raw: result };
}

// 生成 B 类内容：长篇人物传记
async function generateLongArticle(name, dynasty, county, achievement) {
    const prompt = `请为山西名人【${name}】写一篇800字左右的人物介绍。
朝代：${dynasty || '未知'}
籍贯：${county || '山西'}
主要事迹：${achievement || '待补充'}

要求：
1. 包含生平、关键事件、历史影响
2. 语言通俗但有文化厚度
3. 结尾体现"让世界看见山西"的精神
4. 分段落，用小标题`;
    
    return await callDeepSeek(prompt);
}

// 保存 AI 内容到数据库
async function saveAIContent(personId, contentType, contentJson) {
    const { error } = await supabase
        .from('ai_content')
        .insert({
            person_id: personId,
            content_type: contentType,
            content_json: contentJson
        });

    if (error) {
        console.error(`保存 ${contentType} 失败:`, error);
    }
    return !error;
}

module.exports = async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { id, personName, dynasty, county } = req.method === 'GET' ? req.query : req.body;
        const personId = parseInt(id);

        if (!personId) {
            return res.status(400).json({ success: false, error: '缺少人物ID' });
        }

        // 获取人物信息（如果没有传入）
        let personInfo = { name: personName, dynasty, county };
        if (!personName) {
            const { data, error } = await supabase
                .from('person')
                .select('name, dynasty, county, main_achievement')
                .eq('id', personId)
                .single();
            
            if (error) {
                return res.status(404).json({ success: false, error: '人物不存在' });
            }
            personInfo = data;
        }

        // 检查是否已生成过内容
        const { data: existing } = await supabase
            .from('ai_content')
            .select('content_type')
            .eq('person_id', personId);

        const existingTypes = (existing || []).map(e => e.content_type);
        
        const results = {};

        // 生成 A 类内容（结构化）
        if (!existingTypes.includes('structured')) {
            try {
                const structured = await generateStructuredContent(
                    personInfo.name,
                    personInfo.dynasty,
                    personInfo.county
                );
                await saveAIContent(personId, 'structured', structured);
                results.structured = structured;
            } catch (err) {
                console.error('生成结构化内容失败:', err);
                results.structured = { error: '生成失败' };
            }
        }

        // 生成 B 类内容（长篇传记）
        if (!existingTypes.includes('long_article')) {
            try {
                const longArticle = await generateLongArticle(
                    personInfo.name,
                    personInfo.dynasty,
                    personInfo.county,
                    personInfo.main_achievement
                );
                await saveAIContent(personId, 'long_article', longArticle);
                results.long_article = longArticle;
            } catch (err) {
                console.error('生成长篇传记失败:', err);
                results.long_article = { error: '生成失败' };
            }
        }

        // 返回生成的内容（用于前端显示）
        if (req.method === 'GET') {
            // GET 请求：返回已有的 AI 内容
            const { data: contents } = await supabase
                .from('ai_content')
                .select('content_type, content_json')
                .eq('person_id', personId);

            const responseData = {};
            if (contents) {
                contents.forEach(c => {
                    responseData[c.content_type] = c.content_json;
                });
            }
            return res.status(200).json({ success: true, data: responseData });
        }

        // POST 请求：返回本次生成的结果
        return res.status(200).json({ success: true, data: results });

    } catch (error) {
        console.error('API 错误:', error);
        return res.status(500).json({ success: false, error: '服务器内部错误：' + error.message });
    }
};
