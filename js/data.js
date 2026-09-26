/*
 * Maqsat — база возможностей.
 *
 * Правило честности (кейс финала: «не выдавайте предполагаемое за реальное»):
 *  • у каждой возможности есть ссылка на первоисточник и дата проверки;
 *  • у каждого дедлайна есть флаг exact: true — дата официально опубликована,
 *    false — ориентир по прошлому циклу (в интерфейсе помечается «ориентировочно»);
 *  • у каждого требования есть conf: 'official' (сверено с официальным сайтом)
 *    или 'secondary' (открытые источники/СМИ — в интерфейсе «уточните на сайте»).
 *  • если срок неизвестен — deadlines пустой, пользователь может задать дату сам.
 */
window.M = window.M || {};

M.VERIFIED = '2026-09-26';

/* Статус обучения. order — чтобы «переводить» профиль в следующий учебный год. */
M.STATUSES = [
  { id: 'g8', label: '8 класс', school: 8 },
  { id: 'g9', label: '9 класс', school: 9 },
  { id: 'g10', label: '10 класс', school: 10 },
  { id: 'g11', label: '11 класс', school: 11 },
  { id: 'g12', label: '12 класс (НИШ и др.)', school: 12 },
  { id: 'col1', label: 'Колледж, 1 курс', college: 1 },
  { id: 'col2', label: 'Колледж, 2+ курс', college: 2 },
  { id: 'uni', label: 'Студент вуза', uni: true },
  { id: 'grad', label: 'Выпускник / работаю', grad: true }
];

M.ENGLISH = [
  { id: 0, label: 'Почти не знаю' },
  { id: 1, label: 'A2 — базовый' },
  { id: 2, label: 'B1 — средний' },
  { id: 3, label: 'B2 — выше среднего' },
  { id: 4, label: 'C1 и выше' }
];

M.INTERESTS = [
  { id: 'abroad', label: 'Учёба за рубежом' },
  { id: 'kzgrant', label: 'Грант в Казахстане' },
  { id: 'olymp', label: 'Олимпиады и научные проекты' },
  { id: 'it', label: 'IT и программирование' },
  { id: 'summer', label: 'Летние и обменные программы' },
  { id: 'leader', label: 'Лидерство и социальные проекты' }
];

M.CITIES = [
  { id: 'astana', label: 'Астана' },
  { id: 'almaty', label: 'Алматы' },
  { id: 'other', label: 'Другой город / село' }
];

/*
 * Шаблоны шагов плана: weeks — за сколько недель до дедлайна.
 * Это рекомендуемый запас, а не правило организаторов — в интерфейсе так и написано,
 * и пользователь может сдвинуть дату любого шага.
 */
M.STEP_TEMPLATES = {
  ielts: [
    { w: 14, t: 'Начать целевую подготовку к IELTS (Reading/Listening — ежедневно по 30 мин)' },
    { w: 9, t: 'Записаться на экзамен IELTS в своём городе' },
    { w: 5, t: 'Сдать IELTS — результат должен прийти до дедлайна' }
  ],
  english: [
    { w: 10, t: 'Подтянуть разговорный английский: 3 раза в неделю по 20 минут' }
  ],
  essay: [
    { w: 6, t: 'Прочитать вопросы эссе и выписать 3–4 истории о себе' },
    { w: 4, t: 'Черновик эссе → показать учителю или наставнику' },
    { w: 1, t: 'Финальная версия эссе: проверить объём и грамматику' }
  ],
  recs: [
    { w: 5, t: 'Попросить рекомендации у 1–2 учителей (дать им 3+ недели)' }
  ],
  docs: [
    { w: 3, t: 'Собрать документы: удостоверение, табель/транскрипт, сертификаты' }
  ],
  prep: [
    { w: 12, t: 'Решать задачи прошлых лет: 3 задачи в неделю' },
    { w: 3, t: 'Пробный тур по таймеру' }
  ],
  project: [
    { w: 10, t: 'Выбрать тему и научного руководителя' },
    { w: 5, t: 'Черновик работы и результаты эксперимента' },
    { w: 1, t: 'Презентация и репетиция защиты' }
  ],
  entprep: [
    { w: 26, t: 'Пройти диагностику по предметам ЕНТ и найти слабые темы' },
    { w: 16, t: 'Пробный ЕНТ по таймеру (дальше — каждые 2 недели)' },
    { w: 4, t: 'Финальный пробный ЕНТ и повторение слабых тем' }
  ],
  video: [
    { w: 3, t: 'Записать видео-ответ (1–2 дубля, свет и звук)' }
  ],
  test: [
    { w: 2, t: 'Подготовиться к вступительному онлайн-тесту' }
  ],
  apply: [
    { w: 2, t: 'Заполнить анкету и проверить все поля' },
    { w: 0, t: 'Отправить заявку — дедлайн', deadline: true }
  ],
  // Отрицательные недели — после дедлайна (отбор идёт уже после подачи заявки)
  interview: [
    { w: -4, t: 'Подготовиться к финальному этапу отбора (формат — на сайте программы)' }
  ],
  interviewLate: [
    { w: -8, t: 'Подготовиться к собеседованию (приглашения приходят после проверки заявок)' }
  ],
  applyNow: [
    { w: 0, t: 'Подать заявку — набор открыт сейчас', deadline: true }
  ]
};

/*
 * reqConf: 'official' — сверено с официальным сайтом; 'secondary' — открытые источники/СМИ;
 *          'estimate' — наша оценка (например, уровень английского там, где организатор
 *          не называет конкретный уровень). В интерфейсе все три помечены по-разному.
 *
 * deadlines: по умолчанию — последовательные этапы (план строится к ближайшему);
 *            deadlineChoice: true — альтернативные раунды, пользователь выбирает один.
 *
 * req.age:    { min, max, at: 'YYYY-MM-DD' } — возраст на дату; at пропущен = на дату дедлайна
 * req.status: список допустимых M.STATUSES[].id (для колледжа/вуза/выпускников и абсолютных классов)
 * req.schoolRel: классы относительно выпускного: 0 — выпускной, 1 — предвыпускной и т. д.
 *               Нужно для программ вида «два последних класса школы» — в 12-летней школе это 11–12, в обычной 10–11.
 * req.gate:   дополнительный отбор, который приложение не может проверить (например, команда школы)
 * laterCondition: при каком условии «станет доступно позже» (например, поступить на нужное направление)
 * req.kz:     нужно гражданство/ВНЖ Казахстана
 * req.english:{ cefr, ielts } — минимальный уровень; ielts — нужен официальный сертификат
 * req.avg:    минимальный средний балл (из 5)
 * req.city:   очный формат только в этих городах (мягкое требование — предупреждение)
 */
M.OPPORTUNITIES = [
  {
    id: 'mlschool',
    title: 'ML School Kazakhstan',
    org: 'Astana Hub, Alem.ai Foundation, Yandex Qazaqstan',
    kind: 'Бесплатная программа',
    tags: ['it'],
    free: true,
    place: 'Астана, очно',
    summary: 'Двухгодичная программа по машинному обучению и ИИ. До 35 участников в первом потоке, обучение бесплатное, занятия 2–3 раза в неделю.',
    req: {
      status: ['col2', 'uni', 'grad'],
      city: ['astana'],
      note: { text: 'Для студентов и специалистов IT-, математических и технических направлений с высоким уровнем подготовки.', conf: 'official' }
    },
    reqConf: { status: 'official', city: 'official' },
    selection: 'Онлайн-тест по математике и программированию → очное собеседование. Оценивают линейную алгебру, алгоритмы, статистику и матанализ.',
    laterCondition: 'если поступишь на IT-, математическое или техническое направление',
    deadlines: [{ label: 'Приём заявок', date: '2026-10-08', exact: true }],
    steps: ['test', 'applyNow'],
    source: { url: 'https://astanahub.com/en/article/astana-hub-alem-ai-foundation-i-yandex-qazaqstan-zapuskaiut-ml-school-kazakhstan', name: 'Astana Hub, 21.09.2026' }
  },
  {
    id: 'yygs',
    title: 'Yale Young Global Scholars',
    org: 'Yale University',
    kind: 'Летняя программа',
    tags: ['summer', 'abroad', 'leader'],
    free: false,
    aid: 'Нуждающимся — финансовая помощь до 100% стоимости обучения, для всех стран; перелёт не покрывается.',
    place: 'США, очно (июнь–июль 2027)',
    summary: 'Двухнедельная академическая программа Йеля для старшеклассников со всего мира. Стоимость обучения — $7 500, есть финансовая помощь и освобождение от сбора за заявку.',
    req: {
      age: { min: 16, max: 18, at: '2027-07-18' },
      schoolRel: [1, 2],
      english: { cefr: 3 },
      note: { text: 'Официально: «sophomore или junior» (или эквивалент) и готовность к интенсивной учёбе на английском. Для 12-летних школ уточните эквивалент на сайте.', conf: 'official' }
    },
    reqConf: { age: 'official', status: 'secondary', english: 'estimate' },
    selection: 'Онлайн-анкета, эссе, раздел финансовой помощи.',
    deadlines: [
      { label: 'Early Action', date: '2026-10-15', exact: true },
      { label: 'Regular Decision', date: '2027-01-06', exact: true }
    ],
    deadlineChoice: true, // это альтернативные раунды: можно выбрать любой
    steps: ['english', 'essay', 'recs', 'apply'],
    source: { url: 'https://globalscholars.yale.edu/application-deadlines', name: 'globalscholars.yale.edu' }
  },
  {
    id: 'uwc',
    title: 'UWC через национальный комитет Казахстана',
    org: 'United World Colleges',
    kind: 'Обучение за рубежом (IB)',
    tags: ['abroad', 'leader'],
    free: false,
    aid: 'Более 80% учеников IBDP, отобранных национальными комитетами, получают полную или частичную финансовую поддержку.',
    place: 'Колледжи UWC по всему миру, 2 года',
    summary: 'Двухлетняя программа IB Diploma в одном из колледжей UWC. Отбор в Казахстане ведёт национальный комитет.',
    req: {
      age: { min: 16, max: 17, at: '2027-09-01' },
      schoolRel: [0, 1],
      kz: true,
      english: { cefr: 1 },
      note: { text: 'Возраст — 16–17 лет на 1 сентября года поступления; обучение в двух последних классах школы. Английский — базовый, свободное владение не требуется.', conf: 'official' }
    },
    reqConf: { age: 'official', status: 'official', kz: 'official', english: 'official' },
    selection: 'Анкета до дедлайна → первый тур → финальный отбор (в прошлом цикле — 1–15 февраля).',
    deadlines: [{ label: 'Подача заявки', date: '2027-01-05', exact: false, basis: 'в цикле 2026 дедлайн был 5 января' }],
    steps: ['essay', 'docs', 'apply', 'interview'],
    source: { url: 'https://kz.uwc.org/eligibility-criteria/', name: 'kz.uwc.org' }
  },
  {
    id: 'flex',
    title: 'FLEX — учебный год в США',
    org: 'Госдепартамент США / American Councils Kazakhstan',
    kind: 'Обменная программа',
    tags: ['abroad', 'summer', 'leader'],
    free: true,
    place: 'США, 1 учебный год в семье и школе',
    summary: 'Бесплатная для участников программа: год учёбы в американской школе с проживанием в принимающей семье. Конкурс на основе заслуг.',
    req: {
      status: ['g8', 'g9', 'g10', 'col1'],
      kz: true,
      english: { cefr: 2 },
      note: { text: 'Официально: «хорошее знание английского», возрастные рамки обновляются каждый август — проверьте их перед регистрацией.', conf: 'official' }
    },
    reqConf: { status: 'secondary', kz: 'secondary', english: 'estimate' },
    selection: 'Регистрация → несколько туров (английский, эссе, собеседование).',
    deadlines: [],
    unknownDeadline: 'Даты регистрации на сайте American Councils на 26.09.2026 не опубликованы. Укажите дату сами, когда её объявят.',
    steps: ['english', 'essay', 'apply'],
    source: { url: 'https://kazakhstan.americancouncils.org/flex-en', name: 'American Councils Kazakhstan' }
  },
  {
    id: 'samsung',
    title: 'Samsung Innovation Campus',
    org: 'Samsung Kazakhstan',
    kind: 'Бесплатные IT-курсы',
    tags: ['it'],
    free: true,
    place: 'Онлайн или очно: Алматы, Астана, Актобе, Талдыкорган',
    summary: 'Бесплатные курсы: мобильная разработка (Java), аналитика данных (Python), ИИ. От 4 месяцев, в конце — дипломный проект и сертификат Samsung.',
    req: {
      age: { min: 13, max: 25 },
      note: { text: 'У отдельных курсов могут быть свои возрастные ограничения.', conf: 'official' }
    },
    reqConf: { age: 'official' },
    selection: 'Заявка → выбор курса → тест → выбор группы.',
    deadlines: [],
    rolling: 'На 26.09.2026 идёт набор на «Мобильную разработку», «Дата аналитику» и «AI».',
    steps: ['applyNow'],
    source: { url: 'https://samsung-campus.kz/ru', name: 'samsung-campus.kz' }
  },
  {
    id: 'alem',
    title: 'alem school',
    org: 'alem',
    kind: 'Школа программирования',
    tags: ['it'],
    free: true,
    place: 'Астана, очно',
    summary: 'Школа программирования без учителей: проектное обучение и обучение друг у друга, открыта 24/7.',
    req: {
      age: { min: 16 },
      city: ['astana'],
      note: { text: 'На момент буткемпа должно быть не менее 16 лет. Отборочный буткемп — только офлайн.', conf: 'official' }
    },
    reqConf: { age: 'official', city: 'official', free: 'secondary' },
    selection: 'Регистрация → 2 онлайн-игры (3 попытки) → онлайн-встреча → проверка документов → 4-недельный отборочный буткемп.',
    deadlines: [],
    unknownDeadline: 'Следующий буткемп на сайте отмечен «скоро». В прошлый раз регистрация шла 8 декабря – 18 января.',
    steps: ['test', 'apply'],
    source: { url: 'https://alem.school/', name: 'alem.school' }
  },
  {
    id: 'rknp',
    title: 'Республиканский конкурс научных проектов',
    org: 'РНПЦ «Дарын», Министерство просвещения РК',
    kind: 'Конкурс научных проектов',
    tags: ['olymp', 'kzgrant'],
    free: true,
    place: 'Школа → район → область → финал (Астана/Караганда)',
    summary: 'Научный проект по одному из 19 направлений — от физики до лингвистики. Победители и финалисты получают дипломы, медали и ректорские гранты.',
    req: {
      status: ['g8', 'g9', 'g10', 'g11'],
      kz: true,
      note: { text: 'Участвуют ученики 8–11 классов, индивидуально или вдвоём.', conf: 'official' }
    },
    reqConf: { status: 'official', kz: 'secondary' },
    selection: 'Школьный/районный этап → областной (защита + тест по предмету) → отборочный → республиканский финал.',
    deadlines: [
      { label: 'Школьный этап', date: '2026-10-10', exact: false, basis: 'по правилам прошлых лет — первая декада октября' },
      { label: 'Республиканский финал', date: '2027-02-17', exact: false, basis: 'в 2026 году финал прошёл 17–27 февраля' }
    ],
    steps: ['project'],
    source: { url: 'https://daryn.kz/rknp-ru/', name: 'daryn.kz' }
  },
  {
    id: 'izho',
    title: 'Международная Жаутыковская олимпиада (IZhO)',
    org: 'РФМШ',
    kind: 'Олимпиада',
    tags: ['olymp'],
    free: true,
    place: 'Алматы',
    summary: 'Международная олимпиада по математике, физике и информатике. Команда — 7 участников: 3 по математике, 2 по физике, 2 по информатике.',
    req: {
      status: ['g8', 'g9', 'g10', 'g11', 'g12'],
      gate: 'Участие — через отбор в команду своей школы',
      note: { text: 'Участвуют командами от школ. Спросите у учителя, как в вашей школе проходит отбор в команду.', conf: 'official' }
    },
    reqConf: { status: 'secondary' },
    selection: 'Отбор в команду школы → два тура олимпиады в течение пяти дней.',
    deadlines: [{ label: 'Олимпиада', date: '2027-01-10', exact: false, basis: 'IZhO-2026 прошла 10–15 января' }],
    steps: ['prep'],
    source: { url: 'https://izho.kz/', name: 'izho.kz' }
  },
  {
    id: 'rise',
    title: 'Rise',
    org: 'Schmidt Futures и Rhodes Trust',
    kind: 'Глобальная программа',
    tags: ['leader', 'abroad'],
    free: true,
    place: 'Онлайн-отбор, участники со всего мира',
    summary: 'Глобальная программа для 15–17-летних. Вместо оценок — проект, видео и групповое интервью.',
    req: {
      age: { min: 15, max: 17 },
      note: { text: 'Возраст 15–17 лет. Точные правила текущего цикла — на официальном сайте.', conf: 'secondary' }
    },
    reqConf: { age: 'secondary' },
    selection: 'Анкета → видео → проект → групповое интервью.',
    deadlines: [{ label: 'Подача заявки', date: '2027-01-15', exact: false, basis: 'по открытым источникам дедлайн обычно в январе' }],
    steps: ['project', 'video', 'apply'],
    source: { url: 'https://www.risefortheworld.org/about-rise/', name: 'risefortheworld.org' }
  },
  {
    id: 'nu',
    title: 'Назарбаев Университет — бакалавриат',
    org: 'Nazarbayev University',
    kind: 'Поступление в вуз',
    tags: ['kzgrant', 'abroad'],
    free: false,
    aid: 'Сбор за подачу заявки — 10 000 ₸ (30 000 ₸ в последние две недели).',
    place: 'Астана',
    summary: 'Поступление на бакалавриат НУ: нужен сертификат IELTS/TOEFL, средний балл и вступительный экзамен.',
    req: {
      schoolRel: [0],
      status: ['col2', 'uni', 'grad'],
      english: { cefr: 3, ielts: 6.0 },
      avg: 4.0,
      note: { text: 'IELTS: общий 6.0 (Writing 6.0; Listening, Speaking, Reading — 5.5), сдаётся только очно. Средний балл — не ниже 4.0 из 5. Требования зависят от программы.', conf: 'official' }
    },
    reqConf: { status: 'official', english: 'official', avg: 'official' },
    selection: 'Онлайн-заявка → сертификат IELTS/TOEFL → вступительные испытания.',
    deadlines: [{ label: 'Приём заявок (граждане РК)', date: '2027-08-17', exact: false, basis: 'в прошлом цикле: 27 сентября – 17 августа' }],
    steps: ['ielts', 'docs', 'apply'],
    source: { url: 'https://nu.edu.kz/admissions/how-to-apply/foundation-undergraduate/regular-admissions/', name: 'nu.edu.kz' }
  },
  {
    id: 'ent',
    title: 'Государственный грант по результатам ЕНТ',
    org: 'Министерство науки и высшего образования РК',
    kind: 'Грант на обучение',
    tags: ['kzgrant'],
    free: true,
    place: 'Вузы Казахстана',
    summary: 'Бесплатное обучение в вузе. Пороговый балл даёт право участвовать в конкурсе, но не гарантирует грант — для гранта нужен результат выше порога.',
    req: {
      schoolRel: [0],
      status: ['col2', 'grad'],
      kz: true,
      note: { text: 'Пороговые баллы ЕНТ-2026: 50 — большинство вузов, 65 — национальные вузы, 70 — медицина, 75 — педагогика и право.', conf: 'secondary' }
    },
    reqConf: { status: 'secondary', kz: 'secondary' },
    selection: 'ЕНТ (основная сессия — май–июль, можно сдавать дважды) → конкурс на грант по сертификату.',
    deadlines: [{ label: 'Начало основной сессии ЕНТ', date: '2027-05-01', exact: false, basis: 'в 2026 году основная сессия — май–июль' }],
    steps: ['entprep'],
    source: { url: 'https://www.nur.kz/society/2348017-porogovye-bally-i-granty-vypusknikam-kazahstana-raskryli-informaciyu-po-ent-2026/', name: 'nur.kz' }
  },
  {
    id: 'turkiye',
    title: 'Türkiye Bursları — бакалавриат',
    org: 'Правительство Турции (YTB)',
    kind: 'Стипендия за рубежом',
    tags: ['abroad'],
    free: true,
    place: 'Турция',
    summary: 'Государственная стипендия Турции: обучение, общежитие, страховка и ежемесячная стипендия.',
    req: {
      schoolRel: [0],
      status: ['col2', 'grad'],
      age: { max: 20 },
      avg: 3.5,
      note: { text: 'По открытым источникам: младше 21 года и не менее 70% среднего балла. Точные условия — в объявлении YTB.', conf: 'secondary' }
    },
    reqConf: { status: 'secondary', age: 'secondary', avg: 'secondary' },
    selection: 'Онлайн-заявка → оценка документов → интервью (апрель–июнь) → результаты в начале августа.',
    deadlines: [{ label: 'Приём заявок', date: '2027-02-20', exact: false, basis: 'официальный календарь: 10 января – 20 февраля' }],
    steps: ['essay', 'recs', 'docs', 'apply', 'interviewLate'],
    source: { url: 'https://www.turkiyeburslari.gov.tr/calendar', name: 'turkiyeburslari.gov.tr' }
  },
  {
    id: 'hungaricum',
    title: 'Stipendium Hungaricum — бакалавриат',
    org: 'Правительство Венгрии',
    kind: 'Стипендия за рубежом',
    tags: ['abroad'],
    free: true,
    place: 'Венгрия, около 900 программ на иностранных языках',
    summary: 'Стипендия на обучение в вузах Венгрии. Казахстан — страна-партнёр программы.',
    req: {
      schoolRel: [0],
      status: ['col2', 'grad'],
      kz: true,
      note: { text: 'Требования к языку устанавливает выбранный вуз. Для граждан РК есть национальный этап — уточните порядок на сайте программы.', conf: 'secondary' }
    },
    reqConf: { status: 'secondary', kz: 'secondary' },
    selection: 'Заявка на портале → отбор вуза → номинация страны-партнёра.',
    deadlines: [{ label: 'Приём заявок', date: '2027-01-15', exact: false, basis: 'в цикле 2026/27 дедлайн был 15 января' }],
    steps: ['essay', 'docs', 'apply'],
    source: { url: 'https://stipendiumhungaricum.hu/apply/', name: 'stipendiumhungaricum.hu' }
  }
];
