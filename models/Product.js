const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400'
    },
    isAvailable: {
        type: Boolean,
        required: true,
        default: true
    },
    isBestSeller: {
        type: Boolean,
        default: false
    },
    recipe: [{
        ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
        quantity: Number
    }],
    options: [{
        name: String, // e.g. "Size", "Topping"
        choices: [{
            name: String, // e.g. "M", "L", "Trân châu"
            priceExtra: { type: Number, default: 0 }
        }]
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
