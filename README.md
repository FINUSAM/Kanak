# Kanak Expense Tracker

Kanak is a full-stack web application for group expense tracking.

## Setup & Running

To get the application up and running, follow these steps:

### 1. Backend Setup

1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Create a `.env` file in the `backend/` directory with your Supabase project details. Find these in your Supabase dashboard under **Project Settings > API**.
    ```dotenv
    # The URL of your Supabase project
    SUPABASE_URL="https://<your-project-ref>.supabase.co"
    # The audience for your JWTs, typically "authenticated"
    SUPABASE_AUDIENCE="authenticated"
    # The issuer of your JWTs
    SUPABASE_ISSUER="https://<your-project-ref>.supabase.co/auth/v1"
    ```
4.  Run the backend server:
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

1.  Navigate to the `frontend/` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `frontend/` directory with the following content. Find these values in your Supabase dashboard under **Project Settings > API**.
    ```dotenv
    VITE_API_BASE_URL=http://localhost:8000
    # Your Supabase project URL
    VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
    # Your Supabase project's anon public key
    VITE_SUPABASE_ANON_KEY="<your-anon-public-key>"
    ```
4.  Run the frontend development server:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.
