// API: 网友补充信息

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// 过滤特殊符号函数
function filterSpecialChars(text) {
    if (!text) return '';
    // 保留：中文、英文、数字、空格、常用中文标点、常用英文标点
    let filtered = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\。\，\！\？\；\：\“\”\‘\’\、\（\）\【\】\《\》\…\—\～\.\,\!\?\;\:\"\'\(\)]/g, '');
    // 去除多余空格
    filtered = filtered.replace(/\s+/g, ' ').trim();
    return filtered;
}

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

        // 过滤特殊符号
        const filteredValue = filterSpecialChars(newValue);

        if (!personId || !fieldName || !filteredValue) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        // 保存到补充表
        const { error } = await supabase
            .from('user_contribution')
            .insert([
                {
                    person_id: parseInt(personId),
                    field_name: fieldName,
                    new_value: filteredValue,
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
