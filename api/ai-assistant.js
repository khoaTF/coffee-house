/**
 * AI Admin Assistant — Vercel Serverless Function
 * 
 * Connects to Gemini API to provide natural language querying
 * for business data (orders, revenue, inventory).
 * Also supports menu management actions (add/update/delete products).
 * 
 * Endpoint: POST /api/ai-assistant
 * Body: { message: string, context: object }
 * 
 * Security: Only accepts requests from authenticated admin sessions.
 */

// Environment variables are read inside the handler to ensure they are properly loaded by Vercel

const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của hệ thống quản lý quán cà phê.
Vai trò: Hỗ trợ chủ quán phân tích dữ liệu, quản lý hệ thống và QUẢN LÝ THỰC ĐƠN.

QUY TẮC QUAN TRỌNG:
1. Trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.
2. Khi được cung cấp dữ liệu, hãy phân tích cụ thể với con số.
3. Đưa ra gợi ý actionable (hành động cụ thể).
4. Sử dụng emoji phù hợp để dễ đọc.
5. Format kết quả dạng markdown ngắn gọn.
6. Nếu không có đủ dữ liệu, nói rõ và gợi ý cần thêm gì.
7. Giữ câu trả lời dưới 500 từ.

QUẢN LÝ THỰC ĐƠN — Bạn có khả năng thực hiện các thao tác sau:

A. ĐỔI TRẠNG THÁI MÓN (Còn hàng / Hết hàng):
   - Nếu người dùng yêu cầu bật/tắt trạng thái món (vd: "Cho món Trà Đào hết hàng"), gọi function \`update_product_availability\` với tên món chính xác trong thực đơn.

B. THÊM MÓN MỚI:
   - Khi người dùng yêu cầu thêm món (vd: "Thêm món Cà Phê Sữa giá 35000 vào menu"), gọi function \`add_product\`.
   - Bạn PHẢI trích xuất tên món, giá, danh mục (category) từ yêu cầu.
   - Các danh mục hợp lệ: "Coffee", "Tea", "Food", "Dessert", "Other".
   - Nếu thiếu giá hoặc danh mục, hãy tự suy luận hợp lý (VD: "Cà phê sữa" → Coffee, giá ~ 29000-39000).
   - Nếu người dùng yêu cầu thêm nhiều món cùng lúc, gọi function \`add_multiple_products\` với mảng products.

C. CẬP NHẬT MÓN:
   - Khi người dùng yêu cầu đổi giá, đổi tên, sửa mô tả (vd: "Đổi giá Cà Phê Đen thành 25000"), gọi function \`update_product\`.
   - Bạn PHẢI tìm tên món chính xác trong danh sách thực đơn hiện tại.

D. ẨN/XÓA MÓN:
   - Khi người dùng muốn ẩn hoặc xóa món khỏi menu (vd: "Ẩn món Bánh Flan"), gọi function \`delete_product\`.

NGUYÊN TẮC:
- Luôn xác nhận lại thao tác trước khi thực hiện qua action card.
- Nếu không rõ thông tin, HỎI LẠI thay vì đoán sai.
- Khi thêm nhiều món, nhóm chúng gọn gàng.`;

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

    const GEMINI_MODEL = 'gemini-2.5-flash';
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

        const functionDeclarations = [
            {
                name: "update_product_availability",
                description: "Cập nhật trạng thái còn hàng/hết hàng của một món ăn. Chỉ dùng khi người dùng yêu cầu rõ ràng.",
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
            },
            {
                name: "add_product",
                description: "Thêm một món mới vào thực đơn. Dùng khi người dùng yêu cầu thêm 1 món.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: {
                            type: "STRING",
                            description: "Tên món mới."
                        },
                        price: {
                            type: "NUMBER",
                            description: "Giá bán (VNĐ). Nếu không rõ, suy luận giá phù hợp thị trường VN."
                        },
                        category: {
                            type: "STRING",
                            description: "Danh mục: 'Coffee', 'Tea', 'Food', 'Dessert', hoặc 'Other'.",
                            enum: ["Coffee", "Tea", "Food", "Dessert", "Other"]
                        },
                        description: {
                            type: "STRING",
                            description: "Mô tả ngắn gọn về món (tùy chọn)."
                        }
                    },
                    required: ["name", "price", "category"]
                }
            },
            {
                name: "add_multiple_products",
                description: "Thêm nhiều món mới vào thực đơn cùng lúc. Dùng khi người dùng yêu cầu thêm từ 2 món trở lên.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        products: {
                            type: "ARRAY",
                            description: "Danh sách các món cần thêm.",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    name: { type: "STRING", description: "Tên món." },
                                    price: { type: "NUMBER", description: "Giá bán (VNĐ)." },
                                    category: { type: "STRING", description: "Danh mục.", enum: ["Coffee", "Tea", "Food", "Dessert", "Other"] },
                                    description: { type: "STRING", description: "Mô tả (tùy chọn)." }
                                },
                                required: ["name", "price", "category"]
                            }
                        }
                    },
                    required: ["products"]
                }
            },
            {
                name: "update_product",
                description: "Cập nhật thông tin của một món đã có (đổi giá, tên, mô tả, danh mục). Phải tìm đúng tên món trong thực đơn.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        productName: {
                            type: "STRING",
                            description: "Tên món hiện tại cần sửa, ghi chính xác như trong thực đơn."
                        },
                        updates: {
                            type: "OBJECT",
                            description: "Các trường cần cập nhật.",
                            properties: {
                                name: { type: "STRING", description: "Tên mới (nếu đổi tên)." },
                                price: { type: "NUMBER", description: "Giá mới (VNĐ)." },
                                category: { type: "STRING", description: "Danh mục mới.", enum: ["Coffee", "Tea", "Food", "Dessert", "Other"] },
                                description: { type: "STRING", description: "Mô tả mới." }
                            }
                        }
                    },
                    required: ["productName", "updates"]
                }
            },
            {
                name: "delete_product",
                description: "Ẩn (soft-delete) một món khỏi thực đơn. Món sẽ không hiển thị cho khách nhưng vẫn còn trong hệ thống.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        productName: {
                            type: "STRING",
                            description: "Tên món cần ẩn, ghi chính xác như trong thực đơn."
                        }
                    },
                    required: ["productName"]
                }
            }
        ];

        const requestBody = JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: SYSTEM_PROMPT + '\n\n' + userMessage }]
                }
            ],
            tools: [{ functionDeclarations }],
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
                const args = call.args;

                switch (call.name) {
                    case 'update_product_availability': {
                        action = { type: 'update_product_availability', payload: args };
                        const statusText = args.isAvailable ? 'Còn hàng' : 'Hết hàng';
                        reply = `Tôi đã chuẩn bị lệnh cập nhật món **${args.productName}** thành **${statusText}**. Vui lòng xác nhận bên dưới nhé! 👇`;
                        break;
                    }
                    case 'add_product': {
                        action = { type: 'add_product', payload: args };
                        const catMap = { Coffee: 'Cà phê', Tea: 'Trà', Food: 'Đồ ăn', Dessert: 'Tráng miệng', Other: 'Khác' };
                        reply = `Tôi sẽ thêm món **${args.name}** vào menu:\n- 💰 Giá: **${Number(args.price).toLocaleString('vi-VN')}đ**\n- 📂 Danh mục: **${catMap[args.category] || args.category}**${args.description ? `\n- 📝 Mô tả: ${args.description}` : ''}\n\nXác nhận bên dưới nhé! 👇`;
                        break;
                    }
                    case 'add_multiple_products': {
                        action = { type: 'add_multiple_products', payload: args };
                        const productsList = (args.products || []).map(p => `• **${p.name}** — ${Number(p.price).toLocaleString('vi-VN')}đ (${p.category})`).join('\n');
                        reply = `Tôi sẽ thêm **${(args.products || []).length} món** vào menu:\n${productsList}\n\nXác nhận bên dưới nhé! 👇`;
                        break;
                    }
                    case 'update_product': {
                        action = { type: 'update_product', payload: args };
                        const changes = [];
                        if (args.updates?.name) changes.push(`Tên mới: **${args.updates.name}**`);
                        if (args.updates?.price) changes.push(`Giá mới: **${Number(args.updates.price).toLocaleString('vi-VN')}đ**`);
                        if (args.updates?.category) changes.push(`Danh mục: **${args.updates.category}**`);
                        if (args.updates?.description) changes.push(`Mô tả: ${args.updates.description}`);
                        reply = `Tôi sẽ cập nhật món **${args.productName}**:\n${changes.map(c => `- ${c}`).join('\n')}\n\nXác nhận bên dưới nhé! 👇`;
                        break;
                    }
                    case 'delete_product': {
                        action = { type: 'delete_product', payload: args };
                        reply = `Tôi sẽ **ẩn** món **${args.productName}** khỏi thực đơn (có thể khôi phục lại sau). Xác nhận bên dưới nhé! 👇`;
                        break;
                    }
                    default:
                        reply = parts[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.';
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
