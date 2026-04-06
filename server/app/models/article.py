from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    snow_id = Column(String(20), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False, default="")
    summary = Column(Text)
    article_type = Column(String(20), default="article")
    status = Column(String(20), default="draft")
    file_path = Column(String(500))
    cover_image = Column(String(255))
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tags = Column(JSON)
    article_metadata = Column("metadata", JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )

    author = relationship("User", back_populates="articles")
    group = relationship("Group", back_populates="articles")
    media = relationship("Media", back_populates="article")
    publish_tasks = relationship("PublishTask", back_populates="article")
    tags_rel = relationship("Tag", secondary="article_tags", back_populates="articles", lazy="joined")

    __table_args__ = (Index("ix_articles_user_status", "author_id", "status"),)
