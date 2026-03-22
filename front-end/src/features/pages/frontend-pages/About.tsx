import { BookOpen, Search, Shield, Users, Heart, Award } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, SectionHeader, FeatureCard, CTASection } from '@/components/frontend-pages/shared/sections';
import { Link } from 'react-router-dom';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';
import { useEditMode } from '@/context/EditModeContext';

const About = () => {
  const { t } = useLanguage();
  const { getContent } = useEditMode();

  return (
    <>
      {/* Hero */}
      <HeroSection
        badge={t('about.hero_badge')}
        title={t('about.hero_title')}
        subtitle={t('about.hero_subtitle')}
        editKeyPrefix="about.hero"
      />

      {/* Our Purpose */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <div className="om-badge-primary mb-6">
                <EditableText contentKey="about.purpose.badge" as="span" className="om-text-primary text-[14px]">{t('about.purpose_badge')}</EditableText>
              </div>
              <EditableText contentKey="about.purpose.title" as="h2" className="om-heading-primary mb-6">
                {t('about.purpose_title')}
              </EditableText>
              <div className="space-y-4 font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                <EditableText contentKey="about.purpose.p1" as="p" multiline>
                  {t('about.purpose_p1')}
                </EditableText>
                <EditableText contentKey="about.purpose.p2" as="p" multiline>
                  {t('about.purpose_p2')}
                </EditableText>
                <EditableText contentKey="about.purpose.p3" as="p" multiline>
                  {t('about.purpose_p3')}
                </EditableText>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 text-white shadow-xl">
                <BookOpen className="text-[#d4af37] mb-4" size={40} />
                <EditableText contentKey="about.purpose.card1.title" as="h3" className="font-['Inter'] font-medium text-xl mb-2">{t('about.purpose_card1_title')}</EditableText>
                <EditableText contentKey="about.purpose.card1.desc" as="p" className="font-['Inter'] text-[15px] text-[rgba(255,255,255,0.8)]" multiline>
                  {t('about.purpose_card1_desc')}
                </EditableText>
              </div>

              <div className="bg-white dark:bg-gray-800 border-2 border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-sm">
                <Search className="text-[#d4af37] mb-4" size={40} />
                <EditableText contentKey="about.purpose.card2.title" as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">{t('about.purpose_card2_title')}</EditableText>
                <EditableText contentKey="about.purpose.card2.desc" as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400" multiline>
                  {t('about.purpose_card2_desc')}
                </EditableText>
              </div>

              <div className="bg-[#d4af37] rounded-2xl p-8 shadow-xl">
                <Shield className="text-[#2d1b4e] mb-4" size={40} />
                <EditableText contentKey="about.purpose.card3.title" as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] mb-2">{t('about.purpose_card3_title')}</EditableText>
                <EditableText contentKey="about.purpose.card3.desc" as="p" className="font-['Inter'] text-[15px] text-[rgba(45,27,78,0.8)]" multiline>
                  {t('about.purpose_card3_desc')}
                </EditableText>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            badge={t('about.highlights_badge')}
            badgeVariant="secondary"
            title={t('about.highlights_title')}
            subtitle={t('about.highlights_subtitle')}
            editKeyPrefix="about.highlights"
          />
          <div className="grid md:grid-cols-2 gap-8">
            <FeatureCard layout="horizontal" icon={<Users className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />} title={t('about.highlight1_title')} description={t('about.highlight1_desc')} editKeyPrefix="about.highlight1" />
            <FeatureCard layout="horizontal" icon={<Shield className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />} title={t('about.highlight2_title')} description={t('about.highlight2_desc')} editKeyPrefix="about.highlight2" />
            <FeatureCard layout="horizontal" icon={<BookOpen className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />} title={t('about.highlight3_title')} description={t('about.highlight3_desc')} editKeyPrefix="about.highlight3" />
            <FeatureCard layout="horizontal" icon={<Search className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />} title={t('about.highlight4_title')} description={t('about.highlight4_desc')} editKeyPrefix="about.highlight4" />
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            badge={t('about.team_badge')}
            title={t('about.team_title')}
            subtitle={t('about.team_subtitle')}
            editKeyPrefix="about.team"
          />
          <div className="grid md:grid-cols-3 gap-8">
            {TEAM_MEMBERS.map((member, i) => {
              const idx = i + 1;
              const nameFallback = t(`about.team${idx}_name`);
              const displayName = getContent(`about.team.member${idx}.name`, nameFallback);
              const initials = displayName.split(' ').map((n: string) => n[0]).filter(Boolean).join('');
              return (
                <div key={idx} className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] rounded-2xl mx-auto mb-6 flex items-center justify-center">
                    <span className="text-[#d4af37] dark:text-[#2d1b4e] font-['Georgia'] text-4xl">
                      {initials}
                    </span>
                  </div>
                  <EditableText contentKey={`about.team.member${idx}.name`} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
                    {nameFallback}
                  </EditableText>
                  <EditableText contentKey={`about.team.member${idx}.role`} as="p" className="font-['Inter'] text-[14px] text-[#d4af37] mb-3">
                    {t(`about.team${idx}_role`)}
                  </EditableText>
                  <EditableText contentKey={`about.team.member${idx}.bio`} as="p" className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>
                    {t(`about.team${idx}_desc`)}
                  </EditableText>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader title={t('about.values_title')} editKeyPrefix="about.values" />
          <div className="grid md:grid-cols-3 gap-8">
            <ValueCard icon={<Heart className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />} title={t('about.value1_title')} description={t('about.value1_desc')} editKeyPrefix="about.value1" />
            <ValueCard icon={<Shield className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />} title={t('about.value2_title')} description={t('about.value2_desc')} editKeyPrefix="about.value2" />
            <ValueCard icon={<Award className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />} title={t('about.value3_title')} description={t('about.value3_desc')} editKeyPrefix="about.value3" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={t('about.cta_title')}
        subtitle={t('about.cta_subtitle')}
        editKeyPrefix="about.cta"
      >
        <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-accent">{t('about.cta_button')}</Link>
      </CTASection>
    </>
  );
};

export default About;

function ValueCard({ icon, title, description, editKeyPrefix }: { icon: React.ReactNode; title: string; description: string; editKeyPrefix?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-[#f3f4f6] dark:border-gray-700 text-center">
      <div className="w-16 h-16 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-xl flex items-center justify-center mx-auto mb-6">
        {icon}
      </div>
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.title`} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-3">{title}</EditableText>
      ) : (
        <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-3">{title}</h3>
      )}
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.desc`} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>{description}</EditableText>
      ) : (
        <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

// Team member icons are driven by index — only icon placeholders needed
const TEAM_MEMBERS = [1, 2, 3];
