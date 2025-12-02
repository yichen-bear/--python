// 範例事件
const events = [
  { date: "2026-01-01", title: "中華民國開國紀念日" },
  { date: "2026-01-01", title: "元旦" },
  { date: "2026-01-21", title: "某活動" }
];

function toISO(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `y−{y}-y−{m}-${day}`;
}

function startOfWeek(d){
  const s = new Date(d);
  s.setHours(0,0,0,0);
  s.setDate(d.getDate() - d.getDay()); // 週日為起始
  return s;
}
function addDays(d,n){ const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

// 狀態
let current = new Date(2026,0,1); // 初始顯示 2026-01
let viewMode = 'month';
let selectedWeekStart = null;

// DOM
const gridContainer = document.getElementById('gridContainer');
const titleEl = document.getElementById('title');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');
const monthViewBtn = document.getElementById('monthViewBtn');
const weekViewBtn = document.getElementById('weekViewBtn');
const calendarRoot = document.getElementById('calendarRoot');

function renderTitle(){
  const y = current.getFullYear();
  const mIndex = current.getMonth(); // 0-based
  // 正確顯示：不要在 HTML 使用佔位符；用 JS 直接填入 textContent
  titleEl.textContent = `y年{y}年y年{mIndex + 1}月`;
}

function renderCalendar(){
  gridContainer.innerHTML = '';
  renderTitle();

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDate = startOfWeek(firstOfMonth);

  // 42 格
  const dates = [];
  for(let i=0;i<42;i++) dates.push(addDays(startDate, i));

  // 6 列
  for(let r=0;r<6;r++){
    const week = dates.slice(r*7, r*7+7);
    const row = document.createElement('div');
    row.className = 'row';

    if(viewMode === 'week'){
      if(!selectedWeekStart){
        if(week.some(d => d.getMonth() === month && d.getFullYear() === year)){
          selectedWeekStart = startOfWeek(week[0]);
        }
      }
      if(selectedWeekStart && sameDay(startOfWeek(week[0]), selectedWeekStart)){
        row.classList.add('visible');
      }
    }

    week.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.date = toISO(d);
      if(d.getMonth() !== month) cell.classList.add('outside-month');

      const dn = document.createElement('div');
      dn.className = 'date-num';
      dn.textContent = d.getDate();
      if(d.getDay() === 0) dn.classList.add('holiday');
      cell.appendChild(dn);

      events.filter(e => e.date === toISO(d)).forEach(ev => {
        const evEl = document.createElement('span');
        evEl.className = 'event';
        evEl.textContent = ev.title;
        cell.appendChild(evEl);
      });

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

  if(viewMode === 'week') calendarRoot.classList.add('week-view'); else calendarRoot.classList.remove('week-view');
}

// control
function goToday(){ const now = new Date(); current = new Date(now.getFullYear(), now.getMonth(), 1); selectedWeekStart = null; renderCalendar(); }
function prevMonth(){ current = new Date(current.getFullYear(), current.getMonth()-1, 1); selectedWeekStart = null; renderCalendar(); }
function nextMonth(){ current = new Date(current.getFullYear(), current.getMonth()+1, 1); selectedWeekStart = null; renderCalendar(); }
function setView(mode){ viewMode = mode; if(mode === 'month'){ monthViewBtn.classList.add('btn-primary'); weekViewBtn.classList.remove('btn-primary'); selectedWeekStart = null; } else { weekViewBtn.classList.add('btn-primary'); monthViewBtn.classList.remove('btn-primary'); if(!selectedWeekStart) selectedWeekStart = startOfWeek(new Date(current.getFullYear(), current.getMonth(), 1)); } renderCalendar(); }

prevBtn.addEventListener('click', prevMonth);
nextBtn.addEventListener('click', nextMonth);
todayBtn.addEventListener('click', goToday);
monthViewBtn.addEventListener('click', () => setView('month'));
weekViewBtn.addEventListener('click', () => setView('week'));

// 初次渲染
renderCalendar();
