# Library Management System - Progressive Web Application

A modern Progressive Web Application (PWA) for institutional library management built with Next.js 15, TypeScript, and Tailwind CSS.

## Quick Deployment

### Step 1: Environment Configuration
Create a `.env.local` file in the root directory with the following content:

```env
NEXT_PUBLIC_LIBRARY_API_URL=https://lib.prayalabs.com
```

### Step 2: Installation and Build
```bash
# Install dependencies
npm install --legacy-peer-deps

# Build for production
npm run build

# Start production server
npm start
```

### Step 3: Access Application
Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Overview

### Key Features

- **Secure Authentication**: Username/password login with math CAPTCHA verification
- **Advanced Book Search**: Real-time search suggestions with category filtering
- **Book Reservation System**: One-click reservations with QR code generation
- **User Dashboard**: Personal library management with borrowing statistics
- **Calendar Integration**: Due date reminders with ICS file export
- **Librarian Portal**: Dedicated QR scanner interface for book issuing
- **Progressive Web App**: Installable on mobile devices with offline support
- **Responsive Design**: Mobile-first approach optimized for all screen sizes

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Authentication**: HTTP Basic Auth with CSRF protection
- **API Integration**: RESTful APIs with server-side proxy
- **PWA Features**: Service Worker, Web Manifest
- **Development**: ESLint, Prettier, TypeScript strict mode

## User Access

### Student/User Portal
- Login with institutional credentials
- Search library catalog
- Reserve available books
- Track borrowed books and due dates
- Generate calendar reminders
- View borrowing history

### Librarian Portal
Access the librarian dashboard at `/librarian` with librarian credentials:
- Scan student QR codes to issue books
- View library statistics and metrics
- Monitor pending reservations
- Track overdue books

## Security Implementation

- **Session Management**: 10-minute timeout with activity tracking
- **CSRF Protection**: Token-based request validation
- **Math CAPTCHA**: Human verification for login attempts
- **Secure Headers**: XSS and clickjacking protection
- **Input Validation**: Server-side validation for all inputs

## Documentation

Complete technical documentation is available in:

- **DOCUMENTATION.md** - Comprehensive technical guide
- **API_REFERENCE.md** - API integration documentation

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Code linting
npm run lint

# Type checking
npm run type-check
```

## Project Architecture

### Core Application Files

**Main Application**
- `app/page.tsx` - Main entry point with authentication routing
- `app/layout.tsx` - Root layout with PWA configuration and providers
- `app/globals.css` - Global styles and design system
- `app/librarian/page.tsx` - Dedicated librarian dashboard with statistics

**API Integration**
- `app/api/proxy/route.ts` - Server-side proxy for external library API
- `app/api/captcha/route.ts` - CAPTCHA generation and verification service
- `lib/api-client.ts` - HTTP client utilities with retry logic
- `lib/config.ts` - Centralized configuration management

### Authentication System

**Core Authentication**
- `components/auth/auth-context.tsx` - Authentication state management with React Context
- `components/auth/login-form.tsx` - User login interface with security features
- `components/auth/session-timer.tsx` - Session monitoring with timeout warnings
- `components/auth/security-verification.tsx` - Math CAPTCHA component for login security

### Dashboard Components

**Main Dashboard**
- `components/dashboard/dashboard.tsx` - Main dashboard with tabbed navigation
- `components/dashboard/book-search.tsx` - Book search with suggestions and filtering
- `components/dashboard/user-profile.tsx` - User account information and statistics
- `components/dashboard/borrowed-books.tsx` - Borrowed books tracking with due dates
- `components/dashboard/reservations.tsx` - Reservation management with QR codes

**Supporting Components**
- `components/dashboard/book-details-modal.tsx` - Detailed book information modal
- `components/dashboard/calendar-reminder-modal.tsx` - Calendar reminder generation
- `components/dashboard/loading-states.tsx` - Loading animations and skeleton screens

### Librarian Features

**QR Scanner System**
- `components/librarian/qr-scanner.tsx` - QR code scanner for book issuing workflow

### Utility Libraries

**Core Utilities**
- `lib/ics-generator.ts` - Calendar file generation for due date reminders
- `lib/qr-generator.ts` - QR code generation utilities
- `lib/utils.ts` - Common utility functions and helpers

### UI Framework

**Component Library**
- `components/ui/` - Complete set of reusable UI components based on Radix UI
- Includes: Button, Card, Dialog, Input, Select, Badge, Progress, Tabs, and more

### Configuration Files

**Build Configuration**
- `next.config.mjs` - Next.js configuration with PWA and security settings
- `tailwind.config.ts` - Tailwind CSS configuration with custom design tokens
- `tsconfig.json` - TypeScript configuration with strict type checking
- `package.json` - Project dependencies and build scripts

**PWA Configuration**
- `public/manifest.json` - PWA manifest for app installation capabilities
- `public/favicon.ico` - Application favicon and various icon sizes

### Development Tools

**Debug and Testing**
- `components/debug/` - Development debugging tools and API testing utilities
- `hooks/` - Custom React hooks for mobile detection and toast notifications

---

**Project Status**: Production Ready  
**Deployment**: Ready for immediate deployment  
**Documentation**: Complete technical documentation provided  
**Support**: Comprehensive guides and API references included

This library management system is fully functional and ready for deployment in your institutional environment.