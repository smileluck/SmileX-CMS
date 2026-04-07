import React, { useRef, useEffect, useCallback } from 'react';
import PhoneFrame from './PhoneFrame';
import '../../styles/platforms/common.css';

export type PlatformKey = 'mobile' | 'desktop';

const platformClassMap: Record<PlatformKey, string> = {
  mobile: 'preview-common',
  desktop: 'preview-common',
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

  const contentEl = (
    <div
      ref={contentRef}
      className={className}
      style={{ minHeight: '100%' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  if (platform === 'desktop') {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: 24,
        background: '#fff',
        borderRadius: 8,
      }}>
        {contentEl}
      </div>
    );
  }

  return (
    <PhoneFrame platformLabel="手机端预览">
      {contentEl}
    </PhoneFrame>
  );
};

export default PlatformPreview;
