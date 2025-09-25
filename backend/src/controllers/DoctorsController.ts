import { Request, Response } from 'express';
import { DoctorRepository } from '../repositories/DoctorRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AppointmentRepository } from '../repositories/AppointmentRepository';
import { USER_ROLES } from '../constants/roles';

export class DoctorsController {
  private doctorRepository: DoctorRepository;
  private userRepository: UserRepository;
  private appointmentRepository: AppointmentRepository;

  constructor() {
    this.doctorRepository = new DoctorRepository();
    this.userRepository = new UserRepository();
    this.appointmentRepository = new AppointmentRepository();
  }

  async getDoctors(req: Request, res: Response): Promise<void> {
    try {
      const { specialization } = req.query;

      const { doctors, total } = await this.doctorRepository.findAll({
        isActive: true,
        specialization: specialization as string
      });

      const specializations = await this.doctorRepository.getSpecializations();

      res.json({
        doctors: doctors.map(doctor => ({
          id: doctor.id,
          userId: doctor.userId,
          fullName: doctor.user.fullName,
          email: doctor.user.email,
          phone: doctor.user.phone,
          specialization: doctor.specialization,
          licenseNumber: doctor.licenseNumber,
          experience: doctor.experience,
          bio: doctor.bio,
          isActive: doctor.isActive,
          createdAt: doctor.createdAt
        })),
        specializations,
        total
      });
    } catch (error) {
      console.error('Get doctors error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getDoctor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const doctor = await this.doctorRepository.findById(id);

      if (!doctor) {
        res.status(404).json({ error: 'Doctor not found' });
        return;
      }

      res.json({
        doctor: {
          id: doctor.id,
          userId: doctor.userId,
          fullName: doctor.user.fullName,
          email: doctor.user.email,
          phone: doctor.user.phone,
          dateOfBirth: doctor.user.dateOfBirth,
          address: doctor.user.address,
          specialization: doctor.specialization,
          licenseNumber: doctor.licenseNumber,
          experience: doctor.experience,
          bio: doctor.bio,
          isActive: doctor.isActive,
          createdAt: doctor.createdAt,
          updatedAt: doctor.updatedAt
        }
      });
    } catch (error) {
      console.error('Get doctor error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getDoctorAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { date } = req.query;

      if (!date) {
        res.status(400).json({ error: 'Date parameter is required' });
        return;
      }

      // Check if doctor exists and is active
      const isActive = await this.doctorRepository.isActive(id);
      if (!isActive) {
        res.status(404).json({ error: 'Doctor not found or inactive' });
        return;
      }

      const targetDate = new Date(date as string);

      // Validate date
      if (isNaN(targetDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
        return;
      }

      const availableSlots = await this.appointmentRepository.getAvailableSlots(id, targetDate);
      const bookedSlots = await this.appointmentRepository.findByDoctorId(id, {
        date: targetDate,
        skip: 0,
        take: 100
      });

      res.json({
        doctorId: id,
        date: date,
        availableSlots,
        bookedSlots: bookedSlots.appointments.map(apt => apt.time)
      });
    } catch (error) {
      console.error('Get doctor availability error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getDoctorAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { date, status, page = 1, limit = 10 } = req.query;

      // Verify the doctor is accessing their own appointments
      if (req.user?.id !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { appointments, total } = await this.appointmentRepository.findByDoctorId(id, {
        date: date ? new Date(date as string) : undefined,
        status: status as string,
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
      console.error('Get doctor appointments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateDoctorProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { specialization, licenseNumber, experience, bio } = req.body;

      // Verify the doctor is updating their own profile
      if (req.user?.id !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const updatedDoctor = await this.doctorRepository.updateByUserId(id, {
        specialization,
        licenseNumber,
        experience,
        bio
      });

      res.json({
        message: 'Doctor profile updated successfully',
        doctor: {
          id: updatedDoctor.id,
          specialization: updatedDoctor.specialization,
          licenseNumber: updatedDoctor.licenseNumber,
          experience: updatedDoctor.experience,
          bio: updatedDoctor.bio
        }
      });
    } catch (error) {
      console.error('Update doctor profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createDoctor(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, phone, specialization, licenseNumber, experience, bio } = req.body;

      // Validate required fields
      if (!email || !password || !fullName || !specialization || !licenseNumber) {
        res.status(400).json({
          error: 'Email, password, fullName, specialization, and licenseNumber are required'
        });
        return;
      }

      // Check if user with this email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      // Create user and doctor in transaction (simplified for now)
      const hashedPassword = await require('bcryptjs').hash(password, 10);

      const user = await this.userRepository.create({
        email,
        password: hashedPassword,
        fullName,
        phone,
        role: USER_ROLES.DOCTOR
      });

      const doctor = await this.doctorRepository.create({
        userId: user.id,
        specialization,
        licenseNumber,
        experience,
        bio
      });

      res.status(201).json({
        message: 'Doctor created successfully',
        doctor: {
          id: doctor.id,
          userId: doctor.userId,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          specialization: doctor.specialization,
          licenseNumber: doctor.licenseNumber,
          experience: doctor.experience,
          bio: doctor.bio
        }
      });
    } catch (error) {
      console.error('Create doctor error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deactivateDoctor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.doctorRepository.deactivate(id);

      res.json({ message: 'Doctor deactivated successfully' });
    } catch (error) {
      console.error('Deactivate doctor error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
