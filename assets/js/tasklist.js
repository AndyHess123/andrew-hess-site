/* Task list synced with Supabase (with session passcode gate)
   Kept isolated from site.js since this page is intentionally unlinked. */
(async function () {
  "use strict";

  var SUPABASE_URL = "https://eibkpyocpajjibsbzfes.supabase.co";
  var SUPABASE_KEY = "sb_publishable_R4AhII2obt2PlCo27ReaVw_L5nD-lPt";
  var PASSCODE_STORAGE_KEY = "family-passcode";

  var createClient;
  try {
    var mod = await import("https://esm.sh/@supabase/supabase-js@2");
    createClient = mod.createClient;
  } catch (err) {
    console.error("Failed to load Supabase client:", err);
    return;
  }

  var form = document.getElementById("task-form");
  var input = document.getElementById("task-input");
  var dateInput = document.getElementById("task-date");
  var priorityInput = document.getElementById("task-priority");
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
  var modalBackdrop = document.getElementById("task-modal-backdrop");
  var modalText = document.getElementById("task-modal-text");
  var modalDate = document.getElementById("task-modal-date");
  var modalClose = document.getElementById("task-modal-close");
  var editModalBackdrop = document.getElementById("edit-modal-backdrop");
  var editForm = document.getElementById("edit-modal-form");
  var editTextInput = document.getElementById("edit-task-text");
  var editDateInput = document.getElementById("edit-task-date");
  var editPriorityInput = document.getElementById("edit-task-priority");
  var editCancelBtn = document.getElementById("edit-modal-cancel");
  var editingTaskId = null;
  var wrapNarrow = document.querySelector(".wrap-narrow");
  var taskToolbar = document.querySelector(".task-toolbar");
  var viewToggle = document.querySelector(".view-toggle");

  var filter = "all";
  var view = "list";
  var calDate = new Date();
  calDate.setDate(1);

  var supabase = null;
  var tasks = [];

  // Hide the task interface until authenticated with passcode
  form.hidden = true;
  if (taskToolbar) taskToolbar.hidden = true;
  if (viewToggle) viewToggle.hidden = true;
  if (listView) listView.hidden = true;
  if (calendarView) calendarView.hidden = true;

  // Build Passcode Gate UI
  var gate = document.createElement("div");
  gate.id = "passcode-gate";
  gate.style.marginBottom = "24px";

  var gateForm = document.createElement("form");
  gateForm.className = "task-form";

  var passInput = document.createElement("input");
  passInput.type = "password";
  passInput.name = "passcode";
  passInput.placeholder = "Enter passcode...";
  passInput.autocomplete = "current-password";
  passInput.required = true;

  var passBtn = document.createElement("button");
  passBtn.type = "submit";
  passBtn.className = "btn btn-primary";
  passBtn.textContent = "Unlock";

  var gateMsg = document.createElement("p");
  gateMsg.className = "state";
  gateMsg.style.color = "var(--accent-2)";
  gateMsg.style.marginTop = "8px";
  gateMsg.style.padding = "0";
  gateMsg.hidden = true;

  gateForm.appendChild(passInput);
  gateForm.appendChild(passBtn);
  gate.appendChild(gateForm);
  gate.appendChild(gateMsg);

  function getSavedPasscode() {
    try {
      return localStorage.getItem(PASSCODE_STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function savePasscode(code) {
    try {
      localStorage.setItem(PASSCODE_STORAGE_KEY, code);
    } catch (e) {
      /* ignore */
    }
  }

  function clearSavedPasscode() {
    try {
      localStorage.removeItem(PASSCODE_STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  var savedPasscode = getSavedPasscode();
  if (savedPasscode) {
    gate.hidden = true;
  }

  if (wrapNarrow) {
    wrapNarrow.prepend(gate);
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

  function mapRow(row, index) {
    return {
      id: String(row.id),
      text: row.title || "",
      done: Boolean(row.completed),
      date: row.due_date || "",
      priority: row.priority || "medium",
      sort_order: (row.sort_order === null || row.sort_order === undefined) ? index : Number(row.sort_order),
      created_at: row.created_at
    };
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function sortTasks(taskList) {
    taskList.sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return 0;
    });
  }

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

      var handle = document.createElement("span");
      handle.className = "drag-handle";
      handle.setAttribute("role", "button");
      handle.setAttribute("tabindex", "0");
      handle.setAttribute("aria-label", "Drag to reorder");
      handle.textContent = "\u22EE\u22EE";

      var check = document.createElement("button");
      check.type = "button";
      check.className = "task-check";
      check.setAttribute("aria-label", task.done ? "Mark as not done" : "Mark as done");
      check.textContent = task.done ? "\u2713" : "";

      var main = document.createElement("div");
      main.className = "task-main";

      var topRow = document.createElement("div");
      topRow.className = "task-top-row";

      var label = document.createElement("span");
      label.className = "task-label";
      label.textContent = task.text;
      topRow.appendChild(label);

      var badge = document.createElement("button");
      badge.type = "button";
      badge.className = "task-priority-badge priority-" + (task.priority || "medium");
      badge.dataset.action = "cycle-priority";
      badge.setAttribute("aria-label", "Cycle priority");
      badge.textContent = capitalize(task.priority || "medium");
      topRow.appendChild(badge);

      main.appendChild(topRow);

      if (task.date) {
        var dateEl = document.createElement("span");
        dateEl.className = "task-date";
        dateEl.textContent = (overdue ? "Overdue \u2014 " : "Due ") + formatDate(task.date);
        main.appendChild(dateEl);
      }

      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "task-edit";
      editBtn.setAttribute("aria-label", "Edit task");
      editBtn.textContent = "\u270E";

      var del = document.createElement("button");
      del.type = "button";
      del.className = "task-delete";
      del.setAttribute("aria-label", "Delete task");
      del.textContent = "\u2715";

      li.appendChild(handle);
      li.appendChild(check);
      li.appendChild(main);
      li.appendChild(editBtn);
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

  async function tryConnect(entered) {
    if (!entered) return false;

    passBtn.disabled = true;
    gateMsg.hidden = true;

    try {
      var client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
          headers: {
            "x-family-passcode": entered
          }
        }
      });

      var res = await client
        .from("family-tasks")
        .select("*")
        .order("completed", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (res.error) {
        throw res.error;
      }

      savePasscode(entered);
      supabase = client;
      tasks = (res.data || []).map(mapRow);
      sortTasks(tasks);

      gate.remove();
      form.hidden = false;
      if (taskToolbar) taskToolbar.hidden = false;
      if (viewToggle) viewToggle.hidden = false;
      if (listView) listView.hidden = view !== "list";
      if (calendarView) calendarView.hidden = view !== "calendar";

      render();
      return true;
    } catch (err) {
      clearSavedPasscode();
      gate.hidden = false;
      gateMsg.textContent = "Couldn't connect, check your passcode";
      gateMsg.hidden = false;
      passBtn.disabled = false;
      return false;
    }
  }

  gateForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var entered = passInput.value.trim();
    if (!entered) return;
    await tryConnect(entered);
  });

  if (savedPasscode) {
    tryConnect(savedPasscode);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || !supabase) return;

    var dueDate = dateInput.value || tomorrowISO();
    var priority = priorityInput ? priorityInput.value : "medium";
    var activeOrders = tasks.filter(function (t) { return !t.done; }).map(function (t) { return t.sort_order; });
    var nextOrder = activeOrders.length ? Math.max.apply(null, activeOrders) + 1 : 0;
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      var res = await supabase
        .from("family-tasks")
        .insert([
          {
            title: text,
            completed: false,
            due_date: dueDate || null,
            priority: priority,
            sort_order: nextOrder
          }
        ])
        .select();

      if (res.error) {
        throw res.error;
      }

      if (res.data && res.data.length > 0) {
        var newTask = mapRow(res.data[0], tasks.length);
        tasks.push(newTask);
        sortTasks(tasks);
        input.value = "";
        dateInput.value = "";
        if (priorityInput) priorityInput.value = "medium";
        render();
      }
    } catch (err) {
      console.error("Error adding task:", err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  list.addEventListener("click", async function (e) {
    var item = e.target.closest(".task-item");
    if (!item || !supabase) return;
    var id = item.dataset.id;

    if (e.target.closest(".task-check")) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;

      var prevDone = task.done;
      task.done = !prevDone;
      sortTasks(tasks);
      render();

      try {
        var res = await supabase
          .from("family-tasks")
          .update({ completed: task.done })
          .eq("id", id);

        if (res.error) {
          throw res.error;
        }
      } catch (err) {
        console.error("Failed to update task:", err);
        task.done = prevDone;
        sortTasks(tasks);
        render();
      }
    } else if (e.target.closest("[data-action='cycle-priority']")) {
      var priorityTask = tasks.find(function (t) { return t.id === id; });
      if (!priorityTask) return;

      var order = ["low", "medium", "high"];
      var prevPriority = priorityTask.priority || "medium";
      var nextPriority = order[(order.indexOf(prevPriority) + 1) % order.length];
      priorityTask.priority = nextPriority;
      render();

      try {
        var res = await supabase
          .from("family-tasks")
          .update({ priority: nextPriority })
          .eq("id", id);

        if (res.error) {
          throw res.error;
        }
      } catch (err) {
        console.error("Failed to update priority:", err);
        priorityTask.priority = prevPriority;
        render();
      }
    } else if (e.target.closest(".task-edit")) {
      var editTask = tasks.find(function (t) { return t.id === id; });
      if (editTask) openEditModal(editTask);
    } else if (e.target.closest(".task-delete")) {
      var originalTasks = tasks.slice();
      tasks = tasks.filter(function (t) { return t.id !== id; });
      render();

      try {
        var res = await supabase
          .from("family-tasks")
          .delete()
          .eq("id", id);

        if (res.error) {
          throw res.error;
        }
      } catch (err) {
        console.error("Failed to delete task:", err);
        tasks = originalTasks;
        render();
      }
    }
  });

  var dragSrcId = null;
  var draggedEl = null;
  var placeholderEl = null;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var dragItemWidth = 0;

  list.addEventListener("pointerdown", function (e) {
    var handleEl = e.target.closest(".drag-handle");
    if (!handleEl) return;
    var item = handleEl.closest(".task-item");
    if (!item) return;

    e.preventDefault();
    draggedEl = item;
    dragSrcId = item.dataset.id;

    var rect = item.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    dragItemWidth = rect.width;

    placeholderEl = document.createElement("li");
    placeholderEl.className = "task-item-placeholder";
    placeholderEl.style.height = rect.height + "px";
    item.parentNode.insertBefore(placeholderEl, item.nextSibling);

    item.classList.add("is-dragging");
    item.style.width = rect.width + "px";
    item.style.left = rect.left + "px";
    item.style.top = rect.top + "px";

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp, { once: true });
    document.addEventListener("pointercancel", onPointerUp, { once: true });
  });

  function onPointerMove(e) {
    if (!draggedEl) return;
    e.preventDefault();

    draggedEl.style.left = (e.clientX - dragOffsetX) + "px";
    draggedEl.style.top = (e.clientY - dragOffsetY) + "px";

    var prevPointerEvents = draggedEl.style.pointerEvents;
    draggedEl.style.pointerEvents = "none";
    var target = document.elementFromPoint(e.clientX, e.clientY);
    draggedEl.style.pointerEvents = prevPointerEvents;

    var overItem = target && target.closest(".task-item");
    if (!overItem || overItem === draggedEl || !list.contains(overItem)) return;

    var rect = overItem.getBoundingClientRect();
    var before = (e.clientY - rect.top) < rect.height / 2;
    if (before) {
      list.insertBefore(placeholderEl, overItem);
    } else {
      list.insertBefore(placeholderEl, overItem.nextSibling);
    }
  }

  async function onPointerUp() {
    document.removeEventListener("pointermove", onPointerMove);
    if (!draggedEl) return;

    draggedEl.classList.remove("is-dragging");
    draggedEl.style.width = "";
    draggedEl.style.left = "";
    draggedEl.style.top = "";

    if (placeholderEl) {
      placeholderEl.parentNode.insertBefore(draggedEl, placeholderEl);
      placeholderEl.remove();
      placeholderEl = null;
    }

    var orderedIds = Array.prototype.map.call(
      list.querySelectorAll(".task-item"),
      function (el) { return el.dataset.id; }
    );
    draggedEl = null;
    dragSrcId = null;

    if (!supabase) return;

    var updates = [];
    orderedIds.forEach(function (id, idx) {
      var t = tasks.find(function (x) { return x.id === id; });
      if (t && t.sort_order !== idx) {
        updates.push({ id: id, sort_order: idx });
        t.sort_order = idx;
      }
    });

    if (!updates.length) {
      sortTasks(tasks);
      render();
      return;
    }

    sortTasks(tasks);
    render();

    try {
      var results = await Promise.all(updates.map(function (u) {
        return supabase.from("family-tasks").update({ sort_order: u.sort_order }).eq("id", u.id);
      }));
      results.forEach(function (res) {
        if (res.error) throw res.error;
      });
    } catch (err) {
      console.error("Failed to persist reorder:", err);
    }
  }

  clearBtn.addEventListener("click", async function () {
    if (!supabase) return;
    var originalTasks = tasks.slice();
    tasks = tasks.filter(function (t) { return !t.done; });
    render();

    try {
      var res = await supabase
        .from("family-tasks")
        .delete()
        .eq("completed", true);

      if (res.error) {
        throw res.error;
      }
    } catch (err) {
      console.error("Failed to clear completed tasks:", err);
      tasks = originalTasks;
      render();
    }
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

  function openEditModal(task) {
    editingTaskId = task.id;
    editTextInput.value = task.text;
    editDateInput.value = task.date || "";
    editPriorityInput.value = task.priority || "medium";
    editModalBackdrop.hidden = false;
    editTextInput.focus();
  }

  function closeEditModal() {
    editModalBackdrop.hidden = true;
    editingTaskId = null;
  }

  editForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!editingTaskId || !supabase) return;

    var task = tasks.find(function (t) { return t.id === editingTaskId; });
    if (!task) return;

    var newText = editTextInput.value.trim();
    if (!newText) return;
    var newDate = editDateInput.value || null;
    var newPriority = editPriorityInput.value;

    var prev = { text: task.text, date: task.date, priority: task.priority };
    task.text = newText;
    task.date = newDate || "";
    task.priority = newPriority;
    sortTasks(tasks);
    closeEditModal();
    render();

    try {
      var res = await supabase
        .from("family-tasks")
        .update({ title: newText, due_date: newDate, priority: newPriority })
        .eq("id", editingTaskId);

      if (res.error) {
        throw res.error;
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      task.text = prev.text;
      task.date = prev.date;
      task.priority = prev.priority;
      sortTasks(tasks);
      render();
    }
  });

  editCancelBtn.addEventListener("click", closeEditModal);
  editModalBackdrop.addEventListener("click", function (e) {
    if (e.target === editModalBackdrop) closeEditModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal();
      closeEditModal();
    }
  });
})();
