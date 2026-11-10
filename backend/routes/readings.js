const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');
const Sensor = require('../models/Sensor'); // Import Sensor model

router.post('/ingest', async (req, res) => {
  const { hardwareId, tds, ec, turbidity, ph, temperature, co2, no2, alerts } = req.body;

  try {
    // 1. Find the sensor registered with this hardware MAC address
    const sensor = await Sensor.findOne({ hardwareId: hardwareId });

    if (!sensor) {
      return res.status(404).json({ error: 'Hardware ID not registered in system' });
    }

    // 2. Create the new reading
    const newReading = new Reading({
      sensorId: sensor._id, // Use the actual MongoDB sensor ID
      ph: ph,
      turbidity: turbidity,
      temperature: temperature,
      // Note: Your Arduino code doesn't send Oxygen yet, but you can add it later
      co2: co2, 
      no2: no2,
      alerts: alerts || [],
      timestamp: new Date()
    });

    await newReading.save();
    res.status(201).json({ success: true, message: 'Data saved successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving reading' });
  }
});

// ... (Keep your existing /latest and /sensor/:sensorId routes)

// Get latest reading for each sensor (for map popups)
router.get('/latest', async (req, res) => {
  try {
    // Aggregation to get latest reading per sensor
    const latest = await Reading.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$sensorId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } }
    ]);
    res.json(latest);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// Get readings for a specific sensor (for history/charts) – optional
router.get('/sensor/:sensorId', async (req, res) => {
  try {
    const readings = await Reading.find({ sensorId: req.params.sensorId })
                                  .sort({ timestamp: -1 }).limit(50);
    res.json(readings);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// Add a new reading (could be called by IoT device or admin)
router.post('/', async (req, res) => {
  const { sensorId, ph, turbidity, oxygen, temperature, co2, no2, alerts } = req.body;
  try {
    const reading = new Reading({ sensorId, ph, turbidity, oxygen, temperature, co2, no2, alerts });
    await reading.save();
    res.status(201).json(reading);
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

module.exports = router;