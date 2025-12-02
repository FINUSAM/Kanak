# Gemini Project Summary: Kanak Expense Tracker

This document provides a comprehensive overview of the Kanak project, including its architecture, setup, and key implementation details. It is intended to be used as a reference for future development and to bring new instances of Gemini up to speed on the project.

## Project Overview

Kanak is a full-stack web application for group expense tracking. It allows users to create groups, invite members, add transactions, and split expenses. The application is designed with a separate frontend and backend, and it uses a database to persist data.

## Technology Stack

### Backend

*   **Framework:** FastAPI
*   **Database:** SQLite (with SQLAlchemy and `databases` for async support)
*   **Authentication:** JWT (JSON Web Tokens) with `python-jose`
*   **Data Validation:** Pydantic
*   **Language:** Python 3

### Frontend

*   **Framework:** React
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (inferred from class names)
*   **API Client:** Axios
*   **UI Components:** `lucide-react` for icons

## Project Structure

```
.
├── backend/
│   ├── .env
│   ├── .gitignore
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── security.py
│   └── routers/
│       ├── auth.py
│       ├── groups.py
│       ├── invitations.py
│       └── transactions.py
└── frontend/
    ├── .env
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/ (implied)
        ├── App.tsx
        ├── main.tsx
        ├── types.ts
        ├── components/
        │   ├── Auth.tsx
        │   ├── Dashboard.tsx
        │   └── GroupDetail.tsx
        │   └── group/
        │       ├── GroupModals.tsx
        │       ├── MemberList.tsx
        │       ├── TransactionList.tsx
        │       └── TransactionModal.tsx
        └── services/
            └── api.ts
```

## Backend Setup & Architecture

### Setup

1.  Navigate to the `backend/` directory.
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run the server: `uvicorn main:app --reload` (runs on `http://localhost:8000`)

### Architecture

*   **Database:** The backend uses a SQLite database (`kanak.db`). The database connection is managed in `database.py`. The database schema is defined in `models.py` using SQLAlchemy's declarative syntax.
*   **Authentication:** Authentication is handled via JWT. The `/auth/login` endpoint returns a JWT token, which is then used to authenticate subsequent requests. The `security.py` file contains helper functions for password hashing, token creation, and getting the current user from a token.
*   **API Structure:** The API is built with FastAPI and is organized into routers for `auth`, `groups`, `invitations`, and `transactions`. The API routes and data models are based on the OpenAPI specification provided in `frontend/spec.ts`.

## Frontend Setup & Architecture

### Setup

1.  Navigate to the `frontend/` directory.
2.  Install dependencies: `npm install`
3.  Run the development server: `npm run dev` (runs on `http://localhost:3000`)

### Architecture

*   **API Interaction:** The frontend uses the `axios` library to make API calls to the backend. A central `api.ts` service is used to configure the base URL and authentication headers.
*   **Component Structure:** The application is built with React components, organized by feature. Key components include `Auth.tsx`, `Dashboard.tsx`, and `GroupDetail.tsx`.
*   **State Management:** Component-level state is managed with React hooks (`useState`, `useEffect`). There is no global state management library like Redux or Zustand.
*   **Authentication Flow:** The `Auth.tsx` component handles user login and registration. Upon successful login, the JWT token is stored in `localStorage` and set in the `axios` headers for all subsequent requests. The `App.tsx` component checks for the token on startup to maintain the user's session.

## Key Features Implemented

*   User registration and login
*   JWT-based authentication
*   Database persistence with SQLite
*   Group creation and management
*   Invitation system for adding members to groups
*   Transaction creation, editing, and deletion
*   Expense splitting (equal, by amount, by percentage)

## Role-Based Access Control

Here's a breakdown of what each role in the Kanak application can and cannot do:

| Role          | View Group Details & Transactions | Add Transactions | Edit/Delete Transactions | Add/Invite Members |
| :------------ | :-------------------------------- | :--------------- | :----------------------- | :----------------- |
| **OWNER**     | Yes                               | Yes              | Yes                      | Yes                |
| **ADMIN**     | Yes                               | Yes              | Yes                      | Yes                |
| **EDITOR**    | Yes                               | Yes              | Yes                      | No                 |
| **CONTRIBUTOR** | Yes                               | Yes              | No                       | No                 |
| **VIEWER**    | Yes                               | No               | No                       | No                 |
| **GUEST**     | Yes                               | No               | No                       | No                 |

**Detailed Explanation:**

*   **OWNER:** This is typically the creator of the group. They have full control over the group, including managing transactions and inviting/adding new members.
*   **ADMIN:** Similar to an OWNER, an ADMIN has extensive privileges within the group, allowing them to manage transactions and members.
*   **EDITOR:** An EDITOR can view group details and transactions, and they can also create, modify, or delete transactions. However, they cannot invite or add new members to the group.
*   **CONTRIBUTOR:** A CONTRIBUTOR can view group details and transactions, and they can *only add new transactions*. They cannot edit or delete existing transactions, nor can they manage members.
*   **VIEWER:** A VIEWER can see all group details and transactions but cannot make any changes. They cannot add/edit/delete transactions or manage members.
*   **GUEST:** GUESTS are typically virtual members (e.g., "Grandma," "Roommate") who don't have a Kanak account. They can view group details and transactions but cannot make any modifications or invite new members.

## Recent Changes & Fixes

*   **Backend:**
    *   Migrated from in-memory storage to a SQLite database.
    *   Implemented JWT authentication.
    *   Refactored all API endpoints to be database-driven.
    *   Added `GET` endpoint for a single transaction by ID in `backend/routers/transactions.py`.
    *   Updated `PUT` and `DELETE` transaction endpoints to use "TransactionNotFound" detail message in `backend/routers/transactions.py`.
    *   Removed `category` field from `Transaction` models and database schema.
    *   Fixed `NameError` by adding missing imports in `backend/routers/transactions.py`.
    *   Fixed `sqlite3.IntegrityError: UNIQUE constraint failed: users.username` by adding checks for existing username/email during registration.
    *   Fixed `CORSMiddleware` configuration to allow `http://127.0.0.1:3000`.
    *   Added `PUT /groups/{groupId}` endpoint to update group name and description (for owners only).
    *   Added `isActive` column to `members` table for soft deletion.
    *   Implemented `PUT /groups/{groupId}/members/{memberId}` endpoint to update member roles (for owners/admins).
    *   Implemented "replace with guest" functionality for member removal and leaving group:
        *   `PUT /groups/{groupId}/members/{memberId}/replace-with-guest`: Replaces a removed member with a guest, reassigns transactions. Prevents removing OWNER or GUEST roles.
        *   `POST /groups/{groupId}/leave`: Allows a user to leave, replaces them with a guest, and reassigns transactions. Prevents OWNER from leaving.
        *   Fixed `NameError` and `UNIQUE constraint failed: users.username` by correctly defining variables and making guest usernames truly unique in the `users` table.
    *   Updated `get_groups_for_current_user` and `get_group_details` to filter by `isActive=True` to only show active members.
    *   **Fixed numerous bugs and implemented missing functionalities:**
        *   `IntegrityError` when creating users, groups, and transactions (by explicitly generating UUIDs).
        *   `ResponseValidationError` when creating groups and sending invitations (by ensuring correct response models are returned).
        *   Incorrect invitation logic (now always sends invitations for standard users).
        *   Incorrectly configured API routes for transactions.
        *   Invitation list not filtering by `PENDING` status.
        *   Dashboard group listing not showing groups where the user is a member.
        *   Added **Transaction Split Validation** to ensure split amounts/percentages match total.
        *   Modified `/auth/login` to return **User Data on Login** along with the token.
        *   Implemented **Role-Based Access Control for Transactions** (CONTRIBUTORs can only add, not edit/delete).
*   **Frontend:**
    *   Refactored the entire frontend to connect to the new backend API.
    *   Removed the old `localStorage`-based mock backend.
    *   Added "Delete Group" button and functionality (for owners only).
    *   Made `DeleteConfirmModal` reusable with `title` and `message` props.
    *   Added "Edit Group" button and modal functionality (for owners only).
    *   Implemented "Edit Member Role" functionality with `RoleDropdown` (for owners/admins).
    *   Added "Remove Member" button and confirmation (for owners/admins).
    *   Added "Leave Group" button and confirmation (for non-owners).
    *   Fixed `currentUserRole` calculation in `GroupDetail.tsx` using `useMemo`.
    *   Hid "Remove" button for `GUEST` members in `MemberList.tsx`.
    *   **Fixed several bugs and implemented missing functionalities:**
        *   `TypeError` in `TransactionList.tsx` (by using `tx.splits` and adding array checks).
        *   CORS errors (by updating `CORSMiddleware` in backend).
        *   Improved error handling in `Auth.tsx` for API validation errors.
        *   Implemented **Global Error Handling** using React Context to display API errors.
        *   Updated `Auth.tsx` to retrieve user data directly from the login response.
        *   Removed unused `API_KEY` and `GEMINI_API_KEY` environment variables from `vite.config.ts`.

This document should provide a solid foundation for any new Gemini instance to understand and contribute to the Kanak project.