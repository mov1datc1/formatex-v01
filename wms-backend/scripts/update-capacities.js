const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCapacities() {
  // Get all ROLLOS_ENTEROS zones
  const zones = await prisma.zone.findMany({
    where: { tipo: 'ROLLOS_ENTEROS', activo: true },
    select: { id: true, nombre: true, codigo: true },
  });
  
  console.log(`Found ${zones.length} ROLLOS_ENTEROS zones:`);
  zones.forEach(z => console.log(`  - ${z.codigo}: ${z.nombre}`));
  
  // Update all locations in those zones to capacity 50
  const result = await prisma.location.updateMany({
    where: {
      zoneId: { in: zones.map(z => z.id) },
      activo: true,
    },
    data: { capacidad: 50 },
  });
  
  console.log(`\n✅ Updated ${result.count} locations to capacity = 50 HUs`);

  // Also update MERMA zones to 30 (retazos are smaller, more per location)
  const mermaZones = await prisma.zone.findMany({
    where: { tipo: 'MERMA', activo: true },
    select: { id: true, nombre: true, codigo: true },
  });

  if (mermaZones.length > 0) {
    console.log(`\nFound ${mermaZones.length} MERMA zones:`);
    mermaZones.forEach(z => console.log(`  - ${z.codigo}: ${z.nombre}`));
    
    const mermaResult = await prisma.location.updateMany({
      where: {
        zoneId: { in: mermaZones.map(z => z.id) },
        activo: true,
      },
      data: { capacidad: 30 },
    });
    console.log(`✅ Updated ${mermaResult.count} MERMA locations to capacity = 30 HUs`);
  }

  // Update RECIBO/staging zones to 100 (floor staging, high capacity)
  const stagingZones = await prisma.zone.findMany({
    where: { tipo: { in: ['RECIBO', 'EMBARQUE'] }, activo: true },
    select: { id: true, nombre: true, codigo: true },
  });

  if (stagingZones.length > 0) {
    console.log(`\nFound ${stagingZones.length} RECIBO/EMBARQUE zones:`);
    stagingZones.forEach(z => console.log(`  - ${z.codigo}: ${z.nombre}`));
    
    const stagingResult = await prisma.location.updateMany({
      where: {
        zoneId: { in: stagingZones.map(z => z.id) },
        activo: true,
      },
      data: { capacidad: 100 },
    });
    console.log(`✅ Updated ${stagingResult.count} staging locations to capacity = 100 HUs`);
  }

  // Recalculate location statuses based on actual HU counts
  console.log('\n🔄 Recalculating location statuses...');
  const allLocations = await prisma.location.findMany({
    where: { activo: true },
    select: { id: true, capacidad: true, _count: { select: { handlingUnits: { where: { estadoHu: { not: 'AGOTADO' } } } } } },
  });

  let updated = 0;
  for (const loc of allLocations) {
    const huCount = loc._count.handlingUnits;
    const cap = loc.capacidad || 50;
    const newEstado = huCount >= cap ? 'OCUPADA' : huCount > 0 ? 'PARCIAL' : 'LIBRE';
    await prisma.location.update({ where: { id: loc.id }, data: { estado: newEstado } });
    updated++;
  }
  console.log(`✅ Recalculated status for ${updated} locations`);

  await prisma.$disconnect();
}

updateCapacities().catch(e => { console.error(e); process.exit(1); });
