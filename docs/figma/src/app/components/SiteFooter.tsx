import { Link } from "react-router";

export default function SiteFooter() {
  return (
    <footer className="bg-[#2d1b4e] dark:bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#d4af37] rounded-lg flex items-center justify-center">
                <span className="text-[#2d1b4e] font-['Georgia'] text-xl">OM</span>
              </div>
              <span className="font-['Georgia'] text-lg">Orthodox Metrics</span>
            </div>
            <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] leading-relaxed">
              Preserving sacred records for Orthodox Christian parishes.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-['Inter'] font-medium text-[16px] mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/tour" className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors">
                  Platform Tour
                </Link>
              </li>
              <li>
                <Link to="/samples" className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors">
                  Sample Records
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-['Inter'] font-medium text-[16px] mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/contact" className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-['Inter'] font-medium text-[16px] mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:support@orthodoxmetrics.com" className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors">
                  support@orthodoxmetrics.com
                </a>
              </li>
              <li>
                <span className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)]">
                  Monday - Friday, 9am - 5pm EST
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[rgba(255,255,255,0.1)] mt-12 pt-8">
          <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.5)] text-center">
            © {new Date().getFullYear()} Orthodox Metrics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}