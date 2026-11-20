# 🚀 Quick Start - Attendance Feature

## 30 Second Setup

### Step 1: Get Cloudinary Credentials (2 minutes)
1. Go to https://cloudinary.com/ → Sign up (free)
2. Copy your **Cloud Name** from dashboard
3. Create upload preset:
   - Settings → Upload
   - "Add upload preset"
   - Name: `attendance`
   - Set to "Unsigned"
   - Save
4. Copy preset name

### Step 2: Update Code (30 seconds)
Edit **src/Api/CloudinaryService.ts**:
```typescript
const CLOUDINARY_CLOUD_NAME = 'YOUR_CLOUD_NAME_HERE';
const CLOUDINARY_UPLOAD_PRESET = 'attendance'; // or your preset name
```

### Step 3: Verify Backend
Make sure your backend has a POST endpoint:
```
POST /api/attendance
```

Accepts JSON:
```json
{
  "userId": "string",
  "imageUrl": "string",
  "latitude": number,
  "longitude": number,
  "timestamp": "ISO string"
}
```

### Step 4: Update Redux Selector (if needed)
Check **attendance.tsx** line 41 matches your store:
```typescript
const userId = useSelector((state: any) => state.auth?.user?.id);
```

## Done! ✅

Test on physical device:
```bash
expo start
# Scan QR code with Expo Go app
# Or: npx expo run:android
```

## What You Get

✅ Camera capture screen
✅ Location permission handling
✅ Cloudinary image upload
✅ Backend attendance marking
✅ Error handling
✅ Loading states
✅ Success alerts

## File Locations

- Screen: `app/(drawer)/attendance.tsx`
- Upload: `src/Api/CloudinaryService.ts`
- API: `src/Api/AttendanceService.ts`
- Docs: `ATTENDANCE_GUIDE.md`

## Troubleshooting

**Camera not working?**
→ Test on physical device (simulator limitation)

**Upload fails?**
→ Check Cloudinary credentials

**API not receiving data?**
→ Verify endpoint and check backend logs

**Getting 'unknown-user'?**
→ Update Redux selector in attendance.tsx

## Full Documentation

See `ATTENDANCE_GUIDE.md` for:
- Detailed setup instructions
- Security best practices
- Database schema examples
- Customization options
- Troubleshooting guide

## Next Steps

1. Configure Cloudinary
2. Test end-to-end
3. Deploy to production
4. Monitor attendance records

That's it! The feature is production-ready. 🎉
