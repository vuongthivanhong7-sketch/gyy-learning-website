# Hướng dẫn cấu hình GYY (dành cho người mới)

Web GYY chạy được ngay mà **không cần** cấu hình gì: khi đó nó ở "chế độ thử nghiệm", dữ liệu học chỉ lưu trong trình duyệt của bạn.
Để mỗi học viên đăng nhập bằng Google của riêng họ, có Sổ tay riêng, bảng xếp hạng và cộng đồng, bạn cần làm 4 việc dưới đây. Tên menu trên Supabase và Google có thể hơi khác theo thời gian, nhưng các bước giữ nguyên.

## Việc 1: Nạp / cập nhật dữ liệu Quán dụng ngữ (đã làm sẵn cho file LỌC_QUÁN_DỤNG_NGỮ.xlsx)

1. Đặt file Excel vào thư mục dự án (hoặc tải Google Sheets về dạng .xlsx).
2. Chạy: `npm run import-data -- ten-file.xlsx`
3. Lệnh in ra từng sheet đọc được bao nhiêu dòng, cột nào chưa dùng, rồi ghi `public/data/idioms.json` và `public/data/strokes.json` (dữ liệu thứ tự nét).
4. Triển khai lại để người học thấy dữ liệu mới.

Cách file hiện được hiểu: mỗi **sheet là một cuốn sách** (tên sheet là tên nguồn). Mỗi dòng là một lần Quán dụng ngữ xuất hiện (cột Đề, Câu số, Số trang, Trích dẫn). Các dòng cùng một Quán dụng ngữ được gộp lại. `Nghĩa bóng` thành nghĩa tiếng Việt chính, `Ví dụ` và cột dịch thành câu ví dụ. **Pinyin được tạo tự động** (thư viện pinyin-pro) vì file chưa có cột pinyin. Nếu bạn thêm cột `Pinyin`, `Chủ đề` hoặc `Hình ảnh` vào sheet thì báo mình để thêm vào bộ nạp.

## Việc 2: Tạo Supabase (database + đăng nhập)

1. Vào https://supabase.com, đăng ký, bấm **New project**, đặt tên `gyy`, chọn vùng gần Việt Nam (ví dụ Singapore), đặt mật khẩu database rồi tạo.
2. Mở **SQL Editor → New query**, dán toàn bộ nội dung file `supabase/schema.sql`, bấm **Run**. Bước này tạo các bảng và quy tắc để mỗi người chỉ đọc/sửa được dữ liệu của chính mình.
3. Vào **Project Settings → API**, copy hai giá trị: **Project URL** và khóa **anon / public**.
4. Trong thư mục dự án, sao chép `.env.example` thành `.env.local` và điền:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Khóa `anon` được phép nằm ở frontend. **Tuyệt đối không** dùng khóa `service_role` trong dự án này.

## Việc 3: Bật đăng nhập Google

1. Vào https://console.cloud.google.com, tạo một project mới (ví dụ `gyy`).
2. **APIs & Services → OAuth consent screen**: chọn *External*, điền tên ứng dụng `GYY`, email hỗ trợ, rồi lưu. Khi thử nghiệm bạn có thể để ở trạng thái *Testing* và thêm email người thử vào *Test users*; khi mở cho mọi người, bấm **Publish app**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
   - Mục **Authorized redirect URIs**: dán `https://<mã-project-supabase>.supabase.co/auth/v1/callback` (mã project nằm trong Project URL ở Việc 2).
   - Bấm tạo, copy **Client ID** và **Client secret**.
4. Trong Supabase: **Authentication → Providers → Google**, bật lên, dán Client ID và Client secret, lưu.
5. Trong Supabase: **Authentication → URL Configuration**:
   - **Site URL**: địa chỉ web thật của bạn (sau khi triển khai).
   - **Redirect URLs**: thêm `http://localhost:5173/**` và địa chỉ web thật `https://ten-mien-cua-ban/**`.

Web luôn gửi tham số `prompt=select_account`, nên người dùng luôn thấy hộp chọn tài khoản Google, không tự điền sẵn tài khoản của bạn.

## Việc 4: Triển khai

Dùng Vercel hoặc Netlify (đều có gói miễn phí):
1. Đưa thư mục dự án lên GitHub (file `.env.local` đã được loại trừ sẵn).
2. Trên Vercel/Netlify: import repo, lệnh build `npm run build`, thư mục xuất `dist`.
3. Khai báo hai biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong phần Environment Variables của dịch vụ.
4. Quay lại Việc 3 bước 5 để điền địa chỉ web thật.
(`vercel.json` và `public/_redirects` đã có sẵn để các đường dẫn như /hoc, /so-tay không bị lỗi 404 khi tải lại.)

## Kiểm tra sau khi cấu hình

1. Mở web bằng cửa sổ ẩn danh, bấm **Đăng nhập bằng Google**, chọn một tài khoản, thêm vài Quán dụng ngữ vào Sổ tay.
2. Đăng xuất, đăng nhập bằng tài khoản Google khác: Sổ tay phải trống và không thấy dữ liệu của tài khoản đầu.
3. Tải lại trang: tiến độ, streak và Sổ tay vẫn còn.

## Giới hạn hiện tại bạn nên biết

- Điểm bảng xếp hạng do trình duyệt gửi lên. Database đã chặn giá trị bất thường (điểm mỗi lần tối đa 30, thời gian phải gần hiện tại) nhưng người rành kỹ thuật vẫn có thể gửi điểm giả. Nếu sau này xếp hạng có phần thưởng, cần chuyển phần tính điểm sang Supabase Edge Function.
- Đọc trực tiếp Google Sheets theo thời gian thực chưa làm: hiện dùng file xuất ra + lệnh `import-data`. Cách này không cần tài khoản Google của bạn nằm trong web.
- Chấm câu "Đặt câu" bằng AI chưa kết nối, nên web chỉ kiểm tra câu có chứa Quán dụng ngữ và cho bạn tự đối chiếu.
- Hình minh họa theo nghĩa bóng lấy từ cột `Hình ảnh` trong dữ liệu. Chưa có cột này thì hiện ô "Chưa có hình", web không tự bịa hình.
- Phát âm dùng giọng đọc tiếng Trung có sẵn của trình duyệt/thiết bị (hoặc cột `audio` nếu có), chất lượng tùy máy.
- Dữ liệu nét chữ Hán tải từ CDN jsDelivr khi người học mở bước Viết chữ, nên cần có mạng.

## Chủ đề, hình minh họa và kiểm chứng (trang Quản trị)

**Chủ đề.** File dữ liệu hiện chưa có cột chủ đề, và GYY không tự gán chủ đề. Có hai cách: (1) thêm cột `Chủ đề` vào sheet (một ô có thể ghi nhiều chủ đề, cách nhau bằng dấu chấm phẩy) rồi chạy lại `npm run import-data`; (2) dùng trang `/quan-tri` → tab Chủ đề để tạo danh mục và gán cho từng mục. Chế độ "Xem theo Chủ đề" ở tab Học tổng hợp từ toàn bộ kho, không giới hạn theo sách.

**Hình minh họa.** Sheet có thể có các cột `Hình ảnh` (đường dẫn http/https), `Nguồn ảnh`, `Giấy phép ảnh`. Hoặc dùng `/quan-tri` → tab Hình ảnh để tải ảnh lên / dán đường dẫn, xem trước, lưu, khôi phục ảnh cũ, xóa. GYY không tự lấy ảnh từ Google Images vì không thể kiểm tra giấy phép; ảnh từ web bắt buộc ghi trang nguồn và giấy phép.

**Quản trị lưu ở đâu.** Chỉnh sửa lưu bền vững trong trình duyệt đang dùng (bản nháp). Để áp dụng cho mọi người: `/quan-tri` → tab Xuất / nhập → xuất `overrides.json` (chủ đề + hình) và `verifications.json` (kiểm chứng), đặt vào `public/data/`, rồi triển khai lại (hoặc build lại bản một file). Trang này chưa có tài khoản quản trị thật. Khi có Supabase, nên chuyển phần ghi sang bảng có phân quyền.

**Tra cứu chung và kiểm chứng.** Web không tự tra được bốn tài liệu (không có toàn văn công khai, và trang tĩnh không có máy chủ tra cứu). Vì vậy mọi cụm từ mặc định là "Chưa có dữ liệu kiểm chứng". Kết quả "Đã xác minh" chỉ xuất hiện khi quản trị viên nhập bằng chứng từ tài liệu (ít nhất một trong: trang, số mục từ, trích dẫn, đường dẫn) ở `/quan-tri` → tab Kiểm chứng. Quy tắc: có ít nhất một nguồn xác nhận 惯用语 thì giữ lại, kể cả khi nguồn khác xếp 成语/谚语/俗语; chỉ có nhãn khác thì "Chưa xác định"; kiểm tra mà không thấy thì "Chưa tìm thấy trong các nguồn đã kiểm tra" (không kết luận tuyệt đối). Cấu trúc mỗi hồ sơ: `term, pinyin, literal, results[] (sourceId, status, labels, entryNo, page, quote, meaning, example, url, checkedAt, checker, note), approval, note`.

## Dashboard: mục tiêu, nhiệm vụ, XP

- **XP** là tổng điểm hoạt động: hoàn thành một bài học bốn bước +10, mỗi lần ôn nhớ được +3, mỗi câu luyện tập đúng +2 (tối đa 30 mỗi phiên), thưởng nhiệm vụ (ôn tập +10, học mới +10, một phiên luyện tập +5).
- **Nhiệm vụ hôm nay** tính từ hoạt động thật trong ngày (giờ Việt Nam). Thưởng chỉ nhận được một lần cho mỗi nhiệm vụ mỗi ngày, bằng nút "Nhận XP"; tải lại trang không nhận lại được.
- **Streak** chỉ tính ngày có học, ôn hoặc luyện tập; thưởng nhiệm vụ và việc mở trang không tính.
- **Mục tiêu** (số mục mới và số mục ôn mỗi ngày, bật/tắt nhắc) lưu cùng dữ liệu học. Với Supabase, chúng được lưu trong bảng `progress` bằng hai dòng mã đặc biệt `__prefs__` và `__claims__`, nên không cần thêm bảng. Nếu bạn đã chạy `schema.sql` cũ, hãy chạy lại bản mới để cho phép loại hoạt động `bonus`.

## Chỉ mục ba từ điển (OCR từ bản quét PDF)

`public/data/dict-index.json` là chỉ mục tiêu đề mục từ của 《现代汉语惯用语词典》, 《常用惯用语辞典》 và 《谚语俗语惯用语词典》, đọc bằng OCR từ ba file PDF quét (không có lớp chữ). Tra cứu chung tự đối chiếu cụm từ với chỉ mục này và ghi số trang (trang PDF và số trang in).

- Hai cuốn đầu là từ điển chuyên về 惯用语 (lời nói đầu ghi 6.000 và 4.000 mục), nên mục từ có mặt được tính là xác nhận 惯用语. Cuốn thứ ba ghi nhãn 〈谚〉〈俗〉〈惯〉 từng mục: chỉ nhãn 〈惯〉 mới xác nhận; 〈谚〉〈俗〉 là "chưa xác định"; mục chưa đọc được nhãn là "cần kiểm chứng thêm".
- Chỉ mục chỉ có tiêu đề mục từ (chưa có nghĩa và ví dụ), và OCR có thể sai chữ hoặc bỏ sót khoảng 10% mục từ. "Không thấy trong chỉ mục" nghĩa là chưa tìm thấy, không phải "không phải Quán dụng ngữ". Hãy mở trang gốc để đối chiếu khi cần.
- Tạo lại chỉ mục: chạy `python3 scripts/build-dict-index.py` sau khi có kết quả OCR trong `/tmp/ocr/out/` (cần RapidOCR và tệp `ocr_dicts.py`).
- Cuốn 复旦《惯用语教程》 chưa có bản PDF nên luôn là "chưa kiểm tra".

## Đăng nhập Google bằng Firebase Authentication

GYY dùng Firebase Authentication (đăng nhập Google) và Firestore (lưu dữ liệu theo UID) khi có đủ biến `VITE_FIREBASE_*` trong `.env.local`. Nếu không có, GYY dùng Supabase (nếu cấu hình) hoặc chế độ lưu trên máy. Firebase Console chỉ để bạn cấu hình, học viên đăng nhập ngay trong GYY.

1. Vào https://console.firebase.google.com/u/0/ , chọn đúng project (hoặc tạo mới).
2. **Project settings → Your apps → Add app → Web**. Sao chép các giá trị config vào `.env.local` theo mẫu `.env.example`.
3. **Authentication → Sign-in method → Google → Enable → Save** (tên menu có thể đổi theo giao diện Console).
4. **Authentication → Settings → Authorized domains**: thêm tên miền triển khai GYY (và `localhost` khi chạy thử).
5. **Firestore Database → Create database**, rồi dán nội dung `firestore.rules` vào tab **Rules** và **Publish**. Quy tắc này chỉ cho mỗi người đọc/ghi `users/{uid}` của chính mình, mọi đường dẫn khác bị chặn.
6. Triển khai (Vercel/Netlify) với các biến môi trường như trên rồi thử: đăng nhập tài khoản A, đăng xuất, đăng nhập tài khoản B (dữ liệu phải riêng), mở cửa sổ ẩn danh, tải lại trang.

Ghi chú: Hỏi - Đáp và Bảng xếp hạng hiện chỉ chạy với Supabase; với Firebase chúng chưa bật (cần Cloud Functions để tổng hợp điểm). Web luôn gọi `prompt=select_account`, không gợi ý sẵn tài khoản nào. Trên điện thoại dùng chuyển hướng, trên máy tính dùng cửa sổ bật lên. Đừng gửi mật khẩu, mã xác minh hay private key trong hội thoại.

## Chấm câu bằng AI (bài "Đặt câu")

Hàm `api/ai-sentence.ts` (Vercel) gọi mô hình AI ở phía máy chủ. Đặt biến môi trường `ANTHROPIC_API_KEY` trên Vercel (không đặt trong frontend). Frontend gọi `/api/ai-sentence` (hoặc `VITE_AI_ENDPOINT`). Chưa có hàm hoặc khóa thì bài hiển thị rõ "chưa kết nối AI" và chỉ cho khung gợi ý có sẵn, không giả vờ chấm điểm. Bản đăng trên claude.ai (một file) không gọi được máy chủ ngoài nên không có AI; cần triển khai trên Vercel.

## Giọng đọc nam/nữ

Mặc định GYY dùng giọng Quan thoại có sẵn trên thiết bị; chỉ bật lựa chọn nam/nữ khi thiết bị có giọng được nhận diện rõ (Windows: Huihui, Yaoyao, Kangkang; Edge: Xiaoxiao, Yunxi, v.v.; Apple: Ting-Ting, Li-mu). Để có cả hai giọng trên mọi thiết bị, triển khai hàm `api/tts.ts` (Google Cloud Text-to-Speech, biến `GOOGLE_TTS_API_KEY`, tính phí theo Google) rồi đặt `VITE_TTS_ENDPOINT=/api/tts`. Khóa không bao giờ nằm ở frontend. Giọng Firebase Authentication không liên quan đến TTS.

## Âm thanh

Nhạc nền nhẹ và tiếng "ting" khi trả lời đúng do GYY tự tạo bằng Web Audio (không dùng tệp nhạc có bản quyền). Nhạc chỉ phát sau khi người dùng bật và chạm vào trang. Cài đặt nằm ở mục "Tôi" → Cài đặt, lưu theo tài khoản (hoặc trên máy khi chưa đăng nhập).

## Từ điển mở rộng và cách phân loại Quán dụng ngữ (惯用语)

- **Từ điển mở rộng:** `public/data/dict/` chứa CC-CEDICT (MDBG, giấy phép CC BY-SA 4.0, khoảng 123.500 mục, bản 2025-10-02), chia theo chữ đầu để trình duyệt chỉ tải đúng phần cần dùng (mỗi phần tối đa khoảng 90 KB). Tạo lại bằng `pip install cepy-dict && python3 scripts/build-ext-dict.py`. Nghĩa là **tiếng Anh nguyên văn từ nguồn**; GYY không tự dịch sang tiếng Việt. Dữ liệu này không có từ loại và không có nhãn 惯用语, chỉ có nhãn "(idiom)" cho cụm cố định.
- **Phân loại A / B / C:** A = có xác nhận 惯用语 từ từ điển chuyên ngành đã lập chỉ mục (《现代汉语惯用语词典》, 《常用惯用语辞典》, nhãn 〈惯〉 của 《谚语俗语惯用语词典》) hoặc từ hồ sơ kiểm chứng của quản trị viên; B = có căn cứ thuộc loại khác (nhãn 〈谚〉〈俗〉, hoặc CC-CEDICT gắn idiom) mà chưa có xác nhận 惯用语; C = chưa đủ dữ liệu. 99 mục GYY được gắn nhãn "Thuộc danh sách nghiên cứu GYY" riêng và không được dùng để phân loại.
- **Phạm vi thật:** chỉ tra được các từ có trong CC-CEDICT và trong chỉ mục ba từ điển OCR. Không phải mọi từ tiếng Trung. Nguồn 汉语大词典, 汉典, 百度汉语 và CCL chỉ có liên kết tra cứu ngoài (chưa kiểm tra giấy phép hay API công khai nên chưa tích hợp). Bản một file đăng trên claude.ai không kèm từ điển mở rộng (quá nặng), cần dùng bản triển khai `gyy-hosting.zip`.
- **Chi phí:** CC-CEDICT miễn phí nhưng yêu cầu ghi nguồn và giữ nguyên giấy phép CC BY-SA khi chia sẻ dữ liệu phái sinh.
- **Kiểm thử tự động:** `npm test` kiểm tra 99 mục còn nguyên (so với `tests/idiom-manifest.json`), ID không trùng, đủ trường, đủ chủ đề, và các từ mẫu 钻空子, 夜猫子, 开绿灯, 马马虎虎, 画蛇添足, 学校, 认真, 帮忙.
