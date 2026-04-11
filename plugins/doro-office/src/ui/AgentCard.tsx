import type { AgentSnapshot } from '../shared/types';
import { formatHeartbeatAge } from './time';

type AgentCardProps = {
  agent: AgentSnapshot;
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

function toStatusDescription(status: AgentSnapshot['status']) {
  switch (status) {
    case 'active':
      return '작업을 진행 중입니다.';
    case 'paused':
      return '일시 중지 상태입니다.';
    case 'idle':
      return '새 작업을 기다리고 있습니다.';
    case 'running':
      return '실행 중인 프로세스를 모니터링하고 있습니다.';
    case 'error':
      return '확인이 필요한 오류 상태입니다.';
    case 'pending_approval':
      return '승인을 기다리고 있습니다.';
    case 'terminated':
      return '현재 비활성 상태입니다.';
    default:
      return '현재 상태를 확인 중입니다.';
  }
}

function toStatusDot(status: AgentSnapshot['status']) {
  switch (status) {
    case 'active':
      return 'do:bg-emerald-500';
    case 'paused':
      return 'do:bg-violet-500';
    case 'running':
      return 'do:bg-sky-500';
    case 'error':
      return 'do:bg-rose-500';
    case 'pending_approval':
      return 'do:bg-amber-500';
    case 'terminated':
      return 'do:bg-slate-400';
    default:
      return 'do:bg-slate-500';
  }
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <article className="do:flex do:h-full do:flex-col do:gap-4 do:rounded-3xl do:border do:border-orange-200 do:bg-white do:p-5 do:shadow-sm">
      <div className="do:flex do:items-start do:justify-between do:gap-4">
        <div className="do:min-w-0 do:flex-1">
          <p className="do:text-xs do:font-medium do:uppercase do:tracking-[0.18em] do:text-orange-500">{roleLabelMap[agent.role]}</p>
          <h2 className="do:mt-1 do:text-base do:font-semibold do:text-slate-950">{agent.name}</h2>
        </div>
        <span className={`do:inline-flex do:shrink-0 do:rounded-full do:px-2.5 do:py-1 do:text-xs do:font-medium ${statusToneMap[agent.status]}`}>
          {toStatusLabel(agent.status)}
        </span>
      </div>

      <div className="do:flex do:items-center do:gap-4 do:rounded-3xl do:bg-orange-50 do:p-4">
        <div className="do:flex do:size-16 do:shrink-0 do:items-center do:justify-center do:rounded-full do:bg-white do:ring-1 do:ring-orange-200">
          <span aria-hidden="true" className={`do:block do:size-6 do:rounded-full ${toStatusDot(agent.status)}`} />
        </div>
        <div className="do:min-w-0 do:flex-1">
          <p className="do:text-xs do:uppercase do:tracking-wide do:text-orange-600">상태 설명</p>
          <p className="do:mt-1 do:text-sm do:leading-6 do:text-slate-700">{toStatusDescription(agent.status)}</p>
        </div>
      </div>

      <dl className="do:grid do:grid-cols-1 do:gap-3 do:text-sm">
        <div className="do:rounded-2xl do:bg-slate-50 do:p-3">
          <dt className="do:text-xs do:uppercase do:tracking-wide do:text-slate-500">Heartbeat</dt>
          <dd className="do:mt-1 do:font-medium do:text-slate-900">{formatHeartbeatAge(agent.lastHeartbeatAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
