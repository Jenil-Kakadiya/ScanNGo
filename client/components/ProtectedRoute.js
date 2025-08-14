"use client"

import { useEffect, useState } from "react"
import { getCurrentUser, isAdmin } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      window.location.href = "/"
      return
    }

    if (requireAdmin && !isAdmin(currentUser)) {
      // Redirect non-admin users trying to access admin routes
      window.location.href = "/dashboard"
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [requireAdmin])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return children
}
