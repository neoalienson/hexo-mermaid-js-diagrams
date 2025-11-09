"use strict";
/* global hexo */

const hexo = global.hexo

module.exports = (content, controls, diagramDraggable, width, debug)=>{
    return (async () => {
        const path = require('path');
        const puppeteer = require('puppeteer');
        
        let browser = await puppeteer.launch(hexo.config.mermaid.puppeteerConfig);
        
        const page = await browser.newPage();
        page.setViewport(hexo.config.mermaid.defaultViewport);

        await page.goto(`file://${path.join(__dirname, 'index.html')}`);
        await page.evaluate(`document.body.style.background = '${hexo.config.mermaid.backgroundColor}'`);
        
        //TODO
        let mermaidConfig = { 
            theme:hexo.config.mermaid.theme
        };
        let css;

        await page.$eval('#container', (container, definition, mermaidConfig, css) => {
            container.innerHTML = definition;
            window.mermaid.initialize(mermaidConfig);
            window.mermaid.init(undefined, container);
        }, content, mermaidConfig, css);
        const svg = await page.$eval('#container', container => container.innerHTML);

        browser.close()

        if (!controls || !controls.enable) {
            return svg;
        }

        const pos = controls.position || 'bottom-right';
        const posMap = {'top-left':'top:8px;left:8px','top-right':'top:8px;right:8px','bottom-left':'bottom:8px;left:8px','bottom-right':'bottom:8px;right:8px'};
        const posStyle = posMap[pos] || posMap['bottom-right'];
        const cursor = controls.draggable !== false ? 'move' : 'default';
        const dragScript = controls.draggable !== false ? 'let dx=0,dy=0,px=0,py=0;this.onmousedown=(e)=>{e.preventDefault();px=e.clientX;py=e.clientY;document.onmousemove=(e)=>{e.preventDefault();dx=px-e.clientX;dy=py-e.clientY;px=e.clientX;py=e.clientY;this.style.top=(this.offsetTop-dy)+"px";this.style.left=(this.offsetLeft-dx)+"px";this.style.right="auto";this.style.bottom="auto"}.bind(this);document.onmouseup=()=>{document.onmousemove=null;document.onmouseup=null}}.bind(this)' : '';

        const wrapperWidth = width || '100%';
        let html = `<div class="mermaid-wrapper" style="position:relative;width:${wrapperWidth};overflow:hidden;user-select:none">`;
        html += svg;
        html += `<div class="mermaid-controls" style="position:absolute;${posStyle};display:flex;gap:4px;z-index:10;cursor:${cursor}">`;
        if (controls.zoomIn) html += '<button data-action="zoom-in" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Zoom In">🔍</button>';
        if (controls.zoomOut) html += '<button data-action="zoom-out" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Zoom Out">🔎</button>';
        if (controls.reset) html += '<button data-action="reset" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Reset">↺</button>';
        if (controls.download) html += '<button data-action="download" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Download SVG">💾</button>';
        html += '</div>';
        let scripts = `
(function(){
    const w = document.currentScript.parentElement;
    const c = w.querySelector(".mermaid-controls");
    const s = w.querySelector("svg");
    c.addEventListener("click", function(e) {
        const btn = e.target.closest("button");
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === "zoom-in") {
            const t = s.style.transform.match(/scale\\(([\\d.]+)\\)/);
            const sc = (t ? parseFloat(t[1]) : 1) * 1.2;
            s.style.transform = "scale(" + sc + ")";
            s.style.transformOrigin = "top left";
        } else if (action === "zoom-out") {
            const t = s.style.transform.match(/scale\\(([\\d.]+)\\)/);
            const sc = (t ? parseFloat(t[1]) : 1) / 1.2;
            s.style.transform = "scale(" + sc + ")";
            s.style.transformOrigin = "top left";
        } else if (action === "reset") {
            s.style.transform = "";
            s.style.transformOrigin = "top left";
        } else if (action === "download") {
            const clone = s.cloneNode(true);
            clone.removeAttribute("style");
            const svgStr = clone.outerHTML.replace(/<br\\s*\\/?>/gi, "").replace(/<\\/p>/gi, "").replace(/&nbsp;/gi, "&#160;");
            const b = new Blob([svgStr], {type: "image/svg+xml"});
            const u = URL.createObjectURL(b);
            const a = document.createElement("a");
            a.href = u;
            a.download = "mermaid-diagram.svg";
            a.click();
            URL.revokeObjectURL(u);
        }
    });
`;
        if (controls.draggable !== false) {
            scripts += `    let dx=0, dy=0, px=0, py=0;
    c.onmousedown = (e) => {
        e.preventDefault();
        px = e.clientX;
        py = e.clientY;
        document.onmousemove = (e) => {
            e.preventDefault();
            dx = px - e.clientX;
            dy = py - e.clientY;
            px = e.clientX;
            py = e.clientY;
            c.style.top = (c.offsetTop - dy) + "px";
            c.style.left = (c.offsetLeft - dx) + "px";
            c.style.right = "auto";
            c.style.bottom = "auto";
        };
        document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
`;
        }
        scripts += `})();`;
        if (diagramDraggable !== false) {
            if (debug) {
                scripts += `
(function(){
    console.log("[Mermaid Debug] Script executing");
    const w = document.currentScript.parentElement;
    console.log("[Mermaid Debug] Wrapper:", w);
    const s = w.querySelector("svg");
    if (!s) {
        console.log("[Mermaid Debug] SVG not found");
        return;
    }
    console.log("[Mermaid Debug] Init", {wrapper: w, svg: s});
    w.style.cursor = "grab";
    s.style.userSelect = "none";
    s.style.position = "relative";
    let tx=0, ty=0, px=0, py=0, sc=1, dragging=false;
    console.log("[Mermaid Debug] Adding listeners");
    w.addEventListener("mousedown", function(e) {
        console.log("[Mermaid Debug] Mousedown event", e.target);
        if (e.target.closest(".mermaid-controls") || e.target.closest("button")) {
            console.log("[Mermaid Debug] Ignored controls");
            return;
        }
        dragging = true;
        w.style.cursor = "grabbing";
        e.preventDefault();
        px = e.clientX;
        py = e.clientY;
        const t = s.style.transform.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);
        if (t) {
            tx = parseFloat(t[1]);
            ty = parseFloat(t[2]);
        }
        const scaleMatch = s.style.transform.match(/scale\(([\d.]+)\)/);
        if (scaleMatch) sc = parseFloat(scaleMatch[1]);
        console.log("[Mermaid Debug] Mousedown", {px, py, tx, ty, sc, dragging});
    });
    document.addEventListener("mousemove", function(e) {
        if (!dragging) return;
        e.preventDefault();
        const dx = e.clientX - px;
        const dy = e.clientY - py;
        const nt = tx + dx;
        const nty = ty + dy;
        const scaleStr = sc !== 1 ? " scale(" + sc + ")" : "";
        s.style.transform = "translate(" + nt + "px, " + nty + "px)" + scaleStr;
        s.style.transformOrigin = "top left";
        console.log("[Mermaid Debug] Mousemove", {dx, dy, tx: nt, ty: nty, sc});
    });
    document.addEventListener("mouseup", function() {
        if (dragging) {
            console.log("[Mermaid Debug] Mouseup");
            const t = s.style.transform.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);
            if (t) {
                tx = parseFloat(t[1]);
                ty = parseFloat(t[2]);
            }
            dragging = false;
            w.style.cursor = "grab";
        }
    });
})();`;
            } else {
                scripts += `
(function(){
    const w = document.currentScript.parentElement;
    const s = w.querySelector("svg");
    if (!s) return;
    w.style.cursor = "grab";
    s.style.userSelect = "none";
    s.style.position = "relative";
    let tx=0, ty=0, px=0, py=0, sc=1, dragging=false;
    w.addEventListener("mousedown", function(e) {
        if (e.target.closest(".mermaid-controls") || e.target.closest("button")) return;
        dragging = true;
        w.style.cursor = "grabbing";
        e.preventDefault();
        px = e.clientX;
        py = e.clientY;
        const t = s.style.transform.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);
        if (t) {
            tx = parseFloat(t[1]);
            ty = parseFloat(t[2]);
        }
        const scaleMatch = s.style.transform.match(/scale\(([\d.]+)\)/);
        if (scaleMatch) sc = parseFloat(scaleMatch[1]);
    });
    document.addEventListener("mousemove", function(e) {
        if (!dragging) return;
        e.preventDefault();
        const dx = e.clientX - px;
        const dy = e.clientY - py;
        const nt = tx + dx;
        const nty = ty + dy;
        const scaleStr = sc !== 1 ? " scale(" + sc + ")" : "";
        s.style.transform = "translate(" + nt + "px, " + nty + "px)" + scaleStr;
        s.style.transformOrigin = "top left";
    });
    document.addEventListener("mouseup", function() {
        if (dragging) {
            const t = s.style.transform.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);
            if (t) {
                tx = parseFloat(t[1]);
                ty = parseFloat(t[2]);
            }
            dragging = false;
            w.style.cursor = "grab";
        }
    });
})();`;
            }
        }
        html += `<script>${scripts}</script>`;
        html += '</div>';

        return html;
    })(content)
}
