'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, UserCheck, CheckCircle, LogOut, Sparkles, Users, AlertCircle, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';

// Dynamic import for QR scanner (client-side only)
const QrReader = dynamic(() => import("react-qr-reader-es6"), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-200 animate-pulse rounded">Loading camera...</div>,
});

export default function OrganizedEventsPage() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState({
    name: "",
    email: "",
    role: ""
  });
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [eventSessions, setEventSessions] = useState([]); // Array of { id, dayDate, title, sessions: [...] }
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showSessionSelection, setShowSessionSelection] = useState(false);
  const [isDelegateDialogOpen, setIsDelegateDialogOpen] = useState(false);
  const [selectedEventForDelegate, setSelectedEventForDelegate] = useState(null);
  const [delegateForm, setDelegateForm] = useState({
    name: '',
    email: '',
    mobileNo: ''
  });
  const [delegateFormErrors, setDelegateFormErrors] = useState({});
  const [delegateSubmitting, setDelegateSubmitting] = useState(false);
  const [delegateSuccessInfo, setDelegateSuccessInfo] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // Wait a bit to ensure token is available after redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        let token = localStorage.getItem('token');
        
        // If no token, check again after a short delay (might be a race condition)
        if (!token) {
          await new Promise(resolve => setTimeout(resolve, 200));
          token = localStorage.getItem('token');
        }
        
        // Only redirect if token is truly missing (unauthorized)
        if (!token) {
          console.error('No token found in localStorage - user not authenticated');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          return;
        }

        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/user`, {
          method: "GET",
          headers: {
            'Content-Type': "application/json",
            'authorization': `Bearer ${token}`
          },
        });

        // Handle response errors
        if (!userResponse.ok) {
          // Only redirect if it's an authentication/authorization error
          if (userResponse.status === 401 || userResponse.status === 403) {
            console.error('Unauthorized access - invalid token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
            return;
          }
          // For other HTTP errors (500, 404, etc.), show error message but don't redirect
          try {
            const errorData = await userResponse.json();
            console.error('HTTP error fetching user:', userResponse.status, errorData);
            setErrors({ general: errorData.error || `Failed to fetch user details. Please try again. (Status: ${userResponse.status})` });
          } catch (parseError) {
            // If response is not JSON, just show generic error
            console.error('HTTP error fetching user:', userResponse.status);
            setErrors({ general: `Failed to fetch user details. Please try again. (Status: ${userResponse.status})` });
          }
          setLoading(false);
          return;
        }

        const userData = await userResponse.json();

        // Redirect if user is admin (intentional redirect)
        if (userData.role === 'admin') {
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/dashboard';
          }
          return;
        }

        // Success - set user data
        setUser({
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || ''
        });

      } catch (error) {
        console.error('Error fetching user details:', error);
        
        // Only redirect on network/auth errors, not on other errors
        // Check if it's a fetch error (network issue) or actual auth error
        if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
          // Actual auth error - redirect
          console.error('Authentication error - redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        } else {
          // Network error or other error - show message, don't redirect
          console.error('Network or other error:', error);
          setErrors({ general: 'Failed to fetch user details. Please check your connection and try again.' });
          setLoading(false);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch organized events
  const fetchOrganizedEvents = async () => {
    try {
      setEventsLoading(true);
      const token = localStorage.getItem('token');
      
      // If no token, don't make request - but don't redirect (token check already handled in fetchCurrentUser)
      if (!token) {
        console.warn('No token available for fetching organized events');
        setEventsLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/organized`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        },
      });

      // Handle response errors
      if (!response.ok) {
        // If unauthorized, token might be invalid - but don't redirect here, let fetchCurrentUser handle it
        if (response.status === 401 || response.status === 403) {
          console.error('Unauthorized when fetching organized events');
          // Clear invalid token and redirect (user is not authenticated)
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          return;
        }
        
        // For other HTTP errors, try to get error message but don't redirect
        try {
          const errorData = await response.json();
          console.error('HTTP error fetching organized events:', response.status, errorData);
          setOrganizedEvents([]);
          setErrors({ general: errorData.error || `Failed to fetch events. Please try again. (Status: ${response.status})` });
        } catch (parseError) {
          // If response is not JSON, just show generic error
          console.error('HTTP error fetching organized events:', response.status);
          setOrganizedEvents([]);
          setErrors({ general: `Failed to fetch events. Please try again. (Status: ${response.status})` });
        }
        setEventsLoading(false);
        return;
      }

      const data = await response.json();
      
      // Handle response data
      if (data.success) {
        // Handle case when events array is empty, undefined, or null
        if (data.events && Array.isArray(data.events)) {
          const transformedEvents = data.events.map(event => ({
            id: event.id,
            title: event.name,
            date: event.dateTime,
            location: event.location,
            description: event.description,
            status: event.status,
          }));
          setOrganizedEvents(transformedEvents);
          console.log("transformedEvents in organized events page", transformedEvents)
        } else {
          // If events is not an array or doesn't exist, set empty array (user has no events)
          setOrganizedEvents([]);
          console.log("No events found or events is not an array")
        }
        // Clear any previous errors on success
        setErrors({});
      } else {
        // If API call returned success: false, set empty array and show error message
        setOrganizedEvents([]);
        setErrors({ general: data.error || 'Failed to fetch events. Please try again.' });
      }
    } catch (error) {
      // Handle network errors or other exceptions
      console.error('Error fetching organized events:', error);
      
      // Only redirect if it's clearly an auth error
      if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        return;
      }
      
      // For network errors or other errors, show message but don't redirect
      setOrganizedEvents([]);
      setErrors({ general: 'Failed to fetch events. Please check your connection and try again.' });
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && user.role !== 'admin') {
      fetchOrganizedEvents();
    }
  }, [user.role]);

  const handleTakeAttendance = (eventId) => {
    // Open scanner dialog for taking attendance
    const event = organizedEvents.find(ev => ev.id === eventId);
    setSelectedEventForAttendance(event);
    setIsScannerOpen(true);
    setIsScanning(true);
    setScanResult('');
  };

  const handleScan = async (data) => {
    if (data) {
      setIsScanning(false);
      setScanResult(data);
      
      // Extract verification code from scanned data
      const verificationCode = data.trim();
      
      // Validate verification code format (should be 20 characters)
      if (verificationCode.length !== 20) {
        setErrors({ general: 'Invalid QR code format. Please scan a valid attendance QR code.' });
        return;
      }

      // Fetch sessions for the event
      await fetchEventSessions(selectedEventForAttendance.id, verificationCode);
    }
  };

  // Fetch sessions for the event
  const fetchEventSessions = async (eventId, verificationCode) => {
    try {
      setSessionsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setErrors({ general: 'Authentication required' });
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${eventId}/sessions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // If no sessions found, show message but allow to proceed
        if (data.days && data.days.length === 0) {
          setErrors({ general: 'No sessions found for this event. Please add sessions first.' });
          return;
        }
        setErrors({ general: data.error || 'Failed to fetch sessions. Please try again.' });
        return;
      }

      // Store sessions and show selection UI
      setEventSessions(data.days || []);
      setShowSessionSelection(true);
      // Store verification code for later use
      setScanResult(verificationCode);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setSessionsLoading(false);
    }
  };

  const markAttendance = async (verificationCode, sessionId) => {
    try {
      setCheckInLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setErrors({ general: 'Authentication required' });
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/registrations/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          verificationCode: verificationCode,
          sessionId: sessionId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({ general: data.error || 'Failed to mark attendance. Please try again.' });
        return;
      }

      // Check if user is already present
      if (data.alreadyPresent) {
        const userName = data.attendance.user?.name || 'User';
        const sessionTitle = data.attendance.session?.title || 'Session';
        const markedAt = data.attendance.markedAt 
          ? new Date(data.attendance.markedAt).toLocaleString() 
          : 'previously';
        setErrors({ 
          alreadyPresent: true,
          message: `${userName} is already marked as present for ${sessionTitle}. Marked at: ${markedAt}` 
        });
        
        // Clear states but keep scanner open
        setScanResult('');
        setSelectedSessionId(null);
        setShowSessionSelection(false);
        setEventSessions([]);
        
        // Clear message after 5 seconds
        setTimeout(() => {
          setErrors({});
        }, 5000);
      } else {
        // Success - show success message with green tickmark
        const userName = data.attendance.user?.name || 'User';
        const sessionTitle = data.attendance.session?.title || 'Session';
        setErrors({ 
          success: true,
          message: `Attendance marked successfully! ${userName} marked present for ${sessionTitle}.` 
        });
        
        // Clear states
        setScanResult('');
        setSelectedSessionId(null);
        setShowSessionSelection(false);
        setEventSessions([]);
        
        // Refresh events list to update attendee count
        await fetchOrganizedEvents();
        
        // Close scanner after showing success message for 3 seconds
        setTimeout(() => {
          setIsScannerOpen(false);
          setSelectedEventForAttendance(null);
          setErrors({});
        }, 3000);
      }

    } catch (error) {
      console.error('Error marking attendance:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleScanError = (err) => {
    console.error('QR Scanner Error:', err);
    setErrors({ general: 'Camera error. Please check camera permissions and try again.' });
  };

  const startScanning = () => {
    setIsScanning(true);
    setScanResult('');
    setErrors({});
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
    setIsScanning(false);
    setScanResult('');
    setSelectedEventForAttendance(null);
    setErrors({});
    setEventSessions([]);
    setSelectedSessionId(null);
    setShowSessionSelection(false);
  };

  const openDelegateRegistration = (event) => {
    setSelectedEventForDelegate(event);
    setDelegateForm({
      name: '',
      email: '',
      mobileNo: ''
    });
    setDelegateFormErrors({});
    setDelegateSuccessInfo(null);
    setIsDelegateDialogOpen(true);
  };

  const closeDelegateDialog = () => {
    setIsDelegateDialogOpen(false);
    setSelectedEventForDelegate(null);
    setDelegateForm({
      name: '',
      email: '',
      mobileNo: ''
    });
    setDelegateFormErrors({});
    setDelegateSuccessInfo(null);
  };

  const handleDelegateInputChange = (field, value) => {
    setDelegateForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDelegateSubmit = async (event) => {
    event.preventDefault();
    if (!selectedEventForDelegate) {
      setDelegateFormErrors({ general: 'No event selected' });
      return;
    }

    const validationErrors = {};
    if (!delegateForm.name.trim()) {
      validationErrors.name = 'Delegate name is required';
    }
    if (!delegateForm.email.trim()) {
      validationErrors.email = 'Delegate email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(delegateForm.email.trim())) {
      validationErrors.email = 'Please enter a valid email address';
    }
    if (!delegateForm.mobileNo.trim()) {
      validationErrors.mobileNo = 'Mobile number is required';
    }

    if (Object.keys(validationErrors).length > 0) {
      setDelegateFormErrors(validationErrors);
      return;
    }

    try {
      setDelegateSubmitting(true);
      setDelegateFormErrors({});
      setDelegateSuccessInfo(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setDelegateFormErrors({ general: 'Authentication required. Please log in again.' });
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${selectedEventForDelegate.id}/delegates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: delegateForm.name.trim(),
          email: delegateForm.email.trim(),
          mobileNo: delegateForm.mobileNo.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setDelegateFormErrors({
          general: data?.error || 'Failed to register delegate. Please try again.'
        });
        return;
      }

      setDelegateSuccessInfo({
        message: data.message || 'Delegate registered successfully.',
        verificationCode: data.registration?.verificationCode || '',
        temporaryPassword: data.temporaryPassword || ''
      });

      setDelegateForm({
        name: '',
        email: '',
        mobileNo: ''
      });

      await fetchOrganizedEvents();
    } catch (error) {
      console.error('Error registering delegate:', error);
      setDelegateFormErrors({
        general: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setDelegateSubmitting(false);
    }
  };

  const handleMarkComplete = async (eventId) => {
    try {
      setActionLoading({ ...actionLoading, [eventId]: true });
      const token = localStorage.getItem('token');
      
      if (!token) {
        setErrors({ general: 'Authentication required' });
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${eventId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark event as complete');
      }

      // Refresh events list
      await fetchOrganizedEvents();
      setErrors({ success: 'Event marked as complete successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setErrors({});
      }, 3000);

    } catch (error) {
      console.error('Error marking event as complete:', error);
      setErrors({ general: error.message || 'Failed to mark event as complete' });
    } finally {
      setActionLoading({ ...actionLoading, [eventId]: false });
    }
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token");
        sessionStorage.clear();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setLogoutLoading(false);
    }
  };

  // Simple Small Loader Component
  const SmallLoader = () => (
    <div className="flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    </div>
  );

  // Show loading state until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 bg-opacity-80 z-50">
        <div className="text-center">
          <div className="relative flex">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500 animate-ping"></div>
            <div className="absolute w-16 h-16 rounded-full border-4 border-blue-300 animate-pulse"></div>
            <div className="absolute w-16 h-16 rounded-full border-4 border-blue-700 animate-spin"></div>
          </div>
          <p className="text-white/80 mt-6 text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading state for initial user fetch
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 bg-opacity-80 z-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-pink-500 to-violet-500 rounded-full absolute top-0 left-0 animate-ping"></div>
          </div>
          <p className="text-white/80 mt-6 text-lg font-medium">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-rd from-pink-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-violet-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Success/Error Messages */}
            {errors.success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-xl">
                <div className="flex items-center gap-3 text-green-300">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{errors.success}</span>
                </div>
              </div>
            )}
            
            {errors.general && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-xl">
                <div className="flex items-center gap-3 text-red-300">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">{errors.general}</span>
                </div>
              </div>
            )}

            {/* Navigation Bar */}
            <div className="mb-8 sm:mb-12">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 sm:px-6 py-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-violet-500 rounded-xl">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                      My Organized Events
                    </h1>
                    <p className="text-white/60 text-sm">
                      Welcome back, {user.name || 'User'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => router.push('/dashboard')}
                    className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 flex-1 sm:flex-none"
                  >
                    Dashboard
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 min-w-[40px] sm:min-w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {logoutLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent sm:mr-2" />
                    ) : (
                      <LogOut className="w-4 h-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">{logoutLoading ? 'Logging out...' : 'Logout'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Organized Events List */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl hover:shadow-pink-500/10 transition-all duration-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  Events You Organized
                </CardTitle>
                <CardDescription className="text-white/60">
                  Manage your events and track attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventsLoading ? (
                    <div className="text-center py-12">
                      <SmallLoader />
                      <p className="text-white/50 mt-4">Loading events...</p>
                    </div>
                  ) : organizedEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
                      <p className="text-white/50 text-lg font-medium">You haven't organized any events right now.</p>
                      <p className="text-white/40 text-sm mt-2">Start creating events to see them here!</p>
                    </div>
                  ) : (
                    organizedEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="group p-4 sm:p-6 border border-white/10 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl hover:border-pink-500/30 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300 hover:scale-[1.01]"
                      >
                        <div className="flex flex-col gap-4">
                          {/* Event Info */}
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="font-bold text-white text-lg sm:text-xl group-hover:text-pink-300 transition-colors">
                                {event.title}
                              </h3>
                              <span className={`px-3 py-1 text-white text-xs font-medium rounded-full self-start ${
                                event.status === 'completed' 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : 'bg-gradient-to-r from-pink-500 to-purple-500'
                              }`}>
                                {event.status === 'completed' ? 'Completed' : 'Active'}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-white/70 text-sm mb-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <span className="hidden sm:inline">•</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-white/70" />
                              <span className="text-white/70 text-sm">{event.attendees} {event.attendees === 1 ? 'attendee' : 'attendees'}</span>
                            </div>
                            {event.description && (
                              <p className="text-white/60 text-sm mt-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 border-t border-white/10">
                            <Button 
                              onClick={() => handleTakeAttendance(event.id)}
                              disabled={event.status === 'completed' || actionLoading[event.id]}
                              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Take Attendance
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => openDelegateRegistration(event)}
                              disabled={actionLoading[event.id]}
                              className="flex-1 border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Register Delegate
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleMarkComplete(event.id)}
                              disabled={event.status === 'completed' || actionLoading[event.id]}
                              className="flex-1 border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              {actionLoading[event.id] ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className={`w-4 h-4 mr-2 ${event.status === 'completed' ? 'text-green-400' : ''}`} />
                                  {event.status === 'completed' ? 'Completed' : 'Mark Event as Complete'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Scanner Dialog for Taking Attendance */}
            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
              <DialogContent className="border-white/20 bg-slate-900/95 backdrop-blur-xl text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Take Attendance
                  </DialogTitle>
                  <DialogDescription className="text-white/60">
                    {selectedEventForAttendance 
                      ? `Scan QR code for: ${selectedEventForAttendance.title}`
                      : 'Scan attendee QR code to check them in'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Scanner Section */}
                  <div className="flex flex-col items-center space-y-4">
                    {isScanning ? (
                      <div className="w-full space-y-4">
                        <div className="aspect-square w-full max-w-md mx-auto bg-white/10 rounded-xl p-4">
                          <QrReader 
                            delay={300} 
                            onError={handleScanError} 
                            onScan={handleScan} 
                            style={{ width: '100%', height: '100%' }} 
                          />
                        </div>
                        <div className="text-center">
                          <Button 
                            onClick={() => setIsScanning(false)}
                            variant="outline"
                            className="border-white/20 bg-white/10 hover:bg-white/20 text-white"
                          >
                            Stop Scanning
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full space-y-4">
                        <div className="w-full h-64 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                          <p className="text-white/60">Camera preview will appear here</p>
                        </div>
                        <Button 
                          onClick={startScanning}
                          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                        >
                          Start Scanning
                        </Button>
                      </div>
                    )}

                    {/* Scan Result */}
                    {scanResult && !errors.success && !errors.alreadyPresent && !showSessionSelection && (
                      <div className="w-full p-4 bg-white/10 rounded-xl border border-white/20">
                        <p className="text-white/80 text-sm mb-2">Scanned Code:</p>
                        <p className="font-mono text-sm bg-white/10 px-3 py-2 rounded border border-white/20 text-white break-all">
                          {scanResult}
                        </p>
                        {sessionsLoading && (
                          <div className="flex items-center justify-center mt-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                            <span className="ml-2 text-white/80">Loading sessions...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Session Selection */}
                    {showSessionSelection && eventSessions.length > 0 && (
                      <div className="w-full p-4 bg-white/10 rounded-xl border border-white/20 space-y-4">
                        <p className="text-white/80 text-sm font-medium">Select Session:</p>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {eventSessions.map((day) => (
                            <div key={day.id} className="space-y-2">
                              <p className="text-white/60 text-xs font-medium">
                                {day.title || new Date(day.dayDate).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                              {day.sessions && day.sessions.length > 0 ? (
                                day.sessions.map((session) => (
                                  <button
                                    key={session.id}
                                    onClick={() => setSelectedSessionId(session.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                                      selectedSessionId === session.id
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 border-pink-400 text-white'
                                        : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{session.title}</span>
                                      {selectedSessionId === session.id && (
                                        <CheckCircle className="w-4 h-4" />
                                      )}
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <p className="text-white/40 text-xs italic">No sessions for this day</p>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => markAttendance(scanResult, selectedSessionId)}
                            disabled={!selectedSessionId || checkInLoading}
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {checkInLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                Marking...
                              </>
                            ) : (
                              'Mark Attendance'
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setShowSessionSelection(false);
                              setSelectedSessionId(null);
                              setScanResult('');
                            }}
                            variant="outline"
                            className="border-white/20 bg-white/10 hover:bg-white/20 text-white"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {showSessionSelection && eventSessions.length === 0 && !sessionsLoading && (
                      <div className="w-full p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                        <p className="text-yellow-300 text-sm">
                          No sessions found for this event. Please add sessions in the event management page.
                        </p>
                      </div>
                    )}

                    {/* Success Message with Green Tickmark */}
                    {errors.success && (
                      <div className="w-full p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                        <div className="flex items-center gap-3 text-green-300">
                          <CheckCircle className="w-6 h-6 flex-shrink-0 text-green-400" />
                          <span className="font-medium">{errors.message}</span>
                        </div>
                      </div>
                    )}

                    {/* Already Present Message */}
                    {errors.alreadyPresent && (
                      <div className="w-full p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                        <div className="flex items-center gap-3 text-yellow-300">
                          <AlertCircle className="w-6 h-6 flex-shrink-0 text-yellow-400" />
                          <span className="font-medium">{errors.message}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={closeScanner}
                    disabled={checkInLoading}
                    className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Delegate Registration Dialog */}
            <Dialog open={isDelegateDialogOpen} onOpenChange={(open) => open ? setIsDelegateDialogOpen(true) : closeDelegateDialog()}>
              <DialogContent className="border-white/20 bg-slate-900/95 backdrop-blur-xl text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Delegate Registration
                  </DialogTitle>
                  <DialogDescription className="text-white/60">
                    {selectedEventForDelegate
                      ? `Add a delegate for ${selectedEventForDelegate.title}`
                      : 'Fill in the delegate details to register them for this event.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDelegateSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="delegate-name" className="text-white/80">
                      Delegate Name
                    </Label>
                    <Input
                      id="delegate-name"
                      value={delegateForm.name}
                      onChange={(e) => handleDelegateInputChange('name', e.target.value)}
                      placeholder="Enter full name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    {delegateFormErrors.name && (
                      <p className="text-xs text-red-400">{delegateFormErrors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delegate-email" className="text-white/80">
                      Delegate Email
                    </Label>
                    <Input
                      id="delegate-email"
                      type="email"
                      value={delegateForm.email}
                      onChange={(e) => handleDelegateInputChange('email', e.target.value)}
                      placeholder="delegate@example.com"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    {delegateFormErrors.email && (
                      <p className="text-xs text-red-400">{delegateFormErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delegate-mobile" className="text-white/80">
                      Mobile Number
                    </Label>
                    <Input
                      id="delegate-mobile"
                      value={delegateForm.mobileNo}
                      onChange={(e) => handleDelegateInputChange('mobileNo', e.target.value)}
                      placeholder="Enter mobile number"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    {delegateFormErrors.mobileNo && (
                      <p className="text-xs text-red-400">{delegateFormErrors.mobileNo}</p>
                    )}
                  </div>
                  {delegateFormErrors.general && (
                    <div className="p-3 border border-red-500/40 bg-red-500/10 rounded-lg text-sm text-red-300">
                      {delegateFormErrors.general}
                    </div>
                  )}
                  {delegateSuccessInfo && (
                    <div className="p-4 border border-green-500/40 bg-green-500/10 rounded-lg space-y-2">
                      <p className="text-sm text-green-300 font-medium">
                        {delegateSuccessInfo.message}
                      </p>
                      {delegateSuccessInfo.verificationCode && (
                        <div>
                          <span className="text-xs uppercase tracking-wide text-white/50">Verification Code</span>
                          <p className="font-mono text-sm bg-white/10 px-3 py-2 rounded border border-white/20 text-white break-all mt-1">
                            {delegateSuccessInfo.verificationCode}
                          </p>
                        </div>
                      )}
                      {delegateSuccessInfo.temporaryPassword && (
                        <div>
                          <span className="text-xs uppercase tracking-wide text-white/50">Temporary Password</span>
                          <p className="font-mono text-sm bg-white/10 px-3 py-2 rounded border border-white/20 text-white break-all mt-1">
                            {delegateSuccessInfo.temporaryPassword}
                          </p>
                          <p className="text-xs text-white/50 mt-1">
                            Share this password with the delegate so they can log in. They should change it after first login.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDelegateDialog}
                      disabled={delegateSubmitting}
                      className="border-white/20 bg-white/10 hover:bg-white/20 text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={delegateSubmitting}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {delegateSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Saving...
                        </div>
                      ) : (
                        'Save Delegate'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

