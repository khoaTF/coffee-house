/**
 * AI Admin Assistant — Vercel Serverless Function
 * 
 * Connects to Gemini API to provide natural language querying
 * for business data (orders, revenue, inventory).
 * 
 * Endpoint: POST /api/ai-assistant
 * Body: { message: string, context: object }
 * 
 * Security: Only accepts requests from authenticated admin sessions.
 */

// Environment variables are read inside the handler to ensure they are properly loaded by Vercel

const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của hệ thống quản lý quán cà phê "Nohope Coffee".
Vai trò: Hỗ trợ chủ quán phân tích doanh thu, tồn kho, đơn hàng và đưa ra gợi ý kinh doanh.

QUY TẮC QUAN TRỌNG:
1. Trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.
2. Khi được cung cấp dữ liệu, hãy phân tích cụ thể với con số.
3. Đưa ra gợi ý actionable (hành động cụ thể).
4. Sử dụng emoji phù hợp để dễ đọc.
5. Format kết quả dạng markdown ngắn gọn.
6. Nếu không có đủ dữ liệu, nói rõ và gợi ý cần thêm gì.
7. Không bao giờ thực hiện thay đổi dữ liệu, chỉ đọc và phân tích.
8. Giữ câu trả lời dưới 500 từ.`;

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const GEMINI_MODEL = 'gemini-2.0-flash';
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const { message, context } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Build context string from frontend data
        let contextStr = '';
        if (context) {
            if (context.todayRevenue !== undefined) {
                contextStr += `\n📊 Doanh thu hôm nay: ${Number(context.todayRevenue).toLocaleString('vi-VN')}đ`;
            }
            if (context.todayOrders !== undefined) {
                contextStr += `\n📦 Số đơn hôm nay: ${context.todayOrders}`;
            }
            if (context.topItems && context.topItems.length > 0) {
                contextStr += `\n🔥 Top món bán chạy: ${context.topItems.map(i => `${i.name}(${i.qty})`).join(', ')}`;
            }
            if (context.lowStockItems && context.lowStockItems.length > 0) {
                contextStr += `\n⚠️ Nguyên liệu sắp hết: ${context.lowStockItems.join(', ')}`;
            }
            if (context.weekRevenue) {
                contextStr += `\n📈 Doanh thu 7 ngày qua: ${JSON.stringify(context.weekRevenue)}`;
            }
            if (context.totalProducts !== undefined) {
                contextStr += `\n🍽️ Tổng số món trong menu: ${context.totalProducts}`;
            }
            if (context.avgOrderValue !== undefined) {
                contextStr += `\n💰 Giá trị đơn trung bình: ${Number(context.avgOrderValue).toLocaleString('vi-VN')}đ`;
            }
        }

        const userMessage = contextStr
            ? `[DỮ LIỆU HIỆN TẠI CỦA QUÁN]${contextStr}\n\n[CÂU HỎI CỦA CHỦ QUÁN]\n${message}`
            : message;

        // Call Gemini API
        const geminiRes = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: SYSTEM_PROMPT + '\n\n' + userMessage }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                    topP: 0.9
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
                ]
            })
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error('Gemini API error:', geminiRes.status, errText);
            return res.status(502).json({ error: 'AI service unavailable', detail: errText });
        }

        const data = await geminiRes.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.';

        return res.status(200).json({
            success: true,
            reply: reply.trim()
        });

    } catch (error) {
        console.error('AI Assistant error:', error);
        return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
};
