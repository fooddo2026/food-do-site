const fs = require('fs');
const path = require('path');

// ==========================================
// 1. Update Menus.tsx (Admin Portal)
// ==========================================
const adminMenusPath = path.join(__dirname, 'admin-portal/src/pages/Menus.tsx');
let adminMenusContent = fs.readFileSync(adminMenusPath, 'utf-8');

const adminCatchBlock = `} catch (err: any) {
      console.warn('API error releasing tokens, simulating locally:', err.message);
      
      try {
        const existingTokensStr = localStorage.getItem('food_do_surplus_tokens');
        const existingTokens = existingTokensStr ? JSON.parse(existingTokensStr) : [];
        
        const newTokens = Array.from({ length: Number(surplusQty) }).map(() => ({
          id: 'token-' + Math.random().toString(36).substr(2, 9),
          mealType: selectedSurplusMenu?.mealType,
          date: selectedSurplusMenu?.serveDate,
          price: Number(surplusPrice) || 5,
          status: 'AVAILABLE',
          createdAt: new Date().toISOString()
        }));
        
        localStorage.setItem('food_do_surplus_tokens', JSON.stringify([...newTokens, ...existingTokens]));
        
        setSurplusStatus('success');
        setTimeout(() => {
          setShowSurplusModal(false);
          setSurplusStatus(null);
        }, 2000);
      } catch (localErr) {
        setSurplusStatus('error');
        setTimeout(() => setSurplusStatus(null), 3000);
      }
    }`;

adminMenusContent = adminMenusContent.replace(
  /\} catch \(err: any\) \{\s*setSurplusStatus\('error'\);\s*console\.warn\('API error releasing tokens:', err\);\s*setTimeout\(\(\) => setSurplusStatus\(null\), 3000\);\s*\}/,
  adminCatchBlock
);

fs.writeFileSync(adminMenusPath, adminMenusContent, 'utf-8');


// ==========================================
// 2. Update SurplusTokens.tsx (Student Portal)
// ==========================================
const studentTokensPath = path.join(__dirname, 'student-portal/src/components/SurplusTokens.tsx');
let studentTokensContent = fs.readFileSync(studentTokensPath, 'utf-8');

// Update fetchData catch block
const studentFetchCatchBlock = `} catch (err) {
      console.warn('Backend API unreachable, simulating tokens fetch locally...');
      try {
        const storedTokensStr = localStorage.getItem('food_do_surplus_tokens');
        if (storedTokensStr) {
          const allTokens = JSON.parse(storedTokensStr);
          const available = allTokens.filter((t: any) => t.status === 'AVAILABLE');
          
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          
          const myClaimed = allTokens.filter((t: any) => t.studentId === (user?.id || 'guest') && t.status !== 'AVAILABLE');
          
          setAvailableTokens(available);
          setMyTokens(myClaimed);
        }
      } catch (e) {}
      setLoading(false);
    }`;

studentTokensContent = studentTokensContent.replace(
  /\} catch \(err\) \{\s*setLoading\(false\);\s*\}/,
  studentFetchCatchBlock
);

// Update handleClaim catch block
const studentClaimCatchBlock = `} catch (err) {
      console.warn('Backend API unreachable, simulating token claim locally...');
      try {
        const storedTokensStr = localStorage.getItem('food_do_surplus_tokens');
        if (storedTokensStr) {
          const allTokens = JSON.parse(storedTokensStr);
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          
          const tokenIndex = allTokens.findIndex((t: any) => t.mealType === mealType && t.status === 'AVAILABLE');
          
          if (tokenIndex !== -1) {
            allTokens[tokenIndex].status = 'CLAIMED';
            allTokens[tokenIndex].studentId = user?.id || 'guest';
            allTokens[tokenIndex].claimedAt = new Date().toISOString();
            
            localStorage.setItem('food_do_surplus_tokens', JSON.stringify(allTokens));
            setMessage('Token claimed successfully!');
            fetchData();
          } else {
            setMessage('No tokens available.');
          }
        }
      } catch (e) {
        setMessage('Network Error');
      }
      setTimeout(() => setMessage(''), 3000);
    }`;

studentTokensContent = studentTokensContent.replace(
  /\} catch \(err\) \{\s*setMessage\('Network Error'\);\s*\}/,
  studentClaimCatchBlock
);

fs.writeFileSync(studentTokensPath, studentTokensContent, 'utf-8');

console.log('Successfully added local offline simulation for Surplus Tokens');
