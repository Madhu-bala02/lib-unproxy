"use client"

import type React from "react"
import { useRef, useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Camera,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  BookOpen,
  User,
  Calendar,
  Clock,
  Scan,
  Upload,
  Trash2,
  Hash,
} from "lucide-react"
import { API_CONFIG } from "@/lib/config"

interface QRScannerProps {
  onScan: (data: string) => void
}

interface LibraryReservation {
  type: string
  reservation_id: string
  book_title: string
  user_name: string
  user_id: string
  requested_date: string
  issued_date: string
  status: string
  library: string
}

export function QRScanner({ onScan }: QRScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [error, setError] = useState<string | null>(null)
  const [reservationData, setReservationData] = useState<LibraryReservation | null>(null)
  const [isIssuing, setIsIssuing] = useState(false)
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [jsQRLoaded, setJsQRLoaded] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera")

  useEffect(() => {
    const loadJsQR = async () => {
      try {
        const jsQRModule = await import("jsqr")
        const jsQR = jsQRModule.default

        if (jsQR && typeof jsQR === "function") {
          ;(window as any).jsQR = jsQR
          setJsQRLoaded(true)
        } else {
          throw new Error("jsQR is not a function or is undefined")
        }
      } catch (error) {
        setError(`Failed to load QR scanning library: ${error}. Please refresh the page.`)
      }
    }

    loadJsQR()
  }, [])

  const applyThreshold = useCallback((imageData: ImageData, threshold = 128): Uint8ClampedArray => {
    const data = new Uint8ClampedArray(imageData.data.length)
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = Math.round(0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2])
      const binary = gray > threshold ? 255 : 0
      data[i] = binary // R
      data[i + 1] = binary // G
      data[i + 2] = binary // B
      data[i + 3] = imageData.data[i + 3] // A
    }
    return data
  }, [])

  const applyGaussianBlur = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.filter = "blur(1px)"
    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (tempCtx) {
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      tempCtx.drawImage(canvas, 0, 0)
      ctx.filter = "none"
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(tempCanvas, 0, 0)
    }
  }, [])

  const applyAdaptiveThreshold = useCallback((imageData: ImageData): Uint8ClampedArray => {
    const data = new Uint8ClampedArray(imageData.data.length)
    const width = imageData.width
    const height = imageData.height
    const windowSize = 15
    const k = 0.2

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4

        // Calculate local mean
        let sum = 0
        let count = 0
        const halfWindow = Math.floor(windowSize / 2)

        for (let dy = -halfWindow; dy <= halfWindow; dy++) {
          for (let dx = -halfWindow; dx <= halfWindow; dx++) {
            const ny = y + dy
            const nx = x + dx
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nIdx = (ny * width + nx) * 4
              const gray = Math.round(
                0.299 * imageData.data[nIdx] + 0.587 * imageData.data[nIdx + 1] + 0.114 * imageData.data[nIdx + 2],
              )
              sum += gray
              count++
            }
          }
        }

        const mean = sum / count
        const currentGray = Math.round(
          0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2],
        )
        const threshold = mean * (1 - k)
        const binary = currentGray > threshold ? 255 : 0

        data[idx] = binary // R
        data[idx + 1] = binary // G
        data[idx + 2] = binary // B
        data[idx + 3] = imageData.data[idx + 3] // A
      }
    }
    return data
  }, [])

  const processImageForQR = useCallback(
    async (imageDataUrl: string) => {
      if (!(window as any).jsQR) {
        setError("QR scanning library not loaded")
        return
      }

      setIsProcessingImage(true)
      setError(null)

      try {
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          try {
            const canvas = canvasRef.current
            if (!canvas) {
              throw new Error("Canvas element not found")
            }

            const ctx = canvas.getContext("2d")
            if (!ctx) {
              throw new Error("Could not get canvas context")
            }

            // Calculate optimal size (max 1000px on longest side for performance)
            const maxSize = 1000
            let newWidth = img.width
            let newHeight = img.height

            if (img.width > maxSize || img.height > maxSize) {
              const ratio = Math.min(maxSize / img.width, maxSize / img.height)
              newWidth = Math.floor(img.width * ratio)
              newHeight = Math.floor(img.height * ratio)
            }

            canvas.width = newWidth
            canvas.height = newHeight

            // Clear and draw image
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, newWidth, newHeight)

            const jsQR = (window as any).jsQR
            let qrCode = null

            // Method 1: Original image
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            })

            if (qrCode && qrCode.data) {
              handleQRDetection(qrCode.data)
              return
            }

            // Method 2: Gaussian blur to reduce noise
            applyGaussianBlur(ctx, canvas)
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            })

            if (qrCode && qrCode.data) {
              handleQRDetection(qrCode.data)
              return
            }

            // Redraw original for next methods
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, newWidth, newHeight)
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

            // Method 3: Multiple threshold values
            const thresholds = [100, 128, 150, 180, 200]
            for (let i = 0; i < thresholds.length; i++) {
              const thresholdData = applyThreshold(imageData, thresholds[i])
              qrCode = jsQR(thresholdData, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth",
              })

              if (qrCode && qrCode.data) {
                handleQRDetection(qrCode.data)
                return
              }
            }

            // Method 4: Adaptive threshold
            const adaptiveData = applyAdaptiveThreshold(imageData)
            qrCode = jsQR(adaptiveData, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            })

            if (qrCode && qrCode.data) {
              handleQRDetection(qrCode.data)
              return
            }

            // Method 5: Contrast and brightness adjustments
            const adjustments = [
              { contrast: 150, brightness: 110 },
              { contrast: 200, brightness: 120 },
              { contrast: 120, brightness: 90 },
              { contrast: 180, brightness: 100 },
            ]

            for (let i = 0; i < adjustments.length; i++) {
              // Redraw with filter
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              ctx.filter = `contrast(${adjustments[i].contrast}%) brightness(${adjustments[i].brightness}%)`
              ctx.drawImage(img, 0, 0, newWidth, newHeight)
              ctx.filter = "none"

              const adjustedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              qrCode = jsQR(adjustedImageData.data, adjustedImageData.width, adjustedImageData.height, {
                inversionAttempts: "attemptBoth",
              })

              if (qrCode && qrCode.data) {
                handleQRDetection(qrCode.data)
                return
              }
            }
            // Method 6: Different scales
            const scales = [0.5, 0.75, 1.25, 1.5, 2.0]
            for (let i = 0; i < scales.length; i++) {
              const scale = scales[i]
              const scaledWidth = Math.floor(newWidth * scale)
              const scaledHeight = Math.floor(newHeight * scale)

              if (scaledWidth > 0 && scaledHeight > 0 && scaledWidth < 4000 && scaledHeight < 4000) {
                canvas.width = scaledWidth
                canvas.height = scaledHeight
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.imageSmoothingEnabled = false
                ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

                const scaledImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                qrCode = jsQR(scaledImageData.data, scaledImageData.width, scaledImageData.height, {
                  inversionAttempts: "attemptBoth",
                })

                if (qrCode && qrCode.data) {
                  handleQRDetection(qrCode.data)
                  return
                }
              }
            }

            // Method 7: Region scanning with overlaps
            canvas.width = newWidth
            canvas.height = newHeight
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, newWidth, newHeight)

            const regionSize = Math.min(canvas.width, canvas.height) * 0.6
            const step = regionSize * 0.3

            for (let y = 0; y <= canvas.height - regionSize; y += step) {
              for (let x = 0; x <= canvas.width - regionSize; x += step) {
                try {
                  const regionData = ctx.getImageData(x, y, regionSize, regionSize)
                  qrCode = jsQR(regionData.data, regionData.width, regionData.height, {
                    inversionAttempts: "attemptBoth",
                  })

                  if (qrCode && qrCode.data) {
                    handleQRDetection(qrCode.data)
                    return
                  }
                } catch (regionError) {
                  // Continue to next region
                }
              }
            }

            // Method 8: Edge detection preprocessing
            canvas.width = newWidth
            canvas.height = newHeight
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.filter = "contrast(200%) brightness(100%) saturate(0%)"
            ctx.drawImage(img, 0, 0, newWidth, newHeight)
            ctx.filter = "none"

            const edgeImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            qrCode = jsQR(edgeImageData.data, edgeImageData.width, edgeImageData.height, {
              inversionAttempts: "attemptBoth",
            })

            if (qrCode && qrCode.data) {
              handleQRDetection(qrCode.data)
              return
            }

            setError("No QR code detected. Please try again with better lighting and positioning.")
          } catch (processingError) {
            setError(`Failed to process image: ${processingError}`)
          } finally {
            setIsProcessingImage(false)
          }
        }

        img.onerror = () => {
          setError("Failed to load the image. Please try again.")
          setIsProcessingImage(false)
        }

        img.src = imageDataUrl
      } catch (setupError) {
        setError(`Failed to setup image processing: ${setupError}`)
        setIsProcessingImage(false)
      }
    },
    [applyThreshold, applyGaussianBlur, applyAdaptiveThreshold],
  )

  const handleCameraCapture = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith("image/")) {
        setError("Please capture an image")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string
        if (imageDataUrl) {
          setCapturedImage(imageDataUrl)
          processImageForQR(imageDataUrl)
        } else {
          setError("Failed to read the captured photo")
        }
      }

      reader.onerror = () => {
        setError("Failed to read the captured photo")
      }

      reader.readAsDataURL(file)
    },
    [processImageForQR],
  )

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string
        if (imageDataUrl) {
          setCapturedImage(imageDataUrl)
          processImageForQR(imageDataUrl)
        } else {
          setError("Failed to read the selected file")
        }
      }

      reader.onerror = () => {
        setError("Failed to read the selected file")
      }

      reader.readAsDataURL(file)
    },
    [processImageForQR],
  )

  const openCamera = useCallback(() => {
    if (!jsQRLoaded) {
      setError("QR scanning library not loaded. Please wait and try again.")
      return
    }

    setError(null)
    setCapturedImage(null)

    // Reset the input
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ""
    }

    // Trigger camera
    cameraInputRef.current?.click()
  }, [jsQRLoaded])

  const handleQRDetection = useCallback(
    (qrData: string) => {
      try {
        onScan(qrData)

        // Try to parse as JSON
        try {
          const parsedData = JSON.parse(qrData)

          if (parsedData.type === "library_reservation") {
            setReservationData(parsedData)
            setIssueSuccess("✅ Library reservation QR code scanned successfully!")
            return
          } else {
            setError(`Unknown QR code type: ${parsedData.type}. Please scan a library reservation QR code.`)
            return
          }
        } catch (parseError) {
          setError(`QR code detected: "${qrData.substring(0, 100)}..." - Please scan a library reservation QR code.`)
        }

        // Auto-clear error
        setTimeout(() => setError(null), 5000)
      } catch (error) {
        setError("Error processing QR code data. Please try again.")
      }
    },
    [onScan],
  )

  const issueBook = async () => {
    if (!reservationData) {
      return
    }

    setIsIssuing(true)
    setError(null)
    setIssueSuccess(null)

    try {
      const staticCsrfToken = "IERwWSyc1aQ2-gy3Tzng-Mo6ew-2u65427ObEXLOdOE"
      const staticSessionCookie =
        "SSESSf94ed8b53d402a49a7fee58b5adc2d84=TTci9GmvXmPeG0c9i%2C6%2CF9kKfjkwZZ%2CcNaLIcTvsyM1BaCR8"
      const staticAuth = "Basic bGlicmFyaWFuOmE="

      const url = new URL("/web/api/requested-book/issue?_format=json", API_CONFIG.BASE_URL).toString()

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": staticCsrfToken,
          Authorization: staticAuth,
          Cookie: staticSessionCookie,
        },
        body: JSON.stringify({
          id: reservationData.reservation_id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (
        response.ok &&
        (result === "Book has been issued successfully." ||
          (typeof result === "string" && result.includes("successfully")))
      ) {
        let successMessage = "Book has been issued successfully!"

        if (result === "Book has been issued successfully.") {
          successMessage = "Book has been issued successfully!"
        } else if (typeof result === "string" && result.includes("successfully")) {
          successMessage = result
        }

        setIssueSuccess(successMessage)
        setShowSuccessDialog(true)

        setTimeout(() => {
          setShowSuccessDialog(false)
          setReservationData(null)
          setIssueSuccess(null)
        }, 3000)
      } else {
        const errorMsg = result?.error || "Failed to issue book"
        throw new Error(errorMsg)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(`Failed to issue book: ${errorMessage}`)
    } finally {
      setIsIssuing(false)
    }
  }

  const resetScanner = useCallback(() => {
    setError(null)
    setReservationData(null)
    setIssueSuccess(null)
    setCapturedImage(null)
    setIsProcessingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }, [])

  const clearCapturedImage = useCallback(() => {
    setCapturedImage(null)
    setError(null)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 px-4 sm:px-0">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Success!
            </DialogTitle>
            <DialogDescription className="text-center py-4">
              <div className="text-lg font-semibold text-green-800">{issueSuccess}</div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={() => setShowSuccessDialog(false)} className="bg-green-600 hover:bg-green-700">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* jsQR Loading Status */}
      {!jsQRLoaded && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-800 font-semibold text-sm">Loading QR scanner...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Mode Toggle */}
      <Card className="border-gray-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setScanMode("camera")}
              variant={scanMode === "camera" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-10"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan
            </Button>
            <Button
              onClick={() => setScanMode("upload")}
              variant={scanMode === "upload" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-10"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Scanner Interface */}
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Scan className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanMode === "camera" ? (
            <div className="space-y-4">
              <div className="text-center">
                <Button
                  onClick={openCamera}
                  disabled={isProcessingImage || !jsQRLoaded}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 text-base rounded-lg w-full sm:w-auto"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {isProcessingImage ? "Processing..." : "Scan QR Code"}
                </Button>
              </div>

              {capturedImage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Captured Image:</h4>
                    <Button onClick={clearCapturedImage} variant="outline" size="sm" className="text-xs bg-transparent">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={capturedImage || "/placeholder.svg"}
                      alt="Captured for QR scanning"
                      className="w-full h-40 sm:h-48 object-contain"
                    />
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-sm font-semibold">Scanning...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3 text-sm">Upload QR code image</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage || !jsQRLoaded}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>

              {capturedImage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Uploaded Image:</h4>
                    <Button onClick={clearCapturedImage} variant="outline" size="sm" className="text-xs bg-transparent">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={capturedImage || "/placeholder.svg"}
                      alt="Uploaded for QR scanning"
                      className="w-full h-40 sm:h-48 object-contain"
                    />
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-sm font-semibold">Scanning...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Messages */}
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-semibold text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Scanned Data Display */}
      {reservationData && (
        <Card className="shadow-lg border-2 border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Reservation Details
            </CardTitle>
            <p className="text-green-700 font-semibold text-sm">QR code scanned successfully.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Reservation ID */}
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <Hash className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Reservation ID</p>
                  <p className="text-sm font-bold text-gray-900 break-words">#{reservationData.reservation_id}</p>
                </div>
              </div>

              {/* Book Title */}
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <BookOpen className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Book Title</p>
                  <p className="text-sm font-bold text-gray-900 break-words">{reservationData.book_title}</p>
                </div>
              </div>

              {/* Student Name */}
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <User className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Student Name</p>
                  <p className="text-sm font-bold text-gray-900 break-words">{reservationData.user_name}</p>
                  <p className="text-xs text-gray-500 mt-1">User ID: {reservationData.user_id}</p>
                </div>
              </div>

              {/* Date and Status - Mobile Optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                  <Calendar className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Requested Date</p>
                    <p className="text-xs font-bold text-gray-900 break-words">{reservationData.requested_date}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                  <Clock className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Status</p>
                    <Badge
                      variant={reservationData.status === "pending" ? "secondary" : "default"}
                      className="text-xs font-bold"
                    >
                      {reservationData.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Library Info */}
              <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Library:</span> {reservationData.library}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Button
                onClick={issueBook}
                disabled={isIssuing}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base"
              >
                {isIssuing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Issue Book
                  </>
                )}
              </Button>
              <Button
                onClick={resetScanner}
                variant="outline"
                disabled={isIssuing}
                className="w-full border-2 border-gray-300 font-bold h-10 text-sm bg-transparent"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Scan Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
