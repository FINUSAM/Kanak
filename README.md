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
3.  Run the backend server:
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

## Role-Based Access Control (RBAC)

Kanak implements a permission system to control user actions within a group.

| Role          | View Group Details & Transactions | Add Transactions | Edit/Delete Transactions | Add/Invite Members |
| :------------ | :-------------------------------- | :--------------- | :----------------------- | :----------------- |
| **OWNER**     | Yes                               | Yes              | Yes                      | Yes                |
| **ADMIN**     | Yes                               | Yes              | Yes                      | Yes                |
| **EDITOR**    | Yes                               | Yes              | Yes                      | No                 |
| **CONTRIBUTOR** | Yes                               | Yes              | No                       | No                 |
| **VIEWER**    | Yes                               | No               | No                       | No                 |
| **GUEST**     | Yes                               | No               | No                       | No                 |

**Role Descriptions:**

*   **OWNER:** Has full control over the group, including managing transactions and members.
*   **ADMIN:** Can manage transactions and members within the group.
*   **EDITOR:** Can view group details and transactions, and can create, modify, or delete transactions. Cannot manage members.
*   **CONTRIBUTOR:** Can view group details and transactions, and can *only add new transactions*. Cannot edit or delete existing transactions, nor can they manage members.
*   **VIEWER:** Has read-only access to group data and transactions. Cannot make any modifications or manage members.
*   **GUEST:** A virtual member with read-only access to group data and transactions. Cannot make any modifications or manage members.

## Development Notes

*   **Frontend Technologies:** React, TypeScript, Vite, Tailwind CSS, Axios.
*   **Backend Technologies:** FastAPI, Python, SQLAlchemy, Databases (for SQLite).
*   **Authentication:** JWT-based.
