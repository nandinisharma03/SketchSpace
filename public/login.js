const params = new URLSearchParams(location.search);
let next = params.get('next') || '/index.html';
// Only allow redirects inside our own site
if (!next.startsWith('/') || next.startsWith('//')) next = '/index.html';

const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const passEl = document.getElementById('password');
const errorEl = document.getElementById('error');
const submitBtn = document.getElementById('submitBtn');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
let mode = 'login';

function setMode(m) {
  mode = m;
  nameEl.hidden = m === 'login';
  nameEl.required = m === 'signup';
  submitBtn.textContent = m === 'login' ? 'Login' : 'Create account';
  tabLogin.classList.toggle('active', m === 'login');
  tabSignup.classList.toggle('active', m === 'signup');
  errorEl.textContent = '';
}
tabLogin.onclick = () => setMode('login');
tabSignup.onclick = () => setMode('signup');

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  submitBtn.disabled = true;
  try {
    const body = { email: emailEl.value, password: passEl.value };
    if (mode === 'signup') body.name = nameEl.value;
    const res = await fetch('/api/auth/' + (mode === 'login' ? 'login' : 'register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    location.href = next;
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
  }
});
