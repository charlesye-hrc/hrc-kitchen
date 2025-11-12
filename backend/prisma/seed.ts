import { PrismaClient, UserRole, MenuCategory, Weekday } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user (with correct domain for management app access)
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@huonregionalcare.org.au' },
    update: {},
    create: {
      email: 'admin@huonregionalcare.org.au',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      department: 'IT',
      role: UserRole.ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create kitchen staff user (with correct domain for management app access)
  const kitchenPassword = await bcrypt.hash('Kitchen123!', 10);
  const kitchen = await prisma.user.upsert({
    where: { email: 'kitchen@huonregionalcare.org.au' },
    update: {},
    create: {
      email: 'kitchen@huonregionalcare.org.au',
      passwordHash: kitchenPassword,
      fullName: 'Kitchen Staff',
      department: 'Kitchen',
      role: UserRole.KITCHEN,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Kitchen user created:', kitchen.email);

  // Create finance user (with correct domain for management app access)
  const financePassword = await bcrypt.hash('Finance123!', 10);
  const finance = await prisma.user.upsert({
    where: { email: 'finance@huonregionalcare.org.au' },
    update: {},
    create: {
      email: 'finance@huonregionalcare.org.au',
      passwordHash: financePassword,
      fullName: 'Finance Staff',
      department: 'Finance',
      role: UserRole.FINANCE,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Finance user created:', finance.email);

  // Create test staff user (without domain - for public app only)
  const staffPassword = await bcrypt.hash('Staff123!', 10);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@hrc-kitchen.com' },
    update: {},
    create: {
      email: 'staff@hrc-kitchen.com',
      passwordHash: staffPassword,
      fullName: 'Test Staff Member',
      department: 'General',
      role: UserRole.STAFF,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Staff user created:', staff.email);

  // Create system configuration
  await prisma.systemConfig.upsert({
    where: { configKey: 'ordering_window_start' },
    update: {},
    create: {
      configKey: 'ordering_window_start',
      configValue: '08:00',
      updatedBy: admin.id,
    },
  });

  await prisma.systemConfig.upsert({
    where: { configKey: 'ordering_window_end' },
    update: {},
    create: {
      configKey: 'ordering_window_end',
      configValue: '10:30',
      updatedBy: admin.id,
    },
  });

  await prisma.systemConfig.upsert({
    where: { configKey: 'restricted_role_domain' },
    update: {},
    create: {
      configKey: 'restricted_role_domain',
      configValue: '@huonregionalcare.org.au',
      updatedBy: admin.id,
    },
  });
  console.log('✅ System configuration created');

  // Create sample menu items for all weekdays
  const menuItems = [
    // Items available multiple days
    {
      name: 'Grilled Chicken Caesar Salad',
      description: 'Fresh romaine lettuce, grilled chicken, parmesan, croutons, Caesar dressing',
      price: 12.50,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.MONDAY, Weekday.WEDNESDAY, Weekday.FRIDAY],
      dietaryTags: ['Gluten-Free-Optional'],
    },
    {
      name: 'Beef Lasagna',
      description: 'Traditional Italian lasagna with ground beef, cheese, and tomato sauce',
      price: 14.00,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.MONDAY, Weekday.THURSDAY],
      dietaryTags: [],
    },
    {
      name: 'Vegetarian Stir-Fry',
      description: 'Mixed vegetables with tofu in a savory sauce, served with rice',
      price: 11.00,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.MONDAY, Weekday.TUESDAY],
      dietaryTags: ['Vegetarian', 'Vegan-Optional'],
    },
    {
      name: 'Garden Salad',
      description: 'Mixed greens, tomatoes, cucumbers, carrots with your choice of dressing',
      price: 5.00,
      category: MenuCategory.SIDE,
      weekdays: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY],
      dietaryTags: ['Vegetarian', 'Vegan', 'Gluten-Free'],
    },
    {
      name: 'Sparkling Water',
      description: 'Refreshing sparkling mineral water',
      price: 3.00,
      category: MenuCategory.DRINK,
      weekdays: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY],
      dietaryTags: ['Vegan', 'Gluten-Free'],
    },
    // TUESDAY
    {
      name: 'Salmon Teriyaki Bowl',
      description: 'Grilled salmon with teriyaki glaze, served with rice and steamed vegetables',
      price: 15.00,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.TUESDAY, Weekday.THURSDAY],
      dietaryTags: ['Gluten-Free-Optional'],
    },
    {
      name: 'Chicken Parmigiana',
      description: 'Breaded chicken breast with marinara sauce and melted mozzarella',
      price: 13.50,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.TUESDAY],
      dietaryTags: [],
    },
    {
      name: 'Mushroom Risotto',
      description: 'Creamy arborio rice with mixed mushrooms and parmesan',
      price: 12.00,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.TUESDAY, Weekday.FRIDAY],
      dietaryTags: ['Vegetarian', 'Gluten-Free'],
    },
    // WEDNESDAY
    {
      name: 'Beef Burger & Fries',
      description: 'Juicy beef patty with lettuce, tomato, cheese, and crispy fries',
      price: 13.00,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.WEDNESDAY],
      dietaryTags: [],
    },
    {
      name: 'Thai Green Curry',
      description: 'Chicken in coconut green curry sauce with vegetables and jasmine rice',
      price: 13.50,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.WEDNESDAY, Weekday.FRIDAY],
      dietaryTags: ['Gluten-Free', 'Dairy-Free'],
    },
    {
      name: 'Falafel Wrap',
      description: 'Crispy falafel with hummus, lettuce, tomato in a warm pita',
      price: 10.50,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.WEDNESDAY, Weekday.THURSDAY],
      dietaryTags: ['Vegetarian', 'Vegan'],
    },
    // THURSDAY
    {
      name: 'Roast Beef & Gravy',
      description: 'Slow-roasted beef with rich gravy, mashed potatoes, and seasonal vegetables',
      price: 14.50,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.THURSDAY],
      dietaryTags: ['Gluten-Free'],
    },
    {
      name: 'Pad Thai',
      description: 'Traditional Thai stir-fried noodles with prawns, peanuts, and lime',
      price: 13.00,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.THURSDAY],
      dietaryTags: ['Gluten-Free-Optional'],
    },
    {
      name: 'Pumpkin Soup',
      description: 'Creamy roasted pumpkin soup with crusty bread',
      price: 9.00,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.THURSDAY, Weekday.FRIDAY],
      dietaryTags: ['Vegetarian', 'Vegan-Optional'],
    },
    // FRIDAY
    {
      name: 'Fish & Chips',
      description: 'Beer-battered fish fillets with golden fries and tartare sauce',
      price: 14.00,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.FRIDAY],
      dietaryTags: [],
    },
    {
      name: 'Butter Chicken',
      description: 'Tender chicken in rich tomato cream sauce, served with naan and rice',
      price: 13.50,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.FRIDAY],
      dietaryTags: ['Gluten-Free-Optional'],
    },
    {
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, fresh mozzarella, and basil',
      price: 11.50,
      category: MenuCategory.MAIN,
      weekdays: [Weekday.FRIDAY],
      dietaryTags: ['Vegetarian'],
    },
  ];

  for (const item of menuItems) {
    const itemId = item.name.toLowerCase().replace(/\s+/g, '-');
    await prisma.menuItem.upsert({
      where: { id: itemId },
      update: {},
      create: {
        id: itemId,
        ...item,
      },
    });
  }
  console.log('✅ Sample menu items created with multiple weekdays support');

  // Add customizations for some items
  const caesarSalad = await prisma.menuItem.findFirst({
    where: { name: 'Grilled Chicken Caesar Salad' },
  });

  if (caesarSalad) {
    await prisma.menuItemCustomization.createMany({
      data: [
        { menuItemId: caesarSalad.id, customizationName: 'No croutons' },
        { menuItemId: caesarSalad.id, customizationName: 'Extra chicken' },
        { menuItemId: caesarSalad.id, customizationName: 'Dressing on the side' },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Customizations added for Caesar Salad');
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('--- Management App (domain-restricted) ---');
  console.log('Admin: admin@huonregionalcare.org.au / Admin123!');
  console.log('Kitchen: kitchen@huonregionalcare.org.au / Kitchen123!');
  console.log('Finance: finance@huonregionalcare.org.au / Finance123!');
  console.log('\n--- Public Ordering App ---');
  console.log('Staff: staff@hrc-kitchen.com / Staff123!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
