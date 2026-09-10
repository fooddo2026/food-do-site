const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/StudentPortal.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Ticket import
content = content.replace(
  /Edit3, Save, X/g,
  'Edit3, Save, X, Ticket'
);

// 2. Add tokens to activeTab
content = content.replace(
  /'dashboard' \| 'qr' \| 'history' \| 'menu' \| 'attendance' \| 'leave' \| 'feedback' \| 'profile' \| 'settings'/g,
  "'dashboard' | 'qr' | 'history' | 'menu' | 'attendance' | 'leave' | 'feedback' | 'profile' | 'settings' | 'tokens'"
);

// 3. Add studentType state
content = content.replace(
  /const \[messAssociation, setMessAssociation\] = useState<string>\(\s*initialUser\?\.mess \|\| initialUser\?\.student\?\.mess \|\| ''\s*\);/g,
  `const [messAssociation, setMessAssociation] = useState<string>(\n    initialUser?.mess || initialUser?.student?.mess || ''\n  );\n  const [studentType, setStudentType] = useState<'HOSTELER' | 'DAY_SCHOLAR'>(\n    initialUser?.studentType || initialUser?.student?.studentType || 'HOSTELER'\n  );`
);

// 4. Update sync in useEffect
content = content.replace(
  /if \(u && u\.mess\) \{\s*setMessAssociation\(u\.mess\);\s*\}/g,
  `if (u && u.mess) {\n          setMessAssociation(u.mess);\n        }\n        if (u && (u.studentType || u.student?.studentType)) {\n          setStudentType(u.studentType || u.student.studentType);\n        }`
);

// 5. Update fetchProfile sync
content = content.replace(
  /if \(data\.student\.mess\) \{\s*setMessAssociation\(data\.student\.mess\);\s*\}/g,
  `if (data.student.mess) {\n              setMessAssociation(data.student.mess);\n            }\n            if (data.student.studentType) {\n              setStudentType(data.student.studentType);\n            }`
);

// 6. Update Sidebar
content = content.replace(
  /<nav className="space-y-1\.5 pt-4">([\s\S]*?)<\/nav>/,
  `<nav className="space-y-1.5 pt-4">
            <button onClick={() => setActiveTab('dashboard')} className={navItemClass('dashboard')}>
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            {studentType === 'HOSTELER' && (
              <>
                <button onClick={() => setActiveTab('qr')} className={navItemClass('qr')}>
                  <QrCode className="w-5 h-5" />
                  My QR Pass
                </button>
                <button onClick={() => setActiveTab('history')} className={navItemClass('history')}>
                  <History className="w-5 h-5" />
                  Meal History
                </button>
                <button onClick={() => setActiveTab('menu')} className={navItemClass('menu')}>
                  <Utensils className="w-5 h-5" />
                  Today's Menu
                </button>
                <button onClick={() => setActiveTab('attendance')} className={navItemClass('attendance')}>
                  <CalendarDays className="w-5 h-5" />
                  Attendance
                </button>
                <button onClick={() => setActiveTab('leave')} className={navItemClass('leave')}>
                  <CalendarRange className="w-5 h-5" />
                  Leave Registry
                </button>
              </>
            )}
            {studentType === 'DAY_SCHOLAR' && (
              <button onClick={() => setActiveTab('tokens')} className={navItemClass('tokens')}>
                <Ticket className="w-5 h-5" />
                Surplus Tokens
              </button>
            )}
            <button onClick={() => setActiveTab('profile')} className={navItemClass('profile')}>
              <User className="w-5 h-5" />
              My Profile
            </button>
          </nav>`
);

// 7. Update Mobile Nav
content = content.replace(
  /<div className=\{\`md:hidden flex items-center justify-around py-3 px-2 border-b text-xs font-bold \$\{isDark \? 'border-white\/5 bg-slate-900' : 'border-gray-200\/60 bg-white'\s*\}\`\}>([\s\S]*?)<\/div>/,
  `<div className={\`md:hidden flex items-center justify-around py-3 px-2 border-b text-xs font-bold \${isDark ? 'border-white/5 bg-slate-900' : 'border-gray-200/60 bg-white'
          }\`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={\`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer \${activeTab === 'dashboard' ? 'text-primary' : 'text-gray-400'
              }\`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </button>

          {studentType === 'HOSTELER' ? (
            <>
              <button
                onClick={() => setActiveTab('qr')}
                className={\`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer \${activeTab === 'qr' ? 'text-primary' : 'text-gray-400'
                  }\`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pass</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={\`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer \${activeTab === 'history' ? 'text-primary' : 'text-gray-400'
                  }\`}
              >
                <History className="w-4 h-4" />
                <span>Logs</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveTab('tokens')}
              className={\`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer \${activeTab === 'tokens' ? 'text-primary' : 'text-gray-400'
                }\`}
            >
              <Ticket className="w-4 h-4" />
              <span>Tokens</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('profile')}
            className={\`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer \${activeTab === 'profile' ? 'text-primary' : 'text-gray-400'
              }\`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>`
);

// 8. Add tokens tab view right before TAB 8
const tokensTabContent = `
          {/* ======================================= */}
          {/* TAB: SURPLUS TOKENS                     */}
          {/* ======================================= */}
          {activeTab === 'tokens' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg font-semibold">Surplus Food Tokens</h3>
                <p className="text-xs text-gray-400 mt-0.5">Claim surplus food from the mess at subsidized rates.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buy Token Component */}
                <div className={\`p-6 rounded-3xl border \${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}\`}>
                  <h4 className="text-sm font-semibold mb-4 text-orange-500 flex items-center gap-2">
                    <Ticket className="w-4 h-4" /> Available Tokens Today
                  </h4>
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">Wait for the admin to release surplus tokens after the main serving time is over.</p>
                    <button className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer">
                      Check Available Tokens
                    </button>
                  </div>
                </div>

                {/* My Tokens Component */}
                <div className={\`p-6 rounded-3xl border \${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}\`}>
                  <h4 className="text-sm font-semibold mb-4 text-emerald-500 flex items-center gap-2">
                    <QrCode className="w-4 h-4" /> My Active Tokens
                  </h4>
                  <div className="space-y-4 text-center py-6">
                    <p className="text-xs text-gray-400">You don't have any active tokens.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
`;
content = content.replace(
  /\{\/\* ======================================= \*\/\}\s*\{\/\* TAB 8: STUDENT PROFILE & EDIT           \*\/\}/,
  `${tokensTabContent}\n\n          {/* ======================================= */}\n          {/* TAB 8: STUDENT PROFILE & EDIT           */}`
);

// 9. Hide Poll Popup for Day Scholars
content = content.replace(
  /\{mealPoll && \(/,
  `{mealPoll && studentType === 'HOSTELER' && (`
);

// 10. Hide dashboard rings for Day Scholars
content = content.replace(
  /\{\/\* Progress Summary Cards & Stats Rings \*\/\}/,
  `{/* Progress Summary Cards & Stats Rings */}\n              {studentType === 'HOSTELER' ? (`
);

content = content.replace(
  /\{\/\* Quick Summary deck grid \*\/\}/,
  `) : (\n                <div className="p-8 text-center border rounded-3xl bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20">\n                  <Ticket className="w-12 h-12 text-orange-500 mx-auto mb-4" />\n                  <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400">Welcome Day Scholar!</h3>\n                  <p className="text-sm text-orange-600/80 dark:text-orange-400/80 mt-2">\n                    You can purchase subsidized surplus mess food tokens from the Tokens tab.\n                  </p>\n                  <button onClick={() => setActiveTab('tokens')} className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg cursor-pointer">\n                    View Tokens Store\n                  </button>\n                </div>\n              )}\n\n              {/* Quick Summary deck grid */}`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated StudentPortal.tsx');
