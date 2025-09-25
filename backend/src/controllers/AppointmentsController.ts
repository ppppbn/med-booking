import { Request, Response } from 'express';
import { AppointmentRepository } from '../repositories/AppointmentRepository';
import { DoctorRepository } from '../repositories/DoctorRepository';
import { USER_ROLES, APPOINTMENT_STATUS } from '../constants/roles';

export class AppointmentsController {
  private appointmentRepository: AppointmentRepository;
  private doctorRepository: DoctorRepository;

  constructor() {
    this.appointmentRepository = new AppointmentRepository();
    this.doctorRepository = new DoctorRepository();
  }

  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status, date, doctorId, patientId } = req.query;

      // Role-based filtering
      const whereClause: any = {};

      if (req.user?.role === USER_ROLES.DOCTOR) {
        // Doctors can only see their own appointments
        // Need to get the doctor's profile ID from user ID
        const doctor = await this.doctorRepository.findByUserId(req.user.id);
        if (!doctor) {
          res.status(404).json({ error: 'Doctor profile not found' });
          return;
        }
        whereClause.doctorId = doctor.id;
      } else if (req.user?.role === USER_ROLES.PATIENT) {
        // Patients can only see their own appointments
        whereClause.patientId = req.user.id;
      }
      // Admin can see all appointments

      // Additional filters
      if (status) whereClause.status = status as string;
      if (date) whereClause.date = new Date(date as string);
      if (doctorId) whereClause.doctorId = doctorId as string;
      if (patientId) whereClause.patientId = patientId as string;

      const { appointments, total } = await this.appointmentRepository.findAll({
        ...whereClause,
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
      console.error('Get appointments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const appointment = await this.appointmentRepository.findById(id);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      // Check if user has permission to access this appointment
      const isAdmin = req.user?.role === USER_ROLES.ADMIN;
      const isPatient = req.user?.id === appointment.patientId;

      // For doctors, we need to check if the doctor's profile ID matches
      let isDoctor = false;
      if (req.user?.role === USER_ROLES.DOCTOR) {
        const doctor = await this.doctorRepository.findByUserId(req.user.id);
        isDoctor = doctor?.id === appointment.doctorId;
      }

      if (!isAdmin && !isPatient && !isDoctor) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({ appointment });
    } catch (error) {
      console.error('Get appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { doctorId, date, time, symptoms, notes } = req.body;
      const patientId = req.user?.id;

      if (!patientId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Validate required fields
      if (!doctorId || !date || !time) {
        res.status(400).json({
          error: 'Doctor ID, date, and time are required'
        });
        return;
      }

      // Check if doctor exists and is active
      const isActive = await this.doctorRepository.isActive(doctorId);
      if (!isActive) {
        res.status(404).json({ error: 'Doctor not found or inactive' });
        return;
      }

      // Check if the time slot is still available
      const appointmentDate = new Date(date);
      const isAvailable = await this.appointmentRepository.checkAvailability(doctorId, appointmentDate, time);

      if (!isAvailable) {
        res.status(409).json({
          error: 'This time slot is no longer available'
        });
        return;
      }

      // Create the appointment
      const appointment = await this.appointmentRepository.create({
        patientId,
        doctorId,
        date: appointmentDate,
        time,
        symptoms,
        notes
      });

      res.status(201).json({
        message: 'Appointment booked successfully',
        appointment
      });
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, symptoms, notes, date, time } = req.body;

      // Get the appointment to check ownership
      const appointment = await this.appointmentRepository.findByIdBasic(id);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      const isPatient = req.user?.id === appointment.patientId;

      // For doctors, we need to check if the doctor's profile ID matches
      let isDoctor = false;
      if (req.user?.role === USER_ROLES.DOCTOR) {
        const doctor = await this.doctorRepository.findByUserId(req.user.id);
        isDoctor = doctor?.id === appointment.doctorId;
      }

      const isAdmin = req.user?.role === USER_ROLES.ADMIN;

      const updateData: any = {};

      // Patients can update symptoms, notes, date, time (with restrictions)
      if (isPatient) {
        if (symptoms !== undefined) updateData.symptoms = symptoms;
        if (notes !== undefined) updateData.notes = notes;

        // Patients can only reschedule if appointment is still pending
        if ((date || time) && appointment.status === APPOINTMENT_STATUS.PENDING) {
          if (date) {
            const newDate = new Date(date);
            // Check if the new date/time is available
            const isAvailable = await this.appointmentRepository.checkAvailability(
              appointment.doctorId,
              newDate,
              time || appointment.time,
              id
            );

            if (!isAvailable) {
              res.status(409).json({ error: 'New time slot is not available' });
              return;
            }

            updateData.date = newDate;
          }
          if (time) updateData.time = time;
        }
      }

      // Doctors and admins can update status
      if (isDoctor || isAdmin) {
        if (status && Object.values(APPOINTMENT_STATUS).includes(status)) {
          updateData.status = status;
        }
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      const updatedAppointment = await this.appointmentRepository.update(id, updateData);

      res.json({
        message: 'Appointment updated successfully',
        appointment: updatedAppointment
      });
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async cancelAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const appointment = await this.appointmentRepository.findByIdBasic(id);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      const isPatient = req.user?.id === appointment.patientId;

      // For doctors, we need to check if the doctor's profile ID matches
      let isDoctor = false;
      if (req.user?.role === USER_ROLES.DOCTOR) {
        const doctor = await this.doctorRepository.findByUserId(req.user.id);
        isDoctor = doctor?.id === appointment.doctorId;
      }

      const isAdmin = req.user?.role === USER_ROLES.ADMIN;

      if (!isPatient && !isDoctor && !isAdmin) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Only allow cancellation of pending or confirmed appointments
      const canCancel = await this.appointmentRepository.canCancel(id);
      if (!canCancel) {
        res.status(400).json({ error: 'Cannot cancel a completed or already cancelled appointment' });
        return;
      }

      const updatedAppointment = await this.appointmentRepository.update(id, {
        status: APPOINTMENT_STATUS.CANCELLED,
        notes: reason ? `${appointment.notes || ''}\nCancellation reason: ${reason}` : appointment.notes
      });

      res.json({
        message: 'Appointment cancelled successfully',
        appointment: updatedAppointment
      });
    } catch (error) {
      console.error('Cancel appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const appointment = await this.appointmentRepository.findByIdBasic(id);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      await this.appointmentRepository.delete(id);

      res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
      console.error('Delete appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAppointmentStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) dateFilter.dateFrom = new Date(startDate as string);
      if (endDate) dateFilter.dateTo = new Date(endDate as string);

      const statistics = await this.appointmentRepository.getStatistics(dateFilter);

      res.json({
        statistics,
        dateRange: {
          startDate,
          endDate
        }
      });
    } catch (error) {
      console.error('Get appointment statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
