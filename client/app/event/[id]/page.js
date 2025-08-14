"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function EventDetailPage() {
  const params = useParams()
  const { id } = params
  const [user, setUser] = useState(null)
  const [event, setEvent] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [registrationForm, setRegistrationForm] = useState({
    specialRequests: "",
    emergencyContact: "",
  })

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)

    // Mock event data - in real app, fetch from backend
    const mockEvents = [
      {
        id: "1",
        name: "Tech Conference 2024",
        date: "2024-03-15",
        description:
          "Annual technology conference featuring the latest trends in software development, AI, and cloud computing.",
        maxAttendees: 100,
        location: "Convention Center, Downtown",
        agenda: [
          "9:00 AM - Registration & Coffee",
          "10:00 AM - Keynote: Future of AI",
          "11:30 AM - Workshop: React Best Practices",
          "1:00 PM - Lunch Break",
          "2:00 PM - Panel: Cloud Architecture",
          "4:00 PM - Networking Session",
        ],
      },
      {
        id: "2",
        name: "Workshop: React Basics",
        date: "2024-03-20",
        description: "Hands-on workshop covering React fundamentals, hooks, and modern development practices.",
        maxAttendees: 50,
        location: "Tech Hub, Room 201",
        agenda: [
          "10:00 AM - Introduction to React",
          "11:00 AM - Components & Props",
          "12:00 PM - Lunch Break",
          "1:00 PM - State & Hooks",
          "3:00 PM - Building a Project",
          "4:30 PM - Q&A Session",
        ],
      },
    ]

    const foundEvent = mockEvents.find((e) => e.id === id)
    setEvent(foundEvent)

    // Check if user is already registered
    const registrations = JSON.parse(localStorage.getItem(`registrations_${currentUser?.id}`) || "[]")
    setIsRegistered(registrations.some((reg) => reg.eventId === id))
  }, [id])

  const handleRegister = (e) => {
    e.preventDefault()

    const attendanceId = Math.random().toString(36).substring(2, 22)
    const registration = {
      eventId: id,
      attendanceId,
      registeredAt: new Date().toISOString(),
      specialRequests: registrationForm.specialRequests,
      emergencyContact: registrationForm.emergencyContact,
    }

    const existingRegistrations = JSON.parse(localStorage.getItem(`registrations_${user.id}`) || "[]")
    const updatedRegistrations = [...existingRegistrations, registration]

    localStorage.setItem(`registrations_${user.id}`, JSON.stringify(updatedRegistrations))
    setIsRegistered(true)

    // Redirect to QR code page
    window.location.href = `/qr/${attendanceId}`
  }

  if (!event) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Event not found</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button onClick={() => window.history.back()} variant="outline">
              ← Back
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Event Details */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{event.name}</CardTitle>
                  <CardDescription>
                    {new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-600">{event.description}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <p className="text-gray-600">{event.location}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Event Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Max Attendees:</span>
                        <p className="text-gray-600">{event.maxAttendees}</p>
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>
                        <p className="text-gray-600">{new Date(event.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {event.agenda && (
                    <div>
                      <h3 className="font-semibold mb-2">Agenda</h3>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {event.agenda.map((item, index) => (
                          <li key={index} className="flex">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Registration Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{isRegistered ? "Already Registered" : "Register for Event"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isRegistered ? (
                    <div className="text-center space-y-4">
                      <div className="text-green-600">✓ You are registered for this event</div>
                      <Button
                        onClick={() => {
                          const registrations = JSON.parse(localStorage.getItem(`registrations_${user.id}`) || "[]")
                          const registration = registrations.find((reg) => reg.eventId === id)
                          if (registration) {
                            window.location.href = `/qr/${registration.attendanceId}`
                          }
                        }}
                        className="w-full"
                      >
                        View QR Code
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Special Requests (Optional)</label>
                        <Textarea
                          placeholder="Dietary restrictions, accessibility needs, etc."
                          value={registrationForm.specialRequests}
                          onChange={(e) =>
                            setRegistrationForm({
                              ...registrationForm,
                              specialRequests: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Emergency Contact (Optional)</label>
                        <Input
                          placeholder="Name and phone number"
                          value={registrationForm.emergencyContact}
                          onChange={(e) =>
                            setRegistrationForm({
                              ...registrationForm,
                              emergencyContact: e.target.value,
                            })
                          }
                        />
                      </div>

                      <Button type="submit" className="w-full">
                        Register Now
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
