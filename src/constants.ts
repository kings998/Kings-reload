import { Game, Tournament, UserRole } from './types';

export interface GameMode {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
}

export const GAME_MODES_DATA: Record<string, GameMode[]> = {
  freefire: [
    { id: 'br_solo', title: 'BR SOLO', subtitle: 'Battle Royale', category: 'Battle Royale', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'br_duo', title: 'BR DUO', subtitle: 'Battle Royale', category: 'Battle Royale', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'br_squad', title: 'BR SQUAD', subtitle: 'Battle Royale', category: 'Battle Royale', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'cs_solo', title: 'CS SOLO', subtitle: 'Clash Squad', category: 'Clash Squad', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'cs_duo', title: 'CS DUO', subtitle: 'Clash Squad', category: 'Clash Squad', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'cs_squad', title: 'CS SQUAD', subtitle: 'Clash Squad', category: 'Clash Squad', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'lone_wolf_solo', title: 'LONE WOLF SOLO', subtitle: 'Lone Wolf', category: 'Lone Wolf', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'lone_wolf_duo', title: 'LONE WOLF DUO', subtitle: 'Lone Wolf', category: 'Lone Wolf', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
  ]
};

export const GAMES: Game[] = [
  {
    id: 'freefire',
    title: 'Free Fire',
    image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg',
    players: 850,
  }
];

export const ADMIN_EMAILS = [
  'rajenderpatel251@gmail.com',
  'qupagaming@gmail.com',
  'mahendrathakur9009@gmail.com',
  'mahendrar9009@gmail.com',
];

export const ADMIN_UIDS = [
  'XoXyXcnrlzOaMIKKolXnU3mT9xn1',
];

export function isAdminIdentity(email?: string | null, uid?: string | null): boolean {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return (
    (normalizedEmail !== '' && ADMIN_EMAILS.includes(normalizedEmail)) ||
    (!!uid && ADMIN_UIDS.includes(uid))
  );
}

export function getEffectiveRole(
  user?: { role?: UserRole; isAdmin?: boolean; email?: string | null; id?: string | null } | null
): UserRole {
  if (!user) return 'user';
  if (isAdminIdentity(user.email, user.id) || user.role === 'admin' || user.isAdmin) {
    return 'admin';
  }
  if (user.role === 'co_owner') return 'co_owner';
  if (user.role === 'staff') return 'staff';
  return 'user';
}

export function hasPanelAccess(
  user?: { role?: UserRole; isAdmin?: boolean; email?: string | null; id?: string | null } | null
): boolean {
  return getEffectiveRole(user) !== 'user';
}

export function getRoleBadgeMeta(role: UserRole): {
  label: string;
  pillClass: string;
  lightPillClass: string;
} {
  switch (role) {
    case 'admin':
      return {
        label: 'ADMIN',
        pillClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-black border border-amber-300/60 shadow-sm shadow-amber-500/30',
        lightPillClass: 'bg-amber-100 text-amber-900 border border-amber-300',
      };
    case 'co_owner':
      return {
        label: 'CO-OWNER',
        pillClass: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border border-cyan-300/40 shadow-sm shadow-cyan-500/30',
        lightPillClass: 'bg-cyan-100 text-cyan-900 border border-cyan-300',
      };
    case 'staff':
      return {
        label: 'STAFF',
        pillClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black border border-emerald-300/50 shadow-sm shadow-emerald-500/30',
        lightPillClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
      };
    default:
      return {
        label: 'PLAYER',
        pillClass: 'bg-white/10 text-slate-300 border border-white/10',
        lightPillClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      };
  }
}
