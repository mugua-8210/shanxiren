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
        const { keyword, dynasty, county, all } = req.query;

        let query = supabase.from('person').select('*').order('created_at', { ascending: false });

        if (all === 'true') {
            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json({ success: true, data });
        }

        if (keyword && keyword.trim()) {
            query = query.ilike('name', `%${keyword.trim()}%`);
        }
        if (dynasty && dynasty.trim()) {
            query = query.ilike('dynasty', `%${dynasty.trim()}%`);
        }
        if (county && county.trim()) {
            query = query.ilike('county', `%${county.trim()}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        return res.status(200).json({ success: true, data: data || [] });

    } catch (error) {
        console.error('搜索错误:', error);
        return res.status(500).json({ success: false, error: '搜索失败' });
    }
}
