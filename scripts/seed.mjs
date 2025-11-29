import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed Products
  const productsData = [
    { name: "Coffee Beans (Arabica)", sku: "COFFEE-001", category: "Ingredients", unit: "g", costPrice: 15, sellingPrice: 25 },
    { name: "Milk", sku: "MILK-001", category: "Ingredients", unit: "ml", costPrice: 5, sellingPrice: 10 },
    { name: "Sugar", sku: "SUGAR-001", category: "Ingredients", unit: "g", costPrice: 2, sellingPrice: 5 },
    { name: "Chocolate Powder", sku: "CHOCO-001", category: "Ingredients", unit: "g", costPrice: 10, sellingPrice: 18 },
    { name: "Tea Leaves", sku: "TEA-001", category: "Ingredients", unit: "g", costPrice: 8, sellingPrice: 15 },
    { name: "Espresso", sku: "DRINK-001", category: "Beverages", unit: "pcs", costPrice: 50, sellingPrice: 150 },
    { name: "Latte", sku: "DRINK-002", category: "Beverages", unit: "pcs", costPrice: 80, sellingPrice: 200 },
    { name: "Cappuccino", sku: "DRINK-003", category: "Beverages", unit: "pcs", costPrice: 75, sellingPrice: 190 },
  ];

  await db.insert(schema.products).values(productsData);
  console.log("✅ Products seeded");

  // Seed Machines
  const machinesData = [
    { name: "Downtown Cafe #1", serialNumber: "VM-001", model: "CoffeeMaster 3000", location: "123 Main St, Downtown", latitude: "40.7128", longitude: "-74.0060", status: "online" },
    { name: "University Library", serialNumber: "VM-002", model: "CoffeeMaster 3000", location: "456 Campus Dr, University", latitude: "40.7580", longitude: "-73.9855", status: "online" },
    { name: "Airport Terminal A", serialNumber: "VM-003", model: "CoffeeMaster Pro", location: "789 Airport Rd, Terminal A", latitude: "40.6413", longitude: "-73.7781", status: "maintenance" },
    { name: "Shopping Mall Entrance", serialNumber: "VM-004", model: "CoffeeMaster 3000", location: "321 Mall Blvd, West Wing", latitude: "40.7489", longitude: "-73.9680", status: "online" },
    { name: "Office Tower Lobby", serialNumber: "VM-005", model: "CoffeeMaster Lite", location: "555 Business Ave, Lobby", latitude: "40.7614", longitude: "-73.9776", status: "offline" },
  ];

  await db.insert(schema.machines).values(machinesData);
  console.log("✅ Machines seeded");

  // Seed Suppliers
  const suppliersData = [
    { name: "Global Coffee Imports", contactPerson: "John Smith", email: "john@globalcoffee.com", phone: "+1-555-0100", address: "100 Bean St, Seattle, WA" },
    { name: "Dairy Fresh Co.", contactPerson: "Mary Johnson", email: "mary@dairyfresh.com", phone: "+1-555-0200", address: "200 Milk Rd, Wisconsin" },
    { name: "Sweet Supplies Inc.", contactPerson: "Bob Williams", email: "bob@sweetsupp.com", phone: "+1-555-0300", address: "300 Sugar Ln, Florida" },
  ];

  await db.insert(schema.suppliers).values(suppliersData);
  console.log("✅ Suppliers seeded");

  // Seed Components
  const componentsData = [
    { serialNumber: "GR-001", type: "Grinder", model: "BurrMaster 500", status: "operational", currentMachineId: 1, healthScore: 95 },
    { serialNumber: "GR-002", type: "Grinder", model: "BurrMaster 500", status: "operational", currentMachineId: 2, healthScore: 88 },
    { serialNumber: "PU-001", type: "Pump", model: "AquaFlow 200", status: "operational", currentMachineId: 1, healthScore: 92 },
    { serialNumber: "PU-002", type: "Pump", model: "AquaFlow 200", status: "maintenance", currentMachineId: null, healthScore: 65 },
    { serialNumber: "BO-001", type: "Boiler", model: "HeatPro 1000", status: "operational", currentMachineId: 3, healthScore: 78 },
  ];

  await db.insert(schema.components).values(componentsData);
  console.log("✅ Components seeded");

  // Seed Inventory (Warehouse level)
  const inventoryData = [
    { productId: 1, level: "warehouse", locationId: null, quantity: 5000 }, // Coffee Beans
    { productId: 2, level: "warehouse", locationId: null, quantity: 10000 }, // Milk
    { productId: 3, level: "warehouse", locationId: null, quantity: 3000 }, // Sugar
    { productId: 4, level: "warehouse", locationId: null, quantity: 2000 }, // Chocolate
    { productId: 5, level: "warehouse", locationId: null, quantity: 1500 }, // Tea
  ];

  await db.insert(schema.inventory).values(inventoryData);
  console.log("✅ Inventory seeded");

  // Seed Tasks
  const tasksData = [
    { machineId: 1, type: "refill", status: "pending", priority: "normal", description: "Refill coffee beans and milk" },
    { machineId: 2, type: "maintenance", status: "in_progress", priority: "urgent", description: "Replace grinder component" },
    { machineId: 3, type: "cleaning", status: "completed", priority: "low", description: "Deep clean brewing unit", completedAt: new Date() },
    { machineId: 4, type: "refill", status: "pending", priority: "normal", description: "Restock all ingredients" },
  ];

  await db.insert(schema.tasks).values(tasksData);
  console.log("✅ Tasks seeded");

  // Seed Transactions (last 7 days)
  const transactionsData = [];
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const machineId = Math.floor(Math.random() * 5) + 1;
    const productId = Math.floor(Math.random() * 3) + 6; // Beverages only
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    
    transactionsData.push({
      machineId,
      productId,
      quantity: 1,
      amount: [150, 200, 190][productId - 6],
      paymentMethod: ["card", "cash", "mobile"][Math.floor(Math.random() * 3)],
      createdAt,
    });
  }

  await db.insert(schema.transactions).values(transactionsData);
  console.log("✅ Transactions seeded");

  console.log("🎉 Database seeded successfully!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
