import { ArrowRight, Info } from 'lucide-react';

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2d1b4e] via-[#3d2562] to-[#4a2f6f] text-white py-24">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37] rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-4xl lg:text-6xl font-serif mb-6 tracking-tight">
          Start today with your{' '}
          <span className="text-[#d4af37]">parish</span>.<br />
          We'll handle the{' '}
          <span className="text-[#d4af37]">records</span>.
        </h2>
        
        <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
          Become an early adopter and assist in building an Orthodox Church Metrics platform!
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <button className="group px-8 py-4 bg-[#d4af37] hover:bg-[#c49d2e] text-[#2d1b4e] rounded-lg transition-all flex items-center gap-2 shadow-xl hover:shadow-2xl">
            Register Your Church
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-all flex items-center gap-2">
            <Info className="w-5 h-5" />
            Request Information
          </button>
        </div>
        
        <div className="pt-8 border-t border-white/10">
          <p className="text-white/60 text-sm">
            Secured payment with PayPal, Venmo • Trusted by Orthodox parishes across North America
          </p>
        </div>
      </div>
    </section>
  );
}
