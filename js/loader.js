// 4) Ielādes indikators: progress bar lapas augšā + spinner konkrētajā vietā.
// Skaitītājs ļauj vairākiem vienlaicīgiem pieprasījumiem nekonfliktēt.
const Loader = (function () {
    const progress = document.getElementById('progress');
    const bar = progress.querySelector('.progress__bar');
    let pending = 0;
    let value = 0;
    let trickleTimer = null;

    function setValue(v) {
        value = Math.max(value, Math.min(v, 1));
        bar.style.width = (value * 100) + '%';
    }

    function start() {
        pending++;
        if (pending > 1) return;
        clearInterval(trickleTimer);
        value = 0;
        bar.style.transition = 'none';
        bar.style.width = '0%';
        progress.classList.add('active');
        // piespiež pārlūku pārzīmēt, pirms atkal ieslēdz animāciju
        void bar.offsetWidth;
        bar.style.transition = '';
        setValue(0.1);
        // fetch nedod progresa notikumus, tāpēc josla lēnām tuvojas 90%
        trickleTimer = setInterval(function () {
            setValue(value + (0.9 - value) * 0.1);
        }, 200);
    }

    function done() {
        pending = Math.max(0, pending - 1);
        if (pending > 0) return;
        clearInterval(trickleTimer);
        setValue(1);
        setTimeout(function () {
            if (pending === 0) progress.classList.remove('active');
        }, 300);
    }

    // Izveido spinner elementu, ko ievietot sarakstā/pogā ielādes laikā
    function spinner(text) {
        const wrap = document.createElement('div');
        wrap.className = 'spinner-wrap';
        const s = document.createElement('span');
        s.className = 'spinner';
        wrap.appendChild(s);
        if (text) {
            const label = document.createElement('span');
            label.textContent = text;
            wrap.appendChild(label);
        }
        return wrap;
    }

    return { start, done, progress: setValue, spinner };
})();
