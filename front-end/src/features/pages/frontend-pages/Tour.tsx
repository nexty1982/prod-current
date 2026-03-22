import { Link } from 'react-router-dom';
import { Upload, Database, Search, BarChart3, Shield, Users, FileText, Calendar, type LucideIcon } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, CTASection, BulletList } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { TourInteractiveDemo } from '@/components/frontend-pages/tour';
import { useLanguage } from '@/context/LanguageContext';

const Tour = () => {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero */}
      <HeroSection
        badge={t('tour.hero_badge')}
        title={t('tour.hero_title')}
        subtitle={t('tour.hero_subtitle')}
        editKeyPrefix="tour.hero"
      />

      {/* Interactive Demo */}
      <TourInteractiveDemo />

      {/* Step 1 */}
      <section className="py-24 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="om-badge-primary mb-6"><EditableText contentKey="tour.step1.badge" as="span" className="om-text-primary text-[14px]">{t('tour.step1_badge')}</EditableText></div>
              <EditableText contentKey="tour.step1.title" as="h2" className="om-heading-primary mb-6">{t('tour.step1_title')}</EditableText>
              <EditableText contentKey="tour.step1.desc" as="p" className="om-text-body mb-6" multiline>
                {t('tour.step1_desc')}
              </EditableText>
              <BulletList
                items={[t('tour.step1_bullet1'), t('tour.step1_bullet2'), t('tour.step1_bullet3'), t('tour.step1_bullet4')]}
                contentKeys={['tour.step1.bullet1', 'tour.step1.bullet2', 'tour.step1.bullet3', 'tour.step1.bullet4']}
              />
            </div>
            <div className="om-card-elevated p-12">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
                <Upload className="text-[#d4af37] mb-4" size={48} />
                <div className="space-y-4">
                  <div className="h-3 bg-[#f3f4f6] dark:bg-gray-700 rounded-full w-full" />
                  <div className="h-3 bg-[#f3f4f6] dark:bg-gray-700 rounded-full w-5/6" />
                  <div className="h-3 bg-[#f3f4f6] dark:bg-gray-700 rounded-full w-4/6" />
                  <div className="mt-6 p-4 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 rounded-lg">
                    <p className="font-['Inter'] text-[14px] om-text-primary">
                      {t('tour.step1_mock_dropzone')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="py-24 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 text-white">
                <Database className="text-[#d4af37] mb-6" size={48} />
                <div className="space-y-6">
                  <MockField label={t('tour.step2_mock_name')} value="John Constantine Papadopoulos" />
                  <div className="grid grid-cols-2 gap-4">
                    <MockField label={t('tour.step2_mock_date')} value="April 15, 1985" />
                    <MockField label={t('tour.step2_mock_type')} value={t('common.record_baptism')} />
                  </div>
                  <MockField label={t('tour.step2_mock_priest')} value="Fr. Michael Antonopoulos" />
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="om-badge-secondary mb-6"><EditableText contentKey="tour.step2.badge" as="span" className="om-text-primary text-[14px]">{t('tour.step2_badge')}</EditableText></div>
              <EditableText contentKey="tour.step2.title" as="h2" className="om-heading-primary mb-6">{t('tour.step2_title')}</EditableText>
              <EditableText contentKey="tour.step2.desc" as="p" className="om-text-body mb-6" multiline>
                {t('tour.step2_desc')}
              </EditableText>
              <BulletList
                items={[t('tour.step2_bullet1'), t('tour.step2_bullet2'), t('tour.step2_bullet3'), t('tour.step2_bullet4')]}
                contentKeys={['tour.step2.bullet1', 'tour.step2.bullet2', 'tour.step2.bullet3', 'tour.step2.bullet4']}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="py-24 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="om-badge-primary mb-6"><EditableText contentKey="tour.step3.badge" as="span" className="om-text-primary text-[14px]">{t('tour.step3_badge')}</EditableText></div>
              <EditableText contentKey="tour.step3.title" as="h2" className="om-heading-primary mb-6">{t('tour.step3_title')}</EditableText>
              <EditableText contentKey="tour.step3.desc" as="p" className="om-text-body mb-6" multiline>
                {t('tour.step3_desc')}
              </EditableText>
              <BulletList
                items={[t('tour.step3_bullet1'), t('tour.step3_bullet2'), t('tour.step3_bullet3'), t('tour.step3_bullet4'), t('tour.step3_bullet5')]}
                contentKeys={['tour.step3.bullet1', 'tour.step3.bullet2', 'tour.step3.bullet3', 'tour.step3.bullet4', 'tour.step3.bullet5']}
              />
            </div>
            <div className="om-card-elevated p-12">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6 p-4 bg-[#f9fafb] dark:bg-gray-800 rounded-lg border-2 border-[#2d1b4e] dark:border-[#d4af37]">
                  <Search className="text-[#4a5565] dark:text-gray-400" size={20} />
                  <span className="font-['Inter'] text-[16px] om-text-primary">Papadopoulos</span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-[#f9fafb] dark:bg-gray-800 rounded-lg border border-[#f3f4f6] dark:border-gray-700 hover:border-[#d4af37] transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-['Inter'] font-medium text-[15px] om-text-primary">John Constantine Papadopoulos</p>
                        <span className="text-[12px] bg-[#d4af37] text-[#2d1b4e] px-2 py-1 rounded">{t('common.record_baptism')}</span>
                      </div>
                      <p className="font-['Inter'] text-[13px] om-text-secondary">April 15, 1985</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 4 */}
      <section className="py-24 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-lg border border-[rgba(45,27,78,0.1)] dark:border-gray-700">
                <BarChart3 className="text-[#d4af37] mb-6" size={48} />
                <div className="space-y-6">
                  <div className="flex items-end gap-2 h-40">
                    <div className="flex-1 bg-gradient-to-t from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] rounded-t-lg" style={{ height: '60%' }} />
                    <div className="flex-1 bg-gradient-to-t from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] rounded-t-lg" style={{ height: '80%' }} />
                    <div className="flex-1 bg-gradient-to-t from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] rounded-t-lg" style={{ height: '100%' }} />
                    <div className="flex-1 bg-gradient-to-t from-[#d4af37] to-[#d4af37] rounded-t-lg" style={{ height: '70%' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[rgba(45,27,78,0.05)] dark:bg-gray-700 rounded-lg">
                      <p className="font-['Inter'] text-[13px] om-text-secondary mb-1">{t('tour.step4_mock_total_baptisms')}</p>
                      <p className="font-['Georgia'] text-2xl om-text-primary">1,247</p>
                    </div>
                    <div className="p-4 bg-[rgba(45,27,78,0.05)] dark:bg-gray-700 rounded-lg">
                      <p className="font-['Inter'] text-[13px] om-text-secondary mb-1">{t('tour.step4_mock_this_year')}</p>
                      <p className="font-['Georgia'] text-2xl om-text-primary">42</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="om-badge-secondary mb-6"><EditableText contentKey="tour.step4.badge" as="span" className="om-text-primary text-[14px]">{t('tour.step4_badge')}</EditableText></div>
              <EditableText contentKey="tour.step4.title" as="h2" className="om-heading-primary mb-6">{t('tour.step4_title')}</EditableText>
              <EditableText contentKey="tour.step4.desc" as="p" className="om-text-body mb-6" multiline>
                {t('tour.step4_desc')}
              </EditableText>
              <BulletList
                items={[t('tour.step4_bullet1'), t('tour.step4_bullet2'), t('tour.step4_bullet3'), t('tour.step4_bullet4'), t('tour.step4_bullet5')]}
                contentKeys={['tour.step4.bullet1', 'tour.step4.bullet2', 'tour.step4.bullet3', 'tour.step4.bullet4', 'tour.step4.bullet5']}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-24 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <EditableText contentKey="tour.extras.title" as="h2" className="om-heading-primary mb-4">{t('tour.extras_title')}</EditableText>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {EXTRA_FEATURES.map((f, i) => {
              const idx = i + 1;
              return (
                <div key={idx} className="text-center">
                  <div className="w-16 h-16 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-xl flex items-center justify-center mx-auto mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">{t(`tour.extra${idx}_title`)}</h3>
                  <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(`tour.extra${idx}_desc`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection title={t('tour.cta_title')} subtitle={t('tour.cta_subtitle')} editKeyPrefix="tour.cta">
        <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-accent">{t('tour.cta_button')}</Link>
      </CTASection>
    </>
  );
};

export default Tour;

// ── Local sub-components ──

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.7)] mb-1">{label}</p>
      <p className="font-['Inter'] text-[16px]">{value}</p>
    </div>
  );
}

// ── Static data (icons only — text comes from translations) ──

const EXTRA_FEATURES: { icon: React.ReactNode }[] = [
  { icon: <Shield className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} /> },
  { icon: <Users className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} /> },
  { icon: <FileText className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} /> },
  { icon: <Calendar className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} /> },
];
