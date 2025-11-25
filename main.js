// 使用 defer 或在 DOMContentLoaded 執行，index.html 使用 defer 引入本檔，確保 DOM 已可用

// 範例事件資料
const events = [
  { date: "2026-01-01", title: "中華民國開國紀念日" },
  { date: "2026-01-01", title: "元旦" },
  { date: "2026-01-21", title: "某活動" }
];

// 工具：Date -> YYYY-MM-DD
function toISODate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `y−{y}-y−{m}-${day}`;
}

// 日曆狀態
let current = new Date();
current.setHours(0,0,0,0);

// 示範：初始顯示 2026-01（方便比對）
current = new Date(2026,0,1);

let viewMode = 'month'; // or 'week'
let selectedWeekStart = null;

const gridContainer = document.getElementById('gridContainer');
const titleEl = document.getElementById('title');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');
const monthViewBtn = document.getElementById('monthViewBtn');
const weekViewBtn = document.getElementById('weekViewBtn');
const calendarRoot = document.getElementById('calendarRoot');

function startOfWeek(d){
  // 以週日為一週起始
  const s = new Date(d);
  s.setHours(0,0,0,0);
  s.setDate(d.getDate() - d.getDay());
  return s;
}
function addDays(d,n){
  const r = new Date(d);
  r.setDate(r.getDate()+n);
  return r;
}
function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function renderCalendar(){
  // 清空
  gridContainer.innerHTML = '';

  const year = current.getFullYear();
  const month = current.getMonth();
  titleEl.textContent = `year年{year}年year年{month+1}月`;

  // 該月第一日
  const firstOfMonth = new Date(year, month, 1);
  const startDate = startOfWeek(firstOfMonth); // 該週的週日作為起點

  // 產生 6 × 7 = 42 個日期格
  const total = 42;
  const dates = [];
  for(let i=0;i<total;i++){
    dates.push(addDays(startDate, i));
  }

  // 分成 6 列 (每列 7 個)
  for(let r=0;r<6;r++){
    const rowDates = dates.slice(r*7, r*7+7);
    const row = document.createElement('div');
    row.className = 'row';

    // 根據 viewMode 決定是否 visible（週檢視）
    if(viewMode === 'week'){
      if(!selectedWeekStart){
        // 找到第一個包含當前月的列作為預設 selectedWeekStart
        if(rowDates.some(d => d.getMonth() === month && d.getFullYear() === year)){
          selectedWeekStart = startOfWeek(rowDates[0]);
        }
      }
      if(selectedWeekStart && sameDay(startOfWeek(rowDates[0]), selectedWeekStart)){
        row.classList.add('visible');
      } else {
        row.classList.remove('visible');
      }
    }

    // 產生每個 cell
    rowDates.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.date = toISODate(d);

      if(d.getMonth() !== month) cell.classList.add('outside-month');

      const dn = document.createElement('div');
      dn.className = 'date-num';
      dn.textContent = d.getDate();
      if(d.getDay() === 0) dn.classList.add('holiday');
      cell.appendChild(dn);

      // 加入事件（若有）
      const iso = toISODate(d);
      events.filter(e => e.date === iso).forEach(ev => {
        const evEl = document.createElement('span');
        evEl.className = 'event';
        evEl.textContent = ev.title;
        cell.appendChild(evEl);
      });

      // 點擊行為
      cell.addEventListener('click', () => {
        const clicked = new Date(cell.dataset.date);
        if(viewMode === 'week'){
          selectedWeekStart = startOfWeek(clicked);
          renderCalendar();
        } else {
          alert('點選日期：' + cell.dataset.date);
        }
      });

      row.appendChild(cell);
    });

    gridContainer.appendChild(row);
  }

  // 切換 class（供 CSS 控制週檢視）
  if(viewMode === 'week'){
    calendarRoot.classList.add('week-view');
  } else {
    calendarRoot.classList.remove('week-view');
  }
}

// 控制函式
function goToToday(){
  const now = new Date();
  current = new Date(now.getFullYear(), now.getMonth(), 1);
  selectedWeekStart = null;
  renderCalendar();
}
function prevMonth(){
  current = new Date(current.getFullYear(), current.getMonth()-1, 1);
  selectedWeekStart = null;
  renderCalendar();
}
function nextMonth(){
  current = new Date(current.getFullYear(), current.getMonth()+1, 1);
  selectedWeekStart = null;
  renderCalendar();
}
function setView(mode){
  viewMode = mode;
  if(mode === 'month'){
    monthViewBtn.classList.add('btn-primary');
    weekViewBtn.classList.remove('btn-primary');
    selectedWeekStart = null;
  } else {
    weekViewBtn.classList.add('btn-primary');
    monthViewBtn.classList.remove('btn-primary');
    if(!selectedWeekStart){
      const firstOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
      selectedWeekStart = startOfWeek(firstOfMonth);
    }
  }
  renderCalendar();
}

// 綁定事件
prevBtn.addEventListener('click', prevMonth);
nextBtn.addEventListener('click', nextMonth);
todayBtn.addEventListener('click', goToToday);
monthViewBtn.addEventListener('click', () => setView('month'));
weekViewBtn.addEventListener('click', () => setView('week'));

// 初次渲染
renderCalendar();
