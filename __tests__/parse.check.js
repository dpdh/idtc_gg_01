// Parse-check helper: verifies modified JSX/JS files compile with the project's Babel.
const fs = require('fs');
const parser = require('@babel/parser');
const files = process.argv.slice(2);
let bad = 0;
files.forEach((file) => {
  try {
    const src = fs.readFileSync(file, 'utf8');
    parser.parse(src, {
      sourceType: 'module',
      plugins: ['jsx'],
      errorRecovery: false,
    });
    console.log(`OK   ${file}`);
  } catch (error) {
    bad += 1;
    console.log(`FAIL ${file}: ${error.message}`);
  }
});
process.exit(bad ? 1 : 0);
