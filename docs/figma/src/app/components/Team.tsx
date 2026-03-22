import { Linkedin, Mail } from 'lucide-react';
import founderImage from 'figma:asset/6e4881929cf2d575308023e2f00fbf91155b1d17.png';

export function Team() {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-[#2d1b4e]/5 text-[#2d1b4e] rounded-full text-sm mb-4">
            Leadership
          </div>
          <h2 className="text-4xl lg:text-5xl font-serif text-[#2d1b4e] mb-4">
            Our Team
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Our team works for you. Contact us now with questions you have.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2d1b4e] to-[#d4af37] rounded-full blur-xl opacity-20" />
                <img
                  src={founderImage}
                  alt="Nectarios Parsells"
                  className="relative w-40 h-40 rounded-full object-cover border-4 border-white shadow-2xl"
                />
              </div>
              
              <h3 className="text-3xl font-serif text-[#2d1b4e] mb-2">
                Nectarios Parsells
              </h3>
              
              <div className="text-[#d4af37] mb-6">
                Founder of Orthodox Metrics
              </div>
              
              <div className="w-16 h-1 bg-gradient-to-r from-[#2d1b4e] to-[#d4af37] rounded-full mb-8" />
              
              <blockquote className="text-xl text-gray-700 leading-relaxed mb-8 italic max-w-xl">
                "Our goal is simple — to ensure the sacred records of the Church are preserved, searchable, and protected for generations."
              </blockquote>
              
              <div className="flex gap-4">
                <button className="p-3 bg-[#2d1b4e] hover:bg-[#3d2562] text-white rounded-lg transition-colors">
                  <Linkedin className="w-5 h-5" />
                </button>
                <button className="p-3 bg-[#d4af37] hover:bg-[#c49d2e] text-[#2d1b4e] rounded-lg transition-colors">
                  <Mail className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
