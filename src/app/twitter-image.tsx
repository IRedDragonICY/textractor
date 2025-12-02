import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Contextractor - Extract Code & Files to Text for AI & LLMs';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #131314 0%, #1E1E1E 50%, #2B2930 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.1,
            background: 'repeating-linear-gradient(45deg, #A8C7FA 0, #A8C7FA 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Glow Effect */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(168, 199, 250, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, #333537 0%, #444746 100%)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #444746',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: '#A8C7FA' }}
            >
              <path
                d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="rgba(168, 199, 250, 0.1)"
              />
              <path
                d="M14 2V8H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 13H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 17H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#E3E3E3',
              margin: 0,
              letterSpacing: '-2px',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            Contextractor
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <span
              style={{
                background: 'linear-gradient(135deg, #333537 0%, #444746 100%)',
                color: '#A8C7FA',
                padding: '8px 16px',
                borderRadius: '24px',
                fontSize: '18px',
                fontWeight: 600,
                border: '1px solid #444746',
              }}
            >
              PRO
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: '28px',
            color: '#C4C7C5',
            margin: '32px 0 0 0',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          Extract code & files to text for
          <span style={{ color: '#A8C7FA', fontWeight: 600 }}> ChatGPT</span>,
          <span style={{ color: '#A8C7FA', fontWeight: 600 }}> Claude</span>, and
          <span style={{ color: '#A8C7FA', fontWeight: 600 }}> AI/LLMs</span>
        </p>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: '48px',
          }}
        >
          {['ZIP Files', 'GitHub Repos', 'Code Files', 'Folders'].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(51, 53, 55, 0.8)',
                  padding: '12px 20px',
                  borderRadius: '24px',
                  border: '1px solid #444746',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: '#A8C7FA' }}
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    color: '#E3E3E3',
                    fontSize: '18px',
                    fontWeight: 500,
                  }}
                >
                  {feature}
                </span>
              </div>
            )
          )}
        </div>

        {/* URL */}
        <p
          style={{
            position: 'absolute',
            bottom: '32px',
            fontSize: '18px',
            color: '#8E918F',
            fontWeight: 500,
          }}
        >
          contextractor.vercel.app
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
