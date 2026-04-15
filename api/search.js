// API: 搜索山西名人（支持精确匹配）

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { keyword, dynasty, county, city, county_exact, city_exact, all } = req.query;

        let query = supabase.from('person').select('*').order('created_at', { ascending: false });

        // 获取所有数据
        if (all === 'true') {
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json({ success: true, data });
        }

        // 按人名模糊搜索
        if (keyword && keyword.trim()) {
            query = query.ilike('name', `%${keyword.trim()}%`);
        }

        // 按朝代模糊搜索
        if (dynasty && dynasty.trim()) {
            query = query.ilike('dynasty', `%${dynasty.trim()}%`);
        }

        // 按地区模糊搜索（旧版兼容）
        if (county && county.trim()) {
            query = query.ilike('county', `%${county.trim()}%`);
        }

        // 按市精确匹配（地图点击用）
        if (city_exact && city_exact.trim()) {
            query = query.eq('city', city_exact.trim());
        }

        // 按县/区精确匹配（地图点击用）
        if (county_exact && county_exact.trim()) {
            query = query.eq('county', county_exact.trim());
        }

        // 按市模糊搜索（搜索框用）
        if (city && city.trim()) {
            query = query.ilike('city', `%${city.trim()}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        return res.status(200).json({ success: true, data: data || [] });

    } catch (error) {
        console.error('搜索错误:', error);
        return res.status(500).json({ success: false, error: '搜索失败' });
    }
}
