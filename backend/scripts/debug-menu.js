const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMenu() {
  const day = new Date().getDay();
  const weekdayMap = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
  };

  const weekday = weekdayMap[day];
  console.log(`Today is: ${weekday} (day ${day})\n`);

  // Check total menu items
  const allItems = await prisma.menuItem.findMany({
    select: { id: true, name: true, weekdays: true }
  });
  console.log(`Total menu items in database: ${allItems.length}\n`);

  // Check items for today
  const todayItems = await prisma.menuItem.findMany({
    where: {
      weekdays: {
        has: weekday
      }
    },
    select: { id: true, name: true, weekdays: true }
  });

  console.log(`Menu items for ${weekday}: ${todayItems.length}`);
  if (todayItems.length > 0) {
    todayItems.forEach(item => {
      console.log(`  - ${item.name}`);
      console.log(`    Weekdays: ${item.weekdays.join(', ')}`);
    });
  } else {
    console.log('  (None found)');
    console.log('\nSample of all items and their weekdays:');
    allItems.slice(0, 5).forEach(item => {
      console.log(`  - ${item.name}: ${item.weekdays.join(', ') || '(no days set)'}`);
    });
  }

  await prisma.$disconnect();
}

debugMenu().catch(console.error);
