const mongoose = require('mongoose');

const inventorySessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        required: true
    },
    appUser: {
        type: String,
        required: true
    },
    creation: {
        type: String,
        required: true
    },
    assets: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assets'
        },
        status: {
            type: String
        }
    }]
}, {
    timestamps: true,
    collection: 'inventorySessions'
});

inventorySessionSchema.index({ sessionId: 1 });
inventorySessionSchema.index({ status: 1 });
inventorySessionSchema.index({ appUser: 1 });
inventorySessionSchema.index({ creation: -1 });
inventorySessionSchema.index({ 'assets._id': 1 });

module.exports = mongoose.model('InventorySession', inventorySessionSchema);
