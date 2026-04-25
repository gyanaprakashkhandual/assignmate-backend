# Assignmate - Product Specification

## Overview

Assignmate is a web application that converts typed text into realistic handwritten documents that match the user's own handwriting style. Users upload a photo of their handwriting, ask a question or provide a topic, and receive a PDF that looks exactly as if they wrote it by hand on paper.

---

## Problem Statement

Students and professionals often need handwritten documents but lack the time or ability to write them manually. Existing tools offer generic pre-made handwriting fonts that do not resemble the user's actual handwriting. Assignmate solves this by cloning the user's personal handwriting style from a single photo and generating authentic-looking handwritten PDFs on demand.

---

## Target Users

- Students who need handwritten assignments submitted on paper or as scanned PDFs
- Professionals who want personalized handwritten notes or letters
- Anyone who wants to replicate their own handwriting digitally at scale

---

## Core Features

### 1. User Authentication

Users can register and log in with email and password. Authentication is handled using JWT tokens. Each user has a private account where their handwriting profiles and generated assignments are stored separately.

### 2. Handwriting Profile Upload

Users upload a photo of their handwriting from any device. The image is processed and stored in the cloud. Claude Vision API analyzes the uploaded image to extract style characteristics including letter slant, spacing, stroke weight, line irregularities, and overall writing pattern. This profile is saved and reused for all future assignments.

A user can have one active handwriting profile at a time and can replace it by uploading a new photo.

### 3. Assignment Generation

The user types a question or a topic into the application. The request is sent to the Claude API via OpenRouter, which generates a well-written answer appropriate for an academic assignment. The generated text is then rendered using the user's custom handwriting font or style parameters extracted from their uploaded photo.

### 4. Handwriting Rendering

The generated assignment text is rendered onto a realistic paper background using canvas-based rendering. The rendering engine applies natural variation to letter spacing, slight random tilt, ink color simulation, and line flow to ensure the output does not look mechanically typed. Users can choose from paper styles including lined notebook, plain white, and college-ruled.

### 5. PDF Export

Once the assignment is rendered on canvas, the user can export it as a multi-page PDF. The PDF preserves the handwriting style, paper background, margins, and page layout. The PDF is stored in cloud storage and a download link is provided to the user.

### 6. Assignment History

Each generated assignment is saved to the user's account with the question, date, paper style used, and a link to download the PDF again. Users can view and re-download all previous assignments from their dashboard.

### 7. Customization Options

Before generating the PDF, users can adjust ink color, paper style, font size, line spacing, and page margins. These settings are applied at render time and saved per assignment.

---

## User Flow

1. User registers or logs in
2. User uploads a photo of their handwriting
3. AI analyzes the photo and creates a handwriting profile
4. User types a question or assignment topic
5. AI generates the written answer
6. The answer is rendered in the user's handwriting style on a paper canvas
7. User previews the output and adjusts settings if needed
8. User downloads the final PDF

---

## Tech Stack

### Frontend

- Next.js with TypeScript using the App Router
- Tailwind CSS for styling
- Shadcn UI for component library
- react-dropzone for handwriting photo upload
- react-konva for canvas-based handwriting preview
- opentype.js for loading and rendering custom font files

### Backend

- Node.js with Express and TypeScript
- MongoDB with Mongoose for data storage
- Multer for handling image file uploads
- Sharp for image preprocessing before AI analysis
- Cloudinary for storing uploaded handwriting photos and generated PDFs
- pdf-lib with fontkit for server-side PDF generation
- Zod for request validation
- JSON Web Tokens for authentication
- bcryptjs for password hashing
- Helmet and express-rate-limit for security
- Winston for logging
- dotenv for environment configuration

### AI

- Claude claude-sonnet-4-20250514 accessed via OpenRouter API
- Used for two purposes: Vision analysis of the handwriting photo to extract style parameters, and text generation to write the assignment answer

### Custom Font Pipeline

- Calligraphr is used as an external service to convert the user's handwriting photo into a usable TTF font file
- The TTF font is stored in Cloudinary and loaded via opentype.js on the frontend for canvas rendering
- The same font is embedded into the exported PDF using pdf-lib and fontkit

---

## API Design

### Authentication

- POST /api/auth/register — Create a new user account
- POST /api/auth/login — Log in and receive a JWT token
- POST /api/auth/logout — Invalidate the session

### Handwriting

- POST /api/handwriting/upload — Upload a handwriting photo and trigger AI analysis
- GET /api/handwriting/profile — Get the current user's handwriting profile
- DELETE /api/handwriting/profile — Delete the current handwriting profile

### Assignment

- POST /api/assignment/generate — Submit a question and receive generated assignment text
- GET /api/assignment — List all assignments for the logged-in user
- GET /api/assignment/:id — Get a specific assignment with download link
- DELETE /api/assignment/:id — Delete an assignment

### PDF

- POST /api/pdf/generate — Render the assignment text to PDF using the user's handwriting font
- GET /api/pdf/:id/download — Download a previously generated PDF

---

## Database Models

### User

Stores the user's name, email, hashed password, and account timestamps.

### HandwritingProfile

Stores the user reference, the URL of the uploaded handwriting photo, the URL of the generated TTF font file, the AI-extracted style parameters as a JSON object, and the creation timestamp.

### Assignment

Stores the user reference, the original question, the AI-generated answer text, the handwriting profile used, the paper style and customization settings, the PDF URL, and the creation timestamp. A TTL index is applied to auto-delete PDFs after 30 days unless the user marks them as saved.

---

## Security Considerations

- All API keys including the OpenRouter key are stored as server-side environment variables and never exposed to the frontend
- File uploads are validated for type and size before processing
- JWT tokens expire after 7 days and must be refreshed
- Rate limiting is applied to all AI-related endpoints to prevent abuse
- All user data is scoped by authenticated user ID at the database query level

---

## Out of Scope for Version 1

- Mobile native application
- Handwriting style transfer using generative image models
- Real-time collaborative editing
- Support for non-Latin scripts
- Direct print integration
