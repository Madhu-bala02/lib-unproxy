import { API_CONFIG, DEBUG } from "./config"

const isBrowser = typeof window !== "undefined"

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Types
export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  publication: string
  category: string
  availability: boolean
  featured_image?: string
  description?: string
  publication_year?: string
  pages?: number
  language?: string
  location?: string
  copies_available?: number
  total_copies?: number
  reserved_by?: string
  due_date?: string
  rating?: number
  tags?: string[]
  created_date?: string
  updated_date?: string
}

export interface Author {
  id: string
  name: string
  description?: string
  books?: string[]
  image?: string
  biography?: string
  birth_date?: string
  nationality?: string
  awards?: string[]
  website?: string
  social_links?: {
    twitter?: string
    facebook?: string
    instagram?: string
  }
}

export interface Publication {
  id: string
  name: string
  description?: string
  books?: string[]
  logo?: string
  founded_year?: string
  location?: string
  website?: string
  contact_info?: {
    email?: string
    phone?: string
    address?: string
  }
}

export interface Category {
  id: string
  name: string
  description?: string
  books?: string[]
  parent_category?: string
  subcategories?: string[]
  color?: string
  icon?: string
}

export interface User {
  uid: string
  name: string
  email?: string
  role?: string
  profile_image?: string
  joined_date?: string
  borrowed_books?: string[]
  reserved_books?: string[]
  reading_history?: string[]
  preferences?: {
    favorite_genres?: string[]
    notification_settings?: {
      email?: boolean
      sms?: boolean
      push?: boolean
    }
  }
  library_card?: {
    number?: string
    issued_date?: string
    expiry_date?: string
    status?: string
  }
}

export interface BorrowedBook {
  id: string
  book_id: string
  book_title: string
  author: string
  borrowed_date: string
  due_date: string
  status: "active" | "overdue" | "returned"
  renewal_count?: number
  fine_amount?: number
}

export interface RequestedBook {
  id: string
  book_id: string
  book_title: string
  author: string
  requested_date: string
  status: "pending" | "approved" | "rejected" | "issued"
  priority?: number
  notes?: string
}

class LibraryAPI {
  private baseUrl = API_CONFIG.BASE_URL
  private csrfToken: string | null = null
  private logoutToken: string | null = null
  private username: string | null = null
  private password: string | null = null
  private sessionId: string | null = null
  private authorsCache: Map<string, Author> = new Map()
  private publicationsCache: Map<string, Publication> = new Map()
  private categoriesCache: Map<string, Category> = new Map()
  private imageCache: Map<string, string> = new Map()
  private secondaryBooksCache: Map<string, any> = new Map()
  private authorsLoaded = false
  private publicationsLoaded = false
  private categoriesLoaded = false
  private user: { uid: string; name: string } | null = null

  constructor() {
    if (isBrowser) {
      this.csrfToken = localStorage.getItem("library_csrf_token")
      this.logoutToken = localStorage.getItem("library_logout_token")
      this.sessionId = localStorage.getItem("library_session_id")
    }
  }

  private async makeDirectRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (DEBUG.LOG_API_REQUESTS) {
      console.log(`REQUEST: Making direct request to ${endpoint}`, options.method || "GET")
    }

    const url = new URL(endpoint, this.baseUrl).toString()

    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; Library-PWA/1.0)",
    }

    // Add authentication headers if available
    if (this.username && this.password) {
      const basicAuth = btoa(`${this.username}:${this.password}`)
      defaultHeaders["Authorization"] = `Basic ${basicAuth}`
    }

    if (this.csrfToken) {
      defaultHeaders["X-CSRF-Token"] = this.csrfToken
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      cache: "no-store",
    }

    try {
      const response = await fetch(url, requestOptions)

      if (DEBUG.LOG_API_REQUESTS) {
        console.log(`RESPONSE: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type") || ""
      let responseData

      if (contentType.includes("application/json")) {
        responseData = await response.json()
      } else {
        const textResponse = await response.text()
        try {
          responseData = JSON.parse(textResponse)
        } catch (parseError) {
          responseData = {
            error: "Invalid response format",
            raw_response: textResponse,
            content_type: contentType,
            status: response.status,
          }
        }
      }

      if (!response.ok) {
        throw new ApiError(responseData?.error || `HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      return responseData
    } catch (error) {
      if (DEBUG.LOG_API_REQUESTS) {
        console.error(`ERROR: Request failed:`, error)
      }

      // Re-throw ApiError as-is, wrap other errors
      if (error instanceof ApiError) {
        throw error
      } else {
        throw new ApiError(error instanceof Error ? error.message : "Request failed", 0)
      }
    }
  }

  // Authentication methods
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      this.username = username
      this.password = password

      const data = await this.makeDirectRequest("/web/user/login", {
        method: "POST",
        body: JSON.stringify({
          name: username,
          pass: password,
        }),
      })

      if (data && data.current_user) {
        this.user = {
          uid: data.current_user.uid,
          name: data.current_user.name,
        }

        if (isBrowser) {
          localStorage.setItem("library_username", username)
          localStorage.setItem("library_password", password)
          if (data.csrf_token) {
            this.csrfToken = data.csrf_token
            localStorage.setItem("library_csrf_token", data.csrf_token)
          }
          if (data.logout_token) {
            this.logoutToken = data.logout_token
            localStorage.setItem("library_logout_token", data.logout_token)
          }
        }

        return { success: true, user: this.user }
      } else {
        return { success: false, error: "Invalid credentials" }
      }
    } catch (error) {
      return { success: false, error: error instanceof ApiError ? error.message : "Login failed" }
    }
  }

  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.logoutToken) {
        await this.makeDirectRequest("/web/user/logout", {
          method: "POST",
          body: JSON.stringify({
            token: this.logoutToken,
          }),
        })
      }

      // Clear stored data
      this.user = null
      this.username = null
      this.password = null
      this.csrfToken = null
      this.logoutToken = null
      this.sessionId = null

      if (isBrowser) {
        localStorage.removeItem("library_username")
        localStorage.removeItem("library_password")
        localStorage.removeItem("library_csrf_token")
        localStorage.removeItem("library_logout_token")
        localStorage.removeItem("library_session_id")
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof ApiError ? error.message : "Logout failed" }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      if (!this.username || !this.password) {
        return null
      }

      const data = await this.makeDirectRequest("/web/user/current?_format=json", {
        headers: {
          Accept: "application/json",
        },
      })

      if (data && data.uid) {
        this.user = {
          uid: data.uid[0]?.value || data.uid,
          name: data.name?.[0]?.value || data.name || "Unknown User",
          email: data.mail?.[0]?.value || data.mail,
        }
        return this.user
      }

      return null
    } catch (error) {
      console.error("Failed to get current user:", error)
      return null
    }
  }

  // Book methods
  async getBooks(limit = 12, offset = 0): Promise<{ books: Book[]; total: number }> {
    try {
      const data = await this.makeDirectRequest(
        `/web/jsonapi/lmsbook/lmsbook?page[limit]=${limit}&page[offset]=${offset}`,
        {
          headers: {
            Accept: "application/vnd.api+json",
          },
        },
      )

      if (data && data.data && Array.isArray(data.data)) {
        const books = data.data.map((item: any) => this.transformBookData(item))
        const total = data.meta?.count || books.length

        return { books, total }
      }

      return { books: [], total: 0 }
    } catch (error) {
      console.error("Failed to fetch books:", error)
      return { books: [], total: 0 }
    }
  }

  async getBookById(id: string): Promise<Book | null> {
    try {
      const data = await this.makeDirectRequest(`/web/lmsbook/${id}?_format=json`, {
        headers: {
          Accept: "application/json",
        },
      })

      if (data) {
        return this.transformBookData(data)
      }

      return null
    } catch (error) {
      console.error(`Failed to fetch book ${id}:`, error)
      return null
    }
  }

  async searchBooks(query: string, limit = 12): Promise<Book[]> {
    try {
      const data = await this.makeDirectRequest(
        `/web/jsonapi/lmsbook/lmsbook?filter[title][operator]=CONTAINS&filter[title][value]=${encodeURIComponent(query)}&page[limit]=${limit}`,
        {
          headers: {
            Accept: "application/vnd.api+json",
          },
        },
      )

      if (data && data.data && Array.isArray(data.data)) {
        return data.data.map((item: any) => this.transformBookData(item))
      }

      return []
    } catch (error) {
      console.error("Failed to search books:", error)
      return []
    }
  }

  // Author methods
  async getAuthors(): Promise<Author[]> {
    if (this.authorsLoaded && this.authorsCache.size > 0) {
      return Array.from(this.authorsCache.values())
    }

    try {
      const data = await this.makeDirectRequest("/web/jsonapi/lmsbookauthor/lmsbookauthor", {
        headers: {
          Accept: "application/vnd.api+json",
        },
      })

      if (data && data.data && Array.isArray(data.data)) {
        const authors = data.data.map((item: any) => this.transformAuthorData(item))

        // Cache authors
        this.authorsCache.clear()
        authors.forEach((author) => this.authorsCache.set(author.id, author))
        this.authorsLoaded = true

        return authors
      }

      return []
    } catch (error) {
      console.error("Failed to fetch authors:", error)
      return []
    }
  }

  async getAuthorById(id: string): Promise<Author | null> {
    // Check cache first
    if (this.authorsCache.has(id)) {
      return this.authorsCache.get(id) || null
    }

    try {
      const data = await this.makeDirectRequest(`/web/lmsbookauthor/${id}?_format=json`, {
        headers: {
          Accept: "application/json",
        },
      })

      if (data) {
        const author = this.transformAuthorData(data)
        this.authorsCache.set(id, author)
        return author
      }

      return null
    } catch (error) {
      console.error(`Failed to fetch author ${id}:`, error)
      return null
    }
  }

  // Publication methods
  async getPublications(): Promise<Publication[]> {
    if (this.publicationsLoaded && this.publicationsCache.size > 0) {
      return Array.from(this.publicationsCache.values())
    }

    try {
      // Get books first to extract publications
      const booksData = await this.makeDirectRequest("/web/jsonapi/lmsbook/lmsbook?page[limit]=100", {
        headers: {
          Accept: "application/vnd.api+json",
        },
      })

      if (booksData && booksData.data && Array.isArray(booksData.data)) {
        const publicationIds = new Set<string>()

        booksData.data.forEach((book: any) => {
          const pubId = book.relationships?.lmspublication?.data?.meta?.drupal_internal__target_id
          if (pubId) {
            publicationIds.add(pubId)
          }
        })

        const publications: Publication[] = []

        for (const pubId of publicationIds) {
          try {
            const pubData = await this.makeDirectRequest(`/web/lmspublication/${pubId}?_format=json`, {
              headers: {
                Accept: "application/json",
              },
            })

            if (pubData) {
              const publication = this.transformPublicationData(pubData)
              publications.push(publication)
              this.publicationsCache.set(pubId, publication)
            }
          } catch (error) {
            console.error(`Failed to fetch publication ${pubId}:`, error)
          }
        }

        this.publicationsLoaded = true
        return publications
      }

      return []
    } catch (error) {
      console.error("Failed to fetch publications:", error)
      return []
    }
  }

  // User data methods
  async getBorrowedBooks(): Promise<BorrowedBook[]> {
    try {
      const data = await this.makeDirectRequest("/web/borrowed", {
        headers: {
          Accept: "application/json",
        },
      })

      if (data && Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id || "",
          book_id: item.book_id || "",
          book_title: item.book_title || "Unknown Title",
          author: item.author || "Unknown Author",
          borrowed_date: item.borrowed_date || "",
          due_date: item.due_date || "",
          status: item.status || "active",
          renewal_count: item.renewal_count || 0,
          fine_amount: item.fine_amount || 0,
        }))
      }

      return []
    } catch (error) {
      console.error("Failed to fetch borrowed books:", error)
      return []
    }
  }

  async getRequestedBooks(): Promise<RequestedBook[]> {
    try {
      const data = await this.makeDirectRequest("/web/requested", {
        headers: {
          Accept: "application/json",
        },
      })

      if (data && Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id || "",
          book_id: item.book_id || "",
          book_title: item.book_title || "Unknown Title",
          author: item.author || "Unknown Author",
          requested_date: item.requested_date || "",
          status: item.status || "pending",
          priority: item.priority || 0,
          notes: item.notes || "",
        }))
      }

      return []
    } catch (error) {
      console.error("Failed to fetch requested books:", error)
      return []
    }
  }

  // Book reservation
  async reserveBook(bookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await this.makeDirectRequest("/web/entity/requestedlmsbook", {
        method: "POST",
        body: JSON.stringify({
          book_id: bookId,
        }),
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof ApiError ? error.message : "Reservation failed" }
    }
  }

  // Data transformation methods
  private transformBookData(data: any): Book {
    const attributes = data.attributes || data

    return {
      id: data.id || attributes.drupal_internal__id || "",
      title: attributes.title || "Unknown Title",
      author: "Unknown Author", // Will be populated separately
      isbn: attributes.field_isbn || "",
      publication: "Unknown Publication", // Will be populated separately
      category: attributes.field_category || "General",
      availability: attributes.field_availability !== false,
      featured_image: attributes.field_featured_image?.uri || "",
      description: attributes.body?.processed || attributes.body?.value || "",
      publication_year: attributes.field_publication_year || "",
      pages: attributes.field_pages || 0,
      language: attributes.field_language || "English",
      location: attributes.field_location || "",
      copies_available: attributes.field_copies_available || 1,
      total_copies: attributes.field_total_copies || 1,
      created_date: attributes.created || "",
      updated_date: attributes.changed || "",
    }
  }

  private transformAuthorData(data: any): Author {
    const attributes = data.attributes || data

    return {
      id: data.id || attributes.drupal_internal__id || "",
      name: attributes.title || "Unknown Author",
      description: attributes.text_long?.processed || attributes.body?.processed || "",
      biography: attributes.field_biography?.processed || "",
      birth_date: attributes.field_birth_date || "",
      nationality: attributes.field_nationality || "",
      website: attributes.field_website?.uri || "",
    }
  }

  private transformPublicationData(data: any): Publication {
    const attributes = data.attributes || data

    return {
      id: data.id || attributes.drupal_internal__id || "",
      name: attributes.title || "Unknown Publication",
      description: attributes.text_long?.processed || attributes.body?.processed || "",
      founded_year: attributes.field_founded_year || "",
      location: attributes.field_location || "",
      website: attributes.field_website?.uri || "",
    }
  }

  // Utility methods
  getDefaultCategories(): string[] {
    return [
      "Fiction",
      "Non-Fiction",
      "Science",
      "Technology",
      "History",
      "Biography",
      "Literature",
      "Business",
      "Health",
      "Travel",
      "Cooking",
      "Art",
      "Music",
      "Sports",
      "Education",
      "Reference",
      "Children",
      "Young Adult",
      "Mystery",
      "Romance",
      "Fantasy",
      "Science Fiction",
      "Horror",
      "Thriller",
      "Adventure",
      "Comedy",
      "Drama",
      "Poetry",
      "Essays",
      "Memoirs",
      "Self-Help",
      "Psychology",
      "Philosophy",
      "Religion",
      "Politics",
      "Economics",
      "Law",
      "Medicine",
      "Engineering",
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Computer Science",
      "Arts",
      "Philosophy",
      "Religion",
    ]
  }

  async getActiveSessions(): Promise<any> {
    try {
      const response = await fetch("/api/sessions", {
        method: "GET",
      })
      return await response.json()
    } catch (error) {
      console.error("Failed to get active sessions:", error)
      return { total_sessions: 0, sessions: [] }
    }
  }
}

// Export singleton instance
export const libraryAPI = new LibraryAPI()
export default libraryAPI
