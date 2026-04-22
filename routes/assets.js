const express = require('express');
const router = express.Router();
const AssetsService = require('../services/assetsService');

/**
 * Envía la respuesta en streaming (chunked JSON) para evitar timeouts
 * con conjuntos grandes de datos.
 */
async function streamAssetsResponse(res, filters, pagination, method) {
    const result = await AssetsService.getAllAssetsWithDetails(filters, pagination);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    const headerResponse = {
        platform: { type: 'api', version: 'v1', resource: '/api/assets' },
        request: {
            status: 'success',
            code: 200,
            method,
            total: result.total,
            filters,
            pagination: result.pagination
        },
        response: []
    };

    res.write(JSON.stringify(headerResponse).slice(0, -3));
    res.write('[');

    if (result.assets && result.assets.length > 0) {
        const CHUNK_SIZE = 50;
        let firstChunk = true;
        for (let i = 0; i < result.assets.length; i += CHUNK_SIZE) {
            const chunk = result.assets.slice(i, i + CHUNK_SIZE);
            if (!firstChunk) res.write(',');
            res.write(chunk.map(asset => JSON.stringify(asset)).join(','));
            firstChunk = false;
        }
    }

    res.write(']}');
    res.end();
}

/**
 * GET /api/assets
 * Consulta con filtros simples por query string.
 * Cada parámetro acepta un valor único.
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            location: req.query.location,
            employee: req.query.employee,
            EPC: req.query.EPC,
            serial: req.query.serial,
            status: req.query.status,
            session: req.query.session
        };
        const pagination = {
            page: req.query.page,
            limit: req.query.limit,
            session_data: req.query.session_data
        };
        await streamAssetsResponse(res, filters, pagination, 'GET');
    } catch (error) {
        res.status(500).json({
            error: 'Ocurrió un error al obtener los assets.',
            details: error.message
        });
    }
});

/**
 * POST /api/assets/query
 * Consulta avanzada con soporte para múltiples valores por filtro.
 * Ideal para integraciones SAP u otras que envíen un JSON body.
 *
 * Body de ejemplo:
 * {
 *   "location": ["1107", "1108"],
 *   "employee": ["E0001", "E0002"],
 *   "EPC": ["EPC0001", "EPC0002"],
 *   "serial": [],
 *   "status": "active",
 *   "session": "missing",
 *   "page": 1,
 *   "limit": 1000,
 *   "session_data": false
 * }
 *
 * Reglas de combinación:
 *  - Dentro de cada campo → OR  (location 1107 OR 1108)
 *  - Entre campos distintos → AND (location AND employee AND EPC)
 */
router.post('/query', async (req, res) => {
    try {
        const body = req.body || {};

        // Normalizar: si viene como string lo dejamos; si viene como array lo pasamos directo
        const normalize = val => {
            if (!val || (Array.isArray(val) && val.length === 0)) return undefined;
            return val;
        };

        const filters = {
            location: normalize(body.location),
            employee: normalize(body.employee),
            EPC: normalize(body.EPC),
            serial: normalize(body.serial),
            status: normalize(body.status),
            session: normalize(body.session)
        };

        const pagination = {
            page: body.page,
            limit: body.limit,
            session_data: body.session_data !== undefined ? String(body.session_data) : undefined
        };

        await streamAssetsResponse(res, filters, pagination, 'POST');
    } catch (error) {
        res.status(500).json({
            error: 'Ocurrió un error al obtener los assets.',
            details: error.message
        });
    }
});

module.exports = router;
