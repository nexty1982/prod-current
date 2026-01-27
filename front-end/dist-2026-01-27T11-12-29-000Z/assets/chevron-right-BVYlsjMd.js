var b=Object.defineProperty,x=Object.defineProperties;var y=Object.getOwnPropertyDescriptors;var i=Object.getOwnPropertySymbols;var d=Object.prototype.hasOwnProperty,C=Object.prototype.propertyIsEnumerable;var p=(e,t,r)=>t in e?b(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,n=(e,t)=>{for(var r in t||(t={}))d.call(t,r)&&p(e,r,t[r]);if(i)for(var r of i(t))C.call(t,r)&&p(e,r,t[r]);return e},w=(e,t)=>x(e,y(t));var u=(e,t)=>{var r={};for(var o in e)d.call(e,o)&&t.indexOf(o)<0&&(r[o]=e[o]);if(e!=null&&i)for(var o of i(e))t.indexOf(o)<0&&C.call(e,o)&&(r[o]=e[o]);return r};import{r as c}from"./vendor-DgfDxsY7.js";/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),E=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,r,o)=>o?o.toUpperCase():r.toLowerCase()),f=e=>{const t=E(e);return t.charAt(0).toUpperCase()+t.slice(1)},g=(...e)=>e.filter((t,r,o)=>!!t&&t.trim()!==""&&o.indexOf(t)===r).join(" ").trim(),$=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0};/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var R={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=c.forwardRef((I,A)=>{var m=I,{color:e="currentColor",size:t=24,strokeWidth:r=2,absoluteStrokeWidth:o,className:l="",children:a,iconNode:h}=m,s=u(m,["color","size","strokeWidth","absoluteStrokeWidth","className","children","iconNode"]);return c.createElement("svg",n(n(w(n({ref:A},R),{width:t,height:t,stroke:e,strokeWidth:o?Number(r)*24/Number(t):r,className:g("lucide",l)}),!a&&!$(s)&&{"aria-hidden":"true"}),s),[...h.map(([k,v])=>c.createElement(k,v)),...Array.isArray(a)?a:[a]])});/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=(e,t)=>{const r=c.forwardRef((h,a)=>{var s=h,{className:o}=s,l=u(s,["className"]);return c.createElement(_,n({ref:a,iconNode:t,className:g(`lucide-${L(f(e))}`,`lucide-${e}`,o)},l))});return r.displayName=f(e),r};/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],U=j("chevron-right",B);export{U as C,j as c};
//# sourceMappingURL=chevron-right-BVYlsjMd.js.map
