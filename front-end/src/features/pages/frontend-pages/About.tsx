import { Link } from 'react-router-dom';
import { ArrowRight, Globe, BookOpen, Shield, Users, Church, Calendar, CheckCircle2 } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, SectionHeader, CTASection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import PageContainer from '@/shared/ui/PageContainer';
import user1 from '@/assets/images/frontend-pages/homepage/user1.jpg';

const About = () => {
  return (
    <PageContainer title="About Us" description="About Orthodox Metrics">
      {/* Hero */}
      <HeroSection
        badge="Our Story"
        title="Built for Orthodox Parishes"
        subtitle="Orthodox Metrics was created to give Orthodox Christian churches a modern, purpose-built platform for managing sacramental records, honoring tradition while simplifying administration."
        editKeyPrefix="about.hero"
      />

      {/* Mission Statement */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="om-badge-primary mb-6 inline-flex">
                <span className="om-text-primary text-[14px]">Our Mission</span>
              </div>
              <h2 className="om-heading-primary mb-6">
                Preserving Sacred Records for Generations
              </h2>
              <p className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-8">
                For centuries, Orthodox parishes have maintained baptism, marriage, and funeral records in handwritten ledgers. These irreplaceable documents deserve better than filing cabinets and fading ink.
              </p>
              <p className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-8">
                Orthodox Metrics brings these records into a secure digital platform designed specifically for the Orthodox Church &mdash; with support for Old and New calendar systems, multilingual entries in Greek, Russian, Romanian, Georgian, and English, and certificate generation that respects liturgical tradition.
              </p>
              <div className="space-y-4">
                {MISSION_POINTS.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                    <span className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 border border-[rgba(45,27,78,0.1)] dark:border-gray-600">
              <div className="space-y-8">
                {STATS.map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                    <div className={`${i % 2 === 0 ? 'text-[#d4af37]' : 'text-[#2d1b4e] dark:text-[#d4af37]'} font-['Georgia'] text-5xl mb-2`}>
                      {stat.value}
                    </div>
                    <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            badge="Why Orthodox Metrics"
            title="Purpose-Built for the Orthodox Church"
            subtitle="Not a generic database adapted for church use. Every feature was designed with Orthodox parishes in mind."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PLATFORM_FEATURES.map((f, i) => (
              <div key={i} className="om-card-compact p-6 hover:shadow-md transition-shadow">
                <div className="om-icon-container-small mb-4">
                  <f.icon className="text-[#d4af37] dark:text-[#2d1b4e]" size={28} />
                </div>
                <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">{f.title}</h3>
                <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            badge="Getting Started"
            title="Simple Onboarding, Lasting Value"
            subtitle="We handle the heavy lifting so your parish can focus on what matters."
          />

          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 ${
                    step.number === 3
                      ? 'bg-[#d4af37] text-[#2d1b4e]'
                      : 'bg-[#2d1b4e] dark:bg-[#d4af37] text-[#d4af37] dark:text-[#2d1b4e]'
                  } rounded-full flex items-center justify-center font-['Georgia'] text-xl`}>
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">{step.title}</h3>
                    <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={user1}
                  alt="Nectarios Parsells"
                  className="w-72 h-80 object-cover rounded-2xl shadow-lg"
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-md px-6 py-3 text-center min-w-[200px]">
                  <h4 className="font-['Inter'] font-semibold text-lg text-[#2d1b4e] dark:text-white">Nectarios Parsells</h4>
                  <p className="font-['Inter'] text-sm text-[#d4af37]">Founder</p>
                </div>
              </div>
            </div>

            <div>
              <div className="om-badge-primary mb-6 inline-flex">
                <span className="om-text-primary text-[14px]">Leadership</span>
              </div>
              <h2 className="om-heading-primary mb-6">
                From Parish Need to Platform
              </h2>
              <p className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-6">
                Orthodox Metrics was born from firsthand experience in an Orthodox parish, where the need for a modern, tradition-aware records system was clear. Existing solutions were either generic church management tools or outdated spreadsheets that didn't respect the unique requirements of Orthodox recordkeeping.
              </p>
              <p className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed">
                Built with input from clergy and parish administrators across multiple jurisdictions, Orthodox Metrics is designed to serve the real needs of the Orthodox Church in North America &mdash; from small mission parishes to established cathedral communities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title="Ready to Modernize Your Parish Records?"
        subtitle="Join parishes across the United States and Canada already using Orthodox Metrics to preserve their sacramental records with care and precision."
        editKeyPrefix="about.cta"
      >
        <Link
          to={PUBLIC_ROUTES.CONTACT}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors no-underline"
        >
          Get in Touch
          <ArrowRight size={20} />
        </Link>
        <Link
          to={PUBLIC_ROUTES.TOUR}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors no-underline"
        >
          Take the Tour
        </Link>
      </CTASection>

      <ScrollToTop />
    </PageContainer>
  );
};

export default About;

// ── Static data ──

const MISSION_POINTS = [
  'OCA-compliant record formats and certificate templates',
  'Dual calendar support for Old and New calendar parishes',
  'Five-language support: English, Greek, Russian, Romanian, Georgian',
  'OCR digitization of historical handwritten ledgers',
];

const STATS = [
  { value: '2025', label: 'Founded to serve the Orthodox Church' },
  { value: '5', label: 'Languages supported across the platform' },
  { value: '8', label: 'Liturgical color themes for parish branding' },
];

const PLATFORM_FEATURES = [
  { icon: BookOpen, title: 'Sacramental Records', description: 'Complete baptism, marriage, and funeral recordkeeping with fields designed around Orthodox canonical requirements.' },
  { icon: Globe, title: 'Multilingual Support', description: 'Enter and display records in English, Greek, Russian, Romanian, and Georgian with proper character support.' },
  { icon: Calendar, title: 'Dual Calendar System', description: 'Track liturgical dates on both Old and New calendars, making it easy to schedule sacraments around feast days.' },
  { icon: Shield, title: 'Secure & Private', description: 'Church data stays protected with per-parish database isolation, encrypted connections, and role-based access controls.' },
  { icon: Church, title: 'Built for Parishes', description: 'Not a generic CRM. Every workflow, form, and certificate template was designed for Orthodox parish administration.' },
  { icon: Users, title: 'Multi-Role Access', description: 'From parish priest to deacon to office staff, each user gets the access level appropriate to their role.' },
];

const STEPS = [
  { number: 1, title: 'Register Your Parish', description: 'Create an account and tell us about your church. We set up your isolated, secure database and configure your parish profile.' },
  { number: 2, title: 'We Handle the Intake', description: 'Send us your existing records, whether digital files or photographs of handwritten ledgers. Our OCR pipeline digitizes them for you.' },
  { number: 3, title: 'Start Managing Records', description: 'Access your parish dashboard to add new records, generate certificates, and manage your sacramental data from any device.' },
];
