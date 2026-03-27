const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ingredientsList = [
    { name: 'Cà phê hạt Phối trộn', unit: 'gram', low_stock_threshold: 1000 },
    { name: 'Cà phê Cold Brew (Ủ sẵn)', unit: 'ml', low_stock_threshold: 2000 },
    { name: 'Trà Đào (Ủ sẵn)', unit: 'ml', low_stock_threshold: 2000 },
    { name: 'Trà Oolong Nướng (Ủ sẵn)', unit: 'ml', low_stock_threshold: 2000 },
    { name: 'Trà Vải (Ủ sẵn)', unit: 'ml', low_stock_threshold: 2000 },
    { name: 'Sữa tươi thanh trùng', unit: 'ml', low_stock_threshold: 2000 },
    { name: 'Sữa đặc', unit: 'ml', low_stock_threshold: 1000 },
    { name: 'Bột Matcha', unit: 'gram', low_stock_threshold: 500 },
    { name: 'Nước cốt dừa', unit: 'ml', low_stock_threshold: 1000 },
    { name: 'Xoài tươi', unit: 'gram', low_stock_threshold: 1000 },
    { name: 'Cam tươi', unit: 'gram', low_stock_threshold: 1000 },
    { name: 'Chanh dây (Nước cốt)', unit: 'ml', low_stock_threshold: 500 },
    { name: 'Syrup Đào', unit: 'ml', low_stock_threshold: 500 },
    { name: 'Syrup Vải', unit: 'ml', low_stock_threshold: 500 },
    { name: 'Đường nước', unit: 'ml', low_stock_threshold: 2000 },
    { name: 'Bánh Croissant Bơ Tỏi', unit: 'cái', low_stock_threshold: 5 },
    { name: 'Bánh Tiramisu', unit: 'cái', low_stock_threshold: 5 },
    { name: 'Ly bao bì (Kèm nắp, ống hút)', unit: 'bộ', low_stock_threshold: 100 }
];

async function seedInventory() {
    console.log("1. Cài đặt các Nguyên liệu kho...");
    
    // Check if ingredients already exist
    const { data: existingIngs } = await supabase.from('ingredients').select('id, name');
    
    let ingMap = {};
    for (let ing of existingIngs) {
        ingMap[ing.name] = ing.id;
    }
    
    // Insert missing ingredients
    for (let ing of ingredientsList) {
        if (!ingMap[ing.name]) {
            console.log(`Đang thêm: ${ing.name}`);
            const { data, error } = await supabase.from('ingredients').insert([{
                name: ing.name,
                unit: ing.unit,
                stock: 5000, // Khởi tạo kho mặc định
                low_stock_threshold: ing.low_stock_threshold
            }]).select();
            if (error) console.error("Lỗi thêm", ing.name, error);
            if (data && data.length > 0) ingMap[ing.name] = data[0].id;
        }
    }
    console.log("Hoàn thành thêm nguyên liệu!");

    console.log("2. Cập nhật Recipe cho Sản phẩm...");
    // Fetch products
    const { data: products } = await supabase.from('products').select('id, name');
    
    // Mapping product names to recipes
    const recipesDef = {
        'Espresso': [
            { ingredientName: 'Cà phê hạt Phối trộn', quantity: 18 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Bạc Xỉu': [
            { ingredientName: 'Cà phê hạt Phối trộn', quantity: 15 },
            { ingredientName: 'Sữa đặc', quantity: 40 },
            { ingredientName: 'Sữa tươi thanh trùng', quantity: 60 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Cold Brew Cam Vàng': [
            { ingredientName: 'Cà phê Cold Brew (Ủ sẵn)', quantity: 120 },
            { ingredientName: 'Cam tươi', quantity: 40 },
            { ingredientName: 'Đường nước', quantity: 20 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Trà Đào Cam Sả': [
            { ingredientName: 'Trà Đào (Ủ sẵn)', quantity: 120 },
            { ingredientName: 'Syrup Đào', quantity: 20 },
            { ingredientName: 'Đường nước', quantity: 20 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Trà Vải Nhiệt Đới': [
            { ingredientName: 'Trà Vải (Ủ sẵn)', quantity: 120 },
            { ingredientName: 'Syrup Vải', quantity: 20 },
            { ingredientName: 'Đường nước', quantity: 20 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Trà Sữa Oolong Nướng': [
            { ingredientName: 'Trà Oolong Nướng (Ủ sẵn)', quantity: 120 },
            { ingredientName: 'Sữa đặc', quantity: 40 },
            { ingredientName: 'Sữa tươi thanh trùng', quantity: 20 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Matcha Đá Xay': [
            { ingredientName: 'Bột Matcha', quantity: 10 },
            { ingredientName: 'Sữa đặc', quantity: 40 },
            { ingredientName: 'Sữa tươi thanh trùng', quantity: 60 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Cà phê Dừa Đá Xay': [
            { ingredientName: 'Cà phê hạt Phối trộn', quantity: 15 },
            { ingredientName: 'Nước cốt dừa', quantity: 40 },
            { ingredientName: 'Sữa đặc', quantity: 30 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Sinh Tố Xoài Chanh Dây': [
            { ingredientName: 'Xoài tươi', quantity: 80 },
            { ingredientName: 'Chanh dây (Nước cốt)', quantity: 20 },
            { ingredientName: 'Sữa tươi thanh trùng', quantity: 30 },
            { ingredientName: 'Sữa đặc', quantity: 30 },
            { ingredientName: 'Ly bao bì (Kèm nắp, ống hút)', quantity: 1 }
        ],
        'Bánh Croissant Bơ Tỏi': [
            { ingredientName: 'Bánh Croissant Bơ Tỏi', quantity: 1 }
        ],
        'Bánh Tiramisu': [
            { ingredientName: 'Bánh Tiramisu', quantity: 1 }
        ]
    };

    for (let prod of products) {
        const recipeDef = recipesDef[prod.name];
        if (recipeDef) {
            let actualRecipe = recipeDef.map(r => {
                if(!ingMap[r.ingredientName]) {
                    console.error("Missing ingredient UUID for " + r.ingredientName);
                }
                return {
                    ingredientId: ingMap[r.ingredientName],
                    quantity: r.quantity
                }
            });
            
            const { error } = await supabase.from('products').update({ recipe: actualRecipe }).eq('id', prod.id);
            if (error) console.error("Lỗi cập nhật sản phẩm:", prod.name, error);
            else console.log(`Đã cập nhật công thức cho: ${prod.name}`);
        }
    }
    
    console.log("XONG PHẦN SEED!");
}

seedInventory().catch(console.error);
