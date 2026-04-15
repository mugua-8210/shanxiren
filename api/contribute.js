// API: 网友补充信息（保存到待审核表）

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
        const { personId, fieldName, newValue } = req.body;

        if (!personId || !fieldName || !newValue) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        // 保存到补充表，状态为 pending
        const { error } = await supabase
            .from('user_contribution')
            .insert([
                {
                    person_id: parseInt(personId),
                    field_name: fieldName,
                    new_value: newValue,
                    status: 'pending'
                }
            ]);

        if (error) {
            console.error('保存失败:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        return res.status(200).json({ 
            success: true, 
            message: '补充信息已提交，等待管理员审核。'
        });

    } catch (error) {
        console.error('API错误:', error);
        return res.status(500).json({ success: false, error: '服务器错误' });
    }
}
