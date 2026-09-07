const categories = [
  { id: "work", label: "Работа или учёба", color: "var(--work)" },
  { id: "home", label: "Дом и забота о близких", color: "var(--home)" },
  { id: "road", label: "Дорога и дела вне дома", color: "var(--road)" },
  { id: "entertainment", label: "Развлечения", description: "Соцсети, игры, сериалы", color: "var(--entertainment)" },
  { id: "recovery", label: "Отдых и время для себя", description: "Прогулки, тренировки, спорт, йога, медитация, чтение и увлечения", color: "var(--recovery)" },
  { id: "unplanned", label: "Незапланированное и прочее", color: "var(--unplanned)" }
];

const state = {
  step: 0,
  wakeTime: "07:30",
  endTime: "23:30",
  unusualTimeConfirmed: false,
  minutes: Object.fromEntries(categories.map(({ id }) => [id, 0])),
  mainTask: "",
  need: "",
  feeling: ""
};

const app = document.querySelector("#app");

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDayMinutes() {
  const wake = timeToMinutes(state.wakeTime);
  let end = timeToMinutes(state.endTime);
  if (end <= wake) end += 24 * 60;
  return end - wake;
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} мин`;
  if (!minutes) return `${hours} ч`;
  return `${hours} ч ${minutes} мин`;
}

function clockOptions(selected, type) {
  const values = type === "hours"
    ? Array.from({ length: 24 }, (_, index) => index)
    : [0, 15, 30, 45];
  return values.map(value => {
    const label = String(value).padStart(2, "0");
    return `<option value="${label}" ${Number(selected) === value ? "selected" : ""}>${label}</option>`;
  }).join("");
}

function clockField(label, prefix, value) {
  const [hours, minutes] = value.split(":").map(Number);
  return `
    <fieldset class="clock-input-group">
      <legend>${label}</legend>
      <div class="clock-selects">
        <label><span class="sr-only">Часы</span><select class="time-input" id="${prefix}-hours" aria-label="${label}, часы">${clockOptions(hours, "hours")}</select></label>
        <span aria-hidden="true">:</span>
        <label><span class="sr-only">Минуты</span><select class="time-input" id="${prefix}-minutes" aria-label="${label}, минуты">${clockOptions(minutes, "minutes")}</select></label>
      </div>
    </fieldset>`;
}

function progressHeader(step) {
  const progress = (step / 5) * 100;
  return `
    <div class="step-meta"><span>Вопрос ${step} из 5</span><span>Около 2 минут</span></div>
    <div class="progress" aria-hidden="true"><div class="progress__fill" style="width:${progress}%"></div></div>
  `;
}

function actions({ back = true, nextLabel = "Дальше", nextDisabled = false } = {}) {
  return `
    <div class="actions">
      ${back ? '<button class="button button--ghost" data-action="back">Назад</button>' : '<span></span>'}
      <button class="button" data-action="next" ${nextDisabled ? "disabled" : ""}>${nextLabel}</button>
    </div>
  `;
}

function renderIntro() {
  app.innerHTML = `
    <p class="supporting">Небольшая пауза для внимательного взгляда</p>
    <h1>Куда уходит мой день?</h1>
    <p class="lead">Ответьте на пять вопросов об одном дне. Вы увидите, куда ушло время, чего вам не хватило и что можно немного изменить уже завтра.</p>
    <p class="hint">Около 2 минут. Без регистрации и оценок.</p>
    <div class="actions"><span></span><button class="button" data-action="start">Посмотреть свой день</button></div>
  `;
}

function renderDayLength() {
  const dayMinutes = getDayMinutes();
  const unusual = dayMinutes < 360 || dayMinutes > 1320;
  app.innerHTML = `
    ${progressHeader(1)}
    <h2>Сколько длился ваш день?</h2>
    <p class="hint">Укажите, во сколько вы проснулись и во сколько закончился день. Если он ещё продолжается, укажите текущее время.</p>
    <div class="time-grid">
      ${clockField("Проснулись", "wake", state.wakeTime)}
      ${clockField("Закончили день", "end", state.endTime)}
    </div>
    <div class="message message--ok">Продолжительность дня: ${formatDuration(dayMinutes)}</div>
    ${unusual ? `<div class="message">Время выглядит необычно. Проверьте его или подтвердите, что всё верно.<br><label><input id="confirm-unusual" type="checkbox" ${state.unusualTimeConfirmed ? "checked" : ""}> Всё верно</label></div>` : ""}
    ${actions({ nextDisabled: unusual && !state.unusualTimeConfirmed })}
  `;
}

function durationOptions(selected, unit) {
  const values = unit === "hours" ? Array.from({ length: 23 }, (_, index) => index) : [0, 30];
  return values.map(value => `<option value="${value}" ${value === selected ? "selected" : ""}>${unit === "hours" ? `${value} ч` : `${String(value).padStart(2, "0")} мин`}</option>`).join("");
}

function renderDistribution(message = "") {
  const dayMinutes = getDayMinutes();
  const total = Object.values(state.minutes).reduce((sum, value) => sum + value, 0);
  const difference = dayMinutes - total;
  const rows = categories.map(category => {
    const minutes = state.minutes[category.id];
    return `
      <div class="time-row">
        <label class="time-row__label" for="${category.id}-hours">
          ${category.label}
          ${category.description ? `<span class="time-row__description">${category.description}</span>` : ""}
        </label>
        <select class="duration-select" id="${category.id}-hours" data-category="${category.id}" data-unit="hours" aria-label="${category.label}, часы">
          ${durationOptions(Math.floor(minutes / 60), "hours")}
        </select>
        <select class="duration-select" data-category="${category.id}" data-unit="minutes" aria-label="${category.label}, минуты">
          ${durationOptions(minutes % 60, "minutes")}
        </select>
      </div>`;
  }).join("");

  let status = message;
  if (!status && total > dayMinutes) status = "Получилось больше, чем длился ваш день. Возможно, некоторые занятия совпали. Оставьте время в той категории, ради которой вы им занимались.";
  if (!status && difference > 30) status = `Осталось распределить ${formatDuration(difference)}.`;

  app.innerHTML = `
    ${progressHeader(2)}
    <h2>На что ушло ваше время?</h2>
    <p class="hint">Распределите время примерно. Если одно занятие подходит к нескольким категориям, выберите ту, ради которой вы им занимались.</p>
    <div class="distribution-summary"><span>Распределено</span><span>${formatDuration(total)} из ${formatDuration(dayMinutes)}</span></div>
    <div class="time-rows">${rows}</div>
    ${status ? `<div class="message">${status}${difference > 30 && total <= dayMinutes ? `<br><button class="button button--small" data-action="add-remainder">Добавить в «Незапланированное»</button>` : ""}</div>` : ""}
    ${actions({ nextDisabled: total === 0 || total > dayMinutes || difference > 30 })}
  `;
}

function renderChoiceStep({ step, title, hint = "Выберите один вариант.", name, options, selected, nextLabel }) {
  const choices = options.map(option => `
    <label class="choice">
      <input type="radio" name="${name}" value="${option.value}" ${selected === option.value ? "checked" : ""}>
      <span>${option.label}</span>
    </label>
  `).join("");
  app.innerHTML = `
    ${progressHeader(step)}
    <h2>${title}</h2>
    <p class="hint">${hint}</p>
    <div class="choice-list">${choices}</div>
    ${actions({ nextDisabled: !selected, nextLabel })}
  `;
}

const mainTaskOptions = [
  { value: "completed", label: "Да, получилось" },
  { value: "partial", label: "Получилось сделать часть" },
  { value: "notCompleted", label: "Нет, не получилось" },
  { value: "noMainTask", label: "Главного дела сегодня не было" }
];

const needOptions = [
  { value: "rest", label: "Отдыха" },
  { value: "personalTime", label: "Времени на себя" },
  { value: "communication", label: "Общения" },
  { value: "movement", label: "Движения" },
  { value: "silence", label: "Тишины" },
  { value: "result", label: "Ощущения результата" },
  { value: "enough", label: "Мне всего хватило" }
];

const feelingOptions = [
  { value: "calm", label: "Спокойно и хорошо" },
  { value: "tiredSatisfied", label: "Усталость есть, но день удался" },
  { value: "exhausted", label: "Сил почти не осталось" },
  { value: "scattered", label: "Весь день в делах, но непонятно в каких" },
  { value: "wantChange", label: "Хочется прожить этот день немного иначе" }
];

function getScenario() {
  const total = Object.values(state.minutes).reduce((sum, value) => sum + value, 0);
  const ranked = categories
    .map(category => ({ ...category, minutes: state.minutes[category.id], share: total ? state.minutes[category.id] / total : 0 }))
    .sort((a, b) => b.minutes - a.minutes);
  const [first, second] = ranked;
  const gap = first.share - second.share;

  if (first.id === "unplanned" || (first.id !== "unplanned" && state.minutes.unplanned / total >= .25 && state.feeling === "scattered")) {
    return "unplanned";
  }
  if (first.share >= .35 && gap >= .08) return first.id;
  return "balanced";
}

const scenarioCopy = {
  work: {
    title: "День, наполненный делами",
    paragraphs: ["Сегодня большая часть времени досталась работе или учёбе. Основное внимание было сосредоточено на делах."]
  },
  home: {
    title: "День заботы",
    paragraphs: [
      "Много времени сегодня ушло на дом и близких. Такие дела редко попадают в список достижений, но именно из них складываются порядок, комфорт и чувство, что о ком-то позаботились.",
      "Почему мы считаем настоящей жизнью только то время, когда создаём что-то новое, а заботу о том, что уже есть, записываем в потери? Сегодня было сделано немало. Просто у этого результата другая форма."
    ]
  },
  road: {
    title: "День в движении",
    paragraphs: ["Сегодня заметная часть дня прошла в дороге и делах вне дома. Такое время легко недооценить, хотя оно тоже требует внимания и сил."]
  },
  entertainment: {
    title: "День для развлечений",
    paragraphs: ["Сегодня заметная часть времени ушла на развлечения: соцсети, игры или сериалы."]
  },
  recovery: {
    title: "День, в котором нашлось место для вас",
    paragraphs: ["Сегодня заметная часть времени была посвящена себе: отдыху, прогулкам, тренировкам, чтению, медитации или увлечениям."]
  },
  unplanned: {
    title: "День, который пошёл своим путём",
    paragraphs: ["Сегодня многое шло не по плану. Неожиданные задачи постоянно переключали ваше внимание. К вечеру может казаться, что день прошёл, а заметного результата не осталось.", "Возможно, завтра утром вы оцените его иначе."]
  },
  balanced: {
    title: "День в хорошем ритме",
    paragraphs: ["Сегодня время распределилось между разными сторонами жизни. В нём нашлось место для дел, отдыха и личных занятий."]
  }
};

function mainTaskCopy(scenario) {
  if (state.mainTask === "completed" && scenario === "work") return "У вас была точка, к которой вы хотели прийти, и вы до неё дошли.";
  if (state.mainTask === "completed" && scenario === "balanced") return "Главное дело завершено, и сил хватило не только на него. Похоже, такой ритм вам подходит. Стоит заметить, что помогло сделать день именно таким.";
  if (state.mainTask === "partial") return "Главное дело удалось немного продвинуть. Не каждый результат обязан помещаться в один день.";
  if (state.mainTask === "notCompleted" && !["unplanned"].includes(scenario)) return "Сегодня получилось не всё, что хотелось. Один такой день ничего не говорит о вашей собранности или способностях.";
  return "";
}

const feelingCopy = {
  calm: "Похоже, этот день вам подошёл. Стоит заметить, что помогло сохранить спокойствие.",
  tiredSatisfied: "К концу дня появилась усталость, но вместе с ней осталось чувство удовлетворения.",
  exhausted: "Сейчас важнее не разбираться, а дать себе возможность восстановиться.",
  scattered: "Один такой день ничего не говорит о вашей собранности или способностях.",
  wantChange: "Не нужно менять весь распорядок. Одной небольшой перемены достаточно, чтобы завтра день ощущался иначе."
};

const recommendationCopy = {
  rest: "Заранее оставьте себе хотя бы 30 минут без работы и обязательных дел.",
  personalTime: "Оставьте завтра 20 минут для занятия, которое выберете только для себя.",
  communication: "Напишите или позвоните человеку, с которым вам спокойно и хорошо. Для разговора не обязательно ждать особого повода.",
  movement: "Добавьте короткую прогулку или несколько минут движения, чтобы размяться и переключиться.",
  silence: "Найдите 15 минут без разговоров и уведомлений.",
  result: "Выберите одно дело, которое реально завершить за день.",
  enough: "Завтра можно повторить то, что уже получилось."
};

function getRecommendation(scenario) {
  if (state.feeling === "exhausted") return "Если возможно, сократите список дел на завтра и оставьте время для отдыха.";
  if (state.feeling === "scattered" || scenario === "unplanned") return "Утром запишите срочные дела на день, чтобы не удерживать их в голове.";
  if (state.need === "enough" && state.feeling === "wantChange") return "Измените завтра только одну небольшую часть привычного дня.";
  return recommendationCopy[state.need];
}

function getCatLine(scenario) {
  if (state.feeling === "exhausted" || state.feeling === "tiredSatisfied") return "На сегодня достаточно.";
  if (state.feeling === "scattered" || scenario === "unplanned") return "У дня был свой план.";
  if (state.feeling === "wantChange") return "Завтра — немного иначе.";
  return "Со временем договорились.";
}

function renderResult() {
  const scenario = getScenario();
  const copy = scenarioCopy[scenario];
  const taskText = mainTaskCopy(scenario);
  const total = Object.values(state.minutes).reduce((sum, value) => sum + value, 0);
  const chart = categories.map(category => {
    const minutes = state.minutes[category.id];
    const percent = total ? Math.round((minutes / total) * 100) : 0;
    return `
      <div class="bar-row">
        <div class="bar-row__meta"><span class="bar-row__name">${category.label}</span><span class="bar-row__time">${formatDuration(minutes)} · ${percent}%</span></div>
        <div class="bar-row__track"><div class="bar-row__fill" style="width:${percent}%;background:${category.color}"></div></div>
      </div>`;
  }).join("");

  app.innerHTML = `
    <div class="result-intro">
      <p class="supporting">Ваш день крупным планом</p>
      <h2>Вот каким получился ваш день</h2>
    </div>
    <div class="chart" aria-label="Распределение времени">${chart}</div>
    <section class="result-section">
      <h3>${copy.title}</h3>
      ${copy.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join("")}
      ${taskText ? `<p>${taskText}</p>` : ""}
      <p>${feelingCopy[state.feeling]}</p>
    </section>
    <section class="result-section">
      <h3>${state.need === "enough" ? "Что стоит сохранить" : "Что можно попробовать завтра"}</h3>
      <p>${getRecommendation(scenario)}</p>
      <div class="cat-note"><span class="cat-note__icon" aria-hidden="true">🐈</span><span>${getCatLine(scenario)}</span></div>
    </section>
    <div class="actions"><span></span><button class="button" data-action="restart">Посмотреть ещё один день</button></div>
  `;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  if (state.step === 0) return renderIntro();
  if (state.step === 1) return renderDayLength();
  if (state.step === 2) return renderDistribution();
  if (state.step === 3) return renderChoiceStep({ step: 3, title: "Удалось ли сделать главное дело дня?", name: "mainTask", options: mainTaskOptions, selected: state.mainTask });
  if (state.step === 4) return renderChoiceStep({ step: 4, title: "Чего вам сегодня особенно не хватило?", name: "need", options: needOptions, selected: state.need });
  if (state.step === 5) return renderChoiceStep({ step: 5, title: "С каким ощущением вы заканчиваете этот день?", name: "feeling", options: feelingOptions, selected: state.feeling, nextLabel: "Посмотреть результат" });
  return renderResult();
}

app.addEventListener("change", event => {
  const target = event.target;
  if (["wake-hours", "wake-minutes", "end-hours", "end-minutes"].includes(target.id)) {
    const prefix = target.id.startsWith("wake") ? "wake" : "end";
    const hours = app.querySelector(`#${prefix}-hours`).value;
    const minutes = app.querySelector(`#${prefix}-minutes`).value;
    state[`${prefix}Time`] = `${hours}:${minutes}`;
    state.unusualTimeConfirmed = false;
    renderDayLength();
  } else if (target.id === "confirm-unusual") {
    state.unusualTimeConfirmed = target.checked;
    renderDayLength();
  } else if (target.matches("[data-category]")) {
    const id = target.dataset.category;
    const hoursInput = app.querySelector(`[data-category="${id}"][data-unit="hours"]`);
    const minutesInput = app.querySelector(`[data-category="${id}"][data-unit="minutes"]`);
    state.minutes[id] = Number(hoursInput.value) * 60 + Number(minutesInput.value);
    renderDistribution();
  } else if (target.name === "mainTask") {
    state.mainTask = target.value;
    render();
  } else if (target.name === "need") {
    state.need = target.value;
    render();
  } else if (target.name === "feeling") {
    state.feeling = target.value;
    render();
  }
});

app.addEventListener("click", event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "start") state.step = 1;
  if (action === "back") state.step = Math.max(0, state.step - 1);
  if (action === "next") state.step += 1;
  if (action === "add-remainder") {
    const remainder = getDayMinutes() - Object.values(state.minutes).reduce((sum, value) => sum + value, 0);
    state.minutes.unplanned += remainder;
  }
  if (action === "restart") {
    state.step = 1;
    state.minutes = Object.fromEntries(categories.map(({ id }) => [id, 0]));
    state.mainTask = "";
    state.need = "";
    state.feeling = "";
  }
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

render();
