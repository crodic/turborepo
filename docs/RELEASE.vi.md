# 🚀 Quy Trình Phát Hành & Hướng Dẫn Semantic Release

> [English](RELEASE.md) | **Tiếng Việt**

Tài liệu này cung cấp hướng dẫn chi tiết về quy trình tự động hóa phát hành phiên bản (**Semantic Release**) trong dự án Monorepo này.

---

## 📋 1. Tổng Quan Quy Trình Phát Hành

Dự án sử dụng **`semantic-release`** tích hợp cùng **GitHub Actions** để tự động hóa toàn diện quy trình release:

- Phân tích nội dung commit messages theo chuẩn [Conventional Commits](https://www.conventionalcommits.org/).
- Tính toán phiên bản tiếp theo dựa trên quy tắc [Semantic Versioning (SemVer)](https://semver.org/).
- Tự động sinh và cập nhật ghi chú phiên bản trong file `CHANGELOG.md`.
- Tự động nâng số phiên bản (bump version) trong file `package.json`.
- Tự động tạo và phát hành **Git Tags** cùng **GitHub Releases** trên repository.

---

## 📝 2. Quy Tắc Viết Commit Message (Conventional Commits)

Để đảm bảo việc tính toán phiên bản chuẩn xác, **tất cả commit messages khi push hoặc merge vào nhánh `main` phải tuân theo cấu trúc**:

```text
<type>(<scope>): <description>
```

### Bảng Tác Động Phiên Bản:

| Tiền tố (`type`)                    | Ý Nghĩa                            | Kiểu Release      | Ví Dụ Phiên Bản    |
| :---------------------------------- | :--------------------------------- | :---------------- | :----------------- |
| **`fix`**                           | Sửa lỗi (Bug fixes)                | **PATCH**         | `1.0.0` ➡️ `1.0.1` |
| **`feat`**                          | Tính năng mới                      | **MINOR**         | `1.0.0` ➡️ `1.1.0` |
| **`refactor`** / **`perf`**         | Tái cấu trúc / Cải thiện hiệu năng | **PATCH**         | `1.0.0` ➡️ `1.0.1` |
| **`BREAKING CHANGE`**               | Thay đổi làm mất tương thích ngược | **MAJOR**         | `1.0.0` ➡️ `2.0.0` |
| **`docs`**                          | Cập nhật tài liệu kỹ thuật         | **PATCH**         | `1.0.0` ➡️ `1.0.1` |
| **`chore`** / **`test`** / **`ci`** | Bảo trì, viết test, cấu hình CI/CD | **Không Release** | _(Giữ nguyên)_     |

### Ví Dụ Commit Hợp Lệ:

- **Sửa lỗi (Patch release):**
  ```bash
  git commit -m "fix(api): fix user authentication token expiration"
  ```
- **Tính năng mới (Minor release):**
  ```bash
  git commit -m "feat(client): add google oauth social login"
  ```
- **Thay đổi lớn phá vỡ tương thích (Major release):**
  ```bash
  git commit -m "feat(api)!: migrate all REST endpoints to v2"
  # Hoặc thêm 'BREAKING CHANGE:' vào phần thân (body) của commit
  ```

---

## 🛠️ 3. Lệnh Thực Thi Cục Bộ

### A. Chế độ Xem trước (Dry-run Mode):

Chạy thử trên máy để xem trước phiên bản tiếp theo và nội dung changelog mà không ghi đè bất kỳ thay đổi thực tế nào:

```bash
pnpm release:dry-run
```

### B. Phát hành Thủ công:

_(Thường dùng cho maintainer phát hành trực tiếp từ máy cá nhân với `GITHUB_TOKEN`)_:

```bash
GITHUB_TOKEN=<your-github-personal-access-token> pnpm release
```

---

## ⚙️ 4. Tự Động Hóa Với GitHub Actions

Cấu hình workflow nằm tại [../.github/workflows/release.yml](../.github/workflows/release.yml):

1. **Tạo nhánh & Phát triển:** Tạo feature branch (ví dụ: `feat/user-profile`), viết code và tạo commit theo chuẩn conventional.
2. **Tạo Pull Request:** Mở PR hướng về nhánh `main`. Các bước kiểm tra CI (Lint, Type-check, Build, Test) sẽ được kích hoạt tự động.
3. **Merge vào `main`:** Khi PR được merge:
   - GitHub Actions workflow **Release** sẽ tự động chạy.
   - Phân tích các commit mới kể từ bản release gần nhất.
   - Tạo git tag mới, cập nhật `CHANGELOG.md` và `package.json`.
   - Xuất bản một bản **GitHub Release** chính thức.

---

## 📄 5. Cấu Hình (.releaserc.js)

Tệp cấu hình nằm tại [../.releaserc.js](../.releaserc.js):

- **`branches`**: Quản lý release từ các nhánh `main`, `master`, `beta`, `alpha`.
- **`plugins`**:
  - `@semantic-release/commit-analyzer`: Phân tích commit messages.
  - `@semantic-release/release-notes-generator`: Sinh ghi chú changelog chi tiết.
  - `@semantic-release/changelog`: Cập nhật file `CHANGELOG.md`.
  - `@semantic-release/npm`: Cập nhật `package.json` (`npmPublish: false`).
  - `@semantic-release/git`: Commit các tệp đã thay đổi ngược lại kho mã nguồn.
  - `@semantic-release/github`: Xuất bản bản phát hành lên GitHub Releases.
