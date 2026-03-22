import { Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/about", label: "About" },
    { path: "/tour", label: "Tour" },
    { path: "/samples", label: "Samples" },
    { path: "/pricing", label: "Pricing" },
    { path: "/blog", label: "Blog" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-[rgba(45,27,78,0.1)] dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-lg flex items-center justify-center">
              <span className="text-[#d4af37] dark:text-[#2d1b4e] font-['Georgia'] text-xl">OM</span>
            </div>
            <span className="font-['Georgia'] text-xl text-[#2d1b4e] dark:text-white">Orthodox Metrics</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-['Inter'] text-[15px] transition-colors ${
                  isActive(link.path)
                    ? "text-[#2d1b4e] dark:text-white font-medium"
                    : "text-[#4a5565] dark:text-gray-400 hover:text-[#2d1b4e] dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Button & Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="px-6 py-2.5 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] text-[15px] font-medium hover:bg-[#1f1236] dark:hover:bg-[#c29d2f] transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-[#2d1b4e] dark:text-white"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-[rgba(45,27,78,0.1)] dark:border-gray-800">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block py-3 font-['Inter'] text-[15px] ${
                  isActive(link.path)
                    ? "text-[#2d1b4e] dark:text-white font-medium"
                    : "text-[#4a5565] dark:text-gray-400"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="block mt-4 px-6 py-2.5 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] text-[15px] font-medium text-center"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}