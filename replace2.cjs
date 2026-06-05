const fs = require('fs');
const files = ['/src/components/assets/CashList.tsx', '/src/components/assets/CashForm.tsx', '/src/components/assets/AssetsView.tsx'];

files.forEach(file => {
  const p = process.cwd() + file;
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/emerald/g, 'deposit');
    // Also change rgba(16,185,129 to rgba(20,184,166
    content = content.replace(/16,\s*185,\s*129/g, '20,184,166');
    fs.writeFileSync(p, content);
  }
});
