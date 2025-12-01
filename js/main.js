// 3tasks: 5秒カウント → 3分タイマー → Done → 履歴保存＆今日のカウント更新
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // 画面
  const selectScreen    = $("selectScreen");
  const countdownScreen = $("countdownScreen");
  const sprintScreen    = $("sprintScreen");
  const doneScreen      = $("doneScreen");
  const historyScreen   = $("historyScreen");

  // タブ
  const tabToday   = $("tabToday");
  const tabHistory = $("tabHistory");

  // 入力
  const task1Input = $("task1Input");
  const task2Input = $("task2Input");
  const task3Input = $("task3Input");
  const startBtn   = $("startTasksBtn");
  const taskListEl = $("taskList");

  // カウントダウン
  const countdownNumEl   = $("countdownNum");
  const countdownLabelEl = $("countdownLabel");

  // 3分タイマー
  const currentTaskLabel = $("currentTaskLabel");
  const sprintNumEl      = $("sprintNum");
  const doneBtn          = $("doneBtn");

  // 完了画面
  const doneMessageEl  = $("doneMessage");
  const rewardAmountEl = $("rewardAmount"); // 今日完了したタスク数
  const moreBtn        = $("moreBtn");
  const finishBtn      = $("finishBtn");

  // 履歴画面
  const historyListEl   = $("historyList");
  const clearHistoryBtn = $("clearHistoryBtn");

  // 音源
  const countdownAudio   = $("countdownAudio");
  const minuteMarkAudio  = $("minuteMarkAudio");
  const under1AlarmAudio = $("under1AlarmAudio");

  // 状態
  let tasks = ["", "", ""];
  let currentIndex = 0;
  let currentTaskTitle = "";
  let countdownTimerId = null;
  let sprintTimerId    = null;
  let sprintRemaining  = 0; // 秒

  // 今日のタスク完了カウント（1タスク = 1カウント）
  const HISTORY_KEY = "threeTasks_history_v1";
  const POINTS_KEY  = "threeTasks_points_v1"; // 今日の完了数

  let pointsState = {
    date: "",   // "YYYY-MM-DD"
    count: 0,   // 今日完了したタスク数
  };

  // -------------------------------------------------------------------
  // 日付ヘルパー（日本時間前提：ユーザーが日本なら localTime でOK）
  // -------------------------------------------------------------------
  function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function loadPoints() {
    const today = getTodayString();
    try {
      const raw = localStorage.getItem(POINTS_KEY);
      if (!raw) {
        pointsState = { date: today, count: 0 };
        return;
      }
      const data = JSON.parse(raw);
      if (data.date === today) {
        pointsState = { date: data.date, count: data.count ?? 0 };
      } else {
        // 日付が変わっていたらリセット
        pointsState = { date: today, count: 0 };
      }
    } catch {
      pointsState = { date: today, count: 0 };
    }
  }

  function savePoints() {
    localStorage.setItem(POINTS_KEY, JSON.stringify(pointsState));
  }

  function ensureTodayPoints() {
    const today = getTodayString();
    if (pointsState.date !== today) {
      pointsState.date = today;
      pointsState.count = 0;
    }
  }

  // -------------------------------------------------------------------
  // 履歴（半年保持）
  // -------------------------------------------------------------------
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  }

  function addHistoryEntry(taskTitle) {
    const now = new Date();
    const history = loadHistory();

    history.push({
      title: taskTitle,
      startedAt: now.toISOString(),
    });

    // 半年以上前を削除
    const HALF = 1000 * 60 * 60 * 24 * 180;
    const cutoff = now.getTime() - HALF;

    const trimmed = history.filter((h) => {
      const t = new Date(h.startedAt).getTime();
      return t >= cutoff;
    });

    saveHistory(trimmed);
  }

  function renderHistory() {
    const history = loadHistory();
    historyListEl.innerHTML = "";

    if (history.length === 0) {
      historyListEl.innerHTML = `<p class="history-empty">まだ履歴はありません。</p>`;
      return;
    }

    const sorted = [...history].sort(
      (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
    );

    const ul = document.createElement("ul");
    ul.className = "history-ul";

    sorted.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const date = new Date(item.startedAt);
      const dateStr = `${date.getFullYear()}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}/${String(date.getDate()).padStart(
        2,
        "0"
      )} ${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`;

      li.innerHTML = `
        <div class="history-title">${item.title}</div>
        <div class="history-meta">${dateStr}</div>
      `;
      ul.appendChild(li);
    });

    historyListEl.appendChild(ul);
  }

  // -------------------------------------------------------------------
  // UIヘルパー
  // -------------------------------------------------------------------
  function showOnlyScreen(target) {
    [selectScreen, countdownScreen, sprintScreen, doneScreen, historyScreen].forEach(
      (sec) => sec && sec.classList.add("hidden")
    );
    if (target) target.classList.remove("hidden");
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function clearTimers() {
    if (countdownTimerId) clearInterval(countdownTimerId);
    if (sprintTimerId) clearInterval(sprintTimerId);
    countdownTimerId = sprintTimerId = null;

    // アラーム停止
    if (under1AlarmAudio) {
      under1AlarmAudio.pause();
      under1AlarmAudio.currentTime = 0;
    }
  }

  // タスクリスト表示（画面下の "Task 1: ..." リスト）
  function renderTaskList() {
    tasks = [
      task1Input.value.trim(),
      task2Input.value.trim(),
      task3Input.value.trim(),
    ];
    taskListEl.innerHTML = "";

    const any = tasks.some((t) => t);
    if (!any) return;

    const ul = document.createElement("ul");
    ul.className = "task-list-ul";

    tasks.forEach((t, i) => {
      if (!t) return;
      const li = document.createElement("li");
      li.className = "task-item";
      li.textContent = `Task ${i + 1}: ${t}`;
      ul.appendChild(li);
    });

    taskListEl.appendChild(ul);
  }

  // -------------------------------------------------------------------
  // フロー
  // -------------------------------------------------------------------

  // Start Task 1 ボタン
  function handleStartClick() {
    tasks = [
      task1Input.value.trim(),
      task2Input.value.trim(),
      task3Input.value.trim(),
    ];

    // 3つまでに制限 → そもそも入力欄が3つなのでUI上はOK
    // ここでは「入力済みの中で一番上のタスク」からスタート
    const idx = tasks.findIndex((t) => t);
    if (idx === -1) {
      alert("タスクを1つ以上入力してね！");
      return;
    }

    currentIndex = idx;
    currentTaskTitle = tasks[currentIndex];

    // 履歴に「今日このタスクに着手した」ログを追加
    addHistoryEntry(currentTaskTitle);

    renderTaskList();
    startCountdownPhase();
  }

  // ① 5秒カウントダウン
  function startCountdownPhase() {
    clearTimers();
    showOnlyScreen(countdownScreen);

    let count = 5;
    countdownNumEl.textContent = String(count);
    countdownLabelEl.textContent = `Starting: ${currentTaskTitle}`;

    if (countdownAudio) {
      countdownAudio.currentTime = 0;
      countdownAudio.play().catch(() => {});
    }

    countdownTimerId = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownTimerId);
        countdownTimerId = null;
        startSprintPhase();
      } else {
        countdownNumEl.textContent = String(count);
      }
    }, 1000);
  }

  // ② 3分タイマー
  function startSprintPhase() {
    clearTimers();
    showOnlyScreen(sprintScreen);

    currentTaskLabel.textContent = currentTaskTitle;
    sprintRemaining = 180; // 3分
    sprintNumEl.textContent = formatTime(sprintRemaining);

    if (under1AlarmAudio) {
      under1AlarmAudio.pause();
      under1AlarmAudio.currentTime = 0;
    }

    sprintTimerId = setInterval(() => {
      sprintRemaining--;

      sprintNumEl.textContent = formatTime(sprintRemaining);

      // 2分・1分のところでマーク音
      if (sprintRemaining === 120 || sprintRemaining === 60) {
        if (minuteMarkAudio) {
          minuteMarkAudio.currentTime = 0;
          minuteMarkAudio.play().catch(() => {});
        }
      }

      // 残り59秒になった瞬間からアラームループ
      if (sprintRemaining === 59) {
        if (under1AlarmAudio) {
          under1AlarmAudio.currentTime = 0;
          under1AlarmAudio.loop = true;
          under1AlarmAudio.play().catch(() => {});
        }
      }

      if (sprintRemaining <= 0) {
        clearInterval(sprintTimerId);
        sprintTimerId = null;
        finishSprint();
      }
    }, 1000);
  }

  // ③ タスク完了（3分経過 or Doneボタン）
  function finishSprint() {
    clearTimers();
    showOnlyScreen(doneScreen);

    // 今日のカウントを1つ増やす（日本時間0時基準）
    ensureTodayPoints();
    pointsState.count += 1;
    pointsState.date = getTodayString(); // 念のため
    savePoints();

    doneMessageEl.textContent = `Good job! "${currentTaskTitle}"`;
    rewardAmountEl.textContent = String(pointsState.count);

    // 今の3つの中で、残っているタスクがあるかどうか
    const nextIndex = findNextTaskIndex(currentIndex + 1);
    if (nextIndex !== -1) {
      moreBtn.classList.remove("hidden");
    } else {
      moreBtn.classList.add("hidden");
    }
  }

  function findNextTaskIndex(fromIndex) {
    for (let i = fromIndex; i < tasks.length; i++) {
      if (tasks[i]) return i;
    }
    return -1;
  }

  // Next → 同じ「3つのうち次のタスク」に進む
  function handleMoreClick() {
    const nextIndex = findNextTaskIndex(currentIndex + 1);
    if (nextIndex === -1) {
      // 3つすべて終わった → Today画面に戻って、次の3つを自分で設定できる
      showOnlyScreen(selectScreen);
      return;
    }

    currentIndex = nextIndex;
    currentTaskTitle = tasks[currentIndex];

    addHistoryEntry(currentTaskTitle);
    startCountdownPhase();
  }

  // Finish → Today画面に戻る（まだ残っているタスクがあっても終了）
  function handleFinishClick() {
    clearTimers();
    showOnlyScreen(selectScreen);
  }

  // -------------------------------------------------------------------
  // タブ切り替え
  // -------------------------------------------------------------------
  function showTodayTab() {
    tabToday.classList.add("tab--active");
    tabHistory.classList.remove("tab--active");
    showOnlyScreen(selectScreen);
  }

  function showHistoryTab() {
    tabToday.classList.remove("tab--active");
    tabHistory.classList.add("tab--active");
    showOnlyScreen(historyScreen);
    renderHistory();
  }

  // -------------------------------------------------------------------
  // イベント登録
  // -------------------------------------------------------------------
  [task1Input, task2Input, task3Input].forEach((input) => {
    input.addEventListener("input", renderTaskList);
  });

  startBtn.addEventListener("click", handleStartClick);
  doneBtn.addEventListener("click", finishSprint);
  moreBtn.addEventListener("click", handleMoreClick);
  finishBtn.addEventListener("click", handleFinishClick);

  tabToday.addEventListener("click", showTodayTab);
  tabHistory.addEventListener("click", showHistoryTab);

  clearHistoryBtn.addEventListener("click", () => {
    if (!confirm("履歴をすべて削除しますか？")) return;
    saveHistory([]);
    renderHistory();
  });

  // -------------------------------------------------------------------
  // 初期化
  // -------------------------------------------------------------------
  loadPoints();
  rewardAmountEl.textContent = String(pointsState.count); // 「Points: X」に反映
  renderTaskList();
  showTodayTab();
  renderHistory();
});
