from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

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
    from . import models  # noqa: F401 — ensure all models are registered with Base

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        from .models.user import User

        if not db.query(User).filter(User.is_admin == True).first():
            from .auth import get_password_hash

            admin = User(
                username="admin",
                email="admin@smilex.example.com",
                password_hash=get_password_hash("admin123"),
                full_name="Administrator",
                is_active=True,
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            print(
                "[init_db] Default admin account created (username: admin, password: admin123)"
            )
        else:
            print("[init_db] Admin account already exists, skipping.")
    finally:
        db.close()
