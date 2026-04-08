# Plan: 媒体库删除功能调整

## 目标
修改媒体库删除逻辑：
- 未关联文章 → 删除媒体库文件 + 数据库记录
- 已关联文章 → 删除**媒体库原始文件** + 数据库记录，**不删除**文章 `images/` 下的文件

## 现状分析

### 三种文件上传流程

1. **上传到媒体库** (`POST /upload`)：文件保存到 `media_dir/{snow_id}.ext`，`file_path` 指向 media 目录，`article_id=None`

2. **上传到媒体库 → 复制到文章** (`POST /copy-to-article`)：
   - 文件从 media 目录 `shutil.copy2` 到 `article_dir/images/timestamp_newSnowId.ext`
   - `media.file_path` **被更新**为文章 images 目录路径
   - `media.article_id` 被设置
   - **media 目录下的原始文件仍然存在但成为孤儿文件**

3. **直接上传到文章** (`POST /upload-to-article`)：文件直接保存到 `article_dir/images/`，media 目录下**从未有过文件**

### 当前删除逻辑（上一轮已改为无条件删除）

```python
file_path = Path(media.file_path)  # 指向当前记录路径
if not file_path.is_absolute():
    file_path = BASE_STORAGE_DIR / file_path

if file_path.exists():
    try:
        file_path.unlink()
    except OSError as e:
        logger.warning(...)
db.delete(media)
db.commit()
```

**问题**：对于流程2（已关联文章），`file_path` 已指向文章的 `images/` 目录，删除的是文章的副本文件，而不是 media 目录的原始文件。

## 需要修改

### 修改文件：`server/app/routes/media.py` 的 `delete_media_file` 函数（314-338行）

**修改后逻辑：**

```python
file_path = Path(media.file_path)
if not file_path.is_absolute():
    file_path = BASE_STORAGE_DIR / file_path

if media.article_id is not None:
    # 已关联文章：删除 media 目录下的原始文件，不删除文章 images/ 下的文件
    media_dir = _get_media_dir(db, current_user.id)
    ext = Path(media.filename).suffix.lower() or Path(media.file_path).suffix.lower()
    original_media_file = media_dir / f"{media.snow_id}{ext}"
    if original_media_file.exists():
        try:
            original_media_file.unlink()
        except OSError as e:
            logger.warning("Failed to delete media file %s: %s", original_media_file, e)
else:
    # 未关联文章：file_path 直接指向 media 目录，直接删除
    if file_path.exists():
        try:
            file_path.unlink()
        except OSError as e:
            logger.warning("Failed to delete media file %s: %s", file_path, e)

db.delete(media)
db.commit()
```

### 原理说明

- **已关联文章时**：通过 `media.snow_id` 和文件扩展名重建原始 media 路径 `{media_dir}/{snow_id}{ext}`（参考 upload 函数第72-75行的命名规则），删除该文件。文章 `images/` 下的副本不受影响。
  - 对于流程2（copy-to-article）：media 目录下的原始文件存在 → 删除成功 ✅
  - 对于流程3（upload-to-article）：media 目录下不存在对应文件 → `exists()` 为 False，跳过删除 ✅
- **未关联文章时**：`file_path` 仍然指向 media 目录 → 直接删除 ✅

## 影响范围

- 仅修改 `server/app/routes/media.py` 的 `delete_media_file` 函数（约332-338行区域）
- 文章内容中的 Markdown 引用不会被触碰
- 文章 `images/` 目录下的文件副本不会被删除
