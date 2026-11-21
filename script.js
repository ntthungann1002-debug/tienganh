
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const shuffle = a => [...a].sort(() => Math.random() - .5);

const escapeHtml = s =>
    String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));

// ==============================
// THỐNG KÊ VÀ LƯU TIẾN ĐỘ
// ==============================

const getStats = () => {
    try {
        return JSON.parse(localStorage.getItem('bloomStats')) || {
            answered: 0,
            correct: 0,
            stars: 0
        };
    } catch {
        return {
            answered: 0,
            correct: 0,
            stars: 0
        };
    }
};

let stats = getStats();

function save() {
    localStorage.setItem('bloomStats', JSON.stringify(stats));
    renderStats();
}

function renderStats() {
    $('#totalAnswered').textContent = stats.answered;
    $('#totalCorrect').textContent = stats.correct;
    $('#totalStars').textContent = stats.stars + ' ⭐';
    $('#flashStars').textContent = '⭐ ' + stats.stars + ' sao';
}

function mark(correct) {
    stats.answered++;

    if (correct) {
        stats.correct++;
        stats.stars++;
    }

    save();
}

// ==============================
// CHUYỂN TRANG
// ==============================

function go(page) {
    $$('.page').forEach(e =>
        e.classList.toggle('active', e.id === page)
    );

    $$('nav button').forEach(e =>
        e.classList.toggle('active', e.dataset.page === page)
    );

    $('#nav').classList.remove('open');

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    location.hash = page;
}

$$('[data-page]').forEach(b =>
    b.addEventListener('click', () => go(b.dataset.page))
);

$$('[data-go]').forEach(b =>
    b.addEventListener('click', () => go(b.dataset.go))
);

$('#mobileMenu').onclick = () =>
    $('#nav').classList.toggle('open');

// ==============================
// HIỂN THỊ LÝ THUYẾT
// ==============================

let topicIndex = 0;

function showTopic(i) {
    topicIndex = i;

    const t = TOPICS[i];

    $$('#topicNav button').forEach((b, j) =>
        b.classList.toggle('active', i === j)
    );

    $('#topicContent').innerHTML = `
        <div class="eyebrow">
            CHỦ ĐỀ ${i + 1} / ${TOPICS.length}
        </div>

        <h2>${escapeHtml(t.name)}</h2>

        <p>${escapeHtml(t.intro)}</p>

        <div style="overflow-x:auto">
            <table class="theory-table">
                <thead>
                    <tr>
                        ${t.heads.map(h => `
                            <th>${escapeHtml(h)}</th>
                        `).join('')}
                    </tr>
                </thead>

                <tbody>
                    ${t.rows.map(r => `
                        <tr>
                            ${r.map(x => `
                                <td>${escapeHtml(x)}</td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <h3>🌱 Mẹo ghi nhớ</h3>

        ${t.notes.map(n => `
            <div class="note">
                ${escapeHtml(n)}
            </div>
        `).join('')}

        <button class="primary" id="practiceTopic">
            Luyện câu hỏi chủ đề này →
        </button>
    `;

    $('#practiceTopic').onclick = () => {
        $('#quizTopic').value = t.id;
        go('quiz');
        startExercise('quiz');
    };
}

TOPICS.forEach((t, i) => {
    const b = document.createElement('button');

    b.textContent =
        `${String(i + 1).padStart(2, '0')} · ${t.name}`;

    b.onclick = () => showTopic(i);

    $('#topicNav').appendChild(b);
});

showTopic(0);

// ==============================
// DANH SÁCH CHỦ ĐỀ
// ==============================

for (const id of ['learnTopic', 'quizTopic', 'fillTopic']) {
    const el = $('#' + id);

    el.innerHTML = `
        <option value="all">
            🌸 Tất cả chủ đề
        </option>
    ` + TOPICS.map(t => `
        <option value="${t.id}">
            ${escapeHtml(t.name)}
        </option>
    `).join('');
}

// ==============================
// TRÒ CHƠI FLASHCARD
// ==============================

let cards = [];
let cardIndex = 0;
let flipped = false;
let learned = new Set();

function startCards() {
    cards = shuffle(
        FLASH.filter(x =>
            $('#learnTopic').value === 'all' ||
            x.topic === $('#learnTopic').value
        )
    );

    cardIndex = 0;
    learned = new Set();

    renderCard();
}

function renderCard() {
    if (!cards.length) return;

    flipped = false;

    $('#flashCard').classList.remove('flipped');

    $('#flashCounter').textContent =
        `Thẻ ${cardIndex + 1}/${cards.length} · Đã thuộc ${learned.size}`;

    $('#flashHint').textContent = 'CHẠM ĐỂ LẬT THẺ ✦';

    $('#flashText').textContent = cards[cardIndex].front;

    $('#knowCard').disabled = learned.has(cardIndex);
}

$('#flashCard').onclick = () => {
    flipped = !flipped;

    $('#flashCard').classList.toggle('flipped', flipped);

    $('#flashHint').textContent = flipped
        ? 'ĐÁP ÁN 🌿'
        : 'CHẠM ĐỂ LẬT THẺ ✦';

    $('#flashText').textContent = flipped
        ? cards[cardIndex].back
        : cards[cardIndex].front;
};

$('#prevCard').onclick = () => {
    cardIndex = (cardIndex - 1 + cards.length) % cards.length;
    renderCard();
};

$('#nextCard').onclick = () => {
    cardIndex = (cardIndex + 1) % cards.length;
    renderCard();
};

$('#knowCard').onclick = () => {
    if (!learned.has(cardIndex)) {
        learned.add(cardIndex);
        stats.stars++;
        save();
    }

    cardIndex = (cardIndex + 1) % cards.length;

    renderCard();
};

$('#shuffleCards').onclick = startCards;
$('#learnTopic').onchange = startCards;

startCards();

// ==============================
// TRẮC NGHIỆM VÀ ĐIỀN TỪ
// ==============================

const sessions = {};

function startExercise(kind) {
    const topic = $('#' + kind + 'Topic').value;

    const pool = shuffle(
        BANK.filter(x =>
            topic === 'all' || x.topic === topic
        )
    );

    const num = $('#' + kind + 'Count').value;

    sessions[kind] = {
        items: num === 'all'
            ? pool
            : pool.slice(0, Number(num)),
        index: 0,
        score: 0,
        answered: false,
        options: []
    };

    renderExercise(kind);
}

// ==============================
// HIỂN THỊ CÂU HỎI
// ==============================

function renderExercise(kind) {
    const s = sessions[kind];
    const el = $('#' + kind + 'Panel');

    if (s.index >= s.items.length) {
        el.innerHTML = `
            <div class="result">
                <div class="trophy">
                    ${s.score / s.items.length >= .8 ? '🏆' : '🌷'}
                </div>

                <h2>Hoàn thành rồi!</h2>

                <p>
                    Em đúng
                    <b>${s.score}/${s.items.length}</b>
                    câu
                    (${Math.round(100 * s.score / s.items.length)}%).

                    <br>

                    ${s.score === s.items.length
                        ? 'Xuất sắc! Em đã nắm rất chắc bài học.'
                        : 'Xem lại những câu sai và thử lần nữa nhé!'}
                </p>

                <button class="primary" id="again">
                    Làm lại ↻
                </button>
            </div>
        `;

        $('#again').onclick = () => startExercise(kind);
        return;
    }

    const q = s.items[s.index];

    s.answered = false;

    s.options = shuffle([
        q.correct,
        ...q.wrong.slice(0, 3)
    ]);

    el.innerHTML = `
        <div class="exercise-meta">
            <span>
                Câu ${s.index + 1} / ${s.items.length}
            </span>

            <span>
                ⭐ ${s.score} câu đúng
            </span>
        </div>

        <div class="bar">
            <div style="width:${s.index / s.items.length * 100}%"></div>
        </div>

        <div class="eyebrow">
            ${escapeHtml(
                TOPICS.find(t => t.id === q.topic)?.name || 'Ôn tập'
            )}
        </div>

        <div class="question">
            ${escapeHtml(q.q)}
        </div>

        ${kind === 'quiz'
            ? `
                <div class="options">
                    ${s.options.map((o, i) => `
                        <button class="option" data-opt="${i}">
                            <span class="letter">
                                ${'ABCD'[i]}
                            </span>

                            <span>
                                ${escapeHtml(o)}
                            </span>
                        </button>
                    `).join('')}
                </div>
            `
            : `
                <form id="fillForm">
                    <input
                        id="fillAnswer"
                        class="fill-input"
                        placeholder="Nhập từ hoặc cụm từ còn thiếu..."
                        autocomplete="off"
                        aria-label="Đáp án của em"
                        required
                    >

                    <div class="next-row">
                        <button class="primary" type="submit">
                            Kiểm tra đáp án ✓
                        </button>
                    </div>
                </form>
            `
        }

        <div id="answerFeedback"></div>
        <div id="exerciseNext" class="next-row"></div>
    `;

    if (kind === 'quiz') {
        $$('#quizPanel .option').forEach(b => {
            b.onclick = () =>
                answer(kind, s.options[Number(b.dataset.opt)]);
        });
    } else {
        $('#fillForm').onsubmit = e => {
            e.preventDefault();
            answer(kind, $('#fillAnswer').value);
        };
    }
}

// ==============================
// CHUẨN HÓA ĐÁP ÁN
// ==============================

function normalize(s) {
    return s
        .trim()
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/\s+/g, ' ');
}

// ==============================
// CÔNG THỨC NGỮ PHÁP
// ==============================

const GRAMMAR_FORMULAS = {
    tenses: [
        'Hiện tại đơn: S + V(s/es)',
        'Quá khứ đơn: S + V2/ed',
        'Tương lai đơn: S + will + V0',
        'Hiện tại tiếp diễn: S + am/is/are + V-ing',
        'Quá khứ tiếp diễn: S + was/were + V-ing',
        'Hiện tại hoàn thành: S + have/has + V3/ed'
    ],

    be: [
        'Hiện tại: S + am/is/are',
        'Quá khứ: S + was/were',
        'Tương lai: S + will be',
        'There is + danh từ số ít/không đếm được',
        'There are + danh từ số nhiều'
    ],

    modals: [
        'S + can/could/should/must + V0',
        'S + have/has to + V0',
        'S + would like + to V0',
        'S + enjoy/avoid/finish + V-ing'
    ],

    future: [
        'S + am/is/are + going to + V0',
        'S + am/is/are + not + going to + V0',
        'Am/Is/Are + S + going to + V0?'
    ],

    clauses: [
        'S + was/were + V-ing + when + S + V2',
        'While + S + was/were + V-ing, S + V2',
        'S + was/were + V-ing + while + S + was/were + V-ing'
    ],

    comparisons: [
        'Tính từ ngắn: Adj + er + than',
        'Tính từ dài: more + Adj + than',
        'So sánh nhất ngắn: the + Adj + est',
        'So sánh nhất dài: the most + Adj',
        'So sánh bằng: as + Adj + as'
    ],

    plural: [
        'Danh từ thông thường + s',
        'Danh từ tận cùng s, sh, ch, x, z + es',
        'Phụ âm + y → ies',
        'Một số danh từ f/fe → ves',
        'Danh từ bất quy tắc: học thuộc'
    ],

    quantifiers: [
        'many / a few / few + danh từ đếm được số nhiều',
        'much / a little / little + danh từ không đếm được',
        'a lot of + danh từ đếm được hoặc không đếm được'
    ],

    timewords: [
        'Since + mốc thời gian',
        'For + khoảng thời gian',
        'S + have/has + V3/ed'
    ],

    pronouns: [
        'Tính từ sở hữu + danh từ',
        'Động từ / giới từ + tân ngữ',
        'Đại từ sở hữu thay thế cụm danh từ'
    ],

    articles: [
        'a + từ bắt đầu bằng âm phụ âm',
        'an + từ bắt đầu bằng âm nguyên âm',
        'the + danh từ đã xác định'
    ],

    prepositions: [
        'S + am/is/are + giới từ + địa điểm'
    ],

    wh: [
        'Wh-word + trợ động từ + S + V0?',
        'This/That + danh từ số ít',
        'These/Those + danh từ số nhiều'
    ]
};

// ==============================
// TÌM CÔNG THỨC THEO CÂU HỎI
// ==============================

function getFormula(q) {
    // Ưu tiên công thức riêng nếu data.js có khai báo
    if (q.formula) {
        return Array.isArray(q.formula)
            ? q.formula
            : [q.formula];
    }

    const question = q.q.toLowerCase();
    const explain = q.explain.toLowerCase();
    const text = question + ' ' + explain;
    const correct = q.correct.toLowerCase();

    if (q.topic === 'tenses') {
        if (/doesn’t|doesn't|sau doesn/.test(text)) {
            return ["S + doesn't + V0"];
        }

        if (/^does$/.test(correct)) {
            return ['Does + S + V0?'];
        }

        if (/didn’t|didn't|sau didn/.test(text)) {
            return ["S + didn't + V0"];
        }

        if (/^did$/.test(correct)) {
            return ['Did + S + V0?'];
        }

        if (/hiện tại hoàn thành|have \+ v3|has \+ v3/.test(text)) {
            return ['S + have/has + V3/ed'];
        }

        if (/quá khứ tiếp diễn|was\/were \+ v-ing/.test(text)) {
            return ['S + was/were + V-ing'];
        }

        if (/hiện tại tiếp diễn|is \+ v-ing/.test(text)) {
            return ['S + am/is/are + V-ing'];
        }

        if (/tương lai đơn|will \+ v0/.test(text)) {
            return ['S + will + V0'];
        }

        if (/quá khứ đơn|yesterday|last monday|last night/.test(text)) {
            return ['S + V2/ed'];
        }

        if (/hiện tại đơn|every day|every morning/.test(text)) {
            return ['S + V(s/es)'];
        }
    }

    if (q.topic === 'be') {
        if (/there is|there are|there ___/.test(text)) {
            if (/milk|cat|book under/.test(text)) {
                return ['There is + danh từ số ít/không đếm được'];
            }

            if (/books|three/.test(text)) {
                return ['There are + danh từ số nhiều'];
            }
        }

        if (/yesterday|last night|quá khứ/.test(text)) {
            return ['S + was/were + ...'];
        }

        if (/tomorrow|tương lai/.test(text)) {
            return ['S + will be + ...'];
        }

        return ['S + am/is/are + ...'];
    }

    if (q.topic === 'modals') {
        if (/mustn’t|mustn't|forbidden/.test(text)) {
            return ["S + mustn't + V0"];
        }

        if (/don’t have to|don't have to/.test(text)) {
            return ["S + don't/doesn't have to + V0"];
        }

        if (/would like/.test(text)) {
            return ['S + would like + to V0'];
        }

        if (/enjoy|avoid|finish/.test(text)) {
            return ['S + enjoy/avoid/finish + V-ing'];
        }

        if (/has to|have to/.test(text)) {
            return ['S + have/has to + V0'];
        }

        if (/can|could|should|must/.test(text)) {
            return ['S + can/could/should/must + V0'];
        }
    }

    if (q.topic === 'future') {
        if (/câu hỏi|___ you going/.test(text)) {
            return ['Am/Is/Are + S + going to + V0?'];
        }

        if (/not going/.test(text)) {
            return ['S + am/is/are + not + going to + V0'];
        }

        return ['S + am/is/are + going to + V0'];
    }

    if (q.topic === 'clauses') {
        if (/while/.test(text)) {
            return [
                'While + S + was/were + V-ing, S + V2',
                'S + was/were + V-ing + while + S + was/were + V-ing'
            ];
        }

        return ['S + was/were + V-ing + when + S + V2'];
    }

    if (q.topic === 'comparisons') {
        if (/so sánh hơn của/.test(text)) {
            return ['Tính từ bất quy tắc: học thuộc dạng so sánh hơn'];
        }

        if (/so sánh nhất của/.test(text)) {
            return ['Tính từ bất quy tắc: học thuộc dạng so sánh nhất'];
        }

        if (/as tall|as old/.test(text)) {
            return ['as + Adj + as'];
        }

        if (/the most|most interesting/.test(text)) {
            return ['the most + Adj dài'];
        }

        if (/the ___ girl|tallest/.test(text)) {
            return ['the + Adj ngắn + est'];
        }

        if (/beautiful/.test(text)) {
            return ['more + Adj dài + than'];
        }

        return ['Adj ngắn + er + than'];
    }

    if (q.topic === 'plural') {
        if (/bất quy tắc|fish/.test(text)) {
            return ['Danh từ số nhiều bất quy tắc: học thuộc'];
        }

        if (/phụ âm \+ y/.test(text)) {
            return ['Phụ âm + y → ies'];
        }

        if (/nguyên âm \+ y/.test(text)) {
            return ['Nguyên âm + y → thêm s'];
        }

        if (/fe|ves/.test(text)) {
            return ['Một số danh từ f/fe → ves'];
        }

        if (/thêm -es/.test(text)) {
            return ['Danh từ tận cùng s, sh, ch, x, z + es'];
        }

        return ['Danh từ + s'];
    }

    if (q.topic === 'quantifiers') {
        if (/a lot of/.test(text)) {
            return ['a lot of + danh từ đếm được hoặc không đếm được'];
        }

        if (/milk|water|money/.test(text)) {
            return ['much / a little / little + danh từ không đếm được'];
        }

        if (/books|friends|apples/.test(text)) {
            return ['many / a few / few + danh từ đếm được số nhiều'];
        }

        if (/some|any/.test(text)) {
            return [
                'Some: thường dùng trong câu khẳng định, lời mời',
                'Any: thường dùng trong câu hỏi và phủ định'
            ];
        }
    }

    if (q.topic === 'timewords') {
        if (/since/.test(text) && correct === 'since') {
            return ['Since + mốc thời gian'];
        }

        if (/for/.test(text) && correct === 'for') {
            return ['For + khoảng thời gian'];
        }

        if (/already|yet|just|never/.test(text)) {
            return ['S + have/has + V3/ed'];
        }

        return ['Trạng từ tần suất + động từ thường'];
    }

    if (q.topic === 'pronouns') {
        if (/tân ngữ/.test(text)) {
            return ['Động từ / giới từ + tân ngữ'];
        }

        if (/tính từ sở hữu/.test(text)) {
            return ['Tính từ sở hữu + danh từ'];
        }

        return ['Đại từ sở hữu thay thế cụm danh từ'];
    }

    if (q.topic === 'articles') {
        if (correct === 'a') {
            return ['a + từ bắt đầu bằng âm phụ âm'];
        }

        if (correct === 'an') {
            return ['an + từ bắt đầu bằng âm nguyên âm'];
        }

        return ['the + danh từ đã xác định'];
    }

    if (q.topic === 'prepositions') {
        return ['S + am/is/are + giới từ + địa điểm'];
    }

    if (q.topic === 'wh') {
        if (/this|that|these|those/.test(text)) {
            return [
                'This/That + danh từ số ít',
                'These/Those + danh từ số nhiều'
            ];
        }

        return ['Wh-word + trợ động từ + S + V0?'];
    }

    return GRAMMAR_FORMULAS[q.topic] || [];
}

// ==============================
// CHẤM ĐIỂM VÀ HIỂN THỊ ĐÁP ÁN
// ==============================

function answer(kind, value) {
    const s = sessions[kind];

    if (s.answered) return;

    s.answered = true;

    const q = s.items[s.index];

    const correct =
        normalize(value) === normalize(q.correct);

    if (correct) {
        s.score++;
    }

    mark(correct);

    if (kind === 'quiz') {
        $$('#quizPanel .option').forEach((b, i) => {
            b.disabled = true;

            if (
                normalize(s.options[i]) ===
                normalize(q.correct)
            ) {
                b.classList.add('correct');
            } else if (
                normalize(s.options[i]) ===
                normalize(value)
            ) {
                b.classList.add('wrong');
            }
        });
    } else {
        $('#fillAnswer').disabled = true;
        $('#fillForm button').disabled = true;
    }

    // LẤY CÔNG THỨC CỦA CÂU HỎI
    const formulas = getFormula(q);

    // HIỂN THỊ ĐÁP ÁN, GIẢI THÍCH VÀ CÔNG THỨC
    $('#answerFeedback').innerHTML = `
        <div class="feedback ${correct ? '' : 'bad'}">

            <b>
                ${correct
                    ? '🎉 Chính xác!'
                    : '🌸 Chưa đúng rồi!'}
            </b>

            <div>
                Đáp án:
                <span class="answer-reveal">
                    ${escapeHtml(q.correct)}
                </span>
            </div>

            <div>
                💡 ${escapeHtml(q.explain)}
            </div>

            ${formulas.length ? `
                <div class="grammar-box">
                    <strong>
                        📚 Công thức ghi nhớ
                    </strong>

                    ${formulas.map(f => `
                        <div class="grammar-formula">
                            ${escapeHtml(f)}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

        </div>
    `;

    $('#exerciseNext').innerHTML = `
        <button class="primary" id="nextExercise">
            ${s.index + 1 === s.items.length
                ? 'Xem kết quả 🏆'
                : 'Câu tiếp theo →'}
        </button>
    `;

    $('#nextExercise').onclick = () => {
        s.index++;
        renderExercise(kind);
    };
}

// ==============================
// CÁC NÚT ĐIỀU KHIỂN
// ==============================

$('#startQuiz').onclick = () => startExercise('quiz');

$('#startFill').onclick = () => startExercise('fill');

$('#quizTopic').onchange = () => startExercise('quiz');

$('#fillTopic').onchange = () => startExercise('fill');

// ==============================
// KHỞI TẠO WEBSITE
// ==============================

startExercise('quiz');
startExercise('fill');

renderStats();

if (
    ['home', 'theory', 'learn', 'quiz', 'fill']
        .includes(location.hash.slice(1))
) {
    go(location.hash.slice(1));
}
