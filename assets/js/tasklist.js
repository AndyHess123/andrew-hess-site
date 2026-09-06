/* Simple task list — stored in localStorage, no backend.
   Kept isolated from site.js since this page is intentionally unlinked. */
(function () {
  "use strict";

  var STORAGE_KEY = "ah-tasklist";
  var form = document.getElementById("task-form");
  var input = document.getElementById("task-input");
  var dateInput = document.getElementById("task-date");
  var list = document.getElementById("task-list");
  var empty = document.getElementById("task-empty");
  var countText = document.getElementById("task-count-text");
  var clearBtn = document.getElementById("clear-done");
  var filterBtns = document.querySelectorAll(".filter-btn");
  var viewBtns = document.querySelectorAll(".view-btn");
  var listView = document.getElementById("list-view");
  var calendarView = document.getElementById("calendar-view");
  var calGrid = document.getElementById("cal-grid");
  var calTitle = document.getElementById("cal-title");
  var calPrev = document.getElementById("cal-prev");
  var calNext = document.getElementById("cal-next");

  var filter = "all";
  var view = "list";
  var calDate = new Date();
  calDate.setDate(1);

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      /* storage unavailable — task list won't persist this session */
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function tomorrowISO() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function formatDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  var tasks = load();
  // Sort soonest due date first; tasks without a date go last.
  tasks.sort(function (a, b) {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });

  function visibleTasks() {
    if (filter === "active") return tasks.filter(function (t) { return !t.done; });
    if (filter === "done") return tasks.filter(function (t) { return t.done; });
    return tasks;
  }

  function render() {
    var items = visibleTasks();
    list.innerHTML = "";

    items.forEach(function (task) {
      var li = document.createElement("li");
      var overdue = !task.done && task.date && task.date < todayISO();
      li.className = "task-item" + (task.done ? " is-done" : "") + (overdue ? " is-overdue" : "");
      li.dataset.id = task.id;

      var check = document.createElement("button");
      check.type = "button";
      check.className = "task-check";
      check.setAttribute("aria-label", task.done ? "Mark as not done" : "Mark as done");
      check.textContent = task.done ? "\u2713" : "";

      var main = document.createElement("div");
      main.className = "task-main";

      var label = document.createElement("span");
      label.className = "task-label";
      label.textContent = task.text;
      main.appendChild(label);

      if (task.date) {
        var dateEl = document.createElement("span");
        dateEl.className = "task-date";
        dateEl.textContent = (overdue ? "Overdue \u2014 " : "Due ") + formatDate(task.date);
        main.appendChild(dateEl);
      }

      var del = document.createElement("button");
      del.type = "button";
      del.className = "task-delete";
      del.setAttribute("aria-label", "Delete task");
      del.textContent = "\u2715";

      li.appendChild(check);
      li.appendChild(main);
      li.appendChild(del);
      list.appendChild(li);
    });

    empty.hidden = tasks.length > 0;
    if (tasks.length === 0) {
      list.hidden = true;
    } else {
      list.hidden = false;
    }

    var remaining = tasks.filter(function (t) { return !t.done; }).length;
    countText.textContent = remaining + " of " + tasks.length + " remaining";

    var anyDone = tasks.some(function (t) { return t.done; });
    clearBtn.hidden = !anyDone;

    renderCalendar();
  }

  function renderCalendar() {
    var year = calDate.getFullYear();
    var month = calDate.getMonth();
    calTitle.textContent = calDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    var firstDay = new Date(year, month, 1);
    var startWeekday = firstDay.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = todayISO();

    // Group tasks by ISO date for quick lookup.
    var byDate = {};
    tasks.forEach(function (t) {
      if (!t.date) return;
      (byDate[t.date] = byDate[t.date] || []).push(t);
    });

    calGrid.innerHTML = "";

    for (var i = 0; i < startWeekday; i++) {
      var pad = document.createElement("div");
      pad.className = "cal-day is-empty";
      calGrid.appendChild(pad);
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var iso = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      var cell = document.createElement("div");
      cell.className = "cal-day" + (iso === today ? " is-today" : "");

      var num = document.createElement("span");
      num.className = "cal-day-num";
      num.textContent = String(day);
      cell.appendChild(num);

      var dayTasks = byDate[iso] || [];
      var shown = dayTasks.slice(0, 3);
      shown.forEach(function (t) {
        var chip = document.createElement("span");
        chip.className = "cal-task" + (t.done ? " is-done" : "");
        chip.textContent = t.text;
        chip.tabIndex = 0;
        chip.dataset.id = t.id;
        cell.appendChild(chip);
      });
      if (dayTasks.length > shown.length) {
        var more = document.createElement("span");
        more.className = "cal-more";
        more.textContent = "+" + (dayTasks.length - shown.length) + " more";
        cell.appendChild(more);
      }

      calGrid.appendChild(cell);
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    tasks.push({ id: uid(), text: text, done: false, date: dateInput.value || tomorrowISO() });
    tasks.sort(function (a, b) {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    save(tasks);
    input.value = "";
    dateInput.value = "";
    render();
  });

  list.addEventListener("click", function (e) {
    var item = e.target.closest(".task-item");
    if (!item) return;
    var id = item.dataset.id;

    if (e.target.closest(".task-check")) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (task) task.done = !task.done;
      save(tasks);
      render();
    } else if (e.target.closest(".task-delete")) {
      tasks = tasks.filter(function (t) { return t.id !== id; });
      save(tasks);
      render();
    }
  });

  clearBtn.addEventListener("click", function () {
    tasks = tasks.filter(function (t) { return !t.done; });
    save(tasks);
    render();
  });

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      filter = btn.dataset.filter;
      render();
    });
  });

  viewBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      viewBtns.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      view = btn.dataset.view;
      listView.hidden = view !== "list";
      calendarView.hidden = view !== "calendar";
      if (view === "calendar") renderCalendar();
    });
  });

  calPrev.addEventListener("click", function () {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar();
  });

  calNext.addEventListener("click", function () {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar();
  });

  // Tap/click a calendar task chip to open a modal with the full task text
  // — works identically on touch devices, desktop, and across browsers.
  var modalBackdrop = document.getElementById("task-modal-backdrop");
  var modalText = document.getElementById("task-modal-text");
  var modalDate = document.getElementById("task-modal-date");
  var modalClose = document.getElementById("task-modal-close");

  function openModal(task) {
    modalText.textContent = task.text;
    modalDate.textContent = task.date
      ? (task.done ? "Done \u2014 " : "Due ") + formatDate(task.date)
      : (task.done ? "Done" : "No due date");
    modalBackdrop.hidden = false;
  }

  function closeModal() {
    modalBackdrop.hidden = true;
  }

  calGrid.addEventListener("click", function (e) {
    var chip = e.target.closest(".cal-task");
    if (!chip) return;
    var task = tasks.find(function (t) { return t.id === chip.dataset.id; });
    if (task) openModal(task);
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", function (e) {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  render();
})();
