import { ImageResponse } from "next/og";

// Pixel sizes of iPhone screens (portrait). iOS shows one of these while the
// home-screen app opens, instead of a blank grey screen.
export const SPLASH_SIZES = [
  "1320x2868",
  "1206x2622",
  "1290x2796",
  "1179x2556",
  "1284x2778",
  "1170x2532",
  "1125x2436",
  "1242x2688",
  "828x1792",
  "1242x2208",
  "750x1334",
];

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size } = await context.params;

  if (!SPLASH_SIZES.includes(size)) {
    return new Response("Not found", { status: 404 });
  }

  const [width, height] = size.split("x").map(Number);
  const heart = Math.round(width * 0.3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <svg width={heart} height={heart} viewBox="0 0 24 24" fill="#ff3d7f">
          <path d="M12 21s-7.5-4.7-9.6-9.2C.8 8.3 2.7 4.5 6.3 4.5c2.1 0 3.8 1.1 5.7 3.3 1.9-2.2 3.6-3.3 5.7-3.3 3.6 0 5.5 3.8 3.9 7.3C19.5 16.3 12 21 12 21z" />
        </svg>
        <div
          style={{
            marginTop: Math.round(width * 0.06),
            fontSize: Math.round(width * 0.07),
            color: "#ff3d7f",
            letterSpacing: -1,
          }}
        >
          Far But Together
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
