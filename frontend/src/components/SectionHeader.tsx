import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}

export default function SectionHeader({ icon, title, subtitle, badge }: Props) {
  return (
    <div className="px-5 pt-5 pb-3" role="heading" aria-level={2}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-accent-gold opacity-70">{icon}</span>
          <div>
            <h2 className="text-[12px] font-semibold text-text-primary uppercase tracking-[0.12em]">{title}</h2>
            {subtitle && <p className="text-[10px] text-text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge}
      </div>
      <div className="theater-divider mt-3" />
    </div>
  );
}
