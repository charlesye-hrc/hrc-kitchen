/**
 * Backfill Script: Populate Order Snapshot Fields
 *
 * This script populates the new snapshot fields (itemName, locationName, etc.)
 * for all existing orders in the database using their current relations.
 *
 * Run this AFTER applying the migration but BEFORE making snapshot fields required.
 *
 * Usage: npx ts-node scripts/backfill-order-snapshots.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillOrderSnapshots() {
  console.log('Starting backfill of order snapshot fields...\n');

  try {
    // Fetch all orders with their relations
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        location: true,
        user: true,
      },
    });

    console.log(`Found ${orders.length} orders to backfill`);

    let updatedOrders = 0;
    let updatedOrderItems = 0;
    let skippedOrders = 0;
    let skippedOrderItems = 0;

    for (const order of orders) {
      // Update Order-level snapshots
      const orderUpdate: any = {};
      let needsOrderUpdate = false;

      // Location snapshots
      if (order.location && !order.locationName) {
        orderUpdate.locationName = order.location.name;
        orderUpdate.locationAddress = order.location.address;
        orderUpdate.locationPhone = order.location.phone;
        needsOrderUpdate = true;
      }

      // Customer snapshots (for registered users)
      if (order.user && !order.customerFullName) {
        orderUpdate.customerFullName = order.user.fullName;
        orderUpdate.customerEmail = order.user.email;
        orderUpdate.customerDepartment = order.user.department;
        needsOrderUpdate = true;
      }

      if (needsOrderUpdate) {
        await prisma.order.update({
          where: { id: order.id },
          data: orderUpdate,
        });
        updatedOrders++;
      } else {
        skippedOrders++;
      }

      // Update OrderItem-level snapshots
      for (const orderItem of order.orderItems) {
        if (orderItem.menuItem && !orderItem.itemName) {
          await prisma.orderItem.update({
            where: { id: orderItem.id },
            data: {
              itemName: orderItem.menuItem.name,
              itemDescription: orderItem.menuItem.description,
              itemCategory: orderItem.menuItem.category,
              itemImageUrl: orderItem.menuItem.imageUrl,
              itemBasePrice: orderItem.menuItem.price,
            },
          });
          updatedOrderItems++;
        } else {
          skippedOrderItems++;
        }
      }
    }

    console.log('\n=== Backfill Complete ===');
    console.log(`Orders updated: ${updatedOrders}`);
    console.log(`Orders skipped (already had snapshots): ${skippedOrders}`);
    console.log(`Order items updated: ${updatedOrderItems}`);
    console.log(`Order items skipped (already had snapshots): ${skippedOrderItems}`);
    console.log('\nAll snapshot fields have been populated successfully!');

  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillOrderSnapshots()
  .then(() => {
    console.log('\nBackfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nBackfill script failed:', error);
    process.exit(1);
  });
