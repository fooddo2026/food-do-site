const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Menus.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add new state variables for Surplus Modal
const stateReplacement = `  const [serveDate, setServeDate] = useState('');
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('BREAKFAST');
  const [itemsString, setItemsString] = useState('');
  const [totalCalories, setTotalCalories] = useState(650);

  // Surplus Token states
  const [showSurplusModal, setShowSurplusModal] = useState(false);
  const [selectedSurplusMenu, setSelectedSurplusMenu] = useState<MenuItem | null>(null);
  const [surplusQty, setSurplusQty] = useState(10);
  const [surplusPrice, setSurplusPrice] = useState(5);
  const [surplusStatus, setSurplusStatus] = useState<string | null>(null);`;

content = content.replace(
  /const \[serveDate, setServeDate\] = useState\(''\);\n  const \[mealType, setMealType\] = useState<'BREAKFAST' \| 'LUNCH' \| 'DINNER' \| 'SNACK'>\('BREAKFAST'\);\n  const \[itemsString, setItemsString\] = useState\(''\);\n  const \[totalCalories, setTotalCalories\] = useState\(650\);/,
  stateReplacement
);

// 2. Add handleReleaseSurplus function
const handlerReplacement = `  const handleNotifyReady = async (menuId: string) => {`;
const newHandler = `  const handleReleaseSurplus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurplusMenu) return;

    setSurplusStatus('submitting');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(\`\${API_BASE_URL}/api/meals/surplus/release\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${token}\`,
        },
        body: JSON.stringify({
          mealType: selectedSurplusMenu.mealType,
          date: selectedSurplusMenu.serveDate,
          quantity: Number(surplusQty),
          price: Number(surplusPrice),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to release tokens');
      }

      setSurplusStatus('success');
      setTimeout(() => {
        setShowSurplusModal(false);
        setSurplusStatus(null);
      }, 2000);
    } catch (err: any) {
      setSurplusStatus('error');
      console.warn('API error releasing tokens:', err);
      setTimeout(() => setSurplusStatus(null), 3000);
    }
  };

  const handleNotifyReady = async (menuId: string) => {`;

content = content.replace(
  /const handleNotifyReady = async \(menuId: string\) => \{/,
  newHandler
);

// 3. Add Release Surplus button in the meal card
const buttonReplacement = `<button
                    onClick={() => handleNotifyReady(menu.id)}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    📢 Notify Food Ready
                  </button>`;

const newButtons = `<div className="flex w-full gap-2">
                    <button
                      onClick={() => handleNotifyReady(menu.id)}
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Notify Food Ready"
                    >
                      📢 Notify
                    </button>
                    <button
                      onClick={() => { setSelectedSurplusMenu(menu); setShowSurplusModal(true); }}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Release Surplus Tokens"
                    >
                      🎟️ Release Tokens
                    </button>
                  </div>`;

content = content.replace(buttonReplacement, newButtons);

// 4. Add the Surplus Modal JSX
const modalReplacement = `{/* Add Menu Modal */}`;
const newModal = `{/* Surplus Token Modal */}
      {showSurplusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowSurplusModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-4xl mb-2 block">🎟️</span>
              <h3 className="text-xl font-bold text-gray-900">Release Surplus</h3>
              <p className="text-xs text-gray-500 mt-1">Make leftover food available to Day Scholars as tokens.</p>
            </div>

            {surplusStatus === 'success' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs text-center font-bold">
                Tokens released successfully!
              </div>
            )}
            
            {surplusStatus === 'error' && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs text-center font-bold">
                Failed to release tokens.
              </div>
            )}

            <form onSubmit={handleReleaseSurplus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Meal Type</label>
                <input type="text" readOnly value={selectedSurplusMenu?.mealType || ''} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm font-bold" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity</label>
                  <input
                    type="number"
                    value={surplusQty}
                    onChange={(e) => setSurplusQty(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:border-emerald-500 text-sm"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price (₹)</label>
                  <input
                    type="number"
                    value={surplusPrice}
                    onChange={(e) => setSurplusPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:border-emerald-500 text-sm"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={surplusStatus === 'submitting'}
                  className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-50"
                >
                  {surplusStatus === 'submitting' ? 'Releasing...' : 'Confirm Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Menu Modal */}`;

content = content.replace(modalReplacement, newModal);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated Menus.tsx with Surplus Tokens UI');
