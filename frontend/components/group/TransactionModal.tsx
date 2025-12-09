import React, { useState, useEffect } from 'react';
import { User, Group, Transaction, TransactionType, SplitMode, TransactionSplit } from '../../types';
import api from '../../services/api';
import { X, Check } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  group: Group;
  editingTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  group,
  editingTransaction
}) => {
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txType, setTxType] = useState<TransactionType>(TransactionType.CREDIT);
  const [txCategory, setTxCategory] = useState('Other');
  const [txDate, setTxDate] = useState<string>('');
  const [payerId, setPayerId] = useState<string>(user.id);
  const [splitMode, setSplitMode] = useState<SplitMode>(SplitMode.EQUAL);
  const [selectedOtherMembers, setSelectedOtherMembers] = useState<string[]>([]);
  const [includeMyself, setIncludeMyself] = useState(false);
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        // Edit Mode Initialization
        const tx = editingTransaction;
        setTxDesc(tx.description);
        setTxAmount(tx.amount.toString());
        setTxType(tx.type);
        setTxCategory(tx.category);
        const localDate = new Date(tx.date);
        localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
        setTxDate(localDate.toISOString().slice(0, 16));
        setPayerId(tx.payerId || tx.createdById);
        setSplitMode(tx.splitMode);

        const involvedIds = tx.splits.map(s => s.userId);
        setIncludeMyself(involvedIds.includes(user.id));
        setSelectedOtherMembers(involvedIds.filter(id => id !== user.id));

        const initialSplitValues: Record<string, string> = {};
        if (tx.splitMode === SplitMode.PERCENTAGE) {
          tx.splits.forEach(s => {
            initialSplitValues[s.userId] = (s.percentage || 0).toFixed(2);
          });
        } else if (tx.splitMode === SplitMode.AMOUNT) {
          tx.splits.forEach(s => {
            initialSplitValues[s.userId] = s.amount.toFixed(2);
          });
        }
        setSplitValues(initialSplitValues);
      } else {
        // Add Mode Initialization
        resetForm();
        const otherMemberIds = group.members
          .filter(m => m.userId !== user.id)
          .map(m => m.userId);
        setSelectedOtherMembers(otherMemberIds);
        setIncludeMyself(false);
        setSplitMode(SplitMode.EQUAL);
        setPayerId(user.id);
      }
    }
  }, [isOpen, editingTransaction, group, user.id]);

  const resetForm = () => {
    setTxAmount('');
    setTxDesc('');
    setTxCategory('Other');
    setTxDate('');
    setSplitValues({});
    setSplitMode(SplitMode.EQUAL);
    setIncludeMyself(false);
    setFormErrors([]);
    setPayerId(user.id);
    setTxType(TransactionType.CREDIT);
  };

  // Real-time Validation Effect
  useEffect(() => {
    if (!isOpen) return;

    const errors: string[] = [];
    const involvedIds = [...selectedOtherMembers];
    if (includeMyself) involvedIds.push(user.id);

    if (involvedIds.length === 0) {
      errors.push("Select at least one party");
    }

    if (splitMode !== SplitMode.EQUAL) {
      if (involvedIds.some(id => parseFloat(splitValues[id] || '0') < 0)) {
        errors.push("Negative values not allowed");
      }
    }

    const amount = parseFloat(txAmount);
    if (!isNaN(amount) && involvedIds.length > 0) {
      if (splitMode === SplitMode.PERCENTAGE) {
        const currentTotal = involvedIds.reduce((sum, id) => sum + parseFloat(splitValues[id] || '0'), 0);
        if (Math.abs(currentTotal - 100) > 0.1) {
          errors.push("Percentage does not tally");
        }
      } else if (splitMode === SplitMode.AMOUNT) {
        const currentTotal = involvedIds.reduce((sum, id) => sum + parseFloat(splitValues[id] || '0'), 0);
        if (Math.abs(currentTotal - amount) > 0.01) {
          errors.push("Amount does not tally");
        }
      }
    }

    setFormErrors(errors);
  }, [txAmount, splitMode, splitValues, selectedOtherMembers, includeMyself, isOpen]);

  // Auto-calculate splits
  useEffect(() => {
    if (!isOpen || splitMode === SplitMode.EQUAL) return;
    recalculateSplits(splitMode);
  }, [selectedOtherMembers, includeMyself, splitMode]);

  useEffect(() => {
    if (!isOpen || splitMode !== SplitMode.AMOUNT) return;
    recalculateSplits(SplitMode.AMOUNT);
  }, [txAmount]);

  const recalculateSplits = (mode: SplitMode) => {
    const involvedIds = [...selectedOtherMembers];
    if (includeMyself) involvedIds.push(user.id);
    const count = involvedIds.length;

    if (count === 0) {
      setSplitValues({});
      return;
    }

    const newValues: Record<string, string> = {};

    if (mode === SplitMode.PERCENTAGE) {
      const share = 100 / count;
      let currentSum = 0;
      involvedIds.forEach((id, idx) => {
        if (idx === count - 1) {
          newValues[id] = (100 - currentSum).toFixed(2);
        } else {
          const fixed = share.toFixed(2);
          const val = parseFloat(fixed);
          newValues[id] = fixed;
          currentSum += val;
        }
      });
    } else if (mode === SplitMode.AMOUNT) {
      const total = parseFloat(txAmount);
      if (isNaN(total)) return;

      const share = total / count;
      let currentSum = 0;
      involvedIds.forEach((id, idx) => {
        if (idx === count - 1) {
          newValues[id] = (total - currentSum).toFixed(2);
        } else {
          const fixed = share.toFixed(2);
          const val = parseFloat(fixed);
          newValues[id] = fixed;
          currentSum += val;
        }
      });
    }
    setSplitValues(newValues);
  };

  const handleSplitChange = (changedUserId: string, newValue: string) => {
    if (newValue.includes('-')) return;

    const updatedValues = { ...splitValues, [changedUserId]: newValue };
    const val = parseFloat(newValue);
    if (isNaN(val)) {
      setSplitValues(updatedValues);
      return;
    }
    if (val < 0) return;

    const involvedIds = [...selectedOtherMembers];
    if (includeMyself) involvedIds.push(user.id);
    const otherIds = involvedIds.filter(id => id !== changedUserId);

    if (otherIds.length === 0) {
      setSplitValues(updatedValues);
      return;
    }

    let totalTarget = 0;
    if (splitMode === SplitMode.PERCENTAGE) totalTarget = 100;
    else if (splitMode === SplitMode.AMOUNT) totalTarget = parseFloat(txAmount) || 0;
    else {
      setSplitValues(updatedValues);
      return;
    }

    const remaining = totalTarget - val;
    const count = otherIds.length;
    const share = remaining / count;

    let allocated = 0;
    otherIds.forEach((id, idx) => {
      if (idx === count - 1) {
        updatedValues[id] = (remaining - allocated).toFixed(2);
      } else {
        const s = parseFloat(share.toFixed(2));
        updatedValues[id] = s.toFixed(2);
        allocated += s;
      }
    });

    setSplitValues(updatedValues);
  };

  const toggleOtherMember = (memberId: string) => {
    setSelectedOtherMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getFinalSplits = (totalAmount: number): TransactionSplit[] => {
    const involvedIds = [...selectedOtherMembers];
    if (includeMyself) involvedIds.push(user.id);

    if (involvedIds.length === 0) return [];

    let splits: TransactionSplit[] = [];

    if (splitMode === SplitMode.EQUAL) {
      const share = totalAmount / involvedIds.length;
      splits = involvedIds.map(id => ({ userId: id, amount: parseFloat(share.toFixed(2)) }));
      const sum = splits.reduce((acc, curr) => acc + curr.amount, 0);
      const diff = totalAmount - sum;
      if (splits.length > 0 && Math.abs(diff) > 0.001) {
        splits[0].amount += diff;
      }
    } else if (splitMode === SplitMode.PERCENTAGE) {
      splits = involvedIds.map(id => {
        const val = parseFloat(splitValues[id] || '0');
        return {
          userId: id,
          amount: (val / 100) * totalAmount,
          percentage: val
        };
      });
    } else if (splitMode === SplitMode.AMOUNT) {
      splits = involvedIds.map(id => {
        const val = parseFloat(splitValues[id] || '0');
        return { userId: id, amount: val, percentage: 0 };
      });
    }
    return splits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formErrors.length > 0) return;
    if (!txAmount || !txDesc) return;
    setLoading(true);

    const amount = parseFloat(txAmount);
    const splits = getFinalSplits(amount);

    try {
      const transactionData: any = {
        type: txType,
        amount,
        description: txDesc,
        category: txCategory || 'Other',
        payerId: payerId,
        splitMode,
        splits
      };

      if (editingTransaction) {
        if(txDate) {
          transactionData.date = new Date(txDate).toISOString();
        }
        await api.put(`/groups/${group.id}/transactions/${editingTransaction.id}`, transactionData);
      } else {
        await api.post(`/groups/${group.id}/transactions/`, transactionData);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
            <button type="button" onClick={() => setTxType(TransactionType.DEBIT)} className={`flex-1 py-1.5 text-sm font-medium rounded transition-all ${txType === TransactionType.DEBIT ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Received</button>
            <button type="button" onClick={() => setTxType(TransactionType.CREDIT)} className={`flex-1 py-1.5 text-sm font-medium rounded transition-all ${txType === TransactionType.CREDIT ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Paid</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400"
                placeholder="e.g. Dinner"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400"
                placeholder="e.g. Food"
              />
            </div>
          </div>

          {editingTransaction && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="datetime-local"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {txType === TransactionType.CREDIT ? "Paid By" : "Received By"}
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {group.members.map(member => (
                <option key={member.userId} value={member.userId}>
                  {member.username} {member.userId === user.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-900">Other Parties</label>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button type="button" onClick={() => setSplitMode(SplitMode.EQUAL)} className={`px-2 py-1 text-xs rounded-md transition-all ${splitMode === SplitMode.EQUAL ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Equal</button>
                <button type="button" onClick={() => setSplitMode(SplitMode.AMOUNT)} className={`px-2 py-1 text-xs rounded-md transition-all ${splitMode === SplitMode.AMOUNT ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Amount</button>
                <button type="button" onClick={() => setSplitMode(SplitMode.PERCENTAGE)} className={`px-2 py-1 text-xs rounded-md transition-all ${splitMode === SplitMode.PERCENTAGE ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>%</button>
              </div>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto bg-gray-50 p-2 rounded-lg border border-gray-200">
              <label className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 cursor-pointer select-none">
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${includeMyself ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                  {includeMyself && <Check size={14} className="text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={includeMyself} onChange={(e) => setIncludeMyself(e.target.checked)} />
                <span className="text-sm font-medium text-gray-900 flex-1">Myself</span>
                {includeMyself && splitMode !== SplitMode.EQUAL && (
                  <div className="w-24 relative" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      step={splitMode === SplitMode.AMOUNT ? "0.01" : "1"}
                      min="0"
                      value={splitValues[user.id] || ''}
                      onChange={(e) => handleSplitChange(user.id, e.target.value)}
                      className={`w-full bg-white text-gray-900 border border-gray-300 rounded py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none ${splitMode === SplitMode.AMOUNT ? 'pl-2 pr-2 text-right' : ''} ${splitMode === SplitMode.PERCENTAGE ? 'pl-2 pr-6 text-right' : ''}`}
                      placeholder="0"
                    />
                    {splitMode === SplitMode.PERCENTAGE && (
                      <span className="absolute right-2 top-1.5 text-gray-500 text-xs pointer-events-none">%</span>
                    )}
                  </div>
                )}
              </label>

              {group.members.filter(m => m.userId !== user.id).length === 0 ? (
                <p className="text-xs text-gray-500 italic p-2">No other members in group.</p>
              ) : (
                group.members.filter(m => m.userId !== user.id).map(member => (
                  <label key={member.userId} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors select-none">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedOtherMembers.includes(member.userId) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400 bg-white'}`}>
                      {selectedOtherMembers.includes(member.userId) && <Check size={14} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedOtherMembers.includes(member.userId)}
                      onChange={() => toggleOtherMember(member.userId)}
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{member.username}</span>
                      {/* Using string literal for role check since we might not have import access to enum in this scope if circular, but here we do */}
                      {member.role === 'GUEST' && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Virtual</span>}
                    </div>

                    {selectedOtherMembers.includes(member.userId) && splitMode !== SplitMode.EQUAL && (
                      <div className="w-24 relative" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step={splitMode === SplitMode.AMOUNT ? "0.01" : "1"}
                          min="0"
                          value={splitValues[member.userId] || ''}
                          onChange={(e) => handleSplitChange(member.userId, e.target.value)}
                          className={`w-full bg-white text-gray-900 border border-gray-300 rounded py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none ${splitMode === SplitMode.AMOUNT ? 'pl-2 pr-2 text-right' : ''} ${splitMode === SplitMode.PERCENTAGE ? 'pl-2 pr-6 text-right' : ''}`}
                          placeholder="0"
                        />
                        {splitMode === SplitMode.PERCENTAGE && (
                          <span className="absolute right-2 top-1.5 text-gray-500 text-xs pointer-events-none">%</span>
                        )}
                      </div>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {formErrors.length > 0 && (
            <div className="text-red-500 text-sm mb-4 px-2">
              {formErrors.map((error, index) => (
                <div key={index}>* {error}</div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Saving...' : (editingTransaction ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};