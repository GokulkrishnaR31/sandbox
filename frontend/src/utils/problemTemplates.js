export const PROBLEM_TEMPLATES = {
  'Two Sum': {
    name: 'Two Sum',
    code: {
      python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your solution here
};
`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};
`
    },
    driver: {
      python: `
import sys, json
input_data = sys.stdin.read().strip().split('\\n')
if len(input_data) >= 2:
    nums = [int(x) for x in input_data[0].split()]
    target = int(input_data[1])
    sol = Solution()
    print(json.dumps(sol.twoSum(nums, target)))
`,
      javascript: `
const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
if (lines.length >= 2) {
  const nums = lines[0].split(' ').map(Number);
  const target = parseInt(lines[1]);
  console.log(JSON.stringify(twoSum(nums, target)));
}
`
    },
    testCases: [
      { input: '2 7 11 15\n9', expectedOutput: '[0, 1]' },
      { input: '3 2 4\n6', expectedOutput: '[1, 2]' },
      { input: '3 3\n6', expectedOutput: '[0, 1]' },
    ],
    stdin: '2 7 11 15\n9'
  },

  'Fibonacci': {
    name: 'Fibonacci',
    code: {
      python: `class Solution:
    def fib(self, n: int) -> int:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {number} n
 * @return {number}
 */
var fib = function(n) {
    // Write your solution here
};
`,
      java: `class Solution {
    public int fib(int n) {
        // Write your solution here
        return 0;
    }
}
`,
      cpp: `class Solution {
public:
    int fib(int n) {
        // Write your solution here
        return 0;
    }
};
`
    },
    driver: {
      python: `
import sys
input_data = sys.stdin.read().strip()
if input_data:
    sol = Solution()
    print(sol.fib(int(input_data)))
`,
      javascript: `
const n = parseInt(require('fs').readFileSync('/dev/stdin', 'utf8').trim());
if (!isNaN(n)) console.log(fib(n));
`
    },
    testCases: [
      { input: '0', expectedOutput: '0' },
      { input: '1', expectedOutput: '1' },
      { input: '6', expectedOutput: '8' },
      { input: '10', expectedOutput: '55' },
    ],
    stdin: '6'
  },

  'Valid Palindrome': {
    name: 'Valid Palindrome',
    code: {
      python: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
var isPalindrome = function(s) {
    // Write your solution here
};
`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        // Write your solution here
        return false;
    }
}
`,
      cpp: `#include <string>
using namespace std;

class Solution {
public:
    bool isPalindrome(string s) {
        // Write your solution here
        return false;
    }
};
`
    },
    driver: {
      python: `
import sys
s = sys.stdin.read().strip()
sol = Solution()
res = sol.isPalindrome(s)
print("true" if res else "false")
`,
      javascript: `
const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
const res = isPalindrome(s);
console.log(res ? "true" : "false");
`
    },
    testCases: [
      { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true' },
      { input: 'race a car', expectedOutput: 'false' },
      { input: ' ', expectedOutput: 'true' },
    ],
    stdin: 'A man, a plan, a canal: Panama'
  }
};
