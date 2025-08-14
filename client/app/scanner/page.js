"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ProtectedRoute from "@/components/ProtectedRoute"

// Dynamic import for QR scanner (client-side only)
import dynamic from "next/dynamic"

const QrReader = dynamic(() => import("react-qr-reader-es6"), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-200 animate-pulse rounded">Loading camera...</div>,
})

export default function ScannerPage() {
  const [user, setUser] = useState(null)
  const [scanResult, setScanResult] = useState("")
  const [scanHistory, setScanHistory] = useState([])
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)

    // Load scan history
    const history = JSON.parse(localStorage.getItem("scan_history") || "[]")
    setScanHistory(history)
  }, [])

  const handleScan = (data) => {
    if (data) {
      setScanResult(data)

      // Add to scan history
      const newScan = {
        id: Date.now().toString(),
        attendanceId: data,
        scannedAt: new Date().toISOString(),
        scannedBy: user?.id,
      }

      const updatedHistory = [newScan, ...scanHistory.slice(0, 9)] // Keep last 10 scans
      setScanHistory(updatedHistory)
      localStorage.setItem("scan_history", JSON.stringify(updatedHistory))

      setIsScanning(false)
    }
  }

  const handleError = (err) => {
    console.error("QR Scanner Error:", err)
  }

  const clearResult = () => {
    setScanResult("")
  }

  const startScanning = () => {
    setIsScanning(true)
    setScanResult("")
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <img src={user?.picture || "/placeholder.svg"} alt={user?.name} className="w-10 h-10 rounded-full" />
              <div>
                <h1 className="text-2xl font-bold">QR Code Scanner</h1>
                <p className="text-gray-600">Scan attendee QR codes</p>
                <Badge variant="destructive">{user?.role}</Badge>
              </div>
            </div>
            <Button onClick={() => (window.location.href = "/admin/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner Section */}
            <Card>
              <CardHeader>
                <CardTitle>Scanner</CardTitle>
              </CardHeader>
              <CardContent>
                {isScanning ? (
                  <div className="space-y-4">
                    <div className="aspect-square w-full max-w-sm mx-auto">
                      <QrReader delay={300} onError={handleError} onScan={handleScan} style={{ width: "100%" }} />
                    </div>
                    <Button onClick={() => setIsScanning(false)} variant="outline" className="w-full">
                      Stop Scanning
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Camera preview will appear here</p>
                    </div>
                    <Button onClick={startScanning} className="w-full">
                      Start Scanning
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card>
              <CardHeader>
                <CardTitle>Scan Result</CardTitle>
              </CardHeader>
              <CardContent>
                {scanResult ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-600 mb-2">Scanned Successfully:</p>
                      <p className="font-mono text-sm bg-white px-3 py-2 rounded border">{scanResult}</p>
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={startScanning} className="flex-1">
                        Scan Another
                      </Button>
                      <Button onClick={clearResult} variant="outline">
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No QR code scanned yet</p>
                    <p className="text-sm">Start scanning to see results here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scanHistory.map((scan) => (
                    <div key={scan.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-mono text-sm">{scan.attendanceId}</span>
                      <span className="text-sm text-gray-600">{new Date(scan.scannedAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
