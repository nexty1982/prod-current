var $=Object.defineProperty,M=Object.defineProperties;var U=Object.getOwnPropertyDescriptors;var o=Object.getOwnPropertySymbols;var y=Object.prototype.hasOwnProperty,v=Object.prototype.propertyIsEnumerable;var g=(t,e,a)=>e in t?$(t,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):t[e]=a,r=(t,e)=>{for(var a in e||(e={}))y.call(e,a)&&g(t,a,e[a]);if(o)for(var a of o(e))v.call(e,a)&&g(t,a,e[a]);return t},p=(t,e)=>M(t,U(e));var b=(t,e)=>{var a={};for(var n in t)y.call(t,n)&&e.indexOf(n)<0&&(a[n]=t[n]);if(t!=null&&o)for(var n of o(t))e.indexOf(n)<0&&v.call(t,n)&&(a[n]=t[n]);return a};import{r as A}from"./vendor-Dkfty7_r.js";import{aM as X,aN as j,a3 as N,j as B,X as E,aO as K,v as O,bd as T,aQ as C,bH as k}from"./index-Dgvcv9SG.js";function W(t){return String(t).match(/[\d.\-+]*\s*(.*)/)[1]||""}function D(t){return parseFloat(t)}function F(t){return X("MuiSkeleton",t)}j("MuiSkeleton",["root","text","rectangular","rounded","circular","pulse","wave","withChildren","fitContent","heightAuto"]);const H=t=>{const{classes:e,variant:a,animation:n,hasChildren:s,width:l,height:i}=t;return K({root:["root",a,n,s&&"withChildren",s&&!l&&"fitContent",s&&!i&&"heightAuto"]},F,e)},d=C`
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }

  100% {
    opacity: 1;
  }
`,h=C`
  0% {
    transform: translateX(-100%);
  }

  50% {
    /* +0.5s of delay between each loop */
    transform: translateX(100%);
  }

  100% {
    transform: translateX(100%);
  }
`,I=typeof d!="string"?k`
        animation: ${d} 2s ease-in-out 0.5s infinite;
      `:null,P=typeof h!="string"?k`
        &::after {
          animation: ${h} 2s linear 0.5s infinite;
        }
      `:null,Q=O("span",{name:"MuiSkeleton",slot:"Root",overridesResolver:(t,e)=>{const{ownerState:a}=t;return[e.root,e[a.variant],a.animation!==!1&&e[a.animation],a.hasChildren&&e.withChildren,a.hasChildren&&!a.width&&e.fitContent,a.hasChildren&&!a.height&&e.heightAuto]}})(T(({theme:t})=>{const e=W(t.shape.borderRadius)||"px",a=D(t.shape.borderRadius);return{display:"block",backgroundColor:t.vars?t.vars.palette.Skeleton.bg:t.alpha(t.palette.text.primary,t.palette.mode==="light"?.11:.13),height:"1.2em",variants:[{props:{variant:"text"},style:{marginTop:0,marginBottom:0,height:"auto",transformOrigin:"0 55%",transform:"scale(1, 0.60)",borderRadius:`${a}${e}/${Math.round(a/.6*10)/10}${e}`,"&:empty:before":{content:'"\\00a0"'}}},{props:{variant:"circular"},style:{borderRadius:"50%"}},{props:{variant:"rounded"},style:{borderRadius:(t.vars||t).shape.borderRadius}},{props:({ownerState:n})=>n.hasChildren,style:{"& > *":{visibility:"hidden"}}},{props:({ownerState:n})=>n.hasChildren&&!n.width,style:{maxWidth:"fit-content"}},{props:({ownerState:n})=>n.hasChildren&&!n.height,style:{height:"auto"}},{props:{animation:"pulse"},style:I||{animation:`${d} 2s ease-in-out 0.5s infinite`}},{props:{animation:"wave"},style:{position:"relative",overflow:"hidden",WebkitMaskImage:"-webkit-radial-gradient(white, black)","&::after":{background:`linear-gradient(
                90deg,
                transparent,
                ${(t.vars||t).palette.action.hover},
                transparent
              )`,content:'""',position:"absolute",transform:"translateX(-100%)",bottom:0,left:0,right:0,top:0}}},{props:{animation:"wave"},style:P||{"&::after":{animation:`${h} 2s linear 0.5s infinite`}}}]}})),G=A.forwardRef(function(e,a){const n=N({props:e,name:"MuiSkeleton"}),f=n,{animation:s="pulse",className:l,component:i="span",height:u,style:w,variant:x="text",width:R}=f,c=b(f,["animation","className","component","height","style","variant","width"]),m=p(r({},n),{animation:s,component:i,variant:x,hasChildren:!!c.children}),S=H(m);return B.jsx(Q,p(r({as:i,ref:a,className:E(S.root,l),ownerState:m},c),{style:r({width:R,height:u},w)}))});export{G as S};
//# sourceMappingURL=Skeleton-C91jGsJ5.js.map
