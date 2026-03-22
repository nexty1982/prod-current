import { motion } from 'framer-motion';
import { Cross, Heart, Church } from 'lucide-react';
import { recordCards, type RecordType } from './recordsTransformDemoData';

function OrthodoxCross({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className}>
      <line x1="12" y1="2" x2="12" y2="30" />
      <line x1="7" y1="7" x2="17" y2="7" />
      <line x1="5" y1="14" x2="19" y2="14" />
      <line x1="7" y1="24" x2="17" y2="20" />
    </svg>
  );
}

function CardIcon({ type, className }: { type: RecordType; className?: string }) {
  if (type === 'baptisms') return <Cross className={className} />;
  if (type === 'marriages') return <Heart className={className} />;
  if (type === 'funerals') return <Church className={className} />;
  return <OrthodoxCross className={className} />;
}

interface RecordTypeCardsProps {
  activeType: RecordType;
  onSelect: (type: RecordType) => void;
  onHover: (type: RecordType) => void;
}

export function RecordTypeCards({ activeType, onSelect, onHover }: RecordTypeCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto mb-8 md:mb-10">
      {recordCards.map((card) => {
        const isActive = activeType === card.type;
        const isCustom = card.type === 'custom';
        return (
          <motion.button
            key={card.type}
            onClick={() => onSelect(card.type)}
            onMouseEnter={() => onHover(card.type)}
            whileHover={isCustom ? { y: -4 } : undefined}
            className={`
              relative group rounded-2xl p-4 md:p-5 text-left transition-all duration-300 cursor-pointer border
              ${isActive
                ? isCustom
                  ? 'bg-gradient-to-br from-purple-600/40 to-purple-800/30 border-purple-400/60 shadow-lg shadow-purple-500/30'
                  : 'bg-purple-600/30 border-purple-400/50 shadow-lg shadow-purple-500/20'
                : isCustom
                  ? 'bg-gradient-to-br from-white/5 to-purple-900/20 border-purple-500/20 hover:border-purple-400/40 hover:shadow-lg hover:shadow-purple-500/15'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
            `}
          >
            {card.badge && (
              <span className="absolute top-2.5 right-2.5 md:top-3 md:right-3 text-[9px] md:text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-['Inter']">
                {card.badge}
              </span>
            )}
            <CardIcon type={card.type} className={`w-5 h-5 mb-3 ${isActive ? 'text-purple-300' : 'text-purple-400/60'}`} />
            <div className={`text-sm mb-1 font-['Inter'] ${isActive ? 'text-white' : 'text-white/80'}`}>{card.label}</div>
            <div className="text-xs text-purple-300/60 font-['Inter']">{card.year} &middot; {card.count} records</div>
            {isActive && (
              <motion.div layoutId="activeIndicator" className="absolute bottom-0 left-4 right-4 h-0.5 bg-purple-400 rounded-full" />
            )}
            {isCustom && (
              <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
