import { WhatWeDoPanel } from '@/components/frontend-pages/homepage/HomepageIntro';
import HomepageHero from '@/components/frontend-pages/homepage/HomepageHero';
import HomepageRecordsTransformSection from '@/components/frontend-pages/homepage/records-transform/HomepageRecordsTransformSection';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import RichEditableText from '@/components/frontend-pages/shared/RichEditableText';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  FileBarChart,
  MapPin,
  Search,
  Shield,
  Church,
  TrendingUp,
  type LucideIcon,
} from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ParishRecordsAssessment } from '@/components/frontend-pages/shared/sections';
import { Link } from 'react-router-dom';

const HIGHLIGHT_SLIDE_COUNT = 3;
const HIGHLIGHT_AUTO_MS = 8000;

/** Fixed viewport — tallest slide (features grid) sets height; inner slides scroll if needed. */
const HIGHLIGHT_VIEWPORT_CLASS =
  'relative h-[min(78vh,920px)] sm:h-[min(72vh,840px)] md:h-[620px] lg:h-[580px] overflow-hidden';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

const Homepage = () => {
  const { t } = useLanguage();

  return (
    <>
      <PublicSeo
        title="Sacramental records, modernized for every parish"
        description="Orthodox Metrics is the records platform for Orthodox parishes — secure baptism, marriage, and funeral registers, OCR digitization of historic ledgers, and multi-tenant parish administration."
        path="/"
        bare
      />
      <HomepageHero />
      <HomepageDiocesanAnalyticsSection />
      <HomepageProofStrip />
      <HomepageHighlightCarousel />

      <HomepageRecordsTransformSection />

      {/* Why Choose Us */}
      <section className="py-20 bg-white dark:bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-6">
                <EditableText contentKey="why.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
                  {t('home.why_badge')}
                </EditableText>
              </div>
              <RichEditableText contentKey="why.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-6">
                {t('home.why_title')}
              </RichEditableText>
              <RichEditableText contentKey="why.description" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-8">
                {t('home.why_desc')}
              </RichEditableText>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                    <EditableText contentKey={`why.item${i}`} as="span" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                      {t(`home.why_item${i}`)}
                    </EditableText>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 border border-[rgba(45,27,78,0.1)] dark:border-gray-600">
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0d1117] rounded-xl p-6 shadow-sm">
                  <EditableText contentKey="why.stat1.number" as="div" className="text-[#d4af37] font-['Georgia'] text-5xl mb-2">
                    {t('home.why_stat1_number')}
                  </EditableText>
                  <EditableText contentKey="why.stat1.label" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                    {t('home.why_stat1_label')}
                  </EditableText>
                </div>
                <div className="bg-white dark:bg-[#0d1117] rounded-xl p-6 shadow-sm">
                  <EditableText contentKey="why.stat2.number" as="div" className="text-[#2d1b4e] dark:text-[#d4af37] font-['Georgia'] text-5xl mb-2">
                    {t('home.why_stat2_number')}
                  </EditableText>
                  <EditableText contentKey="why.stat2.label" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                    {t('home.why_stat2_label')}
                  </EditableText>
                </div>
                <div className="bg-white dark:bg-[#0d1117] rounded-xl p-6 shadow-sm">
                  <EditableText contentKey="why.stat3.number" as="div" className="text-[#d4af37] font-['Georgia'] text-5xl mb-2">
                    {t('home.why_stat3_number')}
                  </EditableText>
                  <EditableText contentKey="why.stat3.label" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                    {t('home.why_stat3_label')}
                  </EditableText>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ParishRecordsAssessment />
    </>
  );
};

export default Homepage;

/** Illustrative NY/NJ diocese sample — mirrors onboarded parish data in production */
const DIOCESAN_SAMPLE_STATS = {
  diocese: 'Diocese of New York and New Jersey',
  parishesReporting: 73,
  totalRecords: 63897,
  growthPercent: 14,
  participationRate: 99,
  topParishes: [
    { name: 'Saint Vladimir Church', city: 'Trenton, NJ', total: 3552 },
    { name: 'Saint John the Baptist Church', city: 'Passaic, NJ', total: 2016 },
    { name: 'Church of the Holy Trinity', city: 'Brooklyn, NY', total: 1924 },
    { name: 'SS. Cosmas and Damian Chapel', city: 'Staten Island, NY', total: 1750 },
    { name: 'Holy Apostles Mission', city: 'Lansing, NY', total: 1793 },
  ],
};

const DIOCESAN_ANALYTICS_LINKS: {
  titleKey: string;
  descKey: string;
  to: string;
  icon: LucideIcon;
  external?: boolean;
}[] = [
  {
    titleKey: 'home.diocesan_link_diocesan_title',
    descKey: 'home.diocesan_link_diocesan_desc',
    to: '/dashboards/analytics',
    icon: BarChart3,
  },
  {
    titleKey: 'home.diocesan_link_parish_title',
    descKey: 'home.diocesan_link_parish_desc',
    to: '/portal/charts',
    icon: FileBarChart,
  },
  {
    titleKey: 'home.diocesan_link_explorer_title',
    descKey: 'home.diocesan_link_explorer_desc',
    to: PUBLIC_ROUTES.SAMPLES_EXPLORER,
    icon: Search,
  },
  {
    titleKey: 'home.diocesan_link_tour_title',
    descKey: 'home.diocesan_link_tour_desc',
    to: PUBLIC_ROUTES.TOUR,
    icon: MapPin,
  },
];

function HomepageDiocesanAnalyticsSection() {
  const { t } = useLanguage();
  const maxBar = Math.max(...DIOCESAN_SAMPLE_STATS.topParishes.map((p) => p.total));

  return (
    <section
      className="py-16 md:py-20 border-b border-[rgba(26,54,93,0.1)] dark:border-white/10 bg-gradient-to-b from-[#f5f0e6] to-[#f9fafb] dark:from-[#0d1117] dark:to-[#161b22]"
      aria-label="Diocesan analytics preview"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#1a365d]/10 dark:bg-[#c9a14a]/15 px-4 py-2 rounded-full mb-4">
              <TrendingUp className="text-[#c9a14a]" size={16} aria-hidden />
              <EditableText contentKey="diocesan.badge" as="span" className="font-['Inter'] text-[13px] font-medium text-[#1a365d] dark:text-[#e8d5a3] tracking-wide uppercase">
                {t('home.diocesan_badge')}
              </EditableText>
            </div>
            <RichEditableText contentKey="diocesan.title" as="h2" className="font-['Georgia'] text-3xl md:text-4xl text-[#1a365d] dark:text-white mb-3 leading-tight">
              {t('home.diocesan_title')}
            </RichEditableText>
            <RichEditableText contentKey="diocesan.subtitle" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
              {t('home.diocesan_subtitle')}
            </RichEditableText>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboards/analytics"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a365d] hover:bg-[#2c5282] text-white font-['Inter'] text-sm font-medium transition-colors"
            >
              {t('home.diocesan_cta_dashboard')}
              <ArrowRight size={16} />
            </Link>
            <Link
              to={PUBLIC_ROUTES.SAMPLES_EXPLORER}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#c9a14a] text-[#1a365d] dark:text-[#e8d5a3] hover:bg-[#c9a14a]/10 font-['Inter'] text-sm font-medium transition-colors"
            >
              {t('home.diocesan_cta_explore')}
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Sample metrics + chart */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[#64748b] dark:text-gray-500 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#c9a14a]" aria-hidden />
              {t('home.diocesan_sample_label')}: {DIOCESAN_SAMPLE_STATS.diocese}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { labelKey: 'home.diocesan_stat_parishes', value: DIOCESAN_SAMPLE_STATS.parishesReporting },
                { labelKey: 'home.diocesan_stat_records', value: DIOCESAN_SAMPLE_STATS.totalRecords.toLocaleString() },
                { labelKey: 'home.diocesan_stat_growth', value: `+${DIOCESAN_SAMPLE_STATS.growthPercent}%` },
                { labelKey: 'home.diocesan_stat_participation', value: `${DIOCESAN_SAMPLE_STATS.participationRate}%` },
              ].map((stat) => (
                <div
                  key={stat.labelKey}
                  className="rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-4 shadow-sm"
                >
                  <p className="font-['Inter'] text-[11px] uppercase tracking-wide text-[#64748b] dark:text-gray-500 mb-1">
                    {t(stat.labelKey)}
                  </p>
                  <p className="font-['Georgia'] text-2xl text-[#1a365d] dark:text-[#e8d5a3] tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-5 shadow-sm">
              <h3 className="font-['Inter'] font-medium text-[#1a365d] dark:text-white mb-1">
                {t('home.diocesan_chart_title')}
              </h3>
              <p className="font-['Inter'] text-xs text-[#64748b] dark:text-gray-500 mb-4">{t('home.diocesan_chart_note')}</p>
              <ul className="space-y-3" aria-label="Sample parish record volumes">
                {DIOCESAN_SAMPLE_STATS.topParishes.map((parish) => (
                  <li key={parish.name}>
                    <div className="flex justify-between gap-2 mb-1">
                      <span className="font-['Inter'] text-sm text-[#334155] dark:text-gray-300 truncate">{parish.name}</span>
                      <span className="font-['Inter'] text-xs text-[#64748b] dark:text-gray-500 tabular-nums flex-shrink-0">
                        {parish.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f1f5f9] dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1a365d] to-[#c9a14a]"
                        style={{ width: `${Math.round((parish.total / maxBar) * 100)}%` }}
                      />
                    </div>
                    <span className="font-['Inter'] text-[11px] text-[#94a3b8] dark:text-gray-600">{parish.city}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Analytics destinations */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {DIOCESAN_ANALYTICS_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-4 hover:border-[#c9a14a]/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1a365d]/10 dark:bg-[#c9a14a]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#c9a14a]/20 transition-colors">
                      <Icon className="text-[#1a365d] dark:text-[#c9a14a]" size={20} />
                    </div>
                    <div className="min-w-0">
                      <EditableText contentKey={`diocesan.link.${link.to}.title`} as="h3" className="font-['Inter'] font-medium text-[15px] text-[#1a365d] dark:text-white mb-1 group-hover:text-[#2c5282] dark:group-hover:text-[#e8d5a3]">
                        {t(link.titleKey)}
                      </EditableText>
                      <RichEditableText contentKey={`diocesan.link.${link.to}.desc`} as="p" className="font-['Inter'] text-[13px] text-[#64748b] dark:text-gray-500 leading-snug">
                        {t(link.descKey)}
                      </RichEditableText>
                    </div>
                    <ArrowRight className="text-[#c9a14a] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" size={16} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const PROOF_STRIP_ITEMS: { tKey: string; icon: LucideIcon }[] = [
  { tKey: 'home.proof_records', icon: BookOpen },
  { tKey: 'home.proof_certificates', icon: FileText },
  { tKey: 'home.proof_secure', icon: Shield },
  { tKey: 'home.proof_orthodox', icon: Church },
];

function HomepageProofStrip() {
  const { t } = useLanguage();

  return (
    <section className="py-8 om-section-base border-b border-[rgba(45,27,78,0.08)] dark:border-white/10" aria-label="Product proof">
      <div className="max-w-7xl mx-auto px-6">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0 m-0">
          {PROOF_STRIP_ITEMS.map(({ tKey, icon: Icon }) => (
            <li key={tKey} className="flex items-start gap-3">
              <Icon className="text-[#d4af37] flex-shrink-0 mt-0.5" size={22} aria-hidden />
              <span className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-snug">
                {t(tKey)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HomepageHighlightCarousel() {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [slide, setSlide] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideLabels = [
    t('home.intro_badge'),
    t('home.steps_badge'),
    t('home.features_badge'),
  ];

  const goTo = useCallback((index: number) => {
    setSlide(((index % HIGHLIGHT_SLIDE_COUNT) + HIGHLIGHT_SLIDE_COUNT) % HIGHLIGHT_SLIDE_COUNT);
  }, []);

  const goRelative = useCallback((delta: number) => {
    setSlide((s) => (s + delta + HIGHLIGHT_SLIDE_COUNT) % HIGHLIGHT_SLIDE_COUNT);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!hovered || prefersReducedMotion) return;
    timerRef.current = setInterval(() => {
      setSlide((s) => (s + 1) % HIGHLIGHT_SLIDE_COUNT);
    }, HIGHLIGHT_AUTO_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hovered, prefersReducedMotion]);

  const handleManual = (delta: number) => {
    goRelative(delta);
  };

  const slideLayerClass = (active: boolean) =>
    `absolute inset-0 overflow-y-auto overscroll-contain px-2 md:px-8 transition-opacity duration-500 ease-in-out ${
      active ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
    }`;

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(45,27,78,0.15)] dark:border-white/15 bg-white dark:bg-[#161b22] text-[#2d1b4e] dark:text-[#d4af37] shadow-md hover:bg-[#f9fafb] dark:hover:bg-[#1e2a3a] transition-colors';

  return (
    <section
      className="py-20 bg-[#f9fafb] dark:bg-[#0d1117] relative"
      aria-roledescription="carousel"
      aria-label="What we do, process, and features"
    >
      <div
        className="max-w-7xl mx-auto px-6 md:px-14 relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
        }}
      >
        <button
          type="button"
          className={`${arrowClass} left-0 md:-left-2`}
          onClick={() => handleManual(-1)}
          aria-label={`Previous: ${slideLabels[(slide + HIGHLIGHT_SLIDE_COUNT - 1) % HIGHLIGHT_SLIDE_COUNT]}`}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          className={`${arrowClass} right-0 md:-right-2`}
          onClick={() => handleManual(1)}
          aria-label={`Next: ${slideLabels[(slide + 1) % HIGHLIGHT_SLIDE_COUNT]}`}
        >
          <ChevronRight size={24} />
        </button>

        <div className={HIGHLIGHT_VIEWPORT_CLASS}>
          <div className={slideLayerClass(slide === 0)} aria-hidden={slide !== 0}>
            <WhatWeDoPanel />
          </div>
          <div className={slideLayerClass(slide === 1)} aria-hidden={slide !== 1}>
            <SimpleProcessPanel />
          </div>
          <div className={slideLayerClass(slide === 2)} aria-hidden={slide !== 2}>
            <FeaturesPanel />
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Section slides">
          {slideLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={slide === i}
              aria-label={label}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                slide === i
                  ? 'w-8 bg-[#2d1b4e] dark:bg-[#d4af37]'
                  : 'w-2 bg-[rgba(45,27,78,0.2)] dark:bg-white/25 hover:bg-[rgba(45,27,78,0.35)]'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SimpleProcessPanel() {
  const { t } = useLanguage();

  return (
    <>
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-full mb-4 shadow-sm">
          <EditableText contentKey="steps.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
            {t('home.steps_badge')}
          </EditableText>
        </div>
        <RichEditableText contentKey="steps.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
          {t('home.steps_title')}
        </RichEditableText>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        <StepItem number={1} titleKey="steps.step1.title" descKey="steps.step1.desc" title={t('home.steps_step1_title')} description={t('home.steps_step1_desc')} variant="purple" />
        <StepItem number={2} titleKey="steps.step2.title" descKey="steps.step2.desc" title={t('home.steps_step2_title')} description={t('home.steps_step2_desc')} variant="purple" />
        <StepItem number={3} titleKey="steps.step3.title" descKey="steps.step3.desc" title={t('home.steps_step3_title')} description={t('home.steps_step3_desc')} variant="gold" />
      </div>
    </>
  );
}

function FeaturesPanel() {
  const { t } = useLanguage();

  return (
    <>
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-4">
          <EditableText contentKey="features.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
            {t('home.features_badge')}
          </EditableText>
        </div>
        <RichEditableText contentKey="features.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
          {t('home.features_title')}
        </RichEditableText>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {KEY_FEATURES.map((f, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-lg flex items-center justify-center mb-4">
              <f.icon className="text-[#d4af37] dark:text-[#2d1b4e]" size={28} />
            </div>
            <EditableText contentKey={`features.card${i + 1}.title`} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
              {t(`home.features_feat${i + 1}_title`)}
            </EditableText>
            <RichEditableText contentKey={`features.card${i + 1}.desc`} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
              {t(`home.features_feat${i + 1}_desc`)}
            </RichEditableText>
          </div>
        ))}
      </div>
    </>
  );
}

function StepItem({ number, titleKey, descKey, title, description, variant }: { number: number; titleKey: string; descKey: string; title: string; description: string; variant: 'purple' | 'gold' }) {
  return (
    <div className="relative">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 ${
          variant === 'gold'
            ? 'bg-[#d4af37] text-[#2d1b4e]'
            : 'bg-[#2d1b4e] dark:bg-[#d4af37] text-[#d4af37] dark:text-[#2d1b4e]'
        } rounded-full flex items-center justify-center font-['Georgia'] text-xl`}>
          {number}
        </div>
        <div>
          <EditableText contentKey={titleKey} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
            {title}
          </EditableText>
          <RichEditableText contentKey={descKey} as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
            {description}
          </RichEditableText>
        </div>
      </div>
    </div>
  );
}

const KEY_FEATURES: { icon: LucideIcon }[] = [
  { icon: Globe },
  { icon: Calendar },
  { icon: BarChart3 },
  { icon: Shield },
  { icon: BookOpen },
  { icon: Search },
];
