import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  // Read logo at build time and convert to base64
  const logoPath = join(process.cwd(), 'public', 'logo.png')
  const logoData = readFileSync(logoPath)
  const base64Logo = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'white',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={base64Logo}
          width={32}
          height={32}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          alt="MPS"
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
