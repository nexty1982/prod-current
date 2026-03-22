import { Cross } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1a0f2e] text-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#d4af37] rounded-lg">
                <Cross className="w-6 h-6 text-[#2d1b4e]" />
              </div>
              <span className="text-xl font-serif">
                Orthodox Metrics
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Digitizing Orthodox records and embracing the
              modern era for future sacramental documentation.
            </p>
          </div>

          <div>
            <h4 className="mb-4">About</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Our Mission
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Team
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4">Support</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  API Reference
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Community
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4">Legal</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#d4af37] transition-colors"
                >
                  GDPR
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/60">
          <p>© 2025 Orthodox Metrics. All rights reserved.</p>
          <p>
            Built with reverence for tradition and respect for
            the future.
          </p>
        </div>
      </div>
    </footer>
  );
}