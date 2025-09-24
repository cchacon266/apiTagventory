const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    profileLevel: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'locationsReal'
});

locationSchema.index({ name: 1 });
locationSchema.index({ profileLevel: 1 });

module.exports = mongoose.model('Location', locationSchema);
