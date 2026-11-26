/* ==========================================================================
   Carl's Angels Inventory Management — Shared Topbar & Sidebar
   Loads the role's topbar and sidebar into the page via fetch(), so the
   markup lives in exactly one place per role with no copy-paste.

   Every page is prefixed with its role (owner_, foreman_, procurement_,
   storage_). The role is read from the current page's filename, so
   owner_dashboard.html loads owner_topbar.html + owner_sidebar.html,
   foreman_dashboard.html loads foreman_topbar.html + foreman_sidebar.html,
   and so on. No per-role changes are needed in this file.

   NOTE: fetch() of local files is blocked by browsers when a page is
   opened directly (file://...). Serve frontend/ with a local server
   while developing, e.g. from frontend/html/:
     python3 -m http.server 5500
   then open http://localhost:5500/login.html

   Usage, on every page:
     <div id="cai-topbar-slot"></div>
     ...
     <div id="cai-sidebar-slot"></div>
     <script src="../js/layout.js"></script>
   ========================================================================== */

// "owner_site-a.html" -> "owner_". Pages without a role prefix get "".
function caiRolePrefix() {
  const file = window.location.pathname.split('/').pop();
  const m = file.match(/^([a-z]+_)/);
  return m ? m[1] : '';
}

async function caiInclude(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    el.innerHTML = await res.text();
  } catch (err) {
    // One missing include shouldn't stop the rest of the layout loading.
    console.error('[layout.js] Could not load ' + url + ':', err);
  }
}

// Highlights whichever sidebar link matches the current page, so you
// never have to hand-edit an "active" class per page. Also sets
// aria-current so screen readers announce the current page.
function caiHighlightActiveLink() {
  // "/" or an empty last segment means the site root, treated as the dashboard.
  const current = window.location.pathname.split('/').pop() || (caiRolePrefix() + 'dashboard.html');
  document.querySelectorAll('.cai-sidebar__link').forEach(link => {
    const href = link.getAttribute('href') || '';
    // A sub-page such as owner_site-a-bom.html keeps its parent link (owner_site-a.html) lit.
    const isParent = current.startsWith(href.replace(/\.html$/, '') + '-');
    if (href === current || isParent) {
      link.classList.add('cai-sidebar__link--active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

// Lets the person drag the strip at the sidebar's right edge to resize
// it. Width is remembered (per browser, via localStorage) so it stays
// put across page loads and across pages.
function caiInitSidebarResize() {
  const MIN_WIDTH = 140;
  const MAX_WIDTH = 420;
  const STORAGE_KEY = 'cai-sidebar-width';

  const nav = document.querySelector('.cai-sidebar');
  const resizer = document.querySelector('.cai-sidebar__resizer');
  if (!nav || !resizer) return;

  // localStorage can throw (private windows, blocked site data), so guard it.
  let saved = NaN;
  try { saved = parseInt(localStorage.getItem(STORAGE_KEY), 10); } catch (e) {}
  if (saved && saved >= MIN_WIDTH && saved <= MAX_WIDTH) {
    nav.style.width = saved + 'px';
  }

  let dragging = false;

  resizer.addEventListener('mousedown', (e) => {
    dragging = true;
    resizer.classList.add('cai-sidebar__resizer--active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const left = nav.getBoundingClientRect().left;
    let width = e.clientX - left;
    width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
    nav.style.width = width + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('cai-sidebar__resizer--active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    try { localStorage.setItem(STORAGE_KEY, parseInt(nav.style.width, 10)); } catch (e) {}
  });
}

(async function caiInitLayout() {
  const prefix = caiRolePrefix();
  await Promise.all([
    caiInclude('#cai-topbar-slot', prefix + 'topbar.html'),
    caiInclude('#cai-sidebar-slot', prefix + 'sidebar.html'),
  ]);
  caiHighlightActiveLink();
  caiInitSidebarResize();
})();
