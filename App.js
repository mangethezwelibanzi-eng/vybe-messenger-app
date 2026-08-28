// VYBE Messenger — Expo / React Native version
// Paste this whole file into snack.expo.dev as App.js

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, Modal, SafeAreaView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft, Send, MessageSquare, Radio, User, Layers, Clock,
  CheckCircle2, AlertCircle, MoreVertical, BellOff, Bell,
  Trash2, Ban, UserCircle2, X, HardDrive, Activity, Gauge, Zap,
  ShieldCheck, Server, Plus, Wifi, WifiOff, ShieldOff, Database,
} from 'lucide-react-native';

const C = {
  bg: '#050505', surface: '#0D0D0D', surface2: '#111111', surface3: '#161616',
  border: '#1C1C1C', borderHigh: '#2A2A2A', text: '#FFFFFF', muted: '#666',
  mutedMid: '#999', primary: '#E10600', primaryFaint: 'rgba(225,6,0,0.12)',
  primaryDeep: '#9B0400', success: '#00D26A', successFaint: 'rgba(0,210,106,0.12)',
  warning: '#FFB547', warningFaint: 'rgba(255,181,71,0.12)',
  danger: '#FF5C5C', dangerFaint: 'rgba(255,92,92,0.12)',
};
const MAX_MSG = 500, WARN_AT = 440;

const SEED_CONVOS = [
  { id:'1', name:'Lerato', message:'Signal recovered on my side.', time:'08:51', status:'Synced' },
  { id:'2', name:'Operations', message:'Queue sync completed.', time:'08:42', status:'Reduced' },
  { id:'3', name:'Marcus', message:'Tunnel recovery successful.', time:'08:35', status:'Offline Queue' },
  { id:'4', name:'Edge Node', message:'Heartbeat stable.', time:'08:20', status:'Synced' },
  { id:'5', name:'Dispatch', message:'Route update pending…', time:'08:02', status:'Delayed' },
];
const SEED_MSGS = {
  '1': [{ id:'m1', text:'Signal recovered on my side.', time:'08:51', mine:false, delivery:'delivered' },
        { id:'m2', text:'Nice. Queue sync looks stable.', time:'08:53', mine:true,  delivery:'delivered' }],
  '2': [{ id:'m1', text:'Queue sync completed.', time:'08:42', mine:false, delivery:'delivered' }],
  '3': [{ id:'m1', text:'Tunnel recovery successful.', time:'08:35', mine:false, delivery:'queued' }],
  '4': [{ id:'m1', text:'Heartbeat stable.', time:'08:20', mine:false, delivery:'delivered' }],
  '5': [{ id:'m1', text:'Route update pending…', time:'08:02', mine:false, delivery:'delayed' }],
};
const SEED_EVENTS = [
  { id:'se1', t:'08:51', e:'Signal recovered — Lerato', tone:'success' },
  { id:'se2', t:'08:42', e:'Queue sync completed', tone:'primary' },
  { id:'se3', t:'08:35', e:'Tunnel recovery successful', tone:'success' },
  { id:'se4', t:'08:12', e:'Connectivity dip detected', tone:'warning' },
];
const PALETTE = ['#B80400','#0A5E8A','#0B5C4A','#4A1F7A','#8A5200','#1A3D7A','#7A3B1E'];
const avatarColor = (n) => { let h=0; for (let i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))|0; return PALETTE[Math.abs(h)%PALETTE.length]; };
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const nowTime = () => new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

const persist = async (k,v) => { try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch {} };
const hydrate = async (k) => { try { const r = await AsyncStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } };

const DMAP = {
  sending:   { label:'Sending',   Icon:Clock,        color:C.muted   },
  queued:    { label:'Queued',    Icon:Layers,       color:C.warning },
  delivered: { label:'Delivered', Icon:CheckCircle2, color:C.success },
  delayed:   { label:'Delayed',   Icon:AlertCircle,  color:C.danger  },
};

function Avatar({ name, size=44, online }) {
  const bg = avatarColor(name);
  return (
    <View style={{ width:size, height:size, borderRadius:size/2, backgroundColor:bg, alignItems:'center', justifyContent:'center' }}>
      <Text style={{ color:'#fff', fontWeight:'800', fontSize:size*0.38 }}>{name.charAt(0).toUpperCase()}</Text>
      {online && <View style={{ position:'absolute', bottom:0, right:0, width:size*0.26, height:size*0.26, borderRadius:size*0.13, backgroundColor:C.success, borderWidth:2, borderColor:C.bg }}/>}
    </View>
  );
}

function Pill({ children, tone='default' }) {
  const t = {
    default: { bg:C.surface3, fg:C.mutedMid },
    success: { bg:C.successFaint, fg:C.success },
    warning: { bg:C.warningFaint, fg:C.warning },
    danger:  { bg:C.dangerFaint,  fg:C.danger  },
    primary: { bg:C.primaryFaint, fg:C.text    },
  }[tone];
  return (
    <View style={{ backgroundColor:t.bg, borderRadius:100, paddingHorizontal:9, paddingVertical:3 }}>
      <Text style={{ color:t.fg, fontSize:9, fontWeight:'700', letterSpacing:1, textTransform:'uppercase' }}>{children}</Text>
    </View>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <TouchableOpacity onPress={() => onChange(!checked)} activeOpacity={0.8}
      style={{ width:46, height:26, borderRadius:100, backgroundColor: checked ? C.primary : C.surface3, justifyContent:'center', padding:2 }}>
      <View style={{ width:20, height:20, borderRadius:10, backgroundColor:'#fff', alignSelf: checked ? 'flex-end' : 'flex-start' }}/>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, tone='default', icon:IconComp }) {
  const fg = { success:C.success, warning:C.warning, danger:C.danger }[tone] || C.text;
  return (
    <View style={styles.statCard}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:8 }}>
        {IconComp && <IconComp size={11} color={C.muted}/>}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color:fg }]}>{value}</Text>
    </View>
  );
}

function ConfirmModal({ modal, onClose }) {
  if (!modal) return null;
  const isDanger = modal.variant === 'danger';
  const confirm = () => { try { modal.onConfirm?.(); } finally { onClose(); } };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            <TouchableOpacity onPress={onClose}><X size={16} color={C.muted}/></TouchableOpacity>
          </View>
          <Text style={styles.modalBody}>{modal.body}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>{modal.cancelText || 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, isDanger && { backgroundColor:C.danger }]} onPress={confirm}>
              <Text style={styles.btnPrimaryText}>{modal.confirmText || 'Confirm'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function PromptModal({ prompt, onClose }) {
  const [val, setVal] = useState('');
  useEffect(() => { if (prompt) setVal(''); }, [prompt]);
  if (!prompt) return null;
  const submit = () => { if (!val.trim()) return; prompt.onSubmit(val.trim()); onClose(); };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{prompt.title}</Text>
            <TouchableOpacity onPress={onClose}><X size={16} color={C.muted}/></TouchableOpacity>
          </View>
          <TextInput
            value={val} onChangeText={(t) => setVal(t.slice(0,40))}
            placeholder={prompt.placeholder} placeholderTextColor={C.muted}
            style={styles.promptInput} autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { opacity: val.trim() ? 1 : 0.5 }]} onPress={submit}>
              <Text style={styles.btnPrimaryText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function ConvoItem({ convo:c, isMuted, isTyping, hasDelayed, isOnline, onPress }) {
  return (
    <TouchableOpacity style={styles.convoItem} onPress={onPress} activeOpacity={0.8}>
      <Avatar name={c.name} size={44} online={isOnline}/>
      <View style={{ flex:1, marginLeft:12 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
            <Text style={styles.convoName}>{c.name}</Text>
            {isMuted && <BellOff size={10} color={C.muted}/>}
          </View>
          <Text style={styles.convoTime}>{c.time}</Text>
        </View>
        <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:3 }}>
          <Text style={[styles.convoMsg, isTyping && { color:C.success }]} numberOfLines={1}>
            {isTyping ? 'transmitting…' : c.message}
          </Text>
          {hasDelayed && <Pill tone="danger">delayed</Pill>}
        </View>
        <Text style={styles.convoStatus}>{c.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function App() {
  const [conversations, setConversations] = useState(SEED_CONVOS);
  const [messagesByChat, setMessagesByChat] = useState(SEED_MSGS);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('Chats');
  const [mutedChats, setMutedChats] = useState(new Set());
  const [blockedChats, setBlockedChats] = useState(new Set());
  const [blockedNames, setBlockedNames] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [offlineFirst, setOfflineFirst] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);
  const [typingChats, setTypingChats] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [events, setEvents] = useState(SEED_EVENTS);
  const [lastHandshake, setLastHandshake] = useState(nowTime());

  const replyTs = useRef({});
  const deliveryTs = useRef({});
  const mutedRef = useRef(mutedChats);
  const lowBandwidthRef = useRef(lowBandwidth);
  const autoRetryRef = useRef(autoRetry);
  const offlineFirstRef = useRef(offlineFirst);

  useEffect(() => { mutedRef.current = mutedChats; }, [mutedChats]);
  useEffect(() => { lowBandwidthRef.current = lowBandwidth; }, [lowBandwidth]);
  useEffect(() => { autoRetryRef.current = autoRetry; }, [autoRetry]);
  useEffect(() => { offlineFirstRef.current = offlineFirst; }, [offlineFirst]);

  const activeChat = conversations.find(c => c.id === selectedId);
  const currentMsgs = activeChat ? (messagesByChat[activeChat.id] || []) : [];
  const visibleConvos = useMemo(() => conversations.filter(c => !blockedChats.has(c.id)), [conversations, blockedChats]);
  const totalMsgs = useMemo(() => Object.values(messagesByChat).reduce((s,a) => s+a.length, 0), [messagesByChat]);
  const queuedCount = useMemo(() => Object.values(messagesByChat).flat().filter(m => m.delivery==='queued').length, [messagesByChat]);
  const cacheStorage = useMemo(() => {
    const bytes = JSON.stringify({ conversations, messagesByChat }).length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1024/1024).toFixed(2)} MB`;
  }, [conversations, messagesByChat]);

  useEffect(() => {
    (async () => {
      const cv = await hydrate('vybe_conversations'); if (cv) setConversations(cv);
      const ms = await hydrate('vybe_messages'); if (ms) setMessagesByChat(ms);
      const mt = await hydrate('vybe_muted'); if (mt) setMutedChats(new Set(mt));
      const bl = await hydrate('vybe_blocked'); if (bl) setBlockedChats(new Set(bl));
      const bn = await hydrate('vybe_blocked_names'); if (bn) setBlockedNames(bn);
      const ev = await hydrate('vybe_events'); if (ev) setEvents(ev);
      const lbw = await hydrate('vybe_lowBandwidth'); if (lbw !== null) setLowBandwidth(lbw);
      const off = await hydrate('vybe_offlineFirst'); if (off !== null) setOfflineFirst(off);
      const art = await hydrate('vybe_autoRetry'); if (art !== null) setAutoRetry(art);
    })();
  }, []);

  useEffect(() => { persist('vybe_conversations', conversations); }, [conversations]);
  useEffect(() => { persist('vybe_messages', messagesByChat); }, [messagesByChat]);
  useEffect(() => { persist('vybe_muted', [...mutedChats]); }, [mutedChats]);
  useEffect(() => { persist('vybe_blocked', [...blockedChats]); }, [blockedChats]);
  useEffect(() => { persist('vybe_blocked_names', blockedNames); }, [blockedNames]);
  useEffect(() => { persist('vybe_events', events); }, [events]);
  useEffect(() => { persist('vybe_lowBandwidth', lowBandwidth); }, [lowBandwidth]);
  useEffect(() => { persist('vybe_offlineFirst', offlineFirst); }, [offlineFirst]);
  useEffect(() => { persist('vybe_autoRetry', autoRetry); }, [autoRetry]);

  useEffect(() => () => {
    Object.values(replyTs.current).forEach(clearTimeout);
    Object.values(deliveryTs.current).forEach(clearTimeout);
  }, []);

  const addEvent = useCallback((ev) => setEvents(p => [{ id:genId(), ...ev }, ...p].slice(0,20)), []);

  const updateOrder = useCallback((chatId, text, time) => {
    setConversations(prev => {
      const updated = prev.map(c => c.id===chatId ? { ...c, message:text, time } : c);
      const target = updated.find(c => c.id===chatId);
      const rest = updated.filter(c => c.id!==chatId);
      return target ? [target, ...rest] : rest;
    });
  }, []);

  const simulateReply = useCallback((chatId) => {
    if (replyTs.current[chatId]) { clearTimeout(replyTs.current[chatId]); delete replyTs.current[chatId]; }
    setTypingChats(p => new Set([...p, chatId]));
    const delay = lowBandwidthRef.current ? 3200 : 1600;
    replyTs.current[chatId] = setTimeout(() => {
      delete replyTs.current[chatId];
      if (mutedRef.current.has(chatId)) { setTypingChats(p => { const n=new Set(p); n.delete(chatId); return n; }); return; }
      const opts = ['Acknowledged.','Sync restored.','Received.','Queue integrity confirmed.','Copy that.','Operational.'];
      const text = opts[Math.floor(Math.random()*opts.length)];
      const t = nowTime();
      const reply = { id:genId(), text, time:t, mine:false, delivery:'delivered' };
      setMessagesByChat(p => ({ ...p, [chatId]:[...(p[chatId]||[]), reply] }));
      updateOrder(chatId, text, t);
      setTypingChats(p => { const n=new Set(p); n.delete(chatId); return n; });
      setLastHandshake(t);
      addEvent({ t, e:'Reply from endpoint', tone:'success' });
    }, delay);
  }, [updateOrder, addEvent]);

  const sendMessage = useCallback(() => {
    const text = message.trim();
    if (!text || !activeChat || text.length > MAX_MSG) return;
    const chatId = activeChat.id;
    const t = nowTime();
    const delivery = lowBandwidthRef.current ? (offlineFirstRef.current ? 'queued' : 'delayed') : 'sending';
    const msg = { id:genId(), text, time:t, mine:true, delivery };
    setMessagesByChat(p => ({ ...p, [chatId]:[...(p[chatId]||[]), msg] }));
    updateOrder(chatId, text, t);
    setMessage('');
    setLastHandshake(t);
    addEvent({ t, e:`Transmitted to ${activeChat.name}`, tone:'primary' });
    const delay = lowBandwidthRef.current ? 2400 : 900;
    deliveryTs.current[msg.id] = setTimeout(() => {
      setMessagesByChat(p => {
        if (!p[chatId]) return p;
        return { ...p, [chatId]: p[chatId].map(m => {
          if (m.id !== msg.id) return m;
          if (m.delivery === 'delayed' && !autoRetryRef.current) return m;
          return { ...m, delivery:'delivered' };
        })};
      });
      setLastHandshake(nowTime());
    }, delay);
    simulateReply(chatId);
  }, [message, activeChat, updateOrder, simulateReply, addEvent]);

  const addContact = useCallback((name) => {
    const trimmed = name.trim().slice(0,40);
    if (!trimmed) return;
    if (blockedNames.some(n => n.toLowerCase()===trimmed.toLowerCase())) {
      setModal({ title:'Endpoint Blocked', body:`"${trimmed}" is blocked. Unblock in Profile first.`, confirmText:'Got it' });
      return;
    }
    if (conversations.find(c => c.name.toLowerCase()===trimmed.toLowerCase())) {
      setModal({ title:'Thread exists', body:`"${trimmed}" is already in your threads.`, confirmText:'Got it' });
      return;
    }
    const id = genId(); const t = nowTime();
    setConversations(p => [{ id, name:trimmed, message:'No messages yet.', time:t, status:'Synced' }, ...p]);
    setMessagesByChat(p => ({ ...p, [id]: [] }));
    setSelectedId(id);
    addEvent({ t, e:`New thread: ${trimmed}`, tone:'primary' });
  }, [conversations, blockedNames, addEvent]);

  const unblockContact = useCallback((name) => {
    setBlockedNames(p => p.filter(n => n.toLowerCase()!==name.toLowerCase()));
    addEvent({ t:nowTime(), e:`Endpoint unblocked: ${name}`, tone:'success' });
  }, [addEvent]);

  const handleMenuOption = (opt) => {
    setShowMenu(false);
    if (!activeChat) return;
    const chatId = activeChat.id;
    if (opt === 'profile') {
      setModal({ title:`Connection Profile — ${activeChat.name}`, body:`Status: ${activeChat.status}\nQueue Health: Stable\nLast Seen: ${activeChat.time}` });
    } else if (opt === 'mute') {
      setMutedChats(p => { const n=new Set(p); n.has(chatId)?n.delete(chatId):n.add(chatId); return n; });
    } else if (opt === 'delete') {
      setModal({ title:'Delete Conversation', body:'Remove the local thread? This cannot be undone.', confirmText:'Delete', variant:'danger',
        onConfirm: () => {
          (messagesByChat[chatId]||[]).forEach(m => { if (deliveryTs.current[m.id]) { clearTimeout(deliveryTs.current[m.id]); delete deliveryTs.current[m.id]; } });
          setConversations(p => p.filter(c => c.id!==chatId));
          setMessagesByChat(p => { const n={...p}; delete n[chatId]; return n; });
          setSelectedId(null);
          addEvent({ t:nowTime(), e:'Thread deleted', tone:'warning' });
        }});
    } else if (opt === 'block') {
      setModal({ title:'Block Endpoint', body:`Block ${activeChat.name}? No further messages accepted.`, confirmText:'Block', variant:'danger',
        onConfirm: () => {
          setBlockedNames(p => [...p, activeChat.name]);
          setBlockedChats(p => new Set([...p, chatId]));
          (messagesByChat[chatId]||[]).forEach(m => { if (deliveryTs.current[m.id]) { clearTimeout(deliveryTs.current[m.id]); delete deliveryTs.current[m.id]; } });
          setConversations(p => p.filter(c => c.id!==chatId));
          setMessagesByChat(p => { const n={...p}; delete n[chatId]; return n; });
          setSelectedId(null);
          addEvent({ t:nowTime(), e:`Endpoint blocked: ${activeChat.name}`, tone:'danger' });
        }});
    }
  };

  const trimmedMsg = message.trim();
  const charsLeft = MAX_MSG - trimmedMsg.length;
  const showCounter = trimmedMsg.length >= WARN_AT;

  // CHAT VIEW
  if (selectedId && activeChat) {
    const isMuted = mutedChats.has(activeChat.id);
    const isTyping = typingChats.has(activeChat.id);
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSelectedId(null)}>
            <ArrowLeft size={18} color={C.text}/>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex:1, flexDirection:'row', alignItems:'center', marginLeft:8 }} onPress={() => handleMenuOption('profile')}>
            <Avatar name={activeChat.name} size={34}/>
            <View style={{ marginLeft:10 }}>
              <Text style={styles.headerName}>{activeChat.name}</Text>
              <Text style={[styles.headerStatus, isTyping && { color:C.success }]}>{isTyping ? 'transmitting…' : activeChat.status}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowMenu(v => !v)}>
            <MoreVertical size={18} color={C.text}/>
          </TouchableOpacity>
        </View>

        {showMenu && (
          <View style={styles.dropMenu}>
            {[
              { icon:UserCircle2, label:'Connection Profile', key:'profile' },
              { icon: isMuted ? Bell : BellOff, label: isMuted ? 'Resume Notifications' : 'Pause Notifications', key:'mute' },
              { icon:Trash2, label:'Delete Thread', key:'delete' },
              { icon:Ban, label:'Block Endpoint', key:'block', danger:true },
            ].map((m,i) => (
              <TouchableOpacity key={m.key} style={styles.menuItem} onPress={() => handleMenuOption(m.key)}>
                <m.icon size={13} color={m.danger ? C.danger : C.muted}/>
                <Text style={[styles.menuItemText, m.danger && { color:C.danger }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FlatList
          data={currentMsgs}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding:14, gap:10 }}
          ListEmptyComponent={<Text style={{ color:C.muted, textAlign:'center', marginTop:40 }}>No messages yet. Send the first transmission.</Text>}
          renderItem={({ item:m }) => {
            const d = DMAP[m.delivery];
            return (
              <View style={{ alignItems: m.mine ? 'flex-end' : 'flex-start' }}>
                <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={styles.bubbleText}>{m.text}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'flex-end', marginTop:5, gap:6 }}>
                    <Text style={styles.bubbleTime}>{m.time}</Text>
                    {m.mine && d && <d.Icon size={9} color={d.color}/>}
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            value={message}
            onChangeText={(t) => setMessage(t.slice(0, MAX_MSG))}
            placeholder="Transmit message…"
            placeholderTextColor={C.muted}
            style={styles.textInput}
            multiline
          />
          {showCounter && <Text style={{ color: charsLeft<=20?C.danger:C.warning, fontSize:9, marginRight:6 }}>{charsLeft}</Text>}
          <TouchableOpacity
            style={[styles.sendBtn, { opacity: trimmedMsg ? 1 : 0.4 }]}
            disabled={!trimmedMsg || trimmedMsg.length > MAX_MSG}
            onPress={sendMessage}
          >
            <Send size={15} color="#fff"/>
          </TouchableOpacity>
        </View>

        <ConfirmModal modal={modal} onClose={() => setModal(null)}/>
        <PromptModal prompt={prompt} onClose={() => setPrompt(null)}/>
      </SafeAreaView>
    );
  }

  // MAIN VIEW
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topHeader}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
          <View style={styles.logo}><Text style={{ color:'#fff', fontWeight:'900', fontSize:19 }}>V</Text></View>
          <View>
            <Text style={styles.brand}>VYBE</Text>
            <Text style={styles.brandSub}>Resilient Comm Layer</Text>
          </View>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setPrompt({ title:'New Thread', placeholder:'Contact name…', onSubmit:addContact })}>
            <Plus size={15} color={C.mutedMid}/>
          </TouchableOpacity>
          <Pill tone="success">Synced</Pill>
        </View>
      </View>

      <View style={{ flex:1 }}>
        {activeTab === 'Chats' && (
          <FlatList
            data={visibleConvos}
            keyExtractor={c => c.id}
            contentContainerStyle={{ padding:12, gap:8 }}
            ListEmptyComponent={<Text style={{ color:C.muted, textAlign:'center', marginTop:40 }}>No active threads. Tap + to start one.</Text>}
            renderItem={({ item:c }) => (
              <ConvoItem
                convo={c}
                isMuted={mutedChats.has(c.id)}
                isTyping={typingChats.has(c.id)}
                hasDelayed={(messagesByChat[c.id]||[]).some(m => m.delivery==='delayed')}
                isOnline={c.status==='Synced'}
                onPress={() => setSelectedId(c.id)}
              />
            )}
          />
        )}

        {activeTab === 'Queue' && (
          <ScrollView contentContainerStyle={{ padding:14, gap:12 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={styles.screenTitle}>Queue Operations</Text>
              <Pill tone="success">Healthy</Pill>
            </View>
            <View style={styles.grid2}>
              <StatCard label="Last Sync" value={events[0]?.t || '—'} tone="success" icon={Clock}/>
              <StatCard label="Network" value="Moderate" tone="warning" icon={Activity}/>
              <StatCard label="Queue Depth" value={`${queuedCount} item${queuedCount!==1?'s':''}`} tone={queuedCount>0?'warning':'success'} icon={Layers}/>
              <StatCard label="Failures" value="0" tone="success" icon={ShieldCheck}/>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Recent Events</Text>
              {events.slice(0,6).map(ev => (
                <View key={ev.id} style={styles.eventRow}>
                  <Text style={styles.eventTime}>{ev.t}</Text>
                  <Text style={styles.eventText} numberOfLines={1}>{ev.e}</Text>
                  <Pill tone={ev.tone}>{ev.tone}</Pill>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {activeTab === 'Connect' && (
          <ScrollView contentContainerStyle={{ padding:14, gap:12 }}>
            <Text style={styles.screenTitle}>Connectivity</Text>
            <View style={styles.card}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                <Text style={styles.cardHeading}>Current Link</Text>
                <Text style={{ color:C.text, fontWeight:'700' }}>{lowBandwidth ? '128 kbps' : '2.4 Mbps'}</Text>
              </View>
              <View style={{ height:6, borderRadius:100, backgroundColor:C.surface2 }}>
                <View style={{ height:6, borderRadius:100, width: lowBandwidth ? '18%' : '72%', backgroundColor:C.primary }}/>
              </View>
            </View>
            {[
              { label:'Low Bandwidth Mode', desc:'Reduced sync activity.', icon:Zap, on:lowBandwidth, set:setLowBandwidth },
              { label:'Offline-First Queue', desc:'Persist messages until a path is available.', icon:Database, on:offlineFirst, set:setOfflineFirst },
              { label:'Automatic Retry', desc:'Backoff retry for failed sends.', icon:Activity, on:autoRetry, set:setAutoRetry },
            ].map(r => (
              <View key={r.label} style={[styles.card, { flexDirection:'row', alignItems:'center', gap:12 }]}>
                <r.icon size={18} color={r.on ? C.primary : C.muted}/>
                <View style={{ flex:1 }}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <Text style={styles.rowDesc}>{r.desc}</Text>
                </View>
                <Toggle checked={r.on} onChange={r.set}/>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'Profile' && (
          <ScrollView contentContainerStyle={{ padding:14, gap:12 }}>
            <Text style={styles.screenTitle}>Device Operations</Text>
            <View style={[styles.card, { flexDirection:'row', alignItems:'center', gap:14 }]}>
              <Avatar name="Operator" size={52} online/>
              <View>
                <Text style={styles.opName}>Operator 07</Text>
                <Text style={styles.opNode}>Node · field-unit-07.local</Text>
              </View>
            </View>
            <View style={styles.grid2}>
              <StatCard label="Local Queue" value={`${totalMsgs} items`} icon={Layers}/>
              <StatCard label="Active Threads" value={String(visibleConvos.length)} tone="success" icon={MessageSquare}/>
              <StatCard label="Cache Storage" value={cacheStorage} icon={HardDrive}/>
              <StatCard label="Persistence" value="Active" tone="success" icon={Server}/>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Runtime</Text>
              <View style={styles.eventRow}><Text style={styles.rowDesc}>Last handshake</Text><Text style={styles.rowLabel}>{lastHandshake}</Text></View>
            </View>
            {blockedNames.length > 0 && (
              <View style={styles.card}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:8 }}>
                  <ShieldOff size={12} color={C.danger}/>
                  <Text style={[styles.cardHeading, { color:C.danger }]}>Blocked Endpoints</Text>
                </View>
                {blockedNames.map(name => (
                  <View key={name} style={styles.eventRow}>
                    <Avatar name={name} size={28}/>
                    <Text style={[styles.rowLabel, { flex:1, marginLeft:8 }]}>{name}</Text>
                    <TouchableOpacity style={styles.unblockBtn} onPress={() => unblockContact(name)}>
                      <Text style={{ color:C.danger, fontSize:10, fontWeight:'700' }}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <View style={styles.tabBar}>
        {[
          { key:'Chats', Icon:MessageSquare },
          { key:'Queue', Icon:Layers },
          { key:'Connect', Icon:Radio },
          { key:'Profile', Icon:User },
        ].map(({ key, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity key={key} style={styles.tabBtn} onPress={() => setActiveTab(key)}>
              <Icon size={19} color={active ? C.primary : C.muted}/>
              <Text style={[styles.tabLabel, { color: active ? C.text : C.muted }]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ConfirmModal modal={modal} onClose={() => setModal(null)}/>
      <PromptModal prompt={prompt} onClose={() => setPrompt(null)}/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex:1, backgroundColor:C.bg },
  topHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:14, borderBottomWidth:1, borderBottomColor:C.border },
  logo: { width:38, height:38, borderRadius:12, backgroundColor:C.primary, alignItems:'center', justifyContent:'center' },
  brand: { color:C.text, fontWeight:'900', fontSize:15, letterSpacing:3 },
  brandSub: { color:C.muted, fontSize:8, fontWeight:'700', letterSpacing:1 },
  iconBtn: { width:34, height:34, borderRadius:10, backgroundColor:C.surface3, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border },
  convoItem: { flexDirection:'row', alignItems:'center', backgroundColor:C.surface, borderWidth:1, borderColor:C.border, borderRadius:16, padding:12 },
  convoName: { color:C.text, fontWeight:'700', fontSize:13 },
  convoTime: { color:C.muted, fontSize:9 },
  convoMsg: { color:C.mutedMid, fontSize:11, flex:1 },
  convoStatus: { color:C.muted, fontSize:9, marginTop:4, fontWeight:'600' },
  screenTitle: { color:C.text, fontWeight:'800', fontSize:16 },
  grid2: { flexDirection:'row', flexWrap:'wrap', gap:10 },
  statCard: { width:'47%', backgroundColor:C.surface, borderWidth:1, borderColor:C.border, borderRadius:14, padding:12 },
  statLabel: { color:C.muted, fontSize:9, fontWeight:'700', letterSpacing:1, textTransform:'uppercase' },
  statValue: { fontSize:16, fontWeight:'700' },
  card: { backgroundColor:C.surface, borderWidth:1, borderColor:C.border, borderRadius:16, padding:14 },
  cardHeading: { color:C.muted, fontSize:9, fontWeight:'700', letterSpacing:1, textTransform:'uppercase', marginBottom:8 },
  eventRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:6, borderBottomWidth:1, borderBottomColor:C.border },
  eventTime: { color:C.muted, fontSize:9 },
  eventText: { color:C.text, fontSize:11, flex:1 },
  rowLabel: { color:C.text, fontSize:12, fontWeight:'700' },
  rowDesc: { color:C.muted, fontSize:10, marginTop:2 },
  opName: { color:C.text, fontSize:14, fontWeight:'800' },
  opNode: { color:C.muted, fontSize:10, marginTop:2 },
  unblockBtn: { backgroundColor:C.dangerFaint, borderRadius:8, paddingHorizontal:10, paddingVertical:5 },
  tabBar: { flexDirection:'row', borderTopWidth:1, borderTopColor:C.border, backgroundColor:C.surface, paddingVertical:8 },
  tabBtn: { flex:1, alignItems:'center', gap:3 },
  tabLabel: { fontSize:9, fontWeight:'600' },
  header: { flexDirection:'row', alignItems:'center', padding:12, borderBottomWidth:1, borderBottomColor:C.border },
  headerName: { color:C.text, fontSize:13, fontWeight:'800' },
  headerStatus: { color:C.muted, fontSize:10, marginTop:1 },
  dropMenu: { position:'absolute', right:14, top:60, zIndex:50, width:200, backgroundColor:C.surface, borderWidth:1, borderColor:C.borderHigh, borderRadius:14, overflow:'hidden' },
  menuItem: { flexDirection:'row', alignItems:'center', gap:10, padding:11, borderBottomWidth:1, borderBottomColor:C.border },
  menuItemText: { color:C.text, fontSize:12, fontWeight:'500' },
  bubble: { maxWidth:'78%', borderRadius:18, padding:11 },
  bubbleMine: { backgroundColor:C.primary, borderBottomRightRadius:4 },
  bubbleTheirs: { backgroundColor:C.surface2, borderBottomLeftRadius:4, borderWidth:1, borderColor:C.border },
  bubbleText: { color:'#fff', fontSize:13 },
  bubbleTime: { color:'rgba(255,255,255,0.65)', fontSize:9 },
  inputBar: { flexDirection:'row', alignItems:'flex-end', padding:12, gap:8, borderTopWidth:1, borderTopColor:C.border },
  textInput: { flex:1, backgroundColor:C.surface2, borderRadius:20, paddingHorizontal:14, paddingVertical:10, color:C.text, fontSize:13, maxHeight:100, borderWidth:1, borderColor:C.border },
  sendBtn: { width:38, height:38, borderRadius:19, backgroundColor:C.primary, alignItems:'center', justifyContent:'center' },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.8)', alignItems:'center', justifyContent:'center', padding:20 },
  modalCard: { width:'100%', maxWidth:320, backgroundColor:C.surface, borderRadius:20, borderWidth:1, borderColor:C.borderHigh, overflow:'hidden' },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:C.border },
  modalTitle: { color:C.text, fontSize:13, fontWeight:'700', flex:1 },
  modalBody: { color:C.mutedMid, fontSize:12, padding:16, lineHeight:20 },
  modalActions: { flexDirection:'row', gap:8, padding:16, borderTopWidth:1, borderTopColor:C.border },
  btnSecondary: { flex:1, padding:10, borderRadius:12, backgroundColor:C.surface3, alignItems:'center' },
  btnSecondaryText: { color:C.text, fontSize:11, fontWeight:'600' },
  btnPrimary: { flex:1, padding:10, borderRadius:12, backgroundColor:C.primary, alignItems:'center' },
  btnPrimaryText: { color:'#fff', fontSize:11, fontWeight:'600' },
  promptInput: { margin:16, marginTop:0, backgroundColor:C.surface2, borderRadius:12, padding:12, color:C.text, borderWidth:1, borderColor:C.border },
});
