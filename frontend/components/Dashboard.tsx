import React, { useState, useEffect, useCallback } from 'react';
import { User, Group, Invitation } from '../types';
import api from '../services/api';
import { Plus, Users, ArrowRight, FileJson, Mail, Check, X } from 'lucide-react';

interface DashboardProps {
  user: User;
  onSelectGroup: (groupId: string) => void;
  onViewDocs: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onSelectGroup, onViewDocs }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groupsRes, invitationsRes] = await Promise.all([
        api.get('/groups/'),
        api.get('/invitations/')
      ]);
      setGroups(groupsRes.data);
      setInvitations(invitationsRes.data);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    try {
      await api.post('/groups/', { name: newGroupName, description: newGroupDesc });
      setShowCreate(false);
      setNewGroupName('');
      setNewGroupDesc('');
      fetchData(); // Refresh data
    } catch (err) {
      setError('Failed to create group.');
    }
  };

  const handleInvitationResponse = async (invitationId: string, accept: boolean) => {
    console.log(`Responding to invitation ${invitationId}, accept: ${accept}`);
    try {
        const response = await api.post(`/invitations/${invitationId}/respond`, { accept });
        console.log('API Response:', response.data);
        fetchData(); // Refresh data
    } catch (err: any) {
        console.error('Error responding to invitation:', err);
        setError(err.response?.data?.detail || 'Failed to respond to invitation.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-80px)]">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">Welcome back, {user.username}</p>
            </div>
            <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
            <Plus size={20} /> New Group
            </button>
        </div>
        
        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200 mb-6">{error}</div>}

        {/* Invitations Section */}
        {invitations.length > 0 && (
            <div className="mb-10">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="text-indigo-600" size={20} /> 
                    Pending Invitations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {invitations.map(invite => (
                        <div key={invite.id} className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{invite.groupName}</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Invited by <span className="font-medium">{invite.inviterName}</span>
                                </p>
                                <p className="text-xs text-indigo-500 mt-2 font-medium uppercase tracking-wide">
                                    Role: {invite.role}
                                </p>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={() => handleInvitationResponse(invite.id, true)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                                >
                                    <Check size={16} /> Accept
                                </button>
                                <button 
                                    onClick={() => handleInvitationResponse(invite.id, false)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                                >
                                    <X size={16} /> Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {showCreate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Create New Group</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400"
                    placeholder="e.g. Vacation 2024"
                    required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400"
                    placeholder="What's this group for?"
                    rows={3}
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                    Cancel
                    </button>
                    <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                    Create Group
                    </button>
                </div>
                </form>
            </div>
            </div>
        )}

        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Groups</h2>
        {loading ? (
          <div className="text-center py-20"><p>Loading...</p></div>
        ) : groups.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">You aren't in any groups yet.</p>
            <button onClick={() => setShowCreate(true)} className="text-indigo-600 font-medium hover:underline mt-2">Create one now</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
                <div
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                >
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                        <Users size={24} />
                    </div>
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{group.members.length} members</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{group.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 h-10">{group.description || "No description provided."}</p>
                
                <div className="mt-6 flex items-center text-indigo-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                    View Ledger <ArrowRight size={16} className="ml-1" />
                </div>
                </div>
            ))}
            </div>
        )}
      </div>

      <div className="mt-12 pt-6 border-t flex justify-center">
        <button 
          onClick={onViewDocs}
          className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 transition-colors text-sm font-medium"
        >
          <FileJson size={16} /> Backend API Specification
        </button>
      </div>
    </div>
  );
};