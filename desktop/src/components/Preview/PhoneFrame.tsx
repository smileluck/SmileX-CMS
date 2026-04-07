import React from 'react';

const PhoneFrame: React.FC<{
  children: React.ReactNode;
  platformLabel?: string;
}> = ({ children, platformLabel }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
      width: '100%',
    }}>
      {platformLabel && (
        <div style={{
          fontSize: 12,
          color: '#999',
          marginBottom: 4,
          textAlign: 'center',
        }}>
          {platformLabel}
        </div>
      )}
      <div style={{
        position: 'relative',
        maxWidth: '100%',
        flex: 1,
        minHeight: 0,
        aspectRatio: '1440 / 3200',
        height: '100%',
        borderRadius: 36,
        border: '6px solid #1a1a1a',
        background: '#fff',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#fff',
          padding: '8px 0 6px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 80,
            height: 4,
            borderRadius: 2,
            background: '#e0e0e0',
          }} />
        </div>
        <div style={{
          height: 'calc(100% - 18px)',
          overflow: 'auto',
          padding: '0 16px 24px',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PhoneFrame;
