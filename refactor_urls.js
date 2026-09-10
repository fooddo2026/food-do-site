const fs = require('fs');
const path = require('path');

const apps = ['admin-portal', 'student-portal'];
const searchStr = 'http://localhost:3000';

function getRelativePathToConfig(filePath, appDir) {
  const configPath = path.join(appDir, 'src', 'config.ts');
  let relativePath = path.relative(path.dirname(filePath), configPath);
  if (relativePath.endsWith('.ts')) {
    relativePath = relativePath.slice(0, -3); // remove .ts
  }
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  return relativePath;
}

function processDirectory(dir, appDir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath, appDir);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes(searchStr)) {
        console.log(`Processing: ${fullPath}`);
        
        // 1. Add import
        const relativeConfigPath = getRelativePathToConfig(fullPath, appDir).replace(/\\/g, '/');
        const importStr = `import { API_BASE_URL } from '${relativeConfigPath}';\n`;
        
        // Find last import
        const importRegex = /^import\s+.*?;?\s*$/gm;
        let lastMatch = null;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          lastMatch = match;
        }
        
        if (lastMatch) {
          const insertIndex = lastMatch.index + lastMatch[0].length;
          content = content.slice(0, insertIndex) + '\n' + importStr + content.slice(insertIndex);
        } else {
          content = importStr + content;
        }

        // 2. Replace URLs
        // Case A: Socket.io connection io('http://localhost:3000') or io("http://localhost:3000")
        content = content.replace(/io\(['"]http:\/\/localhost:3000['"]\)/g, 'io(API_BASE_URL)');

        // Case B: Single quotes 'http://localhost:3000/api/...' -> `${API_BASE_URL}/api/...`
        content = content.replace(/'http:\/\/localhost:3000([^']*)'/g, '`${API_BASE_URL}$1`');

        // Case C: Double quotes "http://localhost:3000/api/..." -> `${API_BASE_URL}/api/...`
        content = content.replace(/"http:\/\/localhost:3000([^"]*)"/g, '`${API_BASE_URL}$1`');

        // Case D: Template literals `http://localhost:3000/api/...` -> `${API_BASE_URL}/api/...`
        content = content.replace(/`http:\/\/localhost:3000([^`]*)`/g, '`${API_BASE_URL}$1`');

        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

const rootDir = process.cwd();
for (const app of apps) {
  const appDir = path.join(rootDir, app);
  const srcDir = path.join(appDir, 'src');
  if (fs.existsSync(srcDir)) {
    processDirectory(srcDir, appDir);
  }
}
console.log('Refactoring complete.');
