// API: 添加山西名人（含去重检测 + 触发AI生成）

const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { name, dynasty, county, birth_year, death_year, main_achievement } = req.body;

        // 验证必填字段
        if (!name) {
            return res.status(400).json({ success: false, error: '姓名不能为空' });
        }

        // 去重检测：检查是否已存在相同姓名+朝代+籍贯的人物
        let query = supabase
            .from('person')
            .select('id, name, dynasty, county')
            .eq('name', name);

        if (dynasty) {
            query = query.eq('dynasty', dynasty);
        }

        if (county) {
            query = query.eq('county', county);
        }

        const { data: existing, error: queryError } = await query;

        if (queryError) {
            console.error('查询失败:', queryError);
        }

        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: `该人物可能已存在！已有记录：${existing[0].name}（${existing[0].dynasty || '朝代待考'}，${existing[0].county || '籍贯待考'}）。如需补充信息，请前往详情页。`,
                existing: existing[0]
            });
        }

        // 插入新人物
        const { data: newPerson, error: insertError } = await supabase
            .from('person')
            .insert([
                {
                    name,
                    dynasty: dynasty || null,
                    county: county || null,
                    birth_year: birth_year ? parseInt(birth_year) : null,
                    death_year: death_year ? parseInt(death_year) : null,
                    main_achievement: main_achievement || null
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error('插入失败:', insertError);
            return res.status(500).json({ success: false, error: '保存失败，请重试' });
        }

        // 触发 AI 内容生成（异步，不等待结果）
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        if (deepseekApiKey && newPerson) {
            // 调用生成 AI 内容的 API（异步，不阻塞响应）
            fetch(`${process.env.VERCEL_URL || 'https://' + req.headers.host}/api/generate-ai.js`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personId: newPerson.id, personName: name, dynasty, county })
            }).catch(err => console.error('触发AI生成失败:', err));
        }

        return res.status(200).json({
            success: true,
            message: '添加成功，AI 正在生成详细介绍',
            data: newPerson
        });

    } catch (error) {
        console.error('API 错误:', error);
        return res.status(500).json({ success: false, error: '服务器内部错误' });
    }
};
