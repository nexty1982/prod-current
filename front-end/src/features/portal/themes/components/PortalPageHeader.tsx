import type { PortalPageHeaderProps } from '../types';
import { cn } from '@/components/portal/ui';

export function PortalPageHeader({ title, description, actions }: PortalPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className={cn('flex items-center gap-2')}>{actions}</div> : null}
    </div>
  );
}
