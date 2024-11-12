 // routes/Jugadas.js

const express = require('express');
const router = express.Router();
const Jugada = require('../models/Jugada');

// Ruta para crear nuevas jugadas
router.post('/', async (req, res) => {
  try {
    const nuevasJugadas = req.body; // Esperamos un array de jugadas
    const jugadasGuardadas = await Jugada.insertMany(nuevasJugadas);
    res.status(201).json(jugadasGuardadas);
  } catch (error) {
    console.error('Error al crear las jugadas:', error);
    res.status(400).json({ message: error.message });
  }
});

// Ruta para obtener todas las jugadas
router.get('/', async (req, res) => {
  try {
    const jugadas = await Jugada.find();
    res.json(jugadas);
  } catch (error) {
    console.error('Error al obtener las jugadas:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
