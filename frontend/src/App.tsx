import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { USER_ROLES } from './constants/roles';

// Auth Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Role-specific Components
import DoctorDashboard from './components/Doctor/DoctorDashboard';
import DoctorAppointments from './components/Doctor/Appointments';
import DoctorPatients from './components/Doctor/Patients';
import PatientDashboard from './components/Patient/PatientDashboard';
import BookAppointment from './components/Patient/BookAppointment';
import MyAppointments from './components/Patient/MyAppointments';
import MyRecords from './components/Patient/MyRecords';

// Shared Components
import Profile from './components/Shared/Profile';
import Dashboard from './components/Shared/Dashboard';
import AppLayout from './components/Shared/AppLayout';

// Utilities
import ProtectedRoute from './components/ProtectedRoute';

// Material UI theme with Vietnamese font support
const theme = createTheme({
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e0e0e0',
        },
      },
    },
  },
});

// App Routes component
const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // Determine default dashboard based on role
  const getDefaultDashboard = () => {
    if (!user) return '/login';

    switch (user.role) {
      case USER_ROLES.DOCTOR:
        return '/dashboard';
      case USER_ROLES.PATIENT:
        return '/dashboard';
      case USER_ROLES.ADMIN:
        return '/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <AppLayout>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={getDefaultDashboard()} /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to={getDefaultDashboard()} /> : <Register />}
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Doctor routes */}
        <Route
          path="/doctor-dashboard"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.DOCTOR}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.DOCTOR}>
              <DoctorAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.DOCTOR}>
              <DoctorPatients />
            </ProtectedRoute>
          }
        />

        {/* Patient routes */}
        <Route
          path="/patient-dashboard"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.PATIENT}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-appointment"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.PATIENT}>
              <BookAppointment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-appointments"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.PATIENT}>
              <MyAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-records"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.PATIENT}>
              <MyRecords />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.ADMIN}>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Bảng điều khiển Admin</h2>
                <p className="text-gray-600">Chức năng quản trị hệ thống.</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-doctors"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.ADMIN}>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Quản lý bác sĩ</h2>
                <p className="text-gray-600">Chức năng quản lý tài khoản bác sĩ.</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-patients"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.ADMIN}>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Quản lý bệnh nhân</h2>
                <p className="text-gray-600">Chức năng quản lý tài khoản bệnh nhân.</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute allowedRoles={USER_ROLES.ADMIN}>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Thống kê hệ thống</h2>
                <p className="text-gray-600">Chức năng xem báo cáo và thống kê.</p>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Shared routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Cài đặt</h2>
                <p className="text-gray-600">Chức năng cài đặt tài khoản và ứng dụng.</p>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={getDefaultDashboard()} />} />

        {/* 404 route */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">404</h2>
                <p className="text-gray-600 mb-8">Trang không tồn tại</p>
                <button
                  onClick={() => window.history.back()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Quay lại
                </button>
              </div>
            </div>
          }
        />
      </Routes>
    </AppLayout>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
