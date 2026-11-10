const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Sensor = require('./models/Sensor');
const Reading = require('./models/Reading');

dotenv.config();

// Sample sensors with realistic coordinates around Cagayan River (Philippines)
const sampleSensors = [
  {
    name: 'Cagayan River - Tuguegarao',
    type: 'water',
    latitude: 17.6139,
    longitude: 121.7309,
  },
  {
    name: 'Cagayan River - Peñablanca',
    type: 'water',
    latitude: 17.6335,
    longitude: 121.7822,
  },
  {
    name: 'Cagayan River - Isabela',
    type: 'air',
    latitude: 17.2620,
    longitude: 121.7753,
  },
  {
    name: 'Cagayan River - Aparri',
    type: 'air',
    latitude: 18.3581,
    longitude: 121.6420,
  },
];

// Generate random readings for each sensor
const generateReading = (sensorId, type) => {
  const reading = {
    sensorId,
    timestamp: new Date(),
    alerts: [],
  };

  if (type === 'water') {
    reading.ph = (6.5 + Math.random() * 3).toFixed(1); // 6.5–9.5
    reading.turbidity = (Math.random() * 10).toFixed(1); // 0–10 NTU
    reading.oxygen = (4 + Math.random() * 6).toFixed(1); // 4–10 mg/L
    reading.temperature = (22 + Math.random() * 10).toFixed(1); // 22–32 °C

    // add alerts for unrealistic values
    if (reading.ph < 6.5 || reading.ph > 8.5) reading.alerts.push('pH out of safe range');
    if (reading.oxygen < 5) reading.alerts.push('Low dissolved oxygen');
  } else { // air
    reading.co2 = (350 + Math.random() * 800).toFixed(0); // 350–1150 ppm
    reading.no2 = (10 + Math.random() * 40).toFixed(0); // 10–50 ppb

    if (reading.co2 > 1000) reading.alerts.push('High CO₂ level');
    if (reading.no2 > 40) reading.alerts.push('NO₂ elevated');
  }

  return reading;
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Sensor.deleteMany({});
    await Reading.deleteMany({});
    console.log('Cleared old sensors and readings');

    // Insert sensors
    const insertedSensors = await Sensor.insertMany(sampleSensors);
    console.log(`Inserted ${insertedSensors.length} sensors`);

    // Insert readings for each sensor
    const readings = [];
    for (const sensor of insertedSensors) {
      // Create 1–3 readings per sensor
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        const reading = generateReading(sensor._id, sensor.type);
        readings.push(reading);
      }
    }
    await Reading.insertMany(readings);
    console.log(`Inserted ${readings.length} readings`);

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();