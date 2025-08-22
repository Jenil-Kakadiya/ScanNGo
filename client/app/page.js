'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, Phone, Shield, Sparkles, Chrome, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isUserLogin, setIsUserLogin] = useState(true);
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
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');

    if (error) {
      setErrors({ general: 'Google authentication failed. Please try again.' });
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Store user data in state instead of localStorage
        setErrors({ success: 'Google authentication successful! Redirecting...' });
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setTimeout(() => {
          if (user.role === 'admin') {
            // console.log('Redirecting to admin dashboard');
          } else {
            // console.log('Redirecting to user dashboard');
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error parsing user data:', error);
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

      // console.log('Sending request to:', endpoint);
      // console.log('Payload:', payload);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // console.log('Response status:', response.status);
      const data = await response.json();
      // console.log('Response data:', data);

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
        
        // Set redirecting state to keep button disabled
        setIsRedirecting(true);
        
        // Force redirect after 2 seconds
        setTimeout(() => {
          // console.log('Redirecting to dashboard...');
          // console.log('User role:', data.user.role);
          
          if (data.user.role === 'admin') {
            // console.log('Redirecting to admin dashboard');
            window.location.href = '/admin/dashboard';
          } else {
            // console.log('Redirecting to user dashboard');
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

  // Show redirecting overlay
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 bg-opacity-80 z-50">
      <div className="relative flex">
        <div className="w-16 h-16 rounded-full border-4 border-blue-500 animate-ping"></div>
        <div className="absolute w-16 h-16 rounded-full border-4 border-blue-300 animate-pulse"></div>
        <div className="absolute w-16 h-16 rounded-full border-4 border-blue-700 animate-spin"></div>
      </div>
      <p className="ml-6 text-white text-xl font-semibold animate-pulse">Loading...</p>
    </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-violet-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-pink-500/60 rounded-full animate-ping delay-100"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-blue-500/60 rounded-full animate-ping delay-300"></div>
        <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-purple-500/40 rounded-full animate-ping delay-700"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-cyan-500/60 rounded-full animate-ping delay-500"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-pink-500 to-violet-500 rounded-2xl shadow-2xl">
                {isAdminMode ? (
                  <Shield className="w-8 h-8 text-white" />
                ) : (
                  <Sparkles className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-3">
              {isAdminMode ? 'Admin Portal' : 'Welcome to ScanNGo'}
            </h1>
            <p className="text-white/70 text-lg">
              {isAdminMode 
                ? 'Access your administrative dashboard' 
                : 'Join the future of seamless event management'
              }
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/20 shadow-2xl">
              <button
                onClick={() => {
                  setIsAdminMode(false);
                  setIsUserLogin(true);
                }}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  !isAdminMode
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg transform scale-105'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4 mr-2 inline" />
                User Portal
              </button>
              <button
                onClick={() => setIsAdminMode(true)}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  isAdminMode
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Shield className="w-4 h-4 mr-2 inline" />
                Admin Portal
              </button>
            </div>
          </div>

          {/* User Mode Toggle */}
          {!isAdminMode && (
            <div className="flex justify-center mb-8">
              <div className="bg-blue-500/20 backdrop-blur-xl p-1 rounded-2xl border border-blue-500/30 shadow-xl">
                <button
                  onClick={() => setIsUserLogin(true)}
                  className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isUserLogin
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsUserLogin(false)}
                  className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    !isUserLogin
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>
          )}

          {/* Auth Card */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl hover:shadow-pink-500/10 transition-all duration-500">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isAdminMode 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                    : isUserLogin 
                      ? 'bg-gradient-to-br from-pink-500 to-purple-500'
                      : 'bg-gradient-to-br from-green-500 to-emerald-500'
                }`}>
                  {isAdminMode ? (
                    <Shield className="w-5 h-5" />
                  ) : isUserLogin ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                {isAdminMode 
                  ? 'Admin Access' 
                  : isUserLogin 
                    ? 'Welcome Back' 
                    : 'Join Us Today'
                }
              </CardTitle>
              <CardDescription className="text-white/60 text-base">
                {isAdminMode 
                  ? 'Enter your administrative credentials to continue'
                  : isUserLogin
                    ? 'Sign in to access your personalized dashboard'
                    : 'Create your account and start your journey with us'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-5">
                {/* Name Field */}
                {!isAdminMode && !isUserLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-white/90">
                      Full Name
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5 group-focus-within:text-pink-400 transition-colors" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`pl-12 pr-4 py-3 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder-white/50 rounded-xl focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300 ${errors.name ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                      />
                    </div>
                    {errors.name && (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {errors.name}
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Number Field */}
                {!isAdminMode && !isUserLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="mobileNo" className="text-sm font-semibold text-white/90">
                      Mobile Number
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5 group-focus-within:text-green-400 transition-colors" />
                      <Input
                        id="mobileNo"
                        name="mobileNo"
                        type="tel"
                        placeholder="Enter mobile number"
                        value={formData.mobileNo}
                        onChange={handleInputChange}
                        className={`pl-12 pr-4 py-3 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder-white/50 rounded-xl focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 ${errors.mobileNo ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                      />
                    </div>
                    {errors.mobileNo && (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {errors.mobileNo}
                      </div>
                    )}
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-white/90">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5 group-focus-within:text-blue-400 transition-colors" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`pl-12 pr-4 py-3 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder-white/50 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 ${errors.email ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-white/90">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`pl-12 pr-12 py-3 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder-white/50 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 ${errors.password ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password}
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                {!isAdminMode && !isUserLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-white/90">
                      Confirm Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5 group-focus-within:text-cyan-400 transition-colors" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`pl-12 pr-12 py-3 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder-white/50 rounded-xl focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {errors.confirmPassword}
                      </div>
                    )}
                  </div>
                )}

                {/* Success Message */}
                {errors.success && (
                  <Alert className="border-green-500/30 bg-green-500/10 backdrop-blur-xl">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <AlertDescription className="text-green-300 font-medium ml-2">
                      {errors.success}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Message */}
                {errors.general && (
                  <Alert className="border-red-500/30 bg-red-500/10 backdrop-blur-xl">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <AlertDescription className="text-red-300 font-medium ml-2">
                      {errors.general}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || isRedirecting}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-2xl ${
                    isAdminMode 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 hover:shadow-blue-500/25'
                      : isUserLogin 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 hover:shadow-pink-500/25'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:shadow-green-500/25'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent bg-gradient-to-r from-white to-white/50 rounded-full"></div>
                      <span>
                        {isAdminMode 
                          ? 'Authenticating...' 
                          : isUserLogin 
                            ? 'Signing You In...' 
                            : 'Creating Your Account...'
                        }
                      </span>
                    </div>
                  ) : isRedirecting ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent bg-gradient-to-r from-white to-white/50 rounded-full"></div>
                      <span>
                        {isAdminMode 
                          ? 'Redirecting to Admin Dashboard...' 
                          : 'Redirecting to Dashboard...'
                        }
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg">
                      {isAdminMode 
                        ? 'Access Admin Portal' 
                        : isUserLogin 
                          ? 'Sign In to Continue' 
                          : 'Create My Account'
                      }
                    </span>
                  )}
                </Button>
                
              </div>
              {/* Divider */}
              <div className="relative my-8">
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 text-white/60 font-medium border-rounded">Or continue with</span>
                </div>
              </div>

              {/* Google Auth Button */}
              {!isAdminMode ? (
                <Button
                  onClick={handleGoogleAuth}
                  disabled={isGoogleLoading}
                  className="w-full py-4 px-6 rounded-xl font-semibold border border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  {isGoogleLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                      <span>Connecting to Google...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <Chrome className="w-5 h-5" />
                      <span>Continue with Google</span>
                    </div>
                  )}
                </Button>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    Admin accounts require direct authentication
                  </div>
                </div>
              )}

              {/* Switch Mode Text */}
              <div className="text-center mt-8 pt-6 border-t border-white/10">
                <p className="text-white/70 mb-3">
                  {isAdminMode 
                    ? "Need a regular user account?" 
                    : isUserLogin 
                      ? "New to our platform?" 
                      : "Already have an account?"
                  }
                </p>
                <button
                  onClick={() => {
                    if (isAdminMode) {
                      setIsAdminMode(false);
                      setIsUserLogin(false);
                    } else {
                      setIsUserLogin(!isUserLogin);
                    }
                  }}
                  className="text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text hover:from-pink-300 hover:to-purple-300 font-bold text-lg transition-all duration-300 hover:scale-105"
                >
                  {isAdminMode 
                    ? 'Create User Account →' 
                    : isUserLogin 
                      ? 'Join Us Today →' 
                      : 'Sign In Instead →'
                  }
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-white/40 text-sm">
            <p>© 2025 ScanNGo. Powered by innovation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}