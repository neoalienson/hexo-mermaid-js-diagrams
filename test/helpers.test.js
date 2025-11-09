const assert = require('assert');
const { generateStyles, generateLiveScript } = require('../lib/helpers');
const { JSDOM } = require('jsdom');

describe('Helper Functions', () => {
    describe('generateStyles', () => {
        it('should generate valid CSS', () => {
            const result = generateStyles('100%', 'bottom:8px;right:8px', 'move');
            assert(result.includes('.mermaid-wrapper'));
            assert(result.includes('width:100%'));
            assert(result.includes('bottom:8px;right:8px'));
            assert(result.includes('cursor:move'));
        });
    });

    describe('generateLiveScript', () => {
        it('should generate script with all controls', () => {
            const controls = { zoomIn: true, zoomOut: true, reset: true, download: true, draggable: true };
            const result = generateLiveScript(controls, true, false);
            assert(result.includes('<script>'));
            assert(result.includes('zoom-in'));
            assert(result.includes('zoom-out'));
            assert(result.includes('reset'));
            assert(result.includes('download'));
        });

        it('should not include disabled controls', () => {
            const controls = { zoomIn: false, zoomOut: false, reset: false, download: false, draggable: false };
            const result = generateLiveScript(controls, false, false);
            assert(!result.includes('zi.dataset.action'));
            assert(!result.includes('zo.dataset.action'));
        });

        it('should include debug logs when debug is true', () => {
            const controls = { zoomIn: true, zoomOut: true, reset: true, download: true, draggable: true };
            const result = generateLiveScript(controls, true, true);
            assert(result.includes('console.log'));
            assert(result.includes('[Mermaid Debug]'));
        });

        it('should not have syntax errors with special characters', () => {
            const controls = { zoomIn: true, zoomOut: true, reset: true, download: true, draggable: true };
            const result = generateLiveScript(controls, true, false);
            assert.doesNotThrow(() => {
                new Function(result.replace(/<script>|<\/script>/g, ''));
            });
        });

        it('should preserve zoom level after reset when dragging', (done) => {
            const controls = { zoomIn: true, zoomOut: true, reset: true, download: true, draggable: true };
            const script = generateLiveScript(controls, true, false);
            const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="mermaid"><svg></svg></div>${script}</body></html>`, { runScripts: 'dangerously' });
            const { window } = dom;
            const { document } = window;
            
            window.DOMContentLoaded = new window.Event('DOMContentLoaded');
            document.dispatchEvent(window.DOMContentLoaded);
            
            setTimeout(() => {
                const svg = document.querySelector('svg');
                const wrapper = document.querySelector('.mermaid-wrapper');
                const zoomInBtn = document.querySelector('[data-action="zoom-in"]');
                const resetBtn = document.querySelector('[data-action="reset"]');
                
                zoomInBtn.click();
                assert(svg.style.transform.includes('scale(1.2)'));
                
                const mousedown = new window.MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true });
                wrapper.dispatchEvent(mousedown);
                const mousemove = new window.MouseEvent('mousemove', { clientX: 150, clientY: 150, bubbles: true });
                document.dispatchEvent(mousemove);
                const mouseup = new window.MouseEvent('mouseup', { bubbles: true });
                document.dispatchEvent(mouseup);
                
                resetBtn.click();
                assert.strictEqual(svg.style.transform, '');
                
                const mousedown2 = new window.MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true });
                wrapper.dispatchEvent(mousedown2);
                const mousemove2 = new window.MouseEvent('mousemove', { clientX: 120, clientY: 120, bubbles: true });
                document.dispatchEvent(mousemove2);
                
                const hasScale = svg.style.transform.includes('scale');
                assert(!hasScale || svg.style.transform.includes('scale(1)'));
                done();
            }, 150);
        });

        it('should reset drag position after reset', (done) => {
            const controls = { zoomIn: true, zoomOut: true, reset: true, download: true, draggable: true };
            const script = generateLiveScript(controls, true, false);
            const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="mermaid"><svg></svg></div>${script}</body></html>`, { runScripts: 'dangerously' });
            const { window } = dom;
            const { document } = window;
            
            window.DOMContentLoaded = new window.Event('DOMContentLoaded');
            document.dispatchEvent(window.DOMContentLoaded);
            
            setTimeout(() => {
                const svg = document.querySelector('svg');
                const wrapper = document.querySelector('.mermaid-wrapper');
                const resetBtn = document.querySelector('[data-action="reset"]');
                
                const mousedown = new window.MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true });
                wrapper.dispatchEvent(mousedown);
                const mousemove = new window.MouseEvent('mousemove', { clientX: 200, clientY: 200, bubbles: true });
                document.dispatchEvent(mousemove);
                const mouseup = new window.MouseEvent('mouseup', { bubbles: true });
                document.dispatchEvent(mouseup);
                
                assert(svg.style.transform.includes('translate'));
                
                resetBtn.click();
                assert.strictEqual(svg.style.transform, '');
                done();
            }, 150);
        });

        it('should not jump when dragging after reset', (done) => {
            const controls = { zoomIn: true, zoomOut: true, reset: true, download: true, draggable: true };
            const script = generateLiveScript(controls, true, false);
            const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="mermaid"><svg></svg></div>${script}</body></html>`, { runScripts: 'dangerously' });
            const { window } = dom;
            const { document } = window;
            
            window.DOMContentLoaded = new window.Event('DOMContentLoaded');
            document.dispatchEvent(window.DOMContentLoaded);
            
            setTimeout(() => {
                const svg = document.querySelector('svg');
                const wrapper = document.querySelector('.mermaid-wrapper');
                const zoomInBtn = document.querySelector('[data-action="zoom-in"]');
                const resetBtn = document.querySelector('[data-action="reset"]');
                
                const mousedown = new window.MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true });
                wrapper.dispatchEvent(mousedown);
                const mousemove = new window.MouseEvent('mousemove', { clientX: 200, clientY: 200, bubbles: true });
                document.dispatchEvent(mousemove);
                const mouseup = new window.MouseEvent('mouseup', { bubbles: true });
                document.dispatchEvent(mouseup);
                
                zoomInBtn.click();
                
                resetBtn.click();
                assert.strictEqual(svg.style.transform, '');
                
                const mousedown2 = new window.MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true });
                wrapper.dispatchEvent(mousedown2);
                const mousemove2 = new window.MouseEvent('mousemove', { clientX: 60, clientY: 60, bubbles: true });
                document.dispatchEvent(mousemove2);
                
                const match = svg.style.transform.match(/translate\(([\d.-]+)px, ([\d.-]+)px\)/);
                assert(match);
                assert.strictEqual(parseFloat(match[1]), 10);
                assert.strictEqual(parseFloat(match[2]), 10);
                done();
            }, 150);
        });

        it('should include fullscreen button', () => {
            const controls = { zoomIn: true, zoomOut: true, reset: true, download: true, draggable: true };
            const result = generateLiveScript(controls, true, false);
            assert(result.includes('fullscreen'));
            assert(result.includes('⛶'));
            assert(result.includes('✕'));
            assert(result.includes("c.style.top=''"));
        });
    });
});


