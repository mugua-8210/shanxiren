// 测试版本 - 不调用任何 AI，只返回固定内容
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({ success: false, error: '缺少ID' });
        }
        
        // 获取人物信息
        const { data: person, error } = await supabase
            .from('person')
            .select('name')
            .eq('id', parseInt(id))
            .single();
        
        if (error) {
            return res.status(404).json({ success: false, error: '人物不存在' });
        }
        
        // 返回测试内容
        const testArticle = `这是关于 ${person.name} 的测试介绍。AI 功能正在调试中。`;
        
        return res.status(200).json({ 
            success: true, 
            data: { long_article: testArticle }
        });
        
    } catch (error) {
        console.error('错误:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
