(function(){
  var players=[], slices=[], rot=0, spinning=false, winnerIdx=-1, nada=0, curMode='win';
  function pool(){var a=players.slice();if(nada>0)a.push({name:'Nada',n:nada,color:'#7d7a99',nada:true});return a}
  var cv=document.getElementById('cv'), ctx=cv.getContext('2d');
  var $=function(id){return document.getElementById(id)};
  var TAU=Math.PI*2;

  function color(i){return 'hsl('+((i*137.5)%360)+',62%,50%)'}

  // Mezcla: elige al azar ponderado por entradas restantes, evitando repetir al anterior
  function buildSlices(){
    var left=pool().map(function(p){return p.n}), seq=[], last=-1, total=left.reduce(function(a,b){return a+b},0);
    for(var k=0;k<total;k++){
      var c=[],w=0;
      for(var i=0;i<left.length;i++) if(left[i]>0&&i!==last){c.push(i);w+=left[i]}
      if(!c.length){for(var j=0;j<left.length;j++) if(left[j]>0){c.push(j);w+=left[j]}}
      var r=Math.random()*w, pick=c[c.length-1];
      for(var m=0;m<c.length;m++){r-=left[c[m]];if(r<0){pick=c[m];break}}
      seq.push(pick);left[pick]--;last=pick;
    }
    // Evitar que el final se junte con el inicio
    var tries=0;
    while(seq.length>2&&seq[0]===seq[seq.length-1]&&tries++<200){
      var p=1+Math.floor(Math.random()*(seq.length-2));
      if(seq[p]!==seq[0]&&seq[p-1]!==seq[0]&&seq[p+1]!==seq[0]){var t=seq[p];seq[p]=seq[seq.length-1];seq[seq.length-1]=t}
    }
    slices=seq;
  }

  function size(){
    var s=$('stage').clientWidth, d=window.devicePixelRatio||1, px=Math.round(s*d);
    if(cv.width!==px||cv.height!==px){cv.width=px;cv.height=px}
    ctx.setTransform(d,0,0,d,0,0);return s;
  }
  function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}

  function draw(){
    var s=size(), R=s/2-8, cx=s/2, cy=s/2, N=slices.length;
    ctx.clearRect(0,0,s,s);
    if(pool().length<2){
      ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.fillStyle=css('--panel');ctx.fill();
      ctx.lineWidth=2;ctx.strokeStyle=css('--line');ctx.stroke();
      ctx.fillStyle=css('--muted');ctx.font='600 18px "Bricolage Grotesque",sans-serif';ctx.textAlign='center';
      ctx.fillText('Agrega usuarios para armar la ruleta',cx,cy);return;
    }
    var a=TAU/N, P=pool();
    for(var i=0;i<N;i++){
      var s0=rot+i*a;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,s0,s0+a);ctx.closePath();
      ctx.fillStyle=P[slices[i]].color;ctx.fill();
      if(N<=80){ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,.55)';ctx.stroke()}
    }
    var arc=a*R*0.8;
    if(arc>13){
      var fs=Math.min(18,arc*0.7);
      ctx.font='700 '+fs+'px "Bricolage Grotesque",sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=3;
      for(var j=0;j<N;j++){
        var mid=rot+(j+.5)*a, nm=P[slices[j]].name;
        if(nm.length>14)nm=nm.slice(0,13)+'…';
        ctx.save();ctx.translate(cx,cy);ctx.rotate(mid);ctx.fillText(nm,R-14,0);ctx.restore();
      }
      ctx.shadowBlur=0;
    }
    ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.lineWidth=5;ctx.strokeStyle=css('--ink');ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,R*0.07,0,TAU);ctx.fillStyle=css('--ink');ctx.fill();
  }

  function renderList(){
    var ul=$('list');ul.innerHTML='';
    var tot=players.reduce(function(a,p){return a+p.n},0)+nada;
    players.forEach(function(p,i){
      var li=document.createElement('li');
      li.innerHTML='<span class="dot" style="background:'+p.color+'"></span><span class="nm"></span><span class="pct">'+(tot?Math.round(p.n/tot*1000)/10:0)+'%</span><span class="stp"><button aria-label="Menos">−</button><b>'+p.n+'</b><button aria-label="Más">+</button><button aria-label="Quitar">✕</button></span>';
      li.querySelector('.nm').textContent=p.name;
      var b=li.querySelectorAll('button');
      b[0].onclick=function(){if(p.n>1){p.n--;refresh()}};
      b[1].onclick=function(){if(p.n<500){p.n++;refresh()}};
      b[2].onclick=function(){players.splice(i,1);refresh()};
      ul.appendChild(li);
    });
    $('empty').style.display=pool().length>=2?'none':'block';
    $('total').textContent=players.length?('Total: '+tot+' entradas, '+players.length+' usuarios'):'';
  }

  function refresh(){
    $('win').hidden=true;winnerIdx=-1;
    buildSlices();renderList();
    var ok=pool().length>=2;
    $('spin').disabled=!ok||spinning;$('spinFool').disabled=!ok||spinning;$('shuffle').disabled=!ok||spinning;$('clear').disabled=!players.length||spinning;
    draw();
  }

  function add(){
    var name=$('name').value.trim(), n=parseInt($('qty').value,10);
    if(!name){$('name').focus();return}
    if(!(n>=1))n=1;if(n>500)n=500;
    var ex=players.filter(function(p){return p.name.toLowerCase()===name.toLowerCase()})[0];
    if(ex){ex.n=Math.min(500,ex.n+n)}else{players.push({name:name,n:n,color:color(players.length)})}
    $('name').value='';$('qty').value=1;$('name').focus();refresh();
  }

  function spin(mode){
    if(spinning||pool().length<2)return;
    spinning=true;curMode=mode;$('win').hidden=true;
    ['spin','spinFool','shuffle','clear'].forEach(function(i){$(i).disabled=true});
    var start=rot, delta=TAU*(6+Math.random()*3)+Math.random()*TAU, dur=6000, t0=null;
    function step(t){
      if(!t0)t0=t;var p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,4);
      rot=start+delta*e;draw();
      if(p<1){requestAnimationFrame(step)}else{finish()}
    }
    requestAnimationFrame(step);
  }

  var fx=$('fx'),fc=fx.getContext('2d'),parts=[],raf=0,still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cols=['#ff4d6d','#ffc83d','#3bd6c6','#6c5ce7','#ff8f3d','#7bd83b','#ffffff'];
  var taunts=['Elpen Dejo 🫵🤣','Suerte para la proxima','Tu suerte se fue por cigarros','Gracias por participar', 'OH HELL NAH BRUH, IM OUT 🚪🚶', 'Ya quisieras'];
  function rnd(a,b){return a+Math.random()*(b-a)}
  function fxSize(){var d=window.devicePixelRatio||1;fx.width=innerWidth*d;fx.height=innerHeight*d;fc.setTransform(d,0,0,d,0,0)}
  var lastT=0;
  function kick(){if(!raf){fxSize();lastT=0;raf=requestAnimationFrame(loop)}}
  function loop(t){
    var k=lastT?Math.min(50,t-lastT)/16.667:1;lastT=t;
    fc.clearRect(0,0,innerWidth,innerHeight);
    parts=parts.filter(function(p){return p.life>0&&p.y<innerHeight+50});
    parts.forEach(function(p){
      p.vy+=p.g*k;p.x+=p.vx*k;p.y+=p.vy*k;p.vx*=Math.pow(p.drag,k);p.life-=k;p.rot+=p.vr*k;
      fc.save();fc.globalAlpha=Math.max(0,Math.min(1,p.life/p.fade));fc.translate(p.x,p.y);fc.rotate(p.rot);
      if(p.img){fc.drawImage(p.img,-p.s/2,-p.s/2,p.s,p.s)}
      else if(p.spark){fc.fillStyle=p.c;fc.beginPath();fc.arc(0,0,p.s,0,TAU);fc.fill()}
      else{fc.fillStyle=p.c;fc.fillRect(-p.s/2,-p.s/3,p.s,p.s*0.6)}
      fc.restore();
    });
    if(parts.length){raf=requestAnimationFrame(loop)}else{raf=0;fc.clearRect(0,0,innerWidth,innerHeight)}
  }
  function confetti(x,y,dir){for(var i=0;i<70;i++)parts.push({x:x,y:y,vx:dir*rnd(3,12),vy:rnd(-17,-6),g:.35,drag:.985,life:rnd(110,200),fade:50,rot:rnd(0,6),vr:rnd(-.3,.3),s:rnd(6,12),c:cols[i%cols.length]})}
  function burst(x,y){var c=cols[Math.floor(Math.random()*cols.length)];for(var i=0;i<60;i++){var an=rnd(0,TAU),sp=rnd(1.5,7);parts.push({x:x,y:y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,g:.07,drag:.97,life:rnd(50,90),fade:30,rot:0,vr:0,s:rnd(1.5,3),c:c,spark:1})}}
  function celebrate(){
    if(still)return;
    var w=innerWidth,h=innerHeight;
    confetti(0,h,1);confetti(w,h,-1);kick();
    for(var i=0;i<9;i++)(function(i){setTimeout(function(){burst(rnd(w*.15,w*.85),rnd(h*.12,h*.5));if(i%3===0)confetti(rnd(0,w),h,Math.random()<.5?1:-1);kick()},i*450)})(i);
  }
  var EMOJIS=['🤡','😂','🫵','💀'], SIZES=[28,36,44], sprites={};
  function sprite(e,sz){
    var k=e+sz;if(sprites[k])return sprites[k];
    var d=window.devicePixelRatio||1,c=document.createElement('canvas'),x=c.getContext('2d');
    c.width=c.height=Math.ceil(sz*1.4*d);x.scale(d,d);
    x.font=sz+'px serif';x.textAlign='center';x.textBaseline='middle';
    x.fillText(e,sz*0.7,sz*0.7);
    return sprites[k]=c;
  }
  function warm(){EMOJIS.forEach(function(e){SIZES.forEach(function(z){sprite(e,z)})})}
  function rain(){
    if(still)return;
    for(var i=0;i<30;i++){
      var z=SIZES[i%SIZES.length];
      parts.push({x:rnd(0,innerWidth),y:rnd(-400,-20),vx:0,vy:rnd(2,5),g:.02,drag:1,life:400,fade:40,rot:rnd(-.5,.5),vr:rnd(-.03,.03),s:z*1.4,img:sprite(EMOJIS[i%EMOJIS.length],z)});
    }
    kick();
  }
  function result(w,mode){
    var box=$('win');box.hidden=false;box.classList.remove('lose');
    $('rm1').hidden=false;$('rmAll').hidden=false;$('taunt').hidden=true;$('wlabel').textContent='Ganador';
    if(mode==='fool'){
      box.classList.add('lose');$('wlabel').textContent='No ganas nada';$('who').textContent=w.name;
      $('taunt').textContent=taunts[Math.floor(Math.random()*taunts.length)];$('taunt').hidden=false;
      $('rm1').hidden=true;$('rmAll').hidden=true;rain();
    }else{$('who').textContent=w.name;celebrate()}
  }
  function finish(){
    spinning=false;
    var a=TAU/slices.length, th=((-Math.PI/2-rot)%TAU+TAU)%TAU;
    winnerIdx=slices[Math.floor(th/a)%slices.length];
    result(pool()[winnerIdx],curMode);
    $('spin').disabled=false;$('spinFool').disabled=false;$('shuffle').disabled=false;$('clear').disabled=false;
  }

  $('add').onclick=add;
  $('name').addEventListener('keydown',function(e){if(e.key==='Enter')add()});
  $('qty').addEventListener('keydown',function(e){if(e.key==='Enter')add()});
  $('spin').onclick=function(){spin('win')};
  $('spinFool').onclick=function(){spin('fool')};
  $('shuffle').onclick=function(){$('win').hidden=true;buildSlices();draw()};
  $('clear').onclick=function(){players=[];refresh()};
  $('rm1').onclick=function(){var p=players[winnerIdx];if(!p)return;p.n--;if(p.n<1)players.splice(winnerIdx,1);refresh()};
  $('rmAll').onclick=function(){if(winnerIdx<0)return;players.splice(winnerIdx,1);refresh()};
  window.addEventListener('resize',function(){draw();if(raf)fxSize()});
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',draw);
  refresh();
  setTimeout(warm,300);
})();
