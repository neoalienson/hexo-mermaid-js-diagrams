'use strict';
/* global hexo */

const log = hexo.log || console;


hexo.config.mermaid = Object.assign({
    enable: true,
    render_mode: 'puppeteer', // 'puppeteer' or 'live'
    theme: 'default',
    js_url: 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js',
    puppeteerConfig: { 
        args: ['--disable-setuid-sandbox', '--no-sandbox'],
        dumpio: true 
    },
    defaultViewport:{
        width: 2048,
        height: 1024,
    },
    backgroundColor: 'white',
    priority: 0,
    controls: {
        enable: true,
        zoomIn: true,
        zoomOut: true,
        reset: true,
        download: true,
        position: 'bottom-right',
        draggable: true
    },
    diagramDraggable: true,
    width: '100%',
    debug: false
}, hexo.config.mermaid);

global.hexo = Object.assign(hexo,global.hexo)

if (hexo.config.mermaid.enable) {
    const path = require('path');
    const fs = require('fs');
    const builder = require('./builder');
    
    // Inject Mermaid.js script for live mode
    if (hexo.config.mermaid.render_mode === 'live') {
        hexo.extend.filter.register('after_generate', function() {
            const route = hexo.route;
            const routeList = route.list();
            const routes = routeList.filter(hpath => hpath.endsWith('.html'));
            
            const htmls = {};
            return Promise.all(routes.map(hpath => {
                return new Promise((resolve) => {
                    const contents = route.get(hpath);
                    let htmlTxt = '';
                    contents.on('data', (chunk) => (htmlTxt += chunk));
                    contents.on('end', () => {
                        if (htmlTxt.includes('class="mermaid"') && !htmlTxt.includes('mermaid-scripts')) {
                            let scripts = `<script id="mermaid-scripts" src="${hexo.config.mermaid.js_url}"></script>\n<script>mermaid.initialize({theme: '${hexo.config.mermaid.theme}'});</script>`;
                            let styles = '';
                            if (hexo.config.mermaid.controls.enable) {
                                const pos = hexo.config.mermaid.controls.position || 'bottom-right';
                                const posMap = {'top-left':'top:8px;left:8px','top-right':'top:8px;right:8px','bottom-left':'bottom:8px;left:8px','bottom-right':'bottom:8px;right:8px'};
                                const posStyle = posMap[pos] || posMap['bottom-right'];
                                const cursor = hexo.config.mermaid.controls.draggable !== false ? 'move' : 'default';
                                const wrapperWidth = hexo.config.mermaid.width || '100%';
                                styles = `<style>.mermaid-wrapper{position:relative;width:${wrapperWidth};overflow:hidden;user-select:none}.mermaid-controls{position:absolute;${posStyle};display:flex;gap:4px;z-index:10;cursor:${cursor}}.mermaid-controls button{width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)}.mermaid-controls button:hover{background:#fff}</style>`;
                                scripts += `\n<script>(function(){document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){document.querySelectorAll('.mermaid').forEach(function(el){const w=document.createElement('div');w.className='mermaid-wrapper';el.parentNode.insertBefore(w,el);w.appendChild(el);const c=document.createElement('div');c.className='mermaid-controls';${hexo.config.mermaid.controls.zoomIn ? "const zi=document.createElement('button');zi.innerHTML='🔍';zi.title='Zoom In';zi.onclick=()=>{const s=el.querySelector('svg');if(!s)return;const t=s.style.transform.match(/scale\\(([\\d.]+)\\)/);const sc=(t?parseFloat(t[1]):1)*1.2;s.style.transform='scale('+sc+')';s.style.transformOrigin='top left'};c.appendChild(zi);" : ""}${hexo.config.mermaid.controls.zoomOut ? "const zo=document.createElement('button');zo.innerHTML='🔎';zo.title='Zoom Out';zo.onclick=()=>{const s=el.querySelector('svg');if(!s)return;const t=s.style.transform.match(/scale\\(([\\d.]+)\\)/);const sc=(t?parseFloat(t[1]):1)/1.2;s.style.transform='scale('+sc+')';s.style.transformOrigin='top left'};c.appendChild(zo);" : ""}${hexo.config.mermaid.controls.reset ? "const r=document.createElement('button');r.innerHTML='↺';r.title='Reset';r.onclick=()=>{const s=el.querySelector('svg');if(!s)return;s.style.transform='';s.style.transformOrigin='top left'};c.appendChild(r);" : ""}${hexo.config.mermaid.controls.download ? "const d=document.createElement('button');d.innerHTML='💾';d.title='Download SVG';d.onclick=()=>{const s=el.querySelector('svg');if(!s)return;const clone=s.cloneNode(true);clone.removeAttribute('style');const svg=clone.outerHTML.replace(/<br\\s*\\/?>/gi,'').replace(/<\\/p>/gi,'').replace(/&nbsp;/gi,'&#160;');const b=new Blob([svg],{type:'image/svg+xml'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='mermaid-diagram.svg';a.click();URL.revokeObjectURL(u)};c.appendChild(d);" : ""}${hexo.config.mermaid.controls.draggable !== false ? "let dx=0,dy=0,px=0,py=0;c.onmousedown=(e)=>{e.preventDefault();px=e.clientX;py=e.clientY;document.onmousemove=(e)=>{e.preventDefault();dx=px-e.clientX;dy=py-e.clientY;px=e.clientX;py=e.clientY;c.style.top=(c.offsetTop-dy)+'px';c.style.left=(c.offsetLeft-dx)+'px';c.style.right='auto';c.style.bottom='auto'};document.onmouseup=()=>{document.onmousemove=null;document.onmouseup=null}};" : ""}w.appendChild(c);${hexo.config.mermaid.diagramDraggable !== false ? (hexo.config.mermaid.debug ? "console.log('[Mermaid Debug] Live mode executing');const s=el.querySelector('svg');if(s){console.log('[Mermaid Debug] Init',{svg:s});w.style.cursor='grab';s.style.userSelect='none';s.style.position='relative';let tx=0,ty=0,px=0,py=0,dragging=false;console.log('[Mermaid Debug] Adding listeners');w.addEventListener('mousedown',function(e){console.log('[Mermaid Debug] Mousedown event',e.target);if(e.target.closest('.mermaid-controls')||e.target.closest('button')){console.log('[Mermaid Debug] Ignored controls');return}dragging=true;w.style.cursor='grabbing';e.preventDefault();px=e.clientX;py=e.clientY;const t=s.style.transform.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);if(t){tx=parseFloat(t[1]);ty=parseFloat(t[2])}console.log('[Mermaid Debug] Mousedown',{px,py,tx,ty,dragging})});document.addEventListener('mousemove',function(e){if(!dragging)return;e.preventDefault();const dx=e.clientX-px;const dy=e.clientY-py;const nt=tx+dx;const nty=ty+dy;const scale=s.style.transform.match(/scale\(([\d.]+)\)/);const scaleStr=scale?' scale('+scale[1]+')':'';s.style.transform='translate('+nt+'px, '+nty+'px)'+scaleStr;s.style.transformOrigin='top left';console.log('[Mermaid Debug] Mousemove',{dx,dy,tx:nt,ty:nty})});document.addEventListener('mouseup',function(){if(dragging){console.log('[Mermaid Debug] Mouseup');const t=s.style.transform.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);if(t){tx=parseFloat(t[1]);ty=parseFloat(t[2])}dragging=false;w.style.cursor='grab'}})}" : "const s=el.querySelector('svg');if(s){w.style.cursor='grab';s.style.userSelect='none';s.style.position='relative';let tx=0,ty=0,px=0,py=0,dragging=false;w.addEventListener('mousedown',function(e){if(e.target.closest('.mermaid-controls')||e.target.closest('button'))return;dragging=true;w.style.cursor='grabbing';e.preventDefault();px=e.clientX;py=e.clientY;const t=s.style.transform.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);if(t){tx=parseFloat(t[1]);ty=parseFloat(t[2])}});document.addEventListener('mousemove',function(e){if(!dragging)return;e.preventDefault();const dx=e.clientX-px;const dy=e.clientY-py;const nt=tx+dx;const nty=ty+dy;const scale=s.style.transform.match(/scale\(([\d.]+)\)/);const scaleStr=scale?' scale('+scale[1]+')':'';s.style.transform='translate('+nt+'px, '+nty+'px)'+scaleStr;s.style.transformOrigin='top left'});document.addEventListener('mouseup',function(){if(dragging){const t=s.style.transform.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);if(t){tx=parseFloat(t[1]);ty=parseFloat(t[2])}dragging=false;w.style.cursor='grab'}})}") : ""}})},100)})})();</script>`;
                            }
                            const newContent = htmlTxt.replace('</head>', `${styles}${scripts}</head>`);
                            htmls[hpath] = newContent;
                        }
                        resolve();
                    });
                });
            }))
            .then(() => {
                const htmlPaths = Object.keys(htmls);
                for (const hpath of htmlPaths) {
                    route.set(hpath, htmls[hpath]);
                }
            });
        }, hexo.config.mermaid.priority);
    }
    
    hexo.extend.tag.register('mermaid',(arg,content)=>{
        if (hexo.config.mermaid.render_mode === 'live') {
            return `<div class="mermaid">${content}</div>`;
        }
        return builder(content, hexo.config.mermaid.controls, hexo.config.mermaid.diagramDraggable, hexo.config.mermaid.width, hexo.config.mermaid.debug);
    } , { async: true,ends: true });

}