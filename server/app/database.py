import os
import logging
from sqlalchemy import create_engine
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


def init_db():
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

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
