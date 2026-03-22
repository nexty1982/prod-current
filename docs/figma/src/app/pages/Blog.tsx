import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";
import { Calendar, User, ArrowRight } from "lucide-react";

export default function Blog() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(212,175,55,0.15)] px-4 py-2 rounded-full mb-6">
            <span className="font-['Inter'] text-[14px] text-[#d4af37]">Latest Updates</span>
          </div>
          <h1 className="font-['Georgia'] text-5xl md:text-6xl mb-6">
            Orthodox Metrics Blog
          </h1>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-2xl mx-auto">
            Insights on preserving parish records, managing church data, and embracing technology 
            in Orthodox tradition
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] rounded-2xl overflow-hidden border border-[rgba(45,27,78,0.1)]">
            <div className="grid md:grid-cols-2">
              <div className="p-12">
                <div className="inline-block bg-[#d4af37] text-[#2d1b4e] px-3 py-1 rounded-full font-['Inter'] text-[13px] font-medium mb-4">
                  Featured
                </div>
                <h2 className="font-['Georgia'] text-3xl md:text-4xl text-[#2d1b4e] mb-4">
                  The Importance of Digital Record Preservation in Orthodox Parishes
                </h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-[#4a5565]">
                    <Calendar size={16} />
                    <span className="font-['Inter'] text-[14px]">March 10, 2026</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#4a5565]">
                    <User size={16} />
                    <span className="font-['Inter'] text-[14px]">Fr. Nicholas Parsells</span>
                  </div>
                </div>
                <p className="font-['Inter'] text-[16px] text-[#4a5565] leading-relaxed mb-6">
                  As custodians of centuries of spiritual heritage, Orthodox parishes face unique challenges 
                  in preserving historical sacramental records. Learn why digitization is not just practical, 
                  but essential for maintaining our sacred traditions.
                </p>
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#2d1b4e] text-white rounded-lg font-['Inter'] font-medium hover:bg-[#1f1236] transition-colors">
                  Read More
                  <ArrowRight size={18} />
                </button>
              </div>
              <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] flex items-center justify-center p-12">
                <div className="text-center text-white">
                  <div className="w-32 h-32 bg-[#d4af37] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg width="64" height="64" fill="none" stroke="currentColor" className="text-[#2d1b4e]" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)]">Featured Article</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-20 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <h2 className="font-['Georgia'] text-4xl text-[#2d1b4e] mb-2">Recent Articles</h2>
            <p className="font-['Inter'] text-lg text-[#4a5565]">
              Latest insights and updates from the Orthodox Metrics team
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <BlogCard
              category="Best Practices"
              title="5 Steps to Begin Digitizing Your Parish Records"
              excerpt="A practical guide for parishes starting their digital record-keeping journey."
              date="March 8, 2026"
              author="Maria Konstantinou"
            />
            <BlogCard
              category="Technology"
              title="Understanding Multi-Language Support in Record Management"
              excerpt="How Orthodox Metrics handles Greek, Russian, Romanian, and other Orthodox languages."
              date="March 5, 2026"
              author="Dr. Alexander Petrov"
            />
            <BlogCard
              category="Church Administration"
              title="Calendar-Aware Record Keeping: Old vs New Calendar"
              excerpt="Managing records across different liturgical calendar traditions in your diocese."
              date="March 1, 2026"
              author="Fr. George Papadakis"
            />
            <BlogCard
              category="Case Study"
              title="How St. Nicholas Parish Digitized 150 Years of Records"
              excerpt="A parish success story: from paper archives to searchable digital database."
              date="February 28, 2026"
              author="Parish Council, St. Nicholas"
            />
            <BlogCard
              category="Security"
              title="Protecting Sacred Data: Our Approach to Security"
              excerpt="Understanding encryption, backups, and data protection for sensitive parish records."
              date="February 25, 2026"
              author="Technical Team"
            />
            <BlogCard
              category="Tutorial"
              title="Creating Custom Report Templates for Diocese Submissions"
              excerpt="Step-by-step guide to generating standardized reports for your diocesan office."
              date="February 22, 2026"
              author="Support Team"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-['Georgia'] text-4xl text-[#2d1b4e] mb-4">Browse by Category</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: "Best Practices", count: 12 },
              { name: "Technology", count: 8 },
              { name: "Case Studies", count: 6 },
              { name: "Church Administration", count: 10 },
            ].map((category) => (
              <div key={category.name} className="bg-white border border-[#f3f4f6] rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer">
                <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] mb-2">{category.name}</h3>
                <p className="font-['Inter'] text-[14px] text-[#4a5565]">{category.count} articles</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            Stay Updated
          </h2>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            Subscribe to our newsletter for the latest articles and updates
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-lg font-['Inter'] text-[15px] text-[#2d1b4e] focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            />
            <button className="px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium hover:bg-[#c29d2f] transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function BlogCard({ category, title, excerpt, date, author }: { category: string; title: string; excerpt: string; date: string; author: string }) {
  return (
    <div className="bg-white border border-[#f3f4f6] rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="inline-block bg-[rgba(45,27,78,0.05)] text-[#2d1b4e] px-3 py-1 rounded-full font-['Inter'] text-[12px] font-medium mb-4">
          {category}
        </div>
        <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] mb-3 leading-snug">
          {title}
        </h3>
        <p className="font-['Inter'] text-[14px] text-[#4a5565] leading-relaxed mb-4">
          {excerpt}
        </p>
        <div className="flex items-center gap-3 text-[#6b7280] mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span className="font-['Inter'] text-[12px]">{date}</span>
          </div>
          <span className="text-[10px]">•</span>
          <div className="flex items-center gap-1.5">
            <User size={14} />
            <span className="font-['Inter'] text-[12px]">{author}</span>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 text-[#2d1b4e] font-['Inter'] text-[14px] font-medium hover:gap-3 transition-all">
          Read Article
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
