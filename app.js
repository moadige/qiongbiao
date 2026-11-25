'use strict';

// 纯静态版：数据从 notices.json 读取，筛选/分页全在客户端
let allData = [];
let state = { page: 1, pageSize: 20, keyword: '', region: '', notice_type: '', total: 0 };

const $ = (sel) => document.querySelector(sel);

function fmtAmount(yuan) {
  if (yuan == null) return '';
  if (yuan >= 10000) return (yuan / 10000).toFixed(1) + ' 万';
  return yuan.toFixed(0) + ' 元';
}

// 金额展示：预算与中标金额相同时只显示一个，避免重复
function fmtMoney(n) {
  if (n.budget && n.amount && n.budget === n.amount) {
    return `<span class="amount">💰 ${fmtAmount(n.amount)}</span>`;
  }
  let html = '';
  if (n.budget) html += `<span class="amount">💰 ${fmtAmount(n.budget)}</span>`;
  if (n.amount) html += `<span class="amount">💰 ${fmtAmount(n.amount)}</span>`;
  return html;
}

function fmtDate(s) {
  if (!s) return '';
  return s.slice(0, 16);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 加载数据
async function load() {
  try {
    const resp = await fetch('notices.json');
    allData = await resp.json();
    buildStats();
    buildFilters();
    applyFilters();
  } catch (e) {
    $('#list').innerHTML = '<div class="empty">数据加载失败</div>';
  }
}

function buildStats() {
  const regions = new Set(allData.map(d => d.region).filter(Boolean));
  const winners = new Set(allData.map(d => d.winner).filter(Boolean));
  const amountSum = allData.reduce((s, d) => s + (d.amount || 0), 0);
  $('#stat-total').textContent = allData.length;
  $('#stat-regions').textContent = regions.size;
  $('#stat-winners').textContent = winners.size;
  $('#stat-amount').textContent = amountSum >= 100000000
    ? (amountSum / 100000000).toFixed(1) + ' 亿'
    : (amountSum / 10000).toFixed(0) + ' 万';
}

function buildFilters() {
  const count = (field) => {
    const m = {};
    allData.forEach(d => { const v = d[field]; if (v) m[v] = (m[v] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const rSel = $('#region');
  count('region').forEach(([v, c]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = `${v} (${c})`;
    rSel.appendChild(o);
  });
  const tSel = $('#notice-type');
  count('notice_type').forEach(([v, c]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = `${v} (${c})`;
    tSel.appendChild(o);
  });
}

function applyFilters() {
  let list = allData;
  if (state.keyword) list = list.filter(d => (d.title || '').includes(state.keyword));
  if (state.region) list = list.filter(d => d.region === state.region);
  if (state.notice_type) list = list.filter(d => d.notice_type === state.notice_type);
  state.total = list.length;
  const start = (state.page - 1) * state.pageSize;
  renderList(list.slice(start, start + state.pageSize));
  renderPager();
}

function renderList(list) {
  if (!list.length) {
    $('#list').innerHTML = '<div class="empty">暂无数据</div>';
    return;
  }
  $('#list').innerHTML = list.map(n => `
    <div class="card">
      <a class="title" href="${esc(n.detail_url)}" target="_blank" rel="noopener">${esc(n.title)}</a>
      ${n.project_name ? `<div class="pname">📋 ${esc(n.project_name)}</div>` : ''}
      <div class="tags">
        ${n.region ? `<span class="tag region">${esc(n.region)}</span>` : ''}
        ${n.notice_type ? `<span class="tag type">${esc(n.notice_type)}</span>` : ''}
        ${n.winner ? `<span class="tag winner">${esc(n.winner)}</span>` : ''}
      </div>
      <div class="meta">
        ${fmtMoney(n)}
        ${n.purchaser ? `<span>🏛 ${esc(n.purchaser)}</span>` : ''}
        <span class="time">${fmtDate(n.publish_time)}</span>
      </div>
    </div>
  `).join('');
}

function renderPager() {
  const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
  $('#pager').innerHTML = `
    <button id="prev" ${state.page <= 1 ? 'disabled' : ''}>上一页</button>
    <span class="info">${state.page} / ${totalPages} · 共 ${state.total} 条</span>
    <button id="next" ${state.page >= totalPages ? 'disabled' : ''}>下一页</button>
  `;
  $('#prev')?.addEventListener('click', () => { state.page--; applyFilters(); window.scrollTo(0, 0); });
  $('#next')?.addEventListener('click', () => { state.page++; applyFilters(); window.scrollTo(0, 0); });
}

// 搜索防抖
let timer;
$('#keyword').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.keyword = e.target.value.trim();
    state.page = 1;
    applyFilters();
  }, 200);
});

$('#region').addEventListener('change', (e) => {
  state.region = e.target.value; state.page = 1; applyFilters();
});
$('#notice-type').addEventListener('change', (e) => {
  state.notice_type = e.target.value; state.page = 1; applyFilters();
});

load();
