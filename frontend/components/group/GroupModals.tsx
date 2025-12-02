import React, { useState } from 'react';
import { UserRole, User } from '../../types';
import api from '../../services/api';
import { Check, AlertTriangle, FileDown, Calendar } from 'lucide-react';

// --- Add Member Modal ---
interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, groupId, onSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CONTRIBUTOR);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await api.post(`/groups/${groupId}/members`, { identifier, role });
      setSuccessMsg('Member added or invited successfully!');
      setTimeout(() => {
        setIdentifier('');
        onSuccess();
        setSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      if (err.response?.status === 202) {
        setSuccessMsg(err.response.data.detail);
        setTimeout(() => {
          setIdentifier('');
          onSuccess();
          setSuccessMsg('');
        }, 1500);
      } else {
        setError(err.response?.data?.detail || 'Failed to add member.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Add Member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {Object.values(UserRole)
                .filter(r => r !== UserRole.OWNER)
                .map(r => (
                  <option key={r} value={r}>{r === UserRole.GUEST ? 'VIRTUAL (GUEST)' : r}</option>
                ))}
            </select>
            <div className="mt-2 text-xs p-2 bg-gray-50 rounded border border-gray-100 text-gray-600">
              {role === UserRole.GUEST
                ? "Virtual Member: Added directly to this group. Ideal for people without an account."
                : "Registered User: An invitation will be sent to their email to join this group."}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {role === UserRole.GUEST ? "Member Name" : "User Email"}
            </label>
            <input
              type={role === UserRole.GUEST ? "text" : "email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400"
              placeholder={role === UserRole.GUEST ? "e.g. Grandma, Roommate" : "user@example.com"}
              required
            />
          </div>

          {error && <div className="text-red-500 text-sm mt-2 font-medium">{error}</div>}
          {successMsg && <div className="text-green-600 text-sm mt-2 font-medium flex items-center gap-1"><Check size={14} /> {successMsg}</div>}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Processing...' : (role === UserRole.GUEST ? "Add Member" : "Send Invitation")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Edit Group Modal ---
interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onSuccess: () => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({ isOpen, onClose, group, onSuccess }) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.put(`/groups/${group.id}`, { name, description });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update group.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Group</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={3}
            />
          </div>

          {error && <div className="text-red-500 text-sm mt-2 font-medium">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- Delete Confirmation Modal ---
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item?',
  message = 'Are you sure you want to remove this item? This action cannot be undone.'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Export Modal ---
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (fromDate: string, toDate: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const from = new Date();
      from.setMonth(today.getMonth() - 1);

      const format = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      setToDate(format(today));
      setFromDate(format(from));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileDown className="text-indigo-600" size={20} /> Export Report
        </h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onExport(fromDate, toDate)}
            className="flex-1 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};