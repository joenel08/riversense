const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  sensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor', required: true },
  // water parameters
  ph: Number,
  turbidity: Number,
  oxygen: Number,
  temperature: Number,
  // air parameters
  co2: Number,
  no2: Number,
  // alert flags
  alerts: [String], // e.g., ["pH too high", "CO2 elevated"]
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reading', ReadingSchema);