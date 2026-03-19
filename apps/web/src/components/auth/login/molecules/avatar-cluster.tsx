import type { CommunityMember } from '../login.types';

interface AvatarClusterProps {
  members: CommunityMember[];
  extraMembersLabel: string;
  caption: string;
}

export function AvatarCluster({ members, extraMembersLabel, caption }: AvatarClusterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center">
        {members.map((member, index) => (
          <span
            key={member.id}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#06271f] text-[11px] font-bold text-[#082b22] ${member.tone}`}
            style={{ marginLeft: index === 0 ? 0 : -8 }}
            title={member.name}
          >
            {member.initials}
          </span>
        ))}
        <span className="-ml-2 inline-flex h-10 items-center rounded-full border-2 border-[#06271f] bg-[#0f7c58] px-3 text-xs font-semibold text-[#cef2e7]">
          {extraMembersLabel}
        </span>
      </div>
      <p className="text-sm text-[#92b8ac]">{caption}</p>
    </div>
  );
}
