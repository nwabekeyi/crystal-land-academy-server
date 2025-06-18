import{g as ne,a as ie,u as le,_ as ce,b as T,ao as ue,s as $,d as de,h as p,e as fe,am as k,an as N,as as me,ar as pe}from"./TextField-Dq8tnGPq.js";import{r as u,j as D,a as w,e as I,Z as be,$ as ge}from"./index-CWYHbWdA.js";import{u as M}from"./useApi-BXbrCWjd.js";import{u as Se}from"./MenuItem-bOm2_mFj.js";function Ee(e){return ne("MuiLinearProgress",e)}ie("MuiLinearProgress",["root","colorPrimary","colorSecondary","determinate","indeterminate","buffer","query","dashed","dashedColorPrimary","dashedColorSecondary","bar","barColorPrimary","barColorSecondary","bar1Indeterminate","bar1Determinate","bar1Buffer","bar2Indeterminate","bar2Buffer"]);const Te=["className","color","value","valueBuffer","variant"];let h=e=>e,Y,F,G,K,W,Z;const B=4,he=N(Y||(Y=h`
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
`)),Ce=N(F||(F=h`
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
`)),_e=N(G||(G=h`
  0% {
    opacity: 1;
    background-position: 0 -23px;
  }

  60% {
    opacity: 0;
    background-position: 0 -23px;
  }

  100% {
    opacity: 1;
    background-position: -200px -23px;
  }
`)),ve=e=>{const{classes:r,variant:t,color:c}=e,C={root:["root",`color${p(c)}`,t],dashed:["dashed",`dashedColor${p(c)}`],bar1:["bar",`barColor${p(c)}`,(t==="indeterminate"||t==="query")&&"bar1Indeterminate",t==="determinate"&&"bar1Determinate",t==="buffer"&&"bar1Buffer"],bar2:["bar",t!=="buffer"&&`barColor${p(c)}`,t==="buffer"&&`color${p(c)}`,(t==="indeterminate"||t==="query")&&"bar2Indeterminate",t==="buffer"&&"bar2Buffer"]};return fe(C,Ee,r)},O=(e,r)=>r==="inherit"?"currentColor":e.vars?e.vars.palette.LinearProgress[`${r}Bg`]:e.palette.mode==="light"?me(e.palette[r].main,.62):pe(e.palette[r].main,.5),ye=$("span",{name:"MuiLinearProgress",slot:"Root",overridesResolver:(e,r)=>{const{ownerState:t}=e;return[r.root,r[`color${p(t.color)}`],r[t.variant]]}})(({ownerState:e,theme:r})=>T({position:"relative",overflow:"hidden",display:"block",height:4,zIndex:0,"@media print":{colorAdjust:"exact"},backgroundColor:O(r,e.color)},e.color==="inherit"&&e.variant!=="buffer"&&{backgroundColor:"none","&::before":{content:'""',position:"absolute",left:0,top:0,right:0,bottom:0,backgroundColor:"currentColor",opacity:.3}},e.variant==="buffer"&&{backgroundColor:"transparent"},e.variant==="query"&&{transform:"rotate(180deg)"})),Le=$("span",{name:"MuiLinearProgress",slot:"Dashed",overridesResolver:(e,r)=>{const{ownerState:t}=e;return[r.dashed,r[`dashedColor${p(t.color)}`]]}})(({ownerState:e,theme:r})=>{const t=O(r,e.color);return T({position:"absolute",marginTop:0,height:"100%",width:"100%"},e.color==="inherit"&&{opacity:.3},{backgroundImage:`radial-gradient(${t} 0%, ${t} 16%, transparent 42%)`,backgroundSize:"10px 10px",backgroundPosition:"0 -23px"})},k(K||(K=h`
    animation: ${0} 3s infinite linear;
  `),_e)),De=$("span",{name:"MuiLinearProgress",slot:"Bar1",overridesResolver:(e,r)=>{const{ownerState:t}=e;return[r.bar,r[`barColor${p(t.color)}`],(t.variant==="indeterminate"||t.variant==="query")&&r.bar1Indeterminate,t.variant==="determinate"&&r.bar1Determinate,t.variant==="buffer"&&r.bar1Buffer]}})(({ownerState:e,theme:r})=>T({width:"100%",position:"absolute",left:0,bottom:0,top:0,transition:"transform 0.2s linear",transformOrigin:"left",backgroundColor:e.color==="inherit"?"currentColor":(r.vars||r).palette[e.color].main},e.variant==="determinate"&&{transition:`transform .${B}s linear`},e.variant==="buffer"&&{zIndex:1,transition:`transform .${B}s linear`}),({ownerState:e})=>(e.variant==="indeterminate"||e.variant==="query")&&k(W||(W=h`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    `),he)),$e=$("span",{name:"MuiLinearProgress",slot:"Bar2",overridesResolver:(e,r)=>{const{ownerState:t}=e;return[r.bar,r[`barColor${p(t.color)}`],(t.variant==="indeterminate"||t.variant==="query")&&r.bar2Indeterminate,t.variant==="buffer"&&r.bar2Buffer]}})(({ownerState:e,theme:r})=>T({width:"100%",position:"absolute",left:0,bottom:0,top:0,transition:"transform 0.2s linear",transformOrigin:"left"},e.variant!=="buffer"&&{backgroundColor:e.color==="inherit"?"currentColor":(r.vars||r).palette[e.color].main},e.color==="inherit"&&{opacity:.3},e.variant==="buffer"&&{backgroundColor:O(r,e.color),transition:`transform .${B}s linear`}),({ownerState:e})=>(e.variant==="indeterminate"||e.variant==="query")&&k(Z||(Z=h`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite;
    `),Ce)),Be=u.forwardRef(function(r,t){const c=le({props:r,name:"MuiLinearProgress"}),{className:C,color:P="primary",value:_,valueBuffer:v,variant:s="indeterminate"}=c,E=ce(c,Te),a=T({},c,{color:P,variant:s}),g=ve(a),y=ue(),b={},S={bar1:{},bar2:{}};if((s==="determinate"||s==="buffer")&&_!==void 0){b["aria-valuenow"]=Math.round(_),b["aria-valuemin"]=0,b["aria-valuemax"]=100;let f=_-100;y&&(f=-f),S.bar1.transform=`translateX(${f}%)`}if(s==="buffer"&&v!==void 0){let f=(v||0)-100;y&&(f=-f),S.bar2.transform=`translateX(${f}%)`}return D.jsxs(ye,T({className:de(g.root,C),ownerState:a,role:"progressbar"},b,{ref:t},E,{children:[s==="buffer"?D.jsx(Le,{className:g.dashed,ownerState:a}):null,D.jsx(De,{className:g.bar1,ownerState:a,style:S.bar1}),s==="determinate"?null:D.jsx($e,{className:g.bar2,ownerState:a,style:S.bar2})]}))}),d={SET_COURSES:"SET_COURSES",SET_PAST_TIMETABLES:"SET_PAST_TIMETABLES",SET_NEXT_CLASS:"SET_NEXT_CLASS",SET_MISSED_CLASSES:"SET_MISSED_CLASSES",SET_ALL_RESOURCES:"SET_ALL_RESOURCES"},Pe={courses:[],timePastTimetables:[],nextClass:null,missedClasses:[],allResources:[]},Re=(e,r)=>{switch(r.type){case d.SET_COURSES:return{...e,courses:r.payload};case d.SET_PAST_TIMETABLES:return{...e,timePastTimetables:r.payload};case d.SET_NEXT_CLASS:return{...e,nextClass:r.payload};case d.SET_MISSED_CLASSES:return{...e,missedClasses:r.payload};case d.SET_ALL_RESOURCES:return{...e,allResources:r.payload};default:return e}},ke=()=>{const[e,r]=u.useReducer(Re,Pe),{courses:t,timePastTimetables:c,nextClass:C,missedClasses:P,allResources:_}=e,v=w(n=>n.student.timetable),s=w(n=>n.users.user),E=Se(),{data:a,callApi:g,loading:y}=M(),{data:b,callApi:S,loading:f}=M(),{data:R,callApi:U}=M();u.useEffect(()=>{s&&s.cohort&&g(`${I.TIMETABLE}/${s.cohort}`,"GET")},[s,g]),u.useEffect(()=>{s&&s.cohort&&U(`${I.ASSIGNMENT}/${s.cohort}`,"GET")},[s,U]),u.useEffect(()=>{a&&a.length>0&&E(be(a))},[a,E]),u.useEffect(()=>{R&&E(ge(R))},[R,E]),u.useEffect(()=>{S(`${I.COURSES}`,"GET")},[S]),u.useEffect(()=>{b&&r({type:d.SET_COURSES,payload:b.courses})},[b]),u.useEffect(()=>{if(a&&a.length>0){const n=new Date,o=a.filter(l=>new Date(`${l.date}T${l.time}`)<n);r({type:d.SET_PAST_TIMETABLES,payload:o})}},[a]);const j=n=>{const o=new Date(n),l=String(o.getDate()).padStart(2,"0"),m=String(o.getMonth()+1).padStart(2,"0"),L=o.getFullYear();return`${l}/${m}/${L}`};u.useEffect(()=>{if(a&&a.length>0){const n=new Date;let o=null;if(a.forEach(l=>{const m=new Date(`${l.date.split("T")[0]}T${l.time}`);m>n&&(!o||m<new Date(`${o.date.split("T")[0]}T${o.time}`))&&(o=l)}),o){const l={...o,formattedDate:j(o.date)};r({type:d.SET_NEXT_CLASS,payload:l})}}},[a]);const{completedCourses:H,remainingCourses:J,progressPercentage:Q,attendanceRate:V,outstandings:ee}=u.useMemo(()=>{const n=[],o=[],l=[];let m=[];v.forEach(i=>{i.done&&i.attendance.includes(s.userId)?n.push(i):i.done?l.push(i):o.push(i)}),r({type:d.SET_MISSED_CLASSES,payload:l}),t.forEach(i=>{i.curriculum&&i.curriculum.length>0&&i.curriculum.forEach(x=>{m=[...m,...x.resources]})}),r({type:d.SET_ALL_RESOURCES,payload:m});const L=n.length+o.length,re=L>0?n.length/L*100:0,te=a&&a.filter(i=>i.attendance.includes(s.userId)).length,q=a&&a.length,ae=q>0?te/q*100:0,z=s.amountPaid||0,A=t.reduce((i,x)=>{const oe=parseInt(x.cost,10)||0;return i+oe},0),X=A-z,se=A>0?X/A*100:0;return{completedCourses:n,remainingCourses:o,progressPercentage:re,attendanceRate:ae,outstandings:{totalOutstanding:X,percentageDifference:se,amountPaid:z}}},[t,c,s]);return{completedCourses:H,remainingCourses:J,progressPercentage:Q,timePastTimetables:c,nextClass:C,attendanceRate:V,outstandings:ee,studentData:s,missedClasses:P,allResources:_,loading:y||f,formatDateToDDMMYYYY:j}};export{Be as L,ke as u};
