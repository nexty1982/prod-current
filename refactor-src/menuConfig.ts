// Menu configuration
export const menuConfig = [
  {
    label: "Dashboard",
    path: "/dashboard",
    section: "main",
  },
  {
    label: "Liturgical Calendar",
    path: "/liturgical-calendar",
    section: "main",
    icon: "Calendar",
    description: "Orthodox liturgical calendar with feasts, saints, and daily readings",
  },
  {
    label: "Records Management",
    path: "/apps/records",
    section: "main",
    icon: "FileText",
    description: "Manage church records including baptisms, marriages, and funerals",
    children: [
      {
        label: "All Records",
        path: "/apps/records",
        icon: "Files",
        description: "View and manage all church records"
      },
      {
        label: "Baptism Records",
        path: "/apps/records/baptism",
        icon: "Droplet",
        description: "Manage baptism records and certificates"
      },
      {
        label: "Marriage Records",
        path: "/apps/records/marriage",
        icon: "Heart",
        description: "Manage marriage records and certificates"
      },
      {
        label: "Funeral Records",
        path: "/apps/records/funeral",
        icon: "Cross",
        description: "Manage funeral and death records"
      },
      {
        label: "Centralized Records",
        path: "/apps/records/centralized",
        icon: "BoxMultiple",
        description: "Centralized records management system"
      },
      {
        label: "Dynamic Manager",
        path: "/apps/records/manager",
        icon: "Settings",
        description: "Dynamic records management interface"
      },
      {
        label: "Modern Manager",
        path: "/apps/records/modern-manager",
        icon: "ChartLine",
        description: "Modern records management interface"
      },
      {
        label: "Editable Records",
        path: "/apps/records/editable",
        icon: "Edit",
        description: "Edit and modify existing records"
      }
    ]
  },
  {
    label: "Tools",
    path: "/tools",
    section: "tools",
  },
  {
    label: "Assign Task",
    path: "/assign-task",
    section: "tools",
    roles: ["user"],
    hidden: false,
  },
  {
    label: "Assign Task",
    path: "/assign-task",
    section: "tools",
    roles: ["super_admin"],
    hidden: false,
  },
];

export default menuConfig;
