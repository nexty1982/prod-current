import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";
import { BookOpen, Search, Shield, Users, Heart, Award } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(212,175,55,0.15)] px-4 py-2 rounded-full mb-6">
            <span className="font-['Inter'] text-[14px] text-[#d4af37]">Our Story</span>
          </div>
          <h1 className="font-['Georgia'] text-5xl md:text-6xl mb-6">
            Preserving Orthodox Heritage Through Technology
          </h1>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-3xl mx-auto">
            Orthodox Metrics was founded to solve a critical challenge: protecting centuries of sacred 
            parish records while making them accessible for future generations.
          </p>
        </div>
      </section>

      {/* Our Purpose */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] px-4 py-2 rounded-full mb-6">
                <span className="font-['Inter'] text-[14px] text-[#2d1b4e]">Our Purpose</span>
              </div>
              <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-6">
                Safeguarding Sacred Records for Future Generations
              </h2>
              <div className="space-y-4 font-['Inter'] text-[16px] text-[#4a5565] leading-relaxed">
                <p>
                  Many Orthodox parishes still rely on fragile, handwritten records that are vulnerable to 
                  loss, damage, and the passage of time. These sacred documents contain centuries of spiritual heritage.
                </p>
                <p>
                  Orthodox Metrics helps parishes digitize, preserve, and securely manage these records while 
                  maintaining the reverence and tradition they deserve.
                </p>
                <p>
                  Our platform brings modern technology to sacred recordkeeping, ensuring that future generations 
                  can access and honor the spiritual milestones of their communities.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] rounded-2xl p-8 text-white shadow-xl">
                <BookOpen className="text-[#d4af37] mb-4" size={40} />
                <h3 className="font-['Inter'] font-medium text-xl mb-2">Preserve History</h3>
                <p className="font-['Inter'] text-[15px] text-[rgba(255,255,255,0.8)]">
                  Transform fragile paper records into secure digital archives that will last for generations.
                </p>
              </div>

              <div className="bg-white border-2 border-[#f3f4f6] rounded-2xl p-8 shadow-sm">
                <Search className="text-[#d4af37] mb-4" size={40} />
                <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] mb-2">Easy Access</h3>
                <p className="font-['Inter'] text-[15px] text-[#4a5565]">
                  Search and retrieve records instantly, making parish administration more efficient.
                </p>
              </div>

              <div className="bg-[#d4af37] rounded-2xl p-8 shadow-xl">
                <Shield className="text-[#2d1b4e] mb-4" size={40} />
                <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] mb-2">Secure Storage</h3>
                <p className="font-['Inter'] text-[15px] text-[rgba(45,27,78,0.8)]">
                  Bank-level encryption ensures your sacred records remain private and protected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full mb-4 shadow-sm">
              <span className="font-['Inter'] text-[14px] text-[#2d1b4e]">Platform Highlights</span>
            </div>
            <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-4">
              Built with Your Parish in Mind
            </h2>
            <p className="font-['Inter'] text-xl text-[#4a5565] max-w-2xl mx-auto">
              Every feature is designed to honor Orthodox tradition while providing modern convenience and security.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <FeatureCard
              icon={<Users className="text-[#d4af37]" size={32} />}
              title="Built for Orthodox Churches"
              description="Platform follows guidelines established by the Orthodox Church in America, respecting tradition while embracing modern tools."
            />
            <FeatureCard
              icon={<Shield className="text-[#d4af37]" size={32} />}
              title="Multi-Language Support"
              description="Full support for Greek, Russian, Romanian, Georgian, and English, ensuring accessibility for diverse Orthodox communities."
            />
            <FeatureCard
              icon={<BookOpen className="text-[#d4af37]" size={32} />}
              title="Secure Record Management"
              description="Digitized sacramental records are encrypted and stored with enterprise-grade security, protecting sensitive parish data."
            />
            <FeatureCard
              icon={<Search className="text-[#d4af37]" size={32} />}
              title="Calendar-Aware Scheduling"
              description="Supports both Old and New Calendar traditions with 8 liturgical color themes that follow the church calendar."
            />
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] px-4 py-2 rounded-full mb-4">
              <span className="font-['Inter'] text-[14px] text-[#2d1b4e]">Our Team</span>
            </div>
            <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-4">
              Led by Orthodox Christians
            </h2>
            <p className="font-['Inter'] text-xl text-[#4a5565] max-w-2xl mx-auto">
              Our team understands the unique needs of Orthodox parishes because we are part of the community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TeamMember
              name="Fr. Nicholas Parsells"
              role="Founder & Spiritual Advisor"
              description="30 years serving Orthodox parishes, passionate about preserving our spiritual heritage."
            />
            <TeamMember
              name="Maria Konstantinou"
              role="Head of Product"
              description="Former parish secretary with deep understanding of church record management."
            />
            <TeamMember
              name="Dr. Alexander Petrov"
              role="Chief Technology Officer"
              description="Expert in database systems and digital preservation technologies."
            />
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] mb-4">
              Our Values
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ValueCard
              icon={<Heart className="text-[#d4af37]" size={32} />}
              title="Reverence"
              description="We approach sacred records with the respect and care they deserve, honoring centuries of Orthodox tradition."
            />
            <ValueCard
              icon={<Shield className="text-[#d4af37]" size={32} />}
              title="Trust"
              description="Your parish data is precious. We protect it with the highest security standards and complete transparency."
            />
            <ValueCard
              icon={<Award className="text-[#d4af37]" size={32} />}
              title="Excellence"
              description="We're committed to building the best possible platform for Orthodox parishes, constantly improving and innovating."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            Join Us in Preserving Orthodox Heritage
          </h2>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            Help us protect your parish's sacred records for future generations
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors"
          >
            Get in Touch
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white border border-[#f3f4f6] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0 w-16 h-16 bg-[#2d1b4e] rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] mb-3">{title}</h3>
          <p className="font-['Inter'] text-[15px] text-[#4a5565] leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function TeamMember({ name, role, description }: { name: string; role: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-32 h-32 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] rounded-2xl mx-auto mb-6 flex items-center justify-center">
        <span className="text-[#d4af37] font-['Georgia'] text-4xl">
          {name.split(' ').map(n => n[0]).join('')}
        </span>
      </div>
      <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] mb-2">{name}</h3>
      <p className="font-['Inter'] text-[14px] text-[#d4af37] mb-3">{role}</p>
      <p className="font-['Inter'] text-[14px] text-[#4a5565] leading-relaxed">{description}</p>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#f3f4f6] text-center">
      <div className="w-16 h-16 bg-[#2d1b4e] rounded-xl flex items-center justify-center mx-auto mb-6">
        {icon}
      </div>
      <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] mb-3">{title}</h3>
      <p className="font-['Inter'] text-[15px] text-[#4a5565] leading-relaxed">{description}</p>
    </div>
  );
}
