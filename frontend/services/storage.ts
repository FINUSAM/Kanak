import { Group, User, Transaction, UserRole, Member, Invitation, InvitationStatus } from '../types';

const KEYS = {
  USERS: 'ledger_users',
  GROUPS: 'ledger_groups',
  TRANSACTIONS: 'ledger_transactions',
  SESSION: 'ledger_session',
  INVITATIONS: 'ledger_invitations',
};

// Internal type for storage including password
interface StoredUser extends User {
  password?: string; 
}

// --- Helpers ---
const get = <T,>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const set = <T,>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// SECURITY: Simple mock hash to prevent plaintext password storage.
// In a real production environment, use bcrypt/Argon2 on the server side.
const hashPassword = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// --- Auth ---
export const registerUser = (username: string, email: string, password: string): User => {
  const users = get<StoredUser>(KEYS.USERS);
  if (users.find((u) => u.email === email)) throw new Error('User already exists');
  
  const newUser: StoredUser = { 
    id: crypto.randomUUID(), 
    username, 
    email,
    password: hashPassword(password) // SECURITY: Store hash, not plaintext
  };
  set(KEYS.USERS, [...users, newUser]);
  
  const { password: _, ...userSafe } = newUser;
  return userSafe;
};

export const loginUser = (email: string, password: string): User => {
  const users = get<StoredUser>(KEYS.USERS);
  const user = users.find((u) => u.email === email);
  
  if (!user) throw new Error('User not found');
  
  // SECURITY: Verify hash
  if (user.password && user.password !== hashPassword(password)) {
    throw new Error('Invalid credentials');
  }
  
  const { password: _, ...userSafe } = user;
  localStorage.setItem(KEYS.SESSION, JSON.stringify(userSafe));
  return userSafe;
};

export const logoutUser = () => {
  localStorage.removeItem(KEYS.SESSION);
};

export const getSession = (): User | null => {
  const session = localStorage.getItem(KEYS.SESSION);
  return session ? JSON.parse(session) : null;
};

export const getAllUsers = (): User[] => {
    const users = get<StoredUser>(KEYS.USERS);
    return users.map(({ password, ...u }) => u);
};

// --- Groups ---
export const createGroup = (user: User, name: string, description: string): Group => {
  const groups = get<Group>(KEYS.GROUPS);
  const newGroup: Group = {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    members: [
      {
        userId: user.id,
        username: user.username,
        role: UserRole.OWNER,
        joinedAt: new Date().toISOString(),
      },
    ],
  };
  set(KEYS.GROUPS, [...groups, newGroup]);
  return newGroup;
};

export const getUserGroups = (userId: string): Group[] => {
  const groups = get<Group>(KEYS.GROUPS);
  return groups.filter((g) => g.members.some((m) => m.userId === userId));
};

// SECURITY: Added userId to enforce IDOR check
export const getGroupById = (groupId: string, requestorUserId: string): Group | undefined => {
  const group = get<Group>(KEYS.GROUPS).find((g) => g.id === groupId);
  if (!group) return undefined;

  // SECURITY: Check if requestor is a member
  const isMember = group.members.some(m => m.userId === requestorUserId);
  if (!isMember) {
      throw new Error("Access Denied: You are not a member of this group.");
  }

  return group;
};

export const inviteMemberOrAddGuest = (groupId: string, identifier: string, role: UserRole, inviter: User): { group?: Group, invitation?: Invitation, message: string } => {
  const groups = get<Group>(KEYS.GROUPS);
  const groupIndex = groups.findIndex((g) => g.id === groupId);
  if (groupIndex === -1) throw new Error('Group not found');

  const group = groups[groupIndex];

  // SECURITY: Check permissions (Only Owner/Admin can invite)
  const requestorRole = group.members.find(m => m.userId === inviter.id)?.role;
  if (!requestorRole || ![UserRole.OWNER, UserRole.ADMIN].includes(requestorRole)) {
      throw new Error("Access Denied: Insufficient permissions to invite members.");
  }

  if (role === UserRole.GUEST) {
    const virtualId = `guest-${crypto.randomUUID()}`;
    const newMember: Member = {
      userId: virtualId,
      username: identifier, 
      role: UserRole.GUEST,
      joinedAt: new Date().toISOString(),
    };
    
    group.members.push(newMember);
    groups[groupIndex] = group;
    set(KEYS.GROUPS, groups);
    return { group, message: 'Member added directly' };
  } else {
    const users = get<User>(KEYS.USERS);
    const userToInvite = users.find((u) => u.email === identifier);
    
    if (!userToInvite) throw new Error('User with this email does not exist');
    
    if (group.members.some((m) => m.userId === userToInvite.id)) {
        throw new Error('User is already a member of this group');
    }

    const invitations = get<Invitation>(KEYS.INVITATIONS);
    const existingInvite = invitations.find(i => 
        i.groupId === groupId && 
        i.inviteeId === userToInvite.id && 
        i.status === InvitationStatus.PENDING
    );

    if (existingInvite) throw new Error('Invitation already sent to this user');

    const newInvitation: Invitation = {
        id: crypto.randomUUID(),
        groupId,
        groupName: group.name,
        inviterId: inviter.id,
        inviterName: inviter.username,
        inviteeId: userToInvite.id,
        inviteeEmail: userToInvite.email,
        role,
        status: InvitationStatus.PENDING,
        createdAt: new Date().toISOString()
    };

    set(KEYS.INVITATIONS, [...invitations, newInvitation]);
    return { invitation: newInvitation, message: 'Invitation sent' };
  }
};

// --- Invitations ---

export const getPendingInvitations = (userId: string): Invitation[] => {
    const invitations = get<Invitation>(KEYS.INVITATIONS);
    // Safe: only returns invites for the specific user
    return invitations.filter(i => i.inviteeId === userId && i.status === InvitationStatus.PENDING);
};

export const getGroupInvitations = (groupId: string): Invitation[] => {
    const invitations = get<Invitation>(KEYS.INVITATIONS);
    // Note: In a real backend, we should verify the requestor is an Admin of this groupId
    return invitations.filter(i => i.groupId === groupId && i.status === InvitationStatus.PENDING);
};

export const respondToInvitation = (invitationId: string, accept: boolean): void => {
    const invitations = get<Invitation>(KEYS.INVITATIONS);
    const inviteIndex = invitations.findIndex(i => i.id === invitationId);
    
    if (inviteIndex === -1) throw new Error('Invitation not found');
    
    // Note: In real backend, we verify session user matches inviteeId
    const invite = invitations[inviteIndex];
    
    if (accept) {
        const groups = get<Group>(KEYS.GROUPS);
        const groupIndex = groups.findIndex(g => g.id === invite.groupId);
        if (groupIndex !== -1) {
            const group = groups[groupIndex];
            
            if (!group.members.some(m => m.userId === invite.inviteeId)) {
                const users = get<User>(KEYS.USERS);
                const user = users.find(u => u.id === invite.inviteeId);
                
                if (user) {
                    group.members.push({
                        userId: user.id,
                        username: user.username,
                        role: invite.role,
                        joinedAt: new Date().toISOString()
                    });
                    groups[groupIndex] = group;
                    set(KEYS.GROUPS, groups);
                }
            }
        }
        invite.status = InvitationStatus.ACCEPTED;
    } else {
        invite.status = InvitationStatus.REJECTED;
    }
    
    invitations[inviteIndex] = invite;
    set(KEYS.INVITATIONS, invitations);
};

// --- Transactions ---

// Helper to check write permissions
const canEditGroup = (groupId: string, userId: string): boolean => {
    const groups = get<Group>(KEYS.GROUPS);
    const group = groups.find(g => g.id === groupId);
    if (!group) return false;
    const member = group.members.find(m => m.userId === userId);
    if (!member) return false;
    return [UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR, UserRole.CONTRIBUTOR].includes(member.role);
};

export const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>): Transaction => {
  // SECURITY: Input Validation
  if (transaction.amount < 0) throw new Error("Invalid Amount: Cannot be negative");
  
  // SECURITY: Check permissions
  if (!canEditGroup(transaction.groupId, transaction.createdById)) {
      throw new Error("Access Denied: You do not have permission to add transactions.");
  }

  const transactions = get<Transaction>(KEYS.TRANSACTIONS);
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  set(KEYS.TRANSACTIONS, [...transactions, newTransaction]);
  return newTransaction;
};

export const updateTransaction = (txId: string, updates: Partial<Transaction>, requestorUserId: string): Transaction => {
    const transactions = get<Transaction>(KEYS.TRANSACTIONS);
    const index = transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error("Transaction not found");
    
    const existingTx = transactions[index];

    // SECURITY: Role Check
    const groups = get<Group>(KEYS.GROUPS);
    const group = groups.find(g => g.id === existingTx.groupId);
    if (!group) throw new Error("Group not found");
    
    const member = group.members.find(m => m.userId === requestorUserId);
    if (!member) throw new Error("Access Denied");

    // Only Owner, Admin, Editor can edit. Contributor cannot edit existing transactions.
    const allowedRoles = [UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR];
    if (!allowedRoles.includes(member.role)) {
        throw new Error("Access Denied: Insufficient permissions to edit.");
    }

    // SECURITY: Input Validation
    if (updates.amount !== undefined && updates.amount < 0) throw new Error("Invalid Amount");

    const updated: Transaction = { ...existingTx, ...updates };
    transactions[index] = updated;
    set(KEYS.TRANSACTIONS, transactions);
    return updated;
};

export const deleteTransaction = (txId: string, requestorUserId: string): void => {
    const transactions = get<Transaction>(KEYS.TRANSACTIONS);
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return; // Idempotent

    // SECURITY: Role Check
    const groups = get<Group>(KEYS.GROUPS);
    const group = groups.find(g => g.id === tx.groupId);
    if (!group) throw new Error("Group not found");

    const member = group.members.find(m => m.userId === requestorUserId);
    if (!member) throw new Error("Access Denied");

    const allowedRoles = [UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR];
    if (!allowedRoles.includes(member.role)) {
        throw new Error("Access Denied: Insufficient permissions to delete.");
    }

    const filtered = transactions.filter(t => t.id !== txId);
    set(KEYS.TRANSACTIONS, filtered);
};

export const getGroupTransactions = (groupId: string, requestorUserId: string): Transaction[] => {
  // SECURITY: Verify Group Membership (IDOR Protection)
  const groups = get<Group>(KEYS.GROUPS);
  const group = groups.find(g => g.id === groupId);
  if (!group || !group.members.some(m => m.userId === requestorUserId)) {
      throw new Error("Access Denied");
  }

  const transactions = get<Transaction>(KEYS.TRANSACTIONS);
  return transactions.filter((t) => t.groupId === groupId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};