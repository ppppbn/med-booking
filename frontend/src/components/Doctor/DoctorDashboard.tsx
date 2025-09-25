import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Event as EventIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Today as TodayIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { appointmentsService } from '../../services/appointments';

interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  upcomingAppointments: number;
}

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    upcomingAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Get all appointments for this doctor
      const { appointments } = await appointmentsService.getAppointments({
        doctorId: user!.id,
        limit: 1000
      });

      const dashboardStats: DashboardStats = {
        totalAppointments: appointments.length,
        todayAppointments: appointments.filter(apt => apt.date === today).length,
        pendingAppointments: appointments.filter(apt => apt.status === 'PENDING').length,
        completedAppointments: appointments.filter(apt => apt.status === 'COMPLETED').length,
        upcomingAppointments: appointments.filter(apt =>
          (apt.status === 'PENDING' || apt.status === 'CONFIRMED') && apt.date >= today
        ).length,
      };

      setStats(dashboardStats);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return utcDate.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 0 }}>
        <Box sx={{ p: 3, pb: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                {user?.fullName?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h5" component="h1">
                  Xin chào, Bác sĩ {user?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chào mừng trở lại hệ thống quản lý bệnh nhân
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Statistics Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <EventIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats.totalAppointments}
                </Typography>
                <Typography variant="body2">
                  Tổng lịch hẹn
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <TodayIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats.todayAppointments}
                </Typography>
                <Typography variant="body2">
                  Hôm nay
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <ScheduleIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats.pendingAppointments}
                </Typography>
                <Typography variant="body2">
                  Chờ xác nhận
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats.completedAppointments}
                </Typography>
                <Typography variant="body2">
                  Hoàn thành
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <EventIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Lịch hẹn hôm nay
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Xem và quản lý lịch hẹn ({stats.upcomingAppointments} sắp tới)
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/appointments')}
                >
                  Xem lịch hẹn
                </Button>
              </CardContent>
            </Card>

            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <PeopleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Danh sách bệnh nhân
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Quản lý thông tin bệnh nhân ({stats.totalAppointments} bệnh nhân)
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/patients')}
                >
                  Xem bệnh nhân
                </Button>
              </CardContent>
            </Card>

            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <AssessmentIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Báo cáo thống kê
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Xem báo cáo và thống kê chi tiết
                </Typography>
                <Button
                  variant="text"
                  fullWidth
                  disabled
                >
                  Sắp có
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default DoctorDashboard;
