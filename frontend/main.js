// main.js - 完整修正版本

// ==================== 台灣時區日期處理函數 ====================
// 台灣時區的日期處理函數
function getDateString(dayOffset) {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayOffset);
    
    // 修正：使用台灣時區 (UTC+8)
    return formatDateForAPI(targetDate);
}

// 統一使用的日期格式化函數（發送到後端）
function formatDateForAPI(date) {
  const d = new Date(date);
  // 轉換為台灣時區 (UTC+8)
  const taiwanTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
  const year = taiwanTime.getUTCFullYear();
  const month = String(taiwanTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(taiwanTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 顯示用日期格式化（前端顯示，不轉時區）
function formatDateForDisplay(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==================== 任務數據結構 ====================
// 修正：移除所有預設任務，每個用戶應該有獨立的任務列表
let tasks = []; // 初始化為空陣列

// ==================== 全局變數 ====================
let currentDate = new Date();
let currentView = 'month'; // 'month' 或 'week'
let timeTrendChart = null;
let busyChart = null;

// API 設定
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let authToken = null;
let isSubmitting = false; // 防止重複提交

// ==================== DOM 加載完成後初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 檢查登入狀態
    checkAuth();
    
    // 初始化表單日期為今天（台灣時間）
    const today = new Date();
    const todayFormatted = formatDateForAPI(today);
    document.getElementById('taskDate').value = todayFormatted;
    
    // 初始化事件監聽
    initAuthEvents();
    initViewControls();
    initTaskForm();

    // 新增：初始化全局按鈕事件
    initGlobalAuthButtons();
});

function initGlobalAuthButtons() {
    // 全局登入按鈕
    document.getElementById('globalLoginBtn').addEventListener('click', function() {
        showAuthModal();
    });
    
    // 全局登出按鈕
    document.getElementById('globalLogoutBtn').addEventListener('click', function() {
        logout();
    });
}


// ==================== 身份驗證相關函數 ====================
function checkAuth() {
  const savedToken = localStorage.getItem('calendarToken');
  const savedUser = localStorage.getItem('calendarUser');
  
  if (savedToken && savedUser) {
    authToken = savedToken;
    currentUser = JSON.parse(savedUser);
    showMainApp();
  } else {
    showAuthModal();
  }
}

function showAuthModal() {
  document.getElementById('authModal').style.display = 'block';
  document.getElementById('userInfo').classList.add('hidden');
  document.querySelector('.main-content').classList.add('hidden');
  document.querySelector('.stats').classList.add('hidden');
  document.querySelector('.view-controls').classList.add('hidden');

  if (currentUser) {
    document.getElementById('globalLoginBtn').classList.add('hidden');
    document.getElementById('globalLogoutBtn').classList.remove('hidden');
  } else {
    document.getElementById('globalLoginBtn').classList.remove('hidden');
    document.getElementById('globalLogoutBtn').classList.add('hidden');
  }
}

function showMainApp() {
  document.getElementById('authModal').style.display = 'none';
  document.getElementById('userInfo').classList.remove('hidden');
  document.querySelector('.main-content').classList.remove('hidden');
  document.querySelector('.stats').classList.remove('hidden');
  document.querySelector('.view-controls').classList.remove('hidden');
  
  document.getElementById('currentUsername').textContent = 
    `歡迎，${currentUser.username}`;
  
  // 載入當前用戶的任務（不是預設任務）
  loadTasks();
}

// 新增表單驗證函數
function validateLoginForm() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    let isValid = true;
    
    // 清除之前的錯誤訊息
    document.getElementById('authMessage').textContent = '';
    
    // 驗證電子郵件
    if (!email) {
        showFieldError('loginEmail', '請輸入電子郵件');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('loginEmail', '請輸入有效的電子郵件地址');
        isValid = false;
    } else {
        clearFieldError('loginEmail');
    }
    
    // 驗證密碼
    if (!password) {
        showFieldError('loginPassword', '請輸入密碼');
        isValid = false;
    } else {
        clearFieldError('loginPassword');
    }
    
    return isValid;
}

function validateRegisterForm() {
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    
    let isValid = true;
    
    // 清除之前的錯誤訊息
    document.getElementById('authMessage').textContent = '';
    
    // 驗證使用者名稱
    if (!username) {
        showFieldError('registerUsername', '請輸入使用者名稱');
        isValid = false;
    } else if (username.length < 3) {
        showFieldError('registerUsername', '使用者名稱至少需要3個字元');
        isValid = false;
    } else {
        clearFieldError('registerUsername');
    }
    
    // 驗證電子郵件
    if (!email) {
        showFieldError('registerEmail', '請輸入電子郵件');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('registerEmail', '請輸入有效的電子郵件地址');
        isValid = false;
    } else {
        clearFieldError('registerEmail');
    }
    
    // 驗證密碼
    if (!password) {
        showFieldError('registerPassword', '請輸入密碼');
        isValid = false;
    } else if (password.length < 6) {
        showFieldError('registerPassword', '密碼至少需要6個字元');
        isValid = false;
    } else {
        clearFieldError('registerPassword');
    }
    
    return isValid;
}

// 輔助函數：顯示欄位錯誤
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    field.style.borderColor = '#e74c3c';
    
    // 創建或更新錯誤訊息元素
    let errorElement = document.getElementById(`${fieldId}-error`);
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = `${fieldId}-error`;
        errorElement.className = 'error-message';
        field.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

// 輔助函數：清除欄位錯誤
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    field.style.borderColor = '';
    
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

// 輔助函數：驗證電子郵件格式
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function initAuthEvents() {
  // 登入表單提交事件 - 修正版本
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();  // 阻止原生表單提交
    e.stopPropagation(); // 阻止事件冒泡
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // 手動驗證必填欄位
    if (!email || !password) {
      document.getElementById('authMessage').textContent = '請填寫所有欄位';
      return;
    }
    
    await login(email, password);
  });
  
  // 註冊表單提交事件 - 修正版本
  document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();  // 阻止原生表單提交
    e.stopPropagation(); // 阻止事件冒泡
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    // 手動驗證必填欄位
    if (!username || !email || !password) {
      document.getElementById('authMessage').textContent = '請填寫所有欄位';
      return;
    }
    
    await register(username, email, password);
  });
  
  // 切換登入/註冊標籤
  document.getElementById('loginTab').addEventListener('click', function() {
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
    document.getElementById('loginForm').classList.add('active-form');
    document.getElementById('registerForm').classList.remove('active-form');
    document.getElementById('authMessage').textContent = '';
  });
  
  document.getElementById('registerTab').addEventListener('click', function() {
    document.getElementById('registerTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerForm').classList.add('active-form');
    document.getElementById('loginForm').classList.remove('active-form');
    document.getElementById('authMessage').textContent = '';
  });
  
  // 關閉模態框
  document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('authModal').style.display = 'none';
  });
  
  // 點擊模態框外部關閉
  window.addEventListener('click', function(e) {
    const modal = document.getElementById('authModal');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // 登出按鈕
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

// ==================== API 請求函數 ====================
async function apiRequest(endpoint, method = 'GET', data = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const config = {
    method,
    headers,
  };
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  try {
    console.log(`📤 發送 ${method} 請求到 ${endpoint}`, data);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const result = await response.json();
    
    console.log(`📥 收到回應:`, result);
    
    if (!response.ok) {
      throw new Error(result.message || '請求失敗');
    }
    
    return result;
  } catch (error) {
    console.error('❌ API 請求錯誤:', error);
    throw error;
  }
}

async function login(email, password) {
  try {
    const result = await apiRequest('/auth/login', 'POST', { email, password });
    
    if (result.success) {
      authToken = result.token;
      currentUser = result.user;
      
      // 保存到本地存儲
      localStorage.setItem('calendarToken', authToken);
      localStorage.setItem('calendarUser', JSON.stringify(currentUser));
      
      showMainApp();
      return true;
    }
  } catch (error) {
    document.getElementById('authMessage').textContent = error.message;
    return false;
  }
}

async function register(username, email, password) {
  try {
    const result = await apiRequest('/auth/register', 'POST', {
      username,
      email,
      password
    });
    
    if (result.success) {
      // 自動登入
      return await login(email, password);
    }
  } catch (error) {
    document.getElementById('authMessage').textContent = error.message;
    return false;
  }
}

function logout() {
  if (confirm('確定要登出嗎？')) {
    // 清除本地存儲
    localStorage.removeItem('calendarToken');
    localStorage.removeItem('calendarUser');
    localStorage.removeItem('weeklyCalendarTasks'); // 清除可能殘留的本地任務
    
    // 重置全局變數
    authToken = null;
    currentUser = null;
    tasks = []; // 清空任務數組

    // 新增：切換全局按鈕
    document.getElementById('globalLoginBtn').classList.remove('hidden');
    document.getElementById('globalLogoutBtn').classList.add('hidden');
    
    showAuthModal();
  }
}

// ==================== 任務管理函數 ====================
async function loadTasks() {
  try {
    console.log('🔄 載入任務中...');
    const result = await apiRequest('/tasks');
    
    if (result.success) {
      console.log('✅ 收到任務數據:', result.tasks);
      
      // 確保任務日期正確顯示
      tasks = result.tasks.map(task => ({
        id: task.id || task._id, // 支援兩種ID格式
        title: task.title,
        date: task.date, // 後端已經返回正確日期
        startTime: task.startTime || task.start_time,
        endTime: task.endTime || task.end_time,
        desc: task.desc || '',
        userId: task.userId || task.user_id // 確保有用戶ID
      }));
      
      console.log(`✅ 已載入用戶 ${currentUser.username} 的 ${tasks.length} 個任務`);
      
      // 更新視圖和統計
      updateView();
      updateStats();
      
      // 清除本地存儲的預設任務（如果有）
      localStorage.removeItem('weeklyCalendarTasks');
      
    } else {
      throw new Error(result.message || '載入任務失敗');
    }
  } catch (error) {
    console.error('❌ 載入任務失敗:', error);
    
    // 如果 API 失敗，使用空陣列（不載入任何預設任務）
    tasks = [];
    console.log(`⚠️ API 載入失敗，使用空任務列表`);
    updateView();
  }
}

async function addTask() {
  // 防止重複提交
  if (isSubmitting) {
    console.log('⚠️ 請求已發送，請勿重複點擊');
    return;
  }
  
  const title = document.getElementById('taskTitle').value.trim();
  const date = document.getElementById('taskDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const desc = document.getElementById('taskDesc').value.trim();
  
  // 驗證輸入
  if (!title || !date || !startTime || !endTime) {
    alert('請填寫所有必填欄位！');
    return;
  }
  
  if (startTime >= endTime) {
    alert('結束時間必須晚於開始時間！');
    return;
  }
  
  // 檢查前端是否已有相同任務
  const existingTask = tasks.find(task => 
    task.title === title &&
    task.date === date &&
    task.startTime === startTime &&
    task.endTime === endTime
  );
  
  if (existingTask) {
    alert('相同的任務已經存在！');
    return;
  }
  
  try {
    // 設置提交狀態
    isSubmitting = true;
    
    // 禁用提交按鈕
    const submitBtn = document.querySelector('#taskForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 新增中...';
      
      // 設定定時器恢復按鈕狀態（防止卡住）
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }, 5000);
    }
    
    // 確保使用正確的日期格式（台灣時間）
    const formattedDate = formatDateForAPI(new Date(date));
    
    console.log('📝 新增任務數據:', { 
      title, 
      date: formattedDate, 
      startTime, 
      endTime, 
      desc 
    });
    
    const result = await apiRequest('/tasks', 'POST', {
      title,
      date: formattedDate, // 使用格式化後的日期
      startTime,
      endTime,
      desc
    });
    
    if (result.success) {
      // 將後端返回的任務添加到前端陣列
      const newTask = {
        id: result.task.id || result.task._id,
        title: result.task.title,
        date: result.task.date,
        startTime: result.task.startTime || result.task.start_time,
        endTime: result.task.endTime || result.task.end_time,
        desc: result.task.desc || '',
        userId: result.task.userId || result.task.user_id
      };
      
      // 檢查是否已存在（防止重複）
      const alreadyExists = tasks.some(task => 
        task.id === newTask.id || 
        (task.title === newTask.title && 
         task.date === newTask.date && 
         task.startTime === newTask.startTime && 
         task.endTime === newTask.endTime)
      );
      
      if (!alreadyExists) {
        tasks.push(newTask);
        console.log('✅ 任務已添加到前端陣列:', newTask);
      } else {
        console.log('⚠️ 任務已存在，不重複添加');
      }
      
      // 清空表單
      document.getElementById('taskForm').reset();
      const today = new Date();
      const todayFormatted = formatDateForAPI(today);
      document.getElementById('taskDate').value = todayFormatted;
      
      // 更新視圖
      updateView();
      updateStats();
      
      // 顯示成功訊息
      setTimeout(() => {
        alert('✅ 任務已成功新增！');
      }, 100);
    }
  } catch (error) {
    console.error('❌ 新增任務失敗:', error);
    alert('❌ 新增任務失敗: ' + error.message);
  } finally {
    // 恢復提交狀態
    isSubmitting = false;
    
    // 恢復按鈕狀態
    const submitBtn = document.querySelector('#taskForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-plus"></i> 新增任務';
    }
  }
}

async function deleteTask(taskId) {
  if (!confirm('確定要刪除這個任務嗎？')) return;
  
  console.log('🗑️ 刪除任務 ID:', taskId);
  
  try {
    const result = await apiRequest(`/tasks/${taskId}`, 'DELETE');
    
    if (result.success) {
      // 從前端陣列中移除任務
      const initialCount = tasks.length;
      tasks = tasks.filter(task => task.id !== taskId);
      const removedCount = initialCount - tasks.length;
      
      console.log(`✅ 從前端陣列中移除了 ${removedCount} 個任務`);
      
      // 更新視圖
      updateView();
      updateStats();
      
      alert('✅ 任務已成功刪除！');
    } else {
      alert('❌ 刪除任務失敗: ' + result.message);
    }
  } catch (error) {
    console.error('❌ 刪除任務錯誤:', error);
    alert('❌ 刪除任務失敗: ' + error.message);
    
    // 如果後端刪除失敗，也嘗試從前端陣列中移除
    tasks = tasks.filter(task => task.id !== taskId);
    updateView();
  }
}

// ==================== 視圖控制函數 ====================
function initViewControls() {
  // 視圖切換按鈕
  document.getElementById('monthViewBtn').addEventListener('click', function() {
    switchView('month');
  });
  
  document.getElementById('weekViewBtn').addEventListener('click', function() {
    switchView('week');
  });
  
  // 日期導航按鈕
  document.getElementById('prevBtn').addEventListener('click', function() {
    navigateDate(-1);
  });
  
  document.getElementById('nextBtn').addEventListener('click', function() {
    navigateDate(1);
  });
  
  // 今天按鈕
  document.getElementById('todayBtn').addEventListener('click', function() {
    currentDate = new Date();
    updateView();
  });
}

function initTaskForm() {
  // 任務表單提交事件
  document.getElementById('taskForm').addEventListener('submit', function(e) {
    e.preventDefault();
    addTask();
  });
}

function switchView(view) {
  currentView = view;
  
  // 更新按鈕狀態
  document.getElementById('monthViewBtn').classList.toggle('active', view === 'month');
  document.getElementById('weekViewBtn').classList.toggle('active', view === 'week');
  
  // 切換視圖顯示
  document.getElementById('monthView').classList.toggle('hidden', view !== 'month');
  document.getElementById('weekView').classList.toggle('hidden', view !== 'week');
  
  // 切換圖表標題和顯示
  if (view === 'week') {
    document.getElementById('chartTitle').textContent = '每周工作時間趨勢';
    document.getElementById('timeTrendContainer').classList.remove('hidden');
    document.getElementById('busyChart').closest('.chart-container').classList.add('hidden');
    updateTimeTrendChart();
  } else {
    document.getElementById('chartTitle').textContent = '每月忙碌程度視覺化';
    document.getElementById('timeTrendContainer').classList.add('hidden');
    document.getElementById('busyChart').closest('.chart-container').classList.remove('hidden');
  }
  
  updateView();
}

function navigateDate(direction) {
  if (currentView === 'month') {
    currentDate.setMonth(currentDate.getMonth() + direction);
  } else {
    currentDate.setDate(currentDate.getDate() + (direction * 7));
  }
  updateView();
}

function updateView() {
  updateCurrentDateDisplay();
  
  if (currentView === 'month') {
    renderMonthView();
    updateChart();
  } else {
    renderWeekView();
    updateTimeTrendChart();
  }
  
  updateStats();
}

function updateCurrentDateDisplay() {
  const dateElement = document.getElementById('currentDate');
  
  if (currentView === 'month') {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    dateElement.textContent = `${year}年${month}月`;
  } else {
    // 計算本周的開始日期（週一）
    const weekStart = getWeekStartDate(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startMonth = weekStart.getMonth() + 1;
    const endMonth = weekEnd.getMonth() + 1;
    
    if (startMonth === endMonth) {
      dateElement.textContent = `${weekStart.getFullYear()}年${startMonth}月${weekStart.getDate()}日 - ${weekEnd.getDate()}日`;
    } else {
      dateElement.textContent = `${weekStart.getFullYear()}年${startMonth}月${weekStart.getDate()}日 - ${endMonth}月${weekEnd.getDate()}日`;
    }
  }
}

// ==================== 渲染函數 ====================
function getWeekStartDate(date) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 調整週日的情況
  return new Date(date.setDate(diff));
}

function renderMonthView() {
  const monthDaysContainer = document.getElementById('monthDays');
  monthDaysContainer.innerHTML = '';
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // 當月第一天
  const firstDay = new Date(year, month, 1);
  // 當月最後一天
  const lastDay = new Date(year, month + 1, 0);
  // 當月天數
  const daysInMonth = lastDay.getDate();
  // 第一天是星期幾（0 = 週日）
  const firstDayOfWeek = firstDay.getDay();
  
  // 上個月的天數
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  
  // 添加上個月的日期
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    const dateString = formatDateForAPI(date); // 使用格式化函數
    const dayTasks = tasks.filter(task => task.date === dateString);
    
    const dayCell = createDayCell(date, day, false, dayTasks);
    monthDaysContainer.appendChild(dayCell);
  }
  
  // 添加當月的日期
  const today = new Date();
  const todayString = formatDateForAPI(today);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = formatDateForAPI(date); // 使用格式化函數
    const dayTasks = tasks.filter(task => task.date === dateString);
    const isToday = dateString === todayString;
    
    const dayCell = createDayCell(date, day, true, dayTasks, isToday);
    monthDaysContainer.appendChild(dayCell);
  }
  
  // 添加下個月的日期
  const totalCells = 42; // 6行 * 7列
  const cellsSoFar = firstDayOfWeek + daysInMonth;
  const nextMonthDaysNeeded = totalCells - cellsSoFar;
  
  for (let day = 1; day <= nextMonthDaysNeeded; day++) {
    const date = new Date(year, month + 1, day);
    const dateString = formatDateForAPI(date); // 使用格式化函數
    const dayTasks = tasks.filter(task => task.date === dateString);
    
    const dayCell = createDayCell(date, day, false, dayTasks);
    monthDaysContainer.appendChild(dayCell);
  }
}

function createDayCell(date, dayNumber, isCurrentMonth, tasks, isToday = false) {
  const dayCell = document.createElement('div');
  dayCell.className = 'day-cell';
  
  if (!isCurrentMonth) {
    dayCell.classList.add('other-month');
  }
  
  if (isToday) {
    dayCell.classList.add('today');
  }
  
  const dateString = formatDateForAPI(date);
  const weekday = date.getDay();
  
  dayCell.innerHTML = `
    <div class="day-number">${dayNumber}</div>
    ${tasks.length > 0 ? `<div class="day-task-count">${tasks.length}</div>` : ''}
    <ul class="day-tasks">
      ${tasks.slice(0, 3).map(task => `
        <li class="day-task-item" title="${task.title} (${formatTimeRange(task.startTime, task.endTime)})">
          ${task.title}
        </li>
      `).join('')}
      ${tasks.length > 3 ? `<li class="day-task-item">還有 ${tasks.length - 3} 個任務...</li>` : ''}
    </ul>
  `;
  
  // 點擊日期跳轉到周視圖並顯示該周
  dayCell.addEventListener('click', function() {
    currentDate = new Date(date);
    switchView('week');
  });
  
  return dayCell;
}

function renderWeekView() {
  const weekCalendar = document.getElementById('weekCalendar');
  weekCalendar.innerHTML = '';
  
  const weekStart = getWeekStartDate(new Date(currentDate));
  
  // 計算一周的每一天
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    
    const dateString = formatDateForAPI(date); // 使用格式化函數
    const dayTasks = tasks.filter(task => task.date === dateString).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
    
    const weekday = date.getDay();
    const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    dayCard.id = `day-${weekday}`;
    
    dayCard.innerHTML = `
      <div class="day-header">
        <div>
          <div class="day-date">${date.getDate()}日</div>
          <div class="day-name">${weekdayNames[weekday]}</div>
        </div>
        <div class="task-count">${dayTasks.length}</div>
      </div>
      <ul class="task-list" id="task-list-${weekday}">
        ${dayTasks.length > 0 ? 
          dayTasks.map(task => `
          <li class="task-item" data-task-id="${task.id}">
            <div class="task-title">${task.title}</div>
            <div class="task-time">${formatTimeRange(task.startTime, task.endTime)}</div>
            <div class="task-duration">${calculateDuration(task.startTime, task.endTime)} 小時</div>
            <button class="delete-task" onclick="deleteTask('${task.id}')">
              <i class="fas fa-trash-alt"></i> 刪除
            </button>
          </li>
          `).join('') : 
          '<div class="empty-day">暫無任務</div>'
        }
      </ul>
    `;
    
    weekCalendar.appendChild(dayCard);
  }
  
  // 更新日曆卡片樣式
  updateWeekCardStyles();
}

function updateWeekCardStyles() {
  const weekStart = getWeekStartDate(new Date(currentDate));
  const dayCounts = [];
  
  // 計算一周每天的任務數
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateString = formatDateForAPI(date);
    const dayTasks = tasks.filter(task => task.date === dateString);
    dayCounts.push(dayTasks.length);
  }
  
  const maxTasks = Math.max(...dayCounts);
  const minTasks = Math.min(...dayCounts);
  
  // 移除所有樣式
  for (let i = 0; i < 7; i++) {
    const dayCard = document.getElementById(`day-${i}`);
    if (dayCard) {
      dayCard.classList.remove('most-busy', 'most-free');
    }
  }
  
  // 添加最忙碌和最空閒樣式
  for (let i = 0; i < 7; i++) {
    const dayCard = document.getElementById(`day-${i}`);
    if (dayCard) {
      if (dayCounts[i] === maxTasks && maxTasks > 0) {
        dayCard.classList.add('most-busy');
      }
      if (dayCounts[i] === minTasks && dayCounts[i] < maxTasks) {
        dayCard.classList.add('most-free');
      }
    }
  }
}

// ==================== 圖表函數 ====================
function updateChart() {
  const ctx = document.getElementById('busyChart').getContext('2d');
  
  // 獲取當月所有任務
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // 計算當月每天的任務數量
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const dayCounts = [];
  const dayLabels = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = formatDateForAPI(date);
    const dayTasks = tasks.filter(task => task.date === dateString);
    dayCounts.push(dayTasks.length);
    dayLabels.push(`${day}日`);
  }
  
  // 找出最忙碌和最空閒的日子
  const maxTasks = Math.max(...dayCounts);
  const minTasks = Math.min(...dayCounts);
  
  // 準備圖表數據
  const chartData = {
    labels: dayLabels,
    datasets: [{
      label: '任務數量',
      data: dayCounts,
      backgroundColor: dayCounts.map(count => {
        if (count === maxTasks && maxTasks > 0) return 'rgba(231, 76, 60, 0.7)';
        if (count === minTasks && count < maxTasks) return 'rgba(46, 204, 113, 0.7)';
        return 'rgba(52, 152, 219, 0.7)';
      }),
      borderColor: dayCounts.map(count => {
        if (count === maxTasks && maxTasks > 0) return 'rgba(231, 76, 60, 1)';
        if (count === minTasks && count < maxTasks) return 'rgba(46, 204, 113, 1)';
        return 'rgba(52, 152, 219, 1)';
      }),
      borderWidth: 1,
      borderRadius: 3
    }]
  };
  
  // 更新或創建圖表
  if (busyChart) {
    busyChart.data = chartData;
    busyChart.update();
  } else {
    busyChart = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `任務數量: ${context.raw}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
}

function updateTimeTrendChart() {
  const ctx = document.getElementById('timeTrendChart').getContext('2d');
  
  const weekStart = getWeekStartDate(new Date(currentDate));
  const dayLabels = [];
  const dayHours = [];
  const dayColors = [];
  
  // 計算一周每天的總工作時間
  let maxHours = 0;
  let minHours = Infinity;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateString = formatDateForAPI(date);
    
    const weekday = date.getDay();
    const weekdayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    dayLabels.push(`${weekdayNames[weekday]}\n${date.getDate()}日`);
    
    const dayTasks = tasks.filter(task => task.date === dateString);
    let totalHours = 0;
    
    dayTasks.forEach(task => {
      totalHours += calculateDuration(task.startTime, task.endTime);
    });
    
    dayHours.push(parseFloat(totalHours.toFixed(1)));
    
    if (totalHours > maxHours) maxHours = totalHours;
    if (totalHours < minHours) minHours = totalHours;
  }
  
  // 為每天分配顏色
  dayHours.forEach((hours, index) => {
    if (hours === maxHours && maxHours > 0) {
      dayColors.push('rgba(231, 76, 60, 0.7)');
    } else if (hours === minHours && hours < maxHours) {
      dayColors.push('rgba(46, 204, 113, 0.7)');
    } else {
      dayColors.push('rgba(52, 152, 219, 0.7)');
    }
  });
  
  // 準備圖表數據
  const chartData = {
    labels: dayLabels,
    datasets: [{
      label: '工作時數',
      data: dayHours,
      backgroundColor: dayColors,
      borderColor: dayColors.map(color => color.replace('0.7', '1')),
      borderWidth: 2,
      fill: true,
      tension: 0.3
    }]
  };
  
  // 更新或創建圖表
  if (timeTrendChart) {
    timeTrendChart.data = chartData;
    timeTrendChart.update();
  } else {
    timeTrendChart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `工作時數: ${context.raw} 小時`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: '工作時數 (小時)' }
          }
        }
      }
    });
  }
}

// ==================== 統計函數 ====================
function updateStats() {
  // 計算總任務數
  const totalTasks = tasks.length;
  
  // 計算最忙碌和最空閒的日子
  let maxTasks = 0;
  let minTasks = Infinity;
  
  if (currentView === 'month') {
    // 月視圖：計算當月
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month, day);
      if (date.getMonth() !== month) break;
      
      const dateString = formatDateForAPI(date);
      const dayTasks = tasks.filter(task => task.date === dateString);
      
      if (dayTasks.length > maxTasks) maxTasks = dayTasks.length;
      if (dayTasks.length < minTasks) minTasks = dayTasks.length;
    }
  } else {
    // 周視圖：計算當周
    const weekStart = getWeekStartDate(new Date(currentDate));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateString = formatDateForAPI(date);
      const dayTasks = tasks.filter(task => task.date === dateString);
      
      if (dayTasks.length > maxTasks) maxTasks = dayTasks.length;
      if (dayTasks.length < minTasks) minTasks = dayTasks.length;
    }
  }
  
  // 計算本周總工作時數
  let totalHours = 0;
  if (currentView === 'week') {
    const weekStart = getWeekStartDate(new Date(currentDate));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateString = formatDateForAPI(date);
      const dayTasks = tasks.filter(task => task.date === dateString);
      
      dayTasks.forEach(task => {
        totalHours += calculateDuration(task.startTime, task.endTime);
      });
    }
  }
  
  // 更新統計卡片
  document.getElementById('busiestDayCount').textContent = maxTasks;
  document.getElementById('totalTasks').textContent = totalTasks;
  document.getElementById('freeDayCount').textContent = minTasks === Infinity ? 0 : minTasks;
  document.getElementById('totalHours').textContent = totalHours.toFixed(1);
}

// ==================== 工具函數 ====================
function saveToLocalStorage() {
  // 不再自動保存任務到本地存儲，因為每個用戶的任務應該分開
  // 只保存用戶身份驗證信息
  localStorage.setItem('calendarToken', authToken);
  localStorage.setItem('calendarUser', JSON.stringify(currentUser));
}

function calculateDuration(startTime, endTime) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  // 處理跨午夜的情況
  let duration = (end - start) / (1000 * 60 * 60);
  if (duration < 0) duration += 24;
  
  return duration;
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTimeRange(startTime, endTime) {
  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? '下午' : '上午';
    const displayHours = hours % 12 || 12;
    return `${period}${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

// ==================== 全局函數導出 ====================
window.deleteTask = deleteTask;
window.formatDateForAPI = formatDateForAPI;
window.getDateString = getDateString;

console.log('✅ main.js 已載入完成 - 用戶任務隔離版本');