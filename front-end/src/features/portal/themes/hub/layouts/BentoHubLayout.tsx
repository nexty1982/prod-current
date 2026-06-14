import type { PortalHubLayoutProps } from '../portalHubTypes';
import { getRecordTypes, HubActivityFeed, HubHeaderBar, HubOnboarding, HubSearchInput } from '../HubShared';

const BENTO_TILES = [
  {
    shell: 'bg-[#dbeafe] border-[#93c5fd] dark:bg-blue-950/50 dark:border-blue-600',
    icon: 'text-blue-700 dark:text-blue-300',
    label: 'text-blue-900 dark:text-blue-100',
    count: 'text-blue-950 dark:text-blue-50',
  },
  {
    shell: 'bg-[#ffedd5] border-[#fdba74] dark:bg-orange-950/50 dark:border-orange-600',
    icon: 'text-orange-700 dark:text-orange-300',
    label: 'text-orange-900 dark:text-orange-100',
    count: 'text-orange-950 dark:text-orange-50',
  },
  {
    shell: 'bg-[#ede9fe] border-[#c4b5fd] dark:bg-violet-950/50 dark:border-violet-600',
    icon: 'text-violet-700 dark:text-violet-300',
    label: 'text-violet-900 dark:text-violet-100',
    count: 'text-violet-950 dark:text-violet-50',
  },
] as const;

/** #5 Flat Bento Grid — compact KPI strip + activity panel + tool tiles */
export function BentoHubLayout({ hub }: PortalHubLayoutProps) {
  if (hub.dashboardState === 'onboarding') {
    return (
      <div className="space-y-6">
        <HubHeaderBar hub={hub} />
        <HubOnboarding hub={hub} />
      </div>
    );
  }

  const recordTypes = getRecordTypes(hub);

  return (
    <div className="space-y-4">
      <HubHeaderBar hub={hub} />

      {/* KPI strip — compact tiles, content-sized height */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {recordTypes.map((cfg, i) => {
          const Icon = cfg.icon;
          const tile = BENTO_TILES[i];
          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => hub.onRecordsType(cfg.key)}
              className={`flex items-center justify-between gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-transform hover:scale-[1.01] ${tile.shell}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/50 dark:bg-black/20 ${tile.icon}`}>
                  <Icon size={20} />
                </div>
                <p className={`truncate text-sm font-bold ${tile.label}`}>{cfg.label}</p>
              </div>
              <p className={`shrink-0 text-3xl font-black tabular-nums leading-none sm:text-4xl ${tile.count}`}>
                {hub.recordsLoading ? '—' : cfg.count.toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main bento — activity left, tools right; heights follow content */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border-2 border-border bg-card p-5 lg:col-span-8">
          <h2 className="mb-3 text-base font-bold text-foreground">{hub.t('portal.recent_activity')}</h2>
          <HubSearchInput hub={hub} className="mb-4" />
          <HubActivityFeed hub={hub} compact />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-4">
          {hub.quickActions.slice(0, 4).map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-secondary px-3 py-4 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon size={20} className="text-primary" />
                <span className="text-[11px] font-semibold leading-tight text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
