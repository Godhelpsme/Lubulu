/**
 * 日历组件
 */

export class Calendar {
  constructor(container, history = {}) {
    this.container = container;
    this.history = history;
    this.render();
  }

  updateHistory(history) {
    this.history = history;
    this.render();
  }

  render() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // 获取当月天数
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    let html = `
      <h3>${year}年${month + 1}月</h3>
      <div class="calendar-grid">
        <div class="weekday">日</div>
        <div class="weekday">一</div>
        <div class="weekday">二</div>
        <div class="weekday">三</div>
        <div class="weekday">四</div>
        <div class="weekday">五</div>
        <div class="weekday">六</div>
    `;

    // 空白格子
    for (let i = 0; i < startWeekday; i++) {
      html += '<div class="day empty"></div>';
    }

    // 日期格子
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = this.history[date];

      let className = 'day';
      let content = day;

      if (record) {
        className += record.result === 'lu' ? ' lu' : ' no-lu';
        if (record.isPityTriggered) {
          content += ' 🎯';
        }
      }

      // 今天
      if (day === now.getDate()) {
        className += ' today';
      }

      html += `<div class="${className}" data-date="${date}">${content}</div>`;
    }

    html += '</div>';
    this.container.innerHTML = html;
  }
}
