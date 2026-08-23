// ─────────────────────────────────────────────────────────────
// THE ONE AND ONLY NAVBAR.
// Every page includes this file with:  <script src="assets/nav.js"></script>
// placed where the nav should be injected. To change the nav (add a
// page, rename a label, reorder), edit NAV_HTML and NAV_ORDER below —
// every page picks it up automatically. The per-page differences
// (which link is highlighted, how far the desktop "dial" capsule is
// shifted so the current icon sits at the viewport's vertical center)
// are computed from the page's own filename at load time.
//
// Two things to keep in step when you add an entry:
//   • the icon cascade in BaseLayout.css only has :nth-child() delays
//     up to the current item count — add one more, or the new icon
//     appears without animating on first load;
//   • pages that don't live at the site root (blog posts) must write
//     their <script src> relative to themselves; the ../ prefix is
//     read back off it to fix up every link. See BASE below.
// ─────────────────────────────────────────────────────────────
(function () {
  // ── First-load intro vs. later navigations ──────────────────
  // The nav's slide-in + icon cascade (navCapsuleEnter / navItemEnter in
  // BaseLayout.css) is gated on html:not([data-astro-nav-entered]). We
  // want it to play exactly once — on the first page opened this session.
  // On every later navigation the cross-document view transition slides
  // the whole dial into place instead, so we set the flag here BEFORE the
  // nav is injected below; that stops the intro replaying on every page
  // load, which was what read as a "glitchy" navbar.
  try {
    if (sessionStorage.getItem('navEntered')) {
      document.documentElement.setAttribute('data-astro-nav-entered', '');
    } else {
      sessionStorage.setItem('navEntered', '1');
    }
  } catch (err) { /* storage blocked (e.g. private mode) — intro just plays each load */ }

  // ── Where this page sits relative to the site root ──────────
  // Most pages are at the root, but blog posts live one folder
  // down in blog/. Rather than shipping a second copy of the nav
  // with ../ hardcoded into every href, we read the prefix back
  // off this script's own src attribute — a root page includes it
  // as "assets/nav.js", a post as "../assets/nav.js" — and paste
  // that prefix in front of every link below. Add a deeper folder
  // later and it keeps working, as long as the <script> tag's src
  // is written relative to the page.
  var SELF = document.currentScript;
  var BASE = (SELF.getAttribute('src') || '').replace(/assets\/nav\.js.*$/, '');

  // Page files in nav order (top of the dial to bottom). Must match
  // the links inside NAV_HTML.
  var NAV_ORDER = [
    'index.html',
    'projects.html',
    'timeline.html',
    'skills.html',
    'awards.html',
    'certifications.html',
    'photography.html',
    'books.html',
    'interests.html',
    'blog.html'
  ];
  var ROW_HEIGHT = 52; // px per icon row; matches --nav-row-height below
  var CAPSULE_PAD = 20; // px of padding above AND below the icon stack;
                        // matches .nav-capsule's `padding: var(--space-5) 0`.

  // The glass layer behind the icons is a separate element with no
  // children, so it can't size itself off the stack — it gets an
  // explicit height instead. Derive it here rather than hardcoding a
  // number, so adding a nav item can never leave the pill too short.
  var CAPSULE_HEIGHT = NAV_ORDER.length * ROW_HEIGHT + CAPSULE_PAD * 2;

  // Which nav section does a given path belong to? Usually just the
  // filename, but every post under blog/ has its own filename and
  // still belongs to the Blog entry — so map that whole folder onto
  // blog.html. Used for both the active highlight and the reel below.
  function navFileFromPath(pathname) {
    var path;
    try { path = decodeURIComponent(pathname); } catch (err) { path = pathname; }
    // [^/]* not [^/]+ so a bare directory URL (".../blog/") counts too.
    if (/(^|\/)blog\/[^/]*$/.test(path)) return 'blog.html';
    var f = path.split('/').pop() || 'index.html';
    return /\.html$/.test(f) ? f : 'index.html';
  }

  // ── "Film reel" direction for cross-document view transitions ──
  // The reel spool + nav dial-slide are pure CSS (::view-transition-*
  // rules in BaseLayout.css) that key off html[data-astro-reel] and
  // [data-astro-reel-jumps]. With @view-transition{navigation:auto} in
  // that CSS the browser runs those transitions automatically on real
  // navigations — we only have to say which way, and how far, the page
  // content should spool. `pageswap` fires on the OUTGOING page (which
  // knows both ends of the trip) and stashes the direction; `pagereveal`
  // fires on the INCOMING page and applies it to <html>, where the
  // view-transition pseudo-elements resolve their animations. Browsers
  // that don't support these events just navigate normally — no reel,
  // no error. (Both handlers no-op unless a real transition is running.)
  function reelFileFromUrl(url) {
    try {
      return navFileFromPath(new URL(url, location.href).pathname);
    } catch (err) { return 'index.html'; }
  }

  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    var fromIdx = NAV_ORDER.indexOf(reelFileFromUrl(location.href));
    var toIdx = NAV_ORDER.indexOf(reelFileFromUrl(e.activation.entry.url));
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    try {
      // toIdx > fromIdx = moving to a page lower in the nav = content
      // spools "up" (matches the reelExit/EnterUp keyframes).
      sessionStorage.setItem('navReel', JSON.stringify({
        dir: toIdx > fromIdx ? 'up' : 'down',
        jumps: Math.min(4, Math.abs(toIdx - fromIdx))
      }));
    } catch (err) {}
  });

  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var reel = null;
    try { reel = JSON.parse(sessionStorage.getItem('navReel') || 'null'); } catch (err) {}
    try { sessionStorage.removeItem('navReel'); } catch (err) {}
    if (!reel) return;
    var root = document.documentElement;
    root.setAttribute('data-astro-reel', reel.dir);
    root.setAttribute('data-astro-reel-jumps', String(reel.jumps));
    // The attributes only mean anything mid-transition; drop them once it
    // settles so a resting page never carries stale reel state.
    e.viewTransition.finished.then(function () {
      root.removeAttribute('data-astro-reel');
      root.removeAttribute('data-astro-reel-jumps');
    }).catch(function () {});
  });

  var NAV_HTML = `<!--
    Nav sets its own transition:name="nav" on its root element (see
    Nav.astro) — that's what lets Astro's View Transitions match it
    between the old and new page and animate its position (the "dial"
    sliding up/down — see ::view-transition-group(nav) in global.css)
    WITHOUT freezing the DOM node itself. That distinction matters: a
    truly "persisted" nav would keep showing whichever page's markup
    it had on first load, so the active-link highlight would never
    update as you moved between pages. With just a matched name, each
    page still renders its own fresh nav (correct active link and
    correct resting position), it just doesn't restart from scratch.
  -->
  <!-- The center-line "notch" — a plain, static circle fixed at the
     viewport's vertical center (desktop only), sized and rounded to
     match the icon-hover circles so it reads as a natural part of
     the pill rather than a separate shape. It never moves, and it
     never needs to know which item is active: since the capsule is
     always positioned so the active icon lands exactly here (see the
     dial math above), whatever icon currently sits at this screen
     position IS the active one, automatically. It's a sibling of the
     capsule, not a child, specifically so it does NOT inherit the
     capsule's own --nav-y transform and move with it — it has to
     stay put for the "things slide to reach a fixed point" effect to
     read correctly. transition:name (identical on every page, so
     nothing about it ever visibly changes) keeps it out of the
     page's default root crossfade — without that, it would fade
     out/in with the rest of the page content on every navigation,
     which is wrong for something meant to read as a permanent
     fixture.                                                      -->
<div data-astro-transition-scope="astro-l25zdozq-1" class="nav-center-notch" aria-hidden="true" data-astro-cid-wpvy4v7s></div>

<!-- The capsule's glass surface (background/blur/shadow), as its
     own layer — sitting BEHIND the notch, while .nav-capsule (the
     icons) stays in front of it. That's what lets the notch read as
     sitting "in between" the pill's surface and the icon on top of
     it, rather than being hidden under the whole pill. It moves in
     lockstep with .nav-capsule (same --nav-y, same transition:name
     treatment in global.css), just one layer further back.        -->
<div data-astro-transition-scope="astro-5l2t6pm4-2" class="nav-capsule-bg" aria-hidden="true" style="--nav-y: 0px; height: ${CAPSULE_HEIGHT}px;" data-astro-cid-wpvy4v7s></div>

<!-- The scroll script below adds .scrolled to this element. That
     class only has a visual effect on mobile (see the media query
     in the styles) — the desktop capsule always looks the same. -->
<header data-astro-transition-scope="astro-ss5qawsi-3" class="nav-capsule" id="navCapsule" style="--nav-row-height: 52px; --nav-y: 0px;" data-astro-cid-wpvy4v7s>

  <!-- ── Mobile-only: name + hamburger ───────────────────────
       Hidden entirely on desktop (see the styles below) — the
       desktop capsule is just the icon stack, nothing else.   -->
  <div class="nav-top" data-astro-cid-wpvy4v7s>
    <a href="${BASE}index.html" class="nav-logo" aria-label="Shivank — Home" data-astro-cid-wpvy4v7s>S</a>

    <button class="menu-btn" id="menuBtn" aria-label="Open navigation menu" aria-expanded="false" data-astro-cid-wpvy4v7s>
      <span class="bar bar-top" data-astro-cid-wpvy4v7s></span>
      <span class="bar bar-mid" data-astro-cid-wpvy4v7s></span>
      <span class="bar bar-bot" data-astro-cid-wpvy4v7s></span>
    </button>
  </div>

  <!-- ── Desktop: the full icon stack, nothing clipped ──────── -->
  <nav class="nav-links" aria-label="Main navigation" data-astro-cid-wpvy4v7s>
    <a href="${BASE}index.html" aria-describedby="nav-tooltip-home" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-home" role="tooltip" data-astro-cid-wpvy4v7s>Home</span>
      </a><a href="${BASE}projects.html" aria-describedby="nav-tooltip-projects" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-projects" role="tooltip" data-astro-cid-wpvy4v7s>Projects</span>
      </a><a href="${BASE}timeline.html" aria-describedby="nav-tooltip-journey" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><path d="M4 12h16"/><circle cx="7" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="17" cy="12" r="1.6"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-journey" role="tooltip" data-astro-cid-wpvy4v7s>Journey</span>
      </a><a href="${BASE}skills.html" aria-describedby="nav-tooltip-skills" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><path d="M8 8l-4.5 4L8 16"/><path d="M16 8l4.5 4L16 16"/><path d="M13.2 5.5l-2.4 13"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-skills" role="tooltip" data-astro-cid-wpvy4v7s>Skills</span>
      </a><a href="${BASE}awards.html" aria-describedby="nav-tooltip-awards" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><circle cx="12" cy="8.5" r="5"/><path d="M9 12.8 6.5 20.5 12 17.5l5.5 3-2.5-7.7"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-awards" role="tooltip" data-astro-cid-wpvy4v7s>Awards</span>
      </a><a href="${BASE}certifications.html" aria-describedby="nav-tooltip-certifications" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-certifications" role="tooltip" data-astro-cid-wpvy4v7s>Certifications</span>
      </a><a href="${BASE}photography.html" aria-describedby="nav-tooltip-photography" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><path d="M4 8h3.3L9 5.8h6L16.7 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.2"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-photography" role="tooltip" data-astro-cid-wpvy4v7s>Photography</span>
      </a><a href="${BASE}books.html" aria-describedby="nav-tooltip-books" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><path d="M12 6.5c-1.6-1.2-3.6-1.7-6-1.7v12c2.4 0 4.4.5 6 1.7 1.6-1.2 3.6-1.7 6-1.7v-12c-2.4 0-4.4.5-6 1.7z"/><path d="M12 6.5v12"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-books" role="tooltip" data-astro-cid-wpvy4v7s>Books</span>
      </a><a href="${BASE}interests.html" aria-describedby="nav-tooltip-interests" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-interests" role="tooltip" data-astro-cid-wpvy4v7s>Interests</span>
      </a><a href="${BASE}blog.html" aria-describedby="nav-tooltip-blog" class="nav-link" data-astro-cid-wpvy4v7s>
        <span class="nav-icon-wrap" data-astro-cid-wpvy4v7s>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-wpvy4v7s><path d="M4 20.5h16"/><path d="M5.6 16.9V19h2.1L18.4 8.3a1.5 1.5 0 0 0 0-2.1l-.6-.6a1.5 1.5 0 0 0-2.1 0z"/></svg>
        </span>
        <span class="nav-label" id="nav-tooltip-blog" role="tooltip" data-astro-cid-wpvy4v7s>Blog</span>
      </a>
  </nav>

  <!-- ── Mobile: dropdown shown by the hamburger button ────── -->
  <div class="mobile-menu" id="mobileMenu" aria-hidden="true" data-astro-cid-wpvy4v7s>
    <nav data-astro-cid-wpvy4v7s>
      <a href="${BASE}index.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Home
        </a><a href="${BASE}projects.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Projects
        </a><a href="${BASE}timeline.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Journey
        </a><a href="${BASE}skills.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Skills
        </a><a href="${BASE}awards.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Awards
        </a><a href="${BASE}certifications.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Certifications
        </a><a href="${BASE}photography.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Photography
        </a><a href="${BASE}books.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Books
        </a><a href="${BASE}interests.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Interests
        </a><a href="${BASE}blog.html" class="mobile-link" data-astro-cid-wpvy4v7s>
          Blog
        </a>
    </nav>
  </div>

</header>


`;

  // Inject the nav right where the <script src="assets/nav.js"> tag sits.
  SELF.insertAdjacentHTML('beforebegin', NAV_HTML);

  // Which nav section is this? (file:// and hosted URLs both end in the
  // file name; a bare directory URL means the homepage. Posts under
  // blog/ resolve to blog.html — see navFileFromPath.)
  var file = navFileFromPath(location.pathname);
  var idx = NAV_ORDER.indexOf(file);
  if (idx === -1) idx = 0;

  // The dial: shift the capsule (and its glass background layer, which
  // must move in lockstep) so the current page's icon lands exactly on
  // the fixed center notch.
  var navY = ((NAV_ORDER.length - 1) / 2 - idx) * ROW_HEIGHT + 'px';
  document.getElementById('navCapsule').style.setProperty('--nav-y', navY);
  document.querySelector('.nav-capsule-bg').style.setProperty('--nav-y', navY);

  // Highlight the current page's links (desktop icon stack + mobile menu).
  // Compare against BASE + file, since that's how the hrefs were written.
  document.querySelectorAll('.nav-link, .mobile-link').forEach(function (a) {
    if (a.getAttribute('href') !== BASE + file) return;
    a.classList.add('active');
    if (a.classList.contains('nav-link')) a.setAttribute('aria-current', 'page');
  });

  // Behavior: mobile scrolled state + hamburger open/close.
  var capsule = document.getElementById('navCapsule');
  var menuBtn = document.getElementById('menuBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  function onScroll() {
    if (window.scrollY > 16) capsule.classList.add('scrolled');
    else capsule.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  menuBtn.addEventListener('click', function () {
    var isOpen = mobileMenu.classList.toggle('open');
    menuBtn.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
  });
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
      menuBtn.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
    });
  });
})();
