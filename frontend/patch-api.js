const fs = require('fs');

const apiPath = 'frontend/lib/api.ts';
let apiCode = fs.readFileSync(apiPath, 'utf8');

if (!apiCode.includes('uploadJson: (file: File')) {
const newMethod = `
  uploadJson: (file: File, subjectId: string, title?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('subjectId', subjectId);
    if (title) form.append('title', title);
    return api.post('/materials/upload-json', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  upload: (`;

apiCode = apiCode.replace('  upload: (', newMethod);
fs.writeFileSync(apiPath, apiCode, 'utf8');
console.log('api.ts patched');
} else {
console.log('api.ts already patched');
}

