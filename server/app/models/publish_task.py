from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class PublishTask(Base):
    __tablename__ = "publish_tasks"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    platform_account_id = Column(
        Integer, ForeignKey("platform_accounts.id"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")
    publish_method = Column(String(20))
    platform_post_id = Column(String(100))
    platform_post_url = Column(String(500))
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    article = relationship("Article", back_populates="publish_tasks")
    platform_account = relationship("PlatformAccount", back_populates="publish_tasks")
    user = relationship("User", back_populates="publish_tasks")
    logs = relationship(
        "PublishLog", back_populates="task", cascade="all, delete-orphan"
    )
