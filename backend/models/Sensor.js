const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['water', 'air'], required: true },
  hardwareId: { type: String, required: true, unique: true }, // MUST BE HERE
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Sensor', SensorSchema);