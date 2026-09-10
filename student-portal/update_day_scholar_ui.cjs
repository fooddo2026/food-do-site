const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/StudentPortal.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Move menu outside HOSTELER check in Desktop Sidebar
content = content.replace(
  /<button onClick=\{\(\) => setActiveTab\('menu'\)\} className=\{navItemClass\('menu'\)\}>\s*<Utensils className="w-5 h-5" \/>\s*Today's Menu\s*<\/button>/g,
  ''
);

content = content.replace(
  /\{studentType === 'DAY_SCHOLAR' && \(/g,
  `<button onClick={() => setActiveTab('menu')} className={navItemClass('menu')}>\n              <Utensils className="w-5 h-5" />\n              Today's Menu\n            </button>\n            {studentType === 'DAY_SCHOLAR' && (`
);


// 2. Add menu to Mobile Nav
// The mobile nav has:
/*
          {studentType === 'HOSTELER' ? (
            <>
              <button onClick={() => setActiveTab('qr')} ...>
              <button onClick={() => setActiveTab('history')} ...>
            </>
          ) : (
            <button onClick={() => setActiveTab('tokens')} ...>
          )}
*/
// Let's inject Menu button right before profile button in mobile nav
const mobileMenuBtn = `
          <button
            onClick={() => setActiveTab('menu')}
            className={\`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer \${activeTab === 'menu' ? 'text-primary' : 'text-gray-400'
              }\`}
          >
            <Utensils className="w-4 h-4" />
            <span>Menu</span>
          </button>
`;
content = content.replace(
  /<button\s*onClick=\{\(\) => setActiveTab\('profile'\)\}\s*className=\{\`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer \$\{activeTab === 'profile' \? 'text-primary' : 'text-gray-400'/g,
  `${mobileMenuBtn}\n          <button\n            onClick={() => setActiveTab('profile')}\n            className={\`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer \${activeTab === 'profile' ? 'text-primary' : 'text-gray-400'`
);


// 3. Fix Dashboard "Quick Summary deck grid" logic for Day Scholar
// We want: 
// - If HOSTELER: lg:col-span-8 for menu, and show the lg:col-span-4 stat summary
// - If DAY_SCHOLAR: lg:col-span-12 for menu, and hide the lg:col-span-4 stat summary

content = content.replace(
  /className=\{\`lg:col-span-8 p-6 rounded-3xl border \$\{isDark \? 'bg-slate-900 border-white\/5' : 'bg-white border-gray-100 shadow-sm'\s*\}\`\}/g,
  `className={\`\${studentType === 'HOSTELER' ? 'lg:col-span-8' : 'lg:col-span-12'} p-6 rounded-3xl border \${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'\n                  }\`}`
);

// Wrap Stat summary cards with HOSTELER condition
content = content.replace(
  /\{\/\* Stat summary cards \*\/\}\s*<div className=\{\`lg:col-span-4 p-6 rounded-3xl border flex flex-col justify-between/g,
  `{/* Stat summary cards */}\n                {studentType === 'HOSTELER' && (\n                <div className={\`lg:col-span-4 p-6 rounded-3xl border flex flex-col justify-between`
);

content = content.replace(
  /8 Meals\s*<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/g,
  `8 Meals\n                      </span>\n                    </div>\n                  </div>\n                </div>\n                )}`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated Day Scholar UI logic');
