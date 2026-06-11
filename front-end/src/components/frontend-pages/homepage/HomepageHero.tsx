import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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
`;

/** Product showcase slides: record views → analytics → certificates */
const SHOWCASE_SLIDE_KEYS = [1, 2, 3, 4, 5] as const;

const SHOWCASE_IMAGES: Record<(typeof SHOWCASE_SLIDE_KEYS)[number], string> = {
  1: '/images/home/table-view-records.png',
  2: '/images/home/cards-view-records.png',
  3: '/images/home/timeline-view-records.png',
  4: '/images/home/analytics-view-records.png',
  5: '/images/home/baptism-certificate.png',
};

const AUTO_MS = 6000;

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

const HomepageHero = () => {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const heroSlides = useMemo(
    () =>
      SHOWCASE_SLIDE_KEYS.map((n) => ({
        image: SHOWCASE_IMAGES[n],
        title: t(`home.hero_slide${n}_title`),
        description: t(`home.hero_slide${n}_desc`),
      })),
    [t],
  );

  const slideCount = heroSlides.length;

  const goTo = useCallback(
    (i: number) => setSlideIdx(((i % slideCount) + slideCount) % slideCount),
    [slideCount],
  );

  const next = useCallback(() => goTo(slideIdx + 1), [goTo, slideIdx]);
  const prev = useCallback(() => goTo(slideIdx - 1), [goTo, slideIdx]);

  useEffect(() => {
    if (lightboxOpen || paused || prefersReducedMotion) return;
    const id = setInterval(() => setSlideIdx((i) => (i + 1) % slideCount), AUTO_MS);
    return () => clearInterval(id);
  }, [lightboxOpen, paused, prefersReducedMotion, slideCount]);

  const openLightbox = useCallback((i: number) => {
    setLightboxIdx(i);
    setLightboxOpen(true);
  }, []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const lbPrev = useCallback(() => setLightboxIdx((i) => (i - 1 + slideCount) % slideCount), [slideCount]);
  const lbNext = useCallback(() => setLightboxIdx((i) => (i + 1) % slideCount), [slideCount]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') lbPrev();
      else if (e.key === 'ArrowRight') lbNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, closeLightbox, lbPrev, lbNext]);

  return (
    <>
      <section
        className="relative overflow-hidden bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-[#120a2a] dark:via-[#1a1038] dark:to-[#24154a] text-white"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
        aria-label="Product views showcase"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-20 -left-40 w-[550px] h-[550px] rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, rgba(218,165,32,0.9) 0%, transparent 65%)',
              filter: 'blur(50px)',
              animation: prefersReducedMotion ? 'none' : 'ambientTravelRight1 60s ease-in-out infinite',
            }}
          />
          <div
            className="absolute top-1/3 -right-60 w-[650px] h-[650px] rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, rgba(180,140,220,1) 0%, transparent 65%)',
              filter: 'blur(55px)',
              animation: prefersReducedMotion ? 'none' : 'ambientTravelLeft1 75s ease-in-out infinite',
            }}
          />
        </div>

        <style>{AMBIENT_KEYFRAMES}</style>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="flex flex-col">
              <div className="relative min-h-[200px] md:min-h-[220px]">
                {heroSlides.map((slide, i) => (
                  <div
                    key={slide.image}
                    className="absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-out"
                    style={{
                      opacity: i === slideIdx ? 1 : 0,
                      transform: i === slideIdx ? 'translateY(0)' : 'translateY(16px)',
                      pointerEvents: i === slideIdx ? 'auto' : 'none',
                    }}
                    aria-hidden={i !== slideIdx}
                  >
                    <h2 className="font-om-display text-2xl md:text-4xl leading-tight mb-4 !text-white tracking-wide">
                      {slide.title}
                    </h2>
                    <p className="font-om-body text-[15px] md:text-[17px] !text-white/85 leading-relaxed">
                      {slide.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-6 mb-8">
                <button
                  type="button"
                  onClick={prev}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                  aria-label="Previous product view"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-2 flex-1 justify-center" role="tablist" aria-label="Product view slides">
                  {heroSlides.map((slide, i) => (
                    <button
                      key={slide.image}
                      type="button"
                      role="tab"
                      aria-selected={i === slideIdx}
                      aria-label={`View ${i + 1}: ${slide.title}`}
                      onClick={() => goTo(i)}
                      className={`h-2 rounded-full transition-all border-0 cursor-pointer ${
                        slideIdx === i ? 'w-8 bg-[var(--om-gold)]' : 'w-2 bg-white/35 hover:bg-white/55'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={next}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                  aria-label="Next product view"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={PUBLIC_ROUTES.ENROLL} className="om-ds-btn om-ds-btn-primary no-underline">
                  {t('home.hero_cta_enroll')}
                  <ArrowRight size={20} />
                </Link>
                <Link
                  to={PUBLIC_ROUTES.SAMPLES}
                  className="om-ds-btn om-ds-btn-secondary !text-white !border-white/40 hover:!bg-white/10 no-underline"
                >
                  {t('tour.cta_samples')}
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div
                className="relative w-full max-w-[700px] aspect-[16/10] cursor-zoom-in rounded-xl border border-white/10 bg-black/20 shadow-2xl overflow-hidden"
                role="button"
                tabIndex={0}
                aria-label="Expand slideshow"
                onClick={() => openLightbox(slideIdx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(slideIdx);
                  }
                }}
              >
                {heroSlides.map((slide, i) => (
                  <img
                    key={slide.image}
                    src={slide.image}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-contain p-2 transition-opacity duration-700"
                    style={{ opacity: i === slideIdx ? 1 : 0 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-0 cursor-pointer"
            aria-label="Close lightbox"
          >
            <X size={24} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              lbPrev();
            }}
            className="absolute left-4 md:left-8 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-0 cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft size={28} />
          </button>
          <div
            className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={heroSlides[lightboxIdx].image}
              alt={heroSlides[lightboxIdx].title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              lbNext();
            }}
            className="absolute right-4 md:right-8 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-0 cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight size={28} />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <span className="font-om-body text-white/60 text-sm">
              {lightboxIdx + 1} / {heroSlides.length}
            </span>
            <div className="flex gap-2">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIdx(i);
                  }}
                  className={`h-2 rounded-full transition-all border-0 cursor-pointer ${
                    lightboxIdx === i ? 'w-6 bg-[var(--om-gold)]' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HomepageHero;
