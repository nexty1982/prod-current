import { Link } from "react-router";
import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";
import { Upload, Database, Search, BarChart3, Shield, Users, FileText, Calendar } from "lucide-react";

export default function Tour() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(212,175,55,0.15)] px-4 py-2 rounded-full mb-6">
            <span className="font-['Inter'] text-[14px] text-[#d4af37]">Platform Tour</span>
          </div>
          <h1 className="font-['Georgia'] text-5xl md:text-6xl mb-6">
            See How Orthodox Metrics Works
          </h1>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-2xl mx-auto">
            A step-by-step walkthrough of how we help parishes digitize and manage their sacred records
          </p>
        </div>
      </section>

      {/* Step 1: Digitizing Records */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] px-4 py-2 rounded-full mb-6">
                <span className="font-['Inter'] text-[14px] text-[#2d1b4e]">Step 1</span>
              </div>
              <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-6">
                Digitizing Your Records
              </h2>
              <p className="font-['Inter'] text-lg text-[#4a5565] leading-relaxed mb-6">
                Begin by capturing images of your existing paper records. Our platform accepts 
                scans and photographs from any device—smartphone, tablet, or scanner.
              </p>
              <ul className="space-y-4">
                {[
                  "Upload individual records or batch import hundreds at once",
                  "Automatic image enhancement for old or faded documents",
                  "OCR technology extracts text from handwritten records",
                  "Professional digitization services available for large volumes",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full mt-2.5 flex-shrink-0"></div>
                    <span className="font-['Inter'] text-[16px] text-[#4a5565]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] rounded-2xl p-12 border border-[rgba(45,27,78,0.1)]">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <Upload className="text-[#d4af37] mb-4" size={48} />
                <div className="space-y-4">
                  <div className="h-3 bg-[#f3f4f6] rounded-full w-full"></div>
                  <div className="h-3 bg-[#f3f4f6] rounded-full w-5/6"></div>
                  <div className="h-3 bg-[#f3f4f6] rounded-full w-4/6"></div>
                  <div className="mt-6 p-4 bg-[rgba(45,27,78,0.05)] rounded-lg">
                    <p className="font-['Inter'] text-[14px] text-[#2d1b4e]">
                      Drag & drop your documents or click to browse
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Organizing Data */}
      <section className="py-24 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] rounded-2xl p-12 text-white">
                <Database className="text-[#d4af37] mb-6" size={48} />
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.7)] mb-1">Name</p>
                    <p className="font-['Inter'] text-[16px]">John Constantine Papadopoulos</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.7)] mb-1">Date</p>
                      <p className="font-['Inter'] text-[16px]">April 15, 1985</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.7)] mb-1">Type</p>
                      <p className="font-['Inter'] text-[16px]">Baptism</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.7)] mb-1">Priest</p>
                    <p className="font-['Inter'] text-[16px]">Fr. Michael Antonopoulos</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full mb-6 shadow-sm">
                <span className="font-['Inter'] text-[14px] text-[#2d1b4e]">Step 2</span>
              </div>
              <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-6">
                Organizing Parish Data
              </h2>
              <p className="font-['Inter'] text-lg text-[#4a5565] leading-relaxed mb-6">
                Transform images into structured, searchable records. Enter sacramental details 
                into organized databases designed specifically for Orthodox parishes.
              </p>
              <ul className="space-y-4">
                {[
                  "Pre-built templates for baptisms, marriages, and funerals",
                  "Custom fields for unique parish needs",
                  "Link related records (families, sponsors, witnesses)",
                  "Multi-language data entry with transliteration support",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full mt-2.5 flex-shrink-0"></div>
                    <span className="font-['Inter'] text-[16px] text-[#4a5565]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3: Powerful Search */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] px-4 py-2 rounded-full mb-6">
                <span className="font-['Inter'] text-[14px] text-[#2d1b4e]">Step 3</span>
              </div>
              <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-6">
                Powerful Search Capabilities
              </h2>
              <p className="font-['Inter'] text-lg text-[#4a5565] leading-relaxed mb-6">
                Find any record in seconds using our advanced search tools. Search by name, 
                date, location, priest, or any custom field you've created.
              </p>
              <ul className="space-y-4">
                {[
                  "Full-text search across all records and fields",
                  "Filter by date ranges, sacrament types, and locations",
                  "Fuzzy matching handles spelling variations",
                  "Search in multiple languages simultaneously",
                  "Save frequent searches for quick access",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full mt-2.5 flex-shrink-0"></div>
                    <span className="font-['Inter'] text-[16px] text-[#4a5565]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] rounded-2xl p-12 border border-[rgba(45,27,78,0.1)]">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6 p-4 bg-[#f9fafb] rounded-lg border-2 border-[#2d1b4e]">
                  <Search className="text-[#4a5565]" size={20} />
                  <span className="font-['Inter'] text-[16px] text-[#2d1b4e]">Papadopoulos</span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-[#f9fafb] rounded-lg border border-[#f3f4f6] hover:border-[#d4af37] transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-['Inter'] font-medium text-[15px] text-[#2d1b4e]">
                          John Constantine Papadopoulos
                        </p>
                        <span className="text-[12px] bg-[#d4af37] text-[#2d1b4e] px-2 py-1 rounded">Baptism</span>
                      </div>
                      <p className="font-['Inter'] text-[13px] text-[#4a5565]">April 15, 1985</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 4: Analytics & Reporting */}
      <section className="py-24 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white rounded-2xl p-12 shadow-lg border border-[rgba(45,27,78,0.1)]">
                <BarChart3 className="text-[#d4af37] mb-6" size={48} />
                <div className="space-y-6">
                  <div className="flex items-end gap-2 h-40">
                    <div className="flex-1 bg-gradient-to-t from-[#2d1b4e] to-[#4a2f74] rounded-t-lg" style={{ height: '60%' }}></div>
                    <div className="flex-1 bg-gradient-to-t from-[#2d1b4e] to-[#4a2f74] rounded-t-lg" style={{ height: '80%' }}></div>
                    <div className="flex-1 bg-gradient-to-t from-[#2d1b4e] to-[#4a2f74] rounded-t-lg" style={{ height: '100%' }}></div>
                    <div className="flex-1 bg-gradient-to-t from-[#d4af37] to-[#d4af37] rounded-t-lg" style={{ height: '70%' }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[rgba(45,27,78,0.05)] rounded-lg">
                      <p className="font-['Inter'] text-[13px] text-[#4a5565] mb-1">Total Baptisms</p>
                      <p className="font-['Georgia'] text-2xl text-[#2d1b4e]">1,247</p>
                    </div>
                    <div className="p-4 bg-[rgba(45,27,78,0.05)] rounded-lg">
                      <p className="font-['Inter'] text-[13px] text-[#4a5565] mb-1">This Year</p>
                      <p className="font-['Georgia'] text-2xl text-[#2d1b4e]">42</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full mb-6 shadow-sm">
                <span className="font-['Inter'] text-[14px] text-[#2d1b4e]">Step 4</span>
              </div>
              <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-6">
                Reporting & Analytics
              </h2>
              <p className="font-['Inter'] text-lg text-[#4a5565] leading-relaxed mb-6">
                Gain valuable insights into your parish history. Generate reports, visualize 
                trends, and understand patterns across decades of sacramental records.
              </p>
              <ul className="space-y-4">
                {[
                  "Track baptisms, marriages, and funerals over time",
                  "Visualize parish growth and demographic trends",
                  "Generate reports for diocese submissions",
                  "Export data for custom analysis",
                  "Compare statistics across time periods",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full mt-2.5 flex-shrink-0"></div>
                    <span className="font-['Inter'] text-[16px] text-[#4a5565]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-4">
              More Ways We Support Your Parish
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureBox
              icon={<Shield className="text-[#d4af37]" size={32} />}
              title="Secure Storage"
              description="Bank-level encryption and multiple backups ensure your records are always safe and accessible."
            />
            <FeatureBox
              icon={<Users className="text-[#d4af37]" size={32} />}
              title="Role-Based Access"
              description="Control who can view, edit, or manage records with customizable permission levels."
            />
            <FeatureBox
              icon={<FileText className="text-[#d4af37]" size={32} />}
              title="Document Generation"
              description="Create certificates, letters of good standing, and official documents automatically."
            />
            <FeatureBox
              icon={<Calendar className="text-[#d4af37]" size={32} />}
              title="Calendar Integration"
              description="Link records to liturgical calendars with support for Old and New Calendar traditions."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            Ready to See It in Action?
          </h2>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            Schedule a personalized demo to see how Orthodox Metrics can transform your parish record keeping
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors"
          >
            Request a Demo
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FeatureBox({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-[#2d1b4e] rounded-xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] mb-2">{title}</h3>
      <p className="font-['Inter'] text-[14px] text-[#4a5565] leading-relaxed">{description}</p>
    </div>
  );
}
