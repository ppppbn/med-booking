import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: 3 }}>
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <Paper sx={{ padding: 3, marginBottom: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#2e7d32', width: 56, height: 56 }}>
                {user?.fullName?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h5" component="h1">
                  Xin chào, {user?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chào mừng trở lại hệ thống đặt lịch khám bệnh
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Quick Actions */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
              <CardContent sx={{ textAlign: 'center', padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Đặt lịch khám
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Đặt lịch khám với bác sĩ chuyên khoa
                </Typography>
                  <Button variant="contained" fullWidth onClick={() => navigate('/book-appointment')}>
                    Đặt lịch ngay
                  </Button>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
              <CardContent sx={{ textAlign: 'center', padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Lịch hẹn của tôi
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Xem và quản lý lịch hẹn đã đặt
                </Typography>
                  <Button variant="outlined" fullWidth onClick={() => navigate('/my-records')}>
                    Xem lịch hẹn
                  </Button>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
              <CardContent sx={{ textAlign: 'center', padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Hồ sơ bệnh án
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Xem lịch sử khám bệnh và kết quả
                </Typography>
                  <Button variant="text" fullWidth onClick={() => navigate('/my-records')}>
                    Xem hồ sơ
                  </Button>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Upcoming Appointments */}
        <Paper sx={{ padding: 3, marginTop: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Lịch hẹn sắp tới
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bạn chưa có lịch hẹn nào sắp tới.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/book-appointment')}>
            Đặt lịch khám
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default PatientDashboard;
