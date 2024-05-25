const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
    try {
        // Proyección para seleccionar solo los campos necesarios
        const assetFields = {
            _id: 1,
            name: 1,
            brand: 1,
            model: 1,
            referenceId: 1,
            category: 1,
            location: 1,
            locationPath: 1,
            EPC: 1,
            assigned: 1,
            status: 1,
            serial: 1,
            customFieldsTab: 1,
            creationUserId: 1,
            creationUserFullName: 1,
            creationDate: 1,
            updateDate: 1,
            assignedTo: 1,
            children: 1,
        };
        
        //obtener todos los documentos de la colección "assets"
        const assets = await mongoose.connection.db.collection('assets').find({}, { projection: assetFields }).toArray();
        const total = assets.length;

          // Obtener información del empleado asignado y la ubicación para cada activo
        for (const asset of assets) {
            if (asset.assigned) {
                const employee = await mongoose.connection.db.collection('employees').findOne(
                    { _id: mongoose.Types.ObjectId(asset.assigned) },
                    { projection: { employee_id: 1, name: 1, lastName: 1 } }
                );
                if (employee) {
                    asset.employee_id = employee.employee_id;
                    asset.employee_name = `${employee.name} ${employee.lastName}`;
                }
            }
           // Obtener información del nivel de la ubicación y el nombre 
            if (asset.location) {
                const location = await mongoose.connection.db.collection('locationsReal').findOne(
                    { _id: mongoose.Types.ObjectId(asset.location) },
                    { projection: { name: 1, profileLevel: 1 } }
                );
                if (location) {
                    asset.location_Name = location.name;
                    asset.location_Level = location.profileLevel;
                }
            }

        
            // Procesar solo los campos necesarios del customFieldsTab
            const customFieldsTab = asset.customFieldsTab;
            if (customFieldsTab) {
                for (const tabKey of Object.keys(customFieldsTab)) {
                    const tab = customFieldsTab[tabKey];
                    for (const field of tab.left) {
                        if (field.values.fieldName === 'SOC.') {
                            asset.soc = field.values.initialValue;
                        }
                        if (field.values.fieldName === 'STATUS') {
                            asset.SelectedStatus = field.values.initialValue;
                        }
                    }
                }
                // Eliminar el campo customFieldsTab
                delete asset.customFieldsTab;
            }

          // Realiza una consulta para obtener la última sesión que contenga el activo
            const lastSession = await mongoose.connection.db.collection('inventorySessions').find(
                { "assets._id": asset._id },
                { projection: { status: 1, appUser: 1, creation: 1, "assets._id": 1, "assets.status": 1 } }
            ).sort({ creation: -1 }).limit(1).toArray();

            if (lastSession.length > 0) {
                const lastAsset = lastSession[0].assets.find(item => item._id.toString() === asset._id.toString());
                if (lastAsset) {
                    asset.lastSession = {
                        sessionId: lastSession[0]._id,
                        Status: lastAsset.status,
                        UserAF: lastSession[0].appUser,
                        SessionDate: lastSession[0].creation
                    };
                }
            } else {
                asset.lastSession = {
                    Status: "N/A",
                };
            }
        }

        const response = {
            platform: {
                type: 'api',
                version: 'v1',
                resource: req.baseUrl
            },
            request: {
                status: 'success',
                code: 200,
                method: 'GET',
                total: total
            },
            response: assets
        };

        const formattedResponse = JSON.stringify(response, null, 2);

        res.setHeader('Content-Type', 'application/json');
        res.send(formattedResponse);
    } catch (error) {
        console.error('Error al obtener los documentos de la colección:', error);
        res.status(500).json({ error: 'Ocurrió un error al obtener los documentos de la colección.' });
    }
});

module.exports = router;
