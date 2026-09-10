const fs = require('fs');
const path = require('path');

// ==========================================
// 1. Update Login.tsx
// ==========================================
const loginPath = path.join(__dirname, 'src/pages/auth/Login.tsx');
let loginContent = fs.readFileSync(loginPath, 'utf-8');

// Insert cross-portal validation after parsing the backend JSON
const validationCheck = `
      const selectedIdentity = localStorage.getItem('student_identity_preference');
      const actualType = data.user?.studentType || localUser.studentType || 'HOSTELER';
      if (selectedIdentity && selectedIdentity !== actualType) {
        throw new Error(\`Access Denied: Your account is registered as a \${actualType === 'HOSTELER' ? 'Hosteler' : 'Day Scholar'}. Please go back and select the correct portal.\`);
      }
`;

// Also for offline mode
const offlineValidationCheck = `
        const selectedIdentity = localStorage.getItem('student_identity_preference');
        const actualType = localUser.studentType || 'HOSTELER';
        if (selectedIdentity && selectedIdentity !== actualType) {
          setError(\`Access Denied: Your account is registered as a \${actualType === 'HOSTELER' ? 'Hosteler' : 'Day Scholar'}. Please go back and select the correct portal.\`);
          setLoading(false);
          return;
        }
`;

loginContent = loginContent.replace(
  /const localUser = findRegisteredUser\(email\) \|\| \{\};/,
  `${validationCheck}\n      const localUser = findRegisteredUser(email) || {};`
);

loginContent = loginContent.replace(
  /if \(!localUser\) \{/,
  `${offlineValidationCheck}\n        if (!localUser) {`
);

fs.writeFileSync(loginPath, loginContent, 'utf-8');


// ==========================================
// 2. Update StudentPortal.tsx
// ==========================================
const portalPath = path.join(__dirname, 'src/pages/StudentPortal.tsx');
let portalContent = fs.readFileSync(portalPath, 'utf-8');

// Ensure SurplusTokens is imported
if (!portalContent.includes('import SurplusTokens')) {
  portalContent = portalContent.replace(
    /import React, \{ useState, useEffect \} from 'react';/,
    "import React, { useState, useEffect } from 'react';\nimport SurplusTokens from '../components/SurplusTokens';"
  );
}

// Replace the Welcome Day Scholar widget with SurplusTokens component
const widgetRegex = /<div className="p-8 text-center border rounded-3xl bg-orange-50 dark:bg-orange-500\/10 border-orange-200 dark:border-orange-500\/20">[\s\S]*?<\/div>/;
portalContent = portalContent.replace(widgetRegex, '<SurplusTokens isDark={isDark} />');

// Remove 'tokens' from the sidebar and mobile nav for DAY_SCHOLAR since it's now embedded in the dashboard
portalContent = portalContent.replace(
  /\{studentType === 'DAY_SCHOLAR' && \(\s*<button onClick=\{\(\) => setActiveTab\('tokens'\)\}[\s\S]*?<\/button>\s*\)\}/,
  ''
);

// Mobile Nav
const mobileTokensNav = /{studentType === 'DAY_SCHOLAR' && \(\s*<button onClick=\{\(\) => setActiveTab\('tokens'\)\}[\s\S]*?<\/button>\s*\)\}/;
// Since mobile nav was changed by my previous script to an else branch:
// ) : (
//   <button
//     onClick={() => setActiveTab('tokens')} ...
portalContent = portalContent.replace(
  /\) : \(\s*<button\s*onClick=\{\(\) => setActiveTab\('tokens'\)\}[\s\S]*?<\/button>\s*\)/,
  `) : (
    <></>
  )`
);


fs.writeFileSync(portalPath, portalContent, 'utf-8');

console.log('Successfully updated cross-portal validation and embedded SurplusTokens into Dashboard');
