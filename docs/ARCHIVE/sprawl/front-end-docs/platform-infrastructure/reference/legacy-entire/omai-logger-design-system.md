# OMAI Ultimate Logger - Design System Documentation

## 📦 Layout & Grid Structure

### Desktop Layout
```css
/* Main Grid: 2x2 Console Layout */
.console-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1.5rem; /* 24px */
  height: calc(100vh - 200px);
}
```

### Mobile/Tablet Layout
```css
/* Responsive: Switches to tabbed interface */
@media (max-width: 1024px) {
  .console-grid {
    display: none;
  }
  .console-tabs {
    display: block;
    height: 70vh;
  }
}
```

### Container Structure
```css
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(8px);
}

.main-content {
  flex: 1;
  container: mx-auto;
  padding: 1rem;
}

.footer {
  backdrop-filter: blur(8px);
}
```

## 🎨 Color Tokens

### Log Level Colors
```css
:root {
  /* Error Colors */
  --log-error-text: #f87171; /* text-red-400 */
  --log-error-bg: rgba(153, 27, 27, 0.2); /* bg-red-900/20 */
  --log-error-border: rgba(185, 28, 28, 0.5); /* border-red-700/50 */
  --log-error-badge: #7f1d1d; /* bg-red-900 */

  /* Warning Colors */
  --log-warn-text: #facc15; /* text-yellow-400 */
  --log-warn-bg: rgba(113, 63, 18, 0.2); /* bg-yellow-900/20 */
  --log-warn-border: rgba(161, 98, 7, 0.5); /* border-yellow-700/50 */
  --log-warn-badge: #713f12; /* bg-yellow-900 */

  /* Info Colors */
  --log-info-text: #60a5fa; /* text-blue-400 */
  --log-info-bg: rgba(30, 58, 138, 0.2); /* bg-blue-900/20 */
  --log-info-border: rgba(29, 78, 216, 0.5); /* border-blue-700/50 */
  --log-info-badge: #1e3a8a; /* bg-blue-900 */

  /* Debug Colors */
  --log-debug-text: #9ca3af; /* text-gray-400 */
  --log-debug-bg: rgba(17, 24, 39, 0.2); /* bg-gray-900/20 */
  --log-debug-border: rgba(55, 65, 81, 0.5); /* border-gray-700/50 */
  --log-debug-badge: #111827; /* bg-gray-900 */

  /* Success Colors */
  --log-success-text: #4ade80; /* text-green-400 */
  --log-success-bg: rgba(20, 83, 45, 0.2); /* bg-green-900/20 */
  --log-success-border: rgba(21, 128, 61, 0.5); /* border-green-700/50 */
  --log-success-badge: #14532d; /* bg-green-900 */
}
```

### Source Colors
```css
:root {
  --source-frontend: #4ade80; /* text-green-400 */
  --source-backend: #c084fc; /* text-purple-400 */
  --source-dev: #fb923c; /* text-orange-400 */
}
```

### Console Theme Colors
```css
:root {
  /* Real-Time Console */
  --console-realtime-accent: #4ade80; /* text-green-400 */
  
  /* Critical Console */
  --console-critical-accent: #f87171; /* text-red-400 */
  
  /* System Messages Console */
  --console-system-accent: #60a5fa; /* text-blue-400 */
  
  /* Date Logs Console */
  --console-date-accent: #c084fc; /* text-purple-400 */
}
```

### Background & Surface Colors
```css
:root {
  /* Card Backgrounds */
  --card-bg: #111827; /* bg-gray-900 */
  --card-border: #374151; /* border-gray-700 */
  --card-hover-bg: rgba(31, 41, 55, 0.5); /* hover:bg-gray-800/50 */
  
  /* App Background */
  --app-bg: var(--background); /* Uses theme background */
  --header-bg: rgba(var(--card), 0.5); /* bg-card/50 */
  --footer-bg: rgba(var(--card), 0.5); /* bg-card/50 */
}
```

### Status Indicator Colors
```css
:root {
  --status-live: #10b981; /* text-green-500 */
  --status-paused: #f59e0b; /* text-yellow-500 */
  --status-dot-live: #10b981; /* bg-green-500 */
  --status-dot-paused: #f59e0b; /* bg-yellow-500 */
}
```

## 🧩 Reusable Components

### HeaderBar Component
```typescript
interface HeaderBarProps {
  title: string;
  isLive: boolean;
  onToggleLive: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (value: boolean) => void;
  activeFilters: number;
}

// Styling Classes:
// - Container: "border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50"
// - Inner: "container mx-auto px-4 py-3"
// - Title: "text-2xl font-mono"
// - Controls: "flex items-center space-x-4"
```

### LogCard Component
```typescript
interface LogCardProps {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  source: 'frontend' | 'backend' | 'dev';
  message: string;
}

// Styling Classes:
// - Container: "flex items-start space-x-3 text-gray-300 hover:bg-gray-800/50 p-1 rounded"
// - Timestamp: "text-gray-500 text-xs w-20 flex-shrink-0"
// - Level Badge: Dynamic based on level
// - Source: Dynamic based on source + "text-xs w-16 flex-shrink-0"
// - Message: "flex-1 text-gray-300"
```

### CriticalAlert Component
```typescript
interface CriticalAlertProps {
  level: 'WARN' | 'ERROR';
  source: 'frontend' | 'backend' | 'dev';
  message: string;
  icon: string;
  timestamp: Date;
  onDismiss: () => void;
}

// Styling Classes:
// - Container: Dynamic background + "border rounded-lg p-3 relative group hover:shadow-lg transition-all duration-200"
// - Icon: "text-lg"
// - Dismiss Button: "opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-gray-400 hover:text-gray-200"
```

### SystemMessageCard Component
```typescript
interface SystemMessageCardProps {
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'service' | 'security' | 'backup' | 'notification' | 'config' | 'performance';
  title: string;
  description: string;
  timestamp: Date;
  onDismiss: () => void;
}

// Animation: Framer Motion slide-in
// - initial: { opacity: 0, x: -20, scale: 0.95 }
// - animate: { opacity: 1, x: 0, scale: 1 }
// - exit: { opacity: 0, x: 20, scale: 0.95 }
```

### HistoricalLogItem Component
```typescript
interface HistoricalLogItemProps {
  level: 'INFO' | 'WARN' | 'ERROR';
  source: 'frontend' | 'backend' | 'dev';
  description: string;
  firstOccurrence: Date;
  occurrences: number;
  details: string[];
  expanded: boolean;
  onToggleExpand: () => void;
}

// Uses Collapsible from shadcn/ui
// Styling: Expandable cards with chevron indicators
```

### Badge Component
```typescript
interface BadgeProps {
  variant: 'default' | 'secondary' | 'outline';
  children: React.ReactNode;
  className?: string;
}

// Usage Examples:
// - Log Count: "text-green-400 border-green-400 font-mono"
// - Status: Dynamic based on isLive state
// - Level Badges: Dynamic based on log level
```

### ConsoleCard Component
```typescript
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

// Base Styling: "h-full bg-gray-900 border-gray-700 shadow-lg"
// Header: "pb-3"
// Content: "h-[calc(100%-80px)] p-0"
```

## 🔠 Typography Scale

### Font Family
```css
:root {
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
}

/* Applied globally with: font-mono */
```

### Font Sizes
```css
:root {
  /* Header Sizes */
  --text-2xl: 1.5rem; /* 24px - Main title */
  --text-xl: 1.25rem; /* 20px */
  --text-lg: 1.125rem; /* 18px - Console titles */
  
  /* Body Sizes */
  --text-base: 1rem; /* 16px - Default */
  --text-sm: 0.875rem; /* 14px - Log entries */
  --text-xs: 0.75rem; /* 12px - Timestamps, badges */
}
```

### Font Weights
```css
:root {
  --font-weight-normal: 400;
  --font-weight-medium: 500; /* Used for headings, buttons */
}
```

### Line Heights
```css
:root {
  --leading-relaxed: 1.625; /* For log descriptions */
  --leading-normal: 1.5; /* Default */
  --leading-tight: 1.25; /* For compact text */
}
```

## 📏 Spacing & Layout Tokens

### Spacing Scale
```css
:root {
  /* Container Spacing */
  --spacing-container-x: 1rem; /* px-4 */
  --spacing-container-y: 0.75rem; /* py-3 */
  
  /* Component Spacing */
  --spacing-card-padding: 1rem; /* p-4 */
  --spacing-card-gap: 1.5rem; /* gap-6 */
  --spacing-element-gap: 0.75rem; /* space-x-3 */
  --spacing-small-gap: 0.5rem; /* space-x-2 */
  
  /* Log Entry Spacing */
  --spacing-log-y: 0.25rem; /* space-y-1 */
  --spacing-log-padding: 0.25rem; /* p-1 */
  
  /* Critical Alert Spacing */
  --spacing-alert-y: 0.5rem; /* space-y-2 */
  --spacing-alert-padding: 0.75rem; /* p-3 */
  
  /* System Message Spacing */
  --spacing-message-y: 0.75rem; /* space-y-3 */
  --spacing-message-padding: 1rem; /* p-4 */
  
  /* Date Log Spacing */
  --spacing-date-log-y: 0.75rem; /* space-y-3 */
}
```

### Border Radius
```css
:root {
  --radius-sm: 0.125rem; /* rounded-sm */
  --radius-default: 0.25rem; /* rounded */
  --radius-md: 0.375rem; /* rounded-md */
  --radius-lg: 0.5rem; /* rounded-lg */
  --radius-xl: 0.75rem; /* rounded-xl */
}

/* Usage:
- Cards: rounded-lg
- Badges: rounded (small)
- Log entries: rounded
- Buttons: rounded-md
*/
```

### Shadow/Elevation
```css
:root {
  --shadow-card: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
  --shadow-hover: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); /* hover:shadow-lg */
}
```

## 🌗 Dark Theme Configuration

### Theme Toggle Implementation
```typescript
const [isDarkMode, setIsDarkMode] = useState(true);

useEffect(() => {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [isDarkMode]);
```

### Dark Mode Overrides
```css
.dark {
  /* Console Backgrounds */
  --card-bg: #111827; /* Darker cards */
  --card-border: #374151; /* Subtle borders */
  
  /* Text Colors */
  --text-primary: #f9fafb; /* text-gray-50 */
  --text-secondary: #d1d5db; /* text-gray-300 */
  --text-muted: #9ca3af; /* text-gray-400 */
  --text-dimmed: #6b7280; /* text-gray-500 */
  
  /* Interactive States */
  --hover-bg: rgba(31, 41, 55, 0.5); /* hover:bg-gray-800/50 */
  --focus-ring: #374151; /* focus:ring-gray-700 */
}
```

## 🧠 Interaction & Animation Patterns

### Hover States
```css
/* Log Entry Hover */
.log-entry:hover {
  background-color: rgba(31, 41, 55, 0.5);
  transition: background-color 0.2s ease;
}

/* Button Hover */
.button:hover {
  color: var(--console-accent-color);
  transition: color 0.2s ease;
}

/* Card Hover */
.card:hover {
  box-shadow: var(--shadow-hover);
  transition: box-shadow 0.2s ease;
}
```

### Animations
```css
/* Blinking Cursor */
@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.terminal-cursor {
  animation: cursor-blink 1s infinite;
}

/* Status Indicator Pulse */
.status-live .status-dot {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Slide-in Animation (Framer Motion) */
.system-message-enter {
  transform: translateX(-20px) scale(0.95);
  opacity: 0;
}

.system-message-enter-active {
  transform: translateX(0) scale(1);
  opacity: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Scroll Behavior
```css
/* Auto-scroll Implementation */
.console-scroll-area {
  scroll-behavior: smooth;
}

/* Custom Scrollbar Styling */
.console-scroll-area::-webkit-scrollbar {
  width: 6px;
}

.console-scroll-area::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.1);
}

.console-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}
```

## 📋 Component Usage Examples

### Console Grid Implementation
```tsx
<div className="hidden lg:grid lg:grid-cols-2 lg:grid-rows-2 gap-6 h-[calc(100vh-200px)]">
  <RealTimeConsole isLive={isLive} />
  <CriticalConsole isLive={isLive} />
  <SystemMessagesConsole isLive={isLive} />
  <DateLogsConsole />
</div>
```

### Status Bar Implementation
```tsx
<footer className="border-t border-border bg-card/50 backdrop-blur-sm">
  <div className="container mx-auto px-4 py-2">
    <div className="flex items-center justify-between text-sm font-mono">
      <div className="flex items-center space-x-4">
        <span className={`flex items-center ${isLive ? 'text-green-500' : 'text-yellow-500'}`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          Status: {isLive ? 'Live' : 'Paused'}
        </span>
      </div>
    </div>
  </div>
</footer>
```

## 🎯 Responsive Breakpoints

```css
/* Mobile First Approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg - Desktop grid appears */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Breakpoint Usage
- **Mobile/Tablet (< 1024px)**: Tabbed interface
- **Desktop (≥ 1024px)**: 2x2 grid layout
- **Header controls**: Responsive spacing and sizing
- **Typography**: Maintains readability across all sizes

This design system provides a comprehensive foundation for building consistent logging interfaces with terminal aesthetics, real-time capabilities, and excellent user experience across all device sizes.