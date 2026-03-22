const fs = require('fs');
const pagePath = 'frontend/app/(dashboard)/admin/upload/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

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

if (!pageCode.includes("const handleJsonUpload")) {
  pageCode = pageCode.replace("const handleUploadText = async () => {", jsonHandlers + "\n const handleUploadText = async () => {");
  fs.writeFileSync(pagePath, pageCode, 'utf8');
  console.log('Function injected');
} else {
  console.log('Function already exists');
}
