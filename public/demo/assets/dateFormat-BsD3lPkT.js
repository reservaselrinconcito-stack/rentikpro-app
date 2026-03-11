const n=r=>{if(!r)return"";const t=r.split("-");if(t.length!==3)return r;const[a,e,o]=t;return`${o}/${e}/${a}`},s=(r,t)=>!r&&!t?"":`${n(r)} → ${n(t)}`;export{s as a,n as f};
