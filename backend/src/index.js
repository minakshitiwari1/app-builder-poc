require('dotenv').config();

const express = require('express');
const cors = require('cors');

const buildRoutes = require('./routes/buildRoutes');
const connectDatabase = require('./config/database');

const app = express();

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'App Builder POC Backend is running',
  });
});

app.use('/api', buildRoutes);

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 App Builder backend running on port ${PORT}`);
      console.log(`🔗 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Backend startup aborted because MongoDB is unavailable.');
    process.exitCode = 1;
  }
};

startServer();
