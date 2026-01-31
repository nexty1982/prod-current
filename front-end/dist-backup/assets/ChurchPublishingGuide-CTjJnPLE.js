import{m as j,j as e,B as n,S as i,d as t,e as f,D as m,U as s,V as l,R as h,p as d,a0 as b}from"./index-Dgvcv9SG.js";import{D}from"./Download-BCSjqcF1.js";import{C as p}from"./CheckCircle-s3MrOaSs.js";import{L as r}from"./ListItem-mECUil91.js";import{L as a}from"./ListItemText-HVc0yZD9.js";import"./vendor-Dkfty7_r.js";import"./listItemButtonClasses-BdhSRkE2.js";const F=()=>{const c=j(),x=()=>{const g=M(),y=new Blob([g],{type:"text/markdown"}),u=URL.createObjectURL(y),o=document.createElement("a");o.href=u,o.download="orthodoxmetrics-publishing-guide.md",document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(u)};return e.jsx(n,{sx:{p:3,maxWidth:1200,mx:"auto"},children:e.jsxs(i,{spacing:3,children:[e.jsxs(n,{children:[e.jsx(t,{variant:"h4",component:"h1",gutterBottom:!0,sx:{fontWeight:600},children:"Publishing Announcements for OrthodoxMetrics Import"}),e.jsx(t,{variant:"body1",color:"text.secondary",children:"This guide explains how to format your church announcements so they can be automatically imported into OrthodoxMetrics."}),e.jsx(f,{variant:"outlined",startIcon:e.jsx(D,{}),onClick:x,sx:{mt:2},children:"Download Guide (Markdown)"})]}),e.jsx(m,{}),e.jsxs(s,{sx:{p:3},children:[e.jsx(t,{variant:"h5",component:"h2",gutterBottom:!0,sx:{fontWeight:600},children:"Supported Formats"}),e.jsxs(i,{spacing:2,sx:{mt:2},children:[e.jsx(l,{variant:"outlined",children:e.jsxs(h,{children:[e.jsxs(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600,color:"success.main"},children:[e.jsx(p,{sx:{verticalAlign:"middle",mr:1}}),"Preferred: RSS/JSON Feed"]}),e.jsx(t,{variant:"body2",color:"text.secondary",sx:{mt:1},children:"Structured data feeds with stable fields. Best for automated parsing and updates."})]})}),e.jsx(l,{variant:"outlined",children:e.jsxs(h,{children:[e.jsxs(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600,color:"info.main"},children:[e.jsx(p,{sx:{verticalAlign:"middle",mr:1}}),"Acceptable: Standardized HTML Blocks"]}),e.jsx(t,{variant:"body2",color:"text.secondary",sx:{mt:1},children:"HTML elements with required selectors and data attributes. Good for existing websites."})]})}),e.jsx(l,{variant:"outlined",children:e.jsxs(h,{children:[e.jsxs(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600,color:"warning.main"},children:[e.jsx(p,{sx:{verticalAlign:"middle",mr:1}}),"Minimum: Plain Text Template"]}),e.jsx(t,{variant:"body2",color:"text.secondary",sx:{mt:1},children:"Strict plain-text format. Requires exact formatting but works with any system."})]})})]})]}),e.jsxs(s,{sx:{p:3},children:[e.jsx(t,{variant:"h5",component:"h2",gutterBottom:!0,sx:{fontWeight:600},children:"Required Fields by Record Type"}),e.jsxs(i,{spacing:3,sx:{mt:2},children:[e.jsxs(n,{children:[e.jsx(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600},children:"Baptism Records"}),e.jsxs(d,{dense:!0,children:[e.jsx(r,{children:e.jsx(a,{primary:"type",secondary:"Must be 'baptism' or 'Baptism'"})}),e.jsx(r,{children:e.jsx(a,{primary:"date",secondary:"Date of baptism/reception (YYYY-MM-DD or MM/DD/YYYY)"})}),e.jsx(r,{children:e.jsx(a,{primary:"person name",secondary:"First name and last name (or full name)"})})]})]}),e.jsx(m,{}),e.jsxs(n,{children:[e.jsx(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600},children:"Marriage Records"}),e.jsxs(d,{dense:!0,children:[e.jsx(r,{children:e.jsx(a,{primary:"type",secondary:"Must be 'marriage' or 'Marriage'"})}),e.jsx(r,{children:e.jsx(a,{primary:"date",secondary:"Date of marriage (YYYY-MM-DD or MM/DD/YYYY)"})}),e.jsx(r,{children:e.jsx(a,{primary:"groom name",secondary:"Groom's first and last name"})}),e.jsx(r,{children:e.jsx(a,{primary:"bride name",secondary:"Bride's first and last name"})})]})]}),e.jsx(m,{}),e.jsxs(n,{children:[e.jsx(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600},children:"Funeral Records"}),e.jsxs(d,{dense:!0,children:[e.jsx(r,{children:e.jsx(a,{primary:"type",secondary:"Must be 'funeral' or 'Funeral'"})}),e.jsx(r,{children:e.jsx(a,{primary:"death/burial date",secondary:"At least one date required (death date OR burial date)"})}),e.jsx(r,{children:e.jsx(a,{primary:"deceased name",secondary:"First and last name of the deceased"})})]})]})]})]}),e.jsxs(s,{sx:{p:3},children:[e.jsx(t,{variant:"h5",component:"h2",gutterBottom:!0,sx:{fontWeight:600},children:"Format Examples"}),e.jsxs(i,{spacing:3,sx:{mt:2},children:[e.jsxs(n,{children:[e.jsx(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600},children:"JSON Feed Format"}),e.jsx(s,{variant:"outlined",sx:{p:2,bgcolor:c.palette.mode==="dark"?"grey.900":"grey.50",fontFamily:"monospace",fontSize:"0.875rem",overflow:"auto"},children:e.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap"},children:`{
  "items": [
    {
      "event_id": "baptism-2025-001",
      "type": "baptism",
      "date": "2025-01-15",
      "first_name": "John",
      "last_name": "Doe",
      "birth_date": "2024-12-01",
      "sponsors": "Jane Smith, Bob Johnson",
      "parents": "John Doe Sr., Mary Doe"
    },
    {
      "event_id": "marriage-2025-002",
      "type": "marriage",
      "date": "2025-02-20",
      "groom_first_name": "Michael",
      "groom_last_name": "Brown",
      "bride_first_name": "Sarah",
      "bride_last_name": "Williams"
    }
  ]
}`})})]}),e.jsxs(n,{children:[e.jsx(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600},children:"HTML Format with Data Attributes"}),e.jsx(s,{variant:"outlined",sx:{p:2,bgcolor:c.palette.mode==="dark"?"grey.900":"grey.50",fontFamily:"monospace",fontSize:"0.875rem",overflow:"auto"},children:e.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap"},children:`<article class="om-announcement" 
         data-type="baptism" 
         data-date="2025-01-15"
         data-event-id="baptism-2025-001">
  <h3>Baptism</h3>
  <p><strong>Date:</strong> January 15, 2025</p>
  <p><strong>Name:</strong> John Doe</p>
  <p><strong>Birth Date:</strong> December 1, 2024</p>
  <p><strong>Sponsors:</strong> Jane Smith, Bob Johnson</p>
  <p><strong>Parents:</strong> John Doe Sr., Mary Doe</p>
</article>`})})]}),e.jsxs(n,{children:[e.jsx(t,{variant:"h6",gutterBottom:!0,sx:{fontWeight:600},children:"Plain Text Template Format"}),e.jsx(s,{variant:"outlined",sx:{p:2,bgcolor:c.palette.mode==="dark"?"grey.900":"grey.50",fontFamily:"monospace",fontSize:"0.875rem",overflow:"auto"},children:e.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap"},children:`TYPE: baptism
DATE: 2025-01-15
FIRST_NAME: John
LAST_NAME: Doe
BIRTH_DATE: 2024-12-01
SPONSORS: Jane Smith, Bob Johnson
PARENTS: John Doe Sr., Mary Doe

---`})})]})]})]}),e.jsxs(s,{sx:{p:3},children:[e.jsx(t,{variant:"h5",component:"h2",gutterBottom:!0,sx:{fontWeight:600},children:"Corrections and Updates"}),e.jsx(b,{severity:"info",sx:{mt:2},children:e.jsxs(t,{variant:"body2",component:"div",children:[e.jsx("strong",{children:"Recommended:"})," Include a stable ",e.jsx("code",{children:"event_id"})," field in your announcements. This allows OrthodoxMetrics to:",e.jsxs("ul",{style:{marginTop:8,marginBottom:0},children:[e.jsx("li",{children:"Detect and update existing records when corrections are made"}),e.jsx("li",{children:"Prevent duplicate imports of the same event"}),e.jsx("li",{children:"Track changes over time"})]})]})}),e.jsxs(t,{variant:"body2",color:"text.secondary",sx:{mt:2},children:["When you need to correct an announcement, republish it with the same ",e.jsx("code",{children:"event_id"})," but updated information. OrthodoxMetrics will automatically update the existing record instead of creating a duplicate."]})]}),e.jsxs(s,{sx:{p:3},children:[e.jsx(t,{variant:"h5",component:"h2",gutterBottom:!0,sx:{fontWeight:600},children:"Best Practices"}),e.jsxs(d,{children:[e.jsx(r,{children:e.jsx(a,{primary:"Use consistent date formats",secondary:"YYYY-MM-DD is preferred, but MM/DD/YYYY is also accepted"})}),e.jsx(r,{children:e.jsx(a,{primary:"Include full names",secondary:"First and last names should be clearly separated"})}),e.jsx(r,{children:e.jsx(a,{primary:"Publish announcements promptly",secondary:"Import runs on a schedule; publish within 24 hours of the event for best results"})}),e.jsx(r,{children:e.jsx(a,{primary:"Test your format",secondary:"Use the validation feature in the admin panel to verify your format works correctly"})})]})]})]})})};function M(){return`# Publishing Announcements for OrthodoxMetrics Import

This guide explains how to format your church announcements so they can be automatically imported into OrthodoxMetrics.

## Supported Formats

### Preferred: RSS/JSON Feed
Structured data feeds with stable fields. Best for automated parsing and updates.

### Acceptable: Standardized HTML Blocks
HTML elements with required selectors and data attributes. Good for existing websites.

### Minimum: Plain Text Template
Strict plain-text format. Requires exact formatting but works with any system.

## Required Fields by Record Type

### Baptism Records
- **type**: Must be 'baptism' or 'Baptism'
- **date**: Date of baptism/reception (YYYY-MM-DD or MM/DD/YYYY)
- **person name**: First name and last name (or full name)

### Marriage Records
- **type**: Must be 'marriage' or 'Marriage'
- **date**: Date of marriage (YYYY-MM-DD or MM/DD/YYYY)
- **groom name**: Groom's first and last name
- **bride name**: Bride's first and last name

### Funeral Records
- **type**: Must be 'funeral' or 'Funeral'
- **death/burial date**: At least one date required (death date OR burial date)
- **deceased name**: First and last name of the deceased

## Format Examples

### JSON Feed Format

\`\`\`json
{
  "items": [
    {
      "event_id": "baptism-2025-001",
      "type": "baptism",
      "date": "2025-01-15",
      "first_name": "John",
      "last_name": "Doe",
      "birth_date": "2024-12-01",
      "sponsors": "Jane Smith, Bob Johnson",
      "parents": "John Doe Sr., Mary Doe"
    },
    {
      "event_id": "marriage-2025-002",
      "type": "marriage",
      "date": "2025-02-20",
      "groom_first_name": "Michael",
      "groom_last_name": "Brown",
      "bride_first_name": "Sarah",
      "bride_last_name": "Williams"
    }
  ]
}
\`\`\`

### HTML Format with Data Attributes

\`\`\`html
<article class="om-announcement" 
         data-type="baptism" 
         data-date="2025-01-15"
         data-event-id="baptism-2025-001">
  <h3>Baptism</h3>
  <p><strong>Date:</strong> January 15, 2025</p>
  <p><strong>Name:</strong> John Doe</p>
  <p><strong>Birth Date:</strong> December 1, 2024</p>
  <p><strong>Sponsors:</strong> Jane Smith, Bob Johnson</p>
  <p><strong>Parents:</strong> John Doe Sr., Mary Doe</p>
</article>
\`\`\`

### Plain Text Template Format

\`\`\`
TYPE: baptism
DATE: 2025-01-15
FIRST_NAME: John
LAST_NAME: Doe
BIRTH_DATE: 2024-12-01
SPONSORS: Jane Smith, Bob Johnson
PARENTS: John Doe Sr., Mary Doe

---
\`\`\`

## Corrections and Updates

**Recommended:** Include a stable \`event_id\` field in your announcements. This allows OrthodoxMetrics to:
- Detect and update existing records when corrections are made
- Prevent duplicate imports of the same event
- Track changes over time

When you need to correct an announcement, republish it with the same \`event_id\` but updated information. OrthodoxMetrics will automatically update the existing record instead of creating a duplicate.

## Best Practices

1. **Use consistent date formats**: YYYY-MM-DD is preferred, but MM/DD/YYYY is also accepted
2. **Include full names**: First and last names should be clearly separated
3. **Publish announcements promptly**: Import runs on a schedule; publish within 24 hours of the event for best results
4. **Test your format**: Use the validation feature in the admin panel to verify your format works correctly

## Support

For questions or assistance, contact your OrthodoxMetrics administrator or refer to the admin documentation.
`}export{F as default};
//# sourceMappingURL=ChurchPublishingGuide-CTjJnPLE.js.map
