const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
    try {
        // Realiza la consulta directamente a la base de datos para obtener todos los documentos de la colección "assets"
        const assets = await mongoose.connection.db.collection('assets').find({}).toArray();
        const total = assets.length; // Calcula el total de documentos

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
            response: assets // Los documentos de la colección
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

