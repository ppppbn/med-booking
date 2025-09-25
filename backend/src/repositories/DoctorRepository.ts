import { PrismaClient, Doctor } from '@prisma/client';

export class DoctorRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findAll(options?: {
    isActive?: boolean;
    specialization?: string;
    skip?: number;
    take?: number;
  }) {
    const whereClause: any = {};

    if (options?.isActive !== undefined) {
      whereClause.isActive = options.isActive;
    }

    if (options?.specialization) {
      whereClause.specialization = options.specialization;
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          }
        },
        skip: options?.skip,
        take: options?.take,
        orderBy: {
          user: {
            fullName: 'asc'
          }
        }
      }),
      this.prisma.doctor.count({ where: whereClause })
    ]);

    return { doctors, total };
  }

  async findById(id: string) {
    return this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            address: true
          }
        }
      }
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
  }

  async findByIdWithUser(id: string) {
    return this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });
  }

  async getSpecializations(): Promise<string[]> {
    const result = await this.prisma.doctor.findMany({
      where: { isActive: true },
      select: { specialization: true },
      distinct: ['specialization']
    });

    return result.map(r => r.specialization).filter(Boolean) as string[];
  }

  async create(data: {
    userId: string;
    specialization: string;
    licenseNumber: string;
    experience?: number;
    bio?: string;
  }): Promise<Doctor> {
    return this.prisma.doctor.create({
      data: {
        ...data,
        isActive: true
      }
    });
  }

  async update(id: string, data: Partial<Doctor>): Promise<Doctor> {
    return this.prisma.doctor.update({
      where: { id },
      data
    });
  }

  async updateByUserId(userId: string, data: Partial<Doctor>) {
    return this.prisma.doctor.update({
      where: { userId },
      data,
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });
  }

  async deactivate(id: string): Promise<Doctor> {
    return this.prisma.doctor.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.doctor.count({
      where: { id }
    });
    return count > 0;
  }

  async isActive(id: string): Promise<boolean> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      select: { isActive: true }
    });
    return doctor?.isActive ?? false;
  }
}
