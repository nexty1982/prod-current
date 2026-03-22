import { Link } from "react-router";

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-14 h-14 bg-[#d4af37] rounded-xl flex items-center justify-center">
              <span className="text-[#2d1b4e] font-['Georgia'] text-2xl">OM</span>
            </div>
          </Link>
          <h1 className="font-['Georgia'] text-3xl text-white mb-2">Welcome Back</h1>
          <p className="font-['Inter'] text-[15px] text-[rgba(255,255,255,0.7)]">
            Sign in to access your parish records
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-6">
          <form className="space-y-6">
            <div>
              <label className="block font-['Inter'] font-medium text-[14px] text-[#2d1b4e] dark:text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-[#e5e7eb] dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] dark:focus:ring-[#d4af37] focus:border-transparent"
                placeholder="email@parish.org"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-['Inter'] font-medium text-[14px] text-[#2d1b4e] dark:text-white">
                  Password
                </label>
                <button type="button" className="font-['Inter'] text-[13px] text-[#4a5565] dark:text-gray-400 hover:text-[#2d1b4e] dark:hover:text-white">
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-[#e5e7eb] dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] dark:focus:ring-[#d4af37] focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 text-[#2d1b4e] border-[#e5e7eb] dark:border-gray-600 rounded focus:ring-[#2d1b4e]"
              />
              <label htmlFor="remember" className="ml-2 font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              className="w-full px-8 py-4 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#1f1236] dark:hover:bg-[#c29d2f] transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#f3f4f6] dark:border-gray-700">
            <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 text-center">
              Don't have an account?{" "}
              <Link to="/contact" className="text-[#2d1b4e] dark:text-[#d4af37] font-medium hover:underline">
                Contact us to get started
              </Link>
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <svg width="16" height="16" fill="none" stroke="currentColor" className="text-[#d4af37]" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-['Inter'] text-[13px] text-white font-medium">
              Secure Connection
            </span>
          </div>
          <p className="font-['Inter'] text-[12px] text-[rgba(255,255,255,0.7)]">
            Your data is protected with bank-level encryption
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-['Inter'] text-[14px] text-white/70 hover:text-white transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}