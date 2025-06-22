#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const TESTS_DIR = path.join(__dirname, '../tests');

function findSourceFiles(dir, basePath = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      // Skip certain directories
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
        files.push(...findSourceFiles(fullPath, relativePath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      // Skip server.ts as it's typically just an entry point
      if (entry.name !== 'server.ts') {
        files.push(relativePath);
      }
    }
  }
  
  return files;
}

function checkTestExists(sourceFile) {
  const parsedPath = path.parse(sourceFile);
  const testFile = path.join(TESTS_DIR, parsedPath.dir, `${parsedPath.name}.test.ts`);
  return fs.existsSync(testFile);
}

function main() {
  console.log('🔍 Validating test coverage...\n');
  
  const sourceFiles = findSourceFiles(SRC_DIR);
  const missingTests = [];
  
  console.log(`Found ${sourceFiles.length} source files to validate:`);
  
  for (const sourceFile of sourceFiles) {
    const hasTest = checkTestExists(sourceFile);
    const status = hasTest ? '✅' : '❌';
    console.log(`  ${status} ${sourceFile}`);
    
    if (!hasTest) {
      missingTests.push(sourceFile);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (missingTests.length === 0) {
    console.log('🎉 All source files have corresponding test files!');
    console.log('✅ Test coverage validation passed.');
    process.exit(0);
  } else {
    console.log(`❌ Found ${missingTests.length} source files without tests:`);
    console.log('');
    
    for (const file of missingTests) {
      const parsedPath = path.parse(file);
      const expectedTestFile = path.join('tests', parsedPath.dir, `${parsedPath.name}.test.ts`);
      console.log(`  📄 ${file}`);
      console.log(`     Expected test: ${expectedTestFile}`);
      console.log('');
    }
    
    console.log('🚫 Test coverage validation failed!');
    console.log('');
    console.log('📝 To fix this:');
    console.log('   1. Create test files for all missing source files');
    console.log('   2. Follow the naming convention: tests/<module>/<filename>.test.ts');
    console.log('   3. Ensure each test file has meaningful unit tests');
    console.log('   4. Maintain at least 80% code coverage');
    console.log('');
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findSourceFiles, checkTestExists }; 