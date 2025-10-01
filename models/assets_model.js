const mongoose = require('mongoose');

const assetsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    referenceId: { type: String },
    category: {
        value: { type: String },
        label: { type: String }
    },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    locationPath: { type: String },
    EPC: { type: String },
    assigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, default: 'active' },
    serial: { type: String },
    customFieldsTab: { type: mongoose.Schema.Types.Mixed },
    creationUserId: { type: String },
    creationUserFullName: { type: String },
    creationDate: { type: String },
    updateDate: { type: String },
    assignedTo: { type: String },
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assets' }]
}, {
    timestamps: true,
    collection: 'assets'
});

// Índice compuesto para filtros más comunes
assetsSchema.index({ status: 1, assigned: 1 });
assetsSchema.index({ EPC: 1 }, { unique: true, sparse: true });
assetsSchema.index({ serial: 1 });
assetsSchema.index({ locationPath: 1 });
assetsSchema.index({ assigned: 1 });
assetsSchema.index({ status: 1 });
assetsSchema.index({ location: 1 });
assetsSchema.index({ _id: 1, status: 1 });
assetsSchema.index({ name: 'text', brand: 'text', model: 'text' });
assetsSchema.index({ creationDate: 1 });
assetsSchema.index({ updateDate: 1 });
assetsSchema.index({ status: 1, location: 1, assigned: 1 });
assetsSchema.index({ assignedTo: 1 });
assetsSchema.index({ status: 1, locationPath: 1 });
assetsSchema.index({ status: 1, assignedTo: 1 });
assetsSchema.index({ 'lastSession.Status': 1 });

module.exports = mongoose.model('Assets', assetsSchema);