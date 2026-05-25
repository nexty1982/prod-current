/**
 * Canonical Icon Registry
 *
 * Single source of truth for all Lucide icons used across the application.
 *
 * WHY THIS EXISTS:
 *   Some Lucide icon names collide with browser globals (Lock, History, etc.).
 *   Importing them directly from 'lucide-react' in a file that doesn't explicitly
 *   import them can cause the browser global (e.g. Web Locks API `Lock`) to be
 *   used instead, resulting in "Illegal constructor" at runtime.
 *
 * RULES:
 *   1. Import icons from '@/ui/icons' (or '@/shared/ui/icons' for legacy).
 *   2. Do NOT import directly from 'lucide-react' in feature code.
 *   3. Browser-global-colliding names also have *Icon aliases (LockIcon, etc.).
 *   4. AG Grid icons must use string SVG markup — see '@/ui/agGridIcons'.
 *
 * Usage:
 *   import { Plus, Pencil, LockIcon, Search } from '@/ui/icons';
 */

// ── Re-export all Lucide icons used in the codebase ────────────────────────

export {
    Activity, AlertCircle,
    AlertTriangle, Archive, ArrowLeft,
    ArrowRight, ArrowUpDown, Award, BarChart3, Bell, BookOpen, Bookmark,
    // Buildings
    Building2,

    // Domain-specific
    Calendar,
    CalendarDays, Check,
    // Status / Feedback
    CheckCircle,
    CheckCircle2, ChevronDown,
    ChevronLeft,
    ChevronRight,
    // Navigation
    ChevronUp, ChevronsUpDown, Church, Circle, ClipboardList, Clock, Code, Coffee, Columns, Columns3, Copy, Cross,
    Crown, Database,
    // Data / Files
    Download, Droplet, Droplets, Edit, ExternalLink, Eye,
    EyeOff, FileBarChart,
    FileCheck,
    FileCode,
    FileSearch, FileText, FileX, Filter, Fish,
    Flame, Folder,
    FolderOpen, GitBranch,
    GitCompare, Globe, Grid, HardDrive, Heart, HelpCircle, History, Home, Info, LayoutGrid,
    LayoutList, Link2, List, Loader2,
    // Security — DANGEROUS NAMES (collide with browser globals)
    Lock,
    // Communication
    Mail, MapPin, Maximize2, Milk, Minimize2, MoreHorizontal,
    // Utility
    MoreVertical, Package, Palette, Pencil, Phone, Play,
    // Action
    Plus, RefreshCw, RotateCcw, Rows, Save, ScanLine, Scroll,
    ScrollText,
    // UI / Layout
    Search, Settings, Share2, Shield,
    // Records Management
    ShieldCheck, ShieldOff, SortAsc,
    SortDesc, Star, Table, Table2,
    TableProperties, Trash2, TrendingUp, Unlock, Upload, User, User2,
    // Users / People
    Users, Wrench, X, XCircle, Zap
} from 'lucide-react';

// ── Type re-exports ─────────────────────────────────────────────────────────
export type { LucideIcon } from 'lucide-react';

// ── Safe aliases for browser-global-colliding names ────────────────────────
// Use these when you want extra safety or clarity.

export {
    History as HistoryIcon, Lock as LockIcon, Table as TableIcon, Unlock as UnlockIcon
} from 'lucide-react';

