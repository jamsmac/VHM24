# 🚀 Cloudflare R2 Setup Guide

Complete guide for setting up Cloudflare R2 as S3-compatible storage for VendHub Manager.

---

## 🎯 Why Cloudflare R2?

✅ **S3-Compatible** - Works with existing AWS SDK code
✅ **Free Tier** - 10GB storage free forever
✅ **Zero Egress Fees** - No charges for data transfer out
✅ **Fast** - Cloudflare's global network
✅ **Simple Migration** - Same code for MinIO (dev) and R2 (production)

---

## 📋 Prerequisites

- Cloudflare account (free or paid)
- Access to Cloudflare Dashboard
- VendHub backend with S3Storage implementation

---

## 🔧 Setup Steps

### Step 1: Create Cloudflare Account

1. Go to https://cloudflare.com
2. Sign up or log in
3. Navigate to R2 section (in sidebar)

### Step 2: Enable R2

1. Click "Purchase R2" (free tier available)
2. Verify your account (if required)
3. R2 dashboard will be activated

### Step 3: Create R2 Bucket

1. In R2 dashboard, click "Create bucket"
2. Enter bucket name: `vendhub` (or your preferred name)
3. Select location hint (optional - auto is fine)
4. Click "Create bucket"

**✅ Bucket created!**

### Step 4: Generate API Tokens

1. Navigate to "Manage R2 API Tokens"
2. Click "Create API Token"

**Token Configuration:**
- **Token Name**: `vendhub-backend`
- **Permissions**:
  - ✅ Object Read & Write
  - ✅ Admin Read & Write (if you want to manage buckets programmatically)
- **Bucket Scope**:
  - Select specific bucket: `vendhub`
- **TTL**: Never expire (or set expiration as needed)

3. Click "Create API Token"
4. **IMPORTANT**: Copy and save these credentials immediately:
   - **Access Key ID** - You'll use this as `S3_ACCESS_KEY`
   - **Secret Access Key** - You'll use this as `S3_SECRET_KEY`
   - You won't be able to see the secret again!

### Step 5: Get R2 Endpoint URL

1. In your bucket details, find the S3 API endpoint
2. It will look like: `https://<account-id>.r2.cloudflarestorage.com`
3. Copy your Account ID from the URL or dashboard

**Your endpoint**: `https://<account-id>.r2.cloudflarestorage.com`

### Step 6: Configure VendHub Backend

Update your `.env` file (or environment variables):

```env
# Cloudflare R2 Configuration
S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
S3_BUCKET=vendhub
S3_ACCESS_KEY=<your-r2-access-key-id>
S3_SECRET_KEY=<your-r2-secret-access-key>
S3_REGION=auto
```

**Example**:
```env
S3_ENDPOINT=https://a1b2c3d4e5f6.r2.cloudflarestorage.com
S3_BUCKET=vendhub
S3_ACCESS_KEY=abc123def456ghi789
S3_SECRET_KEY=supersecretkey123456789
S3_REGION=auto
```

### Step 7: Test Connection

Start your backend and test file upload:

```bash
cd backend
npm run start:dev
```

Upload a test file through the API:

```bash
curl -X POST http://localhost:3000/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-image.jpg" \
  -F "entity_type=test" \
  -F "entity_id=123" \
  -F "category_code=test_photo"
```

**✅ If successful, you'll see the file in R2 bucket!**

### Step 8: Verify in R2 Dashboard

1. Go back to R2 dashboard
2. Click on your `vendhub` bucket
3. You should see the uploaded file with path: `test/123/test_photo/<filename>`

---

## 🌐 Optional: Setup Custom Domain (Public URLs)

If you want to serve files publicly via custom domain:

### Step 1: Connect Domain to R2

1. In bucket settings, click "Settings" tab
2. Under "Public Access", click "Connect Domain"
3. Enter your custom domain: e.g., `files.yourdomain.com`
4. Follow Cloudflare's instructions to verify domain

### Step 2: Update Environment

```env
S3_PUBLIC_URL=https://files.yourdomain.com
```

Now `s3StorageService.getPublicUrl()` will return public URLs instead of signed URLs.

---

## 💰 Pricing (as of 2024)

### Free Tier (Forever)
- ✅ **10 GB** storage
- ✅ **1 million** Class A operations/month (writes)
- ✅ **10 million** Class B operations/month (reads)
- ✅ **Unlimited** egress (data transfer out)

### Paid Tier (if you exceed free)
- **Storage**: $0.015/GB/month
- **Class A** (writes): $4.50/million
- **Class B** (reads): $0.36/million
- **Egress**: $0.00 (always free!)

**For VendHub**: With typical usage (photos, documents), you'll likely stay within free tier for a long time.

---

## 🔐 Security Best Practices

### 1. Rotate API Keys Regularly

Create a process to rotate keys every 90 days:
1. Generate new API token
2. Update environment variables
3. Deploy with zero downtime
4. Revoke old token after verification

### 2. Use Bucket Policies

For enhanced security, configure bucket policies in R2:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::vendhub/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "203.0.113.0/24"
          ]
        }
      }
    }
  ]
}
```

### 3. Enable Versioning (Optional)

For critical files, enable versioning in bucket settings:
- Protects against accidental deletion
- Allows file recovery
- Adds storage cost for versions

### 4. Setup Lifecycle Rules (Optional)

Automatically delete old files:
1. Go to bucket settings → Lifecycle rules
2. Example: Delete files older than 365 days in `temp/` prefix

---

## 🔄 Migration from Local Storage

If you have existing files in local `uploads/` directory:

### Step 1: Create Migration Script

```typescript
// scripts/migrate-to-r2.ts
import { S3StorageService } from '../backend/src/modules/files/s3-storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';

async function migrateFiles() {
  const s3 = new S3StorageService();
  const uploadsDir = './uploads';

  // Get all files recursively
  const files = await getFilesRecursively(uploadsDir);

  for (const file of files) {
    const relativePath = path.relative(uploadsDir, file);
    const buffer = await fs.readFile(file);

    await s3.uploadFile(relativePath, buffer);
    console.log(`Migrated: ${relativePath}`);
  }
}

async function getFilesRecursively(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const res = path.resolve(dir, entry.name);
      return entry.isDirectory() ? getFilesRecursively(res) : res;
    }),
  );
  return files.flat();
}

migrateFiles();
```

### Step 2: Run Migration

```bash
cd backend
npx ts-node scripts/migrate-to-r2.ts
```

### Step 3: Update Database

Update `files` table to point to new S3 keys:

```sql
UPDATE files
SET file_path = REPLACE(file_path, './uploads/', '')
WHERE file_path LIKE './uploads/%';
```

---

## 🐛 Troubleshooting

### Error: "Access Denied" or "Forbidden"

**Cause**: Incorrect API credentials or permissions

**Solution**:
1. Verify `S3_ACCESS_KEY` and `S3_SECRET_KEY` are correct
2. Check API token has read/write permissions
3. Ensure bucket scope includes your bucket

### Error: "NoSuchBucket"

**Cause**: Bucket doesn't exist or wrong endpoint

**Solution**:
1. Verify `S3_BUCKET` name matches exactly
2. Ensure `S3_ENDPOINT` includes your correct account ID
3. Check bucket wasn't deleted

### Error: "SignatureDoesNotMatch"

**Cause**: Incorrect secret key or clock drift

**Solution**:
1. Regenerate API token and update credentials
2. Ensure server time is synced (check with `date`)
3. Verify no extra spaces in environment variables

### Files Upload But Can't Download

**Cause**: Missing permissions or incorrect endpoint

**Solution**:
1. Verify API token has both read AND write permissions
2. Test with signed URL: `await s3.getSignedUrl(key)`
3. Check CloudFlare R2 status page

### Slow Upload/Download

**Cause**: Network or configuration issue

**Solution**:
1. Test from different location
2. Check Cloudflare status
3. Verify not hitting rate limits

---

## 📊 Monitoring

### View Usage in Dashboard

1. R2 Dashboard → Metrics
2. Monitor:
   - Storage used (GB)
   - Operations count
   - Request errors

### Setup Alerts (Optional)

Use Cloudflare Notifications:
1. Workers & Pages → Notifications
2. Create alert for R2 bucket errors
3. Configure email/webhook delivery

---

## 🔄 Switching Between MinIO and R2

VendHub supports seamless switching:

**Local Development (MinIO)**:
```env
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=vendhub_minio
S3_SECRET_KEY=vendhub_minio_password_dev
```

**Production (Cloudflare R2)**:
```env
S3_ENDPOINT=https://a1b2c3.r2.cloudflarestorage.com
S3_ACCESS_KEY=<r2-key>
S3_SECRET_KEY=<r2-secret>
```

**Same code, different environment!** ✨

---

## 🎉 Next Steps

1. ✅ Configure R2
2. ✅ Test file upload/download
3. ✅ Migrate existing files (if any)
4. ✅ Setup monitoring alerts
5. ✅ Configure custom domain (optional)
6. ✅ Setup backup strategy (optional)

---

## 📚 Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/platform/pricing/)
- [R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/)
- [R2 Best Practices](https://developers.cloudflare.com/r2/reference/best-practices/)

---

## 💬 Support

If you encounter issues:

1. Check [CRITICAL_FIXES.md](./architecture/CRITICAL_FIXES.md) for S3 implementation details
2. Review S3StorageService logs
3. Test with MinIO first to isolate R2-specific issues
4. Contact Cloudflare support (24/7 for paid plans)

---

**Ready to scale!** 🚀 Your files are now stored on Cloudflare's global network with zero egress fees!
