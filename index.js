'use strict';
/* global hexo */

const log = hexo.log || console;
const { generateStyles, generateLiveScript } = require('./lib/helpers');

hexo.config.mermaid = Object.assign({
    enable: true,
    render_mode: 'puppeteer',
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
                                const posMap = {
                                    'top-left':'top:8px;left:8px',
                                    'top-right':'top:8px;right:8px',
                                    'bottom-left':'bottom:8px;left:8px',
                                    'bottom-right':'bottom:8px;right:8px'
                                };
                                const posStyle = posMap[pos] || posMap['bottom-right'];
                                const cursor = hexo.config.mermaid.controls.draggable !== false ? 'move' : 'default';
                                const wrapperWidth = hexo.config.mermaid.width || '100%';
                                
                                styles = generateStyles(wrapperWidth, posStyle, cursor);
                                scripts += generateLiveScript(
                                    hexo.config.mermaid.controls, 
                                    hexo.config.mermaid.diagramDraggable, 
                                    hexo.config.mermaid.debug
                                );
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
