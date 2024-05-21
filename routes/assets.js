const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
    try {
        // Realiza la consulta directamente a la base de datos para obtener todos los documentos de la colección "assets"
        const assets = await mongoose.connection.db.collection('assets').find({}).toArray();
        const total = assets.length; // Calcula el total de documentos

        // Obtener información del empleado asignado y la ubicación para cada activo
        for (const asset of assets) {
            if (asset.assigned) {
                const employee = await mongoose.connection.db.collection('employees').findOne({ _id: mongoose.Types.ObjectId(asset.assigned) });
                if (employee) {
                    // Agregar campos employee_id y employee_name al objeto de activo
                    asset.employee_id = employee.employee_id;
                    asset.employee_name = `${employee.name} ${employee.lastName}`;
                }
            }
            if (asset.location) {
                const location = await mongoose.connection.db.collection('locationsReal').findOne({ _id: mongoose.Types.ObjectId(asset.location) });
                if (location) {
                    // Agregar campos location_Name y location_Level al objeto de activo
                    asset.location_Name = location.name;
                    asset.location_Level = location.profileLevel;
                }
            }

            // Modificar el formato del campo personalizado "SOC."
            const customFieldsTab = asset.customFieldsTab;
            for (const tabKey of Object.keys(customFieldsTab)) {
                const tab = customFieldsTab[tabKey];
                for (const field of tab.left) {
                    if (field.values.fieldName === 'SOC.') {
                        // Asignar el valor de "SOC." como un nuevo campo "soc"
                        asset.soc = field.values.initialValue;
                    }
                  
                    if (field.values.fieldName === 'STATUS') {
                        // Asignar el valor de "STATUS" como un nuevo campo "Asset_Status"
                        asset.Asset_Status = field.values.initialValue;
                    }
                }
            }

             // Eliminar el campo customFieldsTab
             //delete asset.customFieldsTab;

            // Realiza una consulta para obtener la última sesión que contenga el activo
            const lastSession = await mongoose.connection.db.collection('inventorySessions').find({ "assets._id": asset._id }).sort({ creation: -1 }).limit(1).toArray();
            if (lastSession.length > 0) {
                // Encuentra el estado más reciente del activo dentro de la última sesión
                const lastAsset = lastSession[0].assets.find(item => item._id.toString() === asset._id.toString());
                if (lastAsset) {
                    // Agrega el estado más reciente al objeto de activo
                    asset.lastSession = {
                        sessionId: lastSession[0]._id,
                        Status: lastAsset.status,
                        UserAF: lastSession[0].appUser,
                        SessionDate: lastSession[0].creation
                       
                    };
                }
            } else {
                // Si no se encuentra ninguna sesión, asigna valores predeterminados
                asset.lastSession = {
                    Status: "N/A",
                };
            }
        }


        // Estructura la respuesta como se describe
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
            response: assets // Los documentos de la colección, ahora con los campos employee_id, employee_name, location_Name, location_Level y Status agregados
        };

        // Convierte la respuesta a JSON con formato legible
        const formattedResponse = JSON.stringify(response, null, 2);

        res.setHeader('Content-Type', 'application/json');
        res.send(formattedResponse); // Devuelve los datos estructurados como respuesta JSON
    } catch (error) {
        console.error('Error al obtener los documentos de la colección:', error);
        res.status(500).json({ error: 'Ocurrió un error al obtener los documentos de la colección.' });
    }
});

module.exports = router;
