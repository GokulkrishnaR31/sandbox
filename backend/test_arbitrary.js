require('dotenv').config();
const { callLLM } = require('./services/llm');

async function testArbitraryCode() {
  console.log('Testing arbitrary code analysis with Gemini 2.5 Flash...\n');

  const testCases = [
    {
      name: 'Recursive Fibonacci O(2^n)',
      language: 'python',
      code: `def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n\nprint(fib(int(input())))`
    },
    {
      name: 'Binary Search O(log n)',
      language: 'javascript',
      code: `function binarySearch(arr, target) {\n    let left = 0, right = arr.length - 1;\n    while (left <= right) {\n        let mid = Math.floor((left + right) / 2);\n        if (arr[mid] === target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}`
    },
    {
      name: 'Simple Hello World O(1)',
      language: 'cpp',
      code: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}`
    }
  ];

  for (const tc of testCases) {
    console.log(`=== Test: ${tc.name} (${tc.language}) ===`);
    const prompt = `Language: ${tc.language}\nStudent Code:\n\`\`\`\n${tc.code}\n\`\`\`\nStatic AST Analysis: Not available.\nEmpirical Benchmark Data: n=10: 15ms, n=100: 16ms, n=500: 15ms`;
    const res = await callLLM('complexity', prompt);
    console.log('Result:', JSON.stringify(res, null, 2));
    console.log('\n');
  }
}

testArbitraryCode();
