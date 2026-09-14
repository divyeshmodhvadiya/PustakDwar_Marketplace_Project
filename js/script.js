const app = document.querySelector("#app");
const preloader = document.querySelector("#preloader");
const initialRoute =
  window.location.hash.slice(1) ||
  (window.location.pathname.endsWith("index.html")
    ? "/"
    : window.location.pathname);
const storage = {
  read(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const state = {
  path: initialRoute || "/",
  query:
    new URLSearchParams((initialRoute || "/").split("?")[1] || "").get("q") ||
    "",
  category: "All",
  sort: "featured",
  cart: storage.read("pustakdwar-cart", []),
  wishlist: storage.read("pustakdwar-wishlist", []),
  showSaved: false,
  mobileOpen: false,
  checkedOut: false,
  contactSent: false,
  authSubmitted: "",
};

const money = (value) => `Rs. ${value.toFixed(2)}`;
const bookById = (id) => books.find((book) => book.id === id);
const cartCount = () =>
  state.cart.reduce((sum, item) => sum + item.quantity, 0);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name, size = 18) {
  const paths = {
    search:
      '<circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path>',
    bag: '<path d="M5 8.5h14l1 11H4l1-11Z"></path><path d="M8 9V6a4 4 0 0 1 8 0v3"></path>',
    user: '<circle cx="12" cy="8" r="3.5"></circle><path d="M5 21a7 7 0 0 1 14 0"></path>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>',
    close: '<path d="m6 6 12 12M18 6 6 18"></path>',
    heart:
      '<path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z"></path>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"></path>',
    back: '<path d="m15 18-6-6 6-6"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    minus: '<path d="M5 12h14"></path>',
    trash:
      '<path d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3"></path>',
    sparkles:
      '<path d="m12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3ZM19 15l.6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z"></path>',
    store:
      '<path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 5 0 3 3 0 0 0 5 0 3 3 0 0 0 5 0 3 3 0 0 0 5 0M9 20v-5h6v5"></path>',
    book: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z"></path><path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H20"></path>',
    check: '<path d="m5 12 4 4L19 6"></path>',
  };
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}

function navigate(path) {
  const nextPath = path || "/";
  const cleanNextPath = nextPath.split("?")[0];
  const nextUrl = new URLSearchParams(nextPath.split("?")[1] || "");
  if (cleanNextPath === "/" || cleanNextPath === "/browse") {
    state.query = "";
    state.category = "All";
    state.sort = "featured";
    state.showSaved = false;
  }
  if (cleanNextPath === "/browse") {
    state.query = nextUrl.get("q") || "";
    state.category = categories.includes(nextUrl.get("category"))
      ? nextUrl.get("category")
      : "All";
  }
  window.history.pushState(
    {},
    "",
    `${window.location.pathname}${nextPath === "/" ? "" : `#${nextPath}`}`,
  );
  state.path = nextPath;
  state.mobileOpen = false;
  state.checkedOut = false;
  render();
  window.scrollTo(0, 0);
}

function persist() {
  storage.write("pustakdwar-cart", state.cart);
  storage.write("pustakdwar-wishlist", state.wishlist);
}

function addToCart(id) {
  const existing = state.cart.find((line) => line.id === id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ id, quantity: 1 });
  persist();
  render();
  showToast(`${bookById(id).title} added to your basket`);
}

function toggleWishlist(id) {
  const index = state.wishlist.indexOf(id);
  const message =
    index === -1
      ? "Saved to your reading list"
      : "Removed from your reading list";
  if (index === -1) {
    state.wishlist.push(id);
  } else {
    state.wishlist.splice(index, 1);
  }
  persist();
  render();
  showToast(message);
}

function updateQuantity(id, delta) {
  const line = state.cart.find((item) => item.id === id);
  if (!line) return;
  line.quantity += delta;
  if (line.quantity <= 0)
    state.cart = state.cart.filter((item) => item.id !== id);
  persist();
  render();
}

function resetFilters() {
  state.query = "";
  state.category = "All";
  state.sort = "featured";
  state.showSaved = false;
  navigate("/browse");
}

function updateSearchInput(value) {
  state.query = value;
}

function filterBooks(limit) {
  const query = state.query.trim().toLowerCase();
  const filtered = books.filter((book) => {
    const matchesSaved = !state.showSaved || state.wishlist.includes(book.id);
    const matchesCategory =
      state.category === "All" || book.category === state.category;
    const searchable =
      `${book.title} ${book.author} ${book.category}`.toLowerCase();
    return matchesSaved && matchesCategory && searchable.includes(query);
  });

  if (state.sort === "price-low") filtered.sort((a, b) => a.price - b.price);
  if (state.sort === "price-high") filtered.sort((a, b) => b.price - a.price);
  if (state.sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}

function coverMarkup(book, className = "") {
  return `<img class="${className}" src="${escapeHtml(book.cover)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy" decoding="async">`;
}

function brandMarkup() {
  return `<a href="/" data-route="/" class="brand" aria-label="PustakDwar home">
    <img class="brand-symbol" src="images/logo/pustakdwar-pu.png" alt="PustakDwar">
  </a>`;
}

function headerMarkup() {
  const nav = [
    ["/", "Home"],
    ["/browse", "Marketplace"],
    ["/about", "About Us"],
    ["/contact", "Contact Us"],
  ];
  const currentPath = state.path.split("?")[0];
  const navMarkup = nav
    .map(
      ([href, label]) =>
        `<a href="${href}" data-route="${href}" ${currentPath === href ? 'aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
  return `<header class="header">
    <div class="container nav-bar">
      ${brandMarkup()}
      <nav class="nav-links" aria-label="Primary navigation">${navMarkup}</nav>
      <div class="nav-actions">
        <button class="icon-button mobile-menu" data-action="toggle-mobile" aria-label="${state.mobileOpen ? "Close menu" : "Open menu"}" aria-expanded="${state.mobileOpen}">${icon(state.mobileOpen ? "close" : "menu", 19)}</button>
        <a href="/browse" data-route="/browse" class="icon-button" aria-label="Search the marketplace">${icon("search", 17)}</a>
        <a href="/cart" data-route="/cart" class="icon-button cart-wrap" aria-label="Shopping cart with ${cartCount()} items">${icon("bag", 18)}${cartCount() ? `<span class="cart-count">${cartCount()}</span>` : ""}</a>
        <a href="/login" data-route="/login" class="login-link">LOG IN</a>
        <a href="/signup" data-route="/signup" class="signup-link">SIGN UP</a>
      </div>
    </div>
    ${state.mobileOpen ? `<nav class="mobile-nav container" aria-label="Mobile navigation">${navMarkup}</nav>` : ""}
  </header>`;
}

function footerMarkup() {
  return `<footer class="footer">
    <div class="container footer-grid">
      <div class="footer-intro">${brandMarkup()}<p>Thoughtful books for curious readers, close to home.</p></div>
      <nav class="footer-links" aria-label="Explore navigation"><h3>Explore</h3><a href="/browse" data-route="/browse">Marketplace</a><a href="/about" data-route="/about">About us</a><a href="/contact" data-route="/contact">Contact</a></nav>
      <nav class="footer-links" aria-label="Reader navigation"><h3>For readers</h3><a href="/cart" data-route="/cart">Your basket</a><a href="/login" data-route="/login">Log in</a><a href="/signup" data-route="/signup">Create account</a></nav>
      <div class="footer-note-card"><span class="eyebrow">A NOTE FOR READERS</span><strong>Find a story that stays with you.</strong><p>Browse slowly, choose kindly, and make room for another favourite.</p></div>
    </div>
    <div class="container footer-note"><span>© 2026 PustakDwar Marketplace</span><span>Stories for every chapter.</span></div>
  </footer>`;
}

function searchToolsMarkup() {
  return `<div class="search-panel">
    <form class="search-box" data-form="search" role="search">
      ${icon("search", 16)}
      <input type="search" value="${escapeHtml(state.query)}" data-search placeholder="Search by title, author, or shelf" aria-label="Search books">
      ${state.query ? '<button class="clear-search" type="button" data-action="reset-search" aria-label="Clear search">×</button>' : ""}
      <button type="submit" class="search-submit" aria-label="Search">${icon("arrow", 16)}</button>
    </form>
    <label class="select-wrap"><span class="sr-only">Filter by category</span><select data-category aria-label="Filter by category">${categories.map((category) => `<option value="${category}" ${state.category === category ? "selected" : ""}>${category === "All" ? "All categories" : category}</option>`).join("")}</select></label>
  </div>
  <div class="category-row">${categories.map((category) => `<button class="category-chip ${state.category === category ? "active" : ""}" data-action="category" data-category-value="${category}">${category}</button>`).join("")}<span class="category-label">Find &nbsp;·&nbsp; Keep &nbsp;·&nbsp; Pass on</span><button class="saved-filter ${state.showSaved ? "active" : ""}" data-action="toggle-saved" aria-pressed="${state.showSaved}" aria-label="${state.showSaved ? "Show all books" : "Show saved books"}" title="${state.showSaved ? "Show all books" : "Show saved books"}">${icon("heart", 17)}${state.wishlist.length ? `<strong>${state.wishlist.length}</strong>` : ""}</button></div>`;
}

function ratingMarkup(value) {
  return `<span class="rating" aria-label="${value} out of 5 stars"><span class="stars">★★★★★</span><span>${value}</span></span>`;
}

function bookCardMarkup(book) {
  const saved = state.wishlist.includes(book.id);
  const discount = Math.round((1 - book.price / book.originalPrice) * 100);
  return `<article class="book-card">
    <div class="cover-frame" data-route="/books/${book.id}" role="link" tabindex="0" aria-label="View ${escapeHtml(book.title)}">
      ${coverMarkup(book)}
      ${book.badge ? `<span class="cover-badge">${book.badge}</span>` : ""}
      <button class="wishlist ${saved ? "active" : ""}" data-action="wishlist" data-id="${book.id}" aria-pressed="${saved}" aria-label="${saved ? "Remove" : "Save"} ${escapeHtml(book.title)}">${icon("heart", 16)}</button>
    </div>
    <div class="card-info">
      <div class="card-heading"><a href="/books/${book.id}" data-route="/books/${book.id}" class="card-title">${escapeHtml(book.title)}</a><span class="discount">${discount}% off</span></div>
      <p class="card-author">${escapeHtml(book.author)}</p>
      ${ratingMarkup(book.rating)}
      <div class="price-row"><div><span class="price">${money(book.price)}</span><span class="old-price">${money(book.originalPrice)}</span></div><button class="buy-button" data-action="add" data-id="${book.id}">Add</button></div>
    </div>
  </article>`;
}

function emptyStateMarkup(
  title = "No pages found",
  description = "Try a different title, author, or shelf.",
) {
  return `<div class="empty-state"><div class="empty-icon">${icon("book", 25)}</div><h3>${title}</h3><p>${description}</p><button class="outline-button" data-action="reset-search">Show all books</button></div>`;
}

function heroMarkup() {
  return `<section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy"><span class="eyebrow">THE NEIGHBOURHOOD BOOKSHELF</span><h1 id="hero-title">Connect, Share and Trade Your Favourite Reads.....</h1><p><strong>Get More, Save More</strong><span>20% OFF</span> on your next read</p><div class="hero-actions"><button class="primary-button" data-action="shop-now">Browse the shelves ${icon("arrow", 14)}</button><a href="/contact" data-route="/contact" class="hero-link">Have books to share? <span>Tell us</span></a></div></div>
    <div class="hero-art" aria-hidden="true"><div class="hero-book one">A story<br>worth keeping</div><div class="hero-book two">good<br>pages</div><div class="hero-book three">read<br>again</div><span class="hero-scribble">pass it on →</span><span class="hero-sticker">20%<small>OFF</small></span></div>
  </section>`;
}

function trustStripMarkup() {
  return `<div class="value-strip">
    <div class="value-item"><span class="value-icon">${icon("sparkles", 21)}</span><div><strong>Good books, fair prices</strong><span>Pre-loved pages deserve another home.</span></div></div>
    <div class="value-item"><span class="value-icon">${icon("store", 21)}</span><div><strong>Sell what you’ve read</strong><span>Turn your shelf into someone’s next story.</span></div></div>
    <div class="value-item"><span class="value-icon">${icon("book", 21)}</span><div><strong>Trade with neighbours</strong><span>Reading is better when it travels.</span></div></div>
  </div>`;
}

function homeMarkup() {
  const featured = filterBooks(8);
  return `<div class="container">
    ${heroMarkup()}
    <section class="discovery-bar"><div><span class="eyebrow">FIND YOUR NEXT CHAPTER</span><h2>Little discoveries, waiting for you.</h2></div><p>Every listing is a real copy from a real reader.</p></section>
    ${searchToolsMarkup()}
    <div class="section-heading"><div><span class="eyebrow">JUST IN</span><h2>Books for you</h2></div><p>${featured.length} little discoveries</p></div>
    ${featured.length ? `<div class="book-grid">${featured.map(bookCardMarkup).join("")}</div>` : emptyStateMarkup()}
    <div class="editor-note"><div class="editor-note-copy"><span class="eyebrow">A SMALL READING NOTE</span><h2>One good book can change the shape of a week.</h2><p>Pick something for a quiet afternoon, a long train ride, or the friend who always forgets to return your books.</p></div><a href="/browse" data-route="/browse" class="text-link">Explore all books ${icon("arrow", 15)}</a></div>
    ${trustStripMarkup()}
  </div>`;
}

function browseMarkup() {
  const filtered = filterBooks();
  return `<div class="container">
    <div class="page-title"><div><span class="eyebrow">THE PUSTAKDWAR MARKETPLACE</span><h1>Find your next chapter.</h1><p>Affordable pre-loved books, ready for another reader.</p></div><div class="results-meta"><strong>${filtered.length}</strong><span>books on the shelf</span></div></div>
    ${searchToolsMarkup()}
    <div class="browse-toolbar"><span>${state.query || state.category !== "All" ? "Filtered results" : "All available books"}</span><label>Sort by <select data-sort aria-label="Sort books"><option value="featured" ${state.sort === "featured" ? "selected" : ""}>Featured</option><option value="rating" ${state.sort === "rating" ? "selected" : ""}>Highest rated</option><option value="price-low" ${state.sort === "price-low" ? "selected" : ""}>Price: low to high</option><option value="price-high" ${state.sort === "price-high" ? "selected" : ""}>Price: high to low</option></select></label></div>
    ${filtered.length ? `<div class="book-grid">${filtered.map(bookCardMarkup).join("")}</div>` : emptyStateMarkup()}
  </div>`;
}

function detailMarkup(id) {
  const book = bookById(id);
  if (!book)
    return `<div class="container">${emptyStateMarkup("That book wandered off", "There’s no listing for this page.")}</div>`;
  const related = books
    .filter((item) => item.id !== id && item.category === book.category)
    .slice(0, 4);
  return `<div class="container">
    <a href="/browse" data-route="/browse" class="back-link">${icon("back", 15)} Back to marketplace</a>
    <div class="detail-layout"><div class="detail-cover">${coverMarkup(book)}</div><div class="detail-copy"><span class="eyebrow">${book.category} shelf</span>${ratingMarkup(book.rating)}<h1>${escapeHtml(book.title)}</h1><p class="byline">by ${escapeHtml(book.author)}</p><p class="description">${escapeHtml(book.description)}</p><div class="detail-price">${money(book.price)} <span>${money(book.originalPrice)}</span></div><div class="detail-actions"><button class="primary-button" data-action="add" data-id="${book.id}">Add to basket ${icon("bag", 15)}</button><button class="outline-button" data-action="wishlist" data-id="${book.id}">${icon("heart", 14)} ${state.wishlist.includes(book.id) ? "Saved" : "Save for later"}</button></div><dl class="detail-meta"><div><dt>Condition</dt><dd>${book.condition}</dd></div><div><dt>Listed by</dt><dd>${escapeHtml(book.seller)}</dd></div><div><dt>Availability</dt><dd>Ready to ship</dd></div></dl></div></div>
    <div class="section-heading"><div><span class="eyebrow">MORE TO READ</span><h2>You may also like</h2></div></div><div class="book-grid">${(related.length ? related : books.filter((item) => item.id !== id)).slice(0, 4).map(bookCardMarkup).join("")}</div>
  </div>`;
}

function cartMarkup() {
  const subtotal = state.cart.reduce(
    (sum, line) => sum + (bookById(line.id)?.price || 0) * line.quantity,
    0,
  );
  if (state.checkedOut)
    return `<div class="container"><div class="page-title"><div><span class="eyebrow">THANK YOU</span><h1>Your basket is packed.</h1></div></div><div class="success-note"><span class="success-check">${icon("check", 18)}</span><div><strong>This is a frontend demo.</strong><p>Your basket is packed with good intentions. No payment was taken.</p></div><a href="/browse" data-route="/browse" class="outline-button">Keep browsing</a></div></div>`;
  if (!state.cart.length)
    return `<div class="container"><div class="page-title"><div><span class="eyebrow">YOUR BOOK BAG</span><h1>A little room for a story.</h1><p>Browse the shelves and bring a good read home.</p></div></div>${emptyStateMarkup("Your basket is waiting for a story", "Add a book and it will show up here.")}</div>`;
  return `<div class="container"><div class="page-title"><div><span class="eyebrow">YOUR BOOK BAG</span><h1>Keep the good stories moving.</h1><p>${cartCount()} ${cartCount() === 1 ? "book" : "books"} ready for a new home.</p></div><button class="text-button" data-action="clear-cart">Clear basket</button></div><div class="cart-layout"><div class="cart-items">${state.cart
    .map((line) => {
      const book = bookById(line.id);
      if (!book) return "";
      return `<div class="cart-item"><div class="cart-item-cover">${coverMarkup(book)}</div><div><h3>${escapeHtml(book.title)}</h3><p>${escapeHtml(book.author)}</p><div class="quantity" aria-label="Quantity of ${escapeHtml(book.title)}"><button data-action="quantity" data-id="${book.id}" data-delta="-1" aria-label="Decrease quantity">${icon("minus", 13)}</button><span>${line.quantity}</span><button data-action="quantity" data-id="${book.id}" data-delta="1" aria-label="Increase quantity">${icon("plus", 13)}</button></div></div><div class="cart-item-right"><strong>${money(book.price * line.quantity)}</strong><button class="remove-button" data-action="remove" data-id="${book.id}">${icon("trash", 12)} Remove</button></div></div>`;
    })
    .join(
      "",
    )}</div><aside class="summary"><span class="eyebrow">A GOOD CHOICE</span><h2>Order summary</h2><div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="summary-line"><span>Delivery</span><span>Free for now</span></div><div class="summary-line summary-total"><span>Total</span><strong>${money(subtotal)}</strong></div><button class="primary-button" data-action="checkout">Continue to checkout ${icon("arrow", 15)}</button><div class="trade-note">Have a shelf of your own? <a href="/contact" data-route="/contact">List or exchange books</a> with the PustakDwar neighbourhood.</div></aside></div></div>`;
}

function aboutMarkup() {
  return `<div class="container info-page"><span class="eyebrow">A SMALL PUSTAKDWAR MARKETPLACE</span><h1>A book is better when it travels.</h1><p class="lead">PustakDwar is a neighbourhood marketplace for readers who believe every good book deserves more than one life. Find affordable pre-loved copies, pass your own stories on, and make space for the next chapter.</p><div class="info-blocks"><div class="info-block"><span class="info-number">01</span><h2>Buy kindly</h2><p>Every listing is a real copy from a real reader. We keep prices practical and the shelves changing.</p></div><div class="info-block"><span class="info-number">02</span><h2>Trade freely</h2><p>Read it, love it, then let it go. Get in touch to swap a favourite for a story you haven’t met yet.</p></div><div class="info-block"><span class="info-number">03</span><h2>Share locally</h2><p>PustakDwar is for people who still underline passages and lend books without expecting them back quickly.</p></div><div class="info-block"><span class="info-number">04</span><h2>Keep reading</h2><p>From a first chapter to a well-thumbed classic, there is always another good book around the corner.</p></div></div></div>`;
}

function contactMarkup() {
  return `<div class="container info-page contact-page"><span class="eyebrow">SELL, TRADE, OR JUST SAY HELLO</span><h1>Let’s talk books.</h1><p class="lead">Want to sell a stack, arrange a trade, or ask about a listing? Leave a note and the PustakDwar desk will get back to you.</p>${state.contactSent ? '<div class="success-note"><span class="success-check">' + icon("check", 18) + "</span><div><strong>Thanks for your note.</strong><p>We’ll be in touch soon.</p></div></div>" : ""}<form class="contact-form" data-form="contact"><label>Your name<input required name="name" placeholder="A reader's name"></label><label>Email address<input required type="email" name="email" placeholder="you@example.com"></label><label>Your note<textarea required name="message" placeholder="I have a few books to share..."></textarea></label><button class="primary-button" type="submit">Send note ${icon("arrow", 15)}</button></form></div>`;
}

function authMarkup(kind) {
  const isLogin = kind === "login";
  const title = isLogin
    ? "Welcome back to the shelf."
    : "Join the PustakDwar shelf.";
  const intro = isLogin
    ? "Pick up where you left off and keep your next read close."
    : "Create a simple reader account to keep your basket and favourites together.";
  const submitted = state.authSubmitted === kind;
  return `<div class="auth-page container"><div class="auth-intro"><span class="eyebrow">${isLogin ? "WELCOME BACK" : "A PLACE FOR READERS"}</span><h1>${title}</h1><p>${intro}</p><div class="auth-quote"><span>“</span><strong>Every good book deserves another reader.</strong></div></div><div class="auth-panel"><div class="auth-panel-heading"><span class="eyebrow">${isLogin ? "LOG IN" : "SIGN UP"}</span><h2>${isLogin ? "Open your reading list" : "Start your account"}</h2><p>${isLogin ? "Enter your details to continue." : "It only takes a moment to get started."}</p></div>${submitted ? `<div class="success-note"><span class="success-check">${icon("check", 18)}</span><div><strong>${isLogin ? "You are signed in." : "Your account is ready."}</strong><p>This frontend demo does not send or store account details.</p></div></div>` : `<form class="auth-form" data-form="${kind}">${!isLogin ? '<label>Full name<input required name="name" autocomplete="name" placeholder="Your name"></label>' : ""}<label>Email address<input required type="email" name="email" autocomplete="email" placeholder="you@example.com"></label><label>Password<input required type="password" name="password" autocomplete="${isLogin ? "current-password" : "new-password"}" placeholder="At least 6 characters" minlength="6"></label>${isLogin ? '<label class="auth-check"><input type="checkbox" name="remember"> <span>Keep me signed in</span></label>' : ""}<button class="primary-button" type="submit">${isLogin ? "Log in" : "Create account"} ${icon("arrow", 15)}</button></form>`}</div></div>`;
}

function pageMarkup() {
  const cleanPath = state.path.split("?")[0];
  if (cleanPath === "/") {
    state.query = "";
    state.category = "All";
    state.sort = "featured";
  }
  const params = new URLSearchParams(state.path.split("?")[1] || "");
  if (params.has("q")) state.query = params.get("q") || "";
  if (params.has("category") && categories.includes(params.get("category"))) {
    state.category = params.get("category");
  }
  let content = homeMarkup();
  let description =
    "Discover affordable pre-loved books and pass your own stories on with PustakDwar.";
  if (cleanPath === "/browse" || cleanPath === "/marketplace") {
    content = browseMarkup();
    description = "Browse affordable pre-loved books on PustakDwar.";
  } else if (cleanPath.startsWith("/books/")) {
    content = detailMarkup(cleanPath.split("/")[2]);
    description =
      "Read the details, condition, and story behind this PustakDwar listing.";
  } else if (cleanPath === "/cart") {
    content = cartMarkup();
    description = "Review your PustakDwar basket.";
  } else if (cleanPath === "/about") {
    content = aboutMarkup();
    description = "Learn why PustakDwar helps good books travel.";
  } else if (cleanPath === "/contact") {
    content = contactMarkup();
    description = "Sell or trade books with the PustakDwar neighbourhood.";
  } else if (cleanPath === "/login") {
    content = authMarkup("login");
    description = "Log in to your PustakDwar reader account.";
  } else if (cleanPath === "/signup") {
    content = authMarkup("signup");
    description = "Create a PustakDwar reader account.";
  }
  document.title =
    cleanPath === "/"
      ? "PustakDwar — Read, list, and buy your next favourite"
      : `PustakDwar — ${cleanPath.replace("/", "").replace("-", " ")}`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", description);
  return content;
}

function render() {
  const params = new URLSearchParams(state.path.split("?")[1] || "");
  if (params.get("category") && categories.includes(params.get("category")))
    state.category = params.get("category");
  app.innerHTML = `${headerMarkup()}<main>${pageMarkup()}</main>${footerMarkup()}<div id="toast-root" class="toast-root" aria-live="polite"></div>`;
}

function showToast(message) {
  const toast = document.querySelector("#toast-root");
  if (!toast) return;
  toast.innerHTML = `<div class="toast">${icon("check", 16)}<span>${escapeHtml(message)}</span><button data-action="close-toast" aria-label="Dismiss notification">×</button></div>`;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    if (toast) toast.innerHTML = "";
  }, 3600);
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (action) {
    const { action: name, id } = action.dataset;
    if (name === "toggle-mobile") {
      state.mobileOpen = !state.mobileOpen;
      render();
    }
    if (name === "shop-now") navigate("/browse");
    if (name === "category") {
      navigate(
        `/browse?category=${encodeURIComponent(action.dataset.categoryValue)}`,
      );
    }
    if (name === "reset-search") resetFilters();
    if (name === "toggle-saved") {
      state.showSaved = !state.showSaved;
      render();
    }
    if (name === "wishlist") toggleWishlist(id);
    if (name === "add") addToCart(id);
    if (name === "quantity") updateQuantity(id, Number(action.dataset.delta));
    if (name === "remove") {
      state.cart = state.cart.filter((line) => line.id !== id);
      persist();
      render();
      showToast("Removed from your basket");
    }
    if (name === "clear-cart") {
      state.cart = [];
      persist();
      render();
      showToast("Your basket is clear");
    }
    if (name === "checkout") {
      state.checkedOut = true;
      render();
    }
    if (name === "close-toast") {
      document.querySelector("#toast-root").innerHTML = "";
    }
    return;
  }

  const route = event.target.closest("[data-route]");
  if (route) {
    event.preventDefault();
    navigate(route.dataset.route);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-search]")) {
    updateSearchInput(event.target.value);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-category]")) {
    navigate(`/browse?category=${encodeURIComponent(event.target.value)}`);
  }
  if (event.target.matches("[data-sort]")) {
    state.sort = event.target.value;
    render();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.matches('[data-form="search"]')) {
    event.preventDefault();
    navigate(
      `/browse${state.query ? `?q=${encodeURIComponent(state.query)}` : ""}`,
    );
  }
  if (event.target.matches('[data-form="contact"]')) {
    event.preventDefault();
    state.contactSent = true;
    render();
  }
  if (event.target.matches('[data-form="login"]')) {
    event.preventDefault();
    state.authSubmitted = "login";
    render();
  }
  if (event.target.matches('[data-form="signup"]')) {
    event.preventDefault();
    state.authSubmitted = "signup";
    render();
  }
});

document.addEventListener("keydown", (event) => {
  const route = event.target.closest('[data-route][role="link"]');
  if (route && event.key === "Enter") {
    event.preventDefault();
    navigate(route.dataset.route);
  }
});

function syncRouteFromLocation() {
  state.path =
    window.location.hash.slice(1) ||
    (window.location.pathname.endsWith("index.html")
      ? "/"
      : window.location.pathname);
  render();
}

window.addEventListener("popstate", syncRouteFromLocation);

window.addEventListener("hashchange", syncRouteFromLocation);

render();

window.setTimeout(() => {
  preloader?.classList.add("is-hidden");
  preloader?.setAttribute("aria-hidden", "true");
}, 1400);
