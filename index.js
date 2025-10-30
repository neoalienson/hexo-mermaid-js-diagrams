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
    priority: 0
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
                            let scripts;
                            scripts = `<script id="mermaid-scripts" src="${hexo.config.mermaid.js_url}"></script>\n<script>mermaid.initialize({theme: '${hexo.config.mermaid.theme}'});</script>`;
                            const newContent = htmlTxt.replace('</head>', `${scripts}</head>`);
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
        return builder(content);
    } , { async: true,ends: true });

}