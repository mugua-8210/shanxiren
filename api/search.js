// API: 搜索山西名人（按人名/朝代/地区）

const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { keyword, dynasty, county, all } = req.query;

        let query = supabase
            .from('person')
            .select('id, name, dynasty, county, birth_year, death_year, main_achievement, created_at')
            .order('created_at', { ascending: false });

        // 如果请求所有数据
        if (all === 'true') {
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json({ success: true, data });
        }

        // 按人名搜索（模糊匹配）
        if (keyword && keyword.trim()) {
            query = query.ilike('name', `%${keyword.trim()}%`);
        }

        // 按朝代搜索
        if (dynasty && dynasty.trim()) {
            query = query.ilike('dynasty', `%${dynasty.trim()}%`);
        }

        // 按地区搜索（籍贯）
        if (county && county.trim()) {
            query = query.ilike('county', `%${county.trim()}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('搜索失败:', error);
            return res.status(500).json({ success: false, error: '搜索失败' });
        }

        return res.status(200).json({ success: true, data: data || [] });

    } catch (error) {
        console.error('API 错误:', error);
        return res.status(500).json({ success: false, error: '服务器内部错误' });
    }
};
