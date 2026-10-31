/* Scientific panels for SCARLET. Measured/calculated evidence and analytic illustrations
   are labelled separately in each slide and its notes. No result is generated at random. */
const PALETTE={nu:'#ff8b4a',anti:'#f0b4aa',light:'#f7edf5',copper:'#d69b84',orange:'#ed5415',grey:'#a98e87'};
const MODEL_IDS=['GHE19_00b_00_000','SC26_00d_00_000','SC26_00e_00_000','SC26_00f_00_000','SC26_00c_00_000'];
const E_VALUES=RESULTS.energies;
const nf=(v,n=3)=>Number(v).toLocaleString(LANG==='pt'?'pt-BR':'en-US',{minimumFractionDigits:n,maximumFractionDigits:n});
const energy=k=>E_VALUES[k]>=1000?'1 PeV':E_VALUES[k]+' TeV';
const series=(m,p=0)=>RESULTS.models[MODEL_IDS[m]][p];
function legend(p,items){items.forEach(([s,c,dash],k)=>{const x=p.L+k*(p.R-p.L)/items.length,y=12;const cxt=p.ctx;cxt.save();cxt.strokeStyle=c;cxt.lineWidth=3;if(dash)cxt.setLineDash([7,5]);cxt.beginPath();cxt.moveTo(x,y);cxt.lineTo(x+27,y);cxt.stroke();cxt.restore();p.text(x+36,y,s,{px:true,color:COL.text2,size:20});});}
function panel(id,draw){const cv=document.getElementById(id);if(!cv)return;const redraw=onSlide(cv,()=>{draw(cv);requestAnimationFrame(()=>draw(cv));});return redraw;}
function bar(p,x0,x1,y,color){const c=p.ctx;c.fillStyle=color;const top=Math.min(p.Y(y),p.Y(0));c.fillRect(p.X(x0),top,p.X(x1)-p.X(x0),Math.max(1,Math.abs(p.Y(0)-p.Y(y))));}
function signed(v){return(v>=0?'+':'−')+nf(Math.abs(v));}
{
 const cv=document.getElementById('visible-energy');let go;
 const draw=()=>{const y=+document.getElementById('energy-y').value,k=+document.getElementById('energy-k').value;
 const p=new Plot(cv,{x:[0,1],y:[0,1],xticks:[0,.25,.5,.75,1],yticks:[],m:[70,30,90,80],fs:23}).begin().frame(T('Fração de Eν','Fraction of Eν'),'');
 const c=p.ctx;const left=p.X(0),right=p.X(1),yy=p.Y(.65),h=80;
 c.fillStyle=PALETTE.nu;c.fillRect(left,yy,(right-left)*k*y,h);c.fillStyle=PALETTE.anti;c.fillRect(left+(right-left)*k*y,yy,(right-left)*(1-y),h);
 p.text(.03,.9,T('Cascata visível','Visible cascade'),{color:PALETTE.nu,size:27});p.text(.58,.9,T('Múon','Muon'),{color:PALETTE.anti,size:27});
 p.text(0,.28,'Evis / Eν = '+nf(1-y+k*y),{size:30,color:PALETTE.light});p.text(0,.12,'yvis = '+nf(k*y/(1-y+k*y)),{size:30,color:PALETTE.light});
 document.getElementById('visible-energy-out').innerHTML=T('Exemplo sem resolução nem perda de contenção','Example without resolution or containment losses');};
 bindRange('energy-y',x=>nf(x,2),()=>go());bindRange('energy-k',x=>nf(x,2),()=>go());go=panel('visible-energy',draw);
}
{
 const cv=document.getElementById('helicity');let go;
 const draw=()=>{const r=+document.getElementById('helicity-r').value;const x=linspace(0,1,201),f=y=>3/(2+r)*(1-y+y*y/2+r*(y-y*y/2));
 const p=new Plot(cv,{x:[0,1],y:[0,3.1],fs:23,m:[55,30,90,85]}).begin().frame('y','p(y)');p.line(x,x.map(f),{color:PALETTE.nu,width:4});
 document.getElementById('helicity-out').innerHTML='⟨y⟩ <b>'+nf((7+5*r)/(16+8*r),4)+'</b> &nbsp; '+T('normalização analítica','analytic normalisation');};
 bindRange('helicity-r',x=>nf(x,2),()=>go());go=panel('helicity',draw);
}
{
 const cv=document.getElementById('mixture');let go;
 const draw=()=>{const k=+document.getElementById('mix-e').value,f=+document.getElementById('mix-f').value;
 const a=series(1,0)[k],b=series(1,1)[k],xs=a.hist.map((_,i)=>(i+.5)/100),aa=a.hist.map(v=>v*100),bb=b.hist.map(v=>v*100),mix=aa.map((v,i)=>(1-f)*v+f*bb[i]);
 const ymax=Math.ceil(Math.max(...aa,...bb)*1.12*2)/2;
 const p=new Plot(cv,{x:[0,1],y:[0,ymax],fs:22,m:[65,30,90,85]}).begin().frame('y','p(y)');legend(p,[['νμ',PALETTE.nu],['ν̄μ',PALETTE.anti,true],[T('Mistura','Mixture'),PALETTE.light]]);
 p.line(xs,aa,{color:PALETTE.nu,width:3});p.line(xs,bb,{color:PALETTE.anti,dash:[9,6],width:3});p.line(xs,mix,{color:PALETTE.light,width:4});
 document.getElementById('mixture-out').innerHTML=energy(k)+' &nbsp; Δ⟨y⟩ <b>'+nf(a.mean-b.mean)+'</b> &nbsp; ⟨y⟩mix <b>'+nf((1-f)*a.mean+f*b.mean)+'</b>';};
 bindRange('mix-e',energy,()=>go());bindRange('mix-f',x=>nf(x,2),()=>go());go=panel('mixture',draw);
}
panel('matching',cv=>{const xs=logspace(-4,0,300),ys=xs.map(x=>{let t=Math.max(0,Math.min(1,Math.log(x/.01)/Math.log(10)));return 1-t*t*(3-2*t);});const p=new Plot(cv,{x:[1e-4,1],xlog:true,y:[0,1.1],fs:22,m:[55,30,90,85]}).begin().frame('x','w(x)');p.line(xs,ys,{color:PALETTE.nu,width:4});p.vline(.01,{label:'x₁ = 0.01',color:PALETTE.anti});p.vline(.1,{label:'x₂ = 0.1',side:'left',color:PALETTE.copper});document.getElementById('matching-out').innerHTML=T('Peso do blend. As variantes de forma usam normalizações de borda.','Blend weight. Shape variants use edge normalisations.');});
{
 const cv=document.getElementById('kinematic-map');let go;
 const draw=()=>{const k=+document.getElementById('map-e').value,m=RESULTS.maps[k];const p=new Plot(cv,{x:[-6,0],y:[-2,6],fs:23,m:[50,35,88,95],xticks:[-6,-5,-4,-3,-2,-1,0],yticks:[-2,0,2,4,6]}).begin();
 const c=p.ctx;for(let i=16;i<40;i++)for(let j=4;j<36;j++){const v=m[i][j];if(v<1e-9)continue;const t=Math.max(0,Math.min(1,(Math.log10(v)+7)/5.5));const a=t<.65?[48,37,36]:[255,139,74],b=t<.65?[255,139,74]:[247,237,245],u=t<.65?t/.65:(t-.65)/.35;const rgb=a.map((v,l)=>Math.round(v+(b[l]-v)*u));c.fillStyle=`rgb(${rgb})`;c.fillRect(p.X(-10+i*.25),p.Y(-3+(j+1)*.25),p.X(-10+(i+1)*.25)-p.X(-10+i*.25)+.4,p.Y(-3+j*.25)-p.Y(-3+(j+1)*.25)+.4);}
 p.frame('log₁₀ x','log₁₀ [Q² / GeV²]');p.hline(Math.log10(80.385**2),{color:PALETTE.light,label:'MW²',width:2});
 const bx=p.L,bw=p.R-p.L;for(let z=0;z<100;z++){const t=z/99,a=t<.65?[48,37,36]:[255,139,74],b=t<.65?[255,139,74]:[247,237,245],u=t<.65?t/.65:(t-.65)/.35;c.fillStyle=`rgb(${a.map((v,l)=>Math.round(v+(b[l]-v)*u))})`;c.fillRect(bx+z*bw/100,7,bw/100+1,9);}[[-7,'10⁻⁷'],[-5,'10⁻⁵'],[-3,'10⁻³'],[-1.5,'10⁻¹·⁵']].forEach(([v,label])=>p.text(bx+(v+7)/5.5*bw,32,label,{px:true,size:18,align:v===-7?'left':v===-1.5?'right':'center'}));
 document.getElementById('kinematic-map-out').innerHTML=energy(k)+' &nbsp; '+T('Escala logarítmica do peso por célula','Logarithmic scale of cell weight');};
 bindRange('map-e',energy,()=>go());go=panel('kinematic-map',draw);
}
panel('mean-energy',cv=>{const p=new Plot(cv,{x:[1,1000],xlog:true,y:[.15,.65],fs:23,m:[55,30,90,90]}).begin().frame('Eν [TeV]','⟨y⟩');legend(p,[['Tier 1',PALETTE.nu],['NLO',PALETTE.anti],['Bodek–Yang',PALETTE.copper]]);[[1,PALETTE.nu],[0,PALETTE.anti],[4,PALETTE.copper]].forEach(([m,col])=>{for(let probe=0;probe<2;probe++){const a=series(m,probe);p.line(E_VALUES,a.map(d=>d.mean),{color:col,width:3,dash:probe?[8,5]:null});a.forEach(d=>p.dot(d.E,d.mean,{color:col,r:4,glow:0}));}});document.getElementById('mean-energy-out').innerHTML=T('Contínuo: νμ. Tracejado: ν̄μ. Água, configuração nominal.','Solid: νμ. Dashed: ν̄μ. Water, nominal configuration.');});
const BIASES={tier:[.026,.026,.013,.018,.065,.168,.438],dip:[.012,.018,.030,.054,.095,.125,.097],family:[.035,.040,.037,.054,.095,.168,.438]};
panel('bias-energy',cv=>{const p=new Plot(cv,{x:[1,1000],xlog:true,y:[0,.5],fs:23,m:[60,30,90,95]}).begin().frame('Eν [TeV]','max |δf|');legend(p,[['Tier 1–NLO',PALETTE.nu],[T('Dipolos','Dipoles'),PALETTE.copper],[T('Família','Family'),PALETTE.anti,true]]);[['tier',PALETTE.nu,null],['dip',PALETTE.copper,null],['family',PALETTE.anti,[8,5]]].forEach(([name,col,dash])=>{p.line(E_VALUES,BIASES[name],{color:col,dash,width:3});E_VALUES.forEach((e,k)=>p.dot(e,BIASES[name][k],{color:col,r:4,glow:0}));});p.hline(.03,{label:T('Critério 0,03','Criterion 0.03'),color:PALETTE.grey});document.getElementById('bias-energy-out').innerHTML=T('f ∈ [0,1]. Envelope descritivo entre configurações.','f ∈ [0,1]. Descriptive envelope across configurations.');});
const XREG=[[-.001,-.003,-.007,.001,-.005],[-.001,-.007,0,0,-.010],[-.001,-.009,.018,-.001,-.015],[-.004,-.005,.044,-.005,-.019],[-.009,.033,.075,-.011,-.027],[.001,.182,.043,-.022,-.033],[.154,.606,-.210,-.034,-.041]];
const XFULL=[-.017,-.019,-.008,.012,.062,.161,.434];
const XSUM=[-.016,-.018,-.009,.011,.061,.170,.474];
{
 const cv=document.getElementById('x-regions');let go;
 const draw=()=>{const k=+document.getElementById('x-e').value,a=XREG[k];const lo=Math.min(...a,0)*1.45,hi=Math.max(...a,0)*1.35,span=Math.max(.02,hi-lo);const p=new Plot(cv,{x:[-.5,4.5],y:[Math.min(-.005,lo),Math.max(.005,hi)],xticks:[0,1,2,3,4],xfmt:v=>['<10⁻³','10⁻³–10⁻²','0.01–0.1','0.1–0.3','>0.3'][v],fs:21,m:[65,25,90,100]}).begin().frame('x',T('δf de cada troca','δf of each replacement'));p.hline(0,{dash:[],color:PALETTE.grey});const colors=[PALETTE.anti,PALETTE.nu,PALETTE.orange,PALETTE.copper,PALETTE.grey];a.forEach((v,i)=>{bar(p,i-.28,i+.28,v,colors[i]);p.text(i,v+(v>=0?span*.055:-span*.055),signed(v),{align:'center',size:23,color:PALETTE.light});});
 document.getElementById('x-regions-out').innerHTML=energy(k)+' &nbsp; δf <b>'+signed(XFULL[k])+'</b> &nbsp; '+T('soma','sum')+' <b>'+signed(XSUM[k])+'</b>';};
 bindRange('x-e',energy,()=>go());go=panel('x-regions',draw);
}
panel('icecube-data',cv=>{const x=[3.25,3.75,4.25,4.75,5.25],v=[.42,.42,.38,.37,.28],low=[.09,.02,.03,.05,.24],up=[.06,.02,.03,.05,.15];const p=new Plot(cv,{x:[3,5.5],y:[0,.6],fs:23,m:[55,25,90,90],xticks:x,xfmt:v=>v===5.25?'≥5.0':(v-.25).toFixed(1)+'–'+(v+.25).toFixed(1)}).begin().frame('log₁₀ [Evis / GeV]','⟨y⟩');legend(p,[['IceCube',PALETTE.light],['NLO',PALETTE.anti],['Tier 1',PALETTE.nu]]);const c=p.ctx;
 x.forEach((xx,i)=>{c.strokeStyle=PALETTE.light;c.lineWidth=2;c.beginPath();c.moveTo(p.X(xx),p.Y(v[i]-low[i]));c.lineTo(p.X(xx),p.Y(v[i]+up[i]));c.moveTo(p.X(xx)-6,p.Y(v[i]-low[i]));c.lineTo(p.X(xx)+6,p.Y(v[i]-low[i]));c.moveTo(p.X(xx)-6,p.Y(v[i]+up[i]));c.lineTo(p.X(xx)+6,p.Y(v[i]+up[i]));c.stroke();p.dot(xx,v[i],{color:PALETTE.light,r:5,glow:0});});
 const means=[[.434,.418,.389,.351,.308],[.437,.420,.390,.350,.306]];means.forEach((a,j)=>a.forEach((v,i)=>p.dot(x[i]+(j? .06:-.06),v,{color:j?PALETTE.nu:PALETTE.anti,r:6,glow:0})));document.getElementById('icecube-data-out').innerHTML=T('Intervalos de 68%. Modelos deslocados horizontalmente para leitura.','68% intervals. Model markers offset horizontally for readability.');});
{
 const cv=document.getElementById('exposure');let go;
 const draw=()=>{const ten=document.getElementById('exp-mode').value==='10',a=ten?[.80,1.6]:[.29,.55],p=new Plot(cv,{x:[-.5,1.5],y:[0,1.9],xticks:[0,1],xfmt:x=>x===0?'Tier 1–NLO':T('Máximo na família','Family maximum'),fs:23,m:[55,30,90,90]}).begin().frame('',T('|δr| / semi-intervalo','|δr| / half-interval'));p.hline(1,{color:PALETTE.light,label:T('Uma unidade de erro','One error unit')});a.forEach((v,i)=>{bar(p,i-.24,i+.24,v,i?PALETTE.anti:PALETTE.nu);p.text(i,v+.09,nf(v,2),{align:'center',color:PALETTE.light,size:29});});document.getElementById('exposure-out').innerHTML=ten?'×10: Tier 1–NLO 0.78–0.80; '+T('família','family')+' 1.6':'×1: Tier 1–NLO 0.21–0.29; '+T('família','family')+' 0.55';};
 document.getElementById('exp-mode').addEventListener('change',()=>go());go=panel('exposure',draw);
}
