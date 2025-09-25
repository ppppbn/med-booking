import express = require('express');
import cors = require('cors');
import dotenv = require('dotenv');
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes = require('./routes/auth');
import doctorRoutes = require('./routes/doctors');
import patientRoutes = require('./routes/patients');
import appointmentRoutes = require('./routes/appointments');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;

// Simple test without middleware
app.get('/test', (req, res) => {
  res.json({ status: 'OK', message: 'Test endpoint working' });
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.options(/.*/, cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes.default);
app.use('/api/doctors', doctorRoutes.default);
app.use('/api/patients', patientRoutes.default);
app.use('/api/appointments', appointmentRoutes.default);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Medical Booking API is running' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
