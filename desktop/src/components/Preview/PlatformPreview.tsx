import React, { useRef, useEffect, useCallback } from 'react';
import PhoneFrame from './PhoneFrame';
import { platformNameMap } from '../PlatformIcon';
import '../../styles/platforms/common.css';
import '../../styles/platforms/wechat-mp.css';

export type PlatformKey = 'common' | 'wechat_mp';

const platformClassMap: Record<PlatformKey, string> = {
  common: 'preview-common',
  wechat_mp: 'preview-wechat-mp',
};

interface PlatformPreviewProps {
  html: string;
  platform: PlatformKey;
  syncScrollRef?: React.RefObject<HTMLDivElement | null>;
  syncEnabled?: boolean;
}

const PlatformPreview: React.FC<PlatformPreviewProps> = ({
  html,
  platform,
  syncScrollRef,
  syncEnabled = false,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!syncEnabled || !syncScrollRef?.current || !contentRef.current) return;

    const source = syncScrollRef.current;
    const target = contentRef.current;

    const scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight || 1);
    target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight);
  }, [syncEnabled, syncScrollRef]);

  useEffect(() => {
    if (!syncEnabled || !syncScrollRef?.current) return;
    const source = syncScrollRef.current;
    source.addEventListener('scroll', handleScroll);
    return () => source.removeEventListener('scroll', handleScroll);
  }, [syncEnabled, syncScrollRef, handleScroll]);

  const className = platformClassMap[platform] || 'preview-common';
  const label = platform === 'common' ? '通用预览' : (platformNameMap[platform] || platform);

  return (
    <PhoneFrame platformLabel={label}>
      <div
        ref={contentRef}
        className={className}
        style={{ minHeight: '100%' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </PhoneFrame>
  );
};

export default PlatformPreview;
