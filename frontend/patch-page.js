const fs = require('fs');

const pagePath = 'frontend/app/(dashboard)/admin/upload/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

if (!pageCode.includes("'json'")) {
  pageCode = pageCode.replace(
    "useState<'file' | 'manual' | 'text'>('file')",
    "useState<'file' | 'manual' | 'text' | 'json'>('file')"
  );

  pageCode = pageCode.replace(
    "const [submittingText, setSubmittingText] = useState(false);",
    "const [submittingText, setSubmittingText] = useState(false);\n const [jsonFile, setJsonFile] = useState<File | null>(null);\n const [jsonTitle, setJsonTitle] = useState('');\n const [uploadingJson, setUploadingJson] = useState(false);"
  );

  const jsonHandlers = `
 const handleJsonUpload = async () => {
   if (!subjectId) {
     toast.error('Please select a subject first!');
     return;
   }
   if (!jsonFile) {
     toast.error('Please select a JSON file!');
     return;
   }
   try {
     setUploadingJson(true);
     await materialsApi.uploadJson(jsonFile, subjectId, jsonTitle);
     toast.success('JSON file processed and quiz created successfully!');
     router.push('/admin/materials');
   } catch (error: any) {
     toast.error(error.response?.data?.message || 'Failed to upload JSON file');
   } finally {
     setUploadingJson(false);
   }
 };
  `;
  
  pageCode = pageCode.replace("const handleTextSubmit = async () =>", jsonHandlers + "\n const handleTextSubmit = async () =>");

  const newTabButton = `
   <button
     type="button"
     onClick={() => setActiveTab('json')}
     className={cn(
       'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
       activeTab === 'json'
         ? 'bg-blue-600 text-white'
         : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-750',
     )}
   >
     <FileText size={16} />
     JSON
   </button>
  `;

  pageCode = pageCode.replace("{t('manualUpload.tabText')}\n   </button>\n </div>", "{t('manualUpload.tabText')}\n   </button>\n" + newTabButton + "\n </div>");

  const jsonRender = `
 ) : activeTab === 'json' ? (
   <>
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <FileText size={18} className="text-orange-500" />
           Upload JSON File
         </CardTitle>
         <CardDescription>Upload a structured JSON file containing exact questions and options to instantly create a quiz without AI extraction.</CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         <Input
           value={jsonTitle}
           onChange={(e) => setJsonTitle(e.target.value)}
           placeholder="Optional Quiz Title"
           className="w-full"
         />
         <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
           <input
             type="file"
             accept=".json,application/json"
             id="json-upload"
             className="hidden"
             onChange={(e) => {
               if (e.target.files && e.target.files.length > 0) {
                 setJsonFile(e.target.files[0]);
               }
             }}
           />
           <label htmlFor="json-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
             <FileText size={48} className="text-gray-400 dark:text-zinc-500 mb-4" />
             <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
               {jsonFile ? jsonFile.name : 'Click to select a JSON file'}
             </p>
           </label>
         </div>
       </CardContent>
     </Card>

     <div className="flex justify-end pt-4">
       <Button
         onClick={handleJsonUpload}
         disabled={!subjectId || !jsonFile || uploadingJson}
         className="w-full sm:w-auto min-w-[200px]"
       >
         {uploadingJson ? (
           <div className="flex items-center gap-2">
             <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
             Uploading...
           </div>
         ) : (
           <div className="flex items-center gap-2">
             <Upload size={18} />
             Upload JSON & Create Quiz
           </div>
         )}
       </Button>
     </div>
   </>
  `;

  // Find the end before last parenthesis or just replace the last part
  pageCode = pageCode.replace(/(\n\s*)\) : null}\n\s*<\/div>\n\s*?<\/div>/g, jsonRender + "$1) : null}\n      </div>\n    </div>");

  fs.writeFileSync(pagePath, pageCode, 'utf8');
  console.log('page.tsx patched');
} else {
  console.log('page.tsx already patched');
}
