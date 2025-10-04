import React from 'react';

interface ConsoleCardProps {
  title: string;
  titleColor: string;
  icon: React.ReactNode;
  badge?: {
    text: string;
    color: string;
  };
  children: React.ReactNode;
  className?: string;
}

export const ConsoleCard: React.FC<ConsoleCardProps> = ({
  title,
  titleColor,
  icon,
  badge,
  children,
  className = ''
}) => {
  return (
    <div className={`console-card h-full flex flex-col bg-gray-900 border-gray-700 border rounded-lg shadow-lg ${className}`}>
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 p-4 pb-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-1.5 rounded-lg ${titleColor}`}>
              {icon}
            </div>
            <h3 className={`text-lg font-medium ${titleColor}`}>
              {title}
            </h3>
          </div>
          
          {badge && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
              {badge.text}
            </div>
          )}
        </div>
      </div>
      
      {/* Content - Flex-grow with scrollbar */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default ConsoleCard;