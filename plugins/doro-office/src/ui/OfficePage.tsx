import { useCallback, useEffect } from 'react';
import { usePluginAction, usePluginData } from '@paperclipai/plugin-sdk/ui';
import type { PluginHostContext } from '@paperclipai/plugin-sdk/ui';
import type { AgentRosterState, AgentSnapshot } from '../shared/types';
import { AgentCard } from './AgentCard';
import { OfficeAgentPin } from './OfficeAgentPin';
import { OFFICE_SEATS } from './office-layout';
import { useOfficeStore } from './store';

const AUTO_REFRESH_INTERVAL_MS = 10_000;
const PAGE_CARD_LIMIT = OFFICE_SEATS.length;
const SIDEBAR_CARD_LIMIT = 4;

type OfficePageViewProps = {
  context: PluginHostContext;
  mode: 'page' | 'sidebar';
};

export function OfficePageView({ context, mode }: OfficePageViewProps) {
  const companyId = context.companyId;
  const dataQuery = usePluginData<AgentRosterState>('agent-roster', { companyId });
  const refreshRoster = usePluginAction('refresh-agent-roster');

  const {
    agents,
    companyId: storeCompanyId,
    fetchedAt,
    source,
    loading,
    error,
    activeView,
    showBubbles,
    highlightIssues,
    replaceRoster,
    reset,
    setActiveView,
    setError,
    setLoading,
    toggleHighlightIssues,
    toggleShowBubbles,
  } = useOfficeStore((state) => state);

  useEffect(() => {
    reset();
  }, [companyId, reset]);

  useEffect(() => {
    setLoading(dataQuery.loading);
  }, [dataQuery.loading, setLoading]);

  useEffect(() => {
    if (dataQuery.loading) {
      return;
    }

    if (dataQuery.error) {
      setError(dataQuery.error.message);
      return;
    }

    if (dataQuery.data?.error) {
      setError(dataQuery.data.error);
      return;
    }

    if (dataQuery.data) {
      replaceRoster(dataQuery.data);
    }
  }, [dataQuery.data, dataQuery.error, dataQuery.loading, replaceRoster, setError]);

  const handleRefresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!companyId) {
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const payload = await refreshRoster({ companyId });
        replaceRoster(payload as AgentRosterState);
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : 'Failed to refresh roster';
        setError(message);
      }
    },
    [companyId, refreshRoster, replaceRoster, setError, setLoading],
  );

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void handleRefresh({ silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [companyId, handleRefresh]);

  const visibleAgents = mode === 'page' ? agents.slice(0, PAGE_CARD_LIMIT) : agents.slice(0, SIDEBAR_CARD_LIMIT);
  const overflowAgents = mode === 'page' ? agents.slice(PAGE_CARD_LIMIT) : agents.slice(SIDEBAR_CARD_LIMIT);
  const effectiveCompanyId = storeCompanyId ?? companyId;
  const isEmpty = !loading && !error && visibleAgents.length === 0;

  if (mode === 'sidebar') {
    return (
      <section className="do:flex do:h-full do:flex-col do:gap-4 do:rounded-3xl do:border do:border-orange-200 do:bg-orange-50/40 do:p-4 do:text-slate-900">
        <header className="do:flex do:items-start do:justify-between do:gap-3 do:rounded-3xl do:bg-white do:p-4 do:shadow-sm">
          <div>
            <h1 className="do:text-base do:font-semibold do:text-slate-950">Doro Office</h1>
            <p className="do:mt-1 do:text-sm do:text-slate-600">카드 요약으로 빠르게 확인합니다.</p>
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

        {loading ? <LoadingState mode="sidebar" /> : null}
        {error ? <ErrorState message={error} onRetry={handleRefresh} /> : null}
        {isEmpty ? <EmptyState /> : null}

        {!loading && !error && visibleAgents.length > 0 ? (
          <div className="do:grid do:gap-3">
            {visibleAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : null}

        {overflowAgents.length > 0 ? (
          <p className="do:text-sm do:text-slate-500">외 {overflowAgents.length}명은 페이지 오피스 레이아웃에서 확인할 수 있습니다.</p>
        ) : null}
      </section>
    );
  }

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
                <p className="do:text-sm do:leading-6 do:text-slate-600">
                  오피스 레이아웃 위에 7개 좌석을 배치하고 표시 옵션을 조정할 수 있는 MVP-2 모니터링 화면입니다.
                </p>
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
          <StatusCard label="Assigned seats" value={String(visibleAgents.length)} />
          <StatusCard label="Source" value={source ?? 'waiting'} />
          <StatusCard label="Updated" value={fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : 'waiting'} />
        </dl>

        <div className="do:flex do:flex-wrap do:items-center do:justify-between do:gap-3">
          <div className="do:inline-flex do:rounded-full do:bg-orange-100 do:p-1">
            <TabButton active={activeView === 'office'} label="오피스 레이아웃" onClick={() => setActiveView('office')} />
            <TabButton active={activeView === 'settings'} label="표시 옵션" onClick={() => setActiveView('settings')} />
          </div>
          <p className="do:text-xs do:text-slate-500">10초 polling fallback으로 stream 미지원 환경에서도 상태를 갱신합니다.</p>
        </div>
      </header>

      {loading ? <LoadingState mode="page" /> : null}
      {error ? <ErrorState message={error} onRetry={handleRefresh} /> : null}
      {isEmpty ? <EmptyState /> : null}

      {!loading && !error && visibleAgents.length > 0 ? (
        activeView === 'office' ? (
          <OfficeLayoutSection
            agents={visibleAgents}
            highlightIssues={highlightIssues}
            overflowAgents={overflowAgents}
            showBubbles={showBubbles}
          />
        ) : (
          <SettingsSection
            highlightIssues={highlightIssues}
            overflowCount={overflowAgents.length}
            onToggleHighlightIssues={toggleHighlightIssues}
            onToggleShowBubbles={toggleShowBubbles}
            showBubbles={showBubbles}
          />
        )
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
      className={`do:rounded-full do:px-4 do:py-2 do:text-sm do:font-semibold ${
        active ? 'do:bg-white do:text-orange-700 do:shadow-sm' : 'do:text-slate-600'
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

type OfficeLayoutSectionProps = {
  agents: AgentSnapshot[];
  overflowAgents: AgentSnapshot[];
  showBubbles: boolean;
  highlightIssues: boolean;
};

function OfficeLayoutSection({ agents, overflowAgents, showBubbles, highlightIssues }: OfficeLayoutSectionProps) {
  return (
    <div className="do:grid do:gap-4 xl:do:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <section className="do:overflow-hidden do:rounded-[2rem] do:border do:border-orange-200 do:bg-white do:p-4 do:shadow-sm">
        <div className="do:mb-4 do:flex do:items-center do:justify-between do:gap-3">
          <div>
            <h2 className="do:text-base do:font-semibold do:text-slate-950">오피스 레이아웃</h2>
            <p className="do:text-sm do:text-slate-600">에이전트를 지정 좌표 7석에 배치하고 overflow roster는 별도 패널로 분리합니다.</p>
          </div>
          <span className="do:rounded-full do:bg-orange-100 do:px-3 do:py-1 do:text-xs do:font-semibold do:text-orange-700">{agents.length} / {OFFICE_SEATS.length} seats</span>
        </div>

        <div className="do:relative do:min-h-[34rem] do:rounded-[1.75rem] do:border do:border-orange-100 do:bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_55%,#ffedd5_100%)] do:p-4">
          <OfficeBackground />

          {OFFICE_SEATS.map((seat, index) => {
            const agent = agents[index];
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
          <h2 className="do:text-base do:font-semibold do:text-slate-950">표시 옵션 요약</h2>
          <dl className="do:mt-4 do:grid do:gap-3">
            <StatusRow label="말풍선" value={showBubbles ? '켜짐' : '꺼짐'} />
            <StatusRow label="오류 강조" value={highlightIssues ? '켜짐' : '꺼짐'} />
          </dl>
        </section>

        <section className="do:rounded-[2rem] do:border do:border-orange-200 do:bg-white do:p-4 do:shadow-sm">
          <h2 className="do:text-base do:font-semibold do:text-slate-950">Overflow roster</h2>
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
            label="오류 강조"
            onToggle={onToggleHighlightIssues}
            pressed={highlightIssues}
          />
        </div>
      </div>

      <div className="do:rounded-[2rem] do:border do:border-orange-200 do:bg-white do:p-5 do:shadow-sm">
        <h2 className="do:text-base do:font-semibold do:text-slate-950">적용 미리보기</h2>
        <div className="do:mt-4 do:grid do:gap-3">
          <StatusRow label="말풍선" value={showBubbles ? '켜짐' : '꺼짐'} />
          <StatusRow label="오류 강조" value={highlightIssues ? '켜짐' : '꺼짐'} />
          <StatusRow label="overflow roster" value={overflowCount > 0 ? `${overflowCount}명 별도 표시` : '없음'} />
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
        className={`do:inline-flex do:min-w-24 do:items-center do:justify-center do:rounded-full do:px-4 do:py-2 do:text-sm do:font-semibold ${
          pressed ? 'do:bg-orange-500 do:text-white' : 'do:bg-white do:text-slate-700 do:ring-1 do:ring-slate-200'
        }`}
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

type ErrorStateProps = {
  message: string;
  onRetry: () => Promise<void>;
};

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="do:rounded-3xl do:border do:border-rose-200 do:bg-rose-50 do:p-5 do:text-rose-950">
      <p className="do:text-sm do:font-semibold">에이전트 로스터를 불러오지 못했습니다.</p>
      <p className="do:mt-2 do:text-sm do:leading-6">{message}</p>
      <button
        className="do:mt-4 do:inline-flex do:rounded-full do:border do:border-rose-300 do:px-4 do:py-2 do:text-sm do:font-semibold do:text-rose-900"
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
    <div className="do:rounded-3xl do:border do:border-dashed do:border-orange-300 do:bg-white do:p-6 do:text-sm do:text-slate-600">
      표시할 에이전트가 없습니다. 회사 컨텍스트 또는 worker 권한을 확인하세요.
    </div>
  );
}

type LoadingStateProps = {
  mode: 'page' | 'sidebar';
};

function LoadingState({ mode }: LoadingStateProps) {
  const count = mode === 'page' ? 3 : 2;

  return (
    <div className={mode === 'page' ? 'do:grid do:gap-4 xl:do:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]' : 'do:grid do:gap-3'}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} aria-hidden="true" className="do:animate-pulse do:rounded-3xl do:border do:border-orange-100 do:bg-white do:p-5">
          <div className="do:flex do:items-center do:gap-3">
            <div className="do:size-12 do:rounded-full do:bg-orange-100" />
            <div className="do:flex-1 do:space-y-2">
              <div className="do:h-3 do:w-20 do:rounded-full do:bg-orange-100" />
              <div className="do:h-4 do:w-32 do:rounded-full do:bg-orange-200" />
            </div>
          </div>
          <div className="do:mt-6 do:h-32 do:rounded-3xl do:bg-orange-50" />
          <div className="do:mt-4 do:h-12 do:rounded-2xl do:bg-slate-100" />
        </div>
      ))}
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
