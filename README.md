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
3.  Create a `.env` file in the `backend/` directory with the database connection string:
    ```
    DATABASE_URL=postgresql://xxxxxxx.pooler.supabase.com:5432/postgres
    ```
4.  Run the backend server:
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    The API will be available at `http://localhost:8000`. You can access the interactive API documentation (Swagger UI) at `http://localhost:8000/docs`.

### 2. Frontend Setup

1.  Navigate to the `frontend/` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `frontend/` directory with the following content:
    ```
    VITE_API_BASE_URL=http://localhost:8000/
    ```
4.  Run the frontend development server:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.
