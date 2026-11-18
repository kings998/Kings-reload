import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Send,
  Smile,
  Reply,
  Trash2,
  Pin,
  PinOff,
  Crown,
  Shield,
  MessageSquare,
  Headphones,
  X,
  Loader2,
} from 'lucide-react';
import { ChatChannel, ChatMessage, Page, User } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { getEffectiveRole, getRoleBadgeMeta, hasPanelAccess } from '../constants';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

interface ChatPageProps {
  user: User;
  onPageChange: (page: Page, id?: string) => void;
}

const QUICK_EMOJIS = ['😄', '🔥', '🎮', '🏆', '👍', '❤️', '😂', '👏'];
const REACTION_EMOJIS = ['😄', '🔥', '🎮', '👍'];

export default function ChatPage({ user, onPageChange }: ChatPageProps) {
  const [activeChannel, setActiveChannel] = useState<ChatChannel>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentRole = getEffectiveRole(user);
  const canModerate = hasPanelAccess(user);
  const currentRoleBadge = getRoleBadgeMeta(currentRole);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'chatMessages'),
      orderBy('createdAt', 'desc'),
      limit(120)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
          .filter((msg) => (msg.channel || 'general') === activeChannel)
          .reverse();
        setMessages(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chatMessages');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChannel]);

  const pinnedMessages = messages.filter((m) => m.isPinned);

  const formatTime = (ts: any) => {
    try {
      const date = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
      if (!date || isNaN(date.getTime())) return 'Just now';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || !user?.id) return;
    if (user.isBanned) {
      setSendError('Your account is restricted from sending messages.');
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      const payload: any = {
        channel: activeChannel,
        senderId: user.id,
        senderName: user.username || 'Player',
        senderEmail: user.email || '',
        senderRole: currentRole,
        text: trimmed.slice(0, 500),
        reactions: {},
        isPinned: false,
        createdAt: serverTimestamp(),
      };

      if (replyTo?.id) {
        payload.replyToId = replyTo.id;
        payload.replyToName = replyTo.senderName;
        payload.replyToText = replyTo.text.slice(0, 100);
      }

      await addDoc(collection(db, 'chatMessages'), payload);
      setText('');
      setReplyTo(null);
      setShowEmojiBar(false);
      inputRef.current?.focus();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'chatMessages');
      setSendError('Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!msg.id || !user?.id) return;
    try {
      const existingReactions = { ...(msg.reactions || {}) };
      const currentUsers = Array.isArray(existingReactions[emoji])
        ? [...existingReactions[emoji]]
        : [];
      const hasReacted = currentUsers.includes(user.id);
      const updatedUsers = hasReacted
        ? currentUsers.filter((id) => id !== user.id)
        : [...currentUsers, user.id];

      if (updatedUsers.length === 0) {
        delete existingReactions[emoji];
      } else {
        existingReactions[emoji] = updatedUsers;
      }

      await updateDoc(doc(db, 'chatMessages', msg.id), {
        reactions: existingReactions,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chatMessages/${msg.id}`);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'chatMessages', msgId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chatMessages/${msgId}`);
    }
  };

  const handleTogglePin = async (msg: ChatMessage) => {
    if (!msg.id || !canModerate) return;
    try {
      await updateDoc(doc(db, 'chatMessages', msg.id), {
        isPinned: !msg.isPinned,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chatMessages/${msg.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#071328] text-white flex flex-col max-w-lg mx-auto relative">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[#0b1b38]/95 backdrop-blur-xl border-b border-[#1c3563] px-4 pt-4 pb-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => onPageChange(Page.HOME)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black uppercase tracking-tight text-white truncate">
                  KINGS RELOAD Chat
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold truncate">
                Chat with players, staff & admins in real time
              </p>
            </div>
          </div>

          {currentRole !== 'user' && (
            <button
              onClick={() => onPageChange(Page.ADMIN)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${currentRoleBadge.pillClass}`}
              title="Open Control Panel"
            >
              {currentRole === 'admin' ? <Crown size={11} /> : <Shield size={11} />}
              {currentRoleBadge.label}
            </button>
          )}
        </div>

        {/* Channel Switcher */}
        <div className="grid grid-cols-2 gap-2 mt-3 bg-[#050d1d] p-1 rounded-2xl border border-[#1a325e]">
          <button
            onClick={() => setActiveChannel('general')}
            className={`py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeChannel === 'general'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare size={14} />
            Global Chat
          </button>
          <button
            onClick={() => setActiveChannel('support')}
            className={`py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeChannel === 'support'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Headphones size={14} />
            Staff Support
          </button>
        </div>

        {/* Pinned Message Banner */}
        {pinnedMessages.length > 0 && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Pin size={13} className="text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-100 truncate font-semibold">
                <span className="font-black text-amber-400">{pinnedMessages[pinnedMessages.length - 1].senderName}: </span>
                {pinnedMessages[pinnedMessages.length - 1].text}
              </p>
            </div>
            {canModerate && pinnedMessages[pinnedMessages.length - 1].id && (
              <button
                onClick={() => handleTogglePin(pinnedMessages[pinnedMessages.length - 1])}
                className="text-amber-400 hover:text-white shrink-0"
                title="Unpin"
              >
                <PinOff size={13} />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-44 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={28} className="text-purple-400 animate-spin" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Loading live chat...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
              <MessageSquare size={26} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-white">
              {activeChannel === 'general' ? 'Start the Conversation!' : 'Need Help from Staff?'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {activeChannel === 'general'
                ? 'Say hi to fellow Free Fire players, find teammates, or celebrate wins 😄'
                : 'Ask questions about matches, room IDs, or payments — Staff, Co-Owners & Admins are here.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id;
            const roleBadge = getRoleBadgeMeta(msg.senderRole || 'user');
            const isStaffRole = msg.senderRole && msg.senderRole !== 'user';
            const canDelete = isMine || canModerate;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Name & Role Badge */}
                <div className={`flex items-center gap-1.5 mb-1 px-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[11px] font-black text-slate-300">
                    {isMine ? 'You' : msg.senderName}
                  </span>
                  {isStaffRole && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 ${roleBadge.pillClass}`}
                    >
                      {msg.senderRole === 'admin' ? <Crown size={9} /> : <Shield size={9} />}
                      {roleBadge.label}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-500 font-semibold">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md relative group ${
                    isMine
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                      : isStaffRole
                      ? 'bg-[#102447] border border-amber-400/30 text-white rounded-tl-sm'
                      : 'bg-[#0e1f3d] border border-[#1d3766] text-slate-100 rounded-tl-sm'
                  }`}
                >
                  {/* Quoted Reply */}
                  {msg.replyToText && (
                    <div className="mb-1.5 pl-2.5 border-l-2 border-amber-400/80 bg-black/25 rounded-r-lg py-1 pr-2 text-[10px]">
                      <p className="font-black text-amber-300 truncate">{msg.replyToName}</p>
                      <p className="text-slate-300 truncate">{msg.replyToText}</p>
                    </div>
                  )}

                  <p className="text-[13px] leading-snug break-words whitespace-pre-wrap">
                    {msg.text}
                  </p>

                  {/* Reactions Display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(msg.reactions).map(([emoji, usersArr]) => {
                        if (!Array.isArray(usersArr) || usersArr.length === 0) return null;
                        const reacted = user?.id ? usersArr.includes(user.id) : false;
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg, emoji)}
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                              reacted
                                ? 'bg-amber-400/25 border border-amber-400/60 text-amber-200'
                                : 'bg-black/30 border border-white/10 text-slate-300 hover:bg-black/50'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{usersArr.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Actions Row */}
                <div className={`flex items-center gap-2 mt-1 px-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <button
                    onClick={() => {
                      setReplyTo(msg);
                      inputRef.current?.focus();
                    }}
                    className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-0.5 font-bold transition-colors"
                  >
                    <Reply size={11} />
                    Reply
                  </button>
                  <div className="flex items-center gap-1">
                    {REACTION_EMOJIS.map((em) => (
                      <button
                        key={em}
                        onClick={() => handleToggleReaction(msg, em)}
                        className="text-xs opacity-60 hover:opacity-100 hover:scale-125 transition-all"
                        title={`React ${em}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                  {canModerate && msg.id && (
                    <button
                      onClick={() => handleTogglePin(msg)}
                      className={`text-[10px] flex items-center gap-0.5 font-bold transition-colors ${
                        msg.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                      }`}
                      title={msg.isPinned ? 'Unpin' : 'Pin message'}
                    >
                      <Pin size={11} />
                    </button>
                  )}
                  {canDelete && msg.id && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id!)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete message"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Fixed Bottom Composer (above BottomNav) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 max-w-lg mx-auto bg-[#071328]/95 backdrop-blur-xl border-t border-[#1c3563] px-3 pt-2 pb-3">
        {sendError && (
          <p className="text-[10px] text-red-400 font-bold mb-1.5 px-1">{sendError}</p>
        )}

        {/* Reply Preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mb-2 px-3 py-1.5 rounded-xl bg-[#0e1f3d] border border-purple-500/40 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black text-purple-300 truncate">
                  Replying to {replyTo.senderName}
                </p>
                <p className="text-[11px] text-slate-300 truncate">{replyTo.text}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 text-slate-400 hover:text-white shrink-0"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Emoji Picker Row */}
        <AnimatePresence>
          {showEmojiBar && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mb-2 px-2 py-1.5 rounded-xl bg-[#0e1f3d] border border-[#1d3766] flex items-center justify-around"
            >
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setText((prev) => `${prev}${em}`);
                    inputRef.current?.focus();
                  }}
                  className="text-lg hover:scale-125 active:scale-95 transition-transform px-1"
                >
                  {em}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiBar((prev) => !prev)}
            className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
              showEmojiBar
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                : 'bg-[#0e1f3d] border-[#1d3766] text-slate-400 hover:text-white'
            }`}
            title="Emojis"
          >
            <Smile size={18} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={
              activeChannel === 'general'
                ? 'Message KINGS RELOAD players 😄...'
                : 'Message Staff & Admins...'
            }
            className="flex-1 bg-[#0e1f3d] border border-[#1d3766] focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-lg shadow-purple-600/30 active:scale-95 transition-all shrink-0"
            title="Send"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
