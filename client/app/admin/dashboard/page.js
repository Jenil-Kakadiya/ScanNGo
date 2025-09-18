'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '../../../components/AdminNavbar'

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [activeEvents, setActiveEvents] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewEventsOpen, setIsViewEventsOpen] = useState(false);
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
      // Check if user is authenticated and is admin
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No user data or token found, redirecting to login');
        router.push('/');
        return;
      }
      try {
        const response = await fetch('http://localhost:5000/admin/adminData', {
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

        // Check if user is admin
        if (userData.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setUser(userData);
        // console.log('Admin authenticated:', userObj);

        // Set statistics from API response
        if (userData.stats) {
          setTotalUsers(userData.stats.totalUsers || 0);
          setActiveUsers(userData.stats.activeUsers || 0);
          setTotalEvents(userData.stats.totalEvents || 0);
          setActiveEvents(userData.stats.activeEvents || 0);
          setTotalRegistrations(userData.stats.totalRegistrations || 0);
        }

        // Prefill creatorEmail for create event form
        setEventForm((prev) => ({
          ...prev,
          creatorEmail: userData.email || ''
        }));
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

      // Placeholder: wire this to your API endpoint, e.g., POST /events
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/admin/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(eventForm)
      });

      // console.log('Submitting event payload:', eventForm);
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
    } catch (err) {
      console.error(err);
      setErrors({ general: 'Failed to create event. Please try again.' });
    } finally {
      setCreateLoading(false);
    }
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

        {/* Header */}
        {/* <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}!</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div> */}

        <AdminNavbar
          user={user}
          onCreateEvent={() => setIsCreateOpen(true)}
          onLogout={handleLogout}
        />

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Total registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvents}</div>
              <p className="text-xs text-muted-foreground">All created events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEvents}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRegistrations}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button className="w-full" variant="outline">
                  View All Users
                </Button>
                <Button className="w-full" variant="outline">
                  Create User
                </Button>
                <Button className="w-full" variant="outline">
                  Manage Roles
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Management</CardTitle>
              <CardDescription>Create and manage events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => setIsCreateOpen(true)}
                >
                  Create Event
                </Button>
                <Button className="w-full" variant="outline"
                  onClick={() => setIsViewEventsOpen(true)}
                >
                  View All Events
                </Button>
                <Button className="w-full" variant="outline">
                  Event Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button className="w-full" variant="outline">
                  General Settings
                </Button>
                <Button className="w-full" variant="outline">
                  Security Settings
                </Button>
                <Button className="w-full" variant="outline">
                  Backup & Restore
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
              font-size: 16px !important; /* Prevents zoom on iOS */
              padding: 12px !important;
              min-height: 48px !important; /* Touch target size */
            }
            
            .dialog-form textarea {
              min-height: 120px !important;
            }
            
            .dialog-form button {
              min-height: 48px !important;
              padding: 12px 16px !important;
            }
          }
          
          /* Scrollbar styling */
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
