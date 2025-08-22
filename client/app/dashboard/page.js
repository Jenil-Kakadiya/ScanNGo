'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, User, LogOut, Eye, UserPlus, Sparkles, Clock, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

export default function UserDashboard() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [user, setUser] = useState({
    name : "",
    mobileNo: "",
    email: "",
    role : ""
  });
  const [loading, setLoading] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubLoading, setIsSubLoading] = useState(false);

  const upcomingEvents = useMemo(() => {
    return [
      { 
        id: '1', 
        title: 'Tech Conference 2025', 
        date: '2025-09-12', 
        location: 'Innovation Hall A', 
        description: 'A premier conference showcasing cutting-edge technology and innovation. Join industry leaders and pioneers as they share insights on the future of tech.',
        category: 'Technology',
        attendees: 250
      },
      { 
        id: '2', 
        title: 'Design Summit', 
        date: '2025-10-03', 
        location: 'Creative Hub B', 
        description: 'An exclusive summit for product designers and UX professionals. Explore the latest design trends and methodologies.',
        category: 'Design',
        attendees: 180
      },
      { 
        id: '3', 
        title: 'AI Workshop', 
        date: '2025-08-30', 
        location: 'Future Lab 2', 
        description: 'Hands-on workshop focusing on practical AI implementation and machine learning techniques.',
        category: 'AI/ML',
        attendees: 120
      },
    ];
  }, []);

  const registeredEvents = useMemo(() => {
    return [
      { 
        id: 'r1', 
        title: 'Web Dev Bootcamp', 
        date: '2025-07-22', 
        location: 'Development Center 101', 
        description: 'Intensive bootcamp covering modern web development frameworks and best practices.',
        category: 'Development',
        status: 'Confirmed'
      },
    ];
  }, []);

  // Handle Google OAuth callback
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      const error = urlParams.get('error');

      if (error) {
        setErrors({ general: 'Google authentication failed. Please try again.' });
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title || 'Dashboard', window.location.pathname);
        }
        return;
      }

      if (token && userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          
          // Store token and user data in localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          // Show success message
          // setErrors({ success: 'Google authentication successful! Welcome to your dashboard.' });
          
          // Clear URL parameters
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title || 'Dashboard', window.location.pathname);
          }
          
          // Update user state with Google user data
          setUser({
            name: user.name || '',
            email: user.email || '',
            role: user.role || '',
            mobileNo: user.mobileNo || 'Not provided'
          });
          
        } catch (error) {
          console.error('Error parsing user data:', error);
          setErrors({ general: 'Error processing Google authentication data.' });
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title || 'Dashboard', window.location.pathname);
          }
        }
      }
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
    }
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsSubLoading(true);
        
        // Only run on client side
        if (typeof window === 'undefined') return;
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('No token found');
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          return;
        }

        const response = await fetch('http://localhost:5000/users/user', {
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
        // console.log('API Response:', userData);
        
        // Update user state with fetched data
        setUser({
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || '',
          mobileNo: userData.mobileNo || ''
        });

        // console.log('User state will be updated to:', {
        //   name: userData.name || '',
        //   email: userData.email || '',
        //   role: userData.role || '',
        //   mobileNo: userData.mobileNo || ''
        // });

      } catch (error) {
        console.error('Error fetching user details:', error);
        
        // If token is invalid, redirect to login
        if (error.message.includes('401') || error.message.includes('403')) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/';
          }
        }
      } finally {
        setIsSubLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');

    if (error) {
      setErrors({ general: 'Google authentication failed. Please try again.' });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Store user data and token in localStorage
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        
        // Show success message
        setErrors({ success: 'Google authentication successful! Redirecting...' });
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          if (user.role === 'admin') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/dashboard';
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error parsing user data:', error);
        // setErrors({ general: 'Error processing authentication data.' });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Monitor user state changes
  // useEffect(() => {
  //   // console.log('User state changed to:', user);
  // }, [user]);

  const openDetails = async (eventObj) => {
    try {
      setLoading(true);
      // Simulate small delay for better UX
      // await new Promise(resolve => setTimeout(resolve, 200));
      setSelectedEvent(eventObj);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error('Failed to open details:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRegister = async (eventObj) => {
    try {
      setLoading(true);
      // Simulate small delay for better UX
      // await new Promise(resolve => setTimeout(resolve, 200));
      setSelectedEvent(eventObj);
      setIsRegisterOpen(true);
    } catch (error) {
      console.error('Failed to open register:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setRegisterLoading(true);
      // Simulate API call delay - replace with actual registration logic
      // await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add success animation or notification here
      setIsRegisterOpen(false);
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      // Simulate logout delay - replace with actual logout logic if needed
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token");   // remove JWT
        sessionStorage.clear();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setLogoutLoading(false);
    }
  };

  const handleAccountClick = async () => {
    try {
      setAccountLoading(true);
      // Simulate small delay for better UX
      // await new Promise(resolve => setTimeout(resolve, 200));
      setIsAccountOpen(true);
    } catch (error) {
      console.error('Account click failed:', error);
    } finally {
      setAccountLoading(false);
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
          <p className="text-white/80 mt-6 text-lg font-medium">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  // Full page loading for initial load
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 bg-opacity-80 z-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-pink-500 to-violet-500 rounded-full absolute top-0 left-0 animate-ping"></div>
          </div>
          <p className="text-white/80 mt-6 text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
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
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-violet-500 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                  <p className="text-white/60 text-sm hidden sm:block">
                    Welcome back, {isSubLoading ? <SmallLoader /> : user.name || 'User'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleAccountClick}
                  disabled={accountLoading}
                  className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 min-w-[40px] sm:min-w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {accountLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent sm:mr-2" />
                  ) : (
                    <User className="w-4 h-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">{accountLoading ? 'Opening...' : 'Account'}</span>
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <Card className="border-none bg-gradient-to-r from-rose-900 to-purple-900 backdrop-blur-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Total Events</p>
                    <p className="text-3xl font-bold text-white">
                      {isSubLoading ? <SmallLoader /> : upcomingEvents.length}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-pink-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none bg-gradient-to-r from-red-500 to-purple-900 backdrop-blur-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Registered</p>
                    <p className="text-3xl font-bold text-white">
                      {isSubLoading ? <SmallLoader /> : registeredEvents.length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-gradient-to-r from-pink-600 to-purple-900 backdrop-blur-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">This Month</p>
                    <p className="text-3xl font-bold text-white">2</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-gradient-to-r from-slate-500 to-purple-900 backdrop-blur-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Member Since</p>
                    <p className="text-lg font-bold text-white">
                      {isSubLoading ? <SmallLoader /> : '2024'}
                    </p>
                  </div>
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events Content */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
            {/* Upcoming Events */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl hover:shadow-pink-500/10 transition-all duration-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  Upcoming Events
                </CardTitle>
                <CardDescription className="text-white/60">
                  Discover and register for exciting upcoming events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.map((ev) => (
                    <div key={ev.id} className="group p-6 border border-white/10 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl hover:border-pink-500/30 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300 hover:scale-[1.02]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-white text-lg group-hover:text-pink-300 transition-colors">
                              {ev.title}
                            </h3>
                            <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-medium rounded-full">
                              {ev.category}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-white/70 text-sm mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(ev.date).toLocaleDateString()}</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{ev.location}</span>
                            </div>
                          </div>
                          <p className="text-white/60 text-sm">
                            {ev.attendees} attendees expected
                          </p>
                        </div>
                        <div className="flex gap-2 sm:flex-col lg:flex-row">
                          <Button 
                            variant="outline" 
                            onClick={() => openDetails(ev)}
                            className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Details</span>
                          </Button>
                          <Button 
                            onClick={() => openRegister(ev)}
                            disabled={registerLoading}
                            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            {registerLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            ) : (
                              <UserPlus className="w-4 h-4 mr-2" />
                            )}
                            {registerLoading ? 'Registering...' : 'Register'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isSubLoading ? (
                    <div className="text-center py-12">
                      <SmallLoader />
                      <p className="text-white/50 mt-4">Loading events...</p>
                    </div>
                  ) : upcomingEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
                      <p className="text-white/50">No upcoming events at the moment.</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Registered Events */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  Your Events
                </CardTitle>
                <CardDescription className="text-white/60">
                  Events you have successfully registered for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {registeredEvents.map((ev) => (
                    <div key={ev.id} className="group p-6 border border-white/10 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-[1.02]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">
                              {ev.title}
                            </h3>
                            <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium rounded-full">
                              {ev.status}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-white/70 text-sm mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(ev.date).toLocaleDateString()}</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{ev.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm font-medium">Registration Confirmed</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => openDetails(ev)}
                            className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isSubLoading ? (
                    <div className="text-center py-12">
                      <SmallLoader />
                      <p className="text-white/50 mt-4">Loading your events...</p>
                    </div>
                  ) : registeredEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
                      <p className="text-white/50">You haven't registered for any events yet.</p>
                      <p className="text-white/40 text-sm mt-2">Browse upcoming events to get started!</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Dialog */}
          <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
            <DialogContent className="border-white/20 bg-slate-900/95 backdrop-blur-xl text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Account Details
                </DialogTitle>
                <DialogDescription className="text-white/60">
                  Your profile information and settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                                  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                    <p className="text-white/80 text-sm mb-1">Full Name</p>
                    <p className="text-white font-semibold text-lg">
                      {isSubLoading ? <SmallLoader /> : user.name || 'Loading...'}
                    </p>
                  </div>
                  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                    <p className="text-white/80 text-sm mb-1">Email Address</p>
                    <p className="text-white font-semibold">
                      {isSubLoading ? <SmallLoader /> : user.email || 'Loading...'}
                    </p>
                  </div>
                  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                    <p className="text-white/80 text-sm mb-1">Membership</p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      {isSubLoading ? <SmallLoader /> : user.role || 'Loading...'}
                      {!isSubLoading && user.role && (
                        <span className="px-2 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-xs rounded-full">PREMIUM</span>
                      )}
                    </p>
                  </div>
                  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                    <p className="text-white/80 text-sm mb-1">Mobile Number</p>
                    <p className="text-white font-semibold">
                      {isSubLoading ? <SmallLoader /> : user.mobileNo || 'Loading...'}
                    </p>
                  </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAccountOpen(false)}
                  className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300"
                >
                  Close
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 transition-all duration-300 hover:scale-105"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="border-white/20 bg-slate-900/95 backdrop-blur-xl text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  {selectedEvent?.title}
                </DialogTitle>
                <DialogDescription className="text-white/60 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {selectedEvent && new Date(selectedEvent.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent?.location}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedEvent?.category && (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-full">
                      {selectedEvent.category}
                    </span>
                    {selectedEvent?.attendees && (
                      <span className="text-white/60 text-sm">
                        {selectedEvent.attendees} attendees expected
                      </span>
                    )}
                  </div>
                )}
                <div className="p-6 border border-white/10 rounded-xl bg-white/5 backdrop-blur-xl">
                  <p className="text-white/90 leading-relaxed">{selectedEvent?.description}</p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailsOpen(false)}
                  className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Register Dialog */}
          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogContent className="border-white/20 bg-slate-900/95 backdrop-blur-xl text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Register for {selectedEvent?.title}
                </DialogTitle>
                <DialogDescription className="text-white/60">
                  Confirm your registration for this event
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedEvent && (
                  <div className="p-6 border border-white/10 rounded-xl bg-white/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold text-lg">{selectedEvent.title}</h3>
                      <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-full">
                        {selectedEvent.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-white/70 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedEvent.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedEvent.location}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsRegisterOpen(false)}
                  className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRegister}
                  disabled={registerLoading}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {registerLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  {registerLoading ? 'Confirming...' : 'Confirm Registration'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}