import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🧹 Limpiando base de datos...');
  await prisma.supplyPlanLine.deleteMany();
  await prisma.supplyPlan.deleteMany();
  await prisma.reorderConfig.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.integrationConfig.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.cutOperation.deleteMany();
  await prisma.orderLineAssignment.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.packingSlip.deleteMany();
  await prisma.order.deleteMany();
  await prisma.handlingUnit.deleteMany();
  await prisma.purchaseReceiptLine.deleteMany();
  await prisma.purchaseReceipt.deleteMany();
  await prisma.incomingShipmentLine.deleteMany();
  await prisma.incomingShipment.deleteMany();
  await prisma.location.deleteMany();
  await prisma.mermaRangeConfig.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.skuMaster.deleteMany();
  await prisma.client.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.task.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.systemSetting.deleteMany();
  console.log('✅ Base de datos limpia');

  // =====================================================================
  // 1. ALMACÉN FÍSICO
  // =====================================================================
  console.log('🏭 Creando almacenes...');
  const warehouse = await prisma.warehouse.create({
    data: { nombre: 'Nave Formatex', codigo: 'NAV-001', tipo: 'FISICO', direccion: 'Rio La Barca No. 1680, Atlas C.P. 44870, Guadalajara, Jalisco', metrosCuad: 1000, descripcion: 'Nave principal — FORMA TEXTIL S. DE R.L. DE C.V.' },
  });
  await prisma.warehouse.create({ data: { nombre: 'Bodega Virtual Liverpool', codigo: 'VIR-LIV', tipo: 'VIRTUAL', clienteAsignado: 'Liverpool S.A. de C.V.', descripcion: 'Inventario consignado' } });
  await prisma.warehouse.create({ data: { nombre: 'Bodega Virtual Zara', codigo: 'VIR-ZAR', tipo: 'VIRTUAL', clienteAsignado: 'Zara México', descripcion: 'Inventario consignado' } });

  // =====================================================================
  // 2. ZONAS
  // =====================================================================
  console.log('📍 Creando zonas...');
  const zoneData = [
    { warehouseId: warehouse.id, nombre: 'Recibo / Staging', codigo: 'REC-01', tipo: 'RECIBO' as const, orden: 0 },
    { warehouseId: warehouse.id, nombre: 'Rollos Enteros 1', codigo: 'RE-01', tipo: 'ROLLOS_ENTEROS' as const, orden: 1 },
    { warehouseId: warehouse.id, nombre: 'Merma 1-5m', codigo: 'MER-01', tipo: 'MERMA' as const, orden: 2 },
    { warehouseId: warehouse.id, nombre: 'Merma 6-10m', codigo: 'MER-02', tipo: 'MERMA' as const, orden: 3 },
    { warehouseId: warehouse.id, nombre: 'Merma 11-40m', codigo: 'MER-03', tipo: 'MERMA' as const, orden: 4 },
    { warehouseId: warehouse.id, nombre: 'Estación de Corte', codigo: 'CORTE-01', tipo: 'CORTE' as const, orden: 5 },
    { warehouseId: warehouse.id, nombre: 'Estación de Empaque', codigo: 'EMPAQUE-01', tipo: 'EMPAQUE' as const, orden: 6 },
    { warehouseId: warehouse.id, nombre: 'Muelle de Embarque', codigo: 'EMB-01', tipo: 'EMBARQUE' as const, orden: 7 },
  ];
  for (const z of zoneData) await prisma.zone.create({ data: z });
  const zones = await prisma.zone.findMany({ orderBy: { orden: 'asc' } });
  const zEnteros = zones.find(z => z.codigo === 'RE-01')!;
  const zMer1 = zones.find(z => z.codigo === 'MER-01')!;
  const zMer2 = zones.find(z => z.codigo === 'MER-02')!;
  const zMer3 = zones.find(z => z.codigo === 'MER-03')!;
  const zRecibo = zones.find(z => z.codigo === 'REC-01')!;
  const zCorte = zones.find(z => z.codigo === 'CORTE-01')!;
  const zEmpaque = zones.find(z => z.codigo === 'EMPAQUE-01')!;
  const zEmbarque = zones.find(z => z.codigo === 'EMB-01')!;

  // =====================================================================
  // 3. UBICACIONES (batch insert)
  // =====================================================================
  console.log('📦 Creando ubicaciones...');
  const locationData: any[] = [];

  // Zona Rollos Enteros: 5 pasillos × 3 racks × 5 niveles = 75 (cap: 6)
  for (let p = 1; p <= 5; p++)
    for (let r = 1; r <= 3; r++)
      for (let n = 1; n <= 5; n++)
        locationData.push({ warehouseId: warehouse.id, zoneId: zEnteros.id, codigo: `RE-01-P${String(p).padStart(2,'0')}-R${String(r).padStart(2,'0')}-N${n}`, pasillo: `P${String(p).padStart(2,'0')}`, rack: `R${String(r).padStart(2,'0')}`, nivel: `N${n}`, tipo: 'RACK', estado: 'LIBRE', capacidad: 6 });

  // Merma 1: 18 posiciones
  for (let p = 1; p <= 2; p++) for (let r = 1; r <= 3; r++) for (let n = 1; n <= 3; n++)
    locationData.push({ warehouseId: warehouse.id, zoneId: zMer1.id, codigo: `MER-01-P${String(p).padStart(2,'0')}-R${String(r).padStart(2,'0')}-N${n}`, pasillo: `P${String(p).padStart(2,'0')}`, rack: `R${String(r).padStart(2,'0')}`, nivel: `N${n}`, tipo: 'RACK', estado: 'LIBRE', capacidad: 10 });

  // Merma 2: 18
  for (let p = 1; p <= 2; p++) for (let r = 1; r <= 3; r++) for (let n = 1; n <= 3; n++)
    locationData.push({ warehouseId: warehouse.id, zoneId: zMer2.id, codigo: `MER-02-P${String(p).padStart(2,'0')}-R${String(r).padStart(2,'0')}-N${n}`, pasillo: `P${String(p).padStart(2,'0')}`, rack: `R${String(r).padStart(2,'0')}`, nivel: `N${n}`, tipo: 'RACK', estado: 'LIBRE', capacidad: 8 });

  // Merma 3: 18
  for (let p = 1; p <= 2; p++) for (let r = 1; r <= 3; r++) for (let n = 1; n <= 3; n++)
    locationData.push({ warehouseId: warehouse.id, zoneId: zMer3.id, codigo: `MER-03-P${String(p).padStart(2,'0')}-R${String(r).padStart(2,'0')}-N${n}`, pasillo: `P${String(p).padStart(2,'0')}`, rack: `R${String(r).padStart(2,'0')}`, nivel: `N${n}`, tipo: 'RACK', estado: 'LIBRE', capacidad: 4 });

  // Zonas operativas
  locationData.push(
    { warehouseId: warehouse.id, zoneId: zRecibo.id, codigo: 'REC-MUELLE-01', pasillo: 'M01', tipo: 'MUELLE', estado: 'LIBRE', capacidad: 50 },
    { warehouseId: warehouse.id, zoneId: zRecibo.id, codigo: 'REC-STAGING-01', pasillo: 'ST01', tipo: 'STAGING', estado: 'LIBRE', capacidad: 100 },
    { warehouseId: warehouse.id, zoneId: zCorte.id, codigo: 'CORTE-MESA-01', pasillo: 'MESA-01', tipo: 'STAGING', estado: 'LIBRE', capacidad: 10 },
    { warehouseId: warehouse.id, zoneId: zCorte.id, codigo: 'CORTE-MESA-02', pasillo: 'MESA-02', tipo: 'STAGING', estado: 'LIBRE', capacidad: 10 },
    { warehouseId: warehouse.id, zoneId: zEmpaque.id, codigo: 'EMP-MESA-01', pasillo: 'EMP-01', tipo: 'STAGING', estado: 'LIBRE', capacidad: 20 },
    { warehouseId: warehouse.id, zoneId: zEmbarque.id, codigo: 'EMB-MUELLE-01', pasillo: 'EMB-01', tipo: 'MUELLE', estado: 'LIBRE', capacidad: 30 },
  );

  await prisma.location.createMany({ data: locationData });
  console.log(`  ✅ ${locationData.length} ubicaciones creadas`);

  // Merma ranges
  await prisma.mermaRangeConfig.createMany({ data: [
    { warehouseId: warehouse.id, nombre: 'Retazos Pequeños (1-5m)', minMetros: 1, maxMetros: 5, zonaCodigo: 'MER-01', pasillo: 'MERMA-P01', orden: 1 },
    { warehouseId: warehouse.id, nombre: 'Retazos Medianos (6-10m)', minMetros: 6, maxMetros: 10, zonaCodigo: 'MER-02', pasillo: 'MERMA-P01', orden: 2 },
    { warehouseId: warehouse.id, nombre: 'Retazos Grandes (11-40m)', minMetros: 11, maxMetros: 40, zonaCodigo: 'MER-03', pasillo: 'MERMA-P01', orden: 3 },
  ]});

  // =====================================================================
  // 4. CATÁLOGOS
  // =====================================================================
  console.log('🧵 Creando catálogos...');

  const prov1 = await prisma.supplier.create({ data: { nombre: 'Textiles del Norte S.A.', codigo: 'PROV-001', contacto: 'Roberto Sánchez', telefono: '33-1234-5678', email: 'ventas@texnorte.mx', rfc: 'TNO980512AB3' } });
  const prov2 = await prisma.supplier.create({ data: { nombre: 'Hilos y Telas Guadalajara', codigo: 'PROV-002', contacto: 'Laura Mendoza', telefono: '33-8765-4321', email: 'compras@hilosytelas.mx', rfc: 'HTG010901MN5' } });
  const prov3 = await prisma.supplier.create({ data: { nombre: 'Importadora Global Textil', codigo: 'PROV-003', contacto: 'Chen Wei', telefono: '55-5555-0001' } });

  const vend1 = await prisma.vendor.create({ data: { nombre: 'Carlos Martínez', codigo: 'VEND-001', telefono: '33-1111-2222', comision: 5 } });
  const vend2 = await prisma.vendor.create({ data: { nombre: 'Ana Rodríguez', codigo: 'VEND-002', telefono: '55-3333-4444', comision: 4.5 } });
  const vend3 = await prisma.vendor.create({ data: { nombre: 'Miguel Ángel Flores', codigo: 'VEND-003', telefono: '33-5555-6666', comision: 5 } });

  const cli1 = await prisma.client.create({ data: { nombre: 'Jorge Humberto Barberena Llerenas', codigo: 'CLI-001', telefono: '55 86033380', direccion: 'Calle Mariano Azuela 85', colonia: 'Ciudad Satélite', poblacion: 'Naucalpan de Juárez', estado: 'Estado de México', cp: '53100', rfc: 'BALJ710130CJ8', vendorId: vend1.id } });
  const cli2 = await prisma.client.create({ data: { nombre: 'Liverpool S.A. de C.V.', codigo: 'CLI-LIV', telefono: '55-1234-5678', email: 'compras@liverpool.com.mx', rfc: 'LIV830517KZ2', vendorId: vend2.id } });
  const cli3 = await prisma.client.create({ data: { nombre: 'Confecciones Puebla S.A.', codigo: 'CLI-CPB', telefono: '22-2345-6789', rfc: 'CPS950620IA4', vendorId: vend1.id } });
  const cli4 = await prisma.client.create({ data: { nombre: 'Moda Express CDMX', codigo: 'CLI-MEX', telefono: '55-7777-8888', rfc: 'MEC080315RR9', vendorId: vend3.id } });
  const cli5 = await prisma.client.create({ data: { nombre: 'Zara México', codigo: 'CLI-ZAR', telefono: '55-9999-0000', rfc: 'ZMX100803AA3', vendorId: vend2.id } });

  // SKUs con claves estilo Formatex
  const skuEnigma = await prisma.skuMaster.create({ data: { codigo: 'LENIGIRO', nombre: 'Enigma Iron', categoria: 'Lino', color: 'Iron', anchoMetros: 1.5, metrajeEstandar: 50, pesoKgPorMetro: 0.35, precioReferencia: 107.28, supplierId: prov1.id, unidadMedida: 'MTR' } });
  const skuAlgRojo = await prisma.skuMaster.create({ data: { codigo: 'ALGROJPRE', nombre: 'Algodón Rojo Premium', categoria: 'Algodón', color: 'Rojo', anchoMetros: 1.5, metrajeEstandar: 50, pesoKgPorMetro: 0.3, precioReferencia: 89.50, supplierId: prov1.id, unidadMedida: 'MTR' } });
  const skuAlgAzul = await prisma.skuMaster.create({ data: { codigo: 'ALGAZMPRE', nombre: 'Algodón Azul Marino', categoria: 'Algodón', color: 'Azul Marino', anchoMetros: 1.5, metrajeEstandar: 50, pesoKgPorMetro: 0.3, precioReferencia: 89.50, supplierId: prov2.id, unidadMedida: 'MTR' } });
  const skuPolNeg = await prisma.skuMaster.create({ data: { codigo: 'POLNEGSAT', nombre: 'Poliéster Negro Satinado', categoria: 'Poliéster', color: 'Negro', anchoMetros: 1.5, metrajeEstandar: 50, pesoKgPorMetro: 0.25, precioReferencia: 65.00, supplierId: prov2.id, unidadMedida: 'MTR' } });
  const skuDenim = await prisma.skuMaster.create({ data: { codigo: 'DNMINDCLS', nombre: 'Denim Indigo Clásico', categoria: 'Denim', color: 'Indigo', anchoMetros: 1.5, metrajeEstandar: 50, pesoKgPorMetro: 0.45, precioReferencia: 95.00, supplierId: prov1.id, unidadMedida: 'MTR' } });
  const skuSeda = await prisma.skuMaster.create({ data: { codigo: 'SEDCRMNAT', nombre: 'Seda Crema Natural', categoria: 'Seda', color: 'Crema', anchoMetros: 1.14, metrajeEstandar: 30, pesoKgPorMetro: 0.15, precioReferencia: 250.00, supplierId: prov3.id, unidadMedida: 'MTR' } });
  const skuLino = await prisma.skuMaster.create({ data: { codigo: 'LINVRDOLV', nombre: 'Lino Verde Oliva', categoria: 'Lino', color: 'Verde Oliva', anchoMetros: 1.4, metrajeEstandar: 40, pesoKgPorMetro: 0.32, precioReferencia: 135.00, supplierId: prov3.id, unidadMedida: 'MTR' } });
  const skuGab = await prisma.skuMaster.create({ data: { codigo: 'GABCAFCHO', nombre: 'Gabardina Café Chocolate', categoria: 'Gabardina', color: 'Café', anchoMetros: 1.5, metrajeEstandar: 50, pesoKgPorMetro: 0.4, precioReferencia: 110.00, supplierId: prov1.id, unidadMedida: 'MTR' } });
  console.log('  ✅ 8 SKUs, 3 proveedores, 3 vendedores, 5 clientes');

  // =====================================================================
  // 5. ROLES Y USUARIOS
  // =====================================================================
  console.log('👥 Creando roles y usuarios...');
  const modules = ['dashboard','inventory','orders','cutting','reception','labeling','warehouse','admin','catalogs','reservations','transit','cobranza','facturacion','supply-planning','availability','transfers'];
  const actions = ['read','create','update','delete'];

  const rolesConfig: Array<{name:string,desc:string,nivel:number,mods:string[]}> = [
    { name: 'DIRECTOR_OPERACIONES', desc: 'Director — acceso total', nivel: 1, mods: modules },
    { name: 'ATC', desc: 'Atención al Cliente — levanta pedidos', nivel: 3, mods: ['dashboard','orders','catalogs','inventory','reservations','transit'] },
    { name: 'COBRANZA', desc: 'Cobranza — verifica pagos', nivel: 3, mods: ['dashboard','orders','cobranza'] },
    { name: 'FACTURACION', desc: 'Facturación — emite factura', nivel: 3, mods: ['dashboard','orders','facturacion'] },
    { name: 'PICKER', desc: 'Picker almacén — Zebra TC22', nivel: 4, mods: ['dashboard','inventory','orders','labeling'] },
    { name: 'CORTADOR', desc: 'Cortador — corta y genera retazos', nivel: 4, mods: ['dashboard','inventory','cutting','orders','labeling'] },
    { name: 'EMPACADOR', desc: 'Empacador — empaca pedidos', nivel: 4, mods: ['dashboard','orders'] },
    { name: 'DESPACHADOR', desc: 'Despachador — envíos', nivel: 4, mods: ['dashboard','orders'] },
    { name: 'COORDINADOR_ALMACEN', desc: 'Coordinador almacén', nivel: 2, mods: ['dashboard','inventory','orders','cutting','reception','labeling','warehouse','reservations','transit'] },
    { name: 'DIRECTOR_COMPRAS', desc: 'Director de Planeación de Compras', nivel: 1, mods: ['dashboard','inventory','orders','supply-planning','transit','catalogs','availability'] },
  ];

  const roles: Record<string, any> = {};
  for (const rc of rolesConfig) {
    const role = await prisma.role.create({ data: { nombre: rc.name, descripcion: rc.desc, nivel: rc.nivel } });
    roles[rc.name] = role;
    const perms = rc.mods.flatMap(m => actions.map(a => ({ roleId: role.id, modulo: m, accion: a })));
    await prisma.rolePermission.createMany({ data: perms });
  }

  const passAdmin = await bcrypt.hash('admin123', 10);
  const passOper = await bcrypt.hash('opera123', 10);

  const userAdmin = await prisma.user.create({ data: { nombre: 'Administrador WMS 360+', username: 'admin', email: 'admin@formatex.mx', password: passAdmin, roleId: roles['DIRECTOR_OPERACIONES'].id } });
  const userATC = await prisma.user.create({ data: { nombre: 'Yareni López (ATC)', username: 'yareni.atc', email: 'yareni@formatex.mx', password: passOper, roleId: roles['ATC'].id } });
  const userCobranza = await prisma.user.create({ data: { nombre: 'Sandra Ríos (Cobranza)', username: 'sandra.cobr', email: 'sandra@formatex.mx', password: passOper, roleId: roles['COBRANZA'].id } });
  await prisma.user.create({ data: { nombre: 'Luis Moreno (Facturación)', username: 'luis.fact', email: 'luis@formatex.mx', password: passOper, roleId: roles['FACTURACION'].id } });
  const userPicker = await prisma.user.create({ data: { nombre: 'Juan Pérez (Picker)', username: 'juan.picker', email: 'juan@formatex.mx', password: passOper, roleId: roles['PICKER'].id } });
  const userCortador = await prisma.user.create({ data: { nombre: 'María García (Cortador)', username: 'maria.corte', email: 'maria@formatex.mx', password: passOper, roleId: roles['CORTADOR'].id } });
  await prisma.user.create({ data: { nombre: 'Pedro Ramírez (Empacador)', username: 'pedro.empaque', email: 'pedro@formatex.mx', password: passOper, roleId: roles['EMPACADOR'].id } });
  await prisma.user.create({ data: { nombre: 'Ana Hernández (Despacho)', username: 'ana.envio', email: 'ana@formatex.mx', password: passOper, roleId: roles['DESPACHADOR'].id } });
  const userCoord = await prisma.user.create({ data: { nombre: 'Roberto Coord. Almacén', username: 'roberto.coord', email: 'roberto@formatex.mx', password: passOper, roleId: roles['COORDINADOR_ALMACEN'].id } });
  await prisma.user.create({ data: { nombre: 'Fernando Dir. Compras', username: 'fernando.compras', email: 'fernando@formatex.mx', password: passOper, roleId: roles['DIRECTOR_COMPRAS'].id } });
  console.log('  ✅ 10 roles, 10 usuarios');

  // =====================================================================
  // 6. RECEPCIONES + HUs (batch optimized)
  // =====================================================================
  console.log('📥 Creando recepciones y HUs...');
  const allLocations = await prisma.location.findMany({ where: { zoneId: zEnteros.id }, orderBy: { codigo: 'asc' } });

  const rec1 = await prisma.purchaseReceipt.create({ data: { codigo: 'REC-2026-00001', supplierId: prov1.id, ordenCompra: 'OC-FTX-2026-089', totalPallets: 4, totalRollos: 20, transportista: 'FedEx Carga', estado: 'COMPLETADA', recibidoPor: userCoord.id } });
  const rec1L1 = await prisma.purchaseReceiptLine.create({ data: { receiptId: rec1.id, skuId: skuEnigma.id, cantidadRollos: 8, metrajePorRollo: 50, metrajeTotalRecibido: 400, palletRef: 'PAL-001' } });
  const rec1L2 = await prisma.purchaseReceiptLine.create({ data: { receiptId: rec1.id, skuId: skuAlgRojo.id, cantidadRollos: 6, metrajePorRollo: 50, metrajeTotalRecibido: 300, palletRef: 'PAL-002' } });
  const rec1L3 = await prisma.purchaseReceiptLine.create({ data: { receiptId: rec1.id, skuId: skuDenim.id, cantidadRollos: 6, metrajePorRollo: 50, metrajeTotalRecibido: 300, palletRef: 'PAL-003' } });

  const rec2 = await prisma.purchaseReceipt.create({ data: { codigo: 'REC-2026-00002', supplierId: prov2.id, ordenCompra: 'OC-FTX-2026-092', totalPallets: 2, totalRollos: 10, transportista: 'DHL Express', estado: 'COMPLETADA', recibidoPor: userCoord.id } });
  const rec2L1 = await prisma.purchaseReceiptLine.create({ data: { receiptId: rec2.id, skuId: skuAlgAzul.id, cantidadRollos: 5, metrajePorRollo: 50, metrajeTotalRecibido: 250, palletRef: 'PAL-004' } });
  const rec2L2 = await prisma.purchaseReceiptLine.create({ data: { receiptId: rec2.id, skuId: skuPolNeg.id, cantidadRollos: 5, metrajePorRollo: 50, metrajeTotalRecibido: 250, palletRef: 'PAL-005' } });

  // Build HU data in batches per SKU
  type HUInsert = { codigo:string; skuId:string; metrajeOriginal:number; metrajeActual:number; anchoMetros:number; pesoKg:number; tipoRollo:'ENTERO'; estadoHu:'DISPONIBLE'; ubicacionId:string; receiptLineId:string; palletId:string; generacion:0; etiquetaImpresa:true };
  const huInserts: HUInsert[] = [];
  let huIdx = 0;

  const addHUs = (recLine: any, sku: any, count: number, pallet: string) => {
    for (let i = 0; i < count; i++) {
      const loc = allLocations[huIdx % allLocations.length];
      huInserts.push({
        codigo: `HU-2026-${String(huIdx + 1).padStart(5,'0')}`,
        skuId: sku.id, metrajeOriginal: sku.metrajeEstandar, metrajeActual: sku.metrajeEstandar,
        anchoMetros: sku.anchoMetros || 1.5, pesoKg: (sku.pesoKgPorMetro || 0.3) * sku.metrajeEstandar,
        tipoRollo: 'ENTERO', estadoHu: 'DISPONIBLE', ubicacionId: loc.id,
        receiptLineId: recLine.id, palletId: pallet, generacion: 0, etiquetaImpresa: true,
      });
      huIdx++;
    }
  };

  addHUs(rec1L1, skuEnigma, 8, 'PAL-001');
  addHUs(rec1L2, skuAlgRojo, 6, 'PAL-002');
  addHUs(rec1L3, skuDenim, 6, 'PAL-003');
  addHUs(rec2L1, skuAlgAzul, 5, 'PAL-004');
  addHUs(rec2L2, skuPolNeg, 5, 'PAL-005');

  // Batch insert HUs
  for (const hu of huInserts) {
    await prisma.handlingUnit.create({ data: hu as any });
  }

  // Update locations to PARCIAL
  const usedLocIds = [...new Set(huInserts.map(h => h.ubicacionId))];
  await prisma.location.updateMany({ where: { id: { in: usedLocIds } }, data: { estado: 'PARCIAL' } });

  const allHUs = await prisma.handlingUnit.findMany({ orderBy: { codigo: 'asc' } });
  console.log(`  ✅ ${allHUs.length} HUs creados`);

  // Batch insert movements
  const movData = allHUs.map(hu => ({
    huId: hu.id, tipo: 'ENTRADA' as const,
    metrajeDespues: hu.metrajeActual, ubicacionDestino: 'RE-01',
    referencia: 'REC-2026-00001', notas: 'Recepción inicial', userId: userCoord.id,
  }));
  await prisma.inventoryMovement.createMany({ data: movData });

  // =====================================================================
  // 7. INVENTARIO EN TRÁNSITO
  // =====================================================================
  console.log('🚛 Creando embarques en tránsito...');
  const ship1 = await prisma.incomingShipment.create({ data: { codigo: 'EMB-2026-0001', supplierId: prov1.id, ordenCompra: 'OC-FTX-2026-095', estado: 'EN_TRANSITO', fechaEstimada: new Date('2026-06-15'), transportista: 'Maersk', notas: 'Embarque marítimo', creadoPor: userCoord.id } });
  await prisma.incomingShipmentLine.createMany({ data: [
    { shipmentId: ship1.id, skuId: skuEnigma.id, cantidadRollos: 20, metrajePorRollo: 50, metrajeTotal: 1000, metrajeReservado: 100 },
    { shipmentId: ship1.id, skuId: skuGab.id, cantidadRollos: 10, metrajePorRollo: 50, metrajeTotal: 500 },
  ]});

  const ship2 = await prisma.incomingShipment.create({ data: { codigo: 'EMB-2026-0002', supplierId: prov3.id, ordenCompra: 'OC-FTX-2026-098', estado: 'EN_TRANSITO', fechaEstimada: new Date('2026-05-01'), transportista: 'Estafeta Carga', notas: 'Importación seda', creadoPor: userCoord.id } });
  await prisma.incomingShipmentLine.createMany({ data: [
    { shipmentId: ship2.id, skuId: skuSeda.id, cantidadRollos: 15, metrajePorRollo: 30, metrajeTotal: 450 },
    { shipmentId: ship2.id, skuId: skuLino.id, cantidadRollos: 10, metrajePorRollo: 40, metrajeTotal: 400 },
  ]});
  console.log('  ✅ 2 embarques en tránsito (1850m esperados)');

  // =====================================================================
  // 8. PEDIDOS (5 estados diferentes)
  // =====================================================================
  console.log('📋 Creando pedidos...');

  // Ped 1: COTIZADO — reserva blanda
  const ped1 = await prisma.order.create({ data: { codigo: 'PED-2026-0001', clientId: cli4.id, vendorId: vend3.id, atcUserId: userATC.id, estado: 'COTIZADO', prioridad: 3, tolerancia: 20, fechaCotizacion: new Date(), subtotal: 10728, iva: 1716.48, total: 12444.48, creadoPor: userATC.id } });
  await prisma.orderLine.create({ data: { orderId: ped1.id, skuId: skuEnigma.id, metrajeRequerido: 100, precioUnitario: 107.28, importe: 10728 } });
  // Reservas blandas
  await prisma.reservation.create({ data: { orderId: ped1.id, huId: allHUs[0].id, skuId: skuEnigma.id, metrajeReservado: 50, tipo: 'BLANDA', expiresAt: new Date(Date.now() + 24*60*60*1000), creadoPor: userATC.id } });
  await prisma.reservation.create({ data: { orderId: ped1.id, huId: allHUs[1].id, skuId: skuEnigma.id, metrajeReservado: 50, tipo: 'BLANDA', expiresAt: new Date(Date.now() + 24*60*60*1000), creadoPor: userATC.id } });
  await prisma.handlingUnit.updateMany({ where: { id: { in: [allHUs[0].id, allHUs[1].id] } }, data: { estadoHu: 'RESERVADO_BLANDO' } });

  // Ped 2: POR_PAGAR — reserva firme
  const ped2 = await prisma.order.create({ data: { codigo: 'PED-2026-0002', clientId: cli1.id, vendorId: vend1.id, atcUserId: userATC.id, estado: 'POR_PAGAR', prioridad: 3, tolerancia: 20, subtotal: 8950, iva: 1432, total: 10382, metodoPago: 'Banco Bancomer', creadoPor: userATC.id } });
  await prisma.orderLine.create({ data: { orderId: ped2.id, skuId: skuAlgRojo.id, metrajeRequerido: 100, precioUnitario: 89.50, importe: 8950 } });
  await prisma.reservation.create({ data: { orderId: ped2.id, huId: allHUs[8].id, skuId: skuAlgRojo.id, metrajeReservado: 50, tipo: 'FIRME', creadoPor: userATC.id } });
  await prisma.reservation.create({ data: { orderId: ped2.id, huId: allHUs[9].id, skuId: skuAlgRojo.id, metrajeReservado: 50, tipo: 'FIRME', creadoPor: userATC.id } });
  await prisma.handlingUnit.updateMany({ where: { id: { in: [allHUs[8].id, allHUs[9].id] } }, data: { estadoHu: 'RESERVADO' } });

  // Ped 3: POR_SURTIR
  const ped3 = await prisma.order.create({ data: { codigo: 'PED-2026-0003', folioContpaqi: 'PE 182851', clientId: cli3.id, vendorId: vend1.id, atcUserId: userATC.id, estado: 'POR_SURTIR', prioridad: 2, tolerancia: 20, fechaPago: new Date(Date.now()-2*86400000), fechaAprobCobranza: new Date(Date.now()-86400000), subtotal: 6300, iva: 1008, total: 7308, referenciaPago: '38687', metodoPago: 'Bancomer', creadoPor: userATC.id } });
  await prisma.orderLine.create({ data: { orderId: ped3.id, skuId: skuPolNeg.id, metrajeRequerido: 50, precioUnitario: 65, importe: 3250 } });
  await prisma.orderLine.create({ data: { orderId: ped3.id, skuId: skuAlgAzul.id, metrajeRequerido: 40, precioUnitario: 78, importe: 3120 } });

  // Ped 4: EN_CORTE con corte real
  const ped4 = await prisma.order.create({ data: { codigo: 'PED-2026-0004', folioContpaqi: 'PE 182849', clientId: cli2.id, vendorId: vend2.id, atcUserId: userATC.id, estado: 'EN_CORTE', prioridad: 1, tolerancia: 20, fechaPago: new Date(Date.now()-5*86400000), fechaAprobCobranza: new Date(Date.now()-4*86400000), subtotal: 4475, iva: 716, total: 5191, referenciaPago: '38680', creadoPor: userATC.id } });
  const ped4L1 = await prisma.orderLine.create({ data: { orderId: ped4.id, skuId: skuAlgRojo.id, metrajeRequerido: 50, precioUnitario: 89.50, importe: 4475, estado: 'EN_PROCESO' } });
  // Simular corte
  const cutHU = allHUs[10]; // algodón rojo #3
  const retazo = await prisma.handlingUnit.create({ data: { codigo: 'HU-2026-00031', skuId: skuAlgRojo.id, metrajeOriginal: 9, metrajeActual: 9, anchoMetros: 1.5, pesoKg: 2.7, tipoRollo: 'RETAZO', estadoHu: 'DISPONIBLE', parentHuId: cutHU.id, generacion: 1, etiquetaImpresa: false } });
  await prisma.handlingUnit.update({ where: { id: cutHU.id }, data: { metrajeActual: 0, estadoHu: 'EN_CORTE' } });
  await prisma.cutOperation.create({ data: { codigo: 'COR-2026-00001', huOrigenId: cutHU.id, orderLineId: ped4L1.id, metrajeAntes: 50, metrajeCortado: 41, metrajeRestante: 9, huRetazoId: retazo.id, cortadoPor: userCortador.id } });
  await prisma.orderLineAssignment.create({ data: { orderLineId: ped4L1.id, huId: cutHU.id, metrajeTomado: 41, requiereCorte: true, cortado: true } });

  // Ped 5: DESPACHADO
  await prisma.order.create({ data: { codigo: 'PED-2026-0005', folioContpaqi: 'PE 182840', clientId: cli5.id, vendorId: vend2.id, atcUserId: userATC.id, estado: 'DESPACHADO', prioridad: 1, tolerancia: 20, subtotal: 9500, iva: 1520, total: 11020, facturaRef: 'FAC-A-12345', facturaLista: true, referenciaPago: '38670', creadoPor: userATC.id } });

  console.log('  ✅ 5 pedidos en estados: COTIZADO → POR_PAGAR → POR_SURTIR → EN_CORTE → DESPACHADO');

  // =====================================================================
  // 9. SETTINGS
  // =====================================================================
  await prisma.systemSetting.createMany({ data: [
    { clave: 'empresa_nombre', valor: 'FORMA TEXTIL S. DE R.L. DE C.V.', grupo: 'general' },
    { clave: 'empresa_rfc', valor: 'FTE140429FP3', grupo: 'general' },
    { clave: 'empresa_direccion', valor: 'Rio La Barca No. 1680, Atlas C.P. 44870, Guadalajara, Jalisco', grupo: 'general' },
    { clave: 'empresa_telefono', valor: '3336505447', grupo: 'general' },
    { clave: 'empresa_email_cobranza', valor: 'cobranzafm@formatex.com.mx', grupo: 'general' },
    { clave: 'empresa_banco', valor: 'Banco Bancomer', grupo: 'facturacion' },
    { clave: 'empresa_clabe', valor: '012914002015155941', grupo: 'facturacion' },
    { clave: 'reserva_blanda_horas', valor: '24', tipo: 'number', grupo: 'reservas' },
    { clave: 'tolerancia_pedido_default', valor: '20', tipo: 'number', grupo: 'pedidos' },
  ]});

  // =====================================================================
  // 11. REORDER CONFIGS
  // =====================================================================
  console.log('📦 Configurando puntos de reorden...');
  const skuReorderData = [
    { skuId: skuEnigma.id, stockMinimo: 100, stockSeguridad: 50, puntoReorden: 150, cantidadReorden: 400, leadTimeDias: 25 },
    { skuId: skuAlgRojo.id, stockMinimo: 80, stockSeguridad: 40, puntoReorden: 120, cantidadReorden: 300, leadTimeDias: 20 },
    { skuId: skuAlgAzul.id, stockMinimo: 80, stockSeguridad: 40, puntoReorden: 120, cantidadReorden: 250, leadTimeDias: 20 },
    { skuId: skuPolNeg.id, stockMinimo: 60, stockSeguridad: 30, puntoReorden: 100, cantidadReorden: 250, leadTimeDias: 15 },
    { skuId: skuDenim.id, stockMinimo: 100, stockSeguridad: 50, puntoReorden: 150, cantidadReorden: 300, leadTimeDias: 30 },
    { skuId: skuSeda.id, stockMinimo: 30, stockSeguridad: 15, puntoReorden: 60, cantidadReorden: 120, leadTimeDias: 45 },
    { skuId: skuLino.id, stockMinimo: 40, stockSeguridad: 20, puntoReorden: 80, cantidadReorden: 160, leadTimeDias: 35 },
    { skuId: skuGab.id, stockMinimo: 50, stockSeguridad: 25, puntoReorden: 100, cantidadReorden: 200, leadTimeDias: 25 },
  ];
  await prisma.reorderConfig.createMany({ data: skuReorderData });
  console.log('  ✅ 8 puntos de reorden configurados');

  console.log('\n🎉 ¡SEED COMPLETADO!');
  console.log('===================================');
  console.log(`📦 ${allHUs.length + 1} HUs (${allHUs.length} enteros + 1 retazo)`);
  console.log('📋 5 pedidos en 5 estados diferentes');
  console.log('🚛 2 embarques en tránsito');
  console.log('🔒 4 reservas (2 blandas + 2 firmes)');
  console.log('👥 10 usuarios, 10 roles');
  console.log(`📍 ${locationData.length} ubicaciones`);
  console.log('📦 8 puntos de reorden');
  console.log('===================================');
}

main().catch(e => { console.error('❌', e); process.exit(1); }).finally(() => prisma.$disconnect());
