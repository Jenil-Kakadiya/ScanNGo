'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, ArrowLeft, Users, Calendar, Clock, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '../../../components/AdminNavbar'

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [view, setView] = useState('events'); // 'events', 'days', 'sessions', 'attendees'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [days, setDays] = useState([]);
  const [daysLoading, setDaysLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [delegates, setDelegates] = useState([]);
  const [delegatesLoading, setDelegatesLoading] = useState(false);
  const [delegatesError, setDelegatesError] = useState(null);
  const [attendanceExporting, setAttendanceExporting] = useState(false);
  const [attendanceExportError, setAttendanceExportError] = useState(null);
  const [isEligibleOpen, setIsEligibleOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    status: 'active',
    location: '',
    dateTime: '',
    organizerId: '',
    creatorEmail: ''
  });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No user data or token found, redirecting to login');
        router.push('/');
        return;
      }
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/adminData`, {
          method: "GET",
          headers: {
            'Content-Type': "application/json",
            'authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const userData = await response.json();

        if (userData.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setUser(userData);

        setEventForm((prev) => ({
          ...prev,
          creatorEmail: userData.email || ''
        }));

        // Fetch events on load
        fetchEvents();
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        router.push('/');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setErrors({ general: 'Failed to fetch events. Please try again.' });
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchDays = async (eventId) => {
    try {
      setDaysLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/events/${eventId}/days`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch days');
      }

      const data = await response.json();
      if (data.success) {
        setDays(data.days || []);
      }
    } catch (error) {
      console.error('Error fetching days:', error);
      setErrors({ general: 'Failed to fetch days. Please try again.' });
    } finally {
      setDaysLoading(false);
    }
  };

  const fetchSessions = async (eventId, dayId) => {
    try {
      setSessionsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/events/${eventId}/days/${dayId}/sessions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions || []);
        setSelectedDay(data.day);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setErrors({ general: 'Failed to fetch sessions. Please try again.' });
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchEligibleUsers = async (eventId) => {
    try {
      setEligibleLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/events/${eventId}/certificate/eligible-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrors({ general: data.error || 'Failed to fetch eligible users.' });
        return;
      }
      setEligibleUsers(data.eligibleUsers || []);
      setIsEligibleOpen(true);
    } catch (e) {
      console.error('Error fetching eligible users:', e);
      setErrors({ general: 'Failed to fetch eligible users.' });
    } finally {
      setEligibleLoading(false);
    }
  };

  const fetchAttendees = async (eventId, dayId, sessionId) => {
    try {
      setAttendeesLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/events/${eventId}/days/${dayId}/sessions/${sessionId}/attendees`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendees');
      }

      const data = await response.json();
      if (data.success) {
        setAttendees(data.attendees || []);
        setSelectedSession(data.session);
      }
    } catch (error) {
      console.error('Error fetching attendees:', error);
      setErrors({ general: 'Failed to fetch attendees. Please try again.' });
    } finally {
      setAttendeesLoading(false);
    }
  };

  const fetchDelegates = async (eventId) => {
    try {
      setDelegatesLoading(true);
      setDelegatesError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/events/${eventId}/delegates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setDelegates([]);
        setDelegatesError(data.error || 'Failed to fetch delegates.');
        return;
      }
      setDelegates(data.delegates || []);
    } catch (error) {
      console.error('Error fetching delegates:', error);
      setDelegates([]);
      setDelegatesError('Failed to fetch delegates. Please try again.');
    } finally {
      setDelegatesLoading(false);
    }
  };

  const handleEventClick = async (event) => {
    setSelectedEvent(event);
    setView('days');
    setDelegates([]);
    setAttendanceExportError(null);
    await Promise.all([fetchDays(event.id), fetchDelegates(event.id)]);
  };

  const handleDayClick = async (day) => {
    setSelectedDay(day);
    setView('sessions');
    await fetchSessions(selectedEvent.id, day.id);
  };

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setView('attendees');
    await fetchAttendees(selectedEvent.id, selectedDay.id, session.id);
  };

  const handleBack = () => {
    if (view === 'attendees') {
      setView('sessions');
      setSelectedSession(null);
      setAttendees([]);
    } else if (view === 'sessions') {
      setView('days');
      setSelectedDay(null);
      setSessions([]);
    } else if (view === 'days') {
      setView('events');
      setSelectedEvent(null);
      setDays([]);
      setDelegates([]);
      setDelegatesError(null);
      setAttendanceExportError(null);
    }
  };

  const handleDownloadAttendance = async () => {
    if (!selectedEvent) return;
    try {
      setAttendanceExporting(true);
      setAttendanceExportError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/events/${selectedEvent.id}/attendance/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setAttendanceExportError(data.error || 'Failed to download attendance logs.');
        return;
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const days = data.days || [];

      if (days.length === 0) {
        const worksheet = XLSX.utils.aoa_to_sheet([['No attendance records available.']]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      } else {
        days.forEach((day, index) => {
          const sheetRows = [];
          const dayTitle = day.title || formatDate(day.dayDate);
          sheetRows.push([`Day: ${dayTitle}`]);
          sheetRows.push([]);

          const sessions = day.sessions || [];
          if (sessions.length === 0) {
            sheetRows.push(['No sessions available.']);
          } else {
            sessions.forEach((session, sessionIndex) => {
              sheetRows.push([`Session: ${session.title}`]);
              sheetRows.push(['Attendee Name', 'Attendee Email', 'Marked At']);
              const attendees = session.attendees || [];
              if (attendees.length === 0) {
                sheetRows.push(['No attendees recorded.', '', '']);
              } else {
                attendees.forEach((attendance) => {
                  const attendeeName = attendance.user?.name || 'N/A';
                  const attendeeEmail = attendance.user?.email || 'N/A';
                  const markedAt = attendance.markedAt
                    ? new Date(attendance.markedAt).toLocaleString()
                    : '';
                  sheetRows.push([attendeeName, attendeeEmail, markedAt]);
                });
              }
              if (sessionIndex !== sessions.length - 1) {
                sheetRows.push([]);
              }
            });
          }

          const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
          XLSX.utils.book_append_sheet(workbook, worksheet, `Day ${index + 1}`);
        });
      }

      const safeEventName = (data.event?.name || 'event')
        .replace(/[\\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '_');
      const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeEventName}_attendance.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error downloading attendance logs:', error);
      setAttendanceExportError('Failed to download attendance logs. Please try again.');
    } finally {
      setAttendanceExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      const validationErrors = {};
      if (!eventForm.name.trim()) validationErrors.name = 'Name is required';
      if (!eventForm.dateTime) validationErrors.dateTime = 'Date & Time is required';
      if (!eventForm.creatorEmail) validationErrors.creatorEmail = 'Creator email is required';
      if (!eventForm.organizerId) validationErrors.organizerId = 'Organizer ID is required';

      if (Object.keys(validationErrors).length) {
        setErrors(validationErrors);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(eventForm)
      });

      if (response.ok) {
        setIsCreateOpen(false);
        setEventForm({
          name: '',
          description: '',
          status: 'active',
          location: '',
          dateTime: '',
          organizerId: '',
          creatorEmail: user?.email || ''
        });
        setErrors({ success: 'Event created successfully!' });
        fetchEvents(); // Refresh events list
        setTimeout(() => setErrors({}), 3000);
      } else {
        setErrors({ general: 'Failed to create event. Please try again.' });
      }
    } catch (err) {
      console.error(err);
      setErrors({ general: 'Failed to create event. Please try again.' });
    } finally {
      setCreateLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Success/Error Messages */}
        {errors.success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{errors.success}</span>
            </div>
          </div>
        )}

        {errors.general && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{errors.general}</span>
            </div>
          </div>
        )}

        <AdminNavbar
          user={user}
          onCreateEvent={() => setIsCreateOpen(true)}
          onLogout={handleLogout}
        />

        {/* Breadcrumb Navigation */}
        {view !== 'events' && (
          <div className="mb-6 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <span className="text-gray-500">/</span>
            {selectedEvent && <span className="text-gray-700">{selectedEvent.name}</span>}
            {selectedDay && (
              <>
                <span className="text-gray-500">/</span>
                <span className="text-gray-700">{selectedDay.title || formatDate(selectedDay.dayDate)}</span>
              </>
            )}
            {selectedSession && (
              <>
                <span className="text-gray-500">/</span>
                <span className="text-gray-700">{selectedSession.title}</span>
              </>
            )}
          </div>
        )}

        {/* Events List View */}
        {view === 'events' && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Manage Activity</h1>
            </div>

            {eventsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No events found. Create your first event to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleEventClick(event)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <CardDescription>{event.description || 'No description'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.dateTime)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{event.attendees || 0} attendees</span>
                        </div>
                        <div className="pt-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            event.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Days List View */}
        {view === 'days' && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedEvent?.name} - Days
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadAttendance}
                  disabled={attendanceExporting || !selectedEvent}
                >
                  {attendanceExporting ? (
                    'Generating...'
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Attendance Logs
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchEligibleUsers(selectedEvent.id)}
                  disabled={eligibleLoading}
                >
                  {eligibleLoading ? 'Loading...' : 'Eligible for Certificate'}
                </Button>
              </div>
            </div>

            {attendanceExportError && (
              <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded-lg text-sm text-red-600">
                {attendanceExportError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
              <div>
                {daysLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : days.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No days found for this event.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {days.map((day) => (
                      <Card
                        key={day.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleDayClick(day)}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {day.title || formatDate(day.dayDate)}
                          </CardTitle>
                          <CardDescription>
                            {day.sessionCount} session{day.sessionCount !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-2xl font-bold text-blue-600">{day.totalAttendance}</span>
                            <span className="text-gray-600">total attendance</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Delegates</CardTitle>
                        <CardDescription>
                          Registered delegates for this event
                        </CardDescription>
                      </div>
                      {selectedEvent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchDelegates(selectedEvent.id)}
                          disabled={delegatesLoading}
                        >
                          {delegatesLoading ? 'Refreshing...' : 'Refresh'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {delegatesLoading ? (
                      <div className="flex justify-center items-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : delegatesError ? (
                      <div className="p-4 border border-red-200 bg-red-50 text-sm text-red-600 rounded-lg">
                        {delegatesError}
                      </div>
                    ) : delegates.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        No delegates registered yet.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                        {delegates.map((delegate) => (
                          <div
                            key={delegate.id}
                            className="p-4 border rounded-lg bg-white shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{delegate.name}</p>
                                <p className="text-sm text-gray-500">{delegate.email}</p>
                                <p className="text-sm text-gray-500">{delegate.mobileNo}</p>
                              </div>
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 uppercase">
                                {delegate.status}
                              </span>
                            </div>
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Verification Code</p>
                              <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded mt-1 break-all">
                                {delegate.verificationCode}
                              </p>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                              Added on {new Date(delegate.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Eligible Users Dialog */}
        <Dialog open={isEligibleOpen} onOpenChange={setIsEligibleOpen}>
          <DialogContent className="w-full max-w-2xl">
            <DialogHeader>
              <DialogTitle>Eligible Students{selectedEvent ? ` - ${selectedEvent.name}` : ''}</DialogTitle>
              <DialogDescription>
                {eligibleUsers.length} user{eligibleUsers.length !== 1 ? 's' : ''} eligible for certificate.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {eligibleUsers.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No eligible users found.</div>
              ) : (
                <div className="divide-y">
                  {eligibleUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3">
                      <div>
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsEligibleOpen(false)} variant="outline">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sessions List View */}
        {view === 'sessions' && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedDay?.title || formatDate(selectedDay?.dayDate)} - Sessions
            </h2>

            {sessionsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : sessions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No sessions found for this day.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSessionClick(session)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(session.createdAt).toLocaleString()}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-2xl font-bold text-blue-600">{session.attendanceCount}</span>
                        <span className="text-gray-600">attendees</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendees List View */}
        {view === 'attendees' && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedSession?.title} - Attendees
            </h2>

            {attendeesLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : attendees.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No attendees found for this session.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Attendees List ({attendees.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendees.map((attendee, index) => (
                      <div
                        key={attendee.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {attendee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{attendee.name}</p>
                            <p className="text-sm text-gray-500">{attendee.email}</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(attendee.markedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create Event Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="dialog-form-event w-full max-w-2xl mx-4 sm:mx-auto bg-white text-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0 pb-4 border-b border-gray-200">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                Create Event
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base text-gray-600">
                Fill out the details to create a new event
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4">
              <style dangerouslySetInnerHTML={{
                __html: `
          .dialog-form input,
          .dialog-form textarea,
          .dialog-form [data-radix-select-trigger] {
            color: #000000 !important;
            background-color: #ffffff !important;
          }
          .dialog-form input::placeholder,
          .dialog-form textarea::placeholder {
            color: #6b7280 !important;
          }
          .dialog-form input:focus,
          .dialog-form textarea:focus,
          .dialog-form [data-radix-select-trigger]:focus {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
          }
          
          /* Mobile optimizations */
          @media (max-width: 640px) {
            .dialog-form input,
            .dialog-form textarea,
            .dialog-form [data-radix-select-trigger] {
              font-size: 16px !important;
              padding: 12px !important;
              min-height: 48px !important;
            }
            
            .dialog-form textarea {
              min-height: 120px !important;
            }
            
            .dialog-form button {
              min-height: 48px !important;
              padding: 12px 16px !important;
            }
          }
          
          .dialog-form-scroll::-webkit-scrollbar {
            width: 4px;
          }
          
          .dialog-form-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 2px;
          }
          
          .dialog-form-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 2px;
          }
          
          .dialog-form-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `
              }} />

              <form onSubmit={handleCreateEvent} className="space-y-4 sm:space-y-6 dialog-form px-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700 block"
                    >
                      Event Name *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter event name"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      className="w-full bg-white border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm flex items-start gap-2 mt-1">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="text-sm font-medium text-gray-700 block"
                    >
                      Location
                    </Label>
                    <Input
                      id="location"
                      placeholder="Enter venue or address"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      className="w-full bg-white border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="dateTime"
                      className="text-sm font-medium text-gray-700 block"
                    >
                      Date & Time *
                    </Label>
                    <Input
                      id="dateTime"
                      type="datetime-local"
                      value={eventForm.dateTime}
                      onChange={(e) => setEventForm({ ...eventForm, dateTime: e.target.value })}
                      className="w-full bg-white text-black placeholder:text-gray-500 border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20"
                      style={{ color: 'black', backgroundColor: 'white' }}
                    />
                    {errors.dateTime && (
                      <p className="text-red-500 text-sm flex items-start gap-2 mt-1">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{errors.dateTime}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="status"
                      className="text-sm font-medium text-gray-700 block"
                    >
                      Status
                    </Label>
                    <Select
                      value={eventForm.status}
                      onValueChange={(value) => setEventForm({ ...eventForm, status: value })}
                    >
                      <SelectTrigger className="w-full bg-white text-black border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-black border-gray-300 rounded-lg shadow-lg">
                        <SelectItem
                          value="active"
                          className="text-black hover:bg-gray-50 focus:bg-gray-50 rounded-md"
                        >
                          Active
                        </SelectItem>
                        <SelectItem
                          value="completed"
                          className="text-black hover:bg-gray-50 focus:bg-gray-50 rounded-md"
                        >
                          Completed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="organizerId"
                      className="text-sm font-medium text-gray-700 block"
                    >
                      Organizer ID *
                    </Label>
                    <Input
                      id="organizerId"
                      type="number"
                      placeholder="Enter organizer user ID"
                      value={eventForm.organizerId}
                      onChange={(e) => setEventForm({ ...eventForm, organizerId: e.target.value })}
                      className="w-full bg-white text-black placeholder:text-gray-500 border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20"
                      style={{ color: 'black', backgroundColor: 'white' }}
                    />
                    {errors.organizerId && (
                      <p className="text-red-500 text-sm flex items-start gap-2 mt-1">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{errors.organizerId}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="creatorEmail"
                      className="text-sm font-medium text-gray-700 block"
                    >
                      Creator Email *
                    </Label>
                    <Input
                      id="creatorEmail"
                      type="email"
                      placeholder="creator@example.com"
                      value={eventForm.creatorEmail}
                      onChange={(e) => setEventForm({ ...eventForm, creatorEmail: e.target.value })}
                      className="w-full bg-white text-black placeholder:text-gray-500 border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20"
                      style={{ color: 'black !important', backgroundColor: 'white !important' }}
                    />
                    {errors.creatorEmail && (
                      <p className="text-red-500 text-sm flex items-start gap-2 mt-1">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{errors.creatorEmail}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700 block"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the event"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    className="w-full min-h-[100px] sm:min-h-[120px] bg-white text-black placeholder:text-gray-500 border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 resize-y"
                    style={{ color: 'black !important', backgroundColor: 'white !important' }}
                  />
                </div>
              </form>
            </div>

            <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="w-full sm:w-auto px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors duration-200 rounded-lg shadow-sm hover:shadow-md"
                onClick={handleCreateEvent}
              >
                {createLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Event'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
