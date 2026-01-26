import React from 'react';

interface LiturgicalFlowBackgroundTailwindProps {
  className?: string;
}

const LiturgicalFlowBackgroundTailwind: React.FC<LiturgicalFlowBackgroundTailwindProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`relative min-h-96 flex items-center justify-center overflow-hidden ${className}`}>
      {/* Animated Liturgical Color Background */}
      <div 
        className="absolute inset-0 opacity-10 blur-xl animate-flow"
        style={{
          background: `linear-gradient(
            135deg,
            #6B21A8 0%,     /* Purple - Lent */
            #FFD700 14.3%,  /* Gold - Resurrection */
            #DC2626 28.6%,  /* Red - Martyrs */
            #059669 42.9%,  /* Green - Ordinary Time */
            #2563EB 57.2%,  /* Blue - Theotokos */
            #F9FAFB 71.5%,  /* White - Feasts */
            #1F2937 85.8%,  /* Black - Good Friday */
            #6B21A8 100%    /* Purple - Complete cycle */
          )`,
          backgroundSize: '400% 400%',
        }}
      />
      
      {/* Subtle overlay for better text contrast */}
      <div className="absolute inset-0 bg-white/85 backdrop-blur-sm" />
      
      {/* Main Content Container */}
      <div className="relative z-10 max-w-4xl w-full mx-auto px-6">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 md:p-12">
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap md:flex-nowrap">
            {/* Left Text - English */}
            <div className="text-center md:text-right order-2 md:order-1">
              <h1 className="font-noto-serif-georgian font-bold text-orthodox-purple text-2xl md:text-3xl lg:text-4xl leading-tight whitespace-pre-line drop-shadow-sm">
                Orthodox{'\n'}Metrics
              </h1>
            </div>

            {/* Center - Orthodox Cross */}
            <div className="relative order-1 md:order-2" style={{ filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))' }}>
              <div className="relative w-20 h-28 md:w-24 md:h-32 lg:w-28 lg:h-36">
                {/* Vertical beam */}
                <div 
                  className="absolute left-1/2 transform -translate-x-1/2 rounded-sm shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    width: '12px',
                    height: '100%',
                    top: 0,
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                  }}
                />
                {/* Top bar (INRI bar) */}
                <div 
                  className="absolute left-1/2 transform -translate-x-1/2 rounded-sm shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    width: '32px',
                    height: '8px',
                    top: '18%',
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                  }}
                />
                {/* Main crossbar */}
                <div 
                  className="absolute left-1/2 transform -translate-x-1/2 rounded-sm shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    width: '68px',
                    height: '10px',
                    top: '40%',
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                  }}
                />
                {/* Bottom slanted bar */}
                <div 
                  className="absolute left-1/2 rounded-sm shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    width: '52px',
                    height: '8px',
                    top: '68%',
                    transform: 'translateX(-50%) rotate(-20deg)',
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                  }}
                />
              </div>
            </div>

            {/* Right Text - Georgian */}
            <div className="text-center md:text-left order-3">
              <h1 className="font-noto-serif-georgian font-bold text-orthodox-purple text-2xl md:text-3xl lg:text-4xl leading-tight whitespace-pre-line drop-shadow-sm">
                მართმადიდებლური{'\n'}მეტრიკა
              </h1>
            </div>
          </div>
        </div>

        {/* Georgian Tagline */}
        <div className="text-center mt-6 md:mt-8">
          <p className="font-noto-serif-georgian italic text-orthodox-purple text-lg md:text-xl lg:text-2xl opacity-90 drop-shadow-sm">
            ვკავდებით წმინდა შრომის ჩანაწერებით!
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiturgicalFlowBackgroundTailwind;
