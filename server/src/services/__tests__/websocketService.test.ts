#!/usr/bin/env npx tsx
/**
 * Unit tests for services/websocketService.js (OMD-1138)
 *
 * Socket.IO-based real-time service for chat, notifications, presence,
 * and log streaming. Singleton export.
 *
 * Strategy:
 *   - Stub `socket.io` Server class before require
 *   - Stub `../config/db-compat` with route-dispatch fake pool
 *   - Stub `express-session` (unused at import)
 *   - Stub `../utils/dbLogger` for log streaming tests
 *   - Reset singleton state between tests
 *   - Build fake sockets manually (emit/join/leave/to captured)
 *
 * Coverage:
 *   - logMatchesFilters: no filters, level, source, service, user_email, search
 *   - Maps tracking: userSockets, socketUsers, conversationRooms
 *   - getOnlineUsersCount / getUserSockets / isUserOnline /
 *     getConversationParticipants
 *   - handleConnection: tracks socket, joins room, updates DB, emits success
 *   - handleDisconnection: cleans up, marks offline when last socket
 *   - joinUserConversations: joins each active convo, populates rooms
 *   - handleJoinConversation: authz check, tracks, emits joined
 *   - handleLeaveConversation: leaves room, removes tracking
 *   - handleSendMessage: authz check, inserts message + sender lookup,
 *     updates conversation, broadcasts, triggers notifications
 *   - handleTypingStart/Stop: broadcasts to conversation
 *   - handleMessageRead: updates last_read_at, broadcasts receipt
 *   - handleMarkNotificationRead: updates DB, emits confirmation
 *   - handleUpdatePresence: updates last_seen, broadcasts
 *   - updateUserOnlineStatus: upsert
 *   - broadcastPresenceUpdate: iterates friends, notifies online only
 *   - sendMessageNotifications: iterates offline participants,
 *     truncates long content, creates DB rows
 *   - sendNotificationToUser / broadcastNotification
 *   - handleSubscribeLogs / handleUnsubscribeLogs / handleUpdateLogFilters
 *   - sendRecentLogs: clamps limit, reverses order
 *   - broadcastLogEntry: filter matching, room iteration, no-op when no io
 *   - broadcastNewBuild: emits app:new_build
 *
 * Run: npx tsx server/src/services/__tests__/websocketService.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ── Stub socket.io ──────────────────────────────────────────────────
// Must be done BEFORE require('../websocketService')
const socketIoId = 'socket.io';
const fakeIoExports = {
  Server: class FakeServer {
    opts: any;
    middlewares: Function[] = [];
    connectionHandlers: Function[] = [];
    constructor(_server: any, opts: any) {
      this.opts = opts;
    }
    use(fn: Function) { this.middlewares.push(fn); }
    on(event: string, fn: Function) {
      if (event === 'connection') this.connectionHandlers.push(fn);
    }
    to(_room: string) {
      return { emit: (event: string, payload: any) => ioToEmits.push({ room: _room, event, payload }) };
    }
    emit(event: string, payload: any) { ioEmits.push({ event, payload }); }
    sockets = {
      adapter: { rooms: new Map<string, Set<string>>() },
      sockets: new Map<string, any>(),
    };
  },
};

// Inject into require.cache by synthetic id
require.cache[socketIoId] = {
  id: socketIoId,
  filename: socketIoId,
  loaded: true,
  exports: fakeIoExports,
} as any;

// Intercept Module._resolveFilename for bare-name 'socket.io'
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === 'socket.io') return socketIoId;
  if (request === 'express-session') return expressSessionId;
  return origResolve.call(this, request, ...rest);
};

// ── Stub express-session ────────────────────────────────────────────
const expressSessionId = 'express-session';
require.cache[expressSessionId] = {
  id: expressSessionId,
  filename: expressSessionId,
  loaded: true,
  exports: function () { return (req: any, res: any, next: any) => next(); },
} as any;

// ── Route-dispatch fake pool ────────────────────────────────────────
type Route = {
  match: RegExp;
  handler: (sql: string, params: any[]) => any;
};

let routes: Route[] = [];
const queryLog: Array<{ sql: string; params: any[] }> = [];
let nextInsertId = 1000;

const pool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return r.handler(sql, params);
    }
    if (/^INSERT/i.test(sql)) return [{ insertId: nextInsertId++, affectedRows: 1 }, {}];
    if (/^UPDATE/i.test(sql)) return [{ affectedRows: 1 }, {}];
    return [[], {}];
  },
};

// ── Stub config/db-compat ───────────────────────────────────────────
const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => pool,
    promisePool: pool,
  },
} as any;

// ── Stub utils/dbLogger ─────────────────────────────────────────────
let dbLoggerGetLogs: (filters: any) => Promise<any[]> = async () => [];
const dbLoggerPath = require.resolve('../../utils/dbLogger');
require.cache[dbLoggerPath] = {
  id: dbLoggerPath,
  filename: dbLoggerPath,
  loaded: true,
  exports: { dbLogger: { getLogs: (f: any) => dbLoggerGetLogs(f) } },
} as any;

// Capture io.emit and io.to(room).emit
const ioEmits: Array<{ event: string; payload: any }> = [];
const ioToEmits: Array<{ room: string; event: string; payload: any }> = [];

function resetAll() {
  routes = [];
  queryLog.length = 0;
  nextInsertId = 1000;
  ioEmits.length = 0;
  ioToEmits.length = 0;
  dbLoggerGetLogs = async () => [];
}

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// Now require the SUT
const ws = require('../websocketService');

function resetSingleton() {
  ws.userSockets.clear();
  ws.socketUsers.clear();
  ws.conversationRooms.clear();
  // Attach fake io
  if (!ws.io) {
    ws.io = new fakeIoExports.Server(null, {});
  }
}

// ── Fake socket factory ─────────────────────────────────────────────
function makeFakeSocket(userId: number, id = 'sock_' + Math.random().toString(36).slice(2)) {
  const socket: any = {
    id,
    userId,
    userEmail: `u${userId}@test.com`,
    userName: `User ${userId}`,
    rooms: new Set<string>(),
    emits: [] as Array<{ event: string; payload: any }>,
    toEmits: [] as Array<{ room: string; event: string; payload: any }>,
    logFilters: null,
    logSubscribed: false,
    join: (room: string) => { socket.rooms.add(room); },
    leave: (room: string) => { socket.rooms.delete(room); },
    emit: (event: string, payload: any) => { socket.emits.push({ event, payload }); },
    to: (room: string) => ({
      emit: (event: string, payload: any) => {
        socket.toEmits.push({ room, event, payload });
      },
    }),
    disconnect: () => { socket.disconnected = true; },
  };
  return socket;
}

async function main() {

// ============================================================================
// logMatchesFilters — pure function
// ============================================================================
console.log('\n── logMatchesFilters ──────────────────────────────────────');

resetSingleton();
{
  const entry = {
    level: 'info',
    source: '/api/churches',
    service: 'backend',
    user_email: 'a@b.com',
    message: 'something happened',
    meta: { key: 'value' },
  };

  // No filters → match
  assertEq(ws.logMatchesFilters(entry, null), true, 'null filters');
  assertEq(ws.logMatchesFilters(entry, {}), true, 'empty filters');

  // Level
  assertEq(ws.logMatchesFilters(entry, { level: 'info' }), true, 'level match');
  assertEq(ws.logMatchesFilters(entry, { level: 'error' }), false, 'level mismatch');

  // Source (substring, case-insensitive)
  assertEq(ws.logMatchesFilters(entry, { source: 'CHURCHES' }), true, 'source case-insensitive substring');
  assertEq(ws.logMatchesFilters(entry, { source: 'missing' }), false, 'source no match');

  // Service (exact)
  assertEq(ws.logMatchesFilters(entry, { service: 'backend' }), true, 'service match');
  assertEq(ws.logMatchesFilters(entry, { service: 'frontend' }), false, 'service mismatch');

  // User email (exact)
  assertEq(ws.logMatchesFilters(entry, { user_email: 'a@b.com' }), true, 'email match');
  assertEq(ws.logMatchesFilters(entry, { user_email: 'x@y.com' }), false, 'email mismatch');

  // Search (substring across message, source, service, meta)
  assertEq(ws.logMatchesFilters(entry, { search: 'something' }), true, 'search message');
  assertEq(ws.logMatchesFilters(entry, { search: 'churches' }), true, 'search source');
  assertEq(ws.logMatchesFilters(entry, { search: 'VALUE' }), true, 'search meta case-insensitive');
  assertEq(ws.logMatchesFilters(entry, { search: 'nowhere' }), false, 'search no match');
}

// ============================================================================
// Singleton state helpers
// ============================================================================
console.log('\n── singleton state helpers ────────────────────────────────');

resetSingleton();
{
  assertEq(ws.getOnlineUsersCount(), 0, 'initially 0');
  assertEq(ws.isUserOnline(42), false, 'user not online');
  assertEq(ws.getUserSockets(42).size, 0, 'no sockets for user');
  assertEq(ws.getConversationParticipants(1).size, 0, 'no participants');

  // Populate state manually
  ws.userSockets.set(42, new Set(['s1', 's2']));
  ws.userSockets.set(43, new Set(['s3']));
  ws.conversationRooms.set(10, new Set([42, 43]));

  assertEq(ws.getOnlineUsersCount(), 2, 'two users online');
  assertEq(ws.isUserOnline(42), true, 'user 42 online');
  assertEq(ws.isUserOnline(99), false, 'user 99 offline');
  assertEq(ws.getUserSockets(42).size, 2, '2 sockets for 42');
  assertEq(ws.getConversationParticipants(10).size, 2, '2 participants');
}

// ============================================================================
// handleConnection
// ============================================================================
console.log('\n── handleConnection ───────────────────────────────────────');

resetAll();
resetSingleton();
routes = [
  // joinUserConversations
  {
    match: /FROM chat_conversations c[\s\S]*JOIN chat_participants/,
    handler: () => [[{ id: 1 }, { id: 2 }], {}],
  },
  // updateUserOnlineStatus (INSERT...ON DUPLICATE)
  { match: /INSERT INTO user_profiles/, handler: () => [{ affectedRows: 1 }, {}] },
  // broadcastPresenceUpdate (user_friends_view)
  { match: /FROM user_friends_view/, handler: () => [[], {}] },
];
{
  const socket = makeFakeSocket(42);
  quiet();
  await ws.handleConnection(socket);
  loud();

  // Tracked in userSockets + socketUsers
  assertEq(ws.userSockets.get(42)?.size, 1, '1 socket for 42');
  assertEq(ws.socketUsers.get(socket.id), 42, 'socketUsers mapping');
  // Joined personal room + 2 conversation rooms
  assert(socket.rooms.has('user_42'), 'user_42 room joined');
  assert(socket.rooms.has('conversation_1'), 'conv 1 joined');
  assert(socket.rooms.has('conversation_2'), 'conv 2 joined');
  // conversationRooms populated
  assertEq(ws.conversationRooms.get(1)?.has(42), true, 'conv 1 has user');
  assertEq(ws.conversationRooms.get(2)?.has(42), true, 'conv 2 has user');
  // Emitted success
  assert(socket.emits.some(e => e.event === 'connection_success'), 'connection_success emitted');
  // updateUserOnlineStatus INSERT issued
  assert(queryLog.some(q => /INSERT INTO user_profiles/.test(q.sql)), 'online status INSERT');
}

// ============================================================================
// handleDisconnection: last socket → mark offline
// ============================================================================
console.log('\n── handleDisconnection: last socket ───────────────────────');

resetAll();
resetSingleton();
routes = [
  { match: /INSERT INTO user_profiles/, handler: () => [{ affectedRows: 1 }, {}] },
  { match: /FROM user_friends_view/, handler: () => [[], {}] },
];
{
  const socket = makeFakeSocket(55, 'sock_55');
  ws.userSockets.set(55, new Set(['sock_55']));
  ws.socketUsers.set('sock_55', 55);

  quiet();
  await ws.handleDisconnection(socket);
  loud();

  assertEq(ws.userSockets.has(55), false, 'user removed from userSockets');
  assertEq(ws.socketUsers.has('sock_55'), false, 'socketUsers cleared');
  // updateUserOnlineStatus called with false
  const profileInserts = queryLog.filter(q => /INSERT INTO user_profiles/.test(q.sql));
  assert(profileInserts.length === 1, 'one online status update');
  assertEq(profileInserts[0].params[1], false, 'is_online = false');
}

// ============================================================================
// handleDisconnection: still has other sockets → stay online
// ============================================================================
console.log('\n── handleDisconnection: multi-socket ──────────────────────');

resetAll();
resetSingleton();
{
  ws.userSockets.set(55, new Set(['s1', 's2']));
  ws.socketUsers.set('s1', 55);
  ws.socketUsers.set('s2', 55);

  const socket = makeFakeSocket(55, 's1');
  quiet();
  await ws.handleDisconnection(socket);
  loud();

  assertEq(ws.userSockets.get(55)?.size, 1, '1 socket remains');
  assert(ws.userSockets.has(55), 'user still online');
  // No DB update for online status
  const statusUpdates = queryLog.filter(q => /INSERT INTO user_profiles/.test(q.sql));
  assertEq(statusUpdates.length, 0, 'no status update');
}

// ============================================================================
// handleJoinConversation: authz denied
// ============================================================================
console.log('\n── handleJoinConversation: denied ─────────────────────────');

resetAll();
resetSingleton();
routes = [
  { match: /FROM chat_participants[\s\S]*conversation_id = \? AND user_id = \? AND is_active/, handler: () => [[], {}] },
];
{
  const socket = makeFakeSocket(10);
  quiet();
  await ws.handleJoinConversation(socket, { conversationId: 99 });
  loud();
  assert(socket.emits.some(e => e.event === 'error' && e.payload.message.includes('Not authorized')), 'error emitted');
  assert(!socket.rooms.has('conversation_99'), 'did not join room');
}

// ============================================================================
// handleJoinConversation: authorized
// ============================================================================
console.log('\n── handleJoinConversation: authorized ─────────────────────');

resetAll();
resetSingleton();
routes = [
  {
    match: /FROM chat_participants[\s\S]*conversation_id = \? AND user_id = \? AND is_active/,
    handler: () => [[{ id: 1 }], {}],
  },
];
{
  const socket = makeFakeSocket(10);
  quiet();
  await ws.handleJoinConversation(socket, { conversationId: 99 });
  loud();
  assert(socket.rooms.has('conversation_99'), 'joined room');
  assertEq(ws.conversationRooms.get(99)?.has(10), true, 'tracked');
  assert(socket.emits.some(e => e.event === 'conversation_joined'), 'confirmation emitted');
}

// ============================================================================
// handleLeaveConversation
// ============================================================================
console.log('\n── handleLeaveConversation ────────────────────────────────');

resetAll();
resetSingleton();
{
  const socket = makeFakeSocket(10);
  socket.rooms.add('conversation_5');
  ws.conversationRooms.set(5, new Set([10, 11]));

  quiet();
  ws.handleLeaveConversation(socket, { conversationId: 5 });
  loud();

  assert(!socket.rooms.has('conversation_5'), 'left room');
  assertEq(ws.conversationRooms.get(5)?.has(10), false, 'removed from tracking');
  assertEq(ws.conversationRooms.get(5)?.has(11), true, 'other user remains');
  assert(socket.emits.some(e => e.event === 'conversation_left'), 'confirmation');
}

// ============================================================================
// handleSendMessage: unauthorized
// ============================================================================
console.log('\n── handleSendMessage: unauthorized ────────────────────────');

resetAll();
resetSingleton();
routes = [
  { match: /FROM chat_participants[\s\S]*conversation_id = \? AND user_id = \?/, handler: () => [[], {}] },
];
{
  const socket = makeFakeSocket(10);
  quiet();
  await ws.handleSendMessage(socket, { conversationId: 99, content: 'hi' });
  loud();
  assert(socket.emits.some(e => e.event === 'error'), 'error emitted');
  // No insert
  assertEq(queryLog.filter(q => /INSERT INTO chat_messages/.test(q.sql)).length, 0, 'no insert');
}

// ============================================================================
// handleSendMessage: happy path
// ============================================================================
console.log('\n── handleSendMessage: happy ───────────────────────────────');

resetAll();
resetSingleton();
let msgInsertId = 500;
routes = [
  // Participant check
  { match: /FROM chat_participants[\s\S]*conversation_id = \? AND user_id = \?/, handler: () => [[{ id: 1 }], {}] },
  // Insert message
  { match: /INSERT INTO chat_messages/, handler: () => [{ insertId: msgInsertId, affectedRows: 1 }, {}] },
  // Sender info
  {
    match: /FROM orthodoxmetrics_db\.users u[\s\S]*LEFT JOIN user_profiles/,
    handler: () => [[{ id: 10, first_name: 'Alice', last_name: 'Smith', display_name: 'Alice', profile_image_url: null }], {}],
  },
  // Update conversation
  { match: /UPDATE chat_conversations/, handler: () => [{ affectedRows: 1 }, {}] },
  // sendMessageNotifications: list other participants
  {
    match: /FROM chat_participants p[\s\S]*JOIN orthodoxmetrics_db\.users/,
    handler: () => [[{ user_id: 11, first_name: 'Bob', last_name: 'Jones' }], {}],
  },
  // Sender name lookup
  {
    match: /SELECT first_name, last_name FROM orthodoxmetrics_db\.users WHERE id = \?/,
    handler: () => [[{ first_name: 'Alice', last_name: 'Smith' }], {}],
  },
  // Notification insert
  { match: /INSERT INTO notifications/, handler: () => [{ insertId: 900, affectedRows: 1 }, {}] },
];
{
  const socket = makeFakeSocket(10);
  quiet();
  await ws.handleSendMessage(socket, { conversationId: 5, content: 'hello there', messageType: 'text' });
  loud();

  // Broadcast to conversation_5
  const broadcast = ioToEmits.find(e => e.room === 'conversation_5' && e.event === 'new_message');
  assert(broadcast !== undefined, 'broadcast to conversation');
  assertEq(broadcast!.payload.id, 500, 'message id = 500');
  assertEq(broadcast!.payload.content, 'hello there', 'content');
  assertEq(broadcast!.payload.sender.first_name, 'Alice', 'sender name');
  // Notification insert happened
  assert(queryLog.some(q => /INSERT INTO notifications/.test(q.sql)), 'notification row created');
}

// ============================================================================
// handleTypingStart / Stop
// ============================================================================
console.log('\n── handleTypingStart / Stop ───────────────────────────────');

resetAll();
resetSingleton();
{
  const socket = makeFakeSocket(10);
  ws.handleTypingStart(socket, { conversationId: 5 });
  assert(socket.toEmits.some(e => e.room === 'conversation_5' && e.event === 'user_typing' && e.payload.isTyping === true), 'typing_start broadcast');

  ws.handleTypingStop(socket, { conversationId: 5 });
  assert(socket.toEmits.some(e => e.room === 'conversation_5' && e.event === 'user_typing' && e.payload.isTyping === false), 'typing_stop broadcast');
}

// ============================================================================
// handleMessageRead
// ============================================================================
console.log('\n── handleMessageRead ──────────────────────────────────────');

resetAll();
resetSingleton();
routes = [
  { match: /UPDATE chat_participants[\s\S]*last_read_at/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  const socket = makeFakeSocket(10);
  await ws.handleMessageRead(socket, { conversationId: 5, messageId: 100 });

  assert(queryLog.some(q => /UPDATE chat_participants[\s\S]*last_read_at/.test(q.sql)), 'last_read_at updated');
  assert(socket.toEmits.some(e => e.room === 'conversation_5' && e.event === 'message_read'), 'receipt broadcast');
}

// ============================================================================
// handleMarkNotificationRead
// ============================================================================
console.log('\n── handleMarkNotificationRead ─────────────────────────────');

resetAll();
resetSingleton();
routes = [
  { match: /UPDATE notifications/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  const socket = makeFakeSocket(10);
  await ws.handleMarkNotificationRead(socket, { notificationId: 77 });
  const upd = queryLog.find(q => /UPDATE notifications/.test(q.sql));
  assertEq(upd!.params[0], 77, 'notificationId');
  assertEq(upd!.params[1], 10, 'userId');
  assert(socket.emits.some(e => e.event === 'notification_read'), 'confirmation');
}

// ============================================================================
// handleUpdatePresence
// ============================================================================
console.log('\n── handleUpdatePresence ───────────────────────────────────');

resetAll();
resetSingleton();
routes = [
  { match: /UPDATE user_profiles[\s\S]*last_seen/, handler: () => [{ affectedRows: 1 }, {}] },
  { match: /FROM user_friends_view/, handler: () => [[], {}] },
];
{
  const socket = makeFakeSocket(10);
  await ws.handleUpdatePresence(socket, { status: 'away' });
  assert(queryLog.some(q => /UPDATE user_profiles[\s\S]*last_seen/.test(q.sql)), 'last_seen updated');
}

// ============================================================================
// updateUserOnlineStatus
// ============================================================================
console.log('\n── updateUserOnlineStatus ─────────────────────────────────');

resetAll();
resetSingleton();
routes = [
  { match: /INSERT INTO user_profiles/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  await ws.updateUserOnlineStatus(10, true);
  const q = queryLog.find(qq => /INSERT INTO user_profiles/.test(qq.sql));
  assertEq(q!.params[0], 10, 'userId');
  assertEq(q!.params[1], true, 'isOnline = true');
}

// ============================================================================
// broadcastPresenceUpdate
// ============================================================================
console.log('\n── broadcastPresenceUpdate ────────────────────────────────');

resetAll();
resetSingleton();
ws.userSockets.set(20, new Set(['s1']));  // friend 20 online
// friend 21 offline (not in userSockets)
routes = [
  { match: /FROM user_friends_view/, handler: () => [[{ friend_id: 20 }, { friend_id: 21 }], {}] },
];
{
  quiet();
  await ws.broadcastPresenceUpdate(10, true);
  loud();
  // Only friend 20 notified
  const emits = ioToEmits.filter(e => e.event === 'friend_presence_update');
  assertEq(emits.length, 1, 'one notification');
  assertEq(emits[0].room, 'user_20', 'to user_20 room');
}

// ============================================================================
// sendMessageNotifications: truncation
// ============================================================================
console.log('\n── sendMessageNotifications: truncation ───────────────────');

resetAll();
resetSingleton();
// Make user 11 online so real-time notif goes out too
ws.userSockets.set(11, new Set(['s1']));
routes = [
  {
    match: /FROM chat_participants p[\s\S]*JOIN orthodoxmetrics_db\.users/,
    handler: () => [[{ user_id: 11, first_name: 'Bob', last_name: 'Jones' }], {}],
  },
  {
    match: /SELECT first_name, last_name FROM orthodoxmetrics_db\.users WHERE id = \?/,
    handler: () => [[{ first_name: 'Alice', last_name: 'Smith' }], {}],
  },
  { match: /INSERT INTO notifications/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  const longContent = 'x'.repeat(150);
  quiet();
  await ws.sendMessageNotifications(5, 10, longContent, 500);
  loud();

  const realtime = ioToEmits.find(e => e.event === 'new_notification' && e.room === 'user_11');
  assert(realtime !== undefined, 'realtime emitted');
  // Real-time: 50-char truncation
  assert(realtime!.payload.message.endsWith('...'), 'realtime truncated ...');
  assert(realtime!.payload.message.length < longContent.length + 20, 'realtime shorter');

  // DB insert: 100-char truncation
  const ins = queryLog.find(q => /INSERT INTO notifications/.test(q.sql));
  assert(ins !== undefined, 'DB notification');
  assert(ins!.params[1].endsWith('...'), 'DB truncated');
}

// Offline participant: no realtime, still DB
resetAll();
resetSingleton();
// user 12 NOT in userSockets → offline
routes = [
  {
    match: /FROM chat_participants p[\s\S]*JOIN orthodoxmetrics_db\.users/,
    handler: () => [[{ user_id: 12, first_name: 'Carl', last_name: 'Davis' }], {}],
  },
  {
    match: /SELECT first_name, last_name FROM orthodoxmetrics_db\.users WHERE id = \?/,
    handler: () => [[{ first_name: 'Alice', last_name: 'Smith' }], {}],
  },
  { match: /INSERT INTO notifications/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  await ws.sendMessageNotifications(5, 10, 'short', 501);
  const realtime = ioToEmits.filter(e => e.event === 'new_notification');
  assertEq(realtime.length, 0, 'no realtime for offline');
  assert(queryLog.some(q => /INSERT INTO notifications/.test(q.sql)), 'still DB insert');
}

// ============================================================================
// sendNotificationToUser
// ============================================================================
console.log('\n── sendNotificationToUser ─────────────────────────────────');

resetAll();
resetSingleton();
ws.userSockets.set(10, new Set(['s1']));
routes = [
  { match: /INSERT INTO notifications/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  await ws.sendNotificationToUser(10, {
    type: 'test', title: 'Hi', message: 'Hello', data: { x: 1 },
  });
  const rt = ioToEmits.find(e => e.event === 'new_notification' && e.room === 'user_10');
  assert(rt !== undefined, 'realtime sent');
  const ins = queryLog.find(q => /INSERT INTO notifications/.test(q.sql));
  assertEq(ins!.params[1], 'test', 'type');
  assertEq(ins!.params[6], 'normal', 'default priority');
}

// Offline user: no realtime, still DB
resetAll();
resetSingleton();
routes = [
  { match: /INSERT INTO notifications/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  await ws.sendNotificationToUser(99, { type: 't', title: 'T', message: 'M', priority: 'high' });
  const rt = ioToEmits.filter(e => e.event === 'new_notification');
  assertEq(rt.length, 0, 'no realtime');
  const ins = queryLog.find(q => /INSERT INTO notifications/.test(q.sql));
  assertEq(ins!.params[6], 'high', 'priority passed');
}

// ============================================================================
// broadcastNotification
// ============================================================================
console.log('\n── broadcastNotification ──────────────────────────────────');

resetAll();
resetSingleton();
routes = [
  { match: /INSERT INTO notifications/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  await ws.broadcastNotification([1, 2, 3], { type: 'b', title: 'B', message: 'M' });
  const inserts = queryLog.filter(q => /INSERT INTO notifications/.test(q.sql));
  assertEq(inserts.length, 3, '3 inserts');
}

// ============================================================================
// handleSubscribeLogs
// ============================================================================
console.log('\n── handleSubscribeLogs ────────────────────────────────────');

resetAll();
resetSingleton();
dbLoggerGetLogs = async (f) => [
  { id: 1, level: 'info', message: 'a', source: 'x', service: 'y' },
  { id: 2, level: 'error', message: 'b', source: 'z', service: 'y' },
];
{
  const socket = makeFakeSocket(10);
  quiet();
  await ws.handleSubscribeLogs(socket, { filters: { level: 'info' } });
  loud();

  assertEq(socket.logSubscribed, true, 'subscribed');
  assertEq(socket.logFilters.level, 'info', 'filters stored');
  assert(socket.rooms.has('log_stream'), 'joined log_stream');
  assert(socket.emits.some(e => e.event === 'recent_logs'), 'recent_logs sent');
  assert(socket.emits.some(e => e.event === 'log_subscription_confirmed'), 'confirmation');
}

// ============================================================================
// handleUnsubscribeLogs
// ============================================================================
console.log('\n── handleUnsubscribeLogs ──────────────────────────────────');

resetAll();
resetSingleton();
{
  const socket = makeFakeSocket(10);
  socket.logSubscribed = true;
  socket.logFilters = { level: 'info' };
  socket.rooms.add('log_stream');
  quiet();
  ws.handleUnsubscribeLogs(socket);
  loud();
  assertEq(socket.logSubscribed, false, 'unsubscribed');
  assertEq(socket.logFilters, null, 'filters cleared');
  assert(!socket.rooms.has('log_stream'), 'left room');
  assert(socket.emits.some(e => e.event === 'log_unsubscription_confirmed'), 'confirmation');
}

// ============================================================================
// handleUpdateLogFilters
// ============================================================================
console.log('\n── handleUpdateLogFilters ─────────────────────────────────');

resetAll();
resetSingleton();
dbLoggerGetLogs = async () => [];
{
  const socket = makeFakeSocket(10);
  quiet();
  await ws.handleUpdateLogFilters(socket, { filters: { level: 'error' } });
  loud();
  assertEq(socket.logFilters.level, 'error', 'filters updated');
  assert(socket.emits.some(e => e.event === 'recent_logs'), 'recent_logs sent');
  assert(socket.emits.some(e => e.event === 'log_filters_updated'), 'confirmation');
}

// ============================================================================
// sendRecentLogs: limit clamp + reverse
// ============================================================================
console.log('\n── sendRecentLogs ─────────────────────────────────────────');

resetAll();
resetSingleton();
let capturedFilters: any = null;
dbLoggerGetLogs = async (f) => {
  capturedFilters = f;
  return [{ id: 1 }, { id: 2 }, { id: 3 }];
};
{
  const socket = makeFakeSocket(10);
  await ws.sendRecentLogs(socket, { limit: 500 });  // clamped to 100
  assertEq(capturedFilters.limit, 100, 'limit clamped to 100');
  const emit = socket.emits.find(e => e.event === 'recent_logs');
  assertEq(emit!.payload.count, 3, 'count');
  // Reversed
  assertEq(emit!.payload.logs[0].id, 3, 'reversed: first is 3');
  assertEq(emit!.payload.logs[2].id, 1, 'reversed: last is 1');
}

// ============================================================================
// broadcastLogEntry: no io → no-op
// ============================================================================
console.log('\n── broadcastLogEntry: guards ──────────────────────────────');

resetSingleton();
{
  const savedIo = ws.io;
  ws.io = null;
  // Should not throw
  ws.broadcastLogEntry({ level: 'info', message: 'x' });
  ws.io = savedIo;
  assert(true, 'no-op when no io');

  // No room → no-op
  const fakeIo = new fakeIoExports.Server(null, {});
  // rooms map is empty → log_stream undefined
  ws.io = fakeIo;
  ws.broadcastLogEntry({ level: 'info', message: 'x' });
  assert(true, 'no-op when no room');
}

// ============================================================================
// broadcastLogEntry: filter + emit
// ============================================================================
console.log('\n── broadcastLogEntry: emit ────────────────────────────────');

resetSingleton();
{
  const fakeIo = new fakeIoExports.Server(null, {});
  const s1 = makeFakeSocket(10, 'sid_1');
  s1.logSubscribed = true;
  s1.logFilters = { level: 'info' };
  const s2 = makeFakeSocket(11, 'sid_2');
  s2.logSubscribed = true;
  s2.logFilters = { level: 'error' };
  const s3 = makeFakeSocket(12, 'sid_3');
  s3.logSubscribed = false;  // disabled

  fakeIo.sockets.adapter.rooms.set('log_stream', new Set(['sid_1', 'sid_2', 'sid_3']));
  fakeIo.sockets.sockets.set('sid_1', s1);
  fakeIo.sockets.sockets.set('sid_2', s2);
  fakeIo.sockets.sockets.set('sid_3', s3);
  ws.io = fakeIo;

  quiet();
  ws.broadcastLogEntry({ level: 'info', message: 'm', source: 'x', service: 'y' });
  loud();

  assert(s1.emits.some(e => e.event === 'new_log'), 's1 received (matches level)');
  assert(!s2.emits.some(e => e.event === 'new_log'), 's2 did not (wrong level)');
  assert(!s3.emits.some(e => e.event === 'new_log'), 's3 did not (unsubscribed)');
}

// ============================================================================
// broadcastNewBuild
// ============================================================================
console.log('\n── broadcastNewBuild ──────────────────────────────────────');

resetAll();
resetSingleton();
{
  quiet();
  ws.broadcastNewBuild({ version: '1.2.3' });
  loud();
  const e = ioEmits.find(ev => ev.event === 'app:new_build');
  assert(e !== undefined, 'emitted app:new_build');
  assertEq(e!.payload.version, '1.2.3', 'version carried');
  assert(typeof e!.payload.timestamp === 'string', 'timestamp added');
}

// No-op when io is null
resetSingleton();
{
  const savedIo = ws.io;
  ws.io = null;
  ws.broadcastNewBuild();
  ws.io = savedIo;
  assert(true, 'no-op when no io');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
