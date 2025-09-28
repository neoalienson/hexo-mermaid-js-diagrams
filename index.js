'use strict';
/* global hexo */

const log = hexo.log || console;


hexo.config.mermaid = Object.assign({
    enable: true,
    renderMode: 'puppeteer', // 'puppeteer' or 'live'
    theme: 'default',
    puppeteerConfig: { 
        args: ['--disable-setuid-sandbox', '--no-sandbox'],
        dumpio: true 
    },
    defaultViewport:{
        width: 2048,
        height: 1024,
    },
    backgroundColor: 'white'
}, hexo.config.mermaid);

global.hexo = Object.assign(hexo,global.hexo)

if (hexo.config.mermaid.enable) {
    const path = require('path');
    const fs = require('fs');
    
    const builder = require('./builder');
    
//     // Inject Mermaid.js script for live mode
//     if (hexo.config.mermaid.renderMode === 'live') {
//         hexo.extend.injector.register('head_end', () => {
//             const mermaidPath = path.join(__dirname, 'mermaid.min.js');
//             const mermaidScript = fs.readFileSync(mermaidPath, 'utf8');
//             return `<script>${mermaidScript}</script>
// <script>mermaid.initialize({theme: '${hexo.config.mermaid.theme}'});</script>`;
//         });
//     }
    
    hexo.extend.tag.register('mermaid',(arg,content)=>{
        if (hexo.config.mermaid.renderMode === 'live') {
            return `<div class="mermaid">${content}</div>`;
        }
        return builder(content);
    } , { async: true,ends: true });

}