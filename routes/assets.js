const express = require('express');
const router = express.Router();
const AssetsService = require('../services/assetsService');

router.get('/', async (req, res) => {
        const startTime = Date.now();
    
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
            limit: req.query.limit,
            session_data: req.query.session_data
        };

        // Eliminar límite por defecto - permitir consultas sin límite
        const hasFilters = Object.values(filters).some(value => value !== undefined && value !== null && value !== '');
        // Ya no aplicamos límite por defecto - el cliente puede especificar si lo necesita
        
        const result = await AssetsService.getAllAssetsWithDetails(filters, pagination);

        // Configurar headers para streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');

        // Iniciar streaming - enviar headers primero
        const headerResponse = {
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
            response: []
        };

        // Enviar inicio del JSON
        res.write(JSON.stringify(headerResponse).slice(0, -3)); // Quitar el "[]" final
        res.write('[');

        // Streaming optimizado con chunks de 50 activos
        if (result.assets && result.assets.length > 0) {
            const CHUNK_SIZE = 50; // Procesar 50 activos por vez
            let firstChunk = true;
            
            for (let i = 0; i < result.assets.length; i += CHUNK_SIZE) {
                const chunk = result.assets.slice(i, i + CHUNK_SIZE);
                
                // Agregar coma si no es el primer chunk
                if (!firstChunk) {
                    res.write(',');
                }
                
                // Convertir chunk a JSON y enviarlo
                const chunkJson = chunk.map(asset => JSON.stringify(asset)).join(',');
                res.write(chunkJson);
                
                firstChunk = false;
            }
        }

        // Cerrar JSON
        res.write(']}');
        res.end();
        
        // Log de performance
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
    } catch (error) {
        res.status(500).json({
            error: 'Ocurrió un error al obtener los assets.',
            details: error.message
        });
    }
});

module.exports = router;
