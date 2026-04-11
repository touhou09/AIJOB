import type { AgentSnapshot } from '../shared/types';
import { formatHeartbeatAge } from './time';

type AgentCardProps = {
  agent: AgentSnapshot;
};

const statusToneMap: Record<AgentSnapshot['status'], string> = {
  active: 'do:bg-emerald-100 do:text-emerald-800',
  paused: 'do:bg-amber-100 do:text-amber-800',
  idle: 'do:bg-slate-100 do:text-slate-800',
  running: 'do:bg-sky-100 do:text-sky-800',
  error: 'do:bg-rose-100 do:text-rose-800',
  pending_approval: 'do:bg-violet-100 do:text-violet-800',
  terminated: 'do:bg-slate-200 do:text-slate-700',
};

const roleLabelMap: Record<AgentSnapshot['role'], string> = {
  ceo: 'CEO',
  cto: 'CTO',
  cmo: 'CMO',
  cfo: 'CFO',
  engineer: 'Engineer',
  designer: 'Designer',
  pm: 'PM',
  qa: 'QA',
  devops: 'DevOps',
  researcher: 'Researcher',
  general: 'General',
};

function toStatusLabel(status: AgentSnapshot['status']) {
  return status.replace(/_/g, ' ');
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '??';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <article className="do:flex do:h-full do:flex-col do:gap-4 do:rounded-3xl do:border do:border-orange-200 do:bg-white do:p-5 do:shadow-sm">
      <div className="do:flex do:items-start do:justify-between do:gap-4">
        <div className="do:flex do:min-w-0 do:items-center do:gap-3">
          <div
            aria-hidden="true"
            className="do:flex do:size-12 do:shrink-0 do:items-center do:justify-center do:rounded-full do:bg-orange-100 do:text-sm do:font-semibold do:text-orange-700"
          >
            {getInitials(agent.name)}
          </div>
          <div className="do:min-w-0">
            <h2 className="do:truncate do:text-base do:font-semibold do:text-slate-950">{agent.name}</h2>
            <p className="do:text-sm do:text-slate-500">{roleLabelMap[agent.role]}</p>
          </div>
        </div>
        <span className={`do:inline-flex do:shrink-0 do:rounded-full do:px-2.5 do:py-1 do:text-xs do:font-medium ${statusToneMap[agent.status]}`}>
          {toStatusLabel(agent.status)}
        </span>
      </div>

      <dl className="do:grid do:grid-cols-2 do:gap-3 do:text-sm">
        <div className="do:rounded-2xl do:bg-slate-50 do:p-3">
          <dt className="do:text-xs do:uppercase do:tracking-wide do:text-slate-500">Agent key</dt>
          <dd className="do:mt-1 do:break-all do:font-medium do:text-slate-900">{agent.urlKey}</dd>
        </div>
        <div className="do:rounded-2xl do:bg-slate-50 do:p-3">
          <dt className="do:text-xs do:uppercase do:tracking-wide do:text-slate-500">Heartbeat</dt>
          <dd className="do:mt-1 do:font-medium do:text-slate-900">{formatHeartbeatAge(agent.lastHeartbeatAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
