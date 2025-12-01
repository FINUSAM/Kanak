import React, { useState, useEffect } from 'react';
import { User, Group, Transaction, UserRole, TransactionType, Invitation } from '../types';
import { getGroupById, getGroupTransactions, deleteTransaction, getGroupInvitations } from '../services/storage';
import { ArrowLeft, Plus, Users, FileDown } from 'lucide-react';
import { generateGroupPDF } from '../utils/pdfGenerator';
import { TransactionList } from './group/TransactionList';
import { MemberList } from './group/MemberList';
import { TransactionModal } from './group/TransactionModal';
import { AddMemberModal, DeleteConfirmModal, ExportModal } from './group/GroupModals';

interface GroupDetailProps {
  user: User;
  groupId: string;
  onBack: () => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({ user, groupId, onBack }) => {
  const [group, setGroup] = useState<Group | undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'members'>('transactions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals State
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = () => {
    try {
      const g = getGroupById(groupId, user.id);
      setGroup(g);
      if (g) {
        setTransactions(getGroupTransactions(groupId, user.id));
        setPendingInvites(getGroupInvitations(groupId));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateMemberStats = (memberId: string) => {
    let paid = 0;
    let received = 0;
    let balance = 0;

    transactions.forEach(tx => {
      const payer = tx.payerId || tx.createdById;
      const isPayer = payer === memberId;
      const mySplit = tx.splits.find(s => s.userId === memberId)?.amount || 0;
      const amount = Number(tx.amount);
      const splitAmount = Number(mySplit);

      if (tx.type === TransactionType.CREDIT) {
        if (isPayer) {
          paid += amount;
          balance += (amount - splitAmount);
        } else {
          balance -= splitAmount;
        }
        received += splitAmount;

      } else if (tx.type === TransactionType.DEBIT) {
        if (isPayer) {
          received += amount;
          balance -= (amount - splitAmount);
        } else {
          balance += splitAmount;
        }
        paid += splitAmount;
      }
    });

    return { paid, received, balance };
  };

  const currentUserRole = group?.members.find(m => m.userId === user.id)?.role || UserRole.VIEWER;
  const canAdd = [UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR, UserRole.CONTRIBUTOR].includes(currentUserRole);

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setShowAddTx(true);
  };

  const handleDeleteRequest = (txId: string) => {
    setTransactionToDelete(txId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      try {
        deleteTransaction(transactionToDelete, user.id);
        loadData();
      } catch (err: any) {
        alert(err.message);
      }
      setShowDeleteConfirm(false);
      setTransactionToDelete(null);
    }
  };

  const handleTxSuccess = () => {
    setShowAddTx(false);
    setEditingTx(null);
    loadData();
  };

  const handleMemberAdded = () => {
    setShowAddMember(false);
    loadData();
  };

  const handleExport = (from: string, to: string) => {
    if (group) {
      generateGroupPDF(group, transactions, from, to);
      setShowExportModal(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading group data...</div>;
  if (error || !group) return (
    <div className="p-8 text-center">
      <div className="text-red-500 mb-4 font-bold">Error Loading Group</div>
      <p className="text-gray-600 mb-4">{error || "Group not found or access denied."}</p>
      <button onClick={onBack} className="text-indigo-600 hover:underline">Go Back</button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-sm text-gray-500">{group.members.length} members • Your Role: <span className="font-semibold text-indigo-600">{currentUserRole}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
            title="Export PDF"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          {canAdd && (
            <button
              onClick={() => { setEditingTx(null); setShowAddTx(true); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus size={16} /> Add Transaction
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white px-6 shrink-0">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'transactions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'members' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} /> Members
          {(pendingInvites.length > 0) && (
            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs">{pendingInvites.length} Pending</span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'transactions' && (
          <TransactionList
            transactions={transactions}
            group={group}
            userRole={currentUserRole}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteRequest}
          />
        )}

        {activeTab === 'members' && (
          <MemberList
            group={group}
            pendingInvites={pendingInvites}
            userRole={currentUserRole}
            onAddMember={() => setShowAddMember(true)}
            calculateStats={calculateMemberStats}
          />
        )}
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={showAddTx}
        onClose={() => setShowAddTx(false)}
        onSuccess={handleTxSuccess}
        user={user}
        group={group}
        editingTransaction={editingTx}
      />

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        groupId={group.id}
        currentUser={user}
        onSuccess={handleMemberAdded}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />
    </div>
  );
};