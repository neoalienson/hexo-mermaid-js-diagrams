const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Mock fs.readFileSync for tests
const originalReadFileSync = fs.readFileSync;
fs.readFileSync = (filePath, encoding) => {
  if (filePath.includes('mermaid.min.js')) {
    return 'console.log("mocked mermaid");';
  }
  return originalReadFileSync(filePath, encoding);
};

// Mock hexo object
const mockHexo = {
  config: {
    mermaid: {
      enable: true,
      renderMode: 'puppeteer',
      theme: 'default'
    }
  },
  extend: {
    tag: {
      register: function(name, fn, options) {
        this.registeredTags = this.registeredTags || {};
        this.registeredTags[name] = { fn, options };
      }
    },
    injector: {
      register: function(position, fn) {
        this.registeredInjectors = this.registeredInjectors || {};
        this.registeredInjectors[position] = fn;
      }
    }
  }
};

global.hexo = mockHexo;

describe('hexo-mermaid-js-diagrams', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('../index.js')];
    mockHexo.extend.tag.registeredTags = {};
    mockHexo.extend.injector.registeredInjectors = {};
  });

  it('should register mermaid tag in puppeteer mode', () => {
    mockHexo.config.mermaid.renderMode = 'puppeteer';
    require('../index.js');
    
    assert(mockHexo.extend.tag.registeredTags.mermaid);
    assert.equal(mockHexo.extend.tag.registeredTags.mermaid.options.async, true);
    assert.equal(mockHexo.extend.tag.registeredTags.mermaid.options.ends, true);
  });

  it('should register mermaid tag in live mode', () => {
    mockHexo.config.mermaid.renderMode = 'live';
    require('../index.js');
    
    assert(mockHexo.extend.tag.registeredTags.mermaid);
  });

  it('should return div wrapper in live mode', async () => {
    mockHexo.config.mermaid.renderMode = 'live';
    require('../index.js');
    
    const tagFn = mockHexo.extend.tag.registeredTags.mermaid.fn;
    const result = await tagFn([], 'graph TD; A-->B;');
    
    assert.equal(result, '<div class="mermaid">graph TD; A-->B;</div>');
  });

  it('should use builder in puppeteer mode', async () => {
    mockHexo.config.mermaid.renderMode = 'puppeteer';
    
    // Mock builder to avoid puppeteer dependency in tests
    const originalBuilder = require('../builder');
    require.cache[require.resolve('../builder')] = {
      exports: () => Promise.resolve('<svg>mocked</svg>')
    };
    
    require('../index.js');
    
    const tagFn = mockHexo.extend.tag.registeredTags.mermaid.fn;
    const result = await tagFn([], 'graph TD; A-->B;');
    
    assert.equal(result, '<svg>mocked</svg>');
  });
});