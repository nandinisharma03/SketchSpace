// --- Auth: no token means go to the login page ---
const token = localStorage.getItem('token');
const loginUrl = () => 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
if (!token) location.href = loginUrl();

const socket = io({ auth: { token } });
socket.on('connect_error', (err) => {
  if (err.message === 'Unauthorized') {
    localStorage.removeItem('token');
    location.href = loginUrl();
  }
});

// --- Elements ---
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const cursorsEl = document.getElementById('cursors');
const usersEl = document.getElementById('users');
const colorEl = document.getElementById('color');
const sizeEl = document.getElementById('size');

// --- Room id comes from the URL (?room=abc). If missing, create one. ---
const params = new URLSearchParams(location.search);
let roomId = params.get('room');
if (!roomId) {
  roomId = Math.random().toString(36).slice(2, 8);
  history.replaceState(null, '', `?room=${roomId}`);
}

// Join on every (re)connect so a dropped connection restores the room
socket.on('connect', () => socket.emit('join-room', { roomId }));

document.getElementById('logout').onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = 'login.html';
};

// --- Drawing helpers ---
function drawSegment(s) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(s.x1, s.y1);
  ctx.stroke();
}
function redrawAll(segments) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  segments.forEach(drawSegment);
}
redrawAll([]);

function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * canvas.width) / r.width,
    y: ((e.clientY - r.top) * canvas.height) / r.height,
  };
}

// --- Local drawing ---
let drawing = false, last = null, strokeId = null, erasing = false;

canvas.addEventListener('pointerdown', (e) => {
  drawing = true;
  last = getPos(e);
  strokeId = socket.id + '-' + Date.now();
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  const p = getPos(e);
  sendCursor(p);
  if (!drawing) return;
  const seg = {
    strokeId, x0: last.x, y0: last.y, x1: p.x, y1: p.y,
    color: erasing ? '#ffffff' : colorEl.value,
    size: erasing ? +sizeEl.value * 3 : +sizeEl.value,
  };
  drawSegment(seg);          // draw instantly on my screen
  socket.emit('draw', seg);  // tell everyone else
  last = p;
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
  canvas.addEventListener(ev, () => { drawing = false; })
);

// Throttle cursor updates to ~30/sec
let lastCursorSent = 0;
function sendCursor(p) {
  const now = Date.now();
  if (now - lastCursorSent < 33) return;
  lastCursorSent = now;
  socket.emit('cursor', { x: p.x / canvas.width, y: p.y / canvas.height });
}

// --- Toolbar ---
document.getElementById('eraser').onclick = (e) => {
  erasing = !erasing;
  e.target.textContent = erasing ? 'Pen' : 'Eraser';
};
document.getElementById('undo').onclick = () => socket.emit('undo');
document.getElementById('clear').onclick = () => confirm('Clear the board for everyone?') && socket.emit('clear');
document.getElementById('copy').onclick = () => {
  navigator.clipboard.writeText(location.href);
  alert('Invite link copied! Share it with your friends.');
};

// --- Socket events ---
socket.on('init', ({ segments }) => redrawAll(segments));
socket.on('draw', drawSegment);
socket.on('redraw', redrawAll);

socket.on('users', (list) => {
  usersEl.innerHTML = '';
  list.forEach((u) => {
    const b = document.createElement('span');
    b.className = 'badge';
    b.style.background = u.color;
    b.textContent = u.name + (u.id === socket.id ? ' (you)' : '');
    usersEl.appendChild(b);
  });
});

const cursorEls = new Map();
socket.on('cursor', ({ id, name, color, x, y }) => {
  let el = cursorEls.get(id);
  if (!el) {
    el = document.createElement('div');
    el.className = 'cursor';
    el.style.background = color;
    el.textContent = name;
    cursorsEl.appendChild(el);
    cursorEls.set(id, el);
  }
  el.style.left = x * 100 + '%';
  el.style.top = y * 100 + '%';
});
socket.on('cursor-left', (id) => {
  cursorEls.get(id)?.remove();
  cursorEls.delete(id);
});
