require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const assetsRoute = require('./routes/assets');

const app = express();

// Conexión a la base de datos
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectado a MongoDB...'))
    .catch(err => console.log('No se pudo conectar con MongoDB:', err));

// Middleware para analizar JSON y urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/assets', assetsRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Api SM ejecutándose en el puerto: ${port}`);
});

module.exports = app;
