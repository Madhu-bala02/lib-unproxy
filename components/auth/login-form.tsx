"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "./auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Loader2, Shield, Clock, User, Eye, EyeOff, UserCog } from "lucide-react"
import { SecurityVerification } from "./security-verification"

export function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [securityVerified, setSecurityVerified] = useState(false)
  const [isLibrarianMode, setIsLibrarianMode] = useState(false)

  const { login } = useAuth()
  const router = useRouter()

  const handleSecurityVerify = (isValid: boolean) => {
    setSecurityVerified(isValid)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!securityVerified) {
      return
    }

    if (isLibrarianMode && username.toLowerCase() !== "librarian") {
      alert("Unauthorized access")
      return
    }

    if (username.toLowerCase() === "librarian" && !isLibrarianMode) {
      alert("Please enable librarian mode to login as librarian")
      return
    }

    setIsLoading(true)

    try {
      const result = await login(username, password)

      if (result.success) {
        if (isLibrarianMode && username.toLowerCase() === "librarian") {
          router.push("/librarian")
        }
      } else {
        router.push("/login-error")
      }
    } catch (error) {
      router.push("/login-error")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full max-w-md space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-900 p-3 rounded-2xl border-2 border-blue-800 shadow-lg">
              <BookOpen className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">Library Management System</h1>
            <p className="text-base sm:text-lg text-gray-700 font-bold">Institutional Access Portal</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-2 border-gray-200 bg-white/95 backdrop-blur-md animate-scale-in overflow-hidden">
          <CardHeader className="text-center pb-8 pt-8">
            <CardTitle className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-2">
              User Authentication
            </CardTitle>
            <CardDescription className="text-gray-700 text-sm sm:text-base font-bold">
              Please enter your credentials to access the library system
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 bg-gradient-to-b from-transparent to-gray-50/30">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isLibrarianMode ? "bg-orange-100" : "bg-blue-100"}`}>
                    <UserCog className={`h-5 w-5 ${isLibrarianMode ? "text-orange-600" : "text-blue-600"}`} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Librarian Mode</span>
                    <p className="text-xs text-gray-500">Access administrative features</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLibrarianMode(!isLibrarianMode)}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isLibrarianMode ? "bg-orange-600 focus:ring-orange-500" : "bg-gray-300 focus:ring-blue-500"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isLibrarianMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Username Field */}
              <div className="space-y-3">
                <Label htmlFor="username" className="text-xs sm:text-sm font-black text-gray-900">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Enter your username"
                    className="h-12 pl-12 border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-xl shadow-md transition-all duration-300 bg-white"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-xs sm:text-sm font-black text-gray-900">
                  Password
                </Label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Enter your password"
                    className="h-12 pl-12 pr-12 border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-xl shadow-md transition-all duration-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Security Verification */}
              <div className="border-t-2 border-gray-200 pt-8">
                <SecurityVerification onVerify={handleSecurityVerify} disabled={isLoading} />
              </div>

              {/* Session Information */}
              {!isLibrarianMode && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-6 rounded-xl shadow-md">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-blue-900 mb-3 sm:mb-4">
                    <Clock className="h-4 w-4" />
                    <span>Session Information</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-blue-800 font-bold">
                    <div className="flex justify-between">
                      <span className="font-bold">Session Duration:</span>
                      <span className="font-black">10 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Auto-logout:</span>
                      <span className="font-black">On inactivity</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                className={`w-full h-10 sm:h-12 ${
                  isLibrarianMode
                    ? "bg-orange-600 hover:bg-orange-700 border-orange-500"
                    : "bg-blue-900 hover:bg-blue-800 border-blue-800"
                } text-white font-black rounded-xl border-2 shadow-lg transition-all duration-300 ${
                  !securityVerified || isLoading
                    ? "opacity-40 cursor-not-allowed hover:bg-blue-900 hover:shadow-lg"
                    : "hover:shadow-xl active:scale-95"
                }`}
                disabled={isLoading || !securityVerified}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="text-xs sm:text-base font-bold">Authenticating...</span>
                  </>
                ) : (
                  <>
                    {isLibrarianMode ? <UserCog className="mr-2 h-5 w-5" /> : <User className="mr-2 h-5 w-5" />}
                    <span className="text-xs sm:text-base font-bold">
                      {isLibrarianMode ? "Sign In as Librarian" : "Sign In to Library"}
                    </span>
                  </>
                )}
              </Button>

              {/* Security Status */}
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-800 font-bold">
                <Shield className="h-4 w-4" />
                <span>Secure Authentication System</span>
                {securityVerified && <span className="text-green-700 font-black ml-2">✓ Verified</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs sm:text-sm text-gray-600 font-bold animate-fade-in">
          <p className="font-black">Library Management System</p>
          <p className="mt-1">Secure Access Portal</p>
        </div>
      </div>
    </div>
  )
}
