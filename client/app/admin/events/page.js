'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, MapPin, User, Clock, Eye, Edit, Trash2, AlertCircle, Filter, X, LayoutDashboard, CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';

// API base URL
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}`;

const EventsManagementPage = () => {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createLoading, setCreateLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  
  // Statistics state variables
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [activeEvents, setActiveEvents] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);

  const router = useRouter();

  // Event form state
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    location: '',
    dateTime: '',
    startDate: '',
    endDate: '',
    status: 'active',
    organizerId: '',
    creatorEmail: '',
    certificateEnabled: false,
    certificateSessionIds: [], // Array of { dayIndex, sessionIndex }
    days: [] // Array of { dayDate, title, sessions: [{ title }] }
  });

  // API Functions
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/allUsers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
        setFilteredEvents(data.events);
      } else {
        console.error('Failed to fetch events:', data.error);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const createEvent = async (eventData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/events/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchEvents(); // Refresh events list
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error creating event:', error);
      return { success: false, error: error.message };
    }
  };

  const updateEvent = async (eventId, eventData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchEvents(); // Refresh events list
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error updating event:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchEvents(); // Refresh events list
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      return { success: false, error: error.message };
    }
  };

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

        // Fetch users and events after successful authentication
        await fetchUsers();
        await fetchEvents();
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
  // Filter and search events
  useEffect(() => {
    let filtered = events;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.creatorEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredEvents(filtered);
  }, [events, searchTerm, statusFilter]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Reset form
  const resetForm = () => {
    setEventForm({
      name: '',
      description: '',
      location: '',
      dateTime: '',
      startDate: '',
      endDate: '',
      status: 'active',
      organizerId: '',
      creatorEmail: '',
      certificateEnabled: false,
      certificateSessionIds: [],
      days: []
    });
    setErrors({});
  };

  // Helper functions for managing days and sessions
  const addDay = () => {
    setEventForm({
      ...eventForm,
      days: [...eventForm.days, { dayDate: '', title: '', sessions: [] }]
    });
  };

  const removeDay = (dayIndex) => {
    setEventForm({
      ...eventForm,
      days: eventForm.days.filter((_, index) => index !== dayIndex)
    });
  };

  const updateDay = (dayIndex, field, value) => {
    const updatedDays = [...eventForm.days];
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], [field]: value };
    setEventForm({ ...eventForm, days: updatedDays });
  };

  const addSession = (dayIndex) => {
    const updatedDays = [...eventForm.days];
    updatedDays[dayIndex].sessions = [...updatedDays[dayIndex].sessions, { title: '' }];
    setEventForm({ ...eventForm, days: updatedDays });
  };

  const removeSession = (dayIndex, sessionIndex) => {
    const updatedDays = [...eventForm.days];
    updatedDays[dayIndex].sessions = updatedDays[dayIndex].sessions.filter((_, index) => index !== sessionIndex);
    setEventForm({ ...eventForm, days: updatedDays });
  };

  const updateSession = (dayIndex, sessionIndex, value) => {
    const updatedDays = [...eventForm.days];
    updatedDays[dayIndex].sessions[sessionIndex].title = value;
    setEventForm({ ...eventForm, days: updatedDays });
  };

  // Toggle certificate session selection
  const toggleCertificateSession = (dayIndex, sessionIndex) => {
    const certKey = { dayIndex, sessionIndex };
    const isSelected = eventForm.certificateSessionIds.some(
      id => id.dayIndex === dayIndex && id.sessionIndex === sessionIndex
    );
    
    if (isSelected) {
      // Remove from selection
      setEventForm({
        ...eventForm,
        certificateSessionIds: eventForm.certificateSessionIds.filter(
          id => !(id.dayIndex === dayIndex && id.sessionIndex === sessionIndex)
        )
      });
    } else {
      // Add to selection
      setEventForm({
        ...eventForm,
        certificateSessionIds: [...eventForm.certificateSessionIds, certKey]
      });
    }
  };

  // Check if session is selected for certificate
  const isSessionSelectedForCertificate = (dayIndex, sessionIndex) => {
    return eventForm.certificateSessionIds.some(
      id => id.dayIndex === dayIndex && id.sessionIndex === sessionIndex
    );
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!eventForm.name.trim()) newErrors.name = 'Event name is required';
    if (!eventForm.dateTime) newErrors.dateTime = 'Date and time is required';
    if (!eventForm.organizerId) newErrors.organizerId = 'Organizer is required';
    if (!eventForm.creatorEmail.trim()) newErrors.creatorEmail = 'Creator email is required';
    else if (!/\S+@\S+\.\S+/.test(eventForm.creatorEmail)) newErrors.creatorEmail = 'Invalid email format';
    
    // Validate days
    if (eventForm.days.length > 0) {
      eventForm.days.forEach((day, dayIndex) => {
        if (!day.dayDate) {
          newErrors[`day_${dayIndex}_date`] = 'Day date is required';
        }
        day.sessions.forEach((session, sessionIndex) => {
          if (!session.title.trim()) {
            newErrors[`day_${dayIndex}_session_${sessionIndex}`] = 'Session title is required';
          }
        });
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle create event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setCreateLoading(true);
    
    try {
      // Prepare event data with days and sessions
      const eventData = {
        name: eventForm.name,
        description: eventForm.description,
        location: eventForm.location,
        dateTime: eventForm.dateTime,
        startDate: eventForm.startDate || null,
        endDate: eventForm.endDate || null,
        status: eventForm.status,
        organizerId: eventForm.organizerId,
        creatorEmail: eventForm.creatorEmail,
        certificateEnabled: eventForm.certificateEnabled,
        certificateSessionIds: eventForm.certificateEnabled ? eventForm.certificateSessionIds : [],
        days: eventForm.days.map(day => ({
          dayDate: day.dayDate,
          title: day.title || null,
          sessions: day.sessions.map(session => ({
            title: session.title
          }))
        }))
      };
      
      const result = await createEvent(eventData);
      
      if (result.success) {
        setIsCreateOpen(false);
        resetForm();
      } else {
        console.error('Failed to create event:', result.error);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle edit event
  const handleEditEvent = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setCreateLoading(true);
    
    try {
      // Prepare event data with days and sessions
      const eventData = {
        name: eventForm.name,
        description: eventForm.description,
        location: eventForm.location,
        dateTime: eventForm.dateTime,
        startDate: eventForm.startDate || null,
        endDate: eventForm.endDate || null,
        status: eventForm.status,
        organizerId: eventForm.organizerId,
        creatorEmail: eventForm.creatorEmail,
        certificateEnabled: eventForm.certificateEnabled,
        certificateSessionIds: eventForm.certificateEnabled ? eventForm.certificateSessionIds : [],
        days: eventForm.days.map(day => ({
          dayDate: day.dayDate,
          title: day.title || null,
          sessions: day.sessions.map(session => ({
            title: session.title
          }))
        }))
      };
      
      const result = await updateEvent(selectedEvent.id, eventData);
      
      if (result.success) {
        setIsEditOpen(false);
        resetForm();
      } else {
        console.error('Failed to update event:', result.error);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error('Error updating event:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  // Open view dialog
  const openViewDialog = async (event) => {
    // Fetch full event details with days and sessions
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/events/${event.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedEvent(data.event);
      } else {
        // Fallback to basic event data
        setSelectedEvent(event);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      // Fallback to basic event data
      setSelectedEvent(event);
    }
    
    setIsViewOpen(true);
  };

  // Open edit dialog
  const openEditDialog = async (event) => {
    setSelectedEvent(event);
    
    // Fetch event with days and sessions
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/events/${event.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const eventData = data.event;
        
        // Format days and sessions if they exist
        const days = eventData.days || [];
        
        setEventForm({
          name: event.name,
          description: event.description || '',
          location: event.location || '',
          dateTime: event.dateTime ? new Date(event.dateTime).toISOString().slice(0, 16) : '',
          startDate: event.startDate || '',
          endDate: event.endDate || '',
          status: event.status,
          organizerId: event.organizerId.toString(),
          creatorEmail: event.creatorEmail,
          days: days.map(day => ({
            dayDate: day.dayDate || '',
            title: day.title || '',
            sessions: (day.sessions || []).map(session => ({ title: session.title || '' }))
          }))
        });
      } else {
        // Fallback to basic event data
        setEventForm({
          name: event.name,
          description: event.description || '',
          location: event.location || '',
          dateTime: event.dateTime ? new Date(event.dateTime).toISOString().slice(0, 16) : '',
          startDate: event.startDate || '',
          endDate: event.endDate || '',
          status: event.status,
          organizerId: event.organizerId.toString(),
          creatorEmail: event.creatorEmail,
          days: []
        });
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      // Fallback to basic event data
      setEventForm({
        name: event.name,
        description: event.description || '',
        location: event.location || '',
        dateTime: event.dateTime ? new Date(event.dateTime).toISOString().slice(0, 16) : '',
        startDate: event.startDate || '',
        endDate: event.endDate || '',
        status: event.status,
        organizerId: event.organizerId.toString(),
        creatorEmail: event.creatorEmail,
        days: []
      });
    }
    
    setIsEditOpen(true);
  };

  // Delete event
  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const result = await deleteEvent(eventId);
        if (!result.success) {
          console.error('Failed to delete event:', result.error);
          // You could add a toast notification here
        }
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Events Management</h1>
              <p className="text-gray-600 mt-1">Manage and organize your events</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors duration-200"
                title="Go to Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={openCreateDialog}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                Create Event
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search events by name, description, location, or creator email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading events...</h3>
              <p className="text-gray-500">Please wait while we fetch your events</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                        {event.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {event.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{formatDate(event.dateTime)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{event.attendees} attendees</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewDialog(event)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditDialog(event)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                        title="Edit Event"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Event Dialog */}
        {(isCreateOpen || isEditOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-auto bg-white text-gray-900 max-h-[90vh] overflow-hidden flex flex-col rounded-lg shadow-xl">
              <div className="flex-shrink-0 p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {isCreateOpen ? 'Create Event' : 'Edit Event'}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">
                      {isCreateOpen ? 'Fill out the details to create a new event' : 'Update the event details'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsCreateOpen(false);
                      setIsEditOpen(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={isCreateOpen ? handleCreateEvent : handleEditEvent} className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium text-gray-700 block">
                        Event Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="Enter event name"
                        value={eventForm.name}
                        onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm flex items-start gap-2 mt-1">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                          <span>{errors.name}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="location" className="text-sm font-medium text-gray-700 block">
                        Location
                      </label>
                      <input
                        id="location"
                        type="text"
                        placeholder="Enter venue or address"
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="dateTime" className="text-sm font-medium text-gray-700 block">
                        Date & Time *
                      </label>
                      <input
                        id="dateTime"
                        type="datetime-local"
                        value={eventForm.dateTime}
                        onChange={(e) => setEventForm({ ...eventForm, dateTime: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      {errors.dateTime && (
                        <p className="text-red-500 text-sm flex items-start gap-2 mt-1">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                          <span>{errors.dateTime}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="startDate" className="text-sm font-medium text-gray-700 block">
                        Start Date
                      </label>
                      <input
                        id="startDate"
                        type="date"
                        value={eventForm.startDate}
                        onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="endDate" className="text-sm font-medium text-gray-700 block">
                        End Date
                      </label>
                      <input
                        id="endDate"
                        type="date"
                        value={eventForm.endDate}
                        onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="status" className="text-sm font-medium text-gray-700 block">
                        Status
                      </label>
                      <select
                        id="status"
                        value={eventForm.status}
                        onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="organizerId" className="text-sm font-medium text-gray-700 block">
                        Organizer *
                      </label>
                      <select
                        id="organizerId"
                        value={eventForm.organizerId}
                        onChange={(e) => setEventForm({ ...eventForm, organizerId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="">Select an organizer</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      {errors.organizerId && (
                        <p className="text-red-500 text-sm flex items-start gap-2 mt-1">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                          <span>{errors.organizerId}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="creatorEmail" className="text-sm font-medium text-gray-700 block">
                        Creator Email *
                      </label>
                      <input
                        id="creatorEmail"
                        type="email"
                        placeholder="creator@example.com"
                        value={eventForm.creatorEmail}
                        onChange={(e) => setEventForm({ ...eventForm, creatorEmail: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    <label htmlFor="description" className="text-sm font-medium text-gray-700 block">
                      Description
                    </label>
                    <textarea
                      id="description"
                      placeholder="Describe the event"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
                    />
                  </div>

                  {/* Certificate Section */}
                  <div className="lg:col-span-2 space-y-4 border-t border-gray-200 pt-6">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <input
                        type="checkbox"
                        id="certificateEnabled"
                        checked={eventForm.certificateEnabled}
                        onChange={(e) => {
                          setEventForm({
                            ...eventForm,
                            certificateEnabled: e.target.checked,
                            certificateSessionIds: e.target.checked ? eventForm.certificateSessionIds : []
                          });
                        }}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="certificateEnabled" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Enable Certificate for this Event
                      </label>
                    </div>
                    {eventForm.certificateEnabled && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> Select sessions (checkboxes) that users must attend to be eligible for certification.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Event Days and Sessions Section */}
                  <div className="lg:col-span-2 space-y-4 border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-gray-700" />
                        <h3 className="text-lg font-semibold text-gray-900">Event Days & Sessions</h3>
                      </div>
                      <button
                        type="button"
                        onClick={addDay}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Day
                      </button>
                    </div>

                    {eventForm.days.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No days added yet. Click "Add Day" to create event days with sessions.</p>
                    )}

                    {eventForm.days.map((day, dayIndex) => (
                      <div key={dayIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="text-md font-medium text-gray-900">Day {dayIndex + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeDay(dayIndex)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                            title="Remove Day"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                              Day Date *
                            </label>
                            <input
                              type="date"
                              value={day.dayDate}
                              onChange={(e) => updateDay(dayIndex, 'dayDate', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            {errors[`day_${dayIndex}_date`] && (
                              <p className="text-red-500 text-sm flex items-start gap-2 mt-1">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{errors[`day_${dayIndex}_date`]}</span>
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                              Day Title (e.g., "Day 1 - AI Summit")
                            </label>
                            <input
                              type="text"
                              placeholder="Day title (optional)"
                              value={day.title}
                              onChange={(e) => updateDay(dayIndex, 'title', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Sessions for this day */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Sessions</label>
                            <button
                              type="button"
                              onClick={() => addSession(dayIndex)}
                              className="flex items-center gap-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors duration-200 text-sm"
                            >
                              <Plus className="w-3 h-3" />
                              Add Session
                            </button>
                          </div>

                          {day.sessions.length === 0 && (
                            <p className="text-xs text-gray-500 italic">No sessions added for this day.</p>
                          )}

                          {day.sessions.map((session, sessionIndex) => (
                            <div key={sessionIndex} className="flex items-center gap-2 bg-white p-3 rounded border border-gray-200">
                              {eventForm.certificateEnabled && (
                                <input
                                  type="checkbox"
                                  checked={isSessionSelectedForCertificate(dayIndex, sessionIndex)}
                                  onChange={() => toggleCertificateSession(dayIndex, sessionIndex)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  title="Required for certificate"
                                />
                              )}
                              <input
                                type="text"
                                placeholder="Session title"
                                value={session.title}
                                onChange={(e) => updateSession(dayIndex, sessionIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => removeSession(dayIndex, sessionIndex)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                                title="Remove Session"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {errors[`day_${dayIndex}_session_${sessionIndex}`] && (
                                <p className="text-red-500 text-xs">
                                  {errors[`day_${dayIndex}_session_${sessionIndex}`]}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </form>
              </div>

              <div className="flex-shrink-0 p-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createLoading}
                  onClick={isCreateOpen ? handleCreateEvent : handleEditEvent}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors duration-200 rounded-lg shadow-sm hover:shadow-md"
                >
                  {createLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {isCreateOpen ? 'Creating...' : 'Updating...'}
                    </div>
                  ) : (
                    isCreateOpen ? 'Create Event' : 'Update Event'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Event Dialog */}
        {isViewOpen && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-auto bg-white text-gray-900 max-h-[90vh] overflow-hidden flex flex-col rounded-lg shadow-xl">
              <div className="flex-shrink-0 p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Event Details
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">
                      View complete event information
                    </p>
                  </div>
                  <button
                    onClick={() => setIsViewOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedEvent.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          selectedEvent.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedEvent.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedEvent.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                      <p className="text-gray-600 leading-relaxed">
                        {selectedEvent.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Date & Time
                        </h4>
                        <p className="text-gray-900">{formatDate(selectedEvent.dateTime)}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location
                        </h4>
                        <p className="text-gray-900">{selectedEvent.location || 'Not specified'}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Attendees
                        </h4>
                        <p className="text-gray-900">{selectedEvent.attendees} registered</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Organizer ID</h4>
                        <p className="text-gray-900">{selectedEvent.organizerId}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Creator Email</h4>
                        <p className="text-gray-900">
                          <a href={`mailto:${selectedEvent.creatorEmail}`} className="text-blue-600 hover:text-blue-700">
                            {selectedEvent.creatorEmail}
                          </a>
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Event ID</h4>
                        <p className="text-gray-900 font-mono text-sm">{selectedEvent.id}</p>
                      </div>

                      {selectedEvent.startDate && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Start Date</h4>
                          <p className="text-gray-900">{new Date(selectedEvent.startDate).toLocaleDateString()}</p>
                        </div>
                      )}

                      {selectedEvent.endDate && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">End Date</h4>
                          <p className="text-gray-900">{new Date(selectedEvent.endDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Days and Sessions */}
                  {selectedEvent.days && selectedEvent.days.length > 0 && (
                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CalendarDays className="w-5 h-5 text-gray-700" />
                        <h4 className="text-lg font-semibold text-gray-900">Event Days & Sessions</h4>
                      </div>
                      <div className="space-y-4">
                        {selectedEvent.days.map((day, dayIndex) => (
                          <div key={dayIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="mb-3">
                              <h5 className="font-medium text-gray-900 mb-1">
                                {day.title || `Day ${dayIndex + 1}`}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {day.dayDate ? new Date(day.dayDate).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                }) : 'Date not set'}
                              </p>
                            </div>
                            {day.sessions && day.sessions.length > 0 && (
                              <div className="mt-3">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Sessions:</h6>
                                <ul className="space-y-2">
                                  {day.sessions.map((session, sessionIndex) => (
                                    <li key={sessionIndex} className="flex items-center gap-2 text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                                      <Clock className="w-4 h-4 text-gray-500" />
                                      <span>{session.title}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(!day.sessions || day.sessions.length === 0) && (
                              <p className="text-xs text-gray-500 italic mt-2">No sessions for this day</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
                <button 
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsViewOpen(false);
                    openEditDialog(selectedEvent);
                  }}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 rounded-lg shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          input,
          textarea,
          select {
            font-size: 16px !important; /* Prevents zoom on iOS */
            padding: 12px !important;
            min-height: 48px !important; /* Touch target size */
          }
          
          textarea {
            min-height: 120px !important;
          }
          
          button {
            min-height: 48px !important;
            padding: 12px 16px !important;
          }
        }

        /* Custom scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 2px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Smooth animations */
        * {
          transition: all 0.2s ease-in-out;
        }

        /* Focus states */
        input:focus,
        textarea:focus,
        select:focus {
          outline: none;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }

        /* Hover effects */
        .hover\\:shadow-md:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .hover\\:shadow-lg:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        /* Card hover effects */
        .bg-white:hover {
          transform: translateY(-1px);
        }

        /* Button loading state */
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive grid adjustments */
        @media (min-width: 1024px) {
          .grid-cols-1.lg\\:grid-cols-2.xl\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .grid-cols-1.lg\\:grid-cols-2.xl\\:grid-cols-3 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Status badge styles */
        .bg-green-100 {
          background-color: #dcfce7;
        }
        
        .text-green-800 {
          color: #166534;
        }
        
        .bg-gray-100 {
          background-color: #f3f4f6;
        }
        
        .text-gray-800 {
          color: #1f2937;
        }
        
        .bg-blue-100 {
          background-color: #dbeafe;
        }
        
        .text-blue-800 {
          color: #1e40af;
        }

        /* Modal backdrop animation */
        .fixed.inset-0 {
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Modal content animation */
        .fixed.inset-0 > div {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default EventsManagementPage;