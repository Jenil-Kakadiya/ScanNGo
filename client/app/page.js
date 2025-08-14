'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import ClientOnly from '@/components/ClientOnly';

export default function AuthPage() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isUserLogin, setIsUserLogin] = useState(true); // true = login, false = register
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNo: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Handle Google OAuth callback
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
        setErrors({ general: 'Error processing authentication data.' });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Only validate additional fields for user registration
    if (!isAdminMode && !isUserLogin) {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      } else if (formData.name.length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }

      if (!formData.mobileNo) {
        newErrors.mobileNo = 'Mobile number is required';
      } else if (!/^[0-9+\-\s()]+$/.test(formData.mobileNo)) {
        newErrors.mobileNo = 'Invalid mobile number format';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let endpoint;
      let payload;

      if (isAdminMode) {
        // Admin login
        endpoint = 'http://localhost:5000/users/login';
        payload = { email: formData.email, password: formData.password };
      } else if (isUserLogin) {
        // User login
        endpoint = 'http://localhost:5000/users/login';
        payload = { email: formData.email, password: formData.password };
      } else {
        // User registration
        endpoint = 'http://localhost:5000/users/register';
        payload = { 
          name: formData.name, 
          email: formData.email, 
          password: formData.password,
          mobileNo: formData.mobileNo,
          role: 'user'
        };
      }

      console.log('Sending request to:', endpoint);
      console.log('Payload:', payload);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.success) {
        // Store user data and token in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        // Show success message briefly
        let successMessage = '';
        if (isAdminMode) {
          successMessage = 'Admin login successful! Redirecting...';
        } else if (isUserLogin) {
          successMessage = 'User login successful! Redirecting...';
        } else {
          successMessage = 'Registration successful! Redirecting...';
        }
        
        setErrors({ success: successMessage });
        
        // Force redirect after 2 seconds
        setTimeout(() => {
          console.log('Redirecting to dashboard...');
          console.log('User role:', data.user.role);
          
          if (data.user.role === 'admin') {
            console.log('Redirecting to admin dashboard');
            window.location.href = '/admin/dashboard';
          } else {
            console.log('Redirecting to user dashboard');
            window.location.href = '/dashboard';
          }
        }, 2000);
        
      } else {
        // Handle error response
        const errorMessage = data.error || data.message || 'Authentication failed';
        setErrors({ general: errorMessage });
        console.error('Authentication failed:', data);
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setIsGoogleLoading(true);
    // Redirect to the Google OAuth endpoint
    window.location.href = 'http://localhost:5000/users/google';
  };

  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isAdminMode ? 'Admin Login' : 'Welcome to ScanNGo'}
            </h1>
            <p className="text-gray-600">
              {isAdminMode 
                ? 'Access your admin dashboard' 
                : 'Join us for seamless event management'
              }
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setIsAdminMode(false);
                  setIsUserLogin(true); // Reset to login when switching to user mode
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  !isAdminMode
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                User
              </button>
              <button
                onClick={() => setIsAdminMode(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isAdminMode
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          {/* User Mode Toggle - Only show when not in admin mode */}
          {!isAdminMode && (
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 p-1 rounded-lg">
                <button
                  onClick={() => setIsUserLogin(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isUserLogin
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setIsUserLogin(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    !isUserLogin
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>
          )}

          {/* Auth Card */}
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">
                {isAdminMode 
                  ? 'Admin Login' 
                  : isUserLogin 
                    ? 'User Login' 
                    : 'Create Account'
                }
              </CardTitle>
              <CardDescription>
                {isAdminMode 
                  ? 'Enter your admin credentials'
                  : isUserLogin
                    ? 'Sign in to your account'
                    : 'Fill in your details to get started'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Field - Only for User Registration */}
                {!isAdminMode && !isUserLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-red-500 text-xs">{errors.name}</p>
                    )}
                  </div>
                )}

                {/* Mobile Number Field - Only for User Registration */}
                {!isAdminMode && !isUserLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="mobileNo" className="text-sm font-medium">
                      Mobile Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="mobileNo"
                        name="mobileNo"
                        type="tel"
                        placeholder="Enter mobile number"
                        value={formData.mobileNo}
                        onChange={handleInputChange}
                        className={`pl-10 ${errors.mobileNo ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.mobileNo && (
                      <p className="text-red-500 text-xs">{errors.mobileNo}</p>
                    )}
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password Field - Only for User Registration */}
                {!isAdminMode && !isUserLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}

                {/* Success Message */}
                {errors.success && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      {errors.success}
                    </AlertDescription>
                  </Alert>
                )}

                {/* General Error */}
                {errors.general && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      {errors.general}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isAdminMode 
                        ? 'Signing In...' 
                        : isUserLogin 
                          ? 'Signing In...' 
                          : 'Creating Account...'
                      }
                    </div>
                  ) : (
                    isAdminMode 
                      ? 'Sign In' 
                      : isUserLogin 
                        ? 'Sign In' 
                        : 'Create Account'
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

                            {/* Google Auth Button - Only available for user mode */}
              {!isAdminMode ? (
                <Button
                  onClick={handleGoogleAuth}
                  variant="outline"
                  className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Redirecting to Google...
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.5 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Google authentication is not available for admin accounts
                </div>
              )}

              {/* Switch Mode Text */}
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  {isAdminMode 
                    ? "Don't have an admin account? " 
                    : isUserLogin 
                      ? "Don't have an account? " 
                      : "Already have an account? "
                  }
                  <button
                    onClick={() => {
                      if (isAdminMode) {
                        // Switch to user mode and show registration
                        setIsAdminMode(false);
                        setIsUserLogin(false);
                      } else {
                        // Toggle between login and register for users
                        setIsUserLogin(!isUserLogin);
                      }
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isAdminMode 
                      ? 'Switch to user registration' 
                      : isUserLogin 
                        ? 'Register here' 
                        : 'Sign in here'
                    }
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientOnly>
  );
}
