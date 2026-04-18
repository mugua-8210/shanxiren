import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
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
        // 添加 city 到解构中
        const { name, dynasty, city, county, birth_year, death_year, main_achievement } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: '姓名不能为空' });
        }

        // 去重检测（可选：加入 city 判断）
        let query = supabase.from('person').select('id, name, dynasty, city, county').eq('name', name);
        if (dynasty) query = query.eq('dynasty', dynasty);
        if (city) query = query.eq('city', city);
        if (county) query = query.eq('county', county);

        const { data: existing } = await query;

        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: `该人物可能已存在！已有记录：${existing[0].name}`
            });
        }

        // 插入新人物（添加 city 字段）
        const { data: newPerson, error: insertError } = await supabase
            .from('person')
            .insert([{
                name,
                dynasty: dynasty || null,
                city: city || null,           // 新增
                county: county || null,
                birth_year: birth_year ? parseInt(birth_year) : null,
                death_year: death_year ? parseInt(death_year) : null,
                main_achievement: main_achievement || null
            }])
            .select()
            .single();

        if (insertError) {
            console.error('插入错误:', insertError);
            return res.status(500).json({ success: false, error: '保存失败' });
        }

        // 触发 AI 生成（异步）
        const host = req.headers.host;
        fetch(`https://${host}/api/generate-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personId: newPerson.id })
        }).catch(err => console.error('触发AI失败:', err));

        return res.status(200).json({ success: true, data: newPerson });

    } catch (error) {
        console.error('API错误:', error);
        return res.status(500).json({ success: false, error: '服务器错误' });
    }
}
