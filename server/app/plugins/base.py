from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List


@dataclass
class PublishResult:
    success: bool
    platform_post_id: Optional[str] = None
    platform_post_url: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class BasePublishPlugin(ABC):
    platform_name: str = ""
    display_name: str = ""
    supported_types: List[str] = []
    auth_method: str = "oauth"

    @abstractmethod
    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        pass

    @abstractmethod
    async def test_connection(self, account) -> bool:
        pass

    async def get_auth_url(self) -> str:
        raise NotImplementedError(f"{self.platform_name} does not support OAuth")

    async def handle_callback(self, code: str, state: str) -> Dict[str, Any]:
        raise NotImplementedError(
            f"{self.platform_name} does not support OAuth callback"
        )
