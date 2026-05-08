import React, { useRef, useEffect, useCallback } from 'react';
import PhoneFrame from './PhoneFrame';

export type PlatformKey = 'mobile' | 'desktop';

interface PlatformPreviewProps {
  html: string;
  platform: PlatformKey;
  syncScrollRef?: React.RefObject<HTMLDivElement | null>;
  syncEnabled?: boolean;
  children?: React.ReactNode;
}

const baseStyle: React.CSSProperties = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  wordWrap: 'break-word',
  minHeight: '100%',
};

const PlatformPreview: React.FC<PlatformPreviewProps> = ({
  html,
  platform,
  syncScrollRef,
  syncEnabled = false,
  children,
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

  const contentEl = (
    <div
      ref={contentRef}
      style={baseStyle}
    >
      {children}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
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
