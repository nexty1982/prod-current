var x=(i,a,o)=>new Promise((r,c)=>{var p=e=>{try{n(o.next(e))}catch(d){c(d)}},l=e=>{try{n(o.throw(e))}catch(d){c(d)}},n=e=>e.done?r(e.value):Promise.resolve(e.value).then(p,l);n((o=o.apply(i,a)).next())});import{aK as b,l as S,j as t,B as s,C,$ as P,e as g,b8 as y,R as v,h as w,d as m,D as B}from"./index-CHjTtHW2.js";import{r as h}from"./vendor-DgfDxsY7.js";import{C as f}from"./Container-DQ6QG2MT.js";import{P as I}from"./Person-vrhfrW1o.js";import{C as R}from"./CalendarToday-Hf-8sf11.js";const M=()=>{const{slug:i,id:a}=b(),o=S(),[r,c]=h.useState(null),[p,l]=h.useState(!0),[n,e]=h.useState(null);return h.useEffect(()=>{x(void 0,null,function*(){l(!0);try{yield new Promise(j=>setTimeout(j,500));const u={id:a?parseInt(a):1,slug:i||`post-${a||1}`,title:"Getting Started with OrthodoxMetrics",content:`
            <p>Welcome to OrthodoxMetrics! This comprehensive guide will help you get started with managing your church records.</p>
            
            <h2>Setting Up Your Account</h2>
            <p>First, you'll need to create an account and set up your church profile. Navigate to the settings page and fill in your church information.</p>
            
            <h2>Adding Records</h2>
            <p>Once your account is set up, you can start adding records. Use the "Add Record" button to create new entries for baptisms, marriages, and other important events.</p>
            
            <h2>Using OCR</h2>
            <p>OrthodoxMetrics includes powerful OCR (Optical Character Recognition) technology that can help you digitize paper records. Simply upload scanned documents and let the system extract the information automatically.</p>
            
            <h2>Best Practices</h2>
            <ul>
              <li>Keep records organized by date</li>
              <li>Use consistent naming conventions</li>
              <li>Regularly back up your data</li>
              <li>Review records for accuracy</li>
            </ul>
            
            <p>For more information, please contact our support team or check out our other blog posts.</p>
          `,excerpt:"Learn how to set up your church on OrthodoxMetrics and start managing records.",author:"Admin",date:"2024-01-15",category:"Getting Started"};c(u),e(null)}catch(u){e("Failed to load blog post. Please try again later."),console.error("Error fetching blog post:",u)}finally{l(!1)}})},[i,a]),p?t.jsx(s,{sx:{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"400px"},children:t.jsx(C,{})}):n||!r?t.jsxs(f,{maxWidth:"md",sx:{py:8},children:[t.jsx(P,{severity:"error",sx:{mb:2},children:n||"Blog post not found"}),t.jsx(g,{startIcon:t.jsx(y,{}),onClick:()=>o(-1),children:"Go Back"})]}):t.jsx(s,{sx:{py:8},children:t.jsxs(f,{maxWidth:"md",children:[t.jsx(g,{startIcon:t.jsx(y,{}),onClick:()=>o(-1),sx:{mb:4},children:"Back to Blog"}),t.jsxs(v,{sx:{p:4},children:[t.jsxs(s,{sx:{mb:3},children:[t.jsx(w,{label:r.category,size:"small",color:"primary",sx:{mb:2}}),t.jsx(m,{variant:"h3",gutterBottom:!0,children:r.title}),t.jsxs(s,{sx:{display:"flex",alignItems:"center",gap:2,mb:3,flexWrap:"wrap"},children:[t.jsxs(s,{sx:{display:"flex",alignItems:"center",gap:.5},children:[t.jsx(I,{fontSize:"small",color:"action"}),t.jsx(m,{variant:"body2",color:"text.secondary",children:r.author})]}),t.jsxs(s,{sx:{display:"flex",alignItems:"center",gap:.5},children:[t.jsx(R,{fontSize:"small",color:"action"}),t.jsx(m,{variant:"body2",color:"text.secondary",children:new Date(r.date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})})]})]}),t.jsx(B,{sx:{mb:3}})]}),t.jsx(s,{sx:{"& h2":{mt:4,mb:2,fontSize:"1.75rem",fontWeight:600},"& h3":{mt:3,mb:1.5,fontSize:"1.5rem",fontWeight:600},"& p":{mb:2,lineHeight:1.8},"& ul, & ol":{mb:2,pl:3},"& li":{mb:1,lineHeight:1.8}},dangerouslySetInnerHTML:{__html:r.content}})]})]})})};export{M as default};
//# sourceMappingURL=BlogPost-DNtr9OoB.js.map
