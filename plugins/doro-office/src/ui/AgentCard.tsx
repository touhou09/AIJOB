import type { AgentSnapshot } from '../shared/types';
import { formatHeartbeatAge } from './time';

type AgentCardProps = {
  agent: AgentSnapshot;
  isSelected?: boolean;
  onSelect?: (agent: AgentSnapshot) => void;
};

const statusToneMap: Record<AgentSnapshot['status'], string> = {
  active: 'do:bg-emerald-100 do:text-emerald-800',
  paused: 'do:bg-violet-100 do:text-violet-800',
  idle: 'do:bg-slate-100 do:text-slate-800',
  running: 'do:bg-sky-100 do:text-sky-800',
  error: 'do:bg-rose-100 do:text-rose-800',
  pending_approval: 'do:bg-amber-100 do:text-amber-800',
  terminated: 'do:bg-slate-200 do:text-slate-700',
};

const statusDotMap: Record<AgentSnapshot['status'], string> = {
  active: 'do:bg-emerald-500',
  paused: 'do:bg-violet-500',
  idle: 'do:bg-slate-500',
  running: 'do:bg-sky-500',
  error: 'do:bg-rose-500',
  pending_approval: 'do:bg-amber-500',
  terminated: 'do:bg-slate-400',
};

function toStatusLabel(status: AgentSnapshot['status']) {
  return status.replace(/_/g, ' ');
}

export function AgentCard({ agent, isSelected = false, onSelect }: AgentCardProps) {
  const content = (
    <>
      <div className="do:flex do:items-start do:gap-4">
        <div className="do:flex do:size-16 do:shrink-0 do:items-center do:justify-center do:rounded-full do:bg-orange-50 do:ring-1 do:ring-orange-200">
          <span aria-hidden="true" className={`do:block do:size-6 do:rounded-full ${statusDotMap[agent.status]}`} />
        </div>
        <div className="do:min-w-0 do:flex-1">
          <h2 className="do:text-base do:font-semibold do:text-slate-950">{agent.name}</h2>
          <p className={`do:mt-2 do:inline-flex do:rounded-full do:px-2.5 do:py-1 do:text-xs do:font-medium ${statusToneMap[agent.status]}`}>
            {toStatusLabel(agent.status)}
          </p>
        </div>
      </div>

      <dl className="do:grid do:grid-cols-1 do:gap-3 do:text-sm">
        <div className="do:rounded-2xl do:bg-slate-50 do:p-3">
          <dt className="do:text-xs do:uppercase do:tracking-wide do:text-slate-500">Heartbeat</dt>
          <dd className="do:mt-1 do:font-medium do:text-slate-900">{formatHeartbeatAge(agent.lastHeartbeatAt)}</dd>
        </div>
      </dl>
    </>
  );

  if (onSelect) {
    return (
      <button
        aria-label={`${agent.name} 상세 패널 열기`}
        aria-pressed={isSelected}
        className={`do:flex do:h-full do:w-full do:flex-col do:gap-4 do:rounded-3xl do:border do:bg-white do:p-5 do:text-left do:shadow-sm do:transition hover:do:border-orange-300 hover:do:shadow ${
          isSelected ? 'do:border-orange-400 do:ring-2 do:ring-orange-200' : 'do:border-orange-200'
        }`}
        onClick={() => onSelect(agent)}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <article className="do:flex do:h-full do:flex-col do:gap-4 do:rounded-3xl do:border do:border-orange-200 do:bg-white do:p-5 do:shadow-sm">{content}</article>;
}
