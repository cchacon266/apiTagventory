const express = require('express');
const router = express.Router();
const AssetsService = require('../services/assetsService');

router.get('/', async (req, res) => {
    try {
        // parámetros para filtrar
        const filters = {
            location: req.query.location,
            employee: req.query.employee,
            EPC: req.query.EPC,
            serial: req.query.serial,
            status: req.query.status,
            session: req.query.session
        };

        // parámetros de paginación
        const pagination = {
            page: req.query.page,
            limit: req.query.limit
        };

        // Aplicar límite por defecto cuando no hay filtros
        const hasFilters = Object.values(filters).some(value => value !== undefined && value !== null && value !== '');
        if (!hasFilters && !pagination.limit) {
            pagination.limit = 50;
        }

        const result = await AssetsService.getAllAssetsWithDetails(filters, pagination);

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
                total: result.total,
                filters: filters,
                pagination: result.pagination
            },
            response: result.assets
        };

        // Configurar headers para streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.json(response);

    } catch (error) {
        res.status(500).json({
            error: 'Ocurrió un error al obtener los assets.',
            details: error.message
        });
    }
});

router.post('/clear-cache', (req, res) => {
    try {
        AssetsService.clearCache();

        res.json({
            message: 'Método de caché ejecutado (caché deshabilitado)',
            timestamp: new Date().toISOString(),
            status: 'Caché deshabilitado - método mantenido para compatibilidad'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al ejecutar método de caché',
            details: error.message
        });
    }
});

module.exports = router;
