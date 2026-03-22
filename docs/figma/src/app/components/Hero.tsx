import { BookOpen, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2d1b4e] via-[#3d2562] to-[#4a2f6f] text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#d4af37] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#d4af37] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-pulse" />
              <span className="text-sm">
                Now serving parishes in the US and Canada
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-serif tracking-tight">
              Preserving the Records of the{" "}
              <span className="text-[#d4af37]">
                Orthodox Church
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-white/80 leading-relaxed">
              Orthodox Metrics is a digital platform designed to
              help parishes preserve and manage baptism,
              marriage, and funeral records with accuracy,
              security, and respect for Orthodox tradition.
            </p>

            <div className="flex flex-wrap gap-4">
              <button className="group px-8 py-4 bg-[#d4af37] hover:bg-[#c49d2e] text-[#2d1b4e] rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl">
                Register Your Church
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-all">
                Learn More
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#d4af37] rounded-lg">
                  <BookOpen className="w-6 h-6 text-[#2d1b4e]" />
                </div>
                <div>
                  <h3 className="font-medium">
                    Parish Record System
                  </h3>
                  <p className="text-sm text-white/60">
                    Secure • Traditional • Modern
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">
                      Baptism Records
                    </span>
                    <span className="text-xs px-2 py-1 bg-[#d4af37]/20 text-[#d4af37] rounded">
                      Active
                    </span>
                  </div>
                  <div className="text-sm">
                    Last updated: March 2026
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">
                      Marriage Records
                    </span>
                    <span className="text-xs px-2 py-1 bg-[#d4af37]/20 text-[#d4af37] rounded">
                      Active
                    </span>
                  </div>
                  <div className="text-sm">
                    Multi-language support
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">
                      Funeral Records
                    </span>
                    <span className="text-xs px-2 py-1 bg-[#d4af37]/20 text-[#d4af37] rounded">
                      Active
                    </span>
                  </div>
                  <div className="text-sm">
                    Secure & compliant
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}