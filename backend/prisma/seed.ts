import { PrismaClient, UserRole, MenuCategory, Weekday } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user (with correct domain for management app access)
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@huonregionalcare.org.au' },
    update: { emailVerified: true },
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
    update: { emailVerified: true },
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
    update: { emailVerified: true },
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
    update: { emailVerified: true },
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

  // Create sample locations
  const location1 = await prisma.location.upsert({
    where: { name: 'Main Campus - Huonville' },
    update: {},
    create: {
      name: 'Main Campus - Huonville',
      address: '123 Main Street, Huonville TAS 7109',
      phone: '03 6264 1234',
      isActive: true,
    },
  });

  const location2 = await prisma.location.upsert({
    where: { name: 'South Campus - Cygnet' },
    update: {},
    create: {
      name: 'South Campus - Cygnet',
      address: '45 Mary Street, Cygnet TAS 7112',
      phone: '03 6295 5678',
      isActive: true,
    },
  });

  const location3 = await prisma.location.upsert({
    where: { name: 'North Campus - Franklin' },
    update: {},
    create: {
      name: 'North Campus - Franklin',
      address: '78 Huon Highway, Franklin TAS 7113',
      phone: '03 6266 9012',
      isActive: true,
    },
  });
  console.log('✅ Sample locations created');

  // Assign locations to users
  // Admin has access to all locations (will be handled by role)
  // Kitchen staff has access to Main and South campuses
  await prisma.userLocation.createMany({
    data: [
      { userId: kitchen.id, locationId: location1.id },
      { userId: kitchen.id, locationId: location2.id },
    ],
    skipDuplicates: true,
  });

  // Finance has access to all locations
  await prisma.userLocation.createMany({
    data: [
      { userId: finance.id, locationId: location1.id },
      { userId: finance.id, locationId: location2.id },
      { userId: finance.id, locationId: location3.id },
    ],
    skipDuplicates: true,
  });

  // Set default location for users
  await prisma.user.update({
    where: { id: admin.id },
    data: { lastSelectedLocationId: location1.id },
  });
  await prisma.user.update({
    where: { id: kitchen.id },
    data: { lastSelectedLocationId: location1.id },
  });
  await prisma.user.update({
    where: { id: finance.id },
    data: { lastSelectedLocationId: location1.id },
  });
  await prisma.user.update({
    where: { id: staff.id },
    data: { lastSelectedLocationId: location1.id },
  });
  console.log('✅ User-location assignments and preferences created');

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

  const createdMenuItems = [];
  for (const item of menuItems) {
    const itemId = item.name.toLowerCase().replace(/\s+/g, '-');
    const menuItem = await prisma.menuItem.upsert({
      where: { id: itemId },
      update: {},
      create: {
        id: itemId,
        ...item,
      },
    });
    createdMenuItems.push(menuItem);
  }
  console.log('✅ Sample menu items created with multiple weekdays support');

  // Link menu items to locations
  // Most items available at all locations
  for (const menuItem of createdMenuItems) {
    await prisma.menuItemLocation.createMany({
      data: [
        { menuItemId: menuItem.id, locationId: location1.id },
        { menuItemId: menuItem.id, locationId: location2.id },
        { menuItemId: menuItem.id, locationId: location3.id },
      ],
      skipDuplicates: true,
    });
  }

  // Make some items location-specific (for testing)
  // Remove "Butter Chicken" from North Campus
  const butterChicken = createdMenuItems.find(item => item.name === 'Butter Chicken');
  if (butterChicken) {
    await prisma.menuItemLocation.deleteMany({
      where: {
        menuItemId: butterChicken.id,
        locationId: location3.id,
      },
    });
  }

  // Remove "Fish & Chips" from South Campus
  const fishAndChips = createdMenuItems.find(item => item.name === 'Fish & Chips');
  if (fishAndChips) {
    await prisma.menuItemLocation.deleteMany({
      where: {
        menuItemId: fishAndChips.id,
        locationId: location2.id,
      },
    });
  }
  console.log('✅ Menu items linked to locations');

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
