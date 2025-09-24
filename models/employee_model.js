const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    employee_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    collection: 'employees'
});

employeeSchema.index({ employee_id: 1 });
employeeSchema.index({ name: 1, lastName: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
