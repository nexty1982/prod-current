import { Link } from "react-router";
import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";
import { BookOpen, Search, Shield, Globe, Calendar, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[rgba(212,175,55,0.15)] dark:bg-[rgba(212,175,55,0.2)] px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-[#d4af37] rounded-full"></span>
              <span className="font-['Inter'] text-[14px] text-[#d4af37]">
                Trusted by Orthodox Parishes Worldwide
              </span>
            </div>
            <h1 className="font-['Georgia'] text-5xl md:text-6xl leading-tight mb-6">
              Sacred Records Management for the Modern Parish
            </h1>
            <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] leading-relaxed mb-8">
              Transform centuries of handwritten sacramental records into secure, searchable digital archives. 
              Preserve your spiritual heritage while embracing modern technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/tour"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors"
              >
                Take a Tour
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors"
              >
                Request Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-4">
              <span className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">What We Do</span>
            </div>
            <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
              Digitize. Preserve. Connect.
            </h2>
            <p className="font-['Inter'] text-xl text-[#4a5565] dark:text-gray-400 max-w-2xl mx-auto">
              Orthodox Metrics transforms how parishes manage their most sacred documents
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />
              </div>
              <h3 className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-3">
                Digital Preservation
              </h3>
              <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                Convert fragile handwritten records from baptisms, marriages, and funerals into 
                permanent digital archives that withstand the test of time.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#d4af37] rounded-xl flex items-center justify-center mb-6">
                <Search className="text-[#2d1b4e]" size={32} />
              </div>
              <h3 className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-3">
                Instant Access
              </h3>
              <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                Search your entire parish history in seconds. Find records by name, date, 
                location, or any custom field you need.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] rounded-xl flex items-center justify-center mb-6">
                <Shield className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />
              </div>
              <h3 className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-3">
                Bank-Level Security
              </h3>
              <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                Your sacred records are encrypted and protected with enterprise-grade security, 
                ensuring privacy and compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-[#f9fafb] dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-full mb-4 shadow-sm">
              <span className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">Simple Process</span>
            </div>
            <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
              From Paper to Digital in Three Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-full flex items-center justify-center text-[#d4af37] dark:text-[#2d1b4e] font-['Georgia'] text-xl">
                  1
                </div>
                <div>
                  <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
                    Digitize Records
                  </h3>
                  <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                    Scan or photograph your existing records. Our team can help with bulk digitization if needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-full flex items-center justify-center text-[#d4af37] dark:text-[#2d1b4e] font-['Georgia'] text-xl">
                  2
                </div>
                <div>
                  <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
                    Structure Your Data
                  </h3>
                  <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                    Input sacramental details into organized databases with custom fields for your parish needs.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#d4af37] rounded-full flex items-center justify-center text-[#2d1b4e] font-['Georgia'] text-xl">
                  3
                </div>
                <div>
                  <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
                    Search & Analyze
                  </h3>
                  <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                    Access records instantly, generate reports, and gain insights into your parish history.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-4">
              <span className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">Features</span>
            </div>
            <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
              Built for Orthodox Parishes
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Globe className="text-[#d4af37]" size={28} />}
              title="Multi-Language Support"
              description="Full support for Greek, Russian, Romanian, Georgian, and English records."
            />
            <FeatureCard
              icon={<Calendar className="text-[#d4af37]" size={28} />}
              title="Calendar-Aware"
              description="Supports both Old and New Calendar traditions with liturgical color themes."
            />
            <FeatureCard
              icon={<BarChart3 className="text-[#d4af37]" size={28} />}
              title="Analytics & Reports"
              description="Generate insights about sacramental trends, parish growth, and historical patterns."
            />
            <FeatureCard
              icon={<Shield className="text-[#d4af37]" size={28} />}
              title="Role-Based Access"
              description="Control who can view, edit, or manage different types of records."
            />
            <FeatureCard
              icon={<BookOpen className="text-[#d4af37]" size={28} />}
              title="All Sacraments"
              description="Baptisms, chrismations, marriages, funerals, and custom record types."
            />
            <FeatureCard
              icon={<Search className="text-[#d4af37]" size={28} />}
              title="Advanced Search"
              description="Find any record using names, dates, locations, or custom fields."
            />
          </div>
        </div>
      </section>

      {/* Record Types */}
      <section className="py-20 bg-[#2d1b4e] dark:bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-4">
              All Your Sacred Records, One Platform
            </h2>
            <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.8)] max-w-2xl mx-auto">
              Manage every type of sacramental record your parish maintains
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: "Baptisms", count: "Track godparents, sponsors, priests" },
              { name: "Marriages", count: "Witnesses, dates, locations" },
              { name: "Funerals", count: "Memorial services, burial sites" },
              { name: "Custom Records", count: "Create your own record types" },
            ].map((record) => (
              <div key={record.name} className="bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-xl p-6">
                <h3 className="font-['Inter'] font-medium text-xl mb-2">{record.name}</h3>
                <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)]">{record.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-6">
                <span className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">Why Orthodox Metrics</span>
              </div>
              <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-6">
                Designed with Orthodox Tradition in Mind
              </h2>
              <p className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-8">
                Unlike generic record management systems, Orthodox Metrics was built specifically for 
                Orthodox Christian parishes, respecting the unique needs of our faith tradition.
              </p>
              <div className="space-y-4">
                {[
                  "Follows OCA guidelines for record keeping",
                  "Respects liturgical calendar traditions",
                  "Multilingual support for diverse communities",
                  "Secure, private, and compliant with regulations",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                    <span className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 border border-[rgba(45,27,78,0.1)] dark:border-gray-600">
              <div className="space-y-8">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <div className="text-[#d4af37] font-['Georgia'] text-5xl mb-2">500+</div>
                  <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">Parishes using Orthodox Metrics</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <div className="text-[#2d1b4e] dark:text-[#d4af37] font-['Georgia'] text-5xl mb-2">1M+</div>
                  <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">Records digitized and preserved</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <div className="text-[#d4af37] font-['Georgia'] text-5xl mb-2">15+</div>
                  <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">Countries worldwide</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            Ready to Preserve Your Parish History?
          </h2>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            Join hundreds of Orthodox parishes already protecting their sacred records
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors"
            >
              Get Started Today
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow">
      <div className="w-14 h-14 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">{title}</h3>
      <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
