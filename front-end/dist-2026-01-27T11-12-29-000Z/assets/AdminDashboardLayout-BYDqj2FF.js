import{j as e,B as o,m as g,k as l,df as i,d as s}from"./index-CHjTtHW2.js";import{r as d}from"./vendor-DgfDxsY7.js";const p=d.createContext(void 0),u=()=>{const r=d.useContext(p);if(!r)throw new Error("useTheme must be used within a ThemeProvider");return r},m=({children:r,className:a=""})=>{const{themeConfig:t}=u();return e.jsx(o,{className:`${t.cssClass} ${a}`.trim(),sx:{minHeight:"100vh",backgroundColor:"var(--color-background)",color:"var(--color-text-primary)",transition:"all 0.3s ease"},children:r})},f=({children:r,requireSuperAdmin:a=!1})=>{const t=g(),{user:h,hasRole:n,authenticated:c}=l();return c?a&&!n("super_admin")?e.jsx(i,{to:"/unauthorized",replace:!0}):!n("admin")&&!n("super_admin")?e.jsx(i,{to:"/unauthorized",replace:!0}):e.jsx(m,{children:e.jsx(o,{sx:{minHeight:"100vh",background:t.palette.mode==="dark"?"linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.95) 100%)":"linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.95) 100%)",backgroundAttachment:"fixed",position:"relative","&::before":{content:'""',position:"fixed",top:0,left:0,right:0,bottom:0,background:t.palette.mode==="dark"?`
                radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 60% 40%, rgba(34, 197, 94, 0.08) 0%, transparent 50%)
              `:`
                radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.06) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(34, 197, 94, 0.06) 0%, transparent 50%),
                radial-gradient(circle at 60% 40%, rgba(168, 85, 247, 0.04) 0%, transparent 50%)
              `,pointerEvents:"none",zIndex:-1},"&::after":{content:'""',position:"fixed",top:0,left:0,right:0,bottom:0,background:t.palette.mode==="dark"?`
                linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%),
                linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)
              `:`
                linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.02) 50%, transparent 100%),
                linear-gradient(0deg, transparent 0%, rgba(0,0,0,0.02) 50%, transparent 100%)
              `,pointerEvents:"none",zIndex:-1}},children:r||e.jsxs(o,{sx:{p:4,textAlign:"center"},children:[e.jsx(s,{variant:"h4",sx:{mb:2},children:"Admin Dashboard"}),e.jsx(s,{variant:"body1",color:"text.secondary",children:"Select an option from the menu to get started."})]})})}):e.jsx(i,{to:"/frontend-pages/homepage",replace:!0})};export{f as AdminDashboardLayout,f as default};
//# sourceMappingURL=AdminDashboardLayout-BYDqj2FF.js.map
