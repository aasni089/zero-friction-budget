const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Groceries', icon: '🛒', color: '#10b981' },
  { name: 'Utilities', icon: '⚡', color: '#f59e0b' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { name: 'Transportation', icon: '🚗', color: '#3b82f6' },
  { name: 'Healthcare', icon: '🏥', color: '#ef4444' },
  { name: 'Housing', icon: '🏠', color: '#6366f1' },
  { name: 'Dining', icon: '🍽️', color: '#ec4899' },
  { name: 'Other', icon: '📦', color: '#6b7280' },
];

async function main() {
  console.log('Starting database seed...');

  // Note: Categories are household-specific
  // This seed file just defines the template categories
  // They will be created per-household when a household is created via API

  console.log('Default category templates:');
  defaultCategories.forEach((cat, index) => {
    console.log(`  ${index + 1}. ${cat.icon} ${cat.name} (${cat.color})`);
  });

  console.log('\nSeed completed!');
  console.log('Categories will be seeded per-household on creation.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Export default categories for use in household creation
module.exports = { defaultCategories };
