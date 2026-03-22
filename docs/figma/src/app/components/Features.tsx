import { Church, Globe, Lock, Calendar } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: Church,
      title: 'Built for Orthodox Churches',
      description: 'Platform follows guidelines established by the Orthodox Church in America, respecting tradition while embracing modern tools.',
      color: 'from-purple-50 to-purple-100/50',
      iconBg: 'bg-[#2d1b4e]',
      iconColor: 'text-[#d4af37]'
    },
    {
      icon: Globe,
      title: 'Multi-Language Support',
      description: 'Full support for Greek, Russian, Romanian, Georgian, and English, ensuring accessibility for diverse Orthodox communities.',
      color: 'from-amber-50 to-amber-100/50',
      iconBg: 'bg-[#d4af37]',
      iconColor: 'text-[#2d1b4e]'
    },
    {
      icon: Lock,
      title: 'Secure Record Management',
      description: 'Digitized sacramental records are encrypted and stored with enterprise-grade security, protecting sensitive parish data.',
      color: 'from-blue-50 to-blue-100/50',
      iconBg: 'bg-[#2d1b4e]',
      iconColor: 'text-[#d4af37]'
    },
    {
      icon: Calendar,
      title: 'Calendar-Aware Scheduling',
      description: 'Supports both Old and New Calendar traditions with 8 liturgical color themes that follow the church calendar.',
      color: 'from-green-50 to-green-100/50',
      iconBg: 'bg-[#d4af37]',
      iconColor: 'text-[#2d1b4e]'
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-[#2d1b4e]/5 text-[#2d1b4e] rounded-full text-sm mb-4">
            Platform Highlights
          </div>
          <h2 className="text-4xl lg:text-5xl font-serif text-[#2d1b4e] mb-4">
            Built with Your Parish in Mind
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Every feature is designed to honor Orthodox tradition while providing modern convenience and security.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="flex items-start gap-6">
                <div className={`${feature.iconBg} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl text-[#2d1b4e] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
