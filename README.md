# Assignmate — Backend API

<p align="center">
  <img src="https://res.cloudinary.com/dvytvjplt/image/upload/v1777360249/Gemini_Generated_Image_vz1jejvz1jejvz1j_i3jspj.png" alt="Assignmate Banner" width="100%" />
</p>

<p align="center">
  <strong>Server-side engine powering Assignmate — the AI handwriting clone and assignment generation platform.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/License-Private-red?style=flat-square" />
</p>

---

> [!CAUTION]
> **This is a private, proprietary repository.**
> Unauthorized access, reading, copying, cloning, forking, redistribution, or use of any code, asset, logic, or content within this repository — in whole or in part — is strictly prohibited and constitutes a violation of the owner's intellectual property rights. Any such action may result in legal consequences.

---

## Overview

Assignmate's backend is a RESTful API built with **Node.js** and **Express** that handles all server-side operations for the platform. It manages user authentication, handwriting profile processing, AI-powered assignment generation, PDF creation, and cloud asset storage.

The backend is the sole interface between the frontend application, the AI providers (OpenRouter, Anthropic, Google Gemini), the handwriting font pipeline (Calligraphr), and persistent cloud storage (Cloudinary + MongoDB).

---

### AI Providers

| Provider               | Purpose                                 |
| ---------------------- | --------------------------------------- |
| **OpenRouter**         | Routing AI requests to optimal models   |
| **Anthropic (Claude)** | Academic assignment text generation     |
| **Google Gemini**      | Vision-based handwriting photo analysis |

### Handwriting Pipeline

| Service         | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| **Calligraphr** | Converts handwriting photo into a usable TTF font file |

---

## AI Integration

### Text Generation — OpenRouter → Anthropic Claude

When a user submits a question or topic:

1. Request is sent to **OpenRouter** which routes to `claude-sonnet-4-20250514`
2. Claude generates a well-structured academic assignment answer
3. The generated text is returned and stored in the `Assignment` document
4. Text is passed to the PDF service for rendering

### Handwriting Analysis — Google Gemini Vision

When a handwriting photo is uploaded:

1. Image is preprocessed using **Sharp** (resize, normalize, contrast)
2. Preprocessed image is passed to **Gemini Vision API**
3. Gemini extracts style parameters: slant angle, character spacing, stroke thickness, baseline irregularity, and pen pressure simulation
4. Parameters are stored as JSON in `HandwritingProfile.styleParams`

---

## Handwriting Pipeline

```
User uploads photo
       │
       ▼
Sharp  ──►  preprocess (resize, contrast, denoise)
       │
       ▼
Gemini Vision  ──►  extract style parameters → saved to DB
       │
       ▼
Calligraphr API  ──►  photo → TTF font file
       │
       ▼
Cloudinary  ──►  store TTF font, return URL → saved to HandwritingProfile
       │
       ▼
pdf-lib + fontkit  ──►  embed TTF into PDF at generation time
```

The TTF font is the single source of truth for rendering. Both the frontend canvas preview (`opentype.js`) and the server-side PDF export (`pdf-lib`) consume the same font file URL stored in Cloudinary.

---

## Security

- All API keys are stored as **server-side environment variables** — never exposed to the client
- Passwords are hashed with **bcryptjs** before storage
- JWT tokens expire after **7 days**
- **Helmet** sets secure HTTP headers on all responses
- **express-rate-limit** is applied to all AI-related and auth endpoints
- All database queries are scoped by the authenticated `userId` — no cross-user data access is possible
- File uploads are validated for **MIME type and file size** before processing
- Zod schemas validate all incoming request bodies and query params

---

## Getting Started

> **For authorized contributors only.**

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster
- Cloudinary account
- API keys for OpenRouter, Anthropic, Google Gemini, and Calligraphr

### Contact

For access requests, questions, or contributions, please contact the Assignmate development team at [gyanprakashkhandual@gmail.com](mailto:gyanprakashkhandual@gmail.com)
