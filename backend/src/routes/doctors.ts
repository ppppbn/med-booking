import express = require('express');
import { DoctorsController } from '../controllers/DoctorsController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { USER_ROLES } from '../constants/roles';

const router = express.Router();
const doctorsController = new DoctorsController();

// Get all doctors (public endpoint)
router.get('/', (req, res) => doctorsController.getDoctors(req, res));

// Get doctor by ID (public endpoint)
router.get('/:id', (req, res) => doctorsController.getDoctor(req, res));

// Get doctor's availability for a specific date (public endpoint)
router.get('/:id/availability', (req, res) => doctorsController.getDoctorAvailability(req, res));

// Get doctor's appointments (protected - doctor only)
router.get('/:id/appointments', authenticateToken, authorizeRoles(USER_ROLES.DOCTOR), (req, res) =>
  doctorsController.getDoctorAppointments(req, res)
);

// Update doctor profile (protected - doctor only)
router.put('/:id', authenticateToken, authorizeRoles(USER_ROLES.DOCTOR), (req, res) =>
  doctorsController.updateDoctorProfile(req, res)
);

// Create new doctor (protected - admin only)
router.post('/', authenticateToken, authorizeRoles(USER_ROLES.ADMIN), (req, res) =>
  doctorsController.createDoctor(req, res)
);

// Deactivate doctor (protected - admin only)
router.delete('/:id', authenticateToken, authorizeRoles(USER_ROLES.ADMIN), (req, res) =>
  doctorsController.deactivateDoctor(req, res)
);

export default router;
