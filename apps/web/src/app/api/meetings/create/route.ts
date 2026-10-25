import { NextResponse } from 'next/server';

function generateRoomCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `lingua-${segment(3)}-${segment(3)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = body.title || 'LinguaMeet Multilingual Session';
    const roomCode = generateRoomCode();

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const joinUrl = `${protocol}://${host}/room/${roomCode}`;

    return NextResponse.json({
      success: true,
      roomCode,
      title,
      joinUrl,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create room' },
      { status: 500 }
    );
  }
}
