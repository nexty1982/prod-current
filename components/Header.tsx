import { Button } from "./ui/button";
import { RotateCw, Download, BookOpen } from "lucide-react";

interface HeaderProps {
  onToggleLegend: () => void;
  isLegendOpen: boolean;
}

export function Header({ onToggleLegend, isLegendOpen }: HeaderProps) {
  return (
    <header className="w-full border-b border-[var(--om-border)] bg-[var(--om-parchment)] px-6 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--om-purple)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            OM File Deps
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={onToggleLegend}
            className={`border-[var(--om-border)] ${
              isLegendOpen 
                ? 'bg-[var(--om-gold)]/20 border-[var(--om-gold)] text-[var(--om-purple)]' 
                : 'hover:bg-[var(--om-gold)]/10'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Legend
          </Button>
          
          <Button 
            className="bg-[var(--om-gold)] hover:bg-[var(--om-gold)]/90 text-[var(--om-purple)] shadow-md"
            size="sm"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Run Full Scan
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="border-[var(--om-border)] hover:bg-[var(--om-gold)]/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>
    </header>
  );
}