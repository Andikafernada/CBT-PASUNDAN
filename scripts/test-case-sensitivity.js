
const { gradeEssayWithAI } = require('../src/lib/ai-grader');

async function testCaseInsensitive() {
  const result = await gradeEssayWithAI(
    'Ibu kota Indonesia adalah...',
    'jakarta',
    'Jakarta',
    10.0
  );

  console.log('Result:', JSON.stringify(result, null, 2));
}

testCaseInsensitive();
