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
Vai trò: Hỗ trợ chủ quán phân tích dữ liệu và quản lý hệ thống.

QUY TẮC QUAN TRỌNG:
1. Trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.
2. Khi được cung cấp dữ liệu, hãy phân tích cụ thể với con số.
3. Đưa ra gợi ý actionable (hành động cụ thể).
4. Sử dụng emoji phù hợp để dễ đọc.
5. Format kết quả dạng markdown ngắn gọn.
6. Nếu không có đủ dữ liệu, nói rõ và gợi ý cần thêm gì.
7. Bạn có khả năng HỖ TRỢ ĐỔI TRẠNG THÁI MÓN (Còn hàng / Hết hàng) khi người dùng yêu cầu.
   - Nếu người dùng yêu cầu bật/tắt trạng thái món (vd: "Cho món Trà Đào hết hàng"), bạn PHẢI TÌM TÊN MÓN chính xác nhất trong danh sách thực đơn được cung cấp trong [DỮ LIỆU HIỆN TẠI CỦA QUÁN], sau đó gọi function \`update_product_availability\` với tên món đó.
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
            if (context.productList && context.productList.length > 0) {
                contextStr += `\n📋 Danh sách thực đơn hiện tại: ${context.productList.join(', ')}`;
            }
            if (context.avgOrderValue !== undefined) {
                contextStr += `\n💰 Giá trị đơn trung bình: ${Number(context.avgOrderValue).toLocaleString('vi-VN')}đ`;
            }
        }

        const userMessage = contextStr
            ? `[DỮ LIỆU HIỆN TẠI CỦA QUÁN]${contextStr}\n\n[CÂU HỎI CỦA CHỦ QUÁN]\n${message}`
            : message;

        const requestBody = JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: SYSTEM_PROMPT + '\n\n' + userMessage }]
                }
            ],
            tools: [{
                functionDeclarations: [{
                    name: "update_product_availability",
                    description: "Đề xuất cập nhật trạng thái còn hàng/hết hàng của một món ăn. Chỉ dùng khi người dùng yêu cầu rõ ràng. Bạn phải tìm tên món chính xác trong thực đơn.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            productName: {
                                type: "STRING",
                                description: "Tên món ăn cần cập nhật, ghi chính xác như trong thực đơn."
                            },
                            isAvailable: {
                                type: "BOOLEAN",
                                description: "true nếu Còn hàng (bật), false nếu Hết hàng (tắt)."
                            }
                        },
                        required: ["productName", "isAvailable"]
                    }
                }]
            }],
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
        });

        // Call Gemini API with 1 retry for 503 high demand
        let geminiRes;
        let retries = 1;
        while (retries >= 0) {
            geminiRes = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody
            });

            if (geminiRes.ok) break;

            if (geminiRes.status === 503 && retries > 0) {
                retries--;
                await new Promise(r => setTimeout(r, 800)); // wait 800ms before retry
            } else {
                break;
            }
        }

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error('Gemini API error:', geminiRes.status, errText);
            
            let userErrorMsg = 'AI service unavailable';
            if (geminiRes.status === 429) {
                userErrorMsg = 'API Key đã hết hạn mức (Quota Exceeded)';
            } else if (geminiRes.status === 503) {
                userErrorMsg = 'Hệ thống AI của Google đang quá tải';
            } else if (geminiRes.status === 400) {
                userErrorMsg = 'Lỗi cú pháp hoặc API Key không hợp lệ';
            }

            return res.status(502).json({ error: userErrorMsg, detail: errText });
        }

        const data = await geminiRes.json();
        const candidate = data?.candidates?.[0];
        
        let reply = '';
        let action = null;

        if (candidate?.content?.parts) {
            const parts = candidate.content.parts;
            
            // Check for function call
            const functionCallPart = parts.find(p => p.functionCall);
            if (functionCallPart) {
                const call = functionCallPart.functionCall;
                if (call.name === 'update_product_availability') {
                    const args = call.args;
                    action = {
                        type: 'update_product_availability',
                        payload: args
                    };
                    const statusText = args.isAvailable ? 'Còn hàng' : 'Hết hàng';
                    reply = `Tôi đã chuẩn bị lệnh cập nhật món **${args.productName}** thành **${statusText}**. Vui lòng xác nhận bên dưới nhé! 👇`;
                }
            } else {
                // Just text
                reply = parts[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.';
            }
        } else {
             reply = 'Xin lỗi, tôi không thể trả lời lúc này.';
        }

        return res.status(200).json({
            success: true,
            reply: reply.trim(),
            action: action
        });

    } catch (error) {
        console.error('AI Assistant error:', error);
        return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
};
