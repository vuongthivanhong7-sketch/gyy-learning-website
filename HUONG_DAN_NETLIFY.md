# Triển khai GYY lên Netlify

## Kết luận kiểm tra
- `gyy-hosting.zip` cũ là **bản tĩnh đã build** (chỉ có `index.html`, `assets/`, `data/`, `_redirects`). Phần AI/TTS **không** nằm trong gói đó và được viết theo kiểu Vercel (`api/*.ts`), nên **không chạy trên Netlify**. Quy tắc `/* → /index.html` trong `_redirects` còn bắt luôn cả đường `/api/...`.
- Đã sửa: thêm Netlify Functions (`netlify/functions/ai-sentence.ts`, `tts.ts`), sửa `public/_redirects`, thêm `netlify.toml`, và gom 10.671 tệp từ điển thành 684 tệp (`data/dict/b<hex>.json`).
- Firebase hoạt động với tên miền Netlify, nhưng **bạn phải tự thêm tên miền** vào Authorized domains (xem bước 5).

## Chọn một trong ba cách triển khai

### Cách A (khuyến nghị): Git + Netlify tự build
Dùng `gyy-netlify-source.zip`. Cách này có đủ: giao diện, từ điển, AI, TTS, Firebase.
1. Giải nén, đưa toàn bộ thư mục lên một repo GitHub (không commit `.env.local`, `node_modules`, `dist`).
2. Netlify → **Add new project → Import an existing project → GitHub** → chọn repo.
3. Các ô cấu hình (đã có sẵn trong `netlify.toml`, hãy kiểm tra khớp):
   - **Base directory:** để trống (thư mục gốc repo)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
   - Node: 22 (đặt bởi `NODE_VERSION` trong `netlify.toml`)
4. Thêm biến môi trường (Project configuration → Environment variables), rồi **Deploy**:

| Biến | Giá trị | Phạm vi | Ghi chú |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | từ Firebase | Builds | công khai theo thiết kế |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` | Builds | |
| `VITE_FIREBASE_PROJECT_ID` | từ Firebase | Builds | |
| `VITE_FIREBASE_APP_ID` | từ Firebase | Builds | |
| `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` | từ Firebase | Builds | tùy chọn |
| `VITE_TTS_ENDPOINT` | `/api/tts` | Builds | chỉ khi muốn giọng nam/nữ qua Google TTS |
| `VITE_AI_ENDPOINT` | (để trống) | Builds | mặc định đã là `/api/ai-sentence` |
| `ANTHROPIC_API_KEY` | khóa của bạn | **Functions**, đánh dấu secret | bắt buộc để AI chấm câu hoạt động |
| `GOOGLE_TTS_API_KEY` | khóa Google Cloud TTS | **Functions**, đánh dấu secret | chỉ khi dùng TTS qua máy chủ |

   Các biến `VITE_*` được nhúng vào mã **lúc build**: đổi giá trị thì phải **Trigger deploy** lại. Hai khóa `ANTHROPIC_API_KEY` và `GOOGLE_TTS_API_KEY` chỉ nằm ở máy chủ, không bao giờ vào frontend.
5. Firebase Console (https://console.firebase.google.com/u/0/):
   - Authentication → Settings → **Authorized domains** → thêm `<tên-site>.netlify.app` và tên miền riêng (nếu có).
   - Authentication → Sign-in method → Google đã bật; Firestore → Rules → dán `firestore.rules` → Publish.
   - Trên điện thoại GYY dùng chuyển hướng đăng nhập. Một số trình duyệt (Safari, Chrome mới) hạn chế lưu trữ bên thứ ba nên có thể lỗi khi `authDomain` khác tên miền site. Cách khắc phục theo tài liệu Firebase (chưa kiểm thử ở đây): thêm vào **đầu** `public/_redirects` dòng `/__/auth/*  https://<project>.firebaseapp.com/__/auth/:splat  200`, đặt `VITE_FIREBASE_AUTH_DOMAIN` = tên miền Netlify của bạn, và thêm `https://<tên-miền-netlify>/__/auth/handler` vào "Authorized redirect URIs" của OAuth client Web trong Google Cloud Console.

### Cách B: Netlify CLI (không cần Git)
Dùng `gyy-netlify-source.zip`, giải nén rồi trong thư mục đó:
```
npm ci
npm i -g netlify-cli
netlify login
netlify init            # tạo/liên kết site
netlify env:set VITE_FIREBASE_API_KEY "..."     # lặp lại cho các biến ở bảng trên
netlify env:set ANTHROPIC_API_KEY "..." --secret
netlify deploy --build --prod
```
`--build` chạy `npm run build` rồi đưa `dist` và `netlify/functions` lên.

### Cách C: Netlify Drop (kéo thả) — chỉ bản tĩnh
Dùng `gyy-netlify-dist.zip`: **giải nén**, rồi kéo **thư mục chứa `index.html`** (không phải tệp ZIP) vào https://app.netlify.com/drop.
- Có: giao diện, 99 Quán dụng ngữ, từ điển mở rộng, học và luyện tập (dữ liệu lưu trên trình duyệt).
- **Không có:** AI chấm câu, TTS (kéo thả không triển khai Functions), và đăng nhập Firebase (cấu hình `VITE_*` phải có lúc build; bản dựng sẵn này không chứa cấu hình nào). Muốn có Firebase mà vẫn kéo thả: tự build trên máy với `.env.local` rồi kéo thư mục `dist`.
- Gói có 699 tệp, nằm trong giới hạn của Netlify (tối đa 54.000 tệp mỗi thư mục; triển khai bằng ZIP qua API tối đa 25.000 tệp).

## Kiểm tra sau triển khai (checklist)
1. Mở `https://<site>.netlify.app/tra-cuu?che-do=chung`, tải lại trang (F5): phải vẫn vào đúng trang (không 404).
2. Tra `学校`: phải hiện nghĩa "school" từ CC-CEDICT. Nếu báo "Chưa tải được từ điển mở rộng", kiểm tra `https://<site>/data/dict/b270.json` (phải trả JSON).
3. Mở `https://<site>/api/ai-sentence` bằng trình duyệt (GET): phải trả `{"error":"method_not_allowed"}` (nghĩa là hàm đang chạy). POST khi chưa có khóa trả `not_configured`. Làm bài "Đặt câu" thật để xác nhận AI sau khi có khóa.
4. Đăng nhập Google bằng tài khoản A, đăng xuất, đăng nhập tài khoản B: dữ liệu phải riêng biệt.

## Chi phí và giới hạn
Netlify, Firebase có gói miễn phí nhưng giới hạn theo gói (số lần gọi hàm, băng thông, đọc/ghi Firestore): xem trang giá của từng dịch vụ. Anthropic API và Google Cloud TTS tính phí theo lượng dùng. Giới hạn tần suất trong hàm (in-memory) chỉ là lớp bảo vệ cơ bản, không bền giữa các lần khởi động hàm; muốn chặn lạm dụng chắc chắn cần dịch vụ giới hạn tần suất riêng.

Giữ nguyên thư mục `api/`: `netlify/functions/ai-sentence.ts` dùng chung `api/ai-core.ts`. Tệp `vercel.json` bị Netlify bỏ qua.
