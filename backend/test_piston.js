require('dotenv').config();
const axios = require('axios');

// Test Judge0 CE free public instance
async function testJudge0CE() {
  const base = 'https://ce.judge0.com';
  try {
    // Submit Python code
    const sub = await axios.post(`${base}/submissions?base64_encoded=false&wait=true`, {
      source_code: 'print("Hello from Judge0!")',
      language_id: 71,
      stdin: ''
    }, { 
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Judge0 CE: WORKS ->', sub.data.stdout?.trim());
  } catch(e) {
    console.error('Judge0 CE: FAIL -', e.response?.status, e.message.slice(0, 100));
  }
}

testJudge0CE();
