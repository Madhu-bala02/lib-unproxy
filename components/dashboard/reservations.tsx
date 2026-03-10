"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Calendar,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  BookOpen,
  QrCode,
  Download,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { libraryAPI, type RequestedBook } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-context"
import { QRCode } from "@/components/ui/qr-code"

const ITEMS_PER_PAGE = 10

export function Reservations() {
  const { user } = useAuth()
  const [requestedBooks, setRequestedBooks] = useState<RequestedBook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<RequestedBook | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (user) {
      loadRequestedBooks()
    }
  }, [user])

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [requestedBooks])

  const loadRequestedBooks = async () => {
    setLoading(true)
    setError(null)

    try {
      const books = await libraryAPI.getUserRequestedBooks()
      setRequestedBooks(books)
      if (process.env.NODE_ENV === "development") {
        console.log("SUCCESS: Requested books loaded:", books)
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("ERROR: Failed to load requested books:", err)
      }
      setError(err instanceof Error ? err.message : "Failed to load requested books")
    } finally {
      setLoading(false)
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(requestedBooks.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentBooks = requestedBooks.slice(startIndex, endIndex)

  // Generate page numbers for pagination
  const getPageNumbers = useMemo(() => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push("...")
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push("...")
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push("...")
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push("...")
        pages.push(totalPages)
      }
    }

    return pages
  }, [currentPage, totalPages])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      // Scroll to top of reservations section
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Not available"

      const cleanDate = dateString.replace(/<[^>]*>/g, "").trim()
      if (!cleanDate) return "Not available"

      const date = new Date(cleanDate)
      if (isNaN(date.getTime())) return cleanDate

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateString || "Not available"
    }
  }

  const generateQRData = (book: RequestedBook) => {
    const qrData = {
      type: "library_reservation",
      reservation_id: book.id,
      book_title: book.bookname || "Unknown Book",
      user_name: user?.name || "Unknown User",
      user_id: user?.uid || "Unknown",
      requested_date: book.requested_on,
      issued_date: book.issued_on,
      status:
        book.returned_on && book.returned_on.trim() !== ""
          ? "returned"
          : book.issued_on && book.issued_on !== "Not issued yet"
            ? "issued"
            : "pending",
      library: "University Library System",
    }

    return JSON.stringify(qrData, null, 2)
  }

  const downloadQRData = (book: RequestedBook) => {
    const qrData = generateQRData(book)
    const blob = new Blob([qrData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `reservation-${book.bookname?.replace(/[^a-zA-Z0-9]/g, "-")}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const copyQRData = async (book: RequestedBook) => {
    try {
      const qrData = generateQRData(book)
      await navigator.clipboard.writeText(qrData)
      if (process.env.NODE_ENV === "development") {
        console.log("QR data copied to clipboard")
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to copy QR data:", err)
      }
    }
  }

  const handleShowQR = (book: RequestedBook) => {
    setSelectedReservation(book)
    setShowQRModal(true)
  }

  const getStatusBadge = (book: RequestedBook) => {
    if (book.returned_on && book.returned_on.trim() !== "") {
      return (
        <Badge className="bg-slate-500/20 backdrop-blur-md text-slate-900 border border-slate-300/30 shadow-lg">
          Returned
        </Badge>
      )
    } else if (book.issued_on && book.issued_on !== "Not issued yet") {
      return (
        <Badge className="bg-emerald-500/20 backdrop-blur-md text-emerald-900 border border-emerald-300/30 shadow-lg">
          Issued
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-amber-500/20 backdrop-blur-md text-amber-900 border border-amber-300/30 shadow-lg">
          Pending Approval
        </Badge>
      )
    }
  }

  const getStatusIcon = (book: RequestedBook) => {
    if (book.returned_on && book.returned_on.trim() !== "") {
      return <CheckCircle className="h-4 w-4 text-gray-600" />
    } else if (book.issued_on && book.issued_on !== "Not issued yet") {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else {
      return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading requested books...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                My Book Requests
              </CardTitle>
              <CardDescription>
                Books you have requested from the library
                {requestedBooks.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({requestedBooks.length} total, showing {startIndex + 1}-{Math.min(endIndex, requestedBooks.length)}
                    )
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequestedBooks}
              disabled={loading}
              className="bg-white/50 backdrop-blur-md border-white/30 hover:bg-white/70 transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 backdrop-blur-xl border border-red-300/30 shadow-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {requestedBooks.length === 0 && !loading && !error && (
        <Card className="bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No book requests</p>
            <p className="text-sm text-gray-400">Books you request will appear here</p>
          </CardContent>
        </Card>
      )}

      {requestedBooks.length > 0 && (
        <>
          <div className="space-y-4">
            {currentBooks.map((book) => (
              <Card
                key={book.id}
                className={`bg-white/30 backdrop-blur-xl border-l-4 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:bg-white/40 ${
                  book.returned_on && book.returned_on.trim() !== ""
                    ? "border-l-slate-500 border border-slate-200/30"
                    : book.issued_on && book.issued_on !== "Not issued yet"
                      ? "border-l-emerald-500 border border-emerald-200/30"
                      : "border-l-amber-500 border border-amber-200/30"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(book)}
                        <div>
                          <h3 className="font-semibold text-lg">{book.bookname || "Unknown Book"}</h3>
                          <p className="text-gray-600 text-sm">{book.title}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center bg-white/20 backdrop-blur-md rounded-lg p-3 border border-white/30">
                          <Calendar className="mr-2 h-4 w-4" />
                          <div>
                            <span className="font-medium">Requested:</span>
                            <br />
                            <span>{formatDate(book.requested_on)}</span>
                          </div>
                        </div>

                        <div
                          className={`flex items-center backdrop-blur-md rounded-lg p-3 border ${
                            book.issued_on && book.issued_on !== "Not issued yet"
                              ? "bg-emerald-500/20 border-emerald-300/30"
                              : "bg-amber-500/20 border-amber-300/30"
                          }`}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          <div>
                            <span className="font-medium">Status:</span>
                            <br />
                            <span>{book.issued_on === "Not issued yet" ? "Pending" : "Approved"}</span>
                          </div>
                        </div>

                        {book.issued_on && book.issued_on !== "Not issued yet" && (
                          <div className="flex items-center bg-emerald-500/20 backdrop-blur-md rounded-lg p-3 border border-emerald-300/30">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <div>
                              <span className="font-medium">Issued:</span>
                              <br />
                              <span>{formatDate(book.issued_on)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      {getStatusBadge(book)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShowQR(book)}
                        className="flex items-center gap-1 bg-white/50 backdrop-blur-md border-white/30 hover:bg-white/70 transition-all duration-300"
                      >
                        <QrCode className="h-3 w-3" />
                        Show QR
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Card className="bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, requestedBooks.length)} of {requestedBooks.length}{" "}
                    entries
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 bg-white/50 backdrop-blur-md border-white/30 hover:bg-white/70 transition-all duration-300"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {getPageNumbers.map((page, index) => (
                        <div key={index}>
                          {page === "..." ? (
                            <span className="px-3 py-1 text-gray-500">...</span>
                          ) : (
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className={`min-w-[40px] transition-all duration-300 ${
                                currentPage === page
                                  ? "bg-blue-600/80 backdrop-blur-md border-blue-500/30"
                                  : "bg-white/50 backdrop-blur-md border-white/30 hover:bg-white/70"
                              }`}
                            >
                              {page}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 bg-white/50 backdrop-blur-md border-white/30 hover:bg-white/70 transition-all duration-300"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto bg-white/20 backdrop-blur-2xl border border-white/30 shadow-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Reservation QR Code
            </DialogTitle>
            <DialogDescription>Scan this QR code to view reservation details</DialogDescription>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-4">
              <div className="bg-white/30 backdrop-blur-md p-3 rounded-lg border border-white/20">
                <h3 className="font-medium text-sm">{selectedReservation.bookname}</h3>
                <p className="text-xs text-gray-600">Requested: {formatDate(selectedReservation.requested_on)}</p>
                <div className="mt-1">{getStatusBadge(selectedReservation)}</div>
              </div>

              <div className="flex justify-center p-4 bg-white/50 backdrop-blur-md border border-white/30 rounded-lg shadow-xl">
                <QRCode value={generateQRData(selectedReservation)} size={200} id="reservation-qr-code" />
              </div>

              <div className="bg-white/30 backdrop-blur-md p-3 rounded-lg border border-white/20">
                <h4 className="text-sm font-medium mb-2">QR Code Contains:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Reservation ID: {selectedReservation.id}</li>
                  <li>• Book: {selectedReservation.bookname}</li>
                  <li>• User: {user?.name}</li>
                  <li>
                    • Status:{" "}
                    {selectedReservation.returned_on && selectedReservation.returned_on.trim() !== ""
                      ? "Returned"
                      : selectedReservation.issued_on && selectedReservation.issued_on !== "Not issued yet"
                        ? "Issued"
                        : "Pending"}
                  </li>
                  <li>• Library: University Library System</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => copyQRData(selectedReservation)}
                  variant="outline"
                  className="flex-1 bg-white/50 backdrop-blur-md border-white/30 hover:bg-white/70 transition-all duration-300"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Data
                </Button>
                <Button
                  onClick={() => downloadQRData(selectedReservation)}
                  variant="outline"
                  className="flex-1 bg-white/50 backdrop-blur-md border-white/30 hover:bg-white/70 transition-all duration-300"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowQRModal(false)}
                  size="sm"
                  className="bg-white/50 backdrop-blur-md border-white/30 hover:bg-white/70 transition-all duration-300"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
