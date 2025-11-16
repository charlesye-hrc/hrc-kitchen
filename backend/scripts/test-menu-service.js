const menuService = require('../dist/services/menu.service').default;

async function testMenuService() {
  try {
    console.log('Testing getTodaysMenu() without location...\n');
    const result = await menuService.getTodaysMenu();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

testMenuService();
