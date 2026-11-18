import React, { useState, useEffect } from 'react';
import { Coins, Bell } from 'lucide-react';
import { Page, User } from '../types';
import { getEffectiveRole, getRoleBadgeMeta } from '../constants';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import kingsReloadLogo from '../assets/images/kr_emblem_pro_1795007184047.jpg';

interface HomeHeaderProps {
  user: User;
  onPageChange: (page: Page, id?: string) => void;
  onOpenNotifications?: () => void;
}

export default function HomeHeader({ user, onPageChange, onOpenNotifications }: HomeHeaderProps) {
  const displayName = user?.username || 'KINGS RELOAD';
  const totalBalance = (user?.wallet?.deposit || 0) + (user?.wallet?.winnings || 0) + (user?.wallet?.bonus || 0);
  const [unreadCount, setUnreadCount] = useState(0);
  const role = getEffectiveRole(user);
  const roleBadge = getRoleBadgeMeta(role);

  useEffect(() => {
    if (!user?.id) return;

    const q = query(collection(db, 'notifications'), limit(15));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!user?.id) {
        setUnreadCount(snapshot.size);
        return;
      }
      let unread = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!data.readBy || !data.readBy.includes(user.id)) {
          unread++;
        }
      });
      setUnreadCount(unread);
    }, (err) => {
      // ignore
    });

    return () => unsub();
  }, [user?.id]);

  return (
    <header className="px-4 sm:px-5 pt-3 pb-1">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Circular Avatar / KINGS RELOAD Gaming Logo Badge */}
        <div 
          onClick={() => onPageChange(Page.PROFILE)}
          className="flex items-center cursor-pointer active:scale-95 transition-transform shrink-0"
        >
          <div className="w-11 h-11 rounded-full bg-[#070b14] p-0.5 border border-amber-300/40 shadow-lg flex items-center justify-center overflow-hidden">
            <img
              src={kingsReloadLogo}
              alt="KINGS RELOAD"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover scale-110"
            />
          </div>
        </div>

        {/* Center: Welcome Back & User / App Name */}
        <div className="text-center flex-1 px-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-slate-300 tracking-tight leading-tight">
            Welcome Back,
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <h1 className="text-sm sm:text-base font-black text-white tracking-wide leading-tight truncate max-w-[140px]">
              {displayName}
            </h1>
            {role !== 'user' && (
              <button
                onClick={() => onPageChange(Page.ADMIN)}
                className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0 ${roleBadge.pillClass}`}
                title="Open Control Panel"
              >
                {roleBadge.label}
              </button>
            )}
          </div>
        </div>

        {/* Right: Notifications Bell + Balance Card */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative w-9 h-9 rounded-xl bg-[#0f1d3b] hover:bg-[#162a54] border border-[#223963] text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all shadow-sm"
              title="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-black flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* White Balance Card Pill with Gold Coin */}
          <button
            onClick={() => onPageChange(Page.WALLET)}
            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-xs flex items-center justify-center text-black font-black text-[10px] leading-none shrink-0">
              🪙
            </div>
            <span className="text-xs sm:text-sm font-black text-[#0f172a] tracking-tight">
              {totalBalance.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
