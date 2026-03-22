import { Quote, Star } from 'lucide-react';

export function Testimonials() {
  return (
    <section className="py-24 bg-[#2d1b4e]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-white/10 text-white rounded-full text-sm mb-4">
            Client Feedback
          </div>
          <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
            What Our Clients Think About Us
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Our users' feedback is a testament to our commitment to quality and user satisfaction.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-8 right-8 opacity-5">
              <Quote className="w-32 h-32 text-[#2d1b4e]" />
            </div>
            
            <div className="relative">
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-6 h-6 fill-[#d4af37] text-[#d4af37]" />
                ))}
              </div>
              
              <blockquote className="text-2xl lg:text-3xl text-[#2d1b4e] font-serif mb-8 leading-relaxed">
                "Orthodox Metrics has simplified how we manage parish records and ensured our historical data is preserved. The platform respects our traditions while giving us modern tools to serve our community better."
              </blockquote>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f6f] rounded-full flex items-center justify-center text-white text-xl">
                  P
                </div>
                <div>
                  <div className="text-lg text-[#2d1b4e]">Parish Administrator</div>
                  <div className="text-gray-500">Orthodox Parish, North America</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8 text-white/60 text-sm">
            Waiting for official review from client • 1/1
          </div>
        </div>
      </div>
    </section>
  );
}
