'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, MapPin, User, Clock, Eye, Edit, Trash2, AlertCircle, Filter, X } from 'lucide-react';

// Mock data - replace with your actual API calls
const mockEvents = [
  {
    id: 1,
    name: "Tech Conference 2024",
    description: "Annual technology conference featuring the latest innovations in AI, blockchain, and web development. Join industry leaders and innovators for two days of inspiring talks, networking, and hands-on workshops.",
    location: "San Francisco Convention Center",
    dateTime: "2024-03-15T09:00",
    status: "active",
    organizerId: 101,
    creatorEmail: "john@techconf.com",
    attendees: 250,
    category: "Technology"
  },
  {
    id: 2,
    name: "Marketing Summit",
    description: "Explore the future of digital marketing with expert speakers and interactive sessions covering social media, SEO, content marketing, and analytics.",
    location: "Downtown Convention Hall",
    dateTime: "2024-04-20T10:00",
    status: "active",
    organizerId: 102,
    creatorEmail: "sarah@marketingsummit.com",
    attendees: 180,
    category: "Business"
  },
  {
    id: 3,
    name: "Art Exhibition Opening",
    description: "Contemporary art exhibition featuring local and international artists. Experience unique installations, paintings, and sculptures in our newly renovated gallery space.",
    location: "Modern Art Gallery",
    dateTime: "2024-05-10T18:00",
    status: "active",
    organizerId: 103,
    creatorEmail: "curator@modernart.com",
    attendees: 120,
    category: "Arts"
  },
  {
    id: 4,
    name: "Startup Pitch Competition",
    description: "Young entrepreneurs showcase their innovative ideas to a panel of investors and industry experts. Network with fellow entrepreneurs and witness the next big startup ideas.",
    location: "Innovation Hub",
    dateTime: "2024-02-28T14:00",
    status: "completed",
    organizerId: 104,
    creatorEmail: "events@innovationhub.com",
    attendees: 95,
    category: "Business"
  },
  {
    id: 5,
    name: "Music Festival",
    description: "Three-day outdoor music festival featuring indie, rock, and electronic artists from around the world. Food trucks, art installations, and camping available.",
    location: "Riverside Park",
    dateTime: "2024-06-15T16:00",
    status: "active",
    organizerId: 105,
    creatorEmail: "info@musicfest.com",
    attendees: 500,
    category: "Entertainment"
  }
];

const EventsManagementPage = () => {
  const [events, setEvents] = useState(mockEvents);
  const [user, setUser] = useState(null)
  const [filteredEvents, setFilteredEvents] = useState(mockEvents);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createLoading, setCreateLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Event form state
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    location: '',
    dateTime: '',
    status: 'active',
    organizerId: '',
    creatorEmail: '',
    category: 'Business'
  });

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
        event.category.toLowerCase().includes(searchTerm.toLowerCase())
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
      status: 'active',
      organizerId: '',
      creatorEmail: '',
      category: 'Business'
    });
    setErrors({});
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!eventForm.name.trim()) newErrors.name = 'Event name is required';
    if (!eventForm.dateTime) newErrors.dateTime = 'Date and time is required';
    if (!eventForm.organizerId) newErrors.organizerId = 'Organizer ID is required';
    if (!eventForm.creatorEmail.trim()) newErrors.creatorEmail = 'Creator email is required';
    else if (!/\S+@\S+\.\S+/.test(eventForm.creatorEmail)) newErrors.creatorEmail = 'Invalid email format';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle create event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setCreateLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newEvent = {
      ...eventForm,
      id: Date.now(),
      attendees: 0
    };
    
    setEvents([newEvent, ...events]);
    setCreateLoading(false);
    setIsCreateOpen(false);
    resetForm();
  };

  // Handle edit event
  const handleEditEvent = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setCreateLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedEvents = events.map(event =>
      event.id === selectedEvent.id ? { ...eventForm, id: selectedEvent.id, attendees: selectedEvent.attendees } : event
    );
    
    setEvents(updatedEvents);
    setCreateLoading(false);
    setIsEditOpen(false);
    resetForm();
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  // Open view dialog
  const openViewDialog = (event) => {
    setSelectedEvent(event);
    setIsViewOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (event) => {
    setSelectedEvent(event);
    setEventForm({
      name: event.name,
      description: event.description,
      location: event.location,
      dateTime: event.dateTime,
      status: event.status,
      organizerId: event.organizerId.toString(),
      creatorEmail: event.creatorEmail,
      category: event.category
    });
    setIsEditOpen(true);
  };

  // Delete event
  const handleDeleteEvent = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(event => event.id !== eventId));
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
            <button
              onClick={openCreateDialog}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search events by name, description, location, or category..."
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
          {filteredEvents.length === 0 ? (
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

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {event.category}
                    </span>
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
                        Organizer ID *
                      </label>
                      <input
                        id="organizerId"
                        type="number"
                        placeholder="Enter organizer user ID"
                        value={eventForm.organizerId}
                        onChange={(e) => setEventForm({ ...eventForm, organizerId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
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

                    <div className="space-y-2">
                      <label htmlFor="category" className="text-sm font-medium text-gray-700 block">
                        Category
                      </label>
                      <select
                        id="category"
                        value={eventForm.category}
                        onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="Business">Business</option>
                        <option value="Technology">Technology</option>
                        <option value="Arts">Arts</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Education">Education</option>
                        <option value="Sports">Sports</option>
                        <option value="Health">Health</option>
                        <option value="Other">Other</option>
                      </select>
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
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {selectedEvent.category}
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
                    </div>
                  </div>
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