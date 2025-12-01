// 3tasks - 5秒 → 90秒 → 選択 → フォーカスタイマー
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // ===== 画面 =====
  const selectScreen    = $("selectScreen");
  const countdownScreen = $("countdownScreen");
  const warmupScreen    = $("warmupScreen");
  const decisionScreen  = $("decisionScreen");
  const focusScreen     = $("focusScreen");

  // ===== 入力・ボタン =====
  const task1Input  = $("task1Input");
  const task2Input  = $("task2Input");
  const task3Input  = $("task3Input");
  const startBtn    = $("startBtn");
  const taskPreview = $("taskPreview");

  // 5秒カウント
  const countdownTaskLabel = $("countdownTaskLabel");
  const countdownNumEl     = $("countdownNum");

  // 90秒タイマー
  const warmupTaskLabel = $("warmupTaskLabel");
  const warmupTimeEl    = $("warmupTime");

  // 選択画面
  const decisionMessageEl = $("decisionMessage");
  const stopHereBtn       = $("stopHereBtn");
  const continueBtn       = $("continueBtn");
  const endBtn            = $("endBtn");

  // フォーカスタイマー
  const focusTaskLabel    = $("focusTaskLabel");
  const focusTimeEl       = $("focusTime");
  const focusStartBtn     = $("focusStartBtn");
  const focusBackBtn      = $("focusBackBtn");
  const focusDurationBtns = document.querySelectorAll(".focus-duration-btn");

  // ===== 状態 =====
  let currentTaskTitle = "";
  let countdownTimerId = null;
  let warmupTimerId    = null;
  let focusTimerId     = null;
  let warmupRemaining  = 0;
  let focusRemaining   = 0;
  let focusMinutes     = 15; // デフォルトは15分

  // ===== 共通ヘルパー =====
  function showScreen(target) {
    [selectScreen, countdownScreen, warmupScreen, decisionScreen, focusScreen]
      .forEach(sec => sec.classList.add("hidden"));
    target.classList.remove("hidden");
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function clearAllTimers() {
    if (countdownTimerId) clearInterval(countdownTimerId);
    if (warmupTimerId)    clearInterval(warmupTimerId);
    if (focusTimerId)     clearInterval(focusTimerId);
    countdownTimerId = warmupTimerId = focusTimerId = null;
  }

  // タスクプレビュー（Task 1: ○○ / Task 2: △△…って下に出すだけ）
  function updateTaskPreview() {
    const t1 = task1Input.value.trim();
    const t2 = task2Input.value.trim();
    const t3 = task3Input.value.trim();

    const text = [t1, t2, t3]
      .map((t, i) => (t ? `Task ${i + 1}: ${t}` : ""))
      .filter(Boolean)
      .join(" / ");

    taskPreview.textContent = text;
  }

  // ===== Startボタン → フロー開始 =====
  function onStartClick() {
    const t1 = task1Input.value.trim();
    const t2 = task2Input.value.trim();
    const t3 = task3Input.value.trim();

    // 「タスク1」として使うのは Task1、なければ次の入力
    currentTaskTitle = t1 || t2 || t3;

    if (!currentTaskTitle) {
      alert("タスクを1つ以上入力してね！");
      return;
    }

    updateTaskPreview();
    startCountdown();
  }

  // ===== 5秒カウントダウン =====
  function startCountdown() {
    clearAllTimers();
    showScreen(countdownScreen);

    countdownTaskLabel.textContent = `Starting: ${currentTaskTitle}`;
    let count = 5;
    countdownNumEl.textContent = String(count);

    countdownTimerId = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownTimerId);
        countdownTimerId = null;
        startWarmup();
      } else {
        countdownNumEl.textContent = String(count);
      }
    }, 1000);
  }

  // ===== 90秒カウント =====
  function startWarmup() {
    clearAllTimers();
    showScreen(warmupScreen);

    warmupTaskLabel.textContent = `"${currentTaskTitle}"`;
    warmupRemaining = 90;
    warmupTimeEl.textContent = formatTime(warmupRemaining);

    warmupTimerId = setInterval(() => {
      warmupRemaining--;
      if (warmupRemaining <= 0) {
        clearInterval(warmupTimerId);
        warmupTimerId = null;
        showDecisionScreen();
      } else {
        warmupTimeEl.textContent = formatTime(warmupRemaining);
      }
    }, 1000);
  }

  // ===== 90秒終了 → 選択画面 =====
  function showDecisionScreen() {
    clearAllTimers();
    decisionMessageEl.textContent = `Good start! "${currentTaskTitle}"`;
    showScreen(decisionScreen);
  }

  // ===== フォーカスタイマー画面 =====
  function showFocusScreen() {
    clearAllTimers();
    showScreen(focusScreen);

    focusTaskLabel.textContent = `Deep focus on "${currentTaskTitle}"`;

    // 選択中ボタン反映
    focusDurationBtns.forEach(btn => {
      const min = Number(btn.dataset.min);
      if (min === focusMinutes) {
        btn.classList.add("is-selected");
      } else {
        btn.classList.remove("is-selected");
      }
    });

    focusRemaining = focusMinutes * 60;
    focusTimeEl.textContent = formatTime(focusRemaining);
    focusStartBtn.disabled = false;
  }

  // ===== フォーカスタイマー開始 =====
  function startFocusTimer() {
    clearAllTimers();
    focusStartBtn.disabled = true; // 連打防止

    focusRemaining = focusMinutes * 60;
    focusTimeEl.textContent = formatTime(focusRemaining);

    focusTimerId = setInterval(() => {
      focusRemaining--;
      if (focusRemaining <= 0) {
        clearInterval(focusTimerId);
        focusTimerId = null;
        focusTimeEl.textContent = "0:00";
        alert("Focus time finished. Nice work!");
        backToTop();
      } else {
        focusTimeEl.textContent = formatTime(focusRemaining);
      }
    }, 1000);
  }

  // ===== トップ（タスク入力画面）に戻る =====
  function backToTop() {
    clearAllTimers();
    showScreen(selectScreen);
    // 入力値はそのまま残す
    updateTaskPreview();
  }

  // ============================
  // イベント設定
  // ============================
  [task1Input, task2Input, task3Input].forEach(input => {
    input.addEventListener("input", updateTaskPreview);
  });

  startBtn.addEventListener("click", onStartClick);

  // 「止める」：ここで終了してトップに戻る
  stopHereBtn.addEventListener("click", () => {
    backToTop();
  });

  // 「終わる」：同じく終了扱い（今はトップに戻すだけ）
  endBtn.addEventListener("click", () => {
    backToTop();
  });

  // 「続ける」 → フォーカスタイマーへ
  continueBtn.addEventListener("click", () => {
    showFocusScreen();
  });

  // フォーカスタイマー：時間選択（10 / 15 / 30 / 60）
  focusDurationBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const min = Number(btn.dataset.min);
      if (!min) return;
      focusMinutes = min;

      focusDurationBtns.forEach(b => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");

      // 未スタートなら表示も更新
      if (!focusTimerId) {
        focusRemaining = focusMinutes * 60;
        focusTimeEl.textContent = formatTime(focusRemaining);
      }
    });
  });

  // フォーカスタイマー開始
  focusStartBtn.addEventListener("click", () => {
    startFocusTimer();
  });

  // 「Back」 → 90秒後の選択画面に戻る
  focusBackBtn.addEventListener("click", () => {
    showDecisionScreen();
  });

  // 初期表示
  backToTop();
});
