const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// --- Extract SVGs from the hidden div ---
const hiddenDivRegex = /<div style="display:none">([\s\S]*?)\n<\/div>/;
const hiddenMatch = html.match(hiddenDivRegex);

if (!hiddenMatch) {
  console.error('Could not find hidden <div style="display:none"> block');
  process.exit(1);
}

const hiddenContent = hiddenMatch[1];

// Parse all SVGs from the hidden div into a map: id -> svg markup (without the id attribute)
const svgMap = {};
const svgRegex = /<svg\s+id="(svg-[^"]+)"([^>]*)>([\s\S]*?)<\/svg>/g;
let match;
while ((match = svgRegex.exec(hiddenContent)) !== null) {
  const id = match[1];
  const restAttrs = match[2];
  const innerContent = match[3];
  // Rebuild SVG without the id attribute
  const svgTag = `<svg${restAttrs}>${innerContent}</svg>`;
  svgMap[id] = svgTag;
}

console.log(`Found ${Object.keys(svgMap).length} SVGs in hidden div:`, Object.keys(svgMap).join(', '));

// --- Fallback SVGs for IDs not in the hidden div ---
const fallbackSvgs = {
  'svg-logo-shield': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" fill="#F0B90B"/><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" fill="none" stroke="#C4960A" stroke-width="0.5"/></svg>`,

  'svg-arrow-up': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12"><path d="M6 2L1 10h10L6 2z" fill="#0ECB81"/></svg>`,

  'svg-arrow-down': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12"><path d="M6 10L1 2h10L6 10z" fill="#F6465D"/></svg>`,

  'svg-test-tube': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20"><path d="M7 2h6v1H7V2zm1 1v8l-3 5a2 2 0 002 2h6a2 2 0 002-2l-3-5V3H8z" fill="#F0B90B"/><rect x="8" y="2" width="4" height="1.5" rx="0.5" fill="#C4960A"/><ellipse cx="10" cy="14" rx="3" ry="1.5" fill="#D4A20A" opacity="0.5"/></svg>`,

  'svg-lightning-bolt': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M9 1L3 9h4l-1 6 6-8H8l1-6z" fill="#F0B90B"/></svg>`,
};

// --- Replace all <!-- SVG:svg-xxx --> placeholders ---
const placeholderRegex = /<!-- SVG:(svg-[a-z0-9-]+) -->/g;
let replacementCount = 0;
let missingIds = [];

html = html.replace(placeholderRegex, (fullMatch, svgId) => {
  if (svgMap[svgId]) {
    replacementCount++;
    return svgMap[svgId];
  } else if (fallbackSvgs[svgId]) {
    replacementCount++;
    return fallbackSvgs[svgId];
  } else {
    missingIds.push(svgId);
    console.warn(`WARNING: No SVG found for placeholder "${svgId}"`);
    return fullMatch; // leave as-is
  }
});

console.log(`Replaced ${replacementCount} SVG placeholders`);
if (missingIds.length > 0) {
  console.warn(`Missing SVGs (left as comments): ${missingIds.join(', ')}`);
}

// --- Remove the entire hidden div block ---
html = html.replace(hiddenDivRegex, '');
console.log('Removed hidden SVG div');

// --- Write back ---
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Done! index.html updated.');
