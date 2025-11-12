"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for token in localStorage (actual auth system)
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    // If no token, user is not authenticated
    if (!token) {
      // Small delay to handle race conditions during redirect
      setTimeout(() => {
        const checkToken = localStorage.getItem('token')
        if (!checkToken) {
          window.location.href = "/"
        } else {
          setIsAuthorized(true)
          setLoading(false)
        }
      }, 100)
      return
    }

    // If requireAdmin is true, check user role
    if (requireAdmin) {
      try {
        const user = userStr ? JSON.parse(userStr) : null
        if (user && user.role !== 'admin') {
          // Non-admin trying to access admin route - redirect
          window.location.href = "/dashboard"
          return
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }

    // User is authenticated
    setIsAuthorized(true)
    setLoading(false)
  }, [requireAdmin])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="text-center text-white">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return children
}
