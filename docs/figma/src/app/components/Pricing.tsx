import { Check, FileText, Database, Building2, ArrowRight } from 'lucide-react';

export function Pricing() {
  const plans = [
    {
      name: 'Single Record Type',
      description: 'Use for churches that only require one type of record.',
      icon: FileText,
      features: [
        'Multiple language access',
        'Documentation',
        'One Project',
        'Self service Upload Records via',
        'Lifetime Record updates Church'
      ],
      highlighted: false
    },
    {
      name: 'Multiple Records',
      description: 'Use for multiple types of records, advanced data analysis.',
      icon: Database,
      features: [
        'Multiple language access',
        'Documentation',
        'Unlimited Project',
        'Self service Upload Records via',
        'Lifetime Record updates Church'
      ],
      highlighted: false
    },
    {
      name: 'High Volume Plus',
      description: 'Use for churches that exceed 1000 records in one type.',
      icon: Building2,
      badge: 'Popular',
      features: [
        'Multiple language access',
        'Documentation',
        'Availability 24x7',
        'One Project',
        'Self service Upload Records via',
        'Lifetime Record updates Church'
      ],
      highlighted: true
    },
    {
      name: 'High Volume Pro',
      description: 'Use churches with high-volume records who want extended features, calendar access, top-tier support.',
      icon: Building2,
      features: [
        'Multiple language access',
        'Documentation',
        'Availability 24x7',
        'Unlimited Project',
        'Self service Upload Records via',
        'Lifetime Record updates Church'
      ],
      highlighted: false
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-[#2d1b4e]/5 text-[#2d1b4e] rounded-full text-sm mb-4">
            Pricing
          </div>
          <h2 className="text-4xl lg:text-5xl font-serif text-[#2d1b4e] mb-4">
            Solutions for Every Parish
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Dedicated staff to provide the solution that you want! Choose the plan that fits your parish's needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl p-8 border-2 transition-all hover:shadow-xl ${
                plan.highlighted
                  ? 'border-[#d4af37] shadow-lg scale-105'
                  : 'border-gray-200 hover:border-[#2d1b4e]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-[#d4af37] text-[#2d1b4e] text-sm rounded-full shadow-lg">
                    {plan.badge}
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <div className={`inline-flex p-3 rounded-xl mb-4 ${
                  plan.highlighted ? 'bg-[#d4af37]' : 'bg-[#2d1b4e]'
                }`}>
                  <plan.icon className={`w-6 h-6 ${
                    plan.highlighted ? 'text-[#2d1b4e]' : 'text-[#d4af37]'
                  }`} />
                </div>
                
                <h3 className="text-xl text-[#2d1b4e] mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed min-h-[60px]">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="text-sm text-gray-500 mb-1">Contact for</div>
                <div className="text-3xl font-serif text-[#2d1b4e]">Pricing</div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#d4af37] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 group ${
                plan.highlighted
                  ? 'bg-[#d4af37] hover:bg-[#c49d2e] text-[#2d1b4e]'
                  : 'bg-[#2d1b4e] hover:bg-[#3d2562] text-white'
              }`}>
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            All plans include bank-level security and 24/7 support.{' '}
            <a href="#" className="text-[#2d1b4e] hover:text-[#d4af37] underline">
              Contact us
            </a>{' '}
            for custom enterprise solutions.
          </p>
        </div>
      </div>
    </section>
  );
}
