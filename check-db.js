const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const count = await p.product.count();
  console.log('Product count:', count);
  
  const products = await p.product.findMany({ take: 3 });
  console.log('Products:', products.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));
}

main()
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
