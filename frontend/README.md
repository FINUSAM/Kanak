# Kanak - Group Expense Tracker

Kanak is a smart, role-based group expense tracking application designed to simplify financial management for groups, trips, and shared households. It allows users to manage transactions with granular permission controls, advanced splitting logic, and robust member management.

## Features

### 🔐 Authentication & Security
- **Secure Registration & Login**: Email and password-based authentication.
- **Session Management**: Persistent user sessions.

### 👥 Group Management
- **Create Groups**: Users can create unlimited groups for different occasions (e.g., "Trip to Paris", "Apartment Expenses").
- **Invitation System**: 
  - Send invitations to registered users via email.
  - Users can **Accept** or **Reject** pending invitations from their dashboard.
  - **Virtual Members (Guests)**: Add members who don't have an account (e.g., "Grandma", "Roommate") directly by name.

### 💰 Smart Transaction Tracking
- **Paid vs. Received**:
  - **Paid (Green)**: You gave money (e.g., paid for dinner). Increases your "Paid" stat.
  - **Received (Red)**: You received money or consumed a resource cost. Increases your "Received" stat.
- **On-behalf Transactions**: Record transactions paid by other members (e.g., "Alice paid for Lunch") while logged in as yourself.
- **Advanced Splitting**:
  - **Equal**: Automatically divide the total among selected members.
  - **Amount**: Specify exact amounts for each person.
  - **Percentage**: Split by percentage (must total 100%).
- **Selective Participation**: Choose exactly who is involved in a transaction (e.g., split a bill between just 3 out of 5 members).
- **Auto-Balancing**: Changing one person's share automatically recalculates others to keep the total correct.

### 📊 Financial Insights
- **Member Balances**: Real-time calculation of:
  - **Paid**: Total contribution to the group (Outflow).
  - **Received**: Total value consumed/split share (Inflow).
  - **Net Balance**: The difference. Green (+) means you are owed money; Red (-) means you owe the group.
- **Settlement Suggestions**: Displays clear "who owes whom" lines before the transaction table in the PDF, minimizing individual transactions.
- **Matrix-Style PDF Reports**: 
  - Generates a professional **Matrix Ledger** PDF.
  - Includes `MM/DD/YYYY` date and `h:mmA` time in separate columns for each transaction, with no word wrap.
  - Columns for every member showing their specific **Net Impact** per transaction.
  - Color-coded cells (Green for positive/get back, Red for negative/owe).
  - Includes a **Total Balance Footer** summarizing the final standing of every member for the selected date range.
  - Custom Date Filtering (Auto-selects last 30 days).

### ✅ Real-time Validation
- **Instant Feedback**: The app validates inputs as you type.
- **Tally Checks**: Ensures split amounts equal the total transaction value.
- **Error Handling**: Prevents saving invalid states (e.g., negative numbers, missing participants). Improved to display specific backend error messages when available, instead of generic "network error".

### 🛡️ Role-Based Access Control (RBAC)
Kanak implements a strict permission system:
- **OWNER**: Full control, manages group settings and all members.
- **ADMIN**: Can invite members and manage transactions.
- **EDITOR**: Can add/edit transactions but cannot manage members.
- **CONTRIBUTOR**: Can add transactions but cannot edit others'.
- **VIEWER**: Read-only access to group data.
- **GUEST**: A virtual role managed by the group.

### 📄 API Documentation
- **Integrated Specs**: Built-in Swagger/OpenAPI 3.0 specification viewer for backend development coordination.

## Tech Stack
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Generation**: jsPDF, jsPDF-AutoTable


## Roles Matrix

| Feature | Owner | Admin | Editor | Contributor | Viewer | Guest |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| View Transactions | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Add Transaction | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Transaction | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite/Add Member | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Group | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Getting Started

1. **Register**: Create an account.
2. **Create Group**: Start a new group from the dashboard.
3. **Add Members**: 
   - **Invite**: Enter email to send an invite to a registered user.
   - **Add Guest**: Enter a name to add a virtual member instantly.
4. **Track**: Add transactions, select payer (You or Others), select split modes, and view real-time balances.
5. **Export**: Use the Export button to download the Matrix Ledger PDF.