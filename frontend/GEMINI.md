# Gemini Project Summary: Kanak Frontend

This document provides a comprehensive overview of the Kanak frontend project, including its architecture, setup, and key implementation details. It is intended to be used as a reference for future development and to bring new instances of Gemini up to speed on the project.

## Project Overview

Kanak is a full-stack web application for group expense tracking. This document specifically focuses on the frontend, which is a Single Page Application (SPA) built with React, TypeScript, and Vite. It allows users to create groups, invite members, add transactions, and split expenses.

## Technology Stack

*   **Framework:** React
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (inferred from class names)
*   **API Client:** Axios
*   **UI Components:** `lucide-react` for icons
*   **Charting:** `recharts`
*   **PDF Generation:** `jspdf`

## Project Structure

```
.
├── .env.example.prod
├── .gitignore
├── App.tsx
├── index.html
├── index.tsx
├── metadata.json
├── package-lock.json
├── package.json
├── README.md
├── spec.ts
├── tsconfig.json
├── types.ts
├── vite.config.ts
├── components/
│   ├── ApiDocs.tsx
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── GroupDetail.tsx
│   └── group/
│       ├── GroupModals.tsx
│       ├── MemberList.tsx
│       └── TransactionModal.tsx
│       └── TopSpendersChart.tsx (to be added)
├── contexts/
│   └── GlobalErrorContext.tsx
├── node_modules/...
├── services/
│   └── api.ts
└── utils/
    └── pdfGenerator.ts
```

## Frontend Architecture

*   **Core Component:** `App.tsx` acts as the central controller, managing authentication state (`user`) and active group (`activeGroupId`). It uses conditional rendering for "routing" between `Auth`, `Dashboard`, and `GroupDetail` views.
*   **State Management:** Primarily component-level state with React hooks. Global error handling is managed via `GlobalErrorContext`. Data flow generally follows the 'lift state up' pattern.
*   **API Interaction:** `services/api.ts` centralizes all backend communication. It configures a global `axios` instance, injects authentication tokens, and includes an interceptor for global error handling, displaying messages via `GlobalErrorContext`.
*   **Error Handling:** `contexts/GlobalErrorContext.tsx` provides a sophisticated global error handling mechanism, allowing both React components and non-React modules (like `api.ts`) to trigger UI error notifications.
*   **Feature Components:** Components like `Dashboard.tsx` and `GroupDetail.tsx` fetch their own data, manage local UI state, and communicate with the `App` component via props.

## Key Features

*   User authentication (login/registration)
*   Group creation and management
*   Transaction creation, editing, and deletion
*   Expense splitting
*   Data visualization (with `recharts`)
*   PDF report generation (with `jspdf`)

## Key Files and Their Roles

*   **`App.tsx`**: Central application controller, handles authentication, core state, and view rendering.
*   **`services/api.ts`**: Centralized API client with `axios`, authentication token injection, and global error interceptor.
*   **`contexts/GlobalErrorContext.tsx`**: Implements global error handling for UI display, accessible by React and non-React modules.
*   **`components/Dashboard.tsx`**: Main view for authenticated users, handles data fetching and group management.
*   **`components/GroupDetail.tsx`**: Displays details for a specific group, including transactions and members. This is where the new `TopSpendersChart` will be integrated.
*   **`package.json`**: Defines project dependencies (React, TypeScript, Vite, Axios, Recharts, jspdf).
*   **`utils/pdfGenerator.ts`**: (Inferred) Utility for generating PDF reports of financial data.
