// Unit test for HTML entity decoding issues
const testHtmlEntityDecoding = () => {
    const tests = [
        { name: 'Forward slash', content: 'A/B', entity: '&#x2F;', char: '/' },
        { name: 'Less than', content: 'A<B', entity: '&lt;', char: '<' },
        { name: 'Greater than', content: 'A>B', entity: '&gt;', char: '>' },
        { name: 'Ampersand', content: 'A&B', entity: '&amp;', char: '&' },
        { name: 'Quote', content: 'A"B', entity: '&quot;', char: '"' },
        { name: 'Apostrophe', content: "A'B", entity: '&#39;', char: "'" },
        { name: 'Equals', content: 'A=B', entity: '&#x3D;', char: '=' },
        { name: 'Plus', content: 'A+B', entity: '&#x2B;', char: '+' },
        { name: 'Space', content: 'A B', entity: '&#x20;', char: ' ' },
        { name: 'Newline', content: 'A\nB', entity: '&#x0A;', char: '\n' }
    ];
    
    const decodeHtml = (str) => str
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
    
    let allPassed = true;
    
    tests.forEach(test => {
        const encoded = Buffer.from(test.content).toString('base64');
        const withEntity = encoded.replace(new RegExp(test.char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), test.entity);
        const decoded = decodeHtml(withEntity);
        const passed = encoded.trim() === decoded;
        
        console.log(`${test.name}: ${passed ? 'PASS' : 'FAIL'}`);
        if (!passed) {
            console.log(`  Original: ${encoded}`);
            console.log(`  With entity: ${withEntity}`);
            console.log(`  Decoded: ${decoded}`);
            allPassed = false;
        }
    });
    
    return allPassed;
};

// Run test
console.log('Testing HTML entity decoding for all entities...');
const result = testHtmlEntityDecoding();
console.log('\nOverall result:', result ? 'ALL PASS' : 'SOME FAILED');