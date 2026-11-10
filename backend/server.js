const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/auth', require('./routes/auth'));

app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ADD THIS BLOCK INSTEAD
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
  })
  .catch(err => console.log(err));