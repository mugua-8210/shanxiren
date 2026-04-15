// API: 获取单个名人详情

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
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, error: '缺少人物ID' });
        }

        // 获取人物基本信息
        const { data: person, error: personError } = await supabase
            .from('person')
            .select('*')
            .eq('id', parseInt(id))
            .single();

        if (personError) {
            if (personError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: '人物不存在' });
            }
            console.error('查询失败:', personError);
            return res.status(500).json({ success: false, error: '查询失败' });
        }

        // 获取 AI 生成的内容
        const { data: aiContents, error: aiError } = await supabase
            .from('ai_content')
            .select('content_type, content_json')
            .eq('person_id', parseInt(id));

        if (aiError) {
            console.error('获取AI内容失败:', aiError);
        }

        // 整理 AI 内容
        const aiData = {};
        if (aiContents && aiContents.length > 0) {
            aiContents.forEach(item => {
                if (item.content_json) {
                    aiData[item.content_type] = item.content_json;
                }
            });
        }

        // 获取网友补充信息
        const { data: contributions, error: contribError } = await supabase
            .from('user_contribution')
            .select('field_name, new_value, status')
            .eq('person_id', parseInt(id))
            .eq('status', 'approved');

        if (contribError) {
            console.error('获取补充信息失败:', contribError);
        }

        return res.status(200).json({
            success: true,
            data: {
                ...person,
                ai_content: aiData,
                contributions: contributions || []
            }
        });

    } catch (error) {
        console.error('API 错误:', error);
        return res.status(500).json({ success: false, error: '服务器内部错误' });
    }
};
