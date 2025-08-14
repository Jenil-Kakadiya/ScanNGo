"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProtectedRoute from "@/components/ProtectedRoute"

// Dynamic import for QR code component (client-side only)
import dynamic from "next/dynamic"

const QRCodeSVG = dynamic(() => import("react-qr-code"), {
  ssr: false,
  loading: () => <div className="w-64 h-64 bg-gray-200 animate-pulse rounded"></div>,
})

export default function QRCodePage() {
  const params = useParams()
  const { attendanceId } = params
  const [user, setUser] = useState(null)
  const [eventInfo, setEventInfo] = useState(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)

    // Find the event info for this attendance ID
    const registrations = JSON.parse(localStorage.getItem(`registrations_${currentUser?.id}`) || "[]")
    const registration = registrations.find((reg) => reg.attendanceId === attendanceId)

    if (registration) {
      // Mock event data - in real app, fetch from backend
      const mockEvents = [
        { id: "1", name: "Tech Conference 2024", date: "2024-03-15" },
        { id: "2", name: "Workshop: React Basics", date: "2024-03-20" },
        { id: "3", name: "Networking Event", date: "2024-03-25" },
      ]

      const event = mockEvents.find((e) => e.id === registration.eventId)
      setEventInfo(event)
    }
  }, [attendanceId])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button onClick={() => window.history.back()} variant="outline">
              ← Back
            </Button>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Your Event QR Code</CardTitle>
              {eventInfo && (
                <div className="text-gray-600">
                  <p className="font-medium">{eventInfo.name}</p>
                  <p>Date: {new Date(eventInfo.date).toLocaleDateString()}</p>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG value={attendanceId} size={256} level="M" />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Attendance ID:</p>
                <p className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">{attendanceId}</p>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>Show this QR code at the event entrance</p>
                <p>Keep this page accessible offline</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
