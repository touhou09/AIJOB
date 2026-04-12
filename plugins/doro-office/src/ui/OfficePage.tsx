import { useEffect, useMemo } from 'react';
import type { PluginHostContext } from '@paperclipai/plugin-sdk/ui';
import type { AgentSnapshot } from '../shared/types';
import { AgentCard } from './AgentCard';
import { OfficeAgentPin } from './OfficeAgentPin';
import { OFFICE_SEATS } from './office-layout';
import { useOfficeStore } from './store';
import { AUTO_REFRESH_INTERVAL_MS, useAutoRefreshingRoster } from './useAutoRefreshingRoster';

const GRID_CLASSES = 'do:grid do:grid-cols-2 do:gap-3 md:do:grid-cols-3 lg:do:grid-cols-4';

type OfficePageViewProps = {
  context: PluginHostContext;
  mode: 'page' | 'sidebar';
};

function splitAgentsForOffice(agents: AgentSnapshot[]) {
  return {
    pinnedAgents: agents.slice(0, OFFICE_SEATS.length),
    overflowAgents: agents.slice(OFFICE_SEATS.length),
  };
}

function toTimelineLabel(status: AgentSnapshot['status']) {
  return status.replace(/_/g, ' ');
}

export function OfficePageView({ context, mode }: OfficePageViewProps) {
  const companyId = context.companyId;
  const { roster, loading, error, refresh } = useAutoRefreshingRoster(companyId);

  const {
    agents,
    companyId: storeCompanyId,
    fetchedAt,
    source,
    activeView,
    showBubbles,
    highlightIssues,
    recentEvents,
    replaceRoster,
    setError,
    setLoading,
    setActiveView,
    toggleShowBubbles,
    toggleHighlightIssues,
    reset,
  } = useOfficeStore((state) => state);

  useEffect(() => {
    reset();
  }, [companyId, reset]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (roster) {
      replaceRoster(roster);
    }
  }, [replaceRoster, roster]);

  useEffect(() => {
    setError(error);
  }, [error, setError]);

  const handleRefresh = async () => {
    await refresh();
  };

  const effectiveCompanyId = storeCompanyId ?? companyId;
  const isEmpty = !loading && !error && agents.length === 0;
  const { pinnedAgents, overflowAgents } = useMemo(() => splitAgentsForOffice(agents), [agents]);

  if (mode === 'sidebar') {
    const visibleAgents = agents.slice(0, 4);

    return (
      <section className="do:flex do:h-full do:flex-col do:gap-4 do:rounded-3xl do:border do:border-orange-200 do:bg-orange-50/40 do:p-4 do:text-slate-900">
        <header className="do:flex do:items-start do:justify-between do:gap-3 do:rounded-3xl do:bg-white do:p-4 do:shadow-sm">
          <div>
            <h1 className="do:text-base do:font-semibold do:text-slate-950">Doro Office</h1>
            <p className="do:mt-1 do:text-sm do:text-slate-600">현재 회사 컨텍스트의 에이전트 상태를 카드 요약으로 빠르게 확인합니다.</p>
          </div>
          <button
            className="do:inline-flex do:items-center do:justify-center do:rounded-full do:bg-orange-500 do:px-3 do:py-1.5 do:text-xs do:font-semibold do:text-white disabled:do:cursor-not-allowed disabled:do:bg-orange-300"
            disabled={!companyId}
            onClick={() => {
              void handleRefresh();
            }}
            type="button"
          >
            새로고침
          </button>
        </header>

        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={handleRefresh} /> : null}
        {isEmpty ? <EmptyState /> : null}

        {!loading && !error && visibleAgents.length > 0 ? (
          <div className="do:grid do:gap-3">
            {visibleAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : null}

        {agents.length > visibleAgents.length ? (
          <p className="do:text-sm do:text-slate-500">외 {agents.length - visibleAgents.length}명은 페이지 오피스 레이아웃에서 확인할 수 있습니다.</p>
        ) : null}
      </section>
    );
  }

  const pageDescription =
    activeView === 'office'
      ? `오피스 배경 위 지정 좌표 7석에 에이전트를 배치하고 ${AUTO_REFRESH_INTERVAL_MS / 1_000}초 단위 diff polling으로 갱신합니다.`
      : '말풍선과 오류 강조, timeline 밀도를 조정하는 표시 옵션 설정 패널입니다.';

  return (
    <section className="do:flex do:h-full do:flex-col do:gap-4 do:rounded-3xl do:border do:border-orange-200 do:bg-orange-50/40 do:p-4 do:text-slate-900 md:do:p-6">
      <header className="do:flex do:flex-col do:gap-4 do:rounded-3xl do:bg-white do:p-5 do:shadow-sm">
        <div className="do:flex do:flex-wrap do:items-start do:justify-between do:gap-4">
          <div className="do:min-w-0 do:flex-1">
            <div className="do:flex do:items-center do:gap-3">
              <div aria-hidden="true" className="do:flex do:size-12 do:items-center do:justify-center do:rounded-full do:bg-orange-100 do:text-xl">
                🏢
              </div>
              <div className="do:min-w-0">
                <h1 className="do:text-lg do:font-semibold do:text-slate-950">Doro Office</h1>
                <p className="do:text-sm do:leading-6 do:text-slate-600">{pageDescription}</p>
              </div>
            </div>
          </div>

          <button
            className="do:inline-flex do:items-center do:justify-center do:rounded-full do:bg-orange-500 do:px-4 do:py-2 do:text-sm do:font-semibold do:text-white do:transition hover:do:bg-orange-600 focus-visible:do:outline-2 focus-visible:do:outline-offset-2 focus-visible:do:outline-orange-500 disabled:do:cursor-not-allowed disabled:do:bg-orange-300"
            disabled={!companyId}
            onClick={() => {
              void handleRefresh();
            }}
            type="button"
          >
            새로고침
          </button>
        </div>

        <dl className="do:grid do:gap-3 sm:do:grid-cols-2 xl:do:grid-cols-4">
          <StatusCard label="Company" value={effectiveCompanyId ?? 'No company context'} />
          <StatusCard label="Assigned seats" value={String(pinnedAgents.length)} />
          <StatusCard label="Source" value={source ?? 'waiting'} />
          <StatusCard label="Updated" value={fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : 'waiting'} />
        </dl>

        <div className="do:flex do:flex-wrap do:items-center do:justify-between do:gap-3 do:border-t do:border-orange-100 do:pt-4">
          <div aria-label="페이지 보기 전환" className="do:inline-flex do:rounded-full do:bg-orange-100 do:p-1">
            <TabButton active={activeView === 'office'} label="오피스 레이아웃" onClick={() => setActiveView('office')} />
            <TabButton active={activeView === 'settings'} label="표시 옵션" onClick={() => setActiveView('settings')} />
          </div>
          <p className="do:text-xs do:text-slate-500">1초 polling + 최근 이벤트 timeline + dashboard widget surface를 함께 제공합니다.</p>
        </div>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={handleRefresh} /> : null}
      {isEmpty ? <EmptyState /> : null}

      {!loading && !error && activeView === 'office' && pinnedAgents.length > 0 ? (
        <OfficeLayoutSection
          pinnedAgents={pinnedAgents}
          overflowAgents={overflowAgents}
          recentEvents={recentEvents}
          showBubbles={showBubbles}
          highlightIssues={highlightIssues}
        />
      ) : null}

      {!loading && !error && activeView === 'settings' ? (
        <SettingsSection
          showBubbles={showBubbles}
          highlightIssues={highlightIssues}
          overflowCount={overflowAgents.length}
          onToggleShowBubbles={toggleShowBubbles}
          onToggleHighlightIssues={toggleHighlightIssues}
        />
      ) : null}
    </section>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
};

function StatusCard({ label, value }: StatusCardProps) {
  return (
    <div className="do:rounded-2xl do:bg-slate-50 do:p-4">
      <dt className="do:text-xs do:font-medium do:uppercase do:tracking-wide do:text-slate-500">{label}</dt>
      <dd className="do:mt-1 do:break-all do:text-sm do:font-medium do:text-slate-900">{value}</dd>
    </div>
  );
}

type TabButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function TabButton({ active, label, onClick }: TabButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={`do:rounded-full do:px-4 do:py-2 do:text-sm do:font-semibold ${active ? 'do:bg-white do:text-orange-700 do:shadow-sm' : 'do:text-slate-600'}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

type OfficeLayoutSectionProps = {
  pinnedAgents: AgentSnapshot[];
  overflowAgents: AgentSnapshot[];
  recentEvents: ReturnType<typeof useOfficeStore.getState>['recentEvents'];
  showBubbles: boolean;
  highlightIssues: boolean;
};

function OfficeLayoutSection({ pinnedAgents, overflowAgents, recentEvents, showBubbles, highlightIssues }: OfficeLayoutSectionProps) {
  return (
    <div className="do:grid do:gap-4 xl:do:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
      <section className="do:overflow-hidden do:rounded-[2rem] do:border do:border-orange-200 do:bg-white do:p-4 do:shadow-sm">
        <div className="do:mb-4 do:flex do:items-center do:justify-between do:gap-3">
          <div>
            <h2 className="do:text-base do:font-semibold do:text-slate-950">오피스 레이아웃</h2>
            <p className="do:text-sm do:text-slate-600">7개 좌석 고정 좌표 위에 에이전트를 배치하고 overflow roster는 별도 패널로 분리합니다.</p>
          </div>
          <span className="do:rounded-full do:bg-orange-100 do:px-3 do:py-1 do:text-xs do:font-semibold do:text-orange-700">{pinnedAgents.length}/{OFFICE_SEATS.length} seats</span>
        </div>

        <div className="do:relative do:min-h-[34rem] do:rounded-[1.75rem] do:border do:border-orange-100 do:bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_55%,#ffedd5_100%)] do:p-4">
          <OfficeBackground />

          {OFFICE_SEATS.map((seat, index) => {
            const agent = pinnedAgents[index];
            return (
              <div key={seat.id} className="do:absolute do:-translate-x-1/2 do:-translate-y-1/2" style={{ left: seat.x, top: seat.y }}>
                {agent ? (
                  <OfficeAgentPin
                    agent={agent}
                    emphasizeIssue={highlightIssues}
                    seatLabel={seat.label}
                    showSpeechBubble={showBubbles}
                  />
                ) : (
                  <div className="do:w-40 do:rounded-[1.5rem] do:border do:border-dashed do:border-orange-200 do:bg-white/80 do:px-4 do:py-3 do:text-sm do:text-slate-400">
                    <p className="do:text-[11px] do:font-semibold do:uppercase do:tracking-[0.18em] do:text-orange-400">{seat.label}</p>
                    <p className="do:mt-2">비어 있는 좌석</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <aside className="do:flex do:flex-col do:gap-4">
        <section className="do:rounded-[2rem] do:border do:border-orange-200 do:bg-white do:p-4 do:shadow-sm">
          <h2 className="do:text-base do:font-semibold do:text-slate-950">최근 이벤트 timeline</h2>
          {recentEvents.length > 0 ? (
            <ol className="do:mt-4 do:space-y-3">
              {recentEvents.map((event) => (
                <li key={event.id} className="do:rounded-2xl do:bg-slate-50 do:px-4 do:py-3">
                  <p className="do:text-sm do:font-semibold do:text-slate-950">{event.agentName}</p>
                  <p className="do:mt-1 do:text-sm do:text-slate-600">
                    {event.previousStatus ? `${toTimelineLabel(event.previousStatus)} → ` : ''}
                    {toTimelineLabel(event.nextStatus)}
                  </p>
                  <p className="do:mt-1 do:text-xs do:text-slate-500">{new Date(event.occurredAt).toLocaleTimeString()}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="do:mt-3 do:text-sm do:text-slate-500">최근 30분 내 status 변경이 아직 없습니다.</p>
          )}
        </section>

        <section className="do:rounded-[2rem] do:border do:border-orange-200 do:bg-white do:p-4 do:shadow-sm">
          <h2 className="do:text-base do:font-semibold do:text-slate-950">overflow roster</h2>
          {overflowAgents.length > 0 ? (
            <div className="do:mt-4 do:grid do:gap-3">
              {overflowAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <p className="do:mt-3 do:text-sm do:text-slate-500">현재 모든 에이전트가 7개 좌석 안에 배치되었습니다.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

type SettingsSectionProps = {
  showBubbles: boolean;
  highlightIssues: boolean;
  overflowCount: number;
  onToggleShowBubbles: () => void;
  onToggleHighlightIssues: () => void;
};

function SettingsSection({
  showBubbles,
  highlightIssues,
  overflowCount,
  onToggleShowBubbles,
  onToggleHighlightIssues,
}: SettingsSectionProps) {
  return (
    <section className="do:grid do:gap-4 xl:do:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
      <div className="do:rounded-[2rem] do:border do:border-orange-200 do:bg-white do:p-5 do:shadow-sm">
        <h2 className="do:text-base do:font-semibold do:text-slate-950">표시 옵션</h2>
        <p className="do:mt-2 do:text-sm do:leading-6 do:text-slate-600">
          운영자가 오피스 화면의 정보 밀도를 조절할 수 있도록 말풍선과 오류 강조 표시를 개별적으로 켜고 끌 수 있습니다.
        </p>

        <div className="do:mt-5 do:grid do:gap-4">
          <SettingToggle
            description="각 좌석 카드에 상태 요약 말풍선을 표시합니다."
            label="말풍선 표시"
            onToggle={onToggleShowBubbles}
            pressed={showBubbles}
          />
          <SettingToggle
            description="error 상태 에이전트를 강조 링으로 표시합니다."
            label="오류 상태 강조"
            onToggle={onToggleHighlightIssues}
            pressed={highlightIssues}
          />
        </div>
      </div>

      <div className="do:rounded-[2rem] do:border do:border-orange-200 do:bg-white do:p-5 do:shadow-sm">
        <h2 className="do:text-base do:font-semibold do:text-slate-950">레이아웃 구조</h2>
        <div className="do:mt-4 do:grid do:gap-3">
          <StatusRow label="고정 좌석" value={`${OFFICE_SEATS.length}개`} />
          <StatusRow label="overflow roster" value={overflowCount > 0 ? `${overflowCount}명 별도 표시` : '없음'} />
          <StatusRow label="말풍선" value={showBubbles ? '켜짐' : '꺼짐'} />
          <StatusRow label="오류 강조" value={highlightIssues ? '켜짐' : '꺼짐'} />
          <StatusRow label="자동 갱신" value="1초 polling" />
        </div>
      </div>
    </section>
  );
}

type SettingToggleProps = {
  label: string;
  description: string;
  pressed: boolean;
  onToggle: () => void;
};

function SettingToggle({ label, description, pressed, onToggle }: SettingToggleProps) {
  return (
    <div className="do:flex do:flex-wrap do:items-center do:justify-between do:gap-3 do:rounded-[1.5rem] do:border do:border-orange-100 do:bg-orange-50/60 do:p-4">
      <div className="do:min-w-0 do:flex-1">
        <h3 className="do:text-sm do:font-semibold do:text-slate-950">{label}</h3>
        <p className="do:mt-1 do:text-sm do:leading-6 do:text-slate-600">{description}</p>
      </div>
      <button
        aria-label={label}
        aria-pressed={pressed}
        className={`do:inline-flex do:min-w-24 do:items-center do:justify-center do:rounded-full do:px-4 do:py-2 do:text-sm do:font-semibold ${pressed ? 'do:bg-orange-500 do:text-white' : 'do:bg-white do:text-slate-700 do:ring-1 do:ring-slate-200'}`}
        onClick={onToggle}
        type="button"
      >
        {pressed ? '켜짐' : '꺼짐'}
      </button>
    </div>
  );
}

type StatusRowProps = {
  label: string;
  value: string;
};

function StatusRow({ label, value }: StatusRowProps) {
  return (
    <div className="do:flex do:items-center do:justify-between do:gap-3 do:rounded-2xl do:bg-slate-50 do:px-4 do:py-3">
      <span className="do:text-sm do:text-slate-500">{label}</span>
      <span className="do:text-sm do:font-semibold do:text-slate-900">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-label="에이전트 로스터 로딩 중" className={GRID_CLASSES}>
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="do:animate-pulse do:rounded-3xl do:border do:border-orange-100 do:bg-white do:p-5 do:shadow-sm">
          <div className="do:flex do:items-center do:gap-4">
            <div className="do:size-16 do:rounded-full do:bg-orange-100" />
            <div className="do:flex-1 do:space-y-2">
              <div className="do:h-4 do:w-24 do:rounded-full do:bg-orange-100" />
              <div className="do:h-3 do:w-16 do:rounded-full do:bg-orange-50" />
            </div>
          </div>
          <div className="do:mt-4 do:h-12 do:rounded-2xl do:bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

type ErrorStateProps = {
  message: string;
  onRetry: () => Promise<void>;
};

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="do:rounded-3xl do:border do:border-rose-200 do:bg-rose-50 do:p-6 do:text-rose-900">
      <h2 className="do:text-base do:font-semibold">에이전트 로스터를 불러오지 못했습니다.</h2>
      <p className="do:mt-2 do:text-sm do:leading-6">{message}</p>
      <button
        className="do:mt-4 do:inline-flex do:items-center do:justify-center do:rounded-full do:bg-rose-600 do:px-4 do:py-2 do:text-sm do:font-semibold do:text-white hover:do:bg-rose-700 focus-visible:do:outline-2 focus-visible:do:outline-offset-2 focus-visible:do:outline-rose-500"
        onClick={() => {
          void onRetry();
        }}
        type="button"
      >
        다시 시도
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="do:rounded-3xl do:border do:border-dashed do:border-orange-200 do:bg-white/80 do:p-6 do:text-sm do:leading-6 do:text-slate-600">
      현재 회사 컨텍스트에서 표시할 에이전트가 없습니다.
    </div>
  );
}

function OfficeBackground() {
  return (
    <svg aria-hidden="true" className="do:absolute do:inset-0 do:h-full do:w-full" viewBox="0 0 1200 760">
      <rect fill="#fff7ed" height="760" rx="36" width="1200" />
      <rect fill="#ffedd5" height="170" rx="32" width="320" x="70" y="90" />
      <rect fill="#fdba74" height="22" rx="11" width="200" x="130" y="145" />
      <rect fill="#ffedd5" height="170" rx="32" width="320" x="440" y="90" />
      <rect fill="#fdba74" height="22" rx="11" width="200" x="500" y="145" />
      <rect fill="#ffedd5" height="170" rx="32" width="320" x="810" y="90" />
      <rect fill="#fdba74" height="22" rx="11" width="200" x="870" y="145" />
      <rect fill="#ffedd5" height="170" rx="32" width="320" x="130" y="380" />
      <rect fill="#fdba74" height="22" rx="11" width="200" x="190" y="435" />
      <rect fill="#ffedd5" height="170" rx="32" width="320" x="500" y="380" />
      <rect fill="#fdba74" height="22" rx="11" width="200" x="560" y="435" />
      <rect fill="#ffedd5" height="170" rx="32" width="320" x="870" y="380" />
      <rect fill="#fdba74" height="22" rx="11" width="200" x="930" y="435" />
      <rect fill="#fed7aa" height="88" rx="28" width="380" x="410" y="620" />
      <rect fill="#fb923c" height="20" rx="10" width="220" x="490" y="654" />
    </svg>
  );
}
