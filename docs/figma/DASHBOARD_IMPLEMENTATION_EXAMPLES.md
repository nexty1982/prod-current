# Dashboard Implementation Examples
## Code Patterns and Reusable Components

---

## 🎯 Quick Start

### Access the Dashboard
```
URL: http://localhost:5173/dashboard
Route: /dashboard
Component: /src/app/pages/Dashboard.tsx
```

### View in Both Themes
1. Navigate to `/dashboard`
2. Click theme toggle in navigation (sun/moon icon)
3. Dashboard automatically adapts

---

## 🏗️ Component Architecture

### Page Structure
```tsx
import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";

export default function Dashboard() {
  return (
    <div className="om-page-container">
      <Navigation />
      
      {/* Header Section */}
      <section className="om-hero-gradient">
        {/* Church identity, KPIs */}
      </section>
      
      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - 8/12 */}
          <div className="col-span-8">
            {/* Priority, Records, Activity */}
          </div>
          
          {/* Right Column - 4/12 */}
          <div className="col-span-4">
            {/* Quick Actions, Tools */}
          </div>
        </div>
      </div>
      
      <SiteFooter />
    </div>
  );
}
```

---

## 📦 Reusable Components

### 1. MetricCard Component

**Purpose**: Display KPIs in header section

**Usage:**
```tsx
<MetricCard
  label="Total Records"
  value="2,847"
  trend="+12 this month"
  icon={FileText}
  variant="primary"
/>
```

**Variants:**
- `primary`: Default glass effect
- `success`: Green tint (positive metrics)
- `warning`: Amber tint (attention needed)
- `info`: Blue tint (informational)

**Full Implementation:**
```tsx
function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  variant = "primary",
}: {
  label: string;
  value: string;
  trend: string;
  icon: any;
  variant?: "primary" | "success" | "warning" | "info";
}) {
  const variantStyles = {
    primary: "bg-white/10 border-white/20",
    success: "bg-green-500/10 border-green-500/20",
    warning: "bg-amber-500/10 border-amber-500/20",
    info: "bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div className={`om-glass-card p-5 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.7)] mb-1">
            {label}
          </p>
          <p className="font-['Georgia'] text-3xl text-white">
            {value}
          </p>
        </div>
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
          <Icon className="text-[#d4af37]" size={20} />
        </div>
      </div>
      <p className="font-['Inter'] text-[12px] text-[rgba(255,255,255,0.6)]">
        {trend}
      </p>
    </div>
  );
}
```

**Example Output:**
```
┌──────────────────────────┐
│ Total Records       [📄] │
│ 2,847                    │
│ +12 this month           │
└──────────────────────────┘
```

---

### 2. PriorityItem Component

**Purpose**: Display attention-required items with urgency indicators

**Usage:**
```tsx
<PriorityItem
  title="OCR Review: 3 baptism records ready"
  description="AI-extracted data awaiting verification"
  action="Review Now"
  priority="high"
  icon={FileCheck}
/>
```

**Priority Levels:**
- `high`: Red border, urgent
- `medium`: Amber border, important
- `low`: Blue border, informational

**Full Implementation:**
```tsx
function PriorityItem({
  title,
  description,
  action,
  priority,
  icon: Icon,
}: {
  title: string;
  description: string;
  action: string;
  priority: "high" | "medium" | "low";
  icon: any;
}) {
  const priorityStyles = {
    high: "border-l-4 border-l-red-500 dark:border-l-red-400 bg-red-50 dark:bg-red-900/10",
    medium: "border-l-4 border-l-amber-500 dark:border-l-amber-400 bg-amber-50 dark:bg-amber-900/10",
    low: "border-l-4 border-l-blue-500 dark:border-l-blue-400 bg-blue-50 dark:bg-blue-900/10",
  };

  return (
    <div className={`${priorityStyles[priority]} rounded-lg p-4 flex items-center justify-between`}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="om-feature-icon" size={20} />
        </div>
        <div>
          <p className="font-['Inter'] font-medium text-[15px] om-text-primary mb-1">
            {title}
          </p>
          <p className="font-['Inter'] text-[13px] om-text-secondary">
            {description}
          </p>
        </div>
      </div>
      <button className="px-4 py-2 bg-white dark:bg-gray-800 om-border-default rounded-lg font-['Inter'] text-[14px] om-text-primary hover:bg-[#2d1b4e] hover:text-white dark:hover:bg-[#d4af37] dark:hover:text-[#2d1b4e] transition-colors">
        {action}
      </button>
    </div>
  );
}
```

**Example Output:**
```
┌────────────────────────────────────────────────┐
│ 🔴 [📄] OCR Review: 3 baptism records ready    │
│        AI-extracted data awaiting verification │
│                              [Review Now]      │
└────────────────────────────────────────────────┘
```

---

### 3. RecordTypeCard Component

**Purpose**: Display record category with counts, trends, and recent items

**Usage:**
```tsx
<RecordTypeCard
  title="Baptisms"
  count={1842}
  recentCount={12}
  recentLabel="this month"
  icon={Users}
  color="blue"
  records={[
    { name: "Sophia Anastasia Petrov", date: "Apr 2, 2024" },
    { name: "Alexander Constantine", date: "Mar 28, 2024" },
    { name: "Maria Elena Popov", date: "Mar 15, 2024" },
  ]}
/>
```

**Color Options:**
- `blue`: Baptisms
- `rose`: Marriages
- `purple`: Funerals

**Full Implementation:**
```tsx
function RecordTypeCard({
  title,
  count,
  recentCount,
  recentLabel,
  icon: Icon,
  color,
  records,
}: {
  title: string;
  count: number;
  recentCount: number;
  recentLabel: string;
  icon: any;
  color: "blue" | "rose" | "purple";
  records: Array<{ name: string; date: string }>;
}) {
  const colorStyles = {
    blue: "from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700",
    rose: "from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700",
    purple: "from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700",
  };

  return (
    <div className="om-card overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-br ${colorStyles[color]} p-5 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <Icon size={28} />
          <div className="text-right">
            <p className="font-['Georgia'] text-3xl">{count.toLocaleString()}</p>
          </div>
        </div>
        <h4 className="font-['Inter'] font-medium text-lg mb-1">{title}</h4>
        <p className="font-['Inter'] text-[13px] text-white/80">
          +{recentCount} {recentLabel}
        </p>
      </div>

      {/* Recent Records */}
      <div className="p-4 border-b om-border-subtle">
        <p className="font-['Inter'] text-[12px] om-text-tertiary uppercase tracking-wide mb-3">
          Recent Records
        </p>
        <div className="space-y-2">
          {records.map((record, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <p className="font-['Inter'] text-[13px] om-text-primary truncate">
                {record.name}
              </p>
              <p className="font-['Inter'] text-[12px] om-text-tertiary ml-2">
                {record.date}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-1 px-3 py-2 om-border-default rounded-lg font-['Inter'] text-[13px] om-text-primary hover:bg-[#f9fafb] dark:hover:bg-gray-700 transition-colors">
          <Eye size={14} />
          View All
        </button>
        <button className="flex items-center justify-center gap-1 px-3 py-2 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] text-[13px] hover:bg-[#1f1236] dark:hover:bg-[#c29d2f] transition-colors">
          <Plus size={14} />
          Add New
        </button>
      </div>
    </div>
  );
}
```

**Example Output:**
```
┌──────────────────────────┐
│ 👥            1,842      │
│ Baptisms                 │
│ +12 this month           │
├──────────────────────────┤
│ RECENT RECORDS           │
│ Sophia Anastasia Petrov  │
│           Apr 2, 2024    │
│ Alexander Constantine    │
│           Mar 28, 2024   │
│ Maria Elena Popov        │
│           Mar 15, 2024   │
├──────────────────────────┤
│ [👁 View All] [+ Add New]│
└──────────────────────────┘
```

---

### 4. ActivityItem Component

**Purpose**: Display timeline entry in activity feed

**Usage:**
```tsx
<ActivityItem
  type="baptism"
  title="Baptism record added"
  description="Sophia Anastasia Petrov"
  timestamp="2 hours ago"
  user="Fr. John Alexopoulos"
/>
```

**Types:**
- `baptism`: Blue icon, Users icon
- `marriage`: Rose icon, Heart icon
- `funeral`: Purple icon, FileText icon
- `upload`: Amber icon, Upload icon

**Full Implementation:**
```tsx
function ActivityItem({
  type,
  title,
  description,
  timestamp,
  user,
}: {
  type: "baptism" | "marriage" | "funeral" | "upload";
  title: string;
  description: string;
  timestamp: string;
  user: string;
}) {
  const typeIcons = {
    baptism: Users,
    marriage: Heart,
    funeral: FileText,
    upload: Upload,
  };

  const typeColors = {
    baptism: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    marriage: "bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400",
    funeral: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    upload: "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
  };

  const Icon = typeIcons[type];

  return (
    <div className="flex items-start gap-4 pb-4 last:pb-0 om-divider last:border-0">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[type]}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-['Inter'] font-medium text-[14px] om-text-primary mb-1">
          {title}
        </p>
        <p className="font-['Inter'] text-[13px] om-text-secondary mb-2">
          {description}
        </p>
        <div className="flex items-center gap-3">
          <p className="font-['Inter'] text-[12px] om-text-tertiary">
            {timestamp}
          </p>
          <span className="om-text-tertiary">•</span>
          <p className="font-['Inter'] text-[12px] om-text-tertiary">
            {user}
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Example Output:**
```
┌────────────────────────────────────┐
│ [👥] Baptism record added          │
│      Sophia Anastasia Petrov       │
│      2 hours ago • Fr. John A...   │
├────────────────────────────────────┤
│ [💍] Marriage record updated       │
│      Constantine & Anastasia       │
│      5 hours ago • Test User       │
└────────────────────────────────────┘
```

---

### 5. QuickActionButton Component

**Purpose**: Sidebar action buttons

**Usage:**
```tsx
<QuickActionButton
  icon={Plus}
  label="Add Baptism"
  description="Create new record"
  variant="primary"
/>
```

**Variants:**
- `primary`: Purple (light) / Gold (dark) background
- `secondary`: White card with border

**Full Implementation:**
```tsx
function QuickActionButton({
  icon: Icon,
  label,
  description,
  variant = "primary",
}: {
  icon: any;
  label: string;
  description: string;
  variant?: "primary" | "secondary";
}) {
  const variantStyles =
    variant === "primary"
      ? "bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] hover:bg-[#1f1236] dark:hover:bg-[#c29d2f]"
      : "om-card hover:border-[#d4af37] dark:hover:border-[#d4af37]";

  return (
    <button
      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${variantStyles}`}
    >
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
          variant === "primary"
            ? "bg-white/10"
            : "bg-[#2d1b4e] dark:bg-[#d4af37]"
        }`}
      >
        <Icon
          className={variant === "primary" ? "text-[#d4af37]" : "text-white dark:text-[#2d1b4e]"}
          size={20}
        />
      </div>
      <div className="text-left flex-1">
        <p
          className={`font-['Inter'] font-medium text-[15px] mb-0.5 ${
            variant === "primary" ? "" : "om-text-primary"
          }`}
        >
          {label}
        </p>
        <p
          className={`font-['Inter'] text-[12px] ${
            variant === "primary" ? "text-white/70 dark:text-[rgba(45,27,78,0.7)]" : "om-text-tertiary"
          }`}
        >
          {description}
        </p>
      </div>
      <ChevronRight
        className={variant === "primary" ? "text-white/50 dark:text-[rgba(45,27,78,0.5)]" : "om-text-tertiary"}
        size={18}
      />
    </button>
  );
}
```

**Example Output:**
```
Primary:
┌────────────────────────────────┐
│ [+] Add Baptism             → │
│     Create new record          │
└────────────────────────────────┘

Secondary:
┌────────────────────────────────┐
│ [📤] Upload Records          → │
│      Scan documents            │
└────────────────────────────────┘
```

---

### 6. ToolLink Component

**Purpose**: Grouped utility links

**Usage:**
```tsx
<ToolLink
  icon={Upload}
  label="Upload Records"
  description="Batch import scans"
/>
```

**Full Implementation:**
```tsx
function ToolLink({
  icon: Icon,
  label,
  description,
}: {
  icon: any;
  label: string;
  description: string;
}) {
  return (
    <button className="w-full p-4 flex items-center gap-3 hover:bg-[#f9fafb] dark:hover:bg-gray-700 transition-colors">
      <div className="w-9 h-9 bg-[#f3f4f6] dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="om-feature-icon" size={16} />
      </div>
      <div className="text-left flex-1">
        <p className="font-['Inter'] font-medium text-[14px] om-text-primary mb-0.5">
          {label}
        </p>
        <p className="font-['Inter'] text-[12px] om-text-tertiary">
          {description}
        </p>
      </div>
      <ChevronRight className="om-text-tertiary" size={16} />
    </button>
  );
}
```

**Example Output:**
```
┌────────────────────────────────┐
│ [📤] Upload Records          →│
│      Batch import scans        │
├────────────────────────────────┤
│ [✓] OCR Pipeline             →│
│     AI text extraction         │
├────────────────────────────────┤
│ [✏️] Bulk Edit               →│
│     Update multiple records    │
└────────────────────────────────┘
```

---

### 7. FilterButton Component

**Purpose**: Activity feed filters

**Usage:**
```tsx
<FilterButton
  label="Baptisms"
  active={activeFilter === "baptism"}
  onClick={() => setActiveFilter("baptism")}
/>
```

**Full Implementation:**
```tsx
function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg font-['Inter'] text-[13px] transition-colors ${
        active
          ? "bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e]"
          : "om-border-default om-text-secondary hover:om-text-primary"
      }`}
    >
      {label}
    </button>
  );
}
```

**Example Output:**
```
[All] [Baptisms] [Marriages] [Funerals]
 ^^^   (active - highlighted)
```

---

## 🎨 Styling Patterns

### Using Design System Classes

**Page Container:**
```tsx
<div className="om-page-container">
  {/* Automatically handles light/dark background */}
</div>
```

**Hero Gradient:**
```tsx
<section className="om-hero-gradient py-20">
  {/* Purple gradient (light) or dark gradient (dark) */}
</section>
```

**Cards:**
```tsx
<div className="om-card p-6">
  {/* White/gray-800, border, rounded, shadow */}
</div>
```

**Typography:**
```tsx
<h2 className="om-heading-primary mb-4">Title</h2>
<p className="om-text-body">Body text with relaxed line-height</p>
<p className="om-text-secondary">Secondary information</p>
```

**Buttons:**
```tsx
<button className="om-btn-primary">Primary Action</button>
<button className="om-btn-accent">Accent Action</button>
<button className="om-btn-outline">Outline Action</button>
```

---

## 🔄 State Management

### Filter State Example
```tsx
const [activeFilter, setActiveFilter] = useState<"all" | "baptism" | "marriage" | "funeral">("all");

// In render:
<FilterButton
  label="All"
  active={activeFilter === "all"}
  onClick={() => setActiveFilter("all")}
/>
```

### Conditional Rendering Example
```tsx
{priorityItems.length > 0 ? (
  <section>
    <h3>Attention Required</h3>
    {priorityItems.map(item => (
      <PriorityItem key={item.id} {...item} />
    ))}
  </section>
) : (
  <div className="om-card p-8 text-center">
    <CheckCircle className="om-feature-icon mx-auto mb-3" size={48} />
    <p className="om-text-primary font-medium">All Caught Up!</p>
    <p className="om-text-secondary text-[14px]">No items require attention.</p>
  </div>
)}
```

---

## 🌐 Internationalization

### Multi-language Text Example
```tsx
// Greek
<p className="font-['Inter'] om-text-primary">
  Βάπτισμα: Γεώργιος Παπαδόπουλος
</p>

// Russian
<p className="font-['Inter'] om-text-primary">
  Крещение: Алексей Иванов
</p>

// Arabic (RTL)
<p className="font-['Inter'] om-text-primary" dir="rtl">
  المعمودية: يوحنا الخوري
</p>
```

### Date Formatting Example
```tsx
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

// Usage:
<p>{formatDate(new Date('2024-04-02'))}</p>
// Output: "Apr 2, 2024"
```

---

## 🧪 Testing Examples

### Component Testing
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('filter buttons change active state', async () => {
  render(<Dashboard />);
  
  const baptismFilter = screen.getByText('Baptisms');
  await userEvent.click(baptismFilter);
  
  expect(baptismFilter).toHaveClass('bg-[#2d1b4e]');
});
```

### Accessibility Testing
```tsx
test('priority items have proper ARIA labels', () => {
  render(<PriorityItem
    title="OCR Review"
    description="3 records ready"
    action="Review Now"
    priority="high"
    icon={FileCheck}
  />);
  
  const button = screen.getByRole('button', { name: /Review Now/i });
  expect(button).toBeInTheDocument();
});
```

---

## 📊 Data Integration

### API Response Shape (Example)
```typescript
interface DashboardData {
  church: {
    name: string;
    location: string;
    jurisdiction: string;
    logo: string;
  };
  user: {
    name: string;
    role: string;
  };
  metrics: {
    totalRecords: number;
    baptismsYTD: number;
    pendingReview: number;
    ocrProcessing: number;
  };
  priorityItems: Array<{
    id: string;
    title: string;
    description: string;
    action: string;
    priority: "high" | "medium" | "low";
    type: string;
  }>;
  records: {
    baptisms: {
      count: number;
      recentCount: number;
      recent: Array<{ name: string; date: string }>;
    };
    marriages: {
      count: number;
      recentCount: number;
      recent: Array<{ name: string; date: string }>;
    };
    funerals: {
      count: number;
      recentCount: number;
      recent: Array<{ name: string; date: string }>;
    };
  };
  activity: Array<{
    id: string;
    type: "baptism" | "marriage" | "funeral" | "upload";
    title: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
}
```

### Fetching Data Example
```tsx
const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchDashboard() {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  }
  
  fetchDashboard();
}, []);

if (loading) return <LoadingSpinner />;
if (!dashboardData) return <ErrorMessage />;

return (
  <div className="om-page-container">
    {/* Render with dashboardData */}
  </div>
);
```

---

## 🎯 Performance Optimization

### Lazy Loading Example
```tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));

// In router:
{
  path: "/dashboard",
  element: (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  ),
}
```

### Memoization Example
```tsx
const MemoizedActivityItem = memo(ActivityItem);

// In render:
{activity.map(item => (
  <MemoizedActivityItem key={item.id} {...item} />
))}
```

---

## 🔧 Customization Examples

### Custom Colors
```tsx
// Override design system for specific church
<div
  className="om-card"
  style={{
    '--om-purple-deep': '#1a0f2e', // Darker purple
    '--om-gold': '#c5a028', // Different gold shade
  } as React.CSSProperties}
>
  {/* Card content */}
</div>
```

### Custom Metrics
```tsx
<MetricCard
  label="Pending Certificates"
  value="23"
  trend="Issued this week"
  icon={FileText}
  variant="info"
/>

<MetricCard
  label="Active Users"
  value="5"
  trend="Last 7 days"
  icon={Users}
  variant="success"
/>
```

---

**Version**: 1.0  
**Last Updated**: March 14, 2026  
**Purpose**: Practical implementation patterns and code examples for dashboard development
