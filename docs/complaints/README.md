# Complaints Module

## Overview

The Complaints module handles customer feedback and complaints submitted through QR codes on vending machines. It enables customers to report issues, track resolutions, and optionally receive refunds.

## Key Features

- QR code complaint submission
- Multiple complaint types
- Status tracking and workflow
- Refund management
- Customer rating collection
- Machine-linked complaints

## Entity

### Complaint

**File**: `backend/src/modules/complaints/entities/complaint.entity.ts`

```typescript
@Entity('complaints')
export class Complaint extends BaseEntity {
  machine_id: string;              // Machine where issue occurred
  complaint_type: ComplaintType;   // Type of complaint
  status: ComplaintStatus;         // Current status

  // Customer info
  customer_name: string;           // Customer name
  customer_phone: string;          // Phone for contact
  customer_email: string;          // Email (optional)

  // Complaint details
  description: string;             // Issue description
  incident_date: Date;             // When issue occurred
  product_name: string;            // Product involved (if any)
  amount_paid: number;             // Amount customer paid

  // Resolution
  refund_amount: number;           // Refund given (if any)
  resolution_notes: string;        // How issue was resolved
  resolved_at: Date;               // Resolution timestamp
  resolved_by_id: string;          // Who resolved it

  // Feedback
  rating: number;                  // Customer satisfaction (1-5)

  // Attachments
  photo_ids: string[];             // Photos submitted by customer
}
```

## Complaint Types

| Type | Value | Description |
|------|-------|-------------|
| Product Quality | `product_quality` | Product quality issues (stale, wrong temp, etc.) |
| No Change | `no_change` | Machine didn't return change |
| Not Dispensed | `product_not_dispensed` | Product not dispensed after payment |
| Machine Dirty | `machine_dirty` | Machine cleanliness complaint |
| Other | `other` | Other issues |

## Complaint Statuses

```
┌─────────┐     ┌────────────┐     ┌──────────┐
│   NEW   │────>│ IN_REVIEW  │────>│ RESOLVED │
└─────────┘     └────────────┘     └──────────┘
                      │
                      ▼
                ┌──────────┐
                │ REJECTED │
                └──────────┘
```

| Status | Value | Description |
|--------|-------|-------------|
| NEW | `new` | Just submitted |
| IN_REVIEW | `in_review` | Being investigated |
| RESOLVED | `resolved` | Issue resolved |
| REJECTED | `rejected` | Complaint rejected (invalid/fraudulent) |

## QR Code Flow

### Customer Experience

```
┌─────────────────────────────────────────────────────────────────┐
│                      CUSTOMER FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Customer scans QR code on machine                           │
│         │                                                        │
│         ▼                                                        │
│  2. Opens complaint form with machine pre-selected              │
│         │                                                        │
│         ▼                                                        │
│  3. Fills complaint type, description, contact info             │
│         │                                                        │
│         ▼                                                        │
│  4. Optionally uploads photos                                   │
│         │                                                        │
│         ▼                                                        │
│  5. Receives confirmation with ticket number                    │
│         │                                                        │
│         ▼                                                        │
│  6. Gets SMS/email when resolved                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### QR Code URL Format

```
https://vendhub.uz/complaint?machine={machine_number}
```

## API Endpoints

### Public Endpoints (No Auth)

```
POST   /api/complaints/public       Submit complaint via QR code
GET    /api/complaints/public/:id   Check complaint status
```

### Admin Endpoints (Authenticated)

```
GET    /api/complaints              List all complaints
GET    /api/complaints/:id          Get complaint details
PUT    /api/complaints/:id          Update complaint
POST   /api/complaints/:id/review   Start review
POST   /api/complaints/:id/resolve  Resolve complaint
POST   /api/complaints/:id/reject   Reject complaint
DELETE /api/complaints/:id          Delete complaint
```

### Filters

```
GET /api/complaints?status=new&machine_id={uuid}&type=product_quality
```

## DTOs

### CreateComplaintDto (Public)

```typescript
class CreateComplaintDto {
  @IsString()
  machine_number: string;

  @IsEnum(ComplaintType)
  complaint_type: ComplaintType;

  @IsString()
  @MinLength(10)
  description: string;

  @IsString()
  customer_name: string;

  @IsString()
  @Matches(/^\+998\d{9}$/)
  customer_phone: string;

  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @IsOptional()
  @IsNumber()
  amount_paid?: number;

  @IsOptional()
  @IsString()
  product_name?: string;

  @IsOptional()
  @IsArray()
  photo_ids?: string[];
}
```

### ResolveComplaintDto

```typescript
class ResolveComplaintDto {
  @IsString()
  resolution_notes: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refund_amount?: number;
}
```

## Service Methods

### ComplaintsService

| Method | Description |
|--------|-------------|
| `submit()` | Submit new complaint (public) |
| `findAll()` | List complaints with filters |
| `findOne()` | Get complaint details |
| `startReview()` | Move to in_review status |
| `resolve()` | Resolve complaint with notes |
| `reject()` | Reject complaint with reason |
| `getStatsByMachine()` | Complaint statistics per machine |
| `getStatsByType()` | Statistics by complaint type |

## Notification Flow

### On Submission

1. Customer receives SMS confirmation
2. Manager receives notification in dashboard
3. Assigned operator gets Telegram message

### On Resolution

1. Customer receives SMS/email with resolution
2. If refund given, finance team notified
3. Audit log entry created

## Statistics & Reports

### Machine Complaint Analysis

```typescript
interface MachineComplaintStats {
  machine_number: string;
  total_complaints: number;
  by_type: Record<ComplaintType, number>;
  avg_resolution_time_hours: number;
  avg_rating: number;
  total_refunds: number;
}
```

### Monthly Report

The system generates monthly complaint reports:

- Total complaints by type
- Resolution rate
- Average resolution time
- Total refunds issued
- Customer satisfaction rating

## Integration with Other Modules

### Machines

- Validates machine exists when complaint submitted
- Links complaint to specific machine
- Updates machine incident history

### Notifications

- SMS to customer on status change
- Email notifications
- Telegram alerts to managers

### Files

- Photo attachments stored in Files module
- Photos linked via `photo_ids` array

### Transactions

- Refunds recorded as transactions
- Links to original payment if identifiable

## Security Considerations

### Rate Limiting

Public endpoints have strict rate limits:
- 3 complaints per phone number per day
- 10 complaints per IP per hour

### Input Sanitization

- Phone numbers validated against Uzbek format (+998XXXXXXXXX)
- Description sanitized for XSS
- Photos validated (size, type)

### Fraud Prevention

- Duplicate detection (same machine + phone + timeframe)
- Pattern analysis for suspicious activity
- Manager review required for high-value refunds

## Best Practices

1. **Quick Response**: Review complaints within 24 hours
2. **Photo Evidence**: Always request photos for product issues
3. **Refund Policy**: Follow company refund guidelines
4. **Follow-up**: Collect customer rating after resolution
5. **Trend Analysis**: Monitor complaint patterns per machine

## Related Modules

- [Machines](../machines/README.md) - Machine information
- [Notifications](../notifications/README.md) - Customer notifications
- [Files](../files/README.md) - Photo attachments
- [Audit Logs](../audit-logs/README.md) - Change tracking
