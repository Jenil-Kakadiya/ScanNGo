'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserX, CheckCircle2, Users, Ban, ShieldAlert, X, Loader2, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}`;

const AdminUsersPage = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const disableUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/disable`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: 0 })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error disabling user:', error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    const init = async () => {
      const t = localStorage.getItem('token');
      if (!t) {
        router.push('/');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/admin/adminData`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${t}`
          }
        });

        if (!res.ok) throw new Error('Unauthorized');
        const adminData = await res.json();
        if (!adminData || adminData.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        await fetchUsers();
      } catch (e) {
        console.error(e);
        localStorage.removeItem('token');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const q = searchTerm.toLowerCase();
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.personalEmail || u.email || '').toLowerCase().includes(q) ||
      String(u.mobileNo || '').includes(q)
    );
  }, [users, searchTerm]);

  const openDisableDialog = (user) => {
    setSelectedUser(user);
    setDisableDialogOpen(true);
  };

  const closeDisableDialog = () => {
    setDisableDialogOpen(false);
    setSelectedUser(null);
  };

  const confirmDisable = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    const result = await disableUser(selectedUser.id);
    if (result?.success !== false) {
      // Optimistic refresh
      await fetchUsers();
      closeDisableDialog();
    }
    setActionLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-600 mt-1">Manage users and their registrations</p>
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
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading users...</h3>
            <p className="text-gray-500">Please wait while we fetch users</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attended</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Registrations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td className="px-6 py-10 text-center text-gray-500" colSpan={6}>
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        No users found
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                            {(u.name || '?').slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{u.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{u.personalEmail || u.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {u.registrationsCount ?? u.registrations ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {u.attendedCount ?? u.attended ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {u.activeRegistrationsCount ?? u.activeRegistrations ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {Number(u.isActive) === 1 || u.isActive === true ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Ban className="w-3.5 h-3.5" /> Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                          onClick={() => openDisableDialog(u)}
                          disabled={Number(u.isActive) !== 1 && u.isActive !== true}
                          title="Disable user"
                        >
                          <UserX className="w-4 h-4" /> Disable
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {disableDialogOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="w-full max-w-md mx-auto bg-white text-gray-900 overflow-hidden rounded-lg shadow-xl">
              <div className="p-6 border-b border-gray-200 flex items-start gap-3">
                <div className="p-2 rounded-full bg-red-100 text-red-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Disable user?</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    This will prevent {selectedUser.name || 'this user'} from accessing their account. You can re-enable later.
                  </p>
                </div>
                <button onClick={closeDisableDialog} className="ml-auto p-2 hover:bg-gray-100 rounded-md">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Registrations</span>
                    <span className="font-medium">{selectedUser.registrationsCount ?? selectedUser.registrations ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Attended</span>
                    <span className="font-medium">{selectedUser.attendedCount ?? selectedUser.attended ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Active Registrations</span>
                    <span className="font-medium">{selectedUser.activeRegistrationsCount ?? selectedUser.activeRegistrations ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                  <button
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    onClick={closeDisableDialog}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="w-full sm:w-auto px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white inline-flex items-center justify-center gap-2 disabled:bg-red-400"
                    onClick={confirmDisable}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Disabling...
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" /> Disable User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminUsersPage;


