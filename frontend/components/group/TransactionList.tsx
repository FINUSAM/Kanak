import React from 'react';
import { Transaction, Group, TransactionType, UserRole } from '../../types';
import { Users, Pencil, Trash2 } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  group: Group;
  userRole: UserRole;
  onEdit: (tx: Transaction) => void;
  onDelete: (txId: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, group, userRole, onEdit, onDelete }) => {
  const canEdit = [UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR].includes(userRole);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed">
        <p className="text-gray-500">No transactions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto">
      {transactions.map((tx) => {
        const payer = group.members.find(m => m.userId === (tx.payerId || tx.createdById));
        const payerName = payer ? payer.username : tx.createdBy;
        const isCredit = tx.type === TransactionType.CREDIT;
        const date = new Date(tx.date + 'Z');
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const involvedMembersNames = tx.splits
          .map(split => group.members.find(m => m.userId === split.userId)?.username)
          .filter((name): name is string => !!name);

        const involvedText = involvedMembersNames.length > 0
          ? involvedMembersNames.join(", ")
          : "No splits";

        return (
          <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group/item grid grid-cols-[auto_1fr_auto] gap-5 items-center">
            {/* Date Box */}
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl w-14 py-2 shrink-0 border border-gray-100">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none">{month}</span>
              <span className="text-xl font-bold text-gray-900 leading-none my-1">{day}</span>
              <span className="text-[10px] text-gray-400 font-medium leading-none">{time}</span>
            </div>

            {/* Main Content */}
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-lg truncate mb-1">{tx.description}</h3>

              <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${isCredit ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium text-gray-900">{payerName}</span>
                  <span className="text-gray-400">{isCredit ? 'paid' : 'received'}</span>
                </span>
                <span className="hidden sm:inline text-gray-300">•</span>
                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-medium">{tx.category}</span>
                <span className="hidden sm:inline text-gray-300">•</span>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 sm:mt-0">
                  <Users size={12} className="shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-xs" title={involvedText}>
                    {involvedText}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount & Actions */}
            <div className="flex flex-col items-end gap-1 min-w-[100px]">
              <span className={`font-bold text-xl ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                {isCredit ? '+' : '-'}{Number(tx.amount).toFixed(2)}
              </span>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(tx);
                    }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(tx.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};