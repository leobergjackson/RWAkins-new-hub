// Built by vsrupeshkumar
// GET  /api/notifications?wallet=0x…  → { notifications, unread }
// POST /api/notifications  { wallet, action:'markRead' } → { ok, marked }
//
// Backs the navbar bell. The autonomous heartbeat writes notifications here when
// it acts on a user's behalf; the user reads them next time they open the app.
import { NextResponse } from 'next/server'
import { getNotifications, unreadCount, markAllRead } from '@/lib/notificationStore'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get('wallet') ?? ''
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ notifications: [], unread: 0 })
  }
  const [notifications, unread] = await Promise.all([getNotifications(wallet), unreadCount(wallet)])
  return NextResponse.json({ notifications, unread })
}

export async function POST(req: Request) {
  let body: { wallet?: string; action?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 }) }
  const wallet = (body.wallet ?? '').trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 })
  }
  if (body.action === 'markRead') {
    return NextResponse.json({ ok: true, marked: await markAllRead(wallet) })
  }
  return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 })
}
