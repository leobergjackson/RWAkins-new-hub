const fs = require('fs');
const files = [
  'app/agents/page.tsx',
  'app/credit/page.tsx',
  'app/legacy/page.tsx',
  'app/lend/page.tsx',
  'app/treasury/page.tsx',
  'app/vault/page.tsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\`/g, '\`');
  content = content.replace(/\\\$\{/g, '${');
  fs.writeFileSync(file, content);
}
console.log('Fixed escaped template literals in all files.');
