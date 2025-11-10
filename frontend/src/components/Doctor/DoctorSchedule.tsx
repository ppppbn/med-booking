import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Avatar,
} from '@mui/material';
import { Today as TodayIcon } from '@mui/icons-material';
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar';
import moment from 'moment';
import { appointmentsService } from '../../services/appointments';
import { Appointment } from '../../services/appointments';
import { APPOINTMENT_STATUS } from '../../constants/roles';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Event interface for react-big-calendar
interface CalendarEvent {
  id?: string | number;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    appointment: Appointment;
    status: string;
    color: string;
  };
}


const DoctorSchedule: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentView, setCurrentView] = useState<string>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      // Get all appointments for the doctor (no date limit for calendar view)
      const { appointments } = await appointmentsService.getAppointments({
        limit: 1000
      });

      // Convert appointments to calendar events
      const calendarEvents: CalendarEvent[] = appointments.map(appointment => {
        const [hours, minutes] = appointment.time.split(':').map(Number);
        const startDate = new Date(appointment.date);
        startDate.setHours(hours, minutes, 0, 0);

        // Assume 30-minute appointments by default
        const endDate = new Date(startDate);
        endDate.setMinutes(startDate.getMinutes() + 30);

        return {
          id: appointment.id,
          title: `${appointment.patient.fullName}${appointment.symptoms ? ` - ${appointment.symptoms}` : ''}`,
          start: startDate,
          end: endDate,
          resource: {
            appointment,
            status: appointment.status,
            color: getEventColor(appointment.status)
          }
        };
      });

      setEvents(calendarEvents);
    } catch (error: any) {
      setError('Không thể tải lịch trình làm việc');
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (status: string): string => {
    switch (status) {
      case APPOINTMENT_STATUS.PENDING:
        return '#ff9800'; // warning
      case APPOINTMENT_STATUS.CONFIRMED:
        return '#2196f3'; // info
      case APPOINTMENT_STATUS.COMPLETED:
        return '#4caf50'; // success
      case APPOINTMENT_STATUS.CANCELLED:
        return '#f44336'; // error
      default:
        return '#9e9e9e'; // default
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.resource?.color || '#9e9e9e',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    return (
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
        {event.title}
      </div>
    );
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  const handleNavigate = (date: Date, view?: string, action?: string) => {
    setCurrentDate(date);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.resource?.appointment || null);
    setAppointmentDialogOpen(true);
  };

  const handleCloseAppointmentDialog = () => {
    setAppointmentDialogOpen(false);
    setSelectedAppointment(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'CONFIRMED':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Chờ xác nhận';
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          <Typography variant="h4" gutterBottom>
            Lịch trình làm việc
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Lịch hẹn của bạn hiển thị dưới dạng sự kiện trên lịch
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Legend */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Chip label="Chờ xác nhận" sx={{ bgcolor: '#ff9800', color: 'white' }} />
            <Chip label="Đã xác nhận" sx={{ bgcolor: '#2196f3', color: 'white' }} />
            <Chip label="Hoàn thành" sx={{ bgcolor: '#4caf50', color: 'white' }} />
            <Chip label="Đã hủy" sx={{ bgcolor: '#f44336', color: 'white' }} />
          </Box>

          {/* Calendar */}
          <Box sx={{ height: '600px' }}>
            <Calendar
              localizer={localizer as any}
              events={events as any}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter as any}
              components={{
                event: EventComponent as any,
              }}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA] as any}
              date={currentDate}
              onNavigate={handleNavigate as any}
              onSelectEvent={handleSelectEvent as any}
              {...({ view: currentView, onView: handleViewChange } as any)}
              messages={{
                next: 'Tiếp',
                previous: 'Trước',
                today: 'Hôm nay',
                month: 'Tháng',
                week: 'Tuần',
                day: 'Ngày',
                agenda: 'Lịch trình',
                date: 'Ngày',
                time: 'Thời gian',
                event: 'Sự kiện',
                noEventsInRange: 'Không có lịch hẹn nào trong khoảng thời gian này.',
                showMore: '+ Xem thêm',
              } as any}
              popup
            />
          </Box>
        </Box>
      </Paper>

      {/* Appointment Details Dialog */}
      <Dialog
        open={appointmentDialogOpen}
        onClose={handleCloseAppointmentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Chi tiết lịch hẹn
        </DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Box sx={{ pt: 1 }}>
              {/* Patient Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  {getInitials(selectedAppointment.patient.fullName)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedAppointment.patient.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAppointment.patient.email}
                  </Typography>
                  {selectedAppointment.patient.phone && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedAppointment.patient.phone}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Appointment Details */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Thông tin lịch hẹn
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Ngày:
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedAppointment.date).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Giờ:
                  </Typography>
                  <Typography variant="body2">
                    {selectedAppointment.time}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Trạng thái:
                  </Typography>
                  <Chip
                    label={getStatusLabel(selectedAppointment.status)}
                    color={getStatusColor(selectedAppointment.status) as any}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Symptoms/Notes */}
              {selectedAppointment.symptoms && (
                <>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Triệu chứng
                    </Typography>
                    <Typography variant="body2">
                      {selectedAppointment.symptoms}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Appointment Notes/Additional Info */}
              {selectedAppointment.notes && (
                <>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Ghi chú
                    </Typography>
                    <Typography variant="body2">
                      {selectedAppointment.notes}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAppointmentDialog}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DoctorSchedule;
