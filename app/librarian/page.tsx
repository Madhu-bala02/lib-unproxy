"use client"

import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, LogOut, QrCode, User, Clock } from "lucide-react"
import { QRScanner } from "@/components/librarian/qr-scanner"

export default function LibrarianPage() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.name.toLowerCase() !== "librarian")) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.name.toLowerCase() !== "librarian") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-2 border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-900 p-3 rounded-xl">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Librarian Dashboard</h1>
                <p className="text-gray-600 font-bold">Library Management System</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-700">
                <User className="h-5 w-5" />
                <span className="font-bold">{user.name}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-2 border-red-200 text-red-700 hover:bg-red-50 font-bold bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Welcome Card */}
          <Card className="shadow-xl border-2 border-blue-200 bg-white/95 backdrop-blur-md">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-black text-gray-900 mb-2">Welcome, Librarian</CardTitle>
              <CardDescription className="text-gray-700 font-bold text-base">
                Manage library operations and assist patrons
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-6 rounded-xl">
                <div className="flex items-center gap-2 text-blue-900 mb-4">
                  <Clock className="h-5 w-5" />
                  <span className="font-black text-lg">Quick Actions</span>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => setShowScanner(!showScanner)}
                    className={`w-full h-12 font-black rounded-xl border-2 transition-all duration-300 ${
                      showScanner
                        ? "bg-red-600 hover:bg-red-700 border-red-500 text-white"
                        : "bg-blue-900 hover:bg-blue-800 border-blue-800 text-white"
                    }`}
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    {showScanner ? "Close QR Scanner" : "Open QR Scanner"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Scanner Card */}
          <Card className="shadow-xl border-2 border-blue-200 bg-white/95 backdrop-blur-md">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-black text-gray-900 mb-2">QR Code Scanner</CardTitle>
              <CardDescription className="text-gray-700 font-bold text-base">
                Scan QR codes for book management
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showScanner ? (
                <QRScanner onScan={(data) => console.log("QR Scanned:", data)} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <QrCode className="h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-bold">Click "Open QR Scanner" to start scanning</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
