const TYPE_LABELS = {
  text: 'DISPATCH',
  photo: 'VISUAL RECORD',
  video: 'APPROVED MEDIA',
  link: 'EXTERNAL RESOURCE'
};

const TYPE_COLORS = {
  text: '#86868B',
  photo: '#FF9F0A',
  video: '#FF375F',
  link: '#5E5CE6'
};

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return new Intl.NumberFormat('en-US').format(n);
}

function formatNumberFull(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffH < 1) return 'MOMENTS AGO';
  if (diffH < 24) return `${diffH}H AGO`;
  if (diffD < 7) return `${diffD}D AGO`;

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).toUpperCase();
}

function createPostCard(post, isFeatured) {
  const card = document.createElement('article');
  card.className = 'post-card' + (isFeatured ? ' featured' : '');

  const typeColor = TYPE_COLORS[post.type] || TYPE_COLORS.text;

  // Author
  const authorName = post.author || 'Natheist';
  const authorBar = document.createElement('div');
  authorBar.className = 'post-author-bar';
  authorBar.innerHTML = `
    <span class="post-author-name">${escapeHtml(authorName)}</span>
    <span class="post-type-label" style="color: ${typeColor}">${TYPE_LABELS[post.type] || 'DISPATCH'}</span>
    <span class="post-timestamp">${formatTimestamp(post.timestamp)}</span>
  `;
  card.appendChild(authorBar);

  // Content
  if (post.content) {
    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = post.content;
    card.appendChild(content);
  }

  // Media
  if (post.type === 'photo' && post.mediaUrl) {
    const media = document.createElement('div');
    media.className = 'post-media';
    const img = document.createElement('img');
    img.src = post.mediaUrl;
    img.alt = 'Visual record';
    img.loading = 'lazy';
    media.appendChild(img);
    card.appendChild(media);
  }

  if (post.type === 'video' && post.mediaUrl) {
    const media = document.createElement('div');
    media.className = 'post-media';
    const container = document.createElement('div');
    container.className = 'video-container';
    const iframe = document.createElement('iframe');
    iframe.src = post.mediaUrl;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = 'Approved media';
    container.appendChild(iframe);
    media.appendChild(container);
    card.appendChild(media);
  }

  if (post.type === 'link' && post.linkUrl) {
    const link = document.createElement('a');
    link.className = 'post-link';
    link.href = post.linkUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `
      <div class="post-link-label">EXTERNAL RESOURCE &gt;</div>
      <div class="post-link-title">${escapeHtml(post.linkTitle || post.linkUrl)}</div>
      <div class="post-link-url">${escapeHtml(post.linkUrl)}</div>
    `;
    card.appendChild(link);
  }

  // Actions bar
  const actions = document.createElement('div');
  actions.className = 'post-actions';
  actions.innerHTML = `
    <div class="like-count">
      <span class="like-label">ENDORSEMENTS:</span>
      ${formatNumberFull(post.likes)}
    </div>
    <button class="share-btn" data-post-id="${post.id}">SHARE</button>
  `;
  card.appendChild(actions);

  // Share handler
  const shareBtn = actions.querySelector('.share-btn');
  shareBtn.addEventListener('click', () => handleShare(shareBtn, post.id));

  return card;
}

function createAdCard(ad) {
  const card = document.createElement('aside');
  card.className = 'ad-card ad-animate';
  card.style.setProperty('--ad-color', ad.color || '#0091EA');

  card.innerHTML = `
    <div class="ad-header">
      <div class="ad-sponsor-info">
        <div class="ad-sponsor-avatar" style="background: ${ad.color || '#0091EA'}">${ad.icon || ''}</div>
        <div class="ad-sponsor-details">
          <div class="ad-sponsor-name">${escapeHtml(ad.sponsor)}</div>
          <div class="ad-sponsored-label">Sponsored · <span class="ad-globe">🌐</span></div>
        </div>
      </div>
      <div class="ad-more">···</div>
    </div>
    <div class="ad-body-text">${escapeHtml(ad.body)}</div>
    <div class="ad-visual" style="background: linear-gradient(135deg, ${ad.color || '#0091EA'}, ${adjustColor(ad.color || '#0091EA', -40)})">
      <div class="ad-visual-icon">${ad.icon || ''}</div>
      <div class="ad-visual-headline">${escapeHtml(ad.headline)}</div>
    </div>
    <div class="ad-bottom-bar">
      <div class="ad-bottom-info">
        <span class="ad-bottom-domain">${escapeHtml(ad.sponsor).toLowerCase().replace(/\s+/g, '')}.gov</span>
        <span class="ad-bottom-tagline">${escapeHtml(ad.headline)}</span>
      </div>
      <a href="${ad.ctaUrl}" class="ad-cta" style="background: ${ad.color || '#0091EA'}">${escapeHtml(ad.ctaText)}</a>
    </div>
    <div class="ad-engagement">
      <div class="ad-reactions">
        <span class="ad-reaction-icons">👍❤️😂</span>
        <span class="ad-reaction-count">${formatNumber(ad.likes || 0)}</span>
      </div>
      <div class="ad-shares">${formatNumber(ad.shares || 0)} shares</div>
    </div>
    <div class="ad-action-buttons">
      <button class="ad-action-btn">👍 Like</button>
      <button class="ad-action-btn">💬 Comment</button>
      <button class="ad-action-btn">↗ Share</button>
    </div>
  `;
  return card;
}

function adjustColor(hex, amount) {
  hex = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function handleShare(btn, postId) {
  const url = `${window.location.origin}/post/${postId}`;
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = 'LOGGED';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'SHARE';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btn.textContent = 'LOGGED';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'SHARE';
      btn.classList.remove('copied');
    }, 2000);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* =============================================
   RETRO 8-BIT COMMERCIAL AD CARDS
   ============================================= */

function createRetroAdCard(ad) {
  const card = document.createElement('aside');
  card.className = 'retro-ad ad-animate';

  const bgHTML = generateRetroBackground(ad);

  card.innerHTML = `
    <div class="retro-label">BUREAU BROADCAST · 16-BIT · MANDATORY VIEWING</div>
    <div class="retro-screen" style="background: ${ad.bgColor}">
      ${bgHTML}
      <div class="retro-commercial">
        <div class="retro-ad-icon">${ad.icon}</div>
        <div class="retro-ad-headline" style="color: ${ad.textColor}">${escapeHtml(ad.headline)}</div>
        <div class="retro-ad-tagline" style="color: ${ad.accentColor}">${escapeHtml(ad.tagline)}</div>
      </div>
      <div class="retro-ticker">
        <div class="retro-ticker-text" style="color: ${ad.textColor}">${escapeHtml(ad.copy)} · ${escapeHtml(ad.copy)} · ${escapeHtml(ad.copy)} ·&nbsp;</div>
      </div>
    </div>
    <div class="retro-info-bar">
      <div class="retro-publisher">${escapeHtml(ad.publisher)}</div>
    </div>
    <div class="retro-cta-bar">
      <span class="retro-cta-blink">▶</span> COMPLY NOW
    </div>
  `;
  return card;
}

function generateRetroBackground(ad) {
  let html = '';

  // Twinkling stars/particles for all styles
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = (Math.random() * 3).toFixed(1);
    const size = Math.random() > 0.8 ? 2 : 1;
    html += `<div class="retro-star" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-delay:${delay}s"></div>`;
  }

  // Style-specific background elements
  switch (ad.style) {
    case 'pulse':
      // Radiating rings from center
      for (let i = 0; i < 3; i++) {
        const delay = (i * 1.2).toFixed(1);
        html += `<div class="retro-ring" style="border-color:${ad.textColor};animation-delay:${delay}s"></div>`;
      }
      break;

    case 'scan':
      // Horizontal scan line sweeping
      html += `<div class="retro-scanbeam" style="background:${ad.textColor}"></div>`;
      // Grid lines
      for (let i = 0; i < 8; i++) {
        html += `<div class="retro-gridline-h" style="top:${(i + 1) * 11}%;background:${ad.textColor}"></div>`;
      }
      for (let i = 0; i < 6; i++) {
        html += `<div class="retro-gridline-v" style="left:${(i + 1) * 14}%;background:${ad.textColor}"></div>`;
      }
      break;

    case 'radar':
      // Rotating radar sweep
      html += `<div class="retro-radar-sweep" style="border-color:${ad.textColor}"></div>`;
      // Blips
      for (let i = 0; i < 5; i++) {
        const x = 25 + Math.random() * 50;
        const y = 20 + Math.random() * 50;
        const delay = (Math.random() * 2).toFixed(1);
        html += `<div class="retro-blip" style="left:${x}%;top:${y}%;background:${ad.accentColor};animation-delay:${delay}s"></div>`;
      }
      break;

    case 'meter':
      // Progress bar / productivity meter
      html += `<div class="retro-meter-container">
        <div class="retro-meter-label" style="color:${ad.accentColor}">PRODUCTIVITY INDEX</div>
        <div class="retro-meter-bar">
          <div class="retro-meter-fill" style="background:${ad.textColor}"></div>
        </div>
        <div class="retro-meter-pct" style="color:${ad.textColor}">78%</div>
      </div>`;
      break;

    case 'rain':
      // Data rain / matrix-style falling characters
      const chars = '01アイウエオカキクケコ$%&';
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * 100;
        const delay = (Math.random() * 3).toFixed(1);
        const dur = (2 + Math.random() * 3).toFixed(1);
        const ch = chars[Math.floor(Math.random() * chars.length)];
        html += `<div class="retro-rain-char" style="left:${x}%;animation-delay:${delay}s;animation-duration:${dur}s;color:${ad.textColor}">${ch}</div>`;
      }
      break;

    case 'bounce':
      // Floating food/product icons
      const items = ['🍞', '🥫', '🥛', '💊', '📋'];
      for (let i = 0; i < 5; i++) {
        const x = 10 + Math.random() * 80;
        const y = 10 + Math.random() * 70;
        const delay = (Math.random() * 2).toFixed(1);
        const dur = (1.5 + Math.random() * 1.5).toFixed(1);
        html += `<div class="retro-float-item" style="left:${x}%;top:${y}%;animation-delay:${delay}s;animation-duration:${dur}s">${items[i]}</div>`;
      }
      break;
  }

  return html;
}

function setupAgreementBanner() {
  const banner = document.getElementById('agreement-banner');
  const btn = document.getElementById('agree-btn');

  if (localStorage.getItem('natheism-compliant') === 'true') {
    banner.classList.add('dismissed');
    return;
  }

  btn.addEventListener('click', () => {
    banner.classList.add('dismissed');
    localStorage.setItem('natheism-compliant', 'true');
  });
}

function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('ad-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.ad-animate').forEach(ad => {
    observer.observe(ad);
  });
}

async function init() {
  setupAgreementBanner();

  try {
    const [postsRes, adsRes, retroRes] = await Promise.all([
      fetch('/data/posts.json'),
      fetch('/data/ads.json'),
      fetch('/data/retro_ads.json')
    ]);

    const posts = await postsRes.json();
    const ads = await adsRes.json();
    const retroAds = await retroRes.json();

    const featured = posts.filter(p => p.featured);
    const regular = posts.filter(p => !p.featured);

    // Render featured
    const featuredSection = document.getElementById('featured-posts');
    featured.forEach(post => {
      featuredSection.appendChild(createPostCard(post, true));
    });

    // Render feed with ads interspersed
    // An ad every 2 posts, alternating regular and retro
    const feed = document.getElementById('post-feed');
    let adIndex = 0;
    let retroIndex = 0;
    let adSlot = 0;

    if (regular.length === 0 && featured.length === 0) {
      feed.innerHTML = '<div class="empty-feed">NO DISPATCHES AVAILABLE. REMAIN VIGILANT.</div>';
      return;
    }

    regular.forEach((post, i) => {
      feed.appendChild(createPostCard(post, false));

      if ((i + 1) % 2 === 0) {
        // Alternate: even slots get regular ads, odd slots get retro
        if (adSlot % 2 === 1 && retroAds.length > 0) {
          feed.appendChild(createRetroAdCard(retroAds[retroIndex % retroAds.length]));
          retroIndex++;
        } else if (ads.length > 0) {
          feed.appendChild(createAdCard(ads[adIndex % ads.length]));
          adIndex++;
        }
        adSlot++;
      }
    });

    setupScrollAnimations();
  } catch (err) {
    console.error('FEED RETRIEVAL FAILED:', err);
    document.getElementById('post-feed').innerHTML =
      '<div class="empty-feed">FEED UNAVAILABLE. THE BUREAU HAS BEEN NOTIFIED.</div>';
  }
}

document.addEventListener('DOMContentLoaded', init);
