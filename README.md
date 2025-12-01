# Frontend Setup

This guide will walk you through setting up and running the frontend of the application.

## Prerequisites

- Node.js and npm (or yarn) installed on your system.

## Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Running the Development Server

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   This will start the Vite development server.

2. **Open the application in your browser:**
   Open your browser and navigate to the URL provided by Vite (usually `http://localhost:5173`).

## Building for Production

1. **Build the application:**
   ```bash
   npm run build
   ```
   This will create a `dist` directory in the `frontend` directory with the production-ready files.

2. **Preview the production build:**
    ```bash
    npm run preview
    ```
    This will serve the production build locally.

---

# Backend Setup

This guide will walk you through setting up and running the FastAPI backend.

## Prerequisites

- Python 3.9+ and pip installed on your system.

## Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Development Server

1. **Start the development server:**
   ```bash
   uvicorn backend.main:app --reload --port 3000
   ```
   This will start the FastAPI server on `http://localhost:3000`. The `--reload` flag will automatically restart the server when you make changes to the code.

2. **Access API Documentation:**
   Open your browser and navigate to `http://localhost:3000/docs` to view the interactive API documentation (Swagger UI).