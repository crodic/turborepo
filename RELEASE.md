# 🚀 Hướng dẫn Quy trình Release (Semantic Release Guide)

Tài liệu này hướng dẫn chi tiết quy trình phát hành phiên bản tự động (**Semantic Release**) trong dự án Monorepo.

---

## 📋 1. Tổng quan Quy trình Release

Dự án sử dụng **`semantic-release`** tích hợp với **GitHub Actions** để tự động hóa toàn bộ quy trình:

- Phân tích nội dung commit tuân thủ quy chuẩn [Conventional Commits](https://www.conventionalcommits.org/).
- Tự động tính toán số phiên bản tiếp theo theo chuẩn [Semantic Versioning (SemVer)](https://semver.org/).
- Tự động sinh & cập nhật nhật ký thay đổi trong file `CHANGELOG.md`.
- Tự động cập nhật số phiên bản trong file `package.json`.
- Tự động tạo **Git Tag** và **GitHub Release** trên GitHub Repository.

---

## 📝 2. Quy tắc đặt tên Commit (Conventional Commits)

Để hệ thống tính toán phiên bản chính xác, **mọi commit message khi đẩy vào nhánh `main` / `master` bắt buộc phải tuân theo quy chuẩn**:

```text
<type>(<scope>): <description>
```

### Bảng phân loại phiên bản:

| Ký hiệu (`type`)                    | Ý nghĩa                              | Loại Release      | Ví dụ Phiên bản    |
| :---------------------------------- | :----------------------------------- | :---------------- | :----------------- |
| **`fix`**                           | Sửa lỗi bug                          | **PATCH**         | `1.0.0` ➡️ `1.0.1` |
| **`feat`**                          | Thêm tính năng mới                   | **MINOR**         | `1.0.0` ➡️ `1.1.0` |
| **`refactor`** / **`perf`**         | Cải tiến cấu trúc / Hiệu năng        | **PATCH**         | `1.0.0` ➡️ `1.0.1` |
| **`BREAKING CHANGE`**               | Thay đổi lớn làm hỏng tương thích cũ | **MAJOR**         | `1.0.0` ➡️ `2.0.0` |
| **`docs`**                          | Cập nhật tài liệu README             | **PATCH**         | `1.0.0` ➡️ `1.0.1` |
| **`chore`** / **`test`** / **`ci`** | Công việc bảo trì, test, CI/CD       | **Không Release** | _(Giữ nguyên)_     |

### Các ví dụ Commit hợp lệ:

- **Sửa lỗi (Patch release):**
  ```bash
  git commit -m "fix(api): fix user authentication token expiration"
  ```
- **Thêm tính năng mới (Minor release):**
  ```bash
  git commit -m "feat(client): add google oauth social login"
  ```
- **Thay đổi lớn làm ngắt tương thích (Major release):**
  ```bash
  git commit -m "feat(api)!: migrate all REST endpoints to v2"
  # Hoặc thêm 'BREAKING CHANGE:' vào nội dung body commit
  ```

---

## 🛠️ 3. Các Lệnh Thao tác ở Local

### A. Chạy mô phỏng (Dry-run Mode):

Bạn có thể chạy kiểm tra thử nghiệm ở local để xem phiên bản dự kiến và Release Notes mà không làm thay đổi dữ liệu thật:

```bash
pnpm release:dry-run
```

### B. Chạy Release thủ công:

_(Thường dành cho Maintainer khi cần phát hành trực tiếp từ máy cá nhân với token GITHUB_TOKEN)_:

```bash
GITHUB_TOKEN=<your-github-personal-access-token> pnpm release
```

---

## ⚙️ 4. Quy trình Tự động hóa trên GitHub Actions

File cấu hình workflow nằm tại [.github/workflows/release.yml](file:///.github/workflows/release.yml):

1. **Tạo nhánh & Lập trình:** Lập trình viên tạo nhánh (vd: `feat/user-profile`), viết code và tạo commit chuẩn.
2. **Tạo Pull Request:** Tạo PR vào nhánh `main`. Các bước CI (Lint, Type-check, Build, Test) sẽ được kích hoạt kiểm tra.
3. **Merge vào `main`:** Sau khi PR được merge:
   - GitHub Action **Release** sẽ tự động chạy.
   - Phân tích các commit mới từ lần release gần nhất.
   - Tạo tag mới, cập nhật `CHANGELOG.md` và `package.json`.
   - Tạo **GitHub Release** chính thức trên repository.

---

## 📄 5. Cấu hình Chi tiết (.releaserc.js)

File cấu hình chính của tool nằm tại [.releaserc.js](file:///.releaserc.js):

- **`branches`**: Chấp nhận release từ `main`, `master`, `beta`, `alpha`.
- **`plugins`**:
  - `@semantic-release/commit-analyzer`: Phân tích commit message.
  - `@semantic-release/release-notes-generator`: Tạo danh sách thay đổi chi tiết.
  - `@semantic-release/changelog`: Ghi file `CHANGELOG.md`.
  - `@semantic-release/npm`: Cập nhật `package.json` (`npmPublish: false`).
  - `@semantic-release/git`: Commit các thay đổi file về git repository.
  - `@semantic-release/github`: Đăng tải release lên GitHub.
