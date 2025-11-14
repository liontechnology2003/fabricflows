
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (session.isLoggedIn) {
      return NextResponse.json(session);
    }
    return NextResponse.json({ isLoggedIn: false }, { status: 401 });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
