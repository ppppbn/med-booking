import React from 'react';
import { Box, Paper, Typography, TextField, Button, Grid } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { USER_ROLES } from '../../constants/roles';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ padding: 3, maxWidth: 800, margin: '0 auto' }}>
      <Paper sx={{ padding: 3 }}>
        <Typography variant="h4" gutterBottom>
          Hồ sơ cá nhân
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <TextField
              fullWidth
              label="Họ và tên"
              value={user?.fullName || ''}
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <TextField
              fullWidth
              label="Email"
              value={user?.email || ''}
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <TextField
              fullWidth
              label="Số điện thoại"
              value={user?.phone || 'Chưa cập nhật'}
              InputProps={{ readOnly: true }}
            />
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <TextField
              fullWidth
              label="Vai trò"
              value={user?.role === USER_ROLES.DOCTOR ? 'Bác sĩ' : user?.role === USER_ROLES.PATIENT ? 'Bệnh nhân' : user?.role === USER_ROLES.ADMIN ? 'Quản trị viên' : user?.role || ''}
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button variant="contained">
            Cập nhật thông tin
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Profile;
