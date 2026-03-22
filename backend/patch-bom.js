const fs = require('fs');

const servicePath = 'backend/src/materials/materials.service.ts';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

serviceCode = serviceCode.replace(
  "const jsonContent = fsSync.readFileSync(file.path, 'utf8');",
  "const rawBuf = fsSync.readFileSync(file.path);\n    let jsonContent = rawBuf.toString('utf8');\n    if (jsonContent.charCodeAt(0) === 0xFEFF) jsonContent = jsonContent.slice(1);"
);

serviceCode = serviceCode.replace(
  "throw new BadRequestException('Invalid JSON file format');",
  "console.error('JSON ERROR:', e.message, 'BODY:', jsonContent.substring(0, 100)); throw new BadRequestException('Invalid JSON file format. Make sure the file contains valid JSON.');"
);

fs.writeFileSync(servicePath, serviceCode, 'utf8');
console.log('materials.service.ts patched for BOM');
