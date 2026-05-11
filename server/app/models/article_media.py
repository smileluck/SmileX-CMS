from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class ArticleMedia(Base):
    __tablename__ = "article_media"

    article_id = Column(
        Integer, ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True
    )
    media_id = Column(
        Integer, ForeignKey("media.id", ondelete="CASCADE"), primary_key=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    article = relationship("Article", back_populates="media_refs")
    media = relationship("Media", back_populates="article_refs")

    __table_args__ = (UniqueConstraint("article_id", "media_id", name="uq_article_media"),)
