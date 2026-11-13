(function(){
if(!window.THREE||!window.MODELS)return;
var glc=document.createElement('canvas');var R;try{R=new THREE.WebGLRenderer({canvas:glc,alpha:true,antialias:true,preserveDrawingBuffer:true});}catch(e){return;}
R.setPixelRatio(1);R.setClearColor(0x000000,0);var BUF=0;function ensure(w,h){var s=Math.max(w,h,BUF);if(s>BUF){BUF=Math.min(2048,Math.ceil(s/256)*256);R.setSize(BUF,BUF,false)}}
var DPR=Math.min(window.devicePixelRatio||1,2);
var D=Math.PI/180,views=[],texCache={};
function tex(m){var t=new THREE.TextureLoader().load(m.tex);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t}
var FACES={north:function(a,b){return[[b[0],b[1],a[2]],[a[0],b[1],a[2]],[b[0],a[1],a[2]],[a[0],a[1],a[2]]]},
south:function(a,b){return[[a[0],b[1],b[2]],[b[0],b[1],b[2]],[a[0],a[1],b[2]],[b[0],a[1],b[2]]]},
east:function(a,b){return[[b[0],b[1],b[2]],[b[0],b[1],a[2]],[b[0],a[1],b[2]],[b[0],a[1],a[2]]]},
west:function(a,b){return[[a[0],b[1],a[2]],[a[0],b[1],b[2]],[a[0],a[1],a[2]],[a[0],a[1],b[2]]]},
up:function(a,b){return[[a[0],b[1],a[2]],[b[0],b[1],a[2]],[a[0],b[1],b[2]],[b[0],b[1],b[2]]]},
down:function(a,b){return[[a[0],a[1],b[2]],[b[0],a[1],b[2]],[a[0],a[1],a[2]],[b[0],a[1],a[2]]]}};
function cubeMesh(c,m,mat){
  var pos=[],uv=[],idx=[],n=0,a=c.f,b=c.t,o=c.o;
  var A=[a[0]-o[0],a[1]-o[1],a[2]-o[2]],B=[b[0]-o[0],b[1]-o[1],b[2]-o[2]];
  for(var k in c.fc){var F=FACES[k];if(!F)continue;var v=F(A,B),u=c.fc[k].uv,r=((c.fc[k].r||0)/90)|0;
    var q=[[u[0],u[1]],[u[2],u[1]],[u[2],u[3]],[u[0],u[3]]];// TL TR BR BL
    var map=[0,1,3,2];// vertex order TL TR BL BR -> q index
    for(var i=0;i<4;i++){pos.push(v[i][0],v[i][1],v[i][2]);var qq=q[(map[i]-r+4)%4];uv.push(qq[0]/m.uw,1-qq[1]/m.uh)}
    idx.push(n,n+2,n+1,n+1,n+2,n+3);n+=4}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  var piv=new THREE.Group();piv.rotation.order='ZYX';piv.rotation.set(c.r[0]*D,c.r[1]*D,c.r[2]*D);
  piv.add(new THREE.Mesh(g,mat));return piv}
function build(node,parentO,m,mat,bones){
  var g=new THREE.Group();g.rotation.order='ZYX';
  g.position.set(node.o[0]-parentO[0],node.o[1]-parentO[1],node.o[2]-parentO[2]);
  g.rotation.set(node.r[0]*D,node.r[1]*D,node.r[2]*D);
  g.userData.base={p:g.position.clone(),r:g.rotation.clone()};bones[node.id]=g;
  node.k.forEach(function(ch){
    if(ch.c){var p=cubeMesh(ch.c,m,mat);p.position.set(ch.c.o[0]-node.o[0],ch.c.o[1]-node.o[1],ch.c.o[2]-node.o[2]);g.add(p)}
    else g.add(build(ch,node.o,m,mat,bones))});
  return g}
function sample(kf,t){
  if(t<=kf[0][0])return kf[0];var L=kf.length;if(t>=kf[L-1][0])return kf[L-1];
  for(var i=0;i<L-1;i++){var a=kf[i],b=kf[i+1];if(t>=a[0]&&t<=b[0]){if(b[4]||a[4])return a;var s=(t-a[0])/((b[0]-a[0])||1);return[0,a[1]+(b[1]-a[1])*s,a[2]+(b[2]-a[2])*s,a[3]+(b[3]-a[3])*s]}}
  return kf[L-1]}
function pose(v,an,t){
  for(var id in v.bones){var g=v.bones[id],B=g.userData.base;g.position.copy(B.p);g.rotation.copy(B.r);g.scale.set(1,1,1)}
  if(!an)return;
  for(var id in an.b){var g=v.bones[id];if(!g)continue;var ch=an.b[id];
    if(ch.rotation){var r=sample(ch.rotation,t);g.rotation.x-=r[1]*D;g.rotation.y-=r[2]*D;g.rotation.z+=r[3]*D}
    if(ch.position){var p=sample(ch.position,t);g.position.x-=p[1];g.position.y+=p[2];g.position.z+=p[3]}
    if(ch.scale){var s=sample(ch.scale,t);g.scale.set(s[1],s[2],s[3])}}}
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.target._v)e.target._v.vis=e.isIntersecting})},{rootMargin:'120px'});
document.querySelectorAll('[data-model]').forEach(function(el){
  var m=MODELS[el.dataset.model];if(!m)return;
  var t=texCache[el.dataset.model]||(texCache[el.dataset.model]=tex(m));
  var mat=new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:0.05,side:THREE.DoubleSide});
  var scene=new THREE.Scene(),bones={};
  scene.add(new THREE.AmbientLight(0xffffff,0.62));var dl=new THREE.DirectionalLight(0xffffff,0.55);dl.position.set(-0.6,1,0.9);scene.add(dl);
  var root=build(m.root,[0,0,0],m,mat,bones);scene.add(root);
  var v={el:el,scene:scene,bones:bones,m:m,state:'idle',t0:performance.now()/1000+Math.random()*-3};
  var pts=[],box=new THREE.Box3(),W=new THREE.Vector3();
  function grab(){root.updateMatrixWorld(true);root.traverse(function(o){if(o.isMesh){var pa=o.geometry.attributes.position;for(var i=0;i<pa.count;i++){W.fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld);pts.push(W.clone());box.expandByPoint(W)}}})}
  pose(v,null,0);grab();
  var ia=m.anim.idle;if(ia){for(var s=1;s<6;s++){pose(v,ia,ia.len*s/6);grab()}}
  pose(v,null,0);
  var ctr=box.getCenter(new THREE.Vector3());
  var cam=new THREE.PerspectiveCamera(22,1,1,4000),yaw=-32*D,pit=16*D,dir=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pit),Math.sin(pit),-Math.cos(yaw)*Math.cos(pit));
  v.cam=cam;var P=new THREE.Vector3();
  function place(dist){cam.position.copy(ctr).addScaledVector(dir,dist);cam.lookAt(ctr);cam.updateMatrixWorld(true)}
  function fits(lim){var a=1e9,b=-1e9,c=1e9,d=-1e9;for(var i=0;i<pts.length;i++){P.copy(pts[i]).project(cam);if(P.z>1)return false;a=Math.min(a,P.x);b=Math.max(b,P.x);c=Math.min(c,P.y);d=Math.max(d,P.y)}return (b-a)/2<=lim&&(d-c)/2<=lim}
  v.fit=function(asp){cam.aspect=asp;cam.updateProjectionMatrix();var lo=1,hi=4000;for(var k=0;k<30;k++){var mid=(lo+hi)/2;place(mid);if(fits(0.9))hi=mid;else lo=mid}place(hi);
    // vertical recentre so the model sits in the box
    var minY=1,maxY=-1,minX=1,maxX=-1;for(var i=0;i<pts.length;i++){P.copy(pts[i]).project(cam);minY=Math.min(minY,P.y);maxY=Math.max(maxY,P.y);minX=Math.min(minX,P.x);maxX=Math.max(maxX,P.x)}
    var oy=(minY+maxY)/2,ox=(minX+maxX)/2;cam.projectionMatrix.elements[8]+=ox;cam.projectionMatrix.elements[9]+=oy;cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert()};
  v.asp=0;
  var cv=document.createElement('canvas');cv.className='c3d';el.appendChild(cv);v.cv=cv;v.ctx=cv.getContext('2d');v.vis=false;io.observe(el);el._v=v;
  var acts=m.anim.interact?['interact']:Object.keys(m.anim).filter(function(n){return !m.anim[n].loop&&n!=='apparition'&&n!=='death'&&n!=='sortie'&&n!=='sink'});
  el.addEventListener('click',function(){if(!acts.length)return;v.state=acts[Math.floor(Math.random()*acts.length)];v.t0=performance.now()/1000});
  el.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse'&&(v.state==='idle')){v.state='walk';v.t0=performance.now()/1000}});
  el.addEventListener('pointerleave',function(){if(v.state==='walk'){v.state='idle';v.t0=performance.now()/1000}});
  views.push(v)});
function frame(){
  var now=performance.now()/1000;
  views.forEach(function(v){
    if(!v.vis)return;
    var w=v.el.clientWidth,h=v.el.clientHeight;if(w<2||h<2)return;
    var pw=Math.round(w*DPR),ph=Math.round(h*DPR);
    if(v.cv.width!==pw||v.cv.height!==ph){v.cv.width=pw;v.cv.height=ph}
    ensure(pw,ph);
    var an=v.m.anim[v.state],t=now-v.t0;if(!an){v.state='idle';an=v.m.anim.idle}
    if(an){if(an.loop)t=t%an.len;else if(t>an.len){v.state='idle';v.t0=now;an=v.m.anim.idle;t=0}}
    pose(v,an,t);
    var asp=w/h;if(Math.abs(asp-v.asp)>0.01){v.asp=asp;v.fit(asp)}
    R.setViewport(0,0,pw,ph);R.setScissor(0,0,pw,ph);R.setScissorTest(true);R.clear();R.render(v.scene,v.cam);
    v.ctx.clearRect(0,0,pw,ph);v.ctx.drawImage(glc,0,BUF-ph,pw,ph,0,0,pw,ph);
    if(!v.ready){v.ready=1;v.el.classList.add('is3d')}
  });
  requestAnimationFrame(frame)}
requestAnimationFrame(frame);
})();
