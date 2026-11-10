const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['water', 'air'], required: true },
  hardwareId: { type: String, required: true, unique: true }, // <-- NEW: MAC Address
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Sensor', SensorSchema);