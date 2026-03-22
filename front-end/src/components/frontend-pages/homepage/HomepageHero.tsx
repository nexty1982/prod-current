import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';

const HomepageHero = () => {
  const { t } = useLanguage();

  return (
    <section className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-[rgba(212,175,55,0.15)] dark:bg-[rgba(212,175,55,0.2)] px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-[#d4af37] rounded-full"></span>
            <EditableText contentKey="hero.badge" as="span" className="font-['Inter'] text-[14px] text-[#d4af37]">
              {t('home.hero_badge')}
            </EditableText>
          </div>
          <EditableText contentKey="hero.title" as="h1" className="font-['Georgia'] text-5xl md:text-6xl leading-tight mb-6">
            {t('home.hero_title')}
          </EditableText>
          <EditableText contentKey="hero.subtitle" as="p" className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] leading-relaxed mb-8" multiline>
            {t('home.hero_subtitle')}
          </EditableText>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to={PUBLIC_ROUTES.TOUR}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors no-underline"
            >
              {t('home.hero_cta_tour')}
              <ArrowRight size={20} />
            </Link>
            <Link
              to={PUBLIC_ROUTES.CONTACT}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors no-underline"
            >
              {t('home.hero_cta_demo')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomepageHero;
