/**
 * Lubulu 日历管理模块
 * 处理日历显示、历史记录和统计数据
 */

import { getBeijingDateString } from '../utils/helpers.js';

/**
 * 日历管理类
 */
export class CalendarManager {
  constructor(container, storageManager) {
    this.container = container;
    this.storageManager = storageManager;
    this.selectedDate = null;
    
    // 使用北京时间初始化当前月份和年份
    const beijingNow = new Date();
    this.currentMonth = beijingNow.getUTCMonth();
    this.currentYear = beijingNow.getUTCFullYear();
    
    this.monthNames = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    this.onDateClick = null; // 日期点击回调
    this.init();
  }

  /**
   * 初始化日历
   */
  init() {
    this.render();
    this.bindEvents();
  }

  /**
   * 设置日期点击回调
   * @param {Function} callback - 回调函数
   */
  setDateClickHandler(callback) {
    this.onDateClick = callback;
  }

  /**
   * 渲染日历
   */
  async render() {
    const history = await this.storageManager.getHistory();
    
    this.container.innerHTML = `
      <div class="calendar-header">
        <button class="calendar-nav-btn" id="prevMonth" aria-label="上个月">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3 class="calendar-title">${this.currentYear}年 ${this.monthNames[this.currentMonth]}</h3>
        <button class="calendar-nav-btn" id="nextMonth" aria-label="下个月">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="calendar-weekdays">
        <div class="weekday">日</div>
        <div class="weekday">一</div>
        <div class="weekday">二</div>
        <div class="weekday">三</div>
        <div class="weekday">四</div>
        <div class="weekday">五</div>
        <div class="weekday">六</div>
      </div>
      <div class="calendar-days" id="calendarDays">
        ${this.generateDaysHTML(history)}
      </div>
      <div class="calendar-legend">
        <div class="legend-item">
          <span class="legend-dot success"></span>
          <span>Lu</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot failure"></span>
          <span>不Lu</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot empty"></span>
          <span>未抽取</span>
        </div>
      </div>
    `;

    this.bindCalendarEvents();
  }

  /**
   * 生成日历天数HTML
   * @param {Object} history - 历史记录
   * @returns {string} HTML字符串
   */
  generateDaysHTML(history) {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    let daysHTML = '';
    
    // 添加空白天数（上个月的尾部）
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysHTML += '<div class="calendar-day empty"></div>';
    }

    // 添加当月天数
    const today = getBeijingDateString();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(this.currentYear, this.currentMonth, day);
      const isToday = dateStr === today;
      const historyItem = history[dateStr];
      
      let statusClass = 'empty';
      let statusText = '';
      
      if (historyItem) {
        statusClass = historyItem.result === 'Lu' ? 'success' : 'failure';
        statusText = historyItem.result;
        if (historyItem.spinCount > 1) {
          statusText += ` (${historyItem.spinCount})`;
        }
      }

      daysHTML += `
        <div class="calendar-day ${isToday ? 'today' : ''} ${statusClass}" 
             data-date="${dateStr}"
             title="${statusText || '未抽取'}"
             ${historyItem || isToday ? 'data-clickable="true"' : ''}>
          <span class="day-number">${day}</span>
          <span class="day-status ${statusClass}"></span>
        </div>
      `;
    }

    return daysHTML;
  }

  /**
   * 格式化日期
   */
  formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  /**
   * 绑定日历事件
   */
  bindCalendarEvents() {
    // 导航按钮
    const prevBtn = this.container.querySelector('#prevMonth');
    const nextBtn = this.container.querySelector('#nextMonth');
    
    prevBtn?.addEventListener('click', () => this.navigateMonth(-1));
    nextBtn?.addEventListener('click', () => this.navigateMonth(1));

    // 日期点击事件
    const calendarDays = this.container.querySelector('#calendarDays');
    calendarDays?.addEventListener('click', (e) => {
      const dayElement = e.target.closest('.calendar-day[data-clickable="true"]');
      if (dayElement) {
        const date = dayElement.dataset.date;
        this.handleDateClick(date, dayElement);
      }
    });
  }

  /**
   * 绑定外部事件
   */
  bindEvents() {
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      // 日历通常不需要特殊的resize处理
    });
  }

  /**
   * 处理日期点击
   */
  handleDateClick(date, element) {
    this.selectedDate = date;
    
    // 移除之前选中的日期高亮
    this.container.querySelectorAll('.calendar-day.selected').forEach(day => {
      day.classList.remove('selected');
    });
    
    // 高亮当前选中的日期
    element.classList.add('selected');
    
    // 调用回调函数
    if (this.onDateClick) {
      this.onDateClick(date);
    }

    // 记录分析数据
  }

  /**
   * 更新日历显示（当历史记录改变时调用）
   */
  async updateDisplay() {
    await this.render();
  }

  /**
   * 高亮指定日期
   * @param {string} date - 日期字符串
   */
  highlightDate(date) {
    // 解析日期
    const [year, month, day] = date.split('-').map(Number);
    
    // 如果不在当前显示的月份，先导航到该月份
    if (year !== this.currentYear || (month - 1) !== this.currentMonth) {
      this.currentYear = year;
      this.currentMonth = month - 1;
      this.render().then(() => {
        this.highlightSpecificDay(date);
      });
    } else {
      this.highlightSpecificDay(date);
    }
  }

  /**
   * 高亮特定日期
   */
  highlightSpecificDay(date) {
    const dayElement = this.container.querySelector(`[data-date="${date}"]`);
    if (dayElement) {
      // 移除之前的高亮
      this.container.querySelectorAll('.calendar-day.highlighted').forEach(day => {
        day.classList.remove('highlighted');
      });
      
      // 添加新的高亮
      dayElement.classList.add('highlighted');
      
      // 滚动到视图中
      dayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * 获取当前显示的月份信息
   */
  getCurrentMonth() {
    return {
      year: this.currentYear,
      month: this.currentMonth,
      monthName: this.monthNames[this.currentMonth]
    };
  }

  /**
   * 跳转到今天
   */
  goToToday() {
    const today = new Date();
    this.currentYear = today.getUTCFullYear();
    this.currentMonth = today.getUTCMonth();
    this.render();
    
    // 高亮今天
    const todayStr = getBeijingDateString();
    setTimeout(() => {
      this.highlightSpecificDay(todayStr);
    }, 100);

    nextBtn?.removeEventListener('click', () => {});
    calendarDays?.removeEventListener('click', () => {});
    
    // 清理容器
    this.container.innerHTML = '';
    this.storageManager = null;
    this.onDateClick = null;
  }
}