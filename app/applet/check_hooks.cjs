const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let inComponent = false;
  let componentName = '';
  let earlyReturnLine = -1;
  let braces = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const braceOpen = (line.match(/\{/g) || []).length;
    const braceClose = (line.match(/\}/g) || []).length;
    
    // Attempt standard component match
    const fnMatch = line.match(/(?:(?:export\s+(?:default\s+)?)?(?:const|function)\s+([A-Z][a-zA-Z0-9_]*).*?(?:=>|{))/);
    
    if (!inComponent && fnMatch) {
      inComponent = true;
      componentName = fnMatch[1];
      earlyReturnLine = -1;
      braces = 0;
    }
    
    if (inComponent) {
      braces += braceOpen;
      braces -= braceClose;
      
      if (braces === 1) { // we are at top level of component
        const matchReturn = line.match(/^[ \t]*if.*return/);
        // Also check "if () { return; }" but usually they are 1-liners
        const matchReturnBlock = line.match(/^[ \t]*return /); // Top level return could be component render!
        
        if (matchReturn && earlyReturnLine === -1) {
          earlyReturnLine = i + 1;
        } else if (matchReturnBlock && !line.includes('(')) {
          // just a heuristic
        }
        
        const matchHook = line.match(/^[ \t]*(?:const\s+[{[A-Za-z0-9_,\s]*}\]]\s*=\s*|(?:const|let|var)\s+[A-Za-z0-9_]+\s*=\s*)?(use[A-Z]\w*)\s*\(/);
        if (matchHook && earlyReturnLine !== -1) {
          console.log(`ERROR in ${filePath}: ${componentName} has early return at ${earlyReturnLine} and hook ${matchHook[1]} at ${i + 1}`);
        }
      }
      
      if (braces === 0 && braceClose > 0) {
        inComponent = false;
        earlyReturnLine = -1;
      }
    }
  }
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      checkFile(fullPath);
    }
  }
}

try {
  processDir(path.join(process.cwd(), 'src/components'));
  checkFile(path.join(process.cwd(), 'src/App.tsx'));
} catch(e) {
  console.error(e);
}
