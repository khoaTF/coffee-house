require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Must supply SERVICE_ROLE_KEY to bypass RLS for updates
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const drinkOptions = [
    {
        name: "Size",
        choices: [
            { name: "Size M", extraPrice: 0 },
            { name: "Size L", extraPrice: 5000 }
        ]
    },
    {
        name: "Mức Đá",
        choices: [
            { name: "Đá bình thường", extraPrice: 0 },
            { name: "Ít đá", extraPrice: 0 },
            { name: "Không đá", extraPrice: 0 }
        ]
    },
    {
        name: "Mức Đường",
        choices: [
            { name: "Đường bình thường", extraPrice: 0 },
            { name: "Ít đường", extraPrice: 0 },
            { name: "Không đường", extraPrice: 0 }
        ]
    }
];

const bobaOptions = [
    ...drinkOptions,
    {
        name: "Topping",
        choices: [
            { name: "Không Topping", extraPrice: 0 },
            { name: "Trân châu đen", extraPrice: 5000 },
            { name: "Trân châu trắng", extraPrice: 5000 },
            { name: "Thạch trái cây", extraPrice: 5000 },
            { name: "Kem Cheese", extraPrice: 10000 }
        ]
    }
];

async function run() {
    try {
        console.log("Fetching products...");
        const { data: products, error } = await supabase.from('products').select('*');
        if (error) throw error;
        
        let updatedCount = 0;
        
        for (const p of products) {
            let optionsToSet = [];
            
            // Assign options based on categories/names
            if (p.category === 'Coffee') {
                optionsToSet = drinkOptions;
            } else if (p.category === 'Tea') {
                if(p.name.toLowerCase().includes('trà sữa')) {
                    optionsToSet = bobaOptions;
                } else {
                    optionsToSet = drinkOptions;
                }
            } else if (p.category === 'Smoothie') {
                optionsToSet = drinkOptions;
            } else if (p.category === 'Food' && p.name.toLowerCase().includes('bánh mì')) {
                optionsToSet = [
                    {
                        name: "Thêm Chả/Trứng",
                        choices: [
                            { name: "Không thêm", extraPrice: 0 },
                            { name: "Thêm trứng ốp la", extraPrice: 5000 },
                            { name: "Thêm chả", extraPrice: 10000 },
                            { name: "Thêm pate", extraPrice: 5000 }
                        ]
                    }
                ];
            } else if (p.category === 'Food' && p.name.toLowerCase().includes('mì')) {
                optionsToSet = [
                    {
                        name: "Thêm Topping Mì",
                        choices: [
                            { name: "Không thêm", extraPrice: 0 },
                            { name: "Thêm xúc xích", extraPrice: 10000 },
                            { name: "Thêm trứng", extraPrice: 5000 },
                            { name: "Thêm phô mai", extraPrice: 10000 }
                        ]
                    }
                ];
            }
            
            // Only update if it doesn't already have options, or if we want to overwrite
            // Looking at the prompt, let's just forcefully apply these default options to be safe
            // unless they already have some custom ones
            if (optionsToSet.length > 0 && (!p.options || p.options.length === 0)) {
                console.log(`Setting options for ${p.name}...`);
                const { error: updateErr } = await supabase
                    .from('products')
                    .update({ options: optionsToSet })
                    .eq('id', p.id);
                
                if (updateErr) {
                    console.error("Failed to update " + p.name, updateErr);
                } else {
                    updatedCount++;
                }
            } else {
                console.log(`Skipping ${p.name} (Category: ${p.category}, Options Length: ${p.options?.length})`);
            }
        }
        
        console.log(`Finished updating ${updatedCount} products with standard options.`);
    } catch(err) {
        console.error("Fatal Error:", err);
    }
}

run();
