import { ImageResponse } from "next/og";

const SIZES = [180, 192, 512];

// The app icon: a heart in the sky. Used for the home-screen icon.
export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size: raw } = await context.params;
  const size = Number(raw);

  if (!SIZES.includes(size)) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #bfddf2 0%, #f9e6df 100%)",
        }}
      >
        <svg
          width={size * 0.56}
          height={size * 0.56}
          viewBox="0 0 24 24"
          fill="#b93f61"
        >
          <path d="M12 21s-7.5-4.7-9.6-9.2C.8 8.3 2.7 4.5 6.3 4.5c2.1 0 3.8 1.1 5.7 3.3 1.9-2.2 3.6-3.3 5.7-3.3 3.6 0 5.5 3.8 3.9 7.3C19.5 16.3 12 21 12 21z" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
