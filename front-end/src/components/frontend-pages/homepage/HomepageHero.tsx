import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';

const AMBIENT_KEYFRAMES = `
  @keyframes ambientTravelRight1 {
    0% { transform: translate(-100%, 0) scale(1); }
    50% { transform: translate(calc(100vw + 200px), -40px) scale(1.15); }
    100% { transform: translate(-100%, 0) scale(1); }
  }
  @keyframes ambientTravelLeft1 {
    0% { transform: translate(100%, 0) scale(1); }
    50% { transform: translate(calc(-100vw - 300px), 50px) scale(1.2); }
    100% { transform: translate(100%, 0) scale(1); }
  }
  @keyframes ambientTravelRight2 {
    0% { transform: translate(-80%, 0) scale(1); }
    50% { transform: translate(calc(100vw + 150px), 30px) scale(1.1); }
    100% { transform: translate(-80%, 0) scale(1); }
  }
  @keyframes ambientTravelLeft2 {
    0% { transform: translate(120%, 0) scale(1); }
    50% { transform: translate(calc(-100vw - 200px), -20px) scale(1.12); }
    100% { transform: translate(120%, 0) scale(1); }
  }
`;

const HomepageHero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-white">
      {/* Ambient lighting layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Warm golden light — left to right */}
        <div
          className="absolute top-20 -left-40 w-[550px] h-[550px] rounded-full opacity-35"
          style={{
            background: 'radial-gradient(circle, rgba(218,165,32,0.9) 0%, rgba(218,165,32,0.4) 35%, transparent 65%)',
            filter: 'blur(50px)',
            animation: 'ambientTravelRight1 22s ease-in-out infinite',
          }}
        />
        {/* Soft violet — right to left */}
        <div
          className="absolute top-1/3 -right-60 w-[650px] h-[650px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(180,140,220,1) 0%, rgba(180,140,220,0.5) 35%, transparent 65%)',
            filter: 'blur(55px)',
            animation: 'ambientTravelLeft1 28s ease-in-out infinite',
          }}
        />
        {/* Cool blue-white — left to right (slower) */}
        <div
          className="absolute bottom-32 -left-40 w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(230,240,250,0.85) 0%, rgba(230,240,250,0.4) 35%, transparent 65%)',
            filter: 'blur(60px)',
            animation: 'ambientTravelRight2 32s ease-in-out infinite',
          }}
        />
        {/* Secondary golden accent — opposite direction */}
        <div
          className="absolute top-2/3 -right-40 w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,200,100,0.8) 0%, rgba(255,200,100,0.3) 40%, transparent 70%)',
            filter: 'blur(55px)',
            animation: 'ambientTravelLeft2 38s ease-in-out infinite',
          }}
        />
      </div>

      <style>{AMBIENT_KEYFRAMES}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
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
