require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');
const assetsRoute = require('./routes/assets');

const app = express();

mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0
})
    .then(() => console.log('Conectado a MongoDB...'))
    .catch(err => console.log('No se pudo conectar con MongoDB:', err));

// Middleware de compresión para reducir el tamaño de las respuestas
app.use(compression());

// Middleware para analizar JSON y urlencoded con límites optimizados
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Headers de caché para optimizar rendimiento
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos de caché
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// Rutas
app.use('/api/assets', assetsRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Api SM ejecutándose en el puerto: ${port}`);
});

module.exports = app;
