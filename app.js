/**
 * SwiftLab — shell: navegação, progresso, tema, busca, modais (glossário, flashcards, quiz).
 * Conteúdo em content/ (JSON). Servir via servidor local (ex.: python3 -m http.server) para fetch + SW.
 */

const LS_PROGRESS = 'swiftlab_progress';
const LS_THEME = 'swiftlab_theme';

const state = {
  catalog: null,
  glossaryGlobal: [],
  flashcardsBySection: {},
  quizBySection: {},
  logicBySection: {},
  modules: new Map(),
  searchIndex: [],
  sectionKeys: [],
  currentKey: null,
  fcIndex: 0,
  quizIndex: 0,
  quizScore: 0,
};

function escapeHtml(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/** Idioma do fenced code block Markdown (ex.: ```swift) → slug seguro para class="language-swift". */
function markdownCodeLang(raw) {
  const s = String(raw ?? 'swift').trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]*$/i.test(s)) return 'swift';
  return s;
}

/** Rótulo legível para o <figcaption> (ex.: swift → Swift). */
function markdownLangLabel(slug) {
  if (!slug || slug === 'swift') return 'Swift';
  if (slug === 'objc' || slug === 'objective-c') return 'Objective-C';
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function highlightCodeBlocks(root) {
  if (!root || typeof hljs === 'undefined' || !hljs.highlightElement) return;
  const sel =
    'pre.code-block code[class^="language-"], pre.logic-prompt code.language-swift, pre.logic-solution code.language-swift';
  root.querySelectorAll(sel).forEach((el) => {
    if (el.dataset.highlighted === '1') return;
    try {
      hljs.highlightElement(el);
      el.dataset.highlighted = '1';
    } catch (_) {
      /* fallback: texto puro com language-* */
    }
  });
}

function parseHash() {
  const h = (window.location.hash || '').replace(/^#/, '');
  if (!h) return { moduleId: null, sectionId: null };
  const [mod, sec] = h.split('/');
  return { moduleId: mod || null, sectionId: sec || null };
}

function setHash(moduleId, sectionId) {
  window.location.hash = `${moduleId}/${sectionId}`;
}

async function fetchJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Falha ao carregar ${path}`);
  return r.json();
}

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}');
  } catch {
    return {};
  }
}

function setProgressKey(key, done) {
  const p = getProgress();
  p[key] = !!done;
  localStorage.setItem(LS_PROGRESS, JSON.stringify(p));
  updateProgressUI();
  renderSidebar();
}

function updateProgressUI() {
  const p = getProgress();
  const total = state.sectionKeys.length;
  const done = state.sectionKeys.filter((k) => p[k]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const el = document.getElementById('progressPercent');
  const fill = document.getElementById('progressFill');
  if (el) el.textContent = `${pct}%`;
  if (fill) fill.style.width = `${pct}%`;
}

function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(LS_THEME, t);
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon) icon.textContent = t === 'light' ? '☀' : '☽';
  if (label) label.textContent = t === 'light' ? 'Modo escuro' : 'Modo claro';
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

function sectionKey(moduleId, sectionId) {
  return `${moduleId}/${sectionId}`;
}

async function loadModule(moduleId) {
  if (state.modules.has(moduleId)) return state.modules.get(moduleId);
  const meta = state.catalog.modules.find((m) => m.id === moduleId);
  if (!meta) return null;
  const data = await fetchJson(`content/${meta.file}`);
  state.modules.set(moduleId, data);
  return data;
}

async function buildSearchIndex() {
  state.searchIndex = [];
  state.sectionKeys = [];
  for (const m of state.catalog.modules) {
    const mod = await loadModule(m.id);
    if (!mod) continue;
    for (const s of mod.sections) {
      const key = sectionKey(mod.id, s.id);
      state.sectionKeys.push(key);
      state.searchIndex.push({
        key,
        moduleId: mod.id,
        sectionId: s.id,
        moduleTitle: mod.title,
        sectionTitle: s.title,
        objective: s.objective || '',
      });
    }
  }
  for (const g of state.glossaryGlobal) {
    state.searchIndex.push({
      key: `glossary:${g.term}`,
      glossary: true,
      term: g.term,
      definition: g.definition,
    });
  }
  updateProgressUI();
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  if (!nav || !state.catalog) return;
  const p = getProgress();
  nav.innerHTML = '';
  for (const m of state.catalog.modules) {
    const mod = state.modules.get(m.id);
    const wrap = document.createElement('div');
    wrap.className = 'mod-group';
    const head = document.createElement('div');
    head.className = 'mod-head';
    head.textContent = `${String(m.order).padStart(2, '0')} · ${m.title}`;
    wrap.appendChild(head);
    if (mod) {
      for (const s of mod.sections) {
        const key = sectionKey(m.id, s.id);
        const btn = document.createElement('div');
        btn.className = 'nav-item';
        if (state.currentKey === key) btn.classList.add('active');
        if (p[key]) btn.classList.add('done');
        btn.innerHTML = `<span>${escapeHtml(s.title)}</span><span class="check">✓</span>`;
        btn.addEventListener('click', () => {
          setHash(m.id, s.id);
          showSection(m.id, s.id);
          closeMobileSidebar();
        });
        wrap.appendChild(btn);
      }
    } else {
      const loadBtn = document.createElement('div');
      loadBtn.className = 'nav-item';
      loadBtn.textContent = 'Carregar…';
      loadBtn.addEventListener('click', async () => {
        await loadModule(m.id);
        renderSidebar();
      });
      wrap.appendChild(loadBtn);
    }
    nav.appendChild(wrap);
  }
}

function renderBlock(block) {
  if (!block || !block.type) return '';
  switch (block.type) {
    case 'text': {
      const parts = (block.text || '').split(/\n\n+/).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
      return `<div class="block block-text">${parts}</div>`;
    }
    case 'heading': {
      const lv = Math.min(4, Math.max(2, block.level || 3));
      const t = escapeHtml(block.text || '');
      return `<h${lv} class="block-heading block-h${lv}">${t}</h${lv}>`;
    }
    case 'callout': {
      const v = ['info', 'tip', 'warn', 'danger'].includes(block.variant) ? block.variant : 'info';
      const title = block.title ? `<div class="ct">${escapeHtml(block.title)}</div>` : '';
      return `<div class="callout ${v}">${title}<div>${escapeHtml(block.body || '')}</div></div>`;
    }
    case 'code': {
      const lang = markdownCodeLang(block.language);
      const label = escapeHtml(markdownLangLabel(lang));
      const code = escapeHtml(block.code || '');
      return `<figure class="code-figure" data-md-lang="${escapeHtml(lang)}"><figcaption class="code-lang">${label}</figcaption><pre class="code-block"><code class="language-${escapeHtml(lang)}">${code}</code></pre></figure>`;
    }
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = (block.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('');
      return `<${tag} class="block-list">${items}</${tag}>`;
    }
    case 'checklist': {
      const items = (block.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('');
      return `<ul class="checklist">${items}</ul>`;
    }
    default:
      return '';
  }
}

async function showSection(moduleId, sectionId) {
  const welcome = document.getElementById('welcome');
  const article = document.getElementById('sectionArticle');
  if (!moduleId || !sectionId) {
    state.currentKey = null;
    if (welcome) welcome.classList.remove('hdn');
    if (article) article.classList.add('hdn');
    renderSidebar();
    return;
  }
  const mod = await loadModule(moduleId);
  const section = mod?.sections?.find((s) => s.id === sectionId);
  if (!section) return;

  state.currentKey = sectionKey(moduleId, sectionId);
  if (welcome) welcome.classList.add('hdn');
  if (article) article.classList.remove('hdn');

  const pre = (section.prerequisites || [])
    .map((k) => `<span>${escapeHtml(k)}</span>`)
    .join(' · ');
  const blocksHtml = (section.blocks || []).map(renderBlock).join('');

  let mistakes = '';
  if (section.commonMistakes?.length) {
    mistakes = `<h3>Erros comuns</h3><ul class="mistakes">${section.commonMistakes.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  }
  let trade = '';
  if (section.tradeoffs) {
    trade = `<h3>Trade-offs</h3><div class="block-text"><p>${escapeHtml(section.tradeoffs)}</p></div>`;
  }
  let challenge = '';
  if (section.miniChallenge) {
    challenge = `<h3>Mini desafio</h3><div class="callout tip"><div class="ct">Prática</div><div>${escapeHtml(section.miniChallenge)}</div></div>`;
  }
  let gloss = '';
  if (section.glossary?.length) {
    gloss = `<h3>Glossário desta seção</h3><dl class="glossary-local">${section.glossary.map((g) => `<dt>${escapeHtml(g.term)}</dt><dd>${escapeHtml(g.definition)}</dd>`).join('')}</dl>`;
  }
  const src = (section.sources || [])
    .map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a>`)
    .join('');

  const p = getProgress();
  const checked = p[state.currentKey] ? 'checked' : '';

  article.innerHTML = `
    <div class="sec-head">
      <p class="badge" style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:0.65rem;font-weight:700;text-transform:uppercase;background:var(--accent-soft);color:var(--accent);margin-bottom:8px;">${escapeHtml(mod.title)}</p>
      <h2>${escapeHtml(section.title)}</h2>
      <p class="meta">${section.estimatedMinutes ? `~${section.estimatedMinutes} min · ` : ''}Revisado: ${escapeHtml(mod.lastReviewed || '—')}</p>
      ${pre ? `<p class="meta">Pré-requisitos: ${pre}</p>` : ''}
    </div>
    <div class="objective callout info"><div class="ct">Objetivo</div><div>${escapeHtml(section.objective || '')}</div></div>
    ${blocksHtml}
    <div class="sec-extra">${mistakes}${trade}${challenge}${gloss}<h3>Fontes</h3><div class="sources">${src}</div></div>
    <div class="complete-row">
      <input type="checkbox" id="secComplete" ${checked} />
      <label for="secComplete">Marcar esta seção como estudada</label>
    </div>
  `;

  document.getElementById('secComplete')?.addEventListener('change', (e) => {
    setProgressKey(state.currentKey, e.target.checked);
  });

  highlightCodeBlocks(article);

  renderSidebar();
}

function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open');
  document.getElementById('sidebar')?.classList.remove('open');
}

function openGlossaryModal() {
  const modal = document.getElementById('modalGlossary');
  const list = document.getElementById('glossaryList');
  if (!list) return;
  const render = (filter) => {
    const f = (filter || '').toLowerCase();
    list.innerHTML = state.glossaryGlobal
      .filter((g) => !f || g.term.toLowerCase().includes(f) || g.definition.toLowerCase().includes(f))
      .map((g) => `<div><dt>${escapeHtml(g.term)}</dt><dd>${escapeHtml(g.definition)}</dd></div>`)
      .join('');
  };
  render('');
  document.getElementById('glossaryFilter').oninput = (e) => render(e.target.value);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
}

function getFlashcardsForCurrentSection() {
  if (!state.currentKey) return [];
  return state.flashcardsBySection[state.currentKey] || [];
}

function openFlashcardsModal() {
  const modal = document.getElementById('modalFlashcards');
  const cards = getFlashcardsForCurrentSection();
  document.getElementById('fcHint').textContent = state.currentKey
    ? `Seção: ${state.currentKey} · ${cards.length} card(s)`
    : 'Abra uma seção para ver flashcards.';
  document.getElementById('fcEmpty').classList.toggle('hdn', cards.length > 0);
  document.getElementById('flashcard').classList.toggle('hdn', cards.length === 0);
  state.fcIndex = 0;
  if (cards.length) showFlashcard(0);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function showFlashcard(i) {
  const cards = getFlashcardsForCurrentSection();
  if (!cards.length) return;
  const c = cards[i];
  document.getElementById('fcQuestion').textContent = c.q;
  document.getElementById('fcAnswer').textContent = c.a;
  document.getElementById('fcAnswer').classList.add('hdn');
  document.getElementById('fcReveal').classList.remove('hdn');
  document.getElementById('fcActions').classList.add('hdn');
}

document.getElementById('fcReveal')?.addEventListener('click', () => {
  document.getElementById('fcAnswer').classList.remove('hdn');
  document.getElementById('fcReveal').classList.add('hdn');
  document.getElementById('fcActions').classList.remove('hdn');
});

document.getElementById('fcNext')?.addEventListener('click', () => {
  const cards = getFlashcardsForCurrentSection();
  state.fcIndex = (state.fcIndex + 1) % cards.length;
  showFlashcard(state.fcIndex);
});

document.getElementById('fcHard')?.addEventListener('click', () => {
  const cards = getFlashcardsForCurrentSection();
  state.fcIndex = (state.fcIndex + 1) % cards.length;
  showFlashcard(state.fcIndex);
});

function openLogicModal() {
  const modal = document.getElementById('modalLogic');
  const list = document.getElementById('logicList');
  const hint = document.getElementById('logicHint');
  const exercises = state.currentKey ? state.logicBySection[state.currentKey] || [] : [];
  if (hint) {
    if (!state.currentKey) {
      hint.textContent =
        'Primeiro clique em uma seção no menu à esquerda (qualquer título de lição). Depois abra Lógica de novo.';
    } else {
      hint.textContent = `Seção: ${state.currentKey} · ${exercises.length} exercício(s) — tente resolver antes de abrir a solução.`;
    }
  }
  if (list) {
    if (!state.currentKey) {
      list.innerHTML =
        '<p class="logic-empty">Nenhuma lição selecionada. O conteúdo dos exercícios é específico de cada seção.</p>';
    } else if (!exercises.length) {
      list.innerHTML =
        '<p class="logic-empty">Não há exercícios cadastrados para esta seção (ou o arquivo logic-exercises.json não carregou). Tente outra seção ou use um servidor local (python3 -m http.server).</p>';
    } else {
      list.innerHTML = exercises
        .map((e, i) => {
          const hints =
            e.hints && e.hints.length
              ? `<details class="logic-sub"><summary>Dicas</summary><ul class="logic-hint-list">${e.hints
                  .map((h) => `<li>${escapeHtml(h)}</li>`)
                  .join('')}</ul></details>`
              : '';
          return `<details class="logic-ex"${i === 0 ? ' open' : ''}>
  <summary class="logic-sum">${escapeHtml(e.title || 'Exercício')}</summary>
  <pre class="logic-prompt"><code class="language-swift">${escapeHtml(e.prompt || '')}</code></pre>
  ${hints}
  <details class="logic-sub logic-sol-wrap"><summary>Mostrar solução</summary><pre class="logic-solution"><code class="language-swift">${escapeHtml(e.solution || '')}</code></pre></details>
</details>`;
        })
        .join('');
      highlightCodeBlocks(list);
    }
  }
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden', 'false');
}

function openQuizModal() {
  const modal = document.getElementById('modalQuiz');
  const cards = state.quizBySection[state.currentKey] || [];
  document.getElementById('quizHint').textContent = state.currentKey
    ? `Seção: ${state.currentKey}`
    : 'Abra uma seção para fazer o quiz.';
  document.getElementById('quizEmpty').classList.toggle('hdn', cards.length > 0);
  document.getElementById('quizBox').classList.toggle('hdn', cards.length === 0);
  document.getElementById('quizScore').classList.add('hdn');
  state.quizIndex = 0;
  state.quizScore = 0;
  if (cards.length) showQuizQuestion();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function showQuizQuestion() {
  const cards = state.quizBySection[state.currentKey] || [];
  const q = cards[state.quizIndex];
  if (!q) return;
  document.getElementById('quizQuestion').textContent = q.question;
  const opts = document.getElementById('quizOptions');
  opts.innerHTML = '';
  document.getElementById('quizExplanation').classList.add('hdn');
  q.options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quiz-opt';
    b.textContent = opt;
    b.addEventListener('click', () => {
      const correct = i === q.correctIndex;
      if (correct) state.quizScore += 1;
      [...opts.children].forEach((el, j) => {
        el.classList.toggle('correct', j === q.correctIndex);
        el.classList.toggle('wrong', j === i && !correct);
        el.disabled = true;
      });
      const exp = document.getElementById('quizExplanation');
      exp.textContent = q.explanation || '';
      exp.classList.remove('hdn');
    });
    opts.appendChild(b);
  });
  document.getElementById('quizNext').textContent =
    state.quizIndex < cards.length - 1 ? 'Próxima' : 'Ver resultado';
}

document.getElementById('quizNext')?.addEventListener('click', () => {
  const cards = state.quizBySection[state.currentKey] || [];
  if (state.quizIndex < cards.length - 1) {
    state.quizIndex += 1;
    showQuizQuestion();
  } else {
    document.getElementById('quizBox').classList.add('hdn');
    const s = document.getElementById('quizScore');
    s.textContent = `Pontuação: ${state.quizScore} / ${cards.length}`;
    s.classList.remove('hdn');
  }
});

/* Search */
function runSearch(q) {
  const box = document.getElementById('searchResults');
  if (!q.trim()) {
    box.hidden = true;
    return;
  }
  const low = q.toLowerCase();
  const hits = state.searchIndex.filter((e) => {
    if (e.glossary) {
      return e.term.toLowerCase().includes(low) || e.definition.toLowerCase().includes(low);
    }
    return (
      e.sectionTitle.toLowerCase().includes(low) ||
      e.moduleTitle.toLowerCase().includes(low) ||
      (e.objective && e.objective.toLowerCase().includes(low))
    );
  }).slice(0, 24);
  box.innerHTML = hits
    .map((e) => {
      if (e.glossary) {
        return `<button type="button" data-glossary="1"><strong>Glossário</strong> — ${escapeHtml(e.term)}</button>`;
      }
      return `<button type="button" data-mod="${escapeHtml(e.moduleId)}" data-sec="${escapeHtml(e.sectionId)}"><strong>${escapeHtml(e.moduleTitle)}</strong> — ${escapeHtml(e.sectionTitle)}</button>`;
    })
    .join('');
  box.hidden = hits.length === 0;
  box.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.glossary) {
        openGlossaryModal();
        document.getElementById('glossaryFilter').value = q;
        document.getElementById('glossaryFilter').dispatchEvent(new Event('input'));
      } else {
        setHash(btn.dataset.mod, btn.dataset.sec);
        showSection(btn.dataset.mod, btn.dataset.sec);
      }
      box.hidden = true;
      document.getElementById('searchInput').value = '';
    });
  });
}

async function init() {
  applyTheme(localStorage.getItem(LS_THEME) || 'dark');

  state.catalog = await fetchJson('content/catalog.json');
  state.catalog.modules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  state.glossaryGlobal = (await fetchJson('content/glossary.json')).terms || [];
  const fc = await fetchJson('content/flashcards.json');
  state.flashcardsBySection = fc.bySection || {};
  const qz = await fetchJson('content/quiz.json');
  state.quizBySection = qz.bySection || {};
  try {
    const lg = await fetchJson('content/logic-exercises.json');
    state.logicBySection = lg.bySection || {};
  } catch {
    state.logicBySection = {};
  }

  for (const m of state.catalog.modules) {
    await loadModule(m.id);
  }
  await buildSearchIndex();
  renderSidebar();

  const { moduleId, sectionId } = parseHash();
  if (moduleId && sectionId) showSection(moduleId, sectionId);

  window.addEventListener('hashchange', () => {
    const { moduleId: mid, sectionId: sid } = parseHash();
    if (mid && sid) showSection(mid, sid);
    else {
      state.currentKey = null;
      document.getElementById('welcome')?.classList.remove('hdn');
      document.getElementById('sectionArticle')?.classList.add('hdn');
      renderSidebar();
    }
  });

  document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);

  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  document.getElementById('searchInput')?.addEventListener('input', (e) => runSearch(e.target.value));
  document.getElementById('searchInput')?.addEventListener('focus', (e) => runSearch(e.target.value));

  document.getElementById('btnGlossary')?.addEventListener('click', openGlossaryModal);
  document.getElementById('btnFlashcards')?.addEventListener('click', openFlashcardsModal);
  document.getElementById('btnQuiz')?.addEventListener('click', openQuizModal);
  document.getElementById('btnLogic')?.addEventListener('click', openLogicModal);

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
  });
  document.querySelectorAll('.modal').forEach((m) => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.remove('open');
    });
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init().catch((err) => {
  console.error(err);
  document.getElementById('mainContent').innerHTML = `<p class="note">Erro ao carregar conteúdo. Use um servidor HTTP local na pasta do projeto (ex.: <code>python3 -m http.server 8080</code>) e abra http://localhost:8080</p><pre>${escapeHtml(String(err))}</pre>`;
});
