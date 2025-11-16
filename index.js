'use strict';
/* global hexo */

const { generateStyles, generateLiveScript } = require('./lib/helpers');

// Debug logging function
const debugLog = (...args) => {
    if (hexo.config.mermaid && hexo.config.mermaid.debug) {
        console.log(...args);
    }
};

const mermaidStore = new Map();
let mermaidCounter = 0;
const base64Store = new Map();
let base64Counter = 0;

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
    debug: false,
    markdown: false
}, hexo.config.mermaid);

debugLog('[Mermaid Plugin] Loaded - enable:', hexo.config.mermaid.enable, 'debug:', hexo.config.mermaid.debug, 'markdown:', hexo.config.mermaid.markdown, 'render_mode:', hexo.config.mermaid.render_mode);

global.hexo = Object.assign(hexo,global.hexo)

if (hexo.config.mermaid.enable) {
    debugLog('[Mermaid Plugin] Registering filters and tags...');
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
            const id = `MERMAID_PLACEHOLDER_${mermaidCounter++}`;
            mermaidStore.set(id, content);
            return `<!--${id}-->`;
        }
        return builder(content, hexo.config.mermaid.controls, hexo.config.mermaid.diagramDraggable, hexo.config.mermaid.width, hexo.config.mermaid.debug);
    } , { async: true,ends: true });

    if (hexo.config.mermaid.markdown) {
        // Encode mermaid blocks as base64 before markdown rendering
        debugLog('[Mermaid] Registering before_post_render filter with priority -100');
        hexo.extend.filter.register('before_post_render', function(data) {
            debugLog(`[Mermaid] before_post_render called for: ${data.source}, has content: ${!!data.content}`);
            const contentLength = data.content ? data.content.length : 0;
            const mermaidCount = data.content ? (data.content.match(/```mermaid/g) || []).length : 0;
            const mermaidIndex = data.content ? data.content.indexOf('```mermaid') : -1;
            const timelineIndex = data.content ? data.content.indexOf('timeline') : -1;
            debugLog(`[Mermaid] ${data.source}: length=${contentLength}, blocks=${mermaidCount}, mermaidIndex=${mermaidIndex}, timelineIndex=${timelineIndex}`);
            if (data.content && data.content.includes('```mermaid')) {
                debugLog(`[Mermaid] Found mermaid blocks in ${data.source}, starting encoding...`);
                const before = data.content;
                data.content = data.content.replace(/```mermaid([\s\S]*?)```/g, (match, content) => {
                    const trimmed = content.trim();
                    const encoded = Buffer.from(trimmed).toString('base64');
                    const id = `MERMAID_BASE64_${base64Counter++}`;
                    base64Store.set(id, encoded);
                    debugLog(`[Mermaid] Encoded block ${id}: ${trimmed.length} chars -> ${encoded.length} base64 chars, store size: ${base64Store.size}`);
                    debugLog(`[Mermaid] Original content preview: ${trimmed.substring(0, 50)}...`);
                    debugLog(`[Mermaid] Encoded content preview: ${encoded.substring(0, 50)}...`);
                    debugLog(`[Mermaid] Contains forward slash: ${trimmed.includes('/')}`);
                    
                    return `\`\`\`${id}\n${encoded}\n\`\`\``;
                });
                
                const count = (before.match(/```mermaid/g) || []).length;
                debugLog(`[Mermaid] Encoded ${count} mermaid blocks in ${data.source}, total store size: ${base64Store.size}`);
            } else {
                debugLog(`[Mermaid] No mermaid blocks found in ${data.source}`);
            }
            return data;
        }, -100);
        
        // Decode base64 blocks back to mermaid divs after HTML rendering
        hexo.extend.filter.register('after_render:html', function(str, data) {
            debugLog(`[Mermaid] after_render:html called for: ${data.path || 'unknown'}, store size: ${base64Store.size}`);
            debugLog(`[Mermaid] HTML contains MERMAID_BASE64_: ${str.includes('MERMAID_BASE64_')}`);
            debugLog(`[Mermaid] HTML contains &#x2F;: ${str.includes('&#x2F;')}`);
            debugLog(`[Mermaid] HTML contains &#x2f;: ${str.includes('&#x2f;')}`);
            if (str.includes('MERMAID_BASE64_')) {
                debugLog(`[Mermaid] Looking for base64 blocks in ${data.path || 'unknown'}`);
                const matchCount = (str.match(/<pre[^>]*><code[^>]*class="[^"]*language-(MERMAID_BASE64_\d+)[^"]*">/g) || []).length;
                debugLog(`[Mermaid] Found ${matchCount} base64 blocks to process`);
                
                str = str.replace(/<pre[^>]*><code[^>]*class="[^"]*language-(MERMAID_BASE64_\d+)[^"]*">([\s\S]*?)<\/code><\/pre>/g, (match, id, encodedContent) => {
                    const stored = base64Store.get(id);
                    
                    // Test: Log original encoded content to check for &#x2F;
                    debugLog(`[Mermaid] Original encoded content: ${encodedContent.substring(0, 100)}...`);
                    debugLog(`[Mermaid] Contains &#x2F;: ${encodedContent.includes('&#x2F;')}`);
                    debugLog(`[Mermaid] Contains &#x2f;: ${encodedContent.includes('&#x2f;')}`);
                    
                    const decoded = encodedContent
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&#x3D;/g, '=')
                        .replace(/&#x2F;/g, '/')
                        .replace(/&#x2f;/gi, '/')
                        .replace(/&#x2B;/g, '+')
                        .replace(/&#x20;/g, ' ')
                        .replace(/&#x0A;/g, '\n')
                        .replace(/\s+/g, '')
                        .trim();
                    const storedNormalized = stored ? stored.trim() : '';
                    
                    // Enhanced debugging
                    debugLog(`[Mermaid] Found ${id}: stored=${storedNormalized.length}, decoded=${decoded.length}`);
                    debugLog(`[Mermaid] Length match: ${storedNormalized.length === decoded.length}`);
                    debugLog(`[Mermaid] Content match: ${storedNormalized === decoded}`);
                    
                    if (storedNormalized.length !== decoded.length) {
                        debugLog(`[Mermaid] Length mismatch - stored: '${storedNormalized.substring(0, 50)}...'`);
                        debugLog(`[Mermaid] Length mismatch - decoded: '${decoded.substring(0, 50)}...'`);
                    }
                    
                    if (stored && storedNormalized === decoded) {
                        const decodedContent = Buffer.from(stored, 'base64').toString('utf8');
                        debugLog(`[Mermaid] Successfully decoded block ${id}`);
                        return `<div class="mermaid">${decodedContent}</div>`;
                    }
                    
                    debugLog(`[Mermaid] Block ${id} not found or content mismatch`);
                    return match;
                });
            }
            return str;
        }, hexo.config.mermaid.priority + 1);
    }
    
    if (hexo.config.mermaid.render_mode === 'live') {
        hexo.extend.filter.register('after_render:html', function(str, data) {
            const before = str;
            str = str.replace(/<!--(MERMAID_PLACEHOLDER_\d+)-->/g, (match, id) => {
                const content = mermaidStore.get(id);
                if (content) {
                    debugLog(`[Mermaid] Tag placeholder ${id} restored`);
                    return `<div class="mermaid">${content}</div>`;
                }
                return match;
            });
            if (before !== str) {
                debugLog(`[Mermaid] Processed tag placeholders in ${data.path || 'unknown'}`);
            }
            return str;
        }, 100);
    }

}
