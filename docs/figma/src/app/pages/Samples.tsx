import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";
import { Calendar, User, MapPin, BookOpen } from "lucide-react";

export default function Samples() {
  return (
    <div className="om-page-container">
      <Navigation />

      {/* Hero */}
      <section className="om-hero-gradient py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="om-hero-badge mb-6">
            <span className="om-hero-badge-text">Sample Records</span>
          </div>
          <h1 className="font-['Georgia'] text-5xl md:text-6xl mb-6">
            See Real Parish Records
          </h1>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-2xl mx-auto">
            Explore authentic examples of how Orthodox parishes digitize and preserve their sacramental records
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 om-section-base">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="om-text-body mb-6">
            The following samples demonstrate real-world use cases of Orthodox Metrics. 
            All personally identifying information has been anonymized while preserving 
            the structure and detail that makes our system effective.
          </p>
          <div className="om-badge-secondary inline-block">
            <span className="om-text-primary text-[14px]">
              ✓ HIPAA Compliant  •  ✓ GDPR Compliant  •  ✓ Secure by Design
            </span>
          </div>
        </div>
      </section>

      {/* Sample: Baptism Record */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Record Visual */}
            <div>
              <div className="om-badge-primary mb-6">
                <BookOpen className="om-feature-icon" size={18} />
                <span className="om-text-primary text-[14px]">Baptism Record</span>
              </div>
              <h2 className="om-heading-primary mb-6">
                Sacrament of Baptism
              </h2>
              <p className="om-text-body mb-8">
                A complete baptismal record showing all key participants, dates, and locations. 
                This template follows traditional Orthodox record-keeping practices while 
                providing modern searchability.
              </p>

              {/* Mock Handwritten Document */}
              <div className="om-card-elevated p-8">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
                  <div className="border-l-4 border-[#d4af37] pl-6 mb-6">
                    <p className="font-['Georgia'] text-2xl om-text-primary mb-2">
                      Certificate of Baptism
                    </p>
                    <p className="font-['Inter'] text-[14px] om-text-secondary italic">
                      Holy Trinity Orthodox Church • San Francisco, CA
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="pb-3 om-divider">
                      <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Child's Name</p>
                      <p className="font-['Georgia'] text-lg om-text-primary">
                        Sophia Anastasia Petrov
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="pb-3 om-divider">
                        <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Date of Birth</p>
                        <p className="font-['Inter'] text-[15px] om-text-primary">March 12, 2023</p>
                      </div>
                      <div className="pb-3 om-divider">
                        <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Date of Baptism</p>
                        <p className="font-['Inter'] text-[15px] om-text-primary">April 2, 2023</p>
                      </div>
                    </div>

                    <div className="pb-3 om-divider">
                      <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Parents</p>
                      <p className="font-['Inter'] text-[15px] om-text-primary">
                        Nicholas & Elena Petrov
                      </p>
                    </div>

                    <div className="pb-3 om-divider">
                      <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Godparents</p>
                      <p className="font-['Inter'] text-[15px] om-text-primary">
                        Alexander Dimitrov & Maria Konstantinov
                      </p>
                    </div>

                    <div className="pb-3 om-divider">
                      <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Celebrant</p>
                      <p className="font-['Inter'] text-[15px] om-text-primary">
                        Fr. John Alexopoulos
                      </p>
                    </div>

                    <div className="mt-6 pt-6 om-divider">
                      <p className="font-['Inter'] text-[12px] om-text-tertiary">
                        Record No. B-2023-042 • Entered: April 3, 2023
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Digitized Data Display */}
            <div>
              <div className="om-badge-secondary mb-6">
                <span className="om-text-primary text-[14px]">Digitized Format</span>
              </div>
              <h3 className="om-heading-secondary mb-6">
                Structured & Searchable
              </h3>
              <p className="om-text-body mb-8">
                The same information transformed into a searchable database format with 
                advanced filtering and reporting capabilities.
              </p>

              <div className="space-y-4">
                {/* Search Fields */}
                <div className="om-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="om-feature-icon" size={20} />
                    <h4 className="om-heading-tertiary text-lg">Primary Information</h4>
                  </div>
                  <div className="space-y-3">
                    <DataField label="Full Name" value="Sophia Anastasia Petrov" searchable />
                    <DataField label="Christian Name" value="Sophia" searchable />
                    <DataField label="Birth Date" value="March 12, 2023" searchable />
                    <DataField label="Baptism Date" value="April 2, 2023" searchable />
                  </div>
                </div>

                <div className="om-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="om-feature-icon" size={20} />
                    <h4 className="om-heading-tertiary text-lg">Family & Sponsors</h4>
                  </div>
                  <div className="space-y-3">
                    <DataField label="Father" value="Nicholas Petrov" searchable />
                    <DataField label="Mother" value="Elena Petrov" searchable />
                    <DataField label="Godfather" value="Alexander Dimitrov" searchable />
                    <DataField label="Godmother" value="Maria Konstantinov" searchable />
                  </div>
                </div>

                <div className="om-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="om-feature-icon" size={20} />
                    <h4 className="om-heading-tertiary text-lg">Location & Clergy</h4>
                  </div>
                  <div className="space-y-3">
                    <DataField label="Parish" value="Holy Trinity Orthodox Church" searchable />
                    <DataField label="City" value="San Francisco, CA" searchable />
                    <DataField label="Celebrant" value="Fr. John Alexopoulos" searchable />
                  </div>
                </div>

                <div className="om-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="om-feature-icon" size={20} />
                    <h4 className="om-heading-tertiary text-lg">Record Metadata</h4>
                  </div>
                  <div className="space-y-3">
                    <DataField label="Record Number" value="B-2023-042" />
                    <DataField label="Entry Date" value="April 3, 2023" />
                    <DataField label="Last Modified" value="April 3, 2023" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample: Marriage Record */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="om-badge-primary mb-6 inline-block">
              <span className="om-text-primary text-[14px]">Marriage Record</span>
            </div>
            <h2 className="om-heading-primary mb-4">
              Sacrament of Holy Matrimony
            </h2>
            <p className="om-text-body max-w-2xl mx-auto">
              Marriage records include bride, groom, witnesses, and canonical requirements
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Format */}
            <div className="om-card p-8">
              <h3 className="om-heading-tertiary mb-6">Traditional Record</h3>
              <div className="space-y-4">
                <div className="pb-3 om-divider">
                  <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Groom</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Constantine Alexander Romanov
                  </p>
                  <p className="font-['Inter'] text-[13px] om-text-secondary mt-1">
                    Born: June 15, 1990 • Age: 32
                  </p>
                </div>

                <div className="pb-3 om-divider">
                  <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Bride</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Anastasia Catherine Popov
                  </p>
                  <p className="font-['Inter'] text-[13px] om-text-secondary mt-1">
                    Born: August 22, 1992 • Age: 30
                  </p>
                </div>

                <div className="pb-3 om-divider">
                  <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Date & Location</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    September 10, 2022
                  </p>
                  <p className="font-['Inter'] text-[13px] om-text-secondary mt-1">
                    St. Nicholas Cathedral, Seattle, WA
                  </p>
                </div>

                <div className="pb-3 om-divider">
                  <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Witnesses</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Dimitri Volkov & Ekaterina Sokolov
                  </p>
                </div>

                <div className="pb-3 om-divider">
                  <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">Officiant</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Fr. Peter Mikhailov
                  </p>
                </div>
              </div>
            </div>

            {/* Searchable Fields */}
            <div className="om-card p-8">
              <h3 className="om-heading-tertiary mb-6">Searchable Database</h3>
              <div className="space-y-4">
                <div className="om-card-subtle p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-['Inter'] text-[14px] om-text-secondary">Search by Groom</span>
                    <span className="om-badge-accent">Indexed</span>
                  </div>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Constantine Romanov
                  </p>
                </div>

                <div className="om-card-subtle p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-['Inter'] text-[14px] om-text-secondary">Search by Bride</span>
                    <span className="om-badge-accent">Indexed</span>
                  </div>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Anastasia Popov
                  </p>
                </div>

                <div className="om-card-subtle p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-['Inter'] text-[14px] om-text-secondary">Search by Date Range</span>
                    <span className="om-badge-accent">Indexed</span>
                  </div>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    September 2022
                  </p>
                </div>

                <div className="om-card-subtle p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-['Inter'] text-[14px] om-text-secondary">Search by Parish</span>
                    <span className="om-badge-accent">Indexed</span>
                  </div>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    St. Nicholas Cathedral
                  </p>
                </div>

                <div className="om-card-subtle p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-['Inter'] text-[14px] om-text-secondary">Search by Priest</span>
                    <span className="om-badge-accent">Indexed</span>
                  </div>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Fr. Peter Mikhailov
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-language Support Example */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="om-badge-primary mb-6 inline-block">
              <span className="om-text-primary text-[14px]">Multi-Language Support</span>
            </div>
            <h2 className="om-heading-primary mb-4">
              Records in Any Language
            </h2>
            <p className="om-text-body max-w-2xl mx-auto">
              Orthodox Metrics supports Greek, Russian, Arabic, Georgian, Romanian, and more
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Greek Example */}
            <div className="om-card p-6">
              <div className="mb-4">
                <span className="om-badge-accent">Greek (Ελληνικά)</span>
              </div>
              <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">
                Βάπτισμα
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">Όνομα</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Γεώργιος Παπαδόπουλος
                  </p>
                </div>
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">Ημερομηνία</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    15 Μαΐου 2023
                  </p>
                </div>
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">Ιερέας</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    π. Νικόλαος Κωνσταντίνου
                  </p>
                </div>
              </div>
            </div>

            {/* Russian Example */}
            <div className="om-card p-6">
              <div className="mb-4">
                <span className="om-badge-accent">Russian (Русский)</span>
              </div>
              <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">
                Крещение
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">Имя</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    Алексей Иванов
                  </p>
                </div>
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">Дата</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    20 июня 2023
                  </p>
                </div>
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">Священник</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary">
                    о. Петр Михайлов
                  </p>
                </div>
              </div>
            </div>

            {/* Arabic Example */}
            <div className="om-card p-6">
              <div className="mb-4">
                <span className="om-badge-accent">Arabic (العربية)</span>
              </div>
              <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">
                المعمودية
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">الاسم</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary" dir="rtl">
                    يوحنا الخوري
                  </p>
                </div>
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">التاريخ</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary" dir="rtl">
                    ١٥ يوليو ٢٠٢٣
                  </p>
                </div>
                <div>
                  <p className="font-['Inter'] text-[13px] om-text-tertiary">الكاهن</p>
                  <p className="font-['Inter'] text-[15px] om-text-primary" dir="rtl">
                    الأب جورج حداد
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Demo */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="om-badge-primary mb-6 inline-block">
              <span className="om-text-primary text-[14px]">Advanced Search</span>
            </div>
            <h2 className="om-heading-primary mb-4">
              Find Records Instantly
            </h2>
            <p className="om-text-body max-w-2xl mx-auto">
              Search across all fields, filter by date ranges, and generate custom reports
            </p>
          </div>

          <div className="om-card p-8 max-w-4xl mx-auto">
            <div className="mb-8">
              <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">
                Search Records
              </label>
              <input
                type="text"
                placeholder="Search by name, date, location, priest..."
                className="om-input"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">
                  Record Type
                </label>
                <select className="om-select">
                  <option>All Types</option>
                  <option>Baptisms</option>
                  <option>Marriages</option>
                  <option>Funerals</option>
                </select>
              </div>

              <div>
                <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">
                  Date From
                </label>
                <input type="date" className="om-input" />
              </div>

              <div>
                <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">
                  Date To
                </label>
                <input type="date" className="om-input" />
              </div>
            </div>

            <div className="flex gap-4">
              <button className="om-btn-primary flex-1">
                Search Records
              </button>
              <button className="om-btn-outline">
                Advanced Filters
              </button>
            </div>

            {/* Mock Results */}
            <div className="mt-8 pt-8 om-divider">
              <p className="font-['Inter'] text-[14px] om-text-secondary mb-4">
                Showing 3 results
              </p>
              <div className="space-y-3">
                {[
                  { name: "Sophia Anastasia Petrov", type: "Baptism", date: "April 2, 2023", parish: "Holy Trinity" },
                  { name: "Constantine & Anastasia", type: "Marriage", date: "Sept 10, 2022", parish: "St. Nicholas" },
                  { name: "Γεώργιος Παπαδόπουλος", type: "Baptism", date: "May 15, 2023", parish: "Holy Trinity" },
                ].map((result, idx) => (
                  <div key={idx} className="om-card-compact p-4 hover:border-[#d4af37] dark:hover:border-[#d4af37] transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-['Inter'] font-medium text-[15px] om-text-primary">
                        {result.name}
                      </p>
                      <span className="text-[12px] bg-[#d4af37] text-[#2d1b4e] px-2 py-1 rounded">
                        {result.type}
                      </span>
                    </div>
                    <p className="font-['Inter'] text-[13px] om-text-secondary">
                      {result.date} • {result.parish}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 om-hero-gradient">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            Ready to Digitize Your Records?
          </h2>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            See how Orthodox Metrics can preserve your parish history
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contact" className="om-btn-accent">
              Request a Demo
            </a>
            <a href="/pricing" className="om-btn-secondary">
              View Pricing
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// Reusable Data Field Component
function DataField({ label, value, searchable = false }: { label: string; value: string; searchable?: boolean }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">{label}</p>
        <p className="font-['Inter'] text-[15px] om-text-primary">{value}</p>
      </div>
      {searchable && (
        <span className="text-[11px] bg-[#d4af37] bg-opacity-20 text-[#d4af37] dark:text-[#d4af37] px-2 py-0.5 rounded">
          Searchable
        </span>
      )}
    </div>
  );
}
