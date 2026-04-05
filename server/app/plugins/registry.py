from typing import Dict, Optional
from .base import BasePublishPlugin


class PluginRegistry:
    _plugins: Dict[str, BasePublishPlugin] = {}

    @classmethod
    def register(cls, plugin: BasePublishPlugin):
        cls._plugins[plugin.platform_name] = plugin

    @classmethod
    def get(cls, platform_name: str) -> Optional[BasePublishPlugin]:
        return cls._plugins.get(platform_name)

    @classmethod
    def all(cls) -> Dict[str, BasePublishPlugin]:
        return cls._plugins.copy()

    @classmethod
    def list_platforms(cls) -> list[dict]:
        return [
            {
                "platform_name": p.platform_name,
                "display_name": p.display_name,
                "supported_types": p.supported_types,
                "auth_method": p.auth_method,
            }
            for p in cls._plugins.values()
        ]
