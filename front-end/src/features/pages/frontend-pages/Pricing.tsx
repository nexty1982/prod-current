import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, HelpCircle } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, CTASection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import PublicSeo from '@/components/seo/PublicSeo';
import JsonLd from '@/components/seo/JsonLd';
import { useLanguage } from '@/context/LanguageContext';

type PricingTier = 'small' | 'medium' | 'large';

const PagePricing = () => {
  const { t } = useLanguage();
  const [focusedTier, setFocusedTier] = useState<PricingTier>('medium');

  const SMALL_FEAT_KEYS = [1, 2, 3, 4, 5, 6] as const;
  const MEDIUM_FEAT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  const LARGE_FEAT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  const COMPARISON_ROWS = [
    { idx: 1, small: t('pricing.compare_row1_small'), medium: t('pricing.compare_row1_medium'), large: t('pricing.compare_row1_large') },
    { idx: 2, small: t('pricing.compare_row2_small'), medium: t('pricing.compare_row2_medium'), large: t('pricing.compare_row2_large') },
    { idx: 3, small: t('pricing.compare_row3_small'), medium: t('pricing.compare_row3_medium'), large: t('pricing.compare_row3_large') },
    { idx: 4, small: t('pricing.compare_row4_small'), medium: t('pricing.compare_row4_medium'), large: t('pricing.compare_row4_large') },
    { idx: 5, small: t('pricing.compare_row5_small'), medium: t('pricing.compare_row5_medium'), large: t('pricing.compare_row5_large') },
    { idx: 6, small: t('pricing.compare_row6_small'), medium: t('pricing.compare_row6_medium'), large: t('pricing.compare_row6_large') },
    { idx: 7, small: t('pricing.compare_row7_small'), medium: t('pricing.compare_row7_medium'), large: t('pricing.compare_row7_large') },
    { idx: 8, small: t('pricing.compare_row8_small'), medium: t('pricing.compare_row8_medium'), large: t('pricing.compare_row8_large') },
  ];

  const PHASE_ARCHIVAL_ITEMS = [1, 2, 3, 4] as const;
  const PHASE_LIVING_ITEMS = [1, 2, 3, 4, 5] as const;
  const FAQ_INDICES = [1, 2, 3, 4, 5, 6, 7] as const;

  const pricedOffer = (name: string, category: string, price: string) => ({
    '@type': 'Offer' as const,
    name,
    category,
    priceCurrency: 'USD',
    price,
    priceSpecification: {
      '@type': 'PriceSpecification' as const,
      priceCurrency: 'USD',
      valueAddedTaxIncluded: false,
    },
  });

  return (
    <>
      <PublicSeo
        title="Pricing"
        description="Volume-based parish pricing: one-time digitization for historic sacramental books plus affordable monthly hosting for a living parish registry."
        path="/pricing"
      />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://orthodoxmetrics.com/' },
              { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://orthodoxmetrics.com/pricing' },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Orthodox Metrics',
            applicationCategory: 'BusinessApplication',
            applicationSubCategory: 'Church management / sacramental records',
            operatingSystem: 'Web (any modern browser)',
            url: 'https://orthodoxmetrics.com/pricing',
            offers: [
              pricedOffer(t('pricing.plan_small_name'), 'Parish Essentials', '29'),
              pricedOffer(t('pricing.plan_medium_name'), 'Diocesan Standard', '59'),
              pricedOffer(t('pricing.plan_large_name'), 'Cathedral / Archive Pro', '149'),
            ],
          },
        ]}
      />

      <HeroSection
        badge={t('pricing.hero_badge')}
        title={t('pricing.hero_title')}
        subtitle={t('pricing.hero_subtitle')}
        editKeyPrefix="pricing.hero"
      />

      {/* Pricing Cards */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <p className="font-om-body text-center text-[15px] text-[#4a5565] dark:text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            {t('pricing.intro_notice')}
          </p>

          <div
            className="grid md:grid-cols-3 gap-8 mb-16 items-stretch"
            onMouseLeave={() => setFocusedTier('medium')}
          >
            <PricingCard
              tier="small"
              featured={focusedTier === 'small'}
              onFocus={() => setFocusedTier('small')}
              name={t('pricing.plan_small_name')}
              description={t('pricing.plan_small_desc')}
              setupFee={t('pricing.plan_small_setup')}
              hostingFee={t('pricing.plan_small_hosting')}
              hostingAnnual={t('pricing.plan_small_hosting_annual')}
              volumeNote={t('pricing.plan_small_volume')}
              features={SMALL_FEAT_KEYS.map((i) => t(`pricing.plan_small_feat${i}`))}
              btnLabel={t('pricing.btn_get_started')}
            />
            <PricingCard
              tier="medium"
              featured={focusedTier === 'medium'}
              showPopularBadge
              onFocus={() => setFocusedTier('medium')}
              name={t('pricing.plan_medium_name')}
              description={t('pricing.plan_medium_desc')}
              setupFee={t('pricing.plan_medium_setup')}
              hostingFee={t('pricing.plan_medium_hosting')}
              hostingAnnual={t('pricing.plan_medium_hosting_annual')}
              volumeNote={t('pricing.plan_medium_volume')}
              features={MEDIUM_FEAT_KEYS.map((i) => t(`pricing.plan_medium_feat${i}`))}
              btnLabel={t('pricing.btn_get_started')}
            />
            <PricingCard
              tier="large"
              featured={focusedTier === 'large'}
              onFocus={() => setFocusedTier('large')}
              name={t('pricing.plan_large_name')}
              description={t('pricing.plan_large_desc')}
              setupFee={t('pricing.plan_large_setup')}
              hostingFee={t('pricing.plan_large_hosting')}
              hostingAnnual={t('pricing.plan_large_hosting_annual')}
              volumeNote={t('pricing.plan_large_volume')}
              features={LARGE_FEAT_KEYS.map((i) => t(`pricing.plan_large_feat${i}`))}
              btnLabel={t('pricing.btn_contact_sales')}
              isCustomSetup
            />
          </div>

          <p className="font-om-body text-center text-[14px] text-[#4a5565] dark:text-gray-400 max-w-2xl mx-auto mb-16">
            {t('pricing.overage_note')}
          </p>

          {/* How pricing works */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <EditableText contentKey="pricing.phases.title" as="h2" className="font-om-display text-3xl text-[#2d1b4e] dark:text-white mb-3">
                {t('pricing.phases_title')}
              </EditableText>
              <p className="font-om-body text-[15px] text-[#4a5565] dark:text-gray-400 max-w-2xl mx-auto">
                {t('pricing.phases_subtitle')}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <PhaseCard
                title={t('pricing.phase_archival_title')}
                tagline={t('pricing.phase_archival_tagline')}
                items={PHASE_ARCHIVAL_ITEMS.map((i) => t(`pricing.phase_archival_item${i}`))}
              />
              <PhaseCard
                title={t('pricing.phase_living_title')}
                tagline={t('pricing.phase_living_tagline')}
                items={PHASE_LIVING_ITEMS.map((i) => t(`pricing.phase_living_item${i}`))}
              />
            </div>
            <p className="font-om-body text-center text-[14px] text-[#4a5565] dark:text-gray-400 mt-8 max-w-3xl mx-auto leading-relaxed">
              {t('pricing.memorial_note')}
            </p>
          </div>

          {/* Enterprise */}
          <div className="om-public-panel rounded-2xl p-12 text-center">
            <EditableText contentKey="pricing.enterprise.title" as="h3" className="font-om-display text-3xl text-[#2d1b4e] dark:text-white mb-4">
              {t('pricing.enterprise_title')}
            </EditableText>
            <EditableText contentKey="pricing.enterprise.desc" as="p" className="font-om-body text-lg text-[#4a5565] dark:text-gray-400 mb-6 max-w-2xl mx-auto" multiline>
              {t('pricing.enterprise_desc')}
            </EditableText>
            <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-primary">{t('pricing.btn_contact_sales')}</Link>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <EditableText contentKey="pricing.compare.title" as="h2" className="font-om-display text-4xl text-[#2d1b4e] dark:text-white mb-4">{t('pricing.compare_title')}</EditableText>
            <EditableText contentKey="pricing.compare.subtitle" as="p" className="font-om-body text-lg text-[#4a5565] dark:text-gray-400">{t('pricing.compare_subtitle')}</EditableText>
          </div>
          <div className="om-table-container">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="om-table-header">
                    <th className="text-left om-table-cell-header">{t('pricing.compare_header_feature')}</th>
                    <th className="om-table-cell-header">{t('pricing.compare_header_small')}</th>
                    <th className="om-table-cell-header">{t('pricing.compare_header_medium')}</th>
                    <th className="om-table-cell-header">{t('pricing.compare_header_large')}</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.idx} className="om-table-row">
                      <td className="p-6 font-om-body text-[15px] text-[#2d1b4e] dark:text-white">{t(`pricing.compare_row${row.idx}_feature`)}</td>
                      <td className="om-table-cell text-center">{row.small}</td>
                      <td className="om-table-cell text-center">{row.medium}</td>
                      <td className="om-table-cell text-center">{row.large}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 om-section-base">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <EditableText contentKey="pricing.faq.title" as="h2" className="font-om-display text-4xl text-[#2d1b4e] dark:text-white mb-4">{t('pricing.faq_title')}</EditableText>
          </div>
          <div className="space-y-6">
            {FAQ_INDICES.map((idx) => (
              <div key={idx} className="om-public-panel rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-om-body font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">{t(`pricing.faq${idx}_q`)}</h3>
                    <p className="font-om-body text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(`pricing.faq${idx}_a`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection title={t('pricing.cta_title')} subtitle={t('pricing.cta_subtitle')} editKeyPrefix="pricing.cta">
        <Link to={PUBLIC_ROUTES.ENROLL} className="om-btn-accent">{t('pricing.btn_enroll')}</Link>
        <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-secondary">{t('pricing.btn_contact_sales')}</Link>
      </CTASection>
    </>
  );
};

export default PagePricing;

function PhaseCard({ title, tagline, items }: { title: string; tagline: string; items: string[] }) {
  return (
    <div className="om-public-panel rounded-2xl p-8 h-full">
      <h3 className="font-om-display text-xl text-[#2d1b4e] dark:text-white mb-2">{title}</h3>
      <p className="font-om-body text-[15px] text-[#d4af37] mb-4 font-medium">{tagline}</p>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="text-[#d4af37] flex-shrink-0 mt-0.5" size={18} />
            <span className="font-om-body text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingCard({
  tier,
  featured,
  showPopularBadge,
  onFocus,
  name,
  description,
  setupFee,
  hostingFee,
  hostingAnnual,
  volumeNote,
  features,
  btnLabel,
  isCustomSetup,
}: {
  tier: PricingTier;
  featured: boolean;
  showPopularBadge?: boolean;
  onFocus: () => void;
  name: string;
  description: string;
  setupFee: string;
  hostingFee: string;
  hostingAnnual: string;
  volumeNote: string;
  features: string[];
  btnLabel: string;
  isCustomSetup?: boolean;
}) {
  const { t } = useLanguage();
  const ctaTo = isCustomSetup ? PUBLIC_ROUTES.CONTACT : PUBLIC_ROUTES.ENROLL;

  return (
    <div
      className={`
        relative rounded-2xl p-8 flex flex-col transition-all duration-300 ease-out
        ${featured
          ? 'bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#24154a] dark:to-[#1a1038] shadow-xl md:scale-[1.03] z-10'
          : 'om-card hover:shadow-lg md:scale-100 z-0'}
      `}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      tabIndex={0}
      role="article"
      aria-label={name}
      data-tier={tier}
    >
      {showPopularBadge && featured && (
        <div className="absolute top-0 right-8 -translate-y-1/2">
          <span className="bg-[var(--om-gold)] text-[var(--om-text-primary)] px-4 py-1.5 rounded-full font-om-body text-[13px] font-semibold whitespace-nowrap shadow-sm">
            {t('pricing.badge_popular')}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`font-om-display font-semibold text-2xl mb-2 ${featured ? '!text-white' : 'text-[var(--om-text-primary)]'}`}>
          {name}
        </h3>
        <p className={`font-om-body text-[15px] leading-relaxed ${featured ? 'text-white/80' : 'text-[var(--om-text-secondary)]'}`}>
          {description}
        </p>
      </div>

      <div className={`mb-6 rounded-xl p-4 ${featured ? 'bg-white/10' : 'bg-[var(--om-surface-elevated)]'}`}>
        <p className={`font-om-body text-[11px] uppercase tracking-wider mb-1 ${featured ? 'text-white/60' : 'text-[var(--om-text-secondary)]'}`}>
          {t('pricing.label_setup_fee')}
        </p>
        <p className={`font-om-display text-2xl mb-4 ${featured ? '!text-white' : 'text-[var(--om-text-primary)]'}`}>
          {setupFee}
        </p>
        <p className={`font-om-body text-[11px] uppercase tracking-wider mb-1 ${featured ? 'text-white/60' : 'text-[var(--om-text-secondary)]'}`}>
          {t('pricing.label_hosting')}
        </p>
        <p className={`font-om-display text-3xl ${featured ? '!text-white' : 'text-[var(--om-text-primary)]'}`}>
          {hostingFee}
        </p>
        <p className={`font-om-body text-[13px] mt-1 ${featured ? 'text-white/70' : 'text-[var(--om-text-secondary)]'}`}>
          {hostingAnnual}
        </p>
      </div>

      <p className={`font-om-body text-[14px] mb-6 font-medium ${featured ? 'text-[var(--om-gold)]' : 'text-[var(--om-gold)]'}`}>
        {volumeNote}
      </p>

      <ul className="space-y-4 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="flex-shrink-0 mt-0.5 text-[var(--om-gold)]" size={20} />
            <span className={`font-om-body text-[15px] ${featured ? 'text-white/90' : 'text-[var(--om-text-secondary)]'}`}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      <Link
        to={ctaTo}
        className={
          featured
            ? 'block w-full text-center om-ds-btn om-ds-btn-primary'
            : 'block w-full text-center om-ds-btn om-ds-btn-secondary'
        }
      >
        {btnLabel}
      </Link>
    </div>
  );
}
