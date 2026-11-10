// backend/routes/sensors.js
const express = require('express');
const router = express.Router();
const Sensor = require('../models/Sensor');

// GET all sensors
router.get('/', async (req, res) => {
  try {
    const sensors = await Sensor.find();
    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET a single sensor by ID
router.get('/:id', async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) return res.status(404).json({ message: 'Sensor not found' });
    res.json(sensor);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching sensor' });
  }
});

// POST (Add) a new sensor
router.post('/', async (req, res) => {
  try {
    const { name, type, latitude, longitude } = req.body;
    const newSensor = new Sensor({ name, type, latitude, longitude });
    const savedSensor = await newSensor.save();
    res.status(201).json(savedSensor);
  } catch (err) {
    res.status(400).json({ error: 'Error creating sensor' });
  }
});

// PUT (Update) an existing sensor
router.put('/:id', async (req, res) => {
  try {
    const updatedSensor = await Sensor.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Returns the updated document
    );
    if (!updatedSensor) return res.status(404).json({ message: 'Sensor not found' });
    res.json(updatedSensor);
  } catch (err) {
    res.status(400).json({ error: 'Error updating sensor' });
  }
});

// DELETE a sensor
router.delete('/:id', async (req, res) => {
  try {
    const deletedSensor = await Sensor.findByIdAndDelete(req.params.id);
    if (!deletedSensor) return res.status(404).json({ message: 'Sensor not found' });
    res.json({ message: 'Sensor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting sensor' });
  }
});

module.exports = router;