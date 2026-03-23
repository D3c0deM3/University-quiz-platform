const fs = require('fs');
const path = 'frontend/app/(dashboard)/quizzes/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const injection = `
 // Prevent pull-to-refresh and accidental navigation
 useEffect(() => {
   // Disable pull-to-refresh on mobile
   document.body.style.overscrollBehaviorY = 'none';

   // Warn on refresh/close
   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
     if (attempt) {
       e.preventDefault();
       e.returnValue = ''; // Standard way to trigger browser's leave prompt
     }
   };

   window.addEventListener('beforeunload', handleBeforeUnload);

   return () => {
     document.body.style.overscrollBehaviorY = 'auto'; // Reset on unmount
     window.removeEventListener('beforeunload', handleBeforeUnload);
   };
 }, [attempt]);

 const quizId = quiz?.id;
`;

code = code.replace(" const quizId = quiz?.id;", injection);

fs.writeFileSync(path, code, 'utf8');
console.log('patched quiz page');
