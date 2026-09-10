const fs = require('fs');
const path = require('path');

// ============================================
// 1. Update Welcome.tsx
// ============================================
const welcomePath = path.join(__dirname, 'src/pages/auth/Welcome.tsx');
let welcomeContent = fs.readFileSync(welcomePath, 'utf-8');

// Add useState to import
welcomeContent = welcomeContent.replace(
  /import React from 'react';/,
  "import React, { useState } from 'react';"
);

// Add state and role selection UI
const newWelcomeComponent = `const Welcome: React.FC<WelcomeProps> = ({ onNavigate }) => {
  const [selectedRole, setSelectedRole] = useState<'HOSTELER' | 'DAY_SCHOLAR' | null>(() => {
    return localStorage.getItem('student_identity_preference') as 'HOSTELER' | 'DAY_SCHOLAR' | null;
  });

  const handleRoleSelection = (role: 'HOSTELER' | 'DAY_SCHOLAR') => {
    localStorage.setItem('student_identity_preference', role);
    setSelectedRole(role);
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans text-slate-100 selection:bg-orange-500 selection:text-white">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-95 contrast-105 pointer-events-none" style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }} />
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="absolute w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[130px] pointer-events-none animate-pulse" />
        
        <div className="w-full max-w-2xl p-8 sm:p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl relative z-10 mx-4 text-center">
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2 drop-shadow-lg">Select Your Identity</h1>
          <p className="text-slate-200 text-sm mb-10 font-medium">Please select whether you are a Hosteler or a Day Scholar to continue to your customized portal.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={() => handleRoleSelection('HOSTELER')}
              className="p-8 rounded-3xl bg-black/50 border border-white/20 hover:border-orange-500 hover:bg-orange-500/10 transition-all cursor-pointer group flex flex-col items-center justify-center gap-4 shadow-xl"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🏢
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-orange-400">Hosteler</h3>
                <p className="text-xs text-slate-300 mt-2 font-medium">I live in the college hostel and access the mess regularly.</p>
              </div>
            </button>
            
            <button
              onClick={() => handleRoleSelection('DAY_SCHOLAR')}
              className="p-8 rounded-3xl bg-black/50 border border-white/20 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all cursor-pointer group flex flex-col items-center justify-center gap-4 shadow-xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🎒
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400">Day Scholar</h3>
                <p className="text-xs text-slate-300 mt-2 font-medium">I commute to college and want to access surplus food tokens.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }
`;

welcomeContent = welcomeContent.replace(
  /const Welcome: React\.FC<WelcomeProps> = \(\{ onNavigate \}\) => \{/g,
  newWelcomeComponent
);

welcomeContent = welcomeContent.replace(
  /Welcome to <span className="text-orange-400">FOOD-DO<\/span>/g,
  `Welcome to <span className="text-orange-400">FOOD-DO</span><br/><span className="text-xl text-white/80">{selectedRole === 'HOSTELER' ? 'Hosteler Portal' : 'Day Scholar Portal'}</span>`
);

welcomeContent = welcomeContent.replace(
  /<div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-500 shadow-xl shadow-orange-500\/40 mb-6">/g,
  `<div className="flex justify-between items-center mb-6">
          <button onClick={() => { localStorage.removeItem('student_identity_preference'); setSelectedRole(null); }} className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1 cursor-pointer transition-colors bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
             ← Change Identity
          </button>
        </div>
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-500 shadow-xl shadow-orange-500/40 mb-6">`
);


fs.writeFileSync(welcomePath, welcomeContent, 'utf-8');


// ============================================
// 2. Update Signup.tsx
// ============================================
const signupPath = path.join(__dirname, 'src/pages/auth/Signup.tsx');
let signupContent = fs.readFileSync(signupPath, 'utf-8');

// Update useState for studentType
signupContent = signupContent.replace(
  /const \[studentType, setStudentType\] = useState<'HOSTELER' \| 'DAY_SCHOLAR'>\('HOSTELER'\);/g,
  `const [studentType, setStudentType] = useState<'HOSTELER' | 'DAY_SCHOLAR'>(() => {
    return (localStorage.getItem('student_identity_preference') as 'HOSTELER' | 'DAY_SCHOLAR') || 'HOSTELER';
  });`
);

// Remove the Student Type radio buttons completely
// We need to carefully remove the block from <div className="mb-4"> down to the closing </div> of that block
const blockToReplace = `<div className="mb-4">
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Student Type</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStudentType('HOSTELER')}
                    className={\`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all shadow-md \${
                      studentType === 'HOSTELER'
                        ? 'border-orange-400 bg-orange-600/70 text-white'
                        : 'border-white/40 bg-black/75 text-white/70 hover:border-white/60 hover:text-white'
                    }\`}
                  >
                    Hosteler
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentType('DAY_SCHOLAR')}
                    className={\`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all shadow-md \${
                      studentType === 'DAY_SCHOLAR'
                        ? 'border-emerald-400 bg-emerald-600/70 text-white'
                        : 'border-white/40 bg-black/75 text-white/70 hover:border-white/60 hover:text-white'
                    }\`}
                  >
                    Day Scholar
                  </button>
                </div>
              </div>`;

// Since regex across multiple lines with whitespace is tricky, we'll just find the label and the enclosing div and replace it using string split/join or indexOf
const startIndex = signupContent.indexOf('<div className="mb-4">\\n                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Student Type</label>');
if (startIndex !== -1) {
  // Find the end of this block. It ends with `Day Scholar</button></div></div>`
  const endIndexStr = 'Day Scholar\n                  </button>\n                </div>\n              </div>';
  const endIndex = signupContent.indexOf(endIndexStr);
  if (endIndex !== -1) {
    const before = signupContent.substring(0, startIndex);
    const after = signupContent.substring(endIndex + endIndexStr.length);
    signupContent = before + after;
  }
} else {
  // Try regex if the exact string matching fails due to spaces
  signupContent = signupContent.replace(
    /<div className="mb-4">\s*<label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 drop-shadow-\[0_1px_2px_rgba\(0,0,0,0\.9\)\]">Student Type<\/label>[\s\S]*?Day Scholar\s*<\/button>\s*<\/div>\s*<\/div>/g,
    ''
  );
}

fs.writeFileSync(signupPath, signupContent, 'utf-8');

console.log('Successfully updated Auth Flow to include Identity Selection UPFRONT!');
