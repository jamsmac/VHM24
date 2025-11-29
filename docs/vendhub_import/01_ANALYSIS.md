# VendHub Intelligent Import System - Analysis

> **Date**: 2025-11-17
> **Status**: Analysis Phase - Iteration 1
> **Author**: Autonomous System

---

## Executive Summary

This document analyzes the existing VendHub sales-import module and defines requirements for the new **VendHub Intelligent Import System** - an AI-powered, self-learning data import solution with 8 specialized agents and 4 workflows.

---

## 1. Current State Analysis

### 1.1 Existing `sales-import` Module

**Location**: `/home/user/VendHub/backend/src/modules/sales-import/`

**Architecture**:
```
sales-import/
├── dto/
│   └── upload-sales.dto.ts           # File upload DTO
├── entities/
│   └── sales-import.entity.ts        # SalesImport entity
├── sales-import.controller.ts        # REST API (6 endpoints)
├── sales-import.service.ts           # Business logic (526 lines)
├── sales-import.processor.ts         # Bull queue processor (359 lines)
└── sales-import.module.ts            # Module definition
```

**Key Components**:

1. **File Upload** (`sales-import.controller.ts:35`)
   - Endpoint: `POST /sales-import/upload`
   - Uses Multer file interceptor
   - Creates SalesImport record with status PENDING
   - Queues background job via Bull

2. **Queue Processing** (`sales-import.processor.ts:56`)
   - Queue: `sales-import`
   - Job: `process-file`
   - Async processing with retry (3 attempts, exponential backoff)
   - Progress tracking (0% → 100%)

3. **File Parsing** (lines 304-357)
   - **Excel**: Uses `xlsx` library (`XLSX.read()`, `sheet_to_json()`)
   - **CSV**: Uses `csv-parser` with Stream API
   - Normalizes to `ParsedRow` interface

4. **Column Detection** (`sales-import.service.ts:208-259`)
   - Supports Russian and English column names
   - Fields: date, machine_number, amount, payment_method, product_name, quantity
   - Example mappings:
     ```typescript
     date: row['date'] || row['Date'] || row['Дата'] || row['дата']
     machine: row['machine'] || row['Machine'] || row['Аппарат']
     amount: row['amount'] || row['Amount'] || row['Сумма']
     ```

5. **Validation** (`sales-import.processor.ts:132-210`)
   - ✅ Amount validation (> 0, ≤ 1,000,000)
   - ✅ Date validation (not future, not > 1 year old)
   - ✅ Machine existence check
   - ✅ Duplicate detection (same machine, date, amount, payment_method)
   - ✅ Quantity validation (> 0 if provided)

6. **Transaction Creation** (lines 212-232)
   - Creates `Transaction` entity with:
     - `transaction_type`: SALE
     - `machine_id`, `contract_id` (auto-linked from machine)
     - `nomenclature_id` (if product found)
     - `amount`, `currency` (UZS), `payment_method`
     - `sale_date`, `transaction_date`
     - `metadata`: import_id, row_number, original_product_name

7. **Inventory Management** (lines 234-249)
   - Calls `inventoryService.deductFromMachine()`
   - Non-blocking: continues if inventory update fails (just logs warning)

8. **Status Tracking** (`SalesImport` entity)
   - States: PENDING → PROCESSING → COMPLETED/FAILED/PARTIAL
   - Metrics: total_rows, success_rows, failed_rows
   - Error log: detailed error messages per row
   - Summary: total_amount, transactions_created, average_amount

**Integration Points**:
- ✅ `machines` module (Machine entity)
- ✅ `transactions` module (Transaction entity)
- ✅ `nomenclature` module (Nomenclature entity)
- ✅ `inventory` module (InventoryService)
- ✅ `users` module (User entity)

---

### 1.2 Current Strengths

1. **Robust Error Handling**
   - Database transactions for atomicity
   - Retry logic with exponential backoff
   - Detailed error logging per row
   - Partial success support (PARTIAL status)

2. **Good Architecture**
   - Separation of concerns (controller/service/processor)
   - Queue-based async processing
   - Progress tracking
   - Soft delete support

3. **Bilingual Support**
   - Russian and English column names
   - Localized error messages (Russian)

4. **Production-Ready Features**
   - Duplicate detection
   - Data validation
   - Audit trail (metadata in transactions)
   - Contract auto-linking (Phase 3 commission tracking)

---

### 1.3 Current Limitations (Opportunities for AI Enhancement)

| **Limitation** | **Current Behavior** | **AI Enhancement Opportunity** |
|----------------|---------------------|--------------------------------|
| **Fixed Column Mapping** | Hardcoded Russian/English field names | AI Classification Agent with self-learning |
| **No Template Learning** | Same rules for all imports | Learning Agent builds templates from history |
| **Manual Machine/Product Mapping** | Fails if not found | Suggestion Agent proposes new entities |
| **No User Confirmation** | Auto-creates transactions | UX/Approval Agent generates diff/preview |
| **No Reconciliation** | One-way import only | Reconciliation Agent detects gaps |
| **No Incremental Updates** | Full file re-import | Incremental Update Workflow with diffing |
| **Basic Validation** | Static rules only | Rules Engine + Validation Agent |
| **No Schema Flexibility** | Hardcoded `ParsedRow` interface | Schema Registry for dynamic domains |
| **Limited File Formats** | Excel, CSV only | Extensible to JSON, XML, API responses |
| **No ML Pattern Recognition** | Rule-based parsing | ML-based field classification |

---

## 2. Requirements for Intelligent Import System

### 2.1 Core Objectives

1. **Self-Learning System**: Automatically improve accuracy from past imports
2. **Domain-Agnostic**: Support sales, inventory, equipment, HR, billing data
3. **User-Friendly**: Generate previews, confirmations, diffs before execution
4. **Fault-Tolerant**: Detect anomalies, handle errors gracefully, suggest fixes
5. **Audit-Compliant**: Complete change tracking with before/after states
6. **Scalable**: Handle large files (10,000+ rows) with streaming
7. **Extensible**: Plugin architecture for new file formats and validation rules

### 2.2 Functional Requirements

**FR1**: Parse files (XLSX, CSV, JSON) with automatic column detection
**FR2**: Classify data domain (sales, inventory, machines, etc.) automatically
**FR3**: Validate data against business rules with custom rule engine
**FR4**: Suggest creation of new entities (machines, products, users)
**FR5**: Generate human-readable preview/diff before execution
**FR6**: Execute inserts/updates/merges with rollback capability
**FR7**: Reconcile imported data with existing database state
**FR8**: Learn from corrections and build reusable templates

### 2.3 Non-Functional Requirements

**NFR1**: Process 10,000 rows in < 2 minutes
**NFR2**: 99% uptime for import service
**NFR3**: Support concurrent imports (5+ simultaneous jobs)
**NFR4**: GDPR-compliant audit logs (retention policy)
**NFR5**: API-first design (REST + WebSocket for progress)
**NFR6**: Test coverage > 80%

---

## 3. Proposed Architecture

### 3.1 Agent-Based Design

```
┌─────────────────────────────────────────────────────────────┐
│                    VendHub Import System                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ File Intake  │→ │Classification│→ │  Validation  │       │
│  │    Agent     │  │    Agent     │  │    Agent     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         ↓                  ↓                  ↓              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Suggestion  │→ │ UX/Approval  │→ │  Execution   │       │
│  │    Agent     │  │    Agent     │  │    Agent     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         ↓                  ↓                  ↓              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Reconciliation│  │   Learning   │  │Schema Registry│      │
│  │    Agent     │  │    Agent     │  │+ Rules Engine│      │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                        Workflows                             │
├─────────────────────────────────────────────────────────────┤
│  • import_workflow (main pipeline)                           │
│  • template_learning_workflow (self-improvement)             │
│  • incremental_update_workflow (daily updates)               │
│  • reconciliation_workflow (consistency checks)              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Integration with Existing Module

**Strategy**: Extend, don't replace

1. **Keep existing `sales-import` module** for backwards compatibility
2. **Create new `intelligent-import` module** with agent system
3. **Share common infrastructure**:
   - Bull queue (`import-queue`)
   - File storage (S3/MinIO)
   - Database entities (extend `SalesImport`)
4. **Gradual migration**:
   - Phase 1: Intelligent import for new domains (inventory, equipment)
   - Phase 2: Add AI to sales import (parallel mode)
   - Phase 3: Full cutover when proven stable

---

## 4. Agent Specifications

### Agent 1: File Intake Agent

**Responsibilities**:
- Accept file uploads (REST API, drag-drop, S3 bucket watch)
- Detect file type (XLSX, CSV, JSON, XML)
- Parse file content with appropriate library
- Extract raw tables/records
- Normalize to common data structure
- Store raw data in staging table

**Skills**:
- `file_type_detection` - MIME type + extension analysis
- `xlsx_parser` - Uses `xlsx` library
- `csv_parser` - Uses `csv-parser` with encoding detection
- `json_parser` - Uses `JSON.parse()` with validation
- `table_extraction` - Detect header row, data rows, footer
- `encoding_detection` - Handle UTF-8, UTF-16, Windows-1251

**Tools**:
- `parseFile(buffer, type)` → `RawTable[]`
- `detectEncoding(buffer)` → `string`
- `extractHeaders(rows)` → `string[]`

**Outputs**:
- `RawTable` - Normalized table with headers and rows
- `FileMetadata` - Size, rows, columns, encoding, checksum

---

### Agent 2: Classification Agent

**Responsibilities**:
- Detect data domain (sales, inventory, machines, users, etc.)
- Map file columns to database fields
- Identify relationships (machine → contract, product → category)
- Generate column mapping configuration
- Detect data types (date, number, enum, UUID)

**Skills**:
- `domain_detection` - ML-based classifier (sales vs inventory vs equipment)
- `column_mapping` - Fuzzy matching + synonym detection
- `relationship_detection` - Detect foreign keys
- `data_type_inference` - Analyze column values

**Tools**:
- `classifyDomain(headers, sampleRows)` → `DomainType`
- `mapColumns(headers, schema)` → `ColumnMapping`
- `inferTypes(column)` → `DataType`

**Outputs**:
- `DomainType` - Enum: SALES, INVENTORY, MACHINES, EQUIPMENT, HR, BILLING
- `ColumnMapping` - Map file columns → DB fields
- `Confidence` - 0-100% per mapping

---

### Agent 3: Validation Agent

**Responsibilities**:
- Validate data against business rules
- Check referential integrity (machine exists, product exists)
- Detect anomalies (outliers, unusual patterns)
- Flag duplicates
- Generate validation report

**Skills**:
- `schema_validation` - JSON Schema validation
- `business_rules` - Custom rule engine
- `referential_integrity` - FK checks
- `anomaly_detection` - Statistical outlier detection
- `duplicate_detection` - Fuzzy matching + exact matching

**Tools**:
- `validateRow(row, rules)` → `ValidationResult`
- `checkIntegrity(row, db)` → `IntegrityIssue[]`
- `detectAnomalies(column)` → `Anomaly[]`

**Outputs**:
- `ValidationReport` - Errors, warnings, info per row
- `ErrorSeverity` - CRITICAL, WARNING, INFO

---

### Agent 4: Suggestion Agent

**Responsibilities**:
- Detect missing entities (new machines, products, users)
- Propose creation with default values
- Suggest data corrections (typos, format fixes)
- Generate action plan (insert/update/skip)

**Skills**:
- `entity_detection` - Detect missing references
- `default_value_generation` - Smart defaults from context
- `typo_correction` - Levenshtein distance, phonetic matching
- `action_planning` - Decide insert/update/merge/skip

**Tools**:
- `detectMissingEntities(rows, db)` → `Entity[]`
- `suggestDefaults(entity)` → `DefaultValues`
- `generateActions(rows)` → `ActionPlan`

**Outputs**:
- `ActionPlan` - List of INSERT, UPDATE, MERGE, SKIP actions
- `NewEntity` - Proposed entities to create

---

### Agent 5: UX/Approval Agent

**Responsibilities**:
- Generate human-readable import summary
- Create diff/preview of changes
- Highlight conflicts and risks
- Format error messages
- Send approval request to user

**Skills**:
- `summary_generation` - Concise text summaries
- `diff_generation` - Before/after comparisons
- `conflict_detection` - Highlight risky operations
- `formatting` - Markdown, HTML, JSON outputs

**Tools**:
- `generateSummary(actions)` → `ImportSummary`
- `generateDiff(before, after)` → `Diff`
- `formatErrors(errors)` → `string`

**Outputs**:
- `ImportSummary` - "X new sales, Y updates, Z new machines"
- `Diff` - Before/after table with highlights
- `ConfirmationRequest` - JSON for frontend display

---

### Agent 6: Execution Agent

**Responsibilities**:
- Execute approved actions in database transaction
- Handle rollback on error
- Update audit log
- Emit WebSocket progress events
- Finalize import session

**Skills**:
- `transactional_write` - TypeORM transactions
- `batch_processing` - Chunk large imports
- `rollback_handling` - Savepoints
- `audit_logging` - Before/after snapshots

**Tools**:
- `executeActions(actions, transaction)` → `ExecutionResult`
- `createAuditEntry(action, result)` → `AuditLog`
- `emitProgress(progress)` → `void`

**Outputs**:
- `ExecutionResult` - Success/failure per action
- `AuditLog` - Complete change history

---

### Agent 7: Reconciliation Agent

**Responsibilities**:
- Compare imported data vs database state
- Detect missing records (gaps in sequences)
- Find inconsistencies (mismatched totals)
- Propose corrections
- Generate reconciliation report

**Skills**:
- `gap_detection` - Find missing sequences
- `consistency_check` - Sum validation, count checks
- `correction_proposal` - Suggest fixes

**Tools**:
- `detectGaps(imported, existing)` → `Gap[]`
- `checkConsistency(domain)` → `Issue[]`
- `proposeCorrection(issue)` → `Correction`

**Outputs**:
- `ReconciliationReport` - Gaps, inconsistencies, proposed fixes

---

### Agent 8: Learning Agent

**Responsibilities**:
- Analyze successful imports
- Extract reusable patterns
- Update column mapping templates
- Improve validation rules
- Train ML classifiers

**Skills**:
- `pattern_extraction` - Find common structures
- `template_generation` - Create reusable mappings
- `rule_induction` - Learn business rules from data
- `model_training` - Update ML models

**Tools**:
- `extractPattern(imports)` → `Pattern`
- `updateTemplate(template, corrections)` → `Template`
- `trainClassifier(samples)` → `MLModel`

**Outputs**:
- `ImportTemplate` - Reusable configuration
- `MLModel` - Trained classifier

---

## 5. Workflow Definitions

### Workflow 1: import_workflow

**Trigger**: File upload
**Steps**:
1. File Intake Agent → Parse file
2. Classification Agent → Detect domain, map columns
3. Validation Agent → Validate data
4. Suggestion Agent → Propose actions
5. UX/Approval Agent → Generate preview, request approval
6. **[Wait for User Approval]**
7. Execution Agent → Execute approved actions
8. Reconciliation Agent → Verify results
9. Learning Agent → Update templates (async)

**Duration**: ~2-5 minutes (manual approval time not counted)

---

### Workflow 2: template_learning_workflow

**Trigger**: Scheduled (daily, after successful imports)
**Steps**:
1. Learning Agent → Analyze last 30 days of imports
2. Extract common patterns
3. Update schema registry
4. Update validation rules
5. Store new templates

**Duration**: ~10 minutes
**Frequency**: Daily at 3 AM

---

### Workflow 3: incremental_update_workflow

**Trigger**: Recurring import (same source daily)
**Steps**:
1. File Intake Agent → Parse new file
2. Classification Agent → Load template from last import
3. Diff against previous file
4. Validation Agent → Validate only changes
5. Auto-execute if changes < threshold (10 rows)
6. Otherwise → UX/Approval Agent

**Duration**: ~1 minute (auto-approved)

---

### Workflow 4: reconciliation_workflow

**Trigger**: Scheduled (weekly) or on-demand
**Steps**:
1. Reconciliation Agent → Check all domains
2. Detect gaps (missing sales dates, inventory mismatches)
3. Generate report
4. Email to admin/manager
5. Optionally: Auto-fix minor issues

**Duration**: ~15 minutes
**Frequency**: Weekly on Sunday

---

## 6. Database Schema Extensions

### New Tables

```sql
-- Schema Registry (stores table/field definitions)
CREATE TABLE schema_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(50) NOT NULL,  -- 'sales', 'inventory', 'machines'
  table_name VARCHAR(100) NOT NULL,
  field_definitions JSONB NOT NULL,  -- [{name, type, required, validation}]
  relationships JSONB,  -- Foreign keys
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation Rules (business logic)
CREATE TABLE validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(50) NOT NULL,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50),  -- 'range', 'regex', 'custom'
  rule_definition JSONB NOT NULL,  -- {field, operator, value}
  severity VARCHAR(20),  -- 'error', 'warning', 'info'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import Templates (learned patterns)
CREATE TABLE import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  domain VARCHAR(50) NOT NULL,
  column_mapping JSONB NOT NULL,  -- {file_col: db_field}
  validation_overrides JSONB,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import Sessions (extend SalesImport)
CREATE TABLE import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(50) NOT NULL,
  status VARCHAR(20),  -- 'pending', 'classified', 'validated', 'approved', 'executing', 'completed', 'failed'
  template_id UUID REFERENCES import_templates(id),
  file_metadata JSONB,  -- Size, rows, columns, checksum
  classification_result JSONB,  -- Domain, column mapping, confidence
  validation_report JSONB,  -- Errors, warnings per row
  action_plan JSONB,  -- Proposed inserts/updates
  approval_status VARCHAR(20),  -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  execution_result JSONB,  -- Success/failure counts
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Audit Log (change tracking)
CREATE TABLE import_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES import_sessions(id),
  action_type VARCHAR(20),  -- 'INSERT', 'UPDATE', 'DELETE', 'MERGE'
  table_name VARCHAR(100),
  record_id UUID,
  before_state JSONB,
  after_state JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID REFERENCES users(id)
);

-- ML Models (trained classifiers)
CREATE TABLE ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type VARCHAR(50),  -- 'domain_classifier', 'column_mapper'
  version INTEGER,
  training_data_count INTEGER,
  accuracy DECIMAL(5,4),  -- 0.9500 = 95%
  model_blob BYTEA,  -- Serialized model (or path to file)
  active BOOLEAN DEFAULT TRUE,
  trained_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Technology Stack

### Backend (NestJS)
- **Agents**: Separate services in `intelligent-import/agents/` directory
- **Workflows**: BullMQ with step-based jobs
- **Rules Engine**: Custom TypeScript + JSON Schema
- **ML**: `@tensorflow/tfjs-node` or Python microservice

### Libraries
- **File Parsing**: `xlsx`, `csv-parser` (existing), `xml2js`, `papaparse`
- **Validation**: `class-validator`, `ajv` (JSON Schema)
- **Fuzzy Matching**: `fuzzball` (Levenshtein), `natural` (NLP)
- **ML**: TensorFlow.js, Scikit-learn (Python)

### Database
- **PostgreSQL 14** with JSONB for flexible schemas
- **Redis** for queue state and caching
- **Bull/BullMQ** for workflow orchestration

---

## 8. Integration with AIAssistant & data-parse-desk

### Reference Repositories

1. **[AIAssistant](https://github.com/jamsmac/AIAssistant)** (assumed structure)
   - Expected patterns:
     - Agent architecture with specialized skills
     - Tool-based function calling
     - State machine workflows
     - LLM integration (Claude, GPT)
   - **Action**: Clone repo and analyze patterns

2. **[data-parse-desk](https://github.com/jamsmac/data-parse-desk)** (assumed structure)
   - Expected patterns:
     - File parsing utilities
     - Column detection algorithms
     - Data normalization
     - Template management
   - **Action**: Clone repo and extract reusable components

**Integration Strategy**:
- Port TypeScript-compatible code directly
- Adapt Python code to NestJS microservice
- Wrap LLM calls in NestJS providers
- Share Bull queue between systems

---

## 9. Success Metrics

| **Metric** | **Target** | **Measurement** |
|------------|-----------|-----------------|
| Import accuracy | > 95% | Rows processed successfully |
| Template reuse | > 80% | Imports using learned templates |
| Auto-approval rate | > 60% | Incremental updates auto-approved |
| Processing speed | < 2 min | 10,000 rows end-to-end |
| User satisfaction | > 4.5/5 | Post-import survey |
| Error reduction | 50% YoY | Compared to manual imports |

---

## 10. Next Steps (PLAN Phase)

1. ✅ **Analysis Complete** (this document)
2. 🔄 **Design architecture** (next: 02_ARCHITECTURE.md)
3. 🔄 Create database migrations
4. 🔄 Implement Agent 1 (File Intake)
5. 🔄 Implement Agent 2 (Classification)
6. 🔄 Build schema registry
7. 🔄 Build rules engine
8. 🔄 Wire workflows
9. 🔄 Write tests
10. 🔄 Deploy to staging

---

## Appendix A: Existing Code Analysis

### Key Files Reviewed

1. **sales-import.service.ts** (526 lines)
   - Main business logic
   - File parsing, row processing
   - Transaction creation with inventory updates

2. **sales-import.processor.ts** (359 lines)
   - Bull queue processor
   - Validation logic
   - Duplicate detection
   - Progress tracking

3. **sales-import.controller.ts** (143 lines)
   - REST API endpoints
   - File upload handling
   - Import status queries

4. **sales-import.entity.ts** (85 lines)
   - Import tracking entity
   - Status enum, metrics

### Reusable Components

- ✅ File parsing functions (XLSX, CSV)
- ✅ Queue infrastructure (Bull)
- ✅ Error handling patterns
- ✅ Progress tracking
- ✅ Transaction creation logic

### Code Quality

- ✅ Well-structured (service/controller/processor separation)
- ✅ Comprehensive error handling
- ✅ Good validation coverage
- ✅ Production-ready logging
- ⚠️ Lacks unit tests (will add in intelligent-import)

---

**End of Analysis**
