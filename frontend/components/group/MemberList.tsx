import React from 'react';
import { Group, Invitation, UserRole } from '../../types';
import { User as UserIcon, Clock } from 'lucide-react';
import api from '../../services/api';

interface MemberListProps {
  group: Group;
  pendingInvites: Invitation[];
  userRole: UserRole;
  onAddMember: () => void;
  calculateStats: (memberId: string) => { paid: number; received: number; balance: number };
  onSuccess: () => void;
  currentUserId: string;
  onRemove: (memberId: string) => void;
}

const RoleDropdown: React.FC<{
  member: Group['members'][0];
  canManage: boolean;
  currentUserId: string;
  groupId: string;
  onSuccess: () => void;
}> = ({ member, canManage, currentUserId, groupId, onSuccess }) => {
  const isOwner = member.role === UserRole.OWNER;
  const isSelf = member.userId === currentUserId;

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    if (window.confirm(`Are you sure you want to change ${member.username}'s role to ${newRole}?`)) {
      try {
        await api.put(`/groups/${groupId}/members/${member.userId}`, { role: newRole });
        onSuccess();
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to update role.');
      }
    }
  };

  if (!canManage || isSelf) {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase
        ${member.role === UserRole.OWNER ? 'bg-purple-100 text-purple-700' :
          member.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-700' :
            member.role === UserRole.GUEST ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
        {member.role === UserRole.GUEST ? 'VIRTUAL' : member.role}
      </span>
    );
  }

  return (
    <select
      value={member.role}
      onChange={handleRoleChange}
      disabled={isOwner}
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase border-none outline-none appearance-none cursor-pointer
        ${isOwner ? 'bg-purple-100 text-purple-700' :
          'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
    >
      {Object.values(UserRole).map(r => (
        <option key={r} value={r} disabled={r === UserRole.OWNER}>
          {r}
        </option>
      ))}
    </select>
  );
};

export const MemberList: React.FC<MemberListProps> = ({ group, pendingInvites, userRole, onAddMember, calculateStats, onSuccess, currentUserId, onRemove }) => {
  const canManageMembers = [UserRole.OWNER, UserRole.ADMIN].includes(userRole);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {canManageMembers && (
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-indigo-900 font-bold">Invite Members</h3>
            <p className="text-indigo-700 text-sm">Add people to collaborate on this ledger.</p>
          </div>
          <button onClick={onAddMember} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">
            Add Member
          </button>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Active Members */}
        {group.members.map((member) => {
          const stats = calculateStats(member.userId);
          return (
            <div key={member.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50 gap-4">
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className={`p-2 rounded-full ${member.role === UserRole.GUEST ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-600'}`}>
                  <UserIcon size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.username}</p>
                  <div className="flex gap-2 items-center mt-1">
                    <RoleDropdown 
                      member={member}
                      canManage={canManageMembers}
                      currentUserId={currentUserId}
                      groupId={group.id}
                      onSuccess={onSuccess}
                    />
                  </div>
                </div>
              </div>

              {/* Financial Stats & Actions */}
              <div className="flex flex-1 items-center justify-between sm:justify-end gap-2 sm:gap-8 bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                <div className="text-center sm:text-right">
                  <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Paid</p>
                  <p className="text-sm font-bold text-green-600">{stats.paid.toFixed(2)}</p>
                </div>
                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                <div className="text-center sm:text-right">
                  <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Received</p>
                  <p className="text-sm font-bold text-red-600">{stats.received.toFixed(2)}</p>
                </div>
                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                <div className="text-center sm:text-right">
                  <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Total</p>
                  <p className={`text-sm font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.balance >= 0 ? '+' : ''}{stats.balance.toFixed(2)}
                  </p>
                </div>
                {canManageMembers && member.role !== UserRole.OWNER && member.role !== UserRole.GUEST && member.userId !== currentUserId && (
                  <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                )}
                {canManageMembers && member.role !== UserRole.OWNER && member.role !== UserRole.GUEST && member.userId !== currentUserId && (
                  <div>
                    <button
                      onClick={() => onRemove(member.userId)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Pending Invitations */}
        {pendingInvites.map(invite => (
          <div key={invite.id} className="flex items-center justify-between p-4 border-b last:border-0 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-500 italic">{invite.inviteeEmail}</p>
                <div className="flex gap-2 items-center mt-1">
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium uppercase">
                    Pending Invitation
                  </span>
                  <span className="text-[10px] text-gray-400 px-1.5 py-0.5">
                    Role: {invite.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 hidden sm:block">
              Waiting for response...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};