import os
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

logger = logging.getLogger(__name__)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_db(engine):
    _MIGRATIONS = [
        {
            "table": "article_versions",
            "column": "change_summary",
            "definition": "TEXT",
        },
        {
            "table": "publish_tasks",
            "column": "platform_name",
            "definition": "VARCHAR(50)",
        },
        {
            "table": "publish_tasks",
            "column": "article_version",
            "definition": "INTEGER",
        },
        {
            "table": "publish_tasks",
            "column": "article_title_snapshot",
            "definition": "VARCHAR(255)",
        },
    ]

    insp = inspect(engine)
    with engine.begin() as conn:
        for mig in _MIGRATIONS:
            table = mig["table"]
            column = mig["column"]
            existing = [c["name"] for c in insp.get_columns(table)]
            if column not in existing:
                logger.info("Adding column %s.%s", table, column)
                conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {column} {mig['definition']}")
                )

        # SQLite cannot ALTER COLUMN to drop NOT NULL; recreate table instead.
        cols = {c["name"]: c for c in insp.get_columns("publish_tasks")}
        if cols.get("platform_account_id", {}).get("nullable") is False:
            logger.info("Migrating publish_tasks.platform_account_id to nullable")
            conn.execute(text(
                "CREATE TABLE publish_tasks_new ("
                "id INTEGER PRIMARY KEY,"
                "article_id INTEGER NOT NULL,"
                "platform_account_id INTEGER,"
                "user_id INTEGER NOT NULL,"
                "platform_name VARCHAR(50),"
                "status VARCHAR(20),"
                "publish_method VARCHAR(20),"
                "platform_post_id VARCHAR(100),"
                "platform_post_url VARCHAR(500),"
                "error_message TEXT,"
                "retry_count INTEGER,"
                "started_at DATETIME,"
                "completed_at DATETIME,"
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP,"
                "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,"
                "FOREIGN KEY(article_id) REFERENCES articles(id),"
                "FOREIGN KEY(platform_account_id) REFERENCES platform_accounts(id),"
                "FOREIGN KEY(user_id) REFERENCES users(id)"
                ")"
            ))
            conn.execute(text(
                "INSERT INTO publish_tasks_new "
                "SELECT id, article_id, platform_account_id, user_id, platform_name, "
                "status, publish_method, platform_post_id, platform_post_url, "
                "error_message, retry_count, started_at, completed_at, created_at, updated_at "
                "FROM publish_tasks"
            ))
            conn.execute(text("DROP TABLE publish_tasks"))
            conn.execute(text("ALTER TABLE publish_tasks_new RENAME TO publish_tasks"))
            conn.execute(text("CREATE INDEX ix_publish_tasks_id ON publish_tasks(id)"))

        # Migrate publish_tasks.article_id to nullable with SET NULL FK
        cols = {c["name"]: c for c in insp.get_columns("publish_tasks")}
        if cols.get("article_id", {}).get("nullable") is False:
            logger.info("Migrating publish_tasks.article_id to nullable with SET NULL FK")
            conn.execute(text(
                "CREATE TABLE publish_tasks_new ("
                "id INTEGER PRIMARY KEY,"
                "article_id INTEGER,"
                "article_title_snapshot VARCHAR(255),"
                "platform_account_id INTEGER,"
                "user_id INTEGER NOT NULL,"
                "platform_name VARCHAR(50),"
                "status VARCHAR(20),"
                "publish_method VARCHAR(20),"
                "platform_post_id VARCHAR(100),"
                "platform_post_url VARCHAR(500),"
                "error_message TEXT,"
                "article_version INTEGER,"
                "retry_count INTEGER,"
                "started_at DATETIME,"
                "completed_at DATETIME,"
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP,"
                "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,"
                "FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE SET NULL,"
                "FOREIGN KEY(platform_account_id) REFERENCES platform_accounts(id),"
                "FOREIGN KEY(user_id) REFERENCES users(id)"
                ")"
            ))
            conn.execute(text(
                "INSERT INTO publish_tasks_new "
                "SELECT id, article_id, NULL, platform_account_id, user_id, platform_name, "
                "status, publish_method, platform_post_id, platform_post_url, "
                "error_message, article_version, retry_count, started_at, completed_at, "
                "created_at, updated_at "
                "FROM publish_tasks"
            ))
            conn.execute(text("DROP TABLE publish_tasks"))
            conn.execute(text("ALTER TABLE publish_tasks_new RENAME TO publish_tasks"))
            conn.execute(text("CREATE INDEX ix_publish_tasks_id ON publish_tasks(id)"))
            # Backfill article_title_snapshot from articles table
            conn.execute(text(
                "UPDATE publish_tasks SET article_title_snapshot = "
                "(SELECT title FROM articles WHERE id = publish_tasks.article_id) "
                "WHERE article_title_snapshot IS NULL AND article_id IS NOT NULL"
            ))


def init_db():
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    _migrate_db(engine)

    db = SessionLocal()
    try:
        from .models.user import User

        if not db.query(User).filter(User.is_admin == True).first():
            from .auth import get_password_hash

            admin_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123")
            if admin_password == "admin123":
                logger.warning(
                    "Using default admin password. Set ADMIN_DEFAULT_PASSWORD env var for production!"
                )

            admin = User(
                username="admin",
                email="admin@smilex.example.com",
                password_hash=get_password_hash(admin_password),
                full_name="Administrator",
                is_active=True,
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Default admin account created (username: admin)")
        else:
            logger.info("Admin account already exists, skipping.")
    except Exception as e:
        db.rollback()
        logger.error("Failed to initialize admin account: %s", e)
        raise
    finally:
        db.close()
