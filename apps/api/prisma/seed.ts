import { CategoryType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const systemCategories = [
  { name: 'Maaş', type: CategoryType.INCOME, color: '#22C55E', icon: 'wallet' },
  { name: 'Ek Gelir', type: CategoryType.INCOME, color: '#10B981', icon: 'banknote' },
  { name: 'Yatırım Geliri', type: CategoryType.INCOME, color: '#14B8A6', icon: 'trending-up' },
  { name: 'Diğer Gelir', type: CategoryType.INCOME, color: '#84CC16', icon: 'circle-dollar-sign' },
  { name: 'Market', type: CategoryType.EXPENSE, color: '#F97316', icon: 'shopping-cart' },
  { name: 'Ulaşım', type: CategoryType.EXPENSE, color: '#3B82F6', icon: 'car' },
  { name: 'Faturalar', type: CategoryType.EXPENSE, color: '#6366F1', icon: 'receipt-text' },
  { name: 'Kira', type: CategoryType.EXPENSE, color: '#8B5CF6', icon: 'house' },
  { name: 'Sağlık', type: CategoryType.EXPENSE, color: '#EF4444', icon: 'heart-pulse' },
  { name: 'Eğitim', type: CategoryType.EXPENSE, color: '#0EA5E9', icon: 'graduation-cap' },
  { name: 'Eğlence', type: CategoryType.EXPENSE, color: '#EC4899', icon: 'film' },
  { name: 'Alışveriş', type: CategoryType.EXPENSE, color: '#F59E0B', icon: 'shopping-bag' },
  { name: 'Diğer Gider', type: CategoryType.EXPENSE, color: '#64748B', icon: 'circle-minus' },
];

async function main() {
  await prisma.category.createMany({
    data: systemCategories.map((category) => ({
      ...category,
      isSystem: true,
      userId: null,
    })),
    skipDuplicates: true,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
