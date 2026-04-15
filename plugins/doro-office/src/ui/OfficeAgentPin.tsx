import type { AgentSnapshot, DororongVisualState, SkinMetadata } from '../shared/types';
import { Character } from './Character';

type OfficeAgentPinProps = {
  agent: AgentSnapshot;
  seatLabel: string;
  showSpeechBubble: boolean;
  emphasizeIssue: boolean;
  selectedSkin: SkinMetadata | null;
};

function toVisualTone(status: AgentSnapshot['status']) {
  switch (status) {
    case 'active':
    case 'running':
      return {
        chip: 'do:bg-sky-100 do:text-sky-800',
        bubble: '진행 중',
        aura: 'do:ring-sky-200',
      };
    case 'error':
      return {
        chip: 'do:bg-rose-100 do:text-rose-800',
        bubble: '확인 필요',
        aura: 'do:ring-rose-300',
      };
    case 'paused':
    case 'terminated':
      return {
        chip: 'do:bg-violet-100 do:text-violet-800',
        bubble: '잠시 쉬는 중',
        aura: 'do:ring-violet-200',
      };
    case 'pending_approval':
      return {
        chip: 'do:bg-amber-100 do:text-amber-800',
        bubble: '승인 대기',
        aura: 'do:ring-amber-200',
      };
    default:
      return {
        chip: 'do:bg-emerald-100 do:text-emerald-800',
        bubble: '대기 중',
        aura: 'do:ring-emerald-200',
      };
  }
}

function toVisualState(status: AgentSnapshot['status']): DororongVisualState {
  switch (status) {
    case 'active':
    case 'running':
      return 'working';
    case 'error':
      return 'error';
    case 'paused':
    case 'terminated':
      return 'sleeping';
    default:
      return 'idle';
  }
}

function toInitials(name: string) {
  return name
    .split(/[-\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('');
}

export function OfficeAgentPin({ agent, seatLabel, showSpeechBubble, emphasizeIssue, selectedSkin }: OfficeAgentPinProps) {
  const tone = toVisualTone(agent.status);
  const shouldHighlight = emphasizeIssue && agent.status === 'error';
  const initials = toInitials(agent.name);
  const visualState = toVisualState(agent.status);

  return (
    <article
      aria-label={`${agent.name} 좌석 카드`}
      className={`do:w-44 do:rounded-[1.75rem] do:bg-white/92 do:p-3 do:shadow-lg do:ring-1 do:backdrop-blur do:transition do:duration-700 do:ease-out ${
        shouldHighlight ? 'do:scale-[1.02] do:ring-rose-300' : tone.aura
      }`}
    >
      <p className="do:text-[11px] do:font-semibold do:uppercase do:tracking-[0.18em] do:text-orange-500">{seatLabel}</p>
      <div className="do:mt-2 do:flex do:items-center do:gap-3">
        <div className="do:w-20 do:shrink-0">
          <Character name={agent.name} selectedSkin={selectedSkin} state={visualState} />
        </div>
        <div className="do:min-w-0 do:flex-1">
          <h3 className="do:truncate do:text-sm do:font-semibold do:text-slate-950">{agent.name}</h3>
          <p className="do:text-xs do:text-slate-500">{agent.role}</p>
        </div>
      </div>

      {showSpeechBubble ? (
        <div className="do:mt-3 do:rounded-2xl do:border do:border-orange-200 do:bg-orange-50 do:px-3 do:py-2 do:text-xs do:font-medium do:text-slate-700">
          {tone.bubble}
        </div>
      ) : null}

      <div className="do:mt-3 do:flex do:items-center do:justify-between do:gap-2">
        <span className={`do:rounded-full do:px-2.5 do:py-1 do:text-[11px] do:font-semibold ${tone.chip}`}>{agent.status.replace(/_/g, ' ')}</span>
        <span className="do:text-[11px] do:text-slate-500">{initials}</span>
      </div>
    </article>
  );
}
