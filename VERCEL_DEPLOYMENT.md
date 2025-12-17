# Vercel Deployment Guide

## Phiên bản Vercel - Chỉ Frontend

Phiên bản này đã được tối ưu hóa để deploy lên Vercel, chỉ bao gồm các tính năng frontend:

### ✅ Tính năng có sẵn:
- ✅ Giao diện người dùng React
- ✅ Tích hợp Google Gemini AI (client-side)
- ✅ Subtitle editor với timeline visualization
- ✅ Translation với Gemini AI
- ✅ Upload file trực tiếp (không qua server)
- ✅ Remotion Player để preview video

### ❌ Tính năng đã loại bỏ (yêu cầu backend server):
- ❌ Download video từ YouTube/Douyin/TikTok (yêu cầu yt-dlp server)
- ❌ Video rendering (yêu cầu Remotion server + FFmpeg)
- ❌ AI Voice cloning (F5-TTS, Chatterbox - yêu cầu Python server)
- ❌ Background music generation (yêu cầu MIDI server)
- ❌ Video segmentation (yêu cầu FFmpeg server)
- ❌ Audio extraction (yêu cầu FFmpeg server)
- ❌ NVIDIA Parakeet ASR (yêu cầu Python server)

## Deploy lên Vercel

### Bước 1: Chuẩn bị
1. Tạo tài khoản Vercel tại https://vercel.com
2. Cài đặt Vercel CLI (tùy chọn):
   ```bash
   npm i -g vercel
   ```

### Bước 2: Deploy

#### Cách 1: Deploy qua Vercel Dashboard (Khuyến nghị)
1. Push code lên GitHub repository
2. Truy cập https://vercel.com/new
3. Import repository của bạn
4. Vercel sẽ tự động detect React app
5. Click "Deploy"

#### Cách 2: Deploy qua CLI
```bash
vercel
```

### Bước 3: Cấu hình Environment Variables
Trong Vercel Dashboard, thêm các biến môi trường:
- `REACT_APP_GEMINI_API_KEY`: API key của Google Gemini

### Bước 4: Cấu hình Domain (Tùy chọn)
- Vercel sẽ tự động cung cấp domain `.vercel.app`
- Bạn có thể thêm custom domain trong Settings

## Sử dụng

Sau khi deploy, người dùng có thể:
1. Upload file video/audio trực tiếp
2. Sử dụng Gemini AI để tạo subtitle
3. Chỉnh sửa subtitle với timeline editor
4. Dịch subtitle sang nhiều ngôn ngữ
5. Export subtitle dưới dạng SRT, JSON

## Lưu ý

- Tất cả xử lý đều diễn ra trên client-side (browser)
- File size giới hạn bởi browser memory
- Không có video rendering - chỉ có subtitle generation và editing
- Cần Gemini API key để sử dụng AI features

## Nâng cấp lên Full Version

Nếu bạn cần các tính năng backend (video rendering, voice cloning, etc.), 
vui lòng sử dụng phiên bản OSG Full và chạy trên máy local theo hướng dẫn trong README.md
