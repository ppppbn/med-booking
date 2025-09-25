import { Request, Response } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { AppointmentRepository } from '../repositories/AppointmentRepository';
import { USER_ROLES, APPOINTMENT_STATUS } from '../constants/roles';

export class PatientsController {
  private userRepository: UserRepository;
  private appointmentRepository: AppointmentRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.appointmentRepository = new AppointmentRepository();
  }

  async getPatients(req: Request, res: Response): Promise<void> {
    try {
      const { search, page = 1, limit = 10 } = req.query;

      const { users, total } = await this.userRepository.findByRole(USER_ROLES.PATIENT, {
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        search: search as string
      });

      res.json({
        patients: users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if user has permission to access this patient
      const isAdminOrDoctor = req.user?.role === USER_ROLES.ADMIN || req.user?.role === USER_ROLES.DOCTOR;
      const isAccessingOwnProfile = req.user?.id === id;

      if (!isAdminOrDoctor && !isAccessingOwnProfile) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const patient = await this.userRepository.findById(id);

      if (!patient || patient.role !== USER_ROLES.PATIENT) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.json({ patient });
    } catch (error) {
      console.error('Get patient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { fullName, phone, dateOfBirth, address } = req.body;

      // Verify the patient is updating their own profile
      if (req.user?.id !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (address !== undefined) updateData.address = address;

      const updatedPatient = await this.userRepository.update(id, updateData);

      res.json({
        message: 'Patient profile updated successfully',
        patient: updatedPatient
      });
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPatientAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        status,
        search,
        sortBy,
        sortOrder = 'desc'
      } = req.query;

      // Verify the patient is accessing their own appointments
      if (req.user?.id !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { appointments, total } = await this.appointmentRepository.findByPatientId(id, {
        status: status as string,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      });

      res.json({
        appointments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get patient appointments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPatientRecords(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verify the patient is accessing their own records
      if (req.user?.id !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { appointments } = await this.appointmentRepository.findByPatientId(id, {
        status: APPOINTMENT_STATUS.COMPLETED
      });

      const medicalRecords = appointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        doctor: {
          fullName: apt.doctor.user.fullName,
          specialization: apt.doctor.specialization
        },
        symptoms: apt.symptoms,
        notes: apt.notes,
        // In a real application, you might have a separate MedicalRecord model
        // with diagnosis, prescription, etc.
        diagnosis: null, // Placeholder
        prescription: null, // Placeholder
        followUpNotes: null // Placeholder
      }));

      res.json({
        medicalRecords,
        totalRecords: medicalRecords.length
      });
    } catch (error) {
      console.error('Get patient records error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createPatient(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, phone, dateOfBirth, address } = req.body;

      // Validate required fields
      if (!email || !password || !fullName) {
        res.status(400).json({
          error: 'Email, password, and fullName are required'
        });
        return;
      }

      // Check if user with this email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      // Hash password
      const hashedPassword = await require('bcryptjs').hash(password, 10);

      const newPatient = await this.userRepository.create({
        email,
        password: hashedPassword,
        fullName,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        address,
        role: USER_ROLES.PATIENT
      });

      res.status(201).json({
        message: 'Patient created successfully',
        patient: newPatient
      });
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deactivatePatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if patient has active appointments
      const hasActiveAppointments = await this.appointmentRepository.hasActiveAppointments(id);

      if (hasActiveAppointments) {
        res.status(409).json({
          error: 'Cannot delete patient with active appointments. Cancel all appointments first.'
        });
        return;
      }

      await this.userRepository.delete(id);

      res.json({ message: 'Patient deactivated successfully' });
    } catch (error) {
      console.error('Deactivate patient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
