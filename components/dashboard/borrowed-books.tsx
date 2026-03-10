"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Calendar, Clock, RefreshCw, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { libraryAPI, type BorrowedBook } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-context"
import { CalendarReminderModal } from "./calendar-reminder-modal"

export function BorrowedBooks() {
  const { user } = useAuth()
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [selectedBookForCalendar, setSelectedBookForCalendar] = useState<BorrowedBook | null>(null)

  useEffect(() => {
    if (user) {
      loadBorrowedBooks()
    }
  }, [user])

  const loadBorrowedBooks = async () => {
    setLoading(true)
    setError(null)

    try {
      const books = await libraryAPI.getUserBorrowedBooks()
      // Filter to show only issued and returned books (not requested)
      const issuedAndReturnedBooks = books.filter((book) => book.status === "issued" || book.status === "returned")
      setBorrowedBooks(issuedAndReturnedBooks)
      if (process.env.NODE_ENV === "development") {
        console.log("SUCCESS: Borrowed books loaded:", issuedAndReturnedBooks)
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("ERROR: Failed to load borrowed books:", err)
      }
      setError(err instanceof Error ? err.message : "Failed to load borrowed books")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (book: BorrowedBook) => {
    switch (book.status) {
      case "issued":
        if (book.is_overdue) {
          return (
            <Badge className="bg-red-500/20 backdrop-blur-md text-red-900 border border-red-300/30 shadow-lg">
              Overdue
            </Badge>
          )
        } else if (book.days_remaining <= 3 && book.days_remaining > 0) {
          return (
            <Badge className="bg-amber-500/20 backdrop-blur-md text-amber-900 border border-amber-300/30 shadow-lg">
              Due Soon
            </Badge>
          )
        } else {
          return (
            <Badge className="bg-emerald-500/20 backdrop-blur-md text-emerald-900 border border-emerald-300/30 shadow-lg">
              Issued
            </Badge>
          )
        }
      case "returned":
        return (
          <Badge className="bg-slate-500/20 backdrop-blur-md text-slate-900 border border-slate-300/30 shadow-lg">
            Returned
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-500/20 backdrop-blur-md text-blue-900 border border-blue-300/30 shadow-lg">
            Unknown
          </Badge>
        )
    }
  }

  const getStatusIcon = (book: BorrowedBook) => {
    switch (book.status) {
      case "issued":
        return book.is_overdue ? (
          <AlertCircle className="h-4 w-4 text-red-600" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )
      case "returned":
        return <CheckCircle className="h-4 w-4 text-gray-600" />
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    try {
      // Handle various date formats
      const cleanDate = dateString.replace(/<[^>]*>/g, "").trim()
      const date = new Date(cleanDate)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const handleAddToCalendar = (book: BorrowedBook) => {
    setSelectedBookForCalendar(book)
    setShowCalendarModal(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading borrowed books...</span>
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
                <BookOpen className="mr-2 h-5 w-5" />
                Borrowed Books
              </CardTitle>
              <CardDescription>Books you have currently borrowed or previously returned</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBorrowedBooks}
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

      {borrowedBooks.length === 0 && !loading && !error && (
        <Card className="bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No borrowed books</p>
            <p className="text-sm text-gray-400">Books you borrow will appear here</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {borrowedBooks.map((book) => (
          <Card
            key={book.id}
            className={`bg-white/30 backdrop-blur-xl border-l-4 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:bg-white/40 ${
              book.is_overdue
                ? "border-l-red-500 border border-red-200/30"
                : book.days_remaining <= 3 && book.days_remaining > 0
                  ? "border-l-amber-500 border border-amber-200/30"
                  : "border-l-emerald-500 border border-emerald-200/30"
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
                        <span className="font-medium">Issued On:</span>
                        <br />
                        <span>{book.issued_on === "Not issued yet" ? "Pending" : formatDate(book.issued_on)}</span>
                      </div>
                    </div>

                    {book.status === "issued" && book.due_date && (
                      <div
                        className={`flex items-center backdrop-blur-md rounded-lg p-3 border transition-all duration-300 ${
                          book.is_overdue
                            ? "bg-red-500/20 border-red-300/30"
                            : book.days_remaining <= 3
                              ? "bg-amber-500/20 border-amber-300/30"
                              : "bg-white/20 border-white/30"
                        }`}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        <div>
                          <span className="font-medium">Due Date:</span>
                          <br />
                          <span
                            className={
                              book.is_overdue
                                ? "text-red-600 font-semibold"
                                : book.days_remaining <= 3
                                  ? "text-yellow-600 font-semibold"
                                  : ""
                            }
                          >
                            {formatDate(book.due_date)}
                            {book.is_overdue
                              ? ` (${Math.abs(book.days_remaining)} days overdue)`
                              : book.days_remaining <= 3
                                ? ` (${book.days_remaining} days left)`
                                : ` (${book.days_remaining} days left)`}
                          </span>
                        </div>
                      </div>
                    )}

                    {book.returned_on && book.returned_on.trim() !== "" && book.returned_on !== "Not returned yet." && (
                      <div className="flex items-center bg-emerald-500/20 backdrop-blur-md rounded-lg p-3 border border-emerald-300/30">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <div>
                          <span className="font-medium">Returned On:</span>
                          <br />
                          <span>{formatDate(book.returned_on)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2 ml-4">
                  {getStatusBadge(book)}

                  {book.status === "issued" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToCalendar(book)}
                        className="bg-blue-500/20 backdrop-blur-md hover:bg-blue-500/30 text-blue-700 border-blue-300/30 shadow-lg transition-all duration-300"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Add to Calendar
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {book.is_overdue && book.status === "issued" && (
                <Alert
                  variant="destructive"
                  className="mt-4 bg-red-500/10 backdrop-blur-xl border border-red-300/30 shadow-xl"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This book is {Math.abs(book.days_remaining)} day{Math.abs(book.days_remaining) !== 1 ? "s" : ""}{" "}
                    overdue. Please return it as soon as possible to avoid penalties.
                  </AlertDescription>
                </Alert>
              )}

              {!book.is_overdue && book.status === "issued" && book.days_remaining <= 3 && book.days_remaining > 0 && (
                <Alert className="mt-4 bg-amber-500/10 backdrop-blur-xl border border-amber-300/30 shadow-xl">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    This book is due in {book.days_remaining} day{book.days_remaining !== 1 ? "s" : ""}. Please plan to
                    return it soon.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Calendar Reminder Modal */}
      {selectedBookForCalendar && (
        <CalendarReminderModal
          isOpen={showCalendarModal}
          onClose={() => {
            setShowCalendarModal(false)
            setSelectedBookForCalendar(null)
          }}
          bookTitle={selectedBookForCalendar.bookname}
          authorName="Unknown Author" // We can enhance this later with actual author data
          dueDate={
            selectedBookForCalendar.due_date
              ? new Date(selectedBookForCalendar.due_date)
              : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
          }
          onReminderCreated={() => {
            if (process.env.NODE_ENV === "development") {
              console.log("DATE: Calendar reminder created for borrowed book:", selectedBookForCalendar.bookname)
            }
          }}
        />
      )}
    </div>
  )
}
