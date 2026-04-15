import { useMemo } from 'react';
import type { PluginWidgetProps } from '@paperclipai/plugin-sdk/ui';
import { AUTO_REFRESH_INTERVAL_MS, useAutoRefreshingRoster } from './useAutoRefreshingRoster';

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="do:rounded-2xl do:bg-slate-50 do:p-3">
      <div className="do:text-[11px] do:font-semibold do:uppercase do:tracking-[0.18em] do:text-slate-500">{label}</div>
      <div className="do:mt-1 do:text-sm do:font-semibold do:text-slate-950">{value}</div>
    </div>
  );
}

export function PulseWidget({ context }: PluginWidgetProps) {
  const companyId = context.companyId;
  const { roster, error, refresh } = useAutoRefreshingRoster(companyId);

  const agents = roster?.agents ?? [];
  const summary = useMemo(() => {
    const working = agents.filter((agent) => agent.status === 'active' || agent.status === 'running').length;
    const errors = agents.filter((agent) => agent.status === 'error').length;
    const idle = agents.length - working - errors;
    return { working, errors, idle };
  }, [agents]);

  return (
    <section className="do:flex do:flex-col do:gap-3 do:text-slate-900">
      <div className="do:flex do:items-center do:justify-between do:gap-3">
        <div>
          <h2 className="do:text-base do:font-semibold do:text-slate-950">Doro Office Pulse</h2>
          <p className="do:text-xs do:text-slate-500">{`${AUTO_REFRESH_INTERVAL_MS / 1_000}초 간격 roster 요약 위젯`}</p>
        </div>
        <button
          className="do:rounded-full do:bg-orange-500 do:px-3 do:py-1.5 do:text-xs do:font-semibold do:text-white disabled:do:cursor-not-allowed disabled:do:bg-orange-300"
          disabled={!companyId}
          onClick={() => {
            void refresh();
          }}
          type="button"
        >
          새로고침
        </button>
      </div>

      {error ? <p className="do:text-sm do:text-rose-700">{error}</p> : null}

      <div className="do:grid do:grid-cols-3 do:gap-3">
        <SummaryItem label="Working" value={String(summary.working)} />
        <SummaryItem label="Error" value={String(summary.errors)} />
        <SummaryItem label="Idle" value={String(summary.idle)} />
      </div>

      <div className="do:grid do:grid-cols-7 do:gap-2">
        {agents.slice(0, 7).map((agent) => (
          <div
            key={agent.id}
            aria-label={`${agent.name} widget avatar`}
            className={`do:flex do:h-9 do:items-center do:justify-center do:rounded-full do:text-[11px] do:font-semibold ${
              agent.status === 'error'
                ? 'do:bg-rose-100 do:text-rose-800'
                : agent.status === 'active' || agent.status === 'running'
                  ? 'do:bg-sky-100 do:text-sky-800'
                  : 'do:bg-orange-100 do:text-orange-800'
            }`}
          >
            {agent.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>
    </section>
  );
}
