import { Archive, Shield, Search } from 'lucide-react';

export function Purpose() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-2 bg-[#2d1b4e]/5 text-[#2d1b4e] rounded-full text-sm">
              Our Purpose
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-serif text-[#2d1b4e] tracking-tight">
              Safeguarding Sacred Records for Future Generations
            </h2>
            
            <div className="space-y-4 text-lg text-gray-600 leading-relaxed">
              <p>
                Many Orthodox parishes still rely on fragile, handwritten records that are vulnerable to loss, damage, and the passage of time. These sacred documents contain centuries of spiritual heritage.
              </p>
              <p>
                Orthodox Metrics helps parishes digitize, preserve, and securely manage these records while maintaining the reverence and tradition they deserve.
              </p>
              <p>
                Our platform brings modern technology to sacred recordkeeping, ensuring that future generations can access and honor the spiritual milestones of their communities.
              </p>
            </div>
          </div>
          
          <div className="grid gap-6">
            <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f6f] text-white rounded-2xl p-8 shadow-lg">
              <Archive className="w-12 h-12 mb-4 text-[#d4af37]" />
              <h3 className="text-xl mb-2">Preserve History</h3>
              <p className="text-white/80">
                Transform fragile paper records into secure digital archives that will last for generations.
              </p>
            </div>
            
            <div className="bg-white border-2 border-[#2d1b4e]/10 rounded-2xl p-8 shadow-lg">
              <Search className="w-12 h-12 mb-4 text-[#d4af37]" />
              <h3 className="text-xl mb-2 text-[#2d1b4e]">Easy Access</h3>
              <p className="text-gray-600">
                Search and retrieve records instantly, making parish administration more efficient.
              </p>
            </div>
            
            <div className="bg-[#d4af37] text-[#2d1b4e] rounded-2xl p-8 shadow-lg">
              <Shield className="w-12 h-12 mb-4" />
              <h3 className="text-xl mb-2">Secure Storage</h3>
              <p className="text-[#2d1b4e]/80">
                Bank-level encryption ensures your sacred records remain private and protected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
