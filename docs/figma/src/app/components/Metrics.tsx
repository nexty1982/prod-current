import { TrendingUp, Users, Languages, Palette } from 'lucide-react';

export function Metrics() {
  const stats = [
    {
      icon: TrendingUp,
      label: 'Founded',
      value: '2025',
      description: 'When we founded Orthodox Metrics'
    },
    {
      icon: Users,
      label: 'Parishes Using the Platform',
      value: '1+',
      description: 'Customers of Orthodox Metrics'
    },
    {
      icon: Languages,
      label: 'Supported Languages',
      value: '5+',
      description: 'Greek, Russian, Romanian, Georgian, English'
    },
    {
      icon: Palette,
      label: 'Liturgical Color Themes',
      value: '8',
      description: 'Orthodox Christian liturgical color themes that follow the church Calendar'
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <div className="inline-block px-4 py-2 bg-[#2d1b4e]/5 text-[#2d1b4e] rounded-full text-sm mb-4">
            Our Journey
          </div>
          <h2 className="text-4xl lg:text-5xl font-serif text-[#2d1b4e] mb-4">
            Orthodox Metrics at a Glance
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl">
            We're a startup built by Orthodox Christians, inspired by the needs of our parishes. Our numbers reflect more than metrics—they tell the story of a mission-driven team answering the call to preserve sacred records and serve the Church in the digital age.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-100 hover:border-[#d4af37] hover:shadow-lg transition-all group"
            >
              <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon className="w-16 h-16 text-[#2d1b4e]" />
              </div>
              
              <div className="relative">
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="p-2 bg-[#2d1b4e] rounded-lg">
                    <stat.icon className="w-5 h-5 text-[#d4af37]" />
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 mb-2">{stat.label}</div>
                <div className="text-5xl font-serif text-[#2d1b4e] mb-3">{stat.value}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{stat.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
