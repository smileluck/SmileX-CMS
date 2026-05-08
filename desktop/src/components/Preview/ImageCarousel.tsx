import React, { useState, useCallback } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface ImageCarouselProps {
  images: { src: string }[];
  height?: number;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, height = 280 }) => {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrent(i => Math.min(images.length - 1, i + 1)), []);

  if (images.length === 0) return null;

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.35)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    fontSize: 12,
    transition: 'background 0.2s',
    zIndex: 1,
  };

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
      <img
        src={images[current].src}
        alt={`图片 ${current + 1}`}
        style={{
          width: '100%',
          height,
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {images.length > 1 && (
        <>
          {current > 0 && (
            <button style={{ ...arrowStyle, left: 8 }} onClick={prev}>
              <LeftOutlined />
            </button>
          )}
          {current < images.length - 1 && (
            <button style={{ ...arrowStyle, right: 8 }} onClick={next}>
              <RightOutlined />
            </button>
          )}

          <div style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
          }}>
            {images.map((_, i) => (
              <span
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: i === current ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === current ? '#FE2C55' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;
