const express = require('express');
const router = express.Router();
const AssetsService = require('../services/assetsService');

router.get('/', async (req, res) => {
    try {
        // Proyección para seleccionar solo los campos necesarios// Proyección para seleccionar solo los campos necesarios
        const result = await AssetsService.getAllAssetsWithDetails();

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
                total: result.total
            },
            response: result.assets
        };

        // Configurar headers para streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.json(response);

    } catch (error) {
        console.error('Error al obtener los assets:', error);
        res.status(500).json({ 
            error: 'Ocurrió un error al obtener los assets.',
            details: error.message 
        });
    }
});

// Endpoint para limpiar caché (útil para desarrollo)
router.post('/clear-cache', (req, res) => {
    try {
        AssetsService.clearCache();
        res.json({ 
            message: 'Caché limpiado exitosamente',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al limpiar caché',
            details: error.message 
        });
    }
});

module.exports = router;
