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
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, error: '缺少人物ID' });
        }

        const { data: person, error } = await supabase
            .from('person')
            .select('*')
            .eq('id', parseInt(id))
            .single();

        if (error) {
            return res.status(404).json({ success: false, error: '人物不存在' });
        }

        // 获取 AI 内容
        const { data: aiContents } = await supabase
            .from('ai_content')
            .select('content_type, content_json')
            .eq('person_id', parseInt(id));

        const aiData = {};
        if (aiContents) {
            aiContents.forEach(item => {
                aiData[item.content_type] = item.content_json;
            });
        }

        return res.status(200).json({
            success: true,
            data: { ...person, ai_content: aiData }
        });

    } catch (error) {
        console.error('API错误:', error);
        return res.status(500).json({ success: false, error: '服务器错误' });
    }
}
