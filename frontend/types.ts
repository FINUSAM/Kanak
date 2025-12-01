export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
  GUEST = 'GUEST',
}

export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum SplitMode {
  EQUAL = 'EQUAL',
  PERCENTAGE = 'PERCENTAGE',
  AMOUNT = 'AMOUNT',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Member {
  userId: string;
  username: string;
  role: UserRole;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeEmail: string;
  role: UserRole;
  status: InvitationStatus;
  createdAt: string;
}

export interface TransactionSplit {
  userId: string;
  amount: number;
  percentage?: number; // Optional, used for UI/calculation
}

export interface Transaction {
  id: string;
  groupId: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO string
  createdBy: string; // username
  createdById: string; // userId
  payerId?: string;
  involvedUserIds: string[]; // Kept for backward compatibility/easy querying
  splitMode: SplitMode;
  splits: TransactionSplit[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: string;
  createdBy: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}