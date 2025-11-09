function generateStyles(wrapperWidth, posStyle, cursor) {
    return `<style>
        .mermaid-wrapper{position:relative;width:${wrapperWidth};overflow:hidden;user-select:none}
        .mermaid-wrapper.fullscreen{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:#fff}
        .mermaid-wrapper.fullscreen .mermaid-controls{margin-right:20px}
        .mermaid-controls{position:absolute;${posStyle};display:flex;gap:4px;z-index:10;cursor:${cursor}}
        .mermaid-controls button{width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)}
        .mermaid-controls button:hover{background:#fff}
    </style>`;
}

function generateLiveScript(controls, diagramDraggable, debug) {
    const parts = [];
    
    if (controls.zoomIn) {
        parts.push(`const zi=document.createElement('button');zi.innerHTML='🔍';zi.title='Zoom In';zi.dataset.action='zoom-in';c.appendChild(zi);`);
    }
    
    if (controls.zoomOut) {
        parts.push(`const zo=document.createElement('button');zo.innerHTML='🔎';zo.title='Zoom Out';zo.dataset.action='zoom-out';c.appendChild(zo);`);
    }
    
    if (controls.reset) {
        parts.push(`const r=document.createElement('button');r.innerHTML='↺';r.title='Reset';r.dataset.action='reset';c.appendChild(r);`);
    }
    
    if (controls.download) {
        parts.push(`const d=document.createElement('button');d.innerHTML='💾';d.title='Download SVG';d.dataset.action='download';c.appendChild(d);`);
    }
    
    parts.push(`const f=document.createElement('button');f.innerHTML='⛶';f.title='Fullscreen';f.dataset.action='fullscreen';c.appendChild(f);`);
    
    parts.push(`let sc=1,tx=0,ty=0;c.addEventListener('click',function(e){
        const btn=e.target.closest('button');if(!btn)return;
        const s=el.querySelector('svg');if(!s)return;
        const action=btn.dataset.action;
        if(action==='zoom-in'){
            sc=sc*1.2;
            s.style.transform='scale('+sc+')';s.style.transformOrigin='top left'
        }else if(action==='zoom-out'){
            sc=sc/1.2;
            s.style.transform='scale('+sc+')';s.style.transformOrigin='top left'
        }else if(action==='reset'){
            sc=1;tx=0;ty=0;s.style.transform='';s.style.transformOrigin='top left'
        }else if(action==='download'){
            const clone=s.cloneNode(true);clone.removeAttribute('style');
            const svg=clone.outerHTML.replace(/<br\\s*\\/?>/gi,'').replace(/<\\/p>/gi,'').replace(/&nbsp;/gi,'&#160;');
            const b=new Blob([svg],{type:'image/svg+xml'});const u=URL.createObjectURL(b);
            const a=document.createElement('a');a.href=u;a.download='mermaid-diagram.svg';a.click();URL.revokeObjectURL(u)
        }else if(action==='fullscreen'){
            if(w.classList.contains('fullscreen')){
                w.classList.remove('fullscreen');btn.innerHTML='⛶';btn.title='Fullscreen';
                c.style.top='';c.style.left='';c.style.right='';c.style.bottom='';c.style.marginRight=''
            }else{
                w.classList.add('fullscreen');btn.innerHTML='✕';btn.title='Close';
                c.style.top='';c.style.left='';c.style.right='';c.style.bottom='';c.style.marginRight=''
            }
        }
    });`);
    
    if (controls.draggable !== false) {
        parts.push(`let dx=0,dy=0,px=0,py=0;
            c.onmousedown=(e)=>{e.preventDefault();px=e.clientX;py=e.clientY;
            document.onmousemove=(e)=>{e.preventDefault();dx=px-e.clientX;dy=py-e.clientY;px=e.clientX;py=e.clientY;
            c.style.top=(c.offsetTop-dy)+'px';c.style.left=(c.offsetLeft-dx)+'px';c.style.right='auto';c.style.bottom='auto'};
            document.onmouseup=()=>{document.onmousemove=null;document.onmouseup=null}};`);
    }
    
    parts.push('w.appendChild(c);');
    
    if (diagramDraggable !== false) {
        const dragCode = `const s=el.querySelector('svg');if(s){
            w.style.cursor='grab';s.style.userSelect='none';s.style.position='relative';
            let px=0,py=0,dragging=false;
            w.addEventListener('mousedown',function(e){
                if(e.target.closest('.mermaid-controls')||e.target.closest('button'))return;
                dragging=true;w.style.cursor='grabbing';e.preventDefault();px=e.clientX;py=e.clientY;
                const t=s.style.transform.match(/translate\\(([\\d.-]+)px,\\s*([\\d.-]+)px\\)/);
                if(t){tx=parseFloat(t[1]);ty=parseFloat(t[2])}else{tx=0;ty=0}});
            document.addEventListener('mousemove',function(e){
                if(!dragging)return;e.preventDefault();
                const dx=e.clientX-px;const dy=e.clientY-py;const nt=tx+dx;const nty=ty+dy;
                const scaleStr=sc!==1?' scale('+sc+')':'';
                s.style.transform='translate('+nt+'px, '+nty+'px)'+scaleStr;s.style.transformOrigin='top left'})
            document.addEventListener('mouseup',function(){
                if(dragging){
                    const t=s.style.transform.match(/translate\\(([\\d.-]+)px,\\s*([\\d.-]+)px\\)/);
                    if(t){tx=parseFloat(t[1]);ty=parseFloat(t[2])}else{tx=0;ty=0}
                    dragging=false;w.style.cursor='grab'}})}`;
        
        if (debug) {
            parts.push(`console.log('[Mermaid Debug] Live mode executing');${dragCode}`);
        } else {
            parts.push(dragCode);
        }
    }
    
    return `\n<script>(function(){
        document.addEventListener('DOMContentLoaded',function(){
            setTimeout(function(){
                document.querySelectorAll('.mermaid').forEach(function(el){
                    const w=document.createElement('div');
                    w.className='mermaid-wrapper';
                    el.parentNode.insertBefore(w,el);
                    w.appendChild(el);
                    const c=document.createElement('div');
                    c.className='mermaid-controls';
                    ${parts.join('')}
                })
            },100)
        })
    })();</script>`;
}

module.exports = { generateStyles, generateLiveScript };
