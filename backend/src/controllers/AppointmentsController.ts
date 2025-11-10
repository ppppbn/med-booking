import { Request, Response } from 'express';
import { AppointmentRepository } from '../repositories/AppointmentRepository';
import { DoctorRepository } from '../repositories/DoctorRepository';
import { MedicalRecordRepository } from '../repositories/MedicalRecordRepository';
import { USER_ROLES, APPOINTMENT_STATUS } from '../constants/roles';

export class AppointmentsController {
  private appointmentRepository: AppointmentRepository;
  private doctorRepository: DoctorRepository;
  private medicalRecordRepository: MedicalRecordRepository;

  constructor() {
    this.appointmentRepository = new AppointmentRepository();
    this.doctorRepository = new DoctorRepository();
    this.medicalRecordRepository = new MedicalRecordRepository();
  }

  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status, date, startDate, endDate, doctorId, patientId } = req.query;

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
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = new Date(startDate as string);
        if (endDate) whereClause.date.lte = new Date(endDate as string);
      }
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
      const { status, symptoms, notes, date, time, diagnosis, treatment, prescription, testResults, followUpInstructions, nextAppointmentDate } = req.body;

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

      // Helper function to extract time from appointmentDateTime
      const extractTime = (dateTime: Date): string => {
        return dateTime.toTimeString().slice(0, 5); // Format: "HH:mm"
      };

      // Patients can update symptoms, notes, date, time (with restrictions)
      if (isPatient) {
        if (symptoms !== undefined) updateData.symptoms = symptoms;
        if (notes !== undefined) updateData.notes = notes;

        // Patients can only reschedule if appointment is still pending
        if ((date || time) && appointment.status === APPOINTMENT_STATUS.PENDING) {
          if (date) {
            const newDate = new Date(date);
            const currentTime = extractTime(appointment.appointmentDateTime);
            
            // Check if the new date/time is available
            const isAvailable = await this.appointmentRepository.checkAvailability(
              appointment.doctorId,
              newDate,
              time || currentTime,
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

      // If doctor is completing the appointment and medical data is provided, create/update medical record
      if (isDoctor && status === APPOINTMENT_STATUS.COMPLETED &&
          (diagnosis || treatment || prescription || testResults || followUpInstructions || nextAppointmentDate)) {

        const doctor = await this.doctorRepository.findByUserId(req.user!.id);
        if (doctor) {
          // Check if medical record already exists for this appointment
          const existingRecord = await this.medicalRecordRepository.findByAppointmentId(id);

          const medicalRecordData = {
            diagnosis,
            treatment,
            prescription,
            testResults,
            followUpInstructions,
            nextAppointmentDate: nextAppointmentDate ? new Date(nextAppointmentDate) : undefined
          };

          if (existingRecord) {
            // Update existing medical record
            await this.medicalRecordRepository.update(existingRecord.id, medicalRecordData);
          } else {
            // Create new medical record
            await this.medicalRecordRepository.create({
              patientId: appointment.patientId,
              doctorId: doctor.id,
              appointmentId: id,
              ...medicalRecordData
            });
          }
        }
      }

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

  async getDoctorAppointmentStatistics(req: Request, res: Response): Promise<void> {
    try {
      // Only doctors can access their own statistics
      if (req.user?.role !== USER_ROLES.DOCTOR) {
        res.status(403).json({ error: 'Truy cập bị từ chối' });
        return;
      }

      // Get the doctor's profile ID
      const doctor = await this.doctorRepository.findByUserId(req.user.id);
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' });
        return;
      }

      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) dateFilter.dateFrom = new Date(startDate as string);
      if (endDate) dateFilter.dateTo = new Date(endDate as string);

      const statistics = await this.appointmentRepository.getDoctorStatistics(doctor.id, dateFilter);

      res.json({
        statistics,
        dateRange: {
          startDate,
          endDate
        }
      });
    } catch (error) {
      console.error('Get doctor appointment statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPatientAppointmentStatistics(req: Request, res: Response): Promise<void> {
    try {
      // Only patients can access their own statistics
      if (req.user?.role !== USER_ROLES.PATIENT) {
        res.status(403).json({ error: 'Truy cập bị từ chối' });
        return;
      }

      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) dateFilter.dateFrom = new Date(startDate as string);
      if (endDate) dateFilter.dateTo = new Date(endDate as string);

      const statistics = await this.appointmentRepository.getPatientStatistics(req.user.id, dateFilter);

      res.json({
        statistics,
        dateRange: {
          startDate,
          endDate
        }
      });
    } catch (error) {
      console.error('Get patient appointment statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getDoctorPerformance(req: Request, res: Response): Promise<void> {
    try {
      // Only admin can access doctor performance
      if (req.user?.role !== USER_ROLES.ADMIN) {
        res.status(403).json({ error: 'Truy cập bị từ chối' });
        return;
      }

      const { doctors } = await this.doctorRepository.findAll();
      const performance: any[] = [];

      for (const doctor of doctors) {
        try {
          // Get doctor's appointments count
          const totalAppointments = await this.appointmentRepository.countByDoctor(doctor.id);
          const completedAppointments = await this.appointmentRepository.countByDoctor(doctor.id, APPOINTMENT_STATUS.COMPLETED);
          const pendingAppointments = await this.appointmentRepository.countByDoctor(doctor.id, APPOINTMENT_STATUS.PENDING);

          const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

          performance.push({
            id: doctor.id,
            fullName: doctor.user.fullName,
            specialization: doctor.specialization,
            totalAppointments,
            completedAppointments,
            pendingAppointments,
            completionRate
          });
        } catch (error) {
          // Skip doctors with errors
          continue;
        }
      }

      // Sort by completion rate descending
      performance.sort((a, b) => b.completionRate - a.completionRate);

      res.json({ performance });
    } catch (error) {
      console.error('Get doctor performance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAppointmentTrends(req: Request, res: Response): Promise<void> {
    try {
      // Only admin can access appointment trends
      if (req.user?.role !== USER_ROLES.ADMIN) {
        res.status(403).json({ error: 'Truy cập bị từ chối' });
        return;
      }

      // Get appointment counts for last 6 months
      const trends: { month: string; appointments: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth();

        // Count appointments for this month
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

        const count = await this.appointmentRepository.count({
          dateFrom: startOfMonth,
          dateTo: endOfMonth
        });

        const monthName = `Tháng ${month + 1}/${year}`;
        trends.push({
          month: monthName,
          appointments: count
        });
      }

      res.json({ trends });
    } catch (error) {
      console.error('Get appointment trends error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSpecializationPerformance(req: Request, res: Response): Promise<void> {
    try {
      // Only admin can access specialization performance
      if (req.user?.role !== USER_ROLES.ADMIN) {
        res.status(403).json({ error: 'Truy cập bị từ chối' });
        return;
      }

      // Get all doctors with their specializations
      const { doctors } = await this.doctorRepository.findAll();
      const specializationStats: { [key: string]: { total: number; completed: number } } = {};

      // Initialize stats for each specialization
      for (const doctor of doctors) {
        if (!specializationStats[doctor.specialization]) {
          specializationStats[doctor.specialization] = { total: 0, completed: 0 };
        }

        // Get appointment counts for this doctor
        const totalAppointments = await this.appointmentRepository.countByDoctor(doctor.id);
        const completedAppointments = await this.appointmentRepository.countByDoctor(doctor.id, APPOINTMENT_STATUS.COMPLETED);

        specializationStats[doctor.specialization].total += totalAppointments;
        specializationStats[doctor.specialization].completed += completedAppointments;
      }

      // Convert to array format for frontend
      const performance = Object.entries(specializationStats).map(([specialization, stats]) => ({
        specialization,
        totalAppointments: stats.total,
        completedAppointments: stats.completed,
        completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
      }));

      // Sort by completion rate descending
      performance.sort((a, b) => b.completionRate - a.completionRate);

      res.json({ performance });
    } catch (error) {
      console.error('Get specialization performance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
