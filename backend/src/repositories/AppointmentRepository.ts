import { PrismaClient, Appointment } from '@prisma/client';
import { APPOINTMENT_STATUS } from '../constants/roles';

export class AppointmentRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findAll(options?: {
    patientId?: string;
    doctorId?: string;
    status?: string;
    date?: Date;
    dateFrom?: Date;
    dateTo?: Date;
    skip?: number;
    take?: number;
  }) {
    const whereClause: any = {};

    if (options?.patientId) whereClause.patientId = options.patientId;
    if (options?.doctorId) whereClause.doctorId = options.doctorId;
    if (options?.status) whereClause.status = options.status;

    if (options?.date) {
      // For exact date match
      const targetDate = new Date(options.date);
      whereClause.date = {
        gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
        lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
      };
    }

    if (options?.dateFrom || options?.dateTo) {
      whereClause.date = {};
      if (options.dateFrom) whereClause.date.gte = options.dateFrom;
      if (options.dateTo) whereClause.date.lt = options.dateTo;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: whereClause,
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          doctor: {
            select: {
              id: true,
              specialization: true,
              licenseNumber: true,
              experience: true,
              bio: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              }
            }
          }
        },
        skip: options?.skip,
        take: options?.take,
        orderBy: {
          date: 'desc'
        }
      }),
      this.prisma.appointment.count({ where: whereClause })
    ]);

    return { appointments, total };
  }

  async findById(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            address: true
          }
        },
        doctor: {
          select: {
            id: true,
            specialization: true,
            licenseNumber: true,
            experience: true,
            bio: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            }
          }
        }
      }
    });
  }

  async findByIdBasic(id: string): Promise<Appointment | null> {
    return this.prisma.appointment.findUnique({
      where: { id }
    });
  }

  async findByPatientId(patientId: string, options?: {
    status?: string;
    skip?: number;
    take?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const whereClause: any = { patientId };

    if (options?.status) {
      whereClause.status = options.status;
    }

    // Add search functionality (case-sensitive due to Prisma version limitations)
    if (options?.search) {
      whereClause.OR = [
        {
          doctor: {
            user: {
              fullName: {
                contains: options.search
              }
            }
          }
        },
        {
          doctor: {
            specialization: {
              contains: options.search
            }
          }
        },
        {
          symptoms: {
            contains: options.search
          }
        },
        {
          notes: {
            contains: options.search
          }
        }
      ];
    }

    // Default sort options
    let orderBy: any = {
      date: 'desc' as const
    };

    // Handle custom sorting
    if (options?.sortBy) {
      switch (options.sortBy) {
        case 'date':
          orderBy = { date: options.sortOrder || 'desc' };
          break;
        case 'doctor':
          orderBy = {
            doctor: {
              user: {
                fullName: options.sortOrder || 'asc'
              }
            }
          };
          break;
        case 'specialization':
          orderBy = {
            doctor: {
              specialization: options.sortOrder || 'asc'
            }
          };
          break;
        case 'status':
          orderBy = { status: options.sortOrder || 'asc' };
          break;
        default:
          orderBy = { date: 'desc' as const };
      }
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: whereClause,
        include: {
          doctor: {
            select: {
              id: true,
              specialization: true,
              licenseNumber: true,
              experience: true,
              bio: true,
              user: {
                select: {
                  fullName: true
                }
              }
            }
          }
        },
        skip: options?.skip,
        take: options?.take,
        orderBy
      }),
      this.prisma.appointment.count({ where: whereClause })
    ]);

    return { appointments, total };
  }

  async findByDoctorId(doctorId: string, options?: {
    date?: Date;
    status?: string;
    skip?: number;
    take?: number;
  }) {
    const whereClause: any = { doctorId };

    if (options?.status) {
      whereClause.status = options.status;
    }

    if (options?.date) {
      const targetDate = new Date(options.date);
      whereClause.date = {
        gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
        lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
      };
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: whereClause,
        include: {
          patient: {
            select: {
              fullName: true,
              email: true,
              phone: true,
              dateOfBirth: true
            }
          }
        },
        skip: options?.skip,
        take: options?.take,
        orderBy: {
          date: 'desc'
        }
      }),
      this.prisma.appointment.count({ where: whereClause })
    ]);

    return { appointments, total };
  }

  async create(data: {
    patientId: string;
    doctorId: string;
    date: Date;
    time: string;
    symptoms?: string;
    notes?: string;
    status?: string;
  }): Promise<Appointment> {
    return this.prisma.appointment.create({
      data: {
        ...data,
        status: data.status || APPOINTMENT_STATUS.PENDING
      },
      include: {
        patient: {
          select: { fullName: true, email: true }
        },
        doctor: {
          select: {
            id: true,
            specialization: true,
            licenseNumber: true,
            experience: true,
            bio: true,
            user: {
              select: { fullName: true, email: true }
            }
          }
        }
      }
    });
  }

  async update(id: string, data: Partial<Appointment>): Promise<Appointment> {
    return this.prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: {
          select: { fullName: true, email: true }
        },
        doctor: {
          select: {
            id: true,
            specialization: true,
            licenseNumber: true,
            experience: true,
            bio: true,
            user: {
              select: { fullName: true, email: true }
            }
          }
        }
      }
    });
  }

  async delete(id: string): Promise<Appointment> {
    return this.prisma.appointment.delete({
      where: { id }
    });
  }

  async checkAvailability(doctorId: string, date: Date, time: string, excludeAppointmentId?: string): Promise<boolean> {
    const whereClause: any = {
      doctorId,
      date,
      time,
      status: {
        in: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED]
      }
    };

    if (excludeAppointmentId) {
      whereClause.id = { not: excludeAppointmentId };
    }

    const count = await this.prisma.appointment.count({
      where: whereClause
    });

    return count === 0;
  }

  async getAvailableSlots(doctorId: string, date: Date): Promise<string[]> {
    // Validate date parameter
    if (!date || isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }

    // Generate all possible time slots (8 AM - 5 PM, 30-minute intervals)
    const timeSlots = [];
    const startHour = 8;
    const endHour = 17;
    const slotDuration = 30; // minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push(timeString);
      }
    }

    // Get booked slots for this date
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Add one day
        },
        status: {
          in: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED]
        }
      },
      select: { time: true }
    });

    const bookedTimes = bookedAppointments.map(apt => apt.time);
    return timeSlots.filter(slot => !bookedTimes.includes(slot));
  }

  async getStatistics(options?: {
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const dateFilter: any = {};
    if (options?.dateFrom) dateFilter.gte = options.dateFrom;
    if (options?.dateTo) dateFilter.lt = options.dateTo;

    const whereClause = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const [
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      today
    ] = await Promise.all([
      this.prisma.appointment.count({ where: whereClause }),
      this.prisma.appointment.count({
        where: { ...whereClause, status: APPOINTMENT_STATUS.PENDING }
      }),
      this.prisma.appointment.count({
        where: { ...whereClause, status: APPOINTMENT_STATUS.CONFIRMED }
      }),
      this.prisma.appointment.count({
        where: { ...whereClause, status: APPOINTMENT_STATUS.COMPLETED }
      }),
      this.prisma.appointment.count({
        where: { ...whereClause, status: APPOINTMENT_STATUS.CANCELLED }
      }),
      this.prisma.appointment.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      })
    ]);

    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      today
    };
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.appointment.count({
      where: { id }
    });
    return count > 0;
  }

  async canCancel(id: string): Promise<boolean> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!appointment) return false;

    return appointment.status === APPOINTMENT_STATUS.PENDING ||
           appointment.status === APPOINTMENT_STATUS.CONFIRMED;
  }

  async hasActiveAppointments(patientId: string): Promise<boolean> {
    const count = await this.prisma.appointment.count({
      where: {
        patientId,
        status: {
          in: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED]
        }
      }
    });

    return count > 0;
  }
}
