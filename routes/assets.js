const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment');

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
            //customFieldsTab: 1,
            creationUserId: 1,
            creationUserFullName: 1,
            creationDate: 1,
            updateDate: 1,
            assignedTo: 1,
            children: 1,
        };

        // Obtener todos los documentos de la colección "assets"
        const assets = await mongoose.connection.db.collection('assets').find({}, { projection: assetFields }).toArray();
        const total = assets.length;

        // Optimización de las consultas para obtener información del empleado y la ubicación
        const employeeIds = [...new Set(assets.filter(asset => asset.assigned).map(asset => mongoose.Types.ObjectId(asset.assigned)))];
        const locationIds = [...new Set(assets.filter(asset => asset.location).map(asset => mongoose.Types.ObjectId(asset.location)))];

        const employees = await mongoose.connection.db.collection('employees').find(
            { _id: { $in: employeeIds } },
            { projection: { employee_id: 1, name: 1, lastName: 1 } }
        ).toArray();

        const employeeMap = {};
        employees.forEach(employee => {
            employeeMap[employee._id] = employee;
        });

        const locations = await mongoose.connection.db.collection('locationsReal').find(
            { _id: { $in: locationIds } },
            { projection: { name: 1, profileLevel: 1 } }
        ).toArray();

        const locationMap = {};
        locations.forEach(location => {
            locationMap[location._id] = location;
        });

        // Obtener todas las sesiones de inventario y crear un mapa de sesiones ordenadas por creación descendente
        const sessions = await mongoose.connection.db.collection('inventorySessions').find(
            {},
            { projection: { status: 1, appUser: 1, creation: 1, assets: 1, sessionId: 1 } }
        ).toArray();

        // Convertir las fechas a objetos de Date y ordenar las sesiones
        sessions.forEach(session => {
            session.creationDate = moment(session.creation, 'DD/MM/YYYY HH:mm:ss').toDate();
            if (isNaN(session.creationDate)) {
                console.error('Fecha inválida en la sesión:', session);
            }
        });

        sessions.sort((a, b) => b.creationDate - a.creationDate);

        for (const asset of assets) {
            if (asset.assigned) {
                const employee = employeeMap[asset.assigned];
                if (employee) {
                    asset.employee_id = employee.employee_id;
                    asset.employee_name = `${employee.name} ${employee.lastName}`;
                }
            }

            if (asset.location) {
                const location = locationMap[asset.location];
                if (location) {
                    asset.location_Name = location.name;
                    asset.location_Level = location.profileLevel;
                }
            }

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
                delete asset.customFieldsTab;
            }

            // Buscar la última sesión que contenga el activo
            const lastSession = sessions.find(session =>
                session.assets.some(item => item._id.toString() === asset._id.toString())
            );

            if (lastSession) {
                const lastAsset = lastSession.assets.find(item => item._id.toString() === asset._id.toString());
                if (lastAsset) {
                    asset.lastSession = {
                        sessionId: lastSession.sessionId,
                        Status: lastAsset.status,
                        UserAF: lastSession.appUser,
                        SessionDate: lastSession.creation
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
