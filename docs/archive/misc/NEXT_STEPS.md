# 🚀 Next Steps - Sprint 2 Deployment

## 1. Start Database Services

First, ensure Docker Desktop is running, then:

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Verify services are running
docker ps
```

## 2. Apply Database Migrations

```bash
cd backend

# Create database if not exists
npx typeorm query "CREATE DATABASE vendhub" -d src/config/typeorm.config.ts 2>/dev/null || true

# Run all migrations
npm run migration:run

# Verify tables were created
npx typeorm query "SELECT table_name FROM information_schema.tables WHERE table_schema='public'" -d src/config/typeorm.config.ts
```

Expected new tables:
- `stock_opening_balances`
- `purchase_history`

## 3. Start Backend Server

```bash
# Development mode with hot reload
npm run start:dev

# The server will start on http://localhost:3000
```

## 4. Test New API Endpoints

### Test Opening Balances
```bash
# Get all opening balances
curl -X GET http://localhost:3000/opening-balances \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create opening balance
curl -X POST http://localhost:3000/opening-balances \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nomenclature_id": "NOMENCLATURE_UUID",
    "warehouse_id": "WAREHOUSE_UUID",
    "balance_date": "2024-01-01",
    "quantity": 100,
    "unit_cost": 5000,
    "unit": "шт"
  }'
```

### Test Purchase History
```bash
# Get all purchases
curl -X GET http://localhost:3000/purchase-history \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create purchase record
curl -X POST http://localhost:3000/purchase-history \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purchase_date": "2024-01-15",
    "supplier_id": "SUPPLIER_UUID",
    "nomenclature_id": "NOMENCLATURE_UUID",
    "quantity": 100,
    "unit_price": 10000,
    "vat_rate": 15
  }'
```

## 5. Access API Documentation

Open Swagger UI at: http://localhost:3000/api/docs

New endpoints available:
- `/opening-balances` - Stock opening balances management
- `/purchase-history` - Purchase history tracking
- `/intelligent-import/upload` - Import data from CSV/Excel

## 6. Import Sample Data

You can import data using the intelligent import endpoint:

```bash
# Import CSV file
curl -X POST http://localhost:3000/intelligent-import/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@sample_data.csv"
```

Supported domains for import:
- `COUNTERPARTIES` - Contractors/Suppliers
- `LOCATIONS` - Store locations
- `MACHINES` - Vending machines
- `NOMENCLATURE` - Products/Items
- `RECIPES` - Product recipes
- `OPENING_BALANCES` - Initial stock
- `PURCHASE_HISTORY` - Purchase records

## 7. Frontend Development

The backend is fully ready. Next steps for frontend:

1. **Create Master Data Management UI**
   - Counterparties management
   - Locations management
   - Machines management
   - Nomenclature management
   - Recipes management
   - Opening balances
   - Purchase history

2. **Build Import Wizard**
   - File upload interface
   - Column mapping UI
   - Validation preview
   - Import progress tracking

3. **Implement Setup Wizard**
   - Step-by-step onboarding
   - Company profile setup
   - Initial data import
   - System configuration

## Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs vendhub-postgres

# Verify .env file has correct database credentials
cat backend/.env | grep DATABASE
```

### Migration Errors
```bash
# Revert last migration if needed
npm run migration:revert

# Check migration status
npx typeorm migration:show -d src/config/typeorm.config.ts
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 PID
```

---

**Sprint 2 Backend Status**: ✅ COMPLETE
**Next Sprint**: Frontend Implementation

For questions, refer to:
- `/SPRINT2_MASTER_DATA_COMPLETED.md` - Implementation report
- `/AUTH_FINAL_IMPROVEMENTS.md` - Auth module documentation
- `/CLAUDE.md` - Project guidelines