var x=Object.defineProperty,L=Object.defineProperties;var v=Object.getOwnPropertyDescriptors;var i=Object.getOwnPropertySymbols;var C=Object.prototype.hasOwnProperty,w=Object.prototype.propertyIsEnumerable;var d=(e,t,r)=>t in e?x(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,n=(e,t)=>{for(var r in t||(t={}))C.call(t,r)&&d(e,r,t[r]);if(i)for(var r of i(t))w.call(t,r)&&d(e,r,t[r]);return e},f=(e,t)=>L(e,v(t));var u=(e,t)=>{var r={};for(var o in e)C.call(e,o)&&t.indexOf(o)<0&&(r[o]=e[o]);if(e!=null&&i)for(var o of i(e))t.indexOf(o)<0&&w.call(e,o)&&(r[o]=e[o]);return r};import{r as c}from"./vendor-Dkfty7_r.js";/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),E=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,r,o)=>o?o.toUpperCase():r.toLowerCase()),h=e=>{const t=E(e);return t.charAt(0).toUpperCase()+t.slice(1)},g=(...e)=>e.filter((t,r,o)=>!!t&&t.trim()!==""&&o.indexOf(t)===r).join(" ").trim(),$=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0};/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var j={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=c.forwardRef((I,A)=>{var m=I,{color:e="currentColor",size:t=24,strokeWidth:r=2,absoluteStrokeWidth:o,className:l="",children:a,iconNode:p}=m,s=u(m,["color","size","strokeWidth","absoluteStrokeWidth","className","children","iconNode"]);return c.createElement("svg",n(n(f(n({ref:A},j),{width:t,height:t,stroke:e,strokeWidth:o?Number(r)*24/Number(t):r,className:g("lucide",l)}),!a&&!$(s)&&{"aria-hidden":"true"}),s),[...p.map(([b,k])=>c.createElement(b,k)),...Array.isArray(a)?a:[a]])});/**
 * @license lucide-react v0.534.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=(e,t)=>{const r=c.forwardRef((p,a)=>{var s=p,{className:o}=s,l=u(s,["className"]);return c.createElement(B,n({ref:a,iconNode:t,className:g(`lucide-${y(h(e))}`,`lucide-${e}`,o)},l))});return r.displayName=h(e),r};export{U as c};
//# sourceMappingURL=createLucideIcon-77RUDsVg.js.map
