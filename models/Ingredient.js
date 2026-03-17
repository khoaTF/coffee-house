const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    unit: {
        type: String,
        required: true,
        default: 'g' // g, ml, pcs
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    lowStockThreshold: {
        type: Number,
        required: false,
        default: 50 // Default threshold to 50
    }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);
