import { useState } from "react";
import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";
import {
  Plus,
  Search,
  Upload,
  FileText,
  Users,
  Heart,
  AlertCircle,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  BarChart3,
  FileCheck,
  Settings,
  HelpCircle,
  ChevronRight,
  Filter,
  Download,
  Eye,
  Edit,
} from "lucide-react";

// Import church image
import churchHeroImage from "figma:asset/d0bfffae1548196749d44eca98c7b72c0b602178.png";

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<"all" | "baptism" | "marriage" | "funeral">("all");

  return (
    <div className="om-page-container">
      <Navigation />

      {/* Dashboard Header - Church Identity & Context */}
      <section className="relative bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        {/* Church Identity Bar */}
        <div className="relative border-b border-white/10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Church Icon/Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-[#d4af37]">
                  <img
                    src={churchHeroImage}
                    alt="SS Peter & Paul Orthodox Church"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="font-['Georgia'] text-2xl text-white mb-1">
                    SS Peter & Paul Orthodox Church
                  </h1>
                  <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)]">
                    Oakland, California • OCA
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.6)] mb-1">
                    Logged in as
                  </p>
                  <p className="font-['Inter'] text-[15px] text-white font-medium">
                    Test User • Parish Administrator
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome & KPI Section */}
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="font-['Georgia'] text-3xl text-white mb-2">
                Welcome back, Test
              </h2>
              <p className="font-['Inter'] text-[16px] text-[rgba(255,255,255,0.8)]">
                Saturday, March 14, 2026 • Manage your parish records and operations
              </p>
            </div>

            <button className="om-btn-accent">
              <Plus size={20} />
              Add New Record
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-6">
            <MetricCard
              label="Total Records"
              value="2,847"
              trend="+12 this month"
              icon={FileText}
              variant="primary"
            />
            <MetricCard
              label="Baptisms (YTD)"
              value="47"
              trend="+3 this week"
              icon={Users}
              variant="success"
            />
            <MetricCard
              label="Pending Review"
              value="8"
              trend="Requires attention"
              icon={AlertCircle}
              variant="warning"
            />
            <MetricCard
              label="OCR Processing"
              value="15"
              trend="In progress"
              icon={Clock}
              variant="info"
            />
          </div>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT COLUMN - Priority & Records */}
          <div className="col-span-8 space-y-8">
            {/* Priority Work Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-['Georgia'] text-2xl om-text-primary">
                  Attention Required
                </h3>
                <button className="om-link text-[14px]">View All</button>
              </div>

              <div className="space-y-3">
                <PriorityItem
                  title="OCR Review: 3 baptism records ready"
                  description="AI-extracted data awaiting verification"
                  action="Review Now"
                  priority="high"
                  icon={FileCheck}
                />
                <PriorityItem
                  title="Incomplete Marriage Record"
                  description="Missing witness information - Constantine & Anastasia"
                  action="Complete"
                  priority="medium"
                  icon={Edit}
                />
                <PriorityItem
                  title="5 scans uploaded yesterday"
                  description="Ready to begin OCR processing"
                  action="Process"
                  priority="low"
                  icon={Upload}
                />
              </div>
            </section>

            {/* Core Records Dashboard */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-['Georgia'] text-2xl om-text-primary">
                  Parish Records
                </h3>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 om-border-default rounded-lg om-text-secondary hover:om-text-primary transition-colors">
                    <Filter size={16} />
                    <span className="font-['Inter'] text-[14px]">Filter</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 om-border-default rounded-lg om-text-secondary hover:om-text-primary transition-colors">
                    <Download size={16} />
                    <span className="font-['Inter'] text-[14px]">Export</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
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
                <RecordTypeCard
                  title="Marriages"
                  count={456}
                  recentCount={3}
                  recentLabel="this month"
                  icon={Heart}
                  color="rose"
                  records={[
                    { name: "Constantine & Anastasia", date: "Mar 10, 2024" },
                    { name: "Nicholas & Elena", date: "Feb 14, 2024" },
                    { name: "Dimitri & Ekaterina", date: "Jan 20, 2024" },
                  ]}
                />
                <RecordTypeCard
                  title="Funerals"
                  count={549}
                  recentCount={2}
                  recentLabel="this month"
                  icon={FileText}
                  color="purple"
                  records={[
                    { name: "Vasily Romanov", date: "Mar 5, 2024" },
                    { name: "Anna Mikhailova", date: "Feb 28, 2024" },
                    { name: "George Petrov", date: "Feb 12, 2024" },
                  ]}
                />
              </div>
            </section>

            {/* Recent Activity Feed */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-['Georgia'] text-2xl om-text-primary">
                  Recent Activity
                </h3>
                <div className="flex items-center gap-2">
                  <FilterButton label="All" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
                  <FilterButton label="Baptisms" active={activeFilter === "baptism"} onClick={() => setActiveFilter("baptism")} />
                  <FilterButton label="Marriages" active={activeFilter === "marriage"} onClick={() => setActiveFilter("marriage")} />
                  <FilterButton label="Funerals" active={activeFilter === "funeral"} onClick={() => setActiveFilter("funeral")} />
                </div>
              </div>

              <div className="om-card p-6">
                <div className="space-y-4">
                  <ActivityItem
                    type="baptism"
                    title="Baptism record added"
                    description="Sophia Anastasia Petrov"
                    timestamp="2 hours ago"
                    user="Fr. John Alexopoulos"
                  />
                  <ActivityItem
                    type="marriage"
                    title="Marriage record updated"
                    description="Constantine & Anastasia - Added witness details"
                    timestamp="5 hours ago"
                    user="Test User"
                  />
                  <ActivityItem
                    type="upload"
                    title="Records uploaded"
                    description="15 baptism certificates scanned"
                    timestamp="Yesterday at 3:45 PM"
                    user="Test User"
                  />
                  <ActivityItem
                    type="baptism"
                    title="OCR completed"
                    description="3 baptism records extracted and ready for review"
                    timestamp="Yesterday at 2:20 PM"
                    user="System"
                  />
                  <ActivityItem
                    type="funeral"
                    title="Funeral record added"
                    description="Vasily Romanov"
                    timestamp="March 5, 2024"
                    user="Fr. Peter Mikhailov"
                  />
                </div>

                <button className="w-full mt-6 pt-6 om-divider flex items-center justify-center gap-2 om-link text-[14px]">
                  View All Activity
                  <ChevronRight size={16} />
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN - Quick Actions & Tools */}
          <div className="col-span-4 space-y-8">
            {/* Quick Actions */}
            <section>
              <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">
                Quick Actions
              </h3>

              <div className="space-y-3">
                <QuickActionButton
                  icon={Plus}
                  label="Add Baptism"
                  description="Create new record"
                  variant="primary"
                />
                <QuickActionButton
                  icon={Plus}
                  label="Add Marriage"
                  description="Create new record"
                  variant="primary"
                />
                <QuickActionButton
                  icon={Plus}
                  label="Add Funeral"
                  description="Create new record"
                  variant="primary"
                />
                <QuickActionButton
                  icon={Upload}
                  label="Upload Records"
                  description="Scan documents"
                  variant="secondary"
                />
                <QuickActionButton
                  icon={FileCheck}
                  label="Continue OCR"
                  description="Review AI extractions"
                  variant="secondary"
                />
                <QuickActionButton
                  icon={Search}
                  label="Search Records"
                  description="Find anything"
                  variant="secondary"
                />
              </div>
            </section>

            {/* Record Processing Tools */}
            <section>
              <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">
                Record Processing
              </h3>

              <div className="om-card divide-y divide-[#f3f4f6] dark:divide-gray-700">
                <ToolLink
                  icon={Upload}
                  label="Upload Records"
                  description="Batch import scans"
                />
                <ToolLink
                  icon={FileCheck}
                  label="OCR Pipeline"
                  description="AI text extraction"
                />
                <ToolLink
                  icon={Edit}
                  label="Bulk Edit"
                  description="Update multiple records"
                />
              </div>
            </section>

            {/* Analytics & Reporting */}
            <section>
              <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">
                Analytics & Reports
              </h3>

              <div className="om-card divide-y divide-[#f3f4f6] dark:divide-gray-700">
                <ToolLink
                  icon={BarChart3}
                  label="Parish Analytics"
                  description="View trends & insights"
                />
                <ToolLink
                  icon={TrendingUp}
                  label="Custom Reports"
                  description="Generate reports"
                />
                <ToolLink
                  icon={Calendar}
                  label="Sacramental Calendar"
                  description="View schedule"
                />
              </div>
            </section>

            {/* Certificates & Documents */}
            <section>
              <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">
                Certificates
              </h3>

              <div className="om-card divide-y divide-[#f3f4f6] dark:divide-gray-700">
                <ToolLink
                  icon={FileText}
                  label="Generate Certificate"
                  description="Create official docs"
                />
                <ToolLink
                  icon={Download}
                  label="Certificate Templates"
                  description="Manage templates"
                />
              </div>
            </section>

            {/* Account & Help */}
            <section>
              <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">
                Account & Support
              </h3>

              <div className="om-card divide-y divide-[#f3f4f6] dark:divide-gray-700">
                <ToolLink
                  icon={Settings}
                  label="Parish Settings"
                  description="Configure options"
                />
                <ToolLink
                  icon={Users}
                  label="User Management"
                  description="Manage access"
                />
                <ToolLink
                  icon={HelpCircle}
                  label="Help & Support"
                  description="Get assistance"
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ========================================
// Component: Metric Card
// ========================================
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

// ========================================
// Component: Priority Item
// ========================================
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

// ========================================
// Component: Record Type Card
// ========================================
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

// ========================================
// Component: Activity Item
// ========================================
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

// ========================================
// Component: Filter Button
// ========================================
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

// ========================================
// Component: Quick Action Button
// ========================================
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

// ========================================
// Component: Tool Link
// ========================================
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
