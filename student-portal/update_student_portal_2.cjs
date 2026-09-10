const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/StudentPortal.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import for SurplusTokens
content = content.replace(
  /import \{ QRCodeSVG \} from 'qrcode.react';/,
  `import { QRCodeSVG } from 'qrcode.react';\nimport SurplusTokens from '../components/SurplusTokens';`
);

// 2. Replace the Tokens UI placeholder
const startStr = `{/* ======================================= */}\n          {/* TAB: SURPLUS TOKENS                     */}\n          {/* ======================================= */}\n          {activeTab === 'tokens' && (`
const regex = new RegExp(`\\{\\/\\* ======================================= \\*\\/\\}\\s*\\{\\/\\* TAB: SURPLUS TOKENS                     \\*\\/\\}\\s*\\{\\/\\* ======================================= \\*\\/\\}\\s*\\{activeTab === 'tokens' && \\([\\s\\S]*?\\)\\}`);

content = content.replace(
  regex,
  `{/* ======================================= */}\n          {/* TAB: SURPLUS TOKENS                     */}\n          {/* ======================================= */}\n          {activeTab === 'tokens' && (\n            <SurplusTokens isDark={isDark} />\n          )}`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated StudentPortal.tsx to use SurplusTokens component');
