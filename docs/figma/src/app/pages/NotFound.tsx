import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="font-['Georgia'] text-9xl text-[#d4af37] mb-4">404</h1>
          <h2 className="font-['Georgia'] text-3xl text-white mb-2">Page Not Found</h2>
          <p className="font-['Inter'] text-lg text-[rgba(255,255,255,0.7)]">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
