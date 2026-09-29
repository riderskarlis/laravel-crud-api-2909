// 3) DOM manipulācijas: dati no API tiek pārvērsti HTML elementos bez lapas pārlādes.
// Teksts tiek likts ar textContent (nevis innerHTML), lai lietotāja saturs nevarētu ievietot HTML/JS.
const Render = (function () {
    const STATUSES = { 1: 'publisks', 2: 'privāts' };

    // Mazs palīgs elementu veidošanai: el('p', { className: 'x' }, 'teksts', citsElements)
    function el(tag, props, ...children) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(props || {})) {
            if (key === 'dataset') Object.assign(node.dataset, value);
            else node[key] = value;
        }
        for (const child of children) {
            if (child === null || child === undefined || child === false) continue;
            node.append(child instanceof Node ? child : String(child));
        }
        return node;
    }

    function formatDate(iso) {
        return iso ? new Date(iso).toLocaleString('lv-LV') : '';
    }

    function isOwner(item) {
        return Api.state.user && item.user_id === Api.state.user.id;
    }

    function authStatus() {
        const box = document.getElementById('auth-status');
        const user = Api.state.user;
        box.replaceChildren(
            user
                ? el('span', {}, 'Pieteicies: ', el('strong', {}, user.name), ' ',
                    el('button', { type: 'button', id: 'logout', className: 'secondary' }, 'Iziet'))
                : el('span', { className: 'muted' }, 'Nav pieteicies')
        );
        document.getElementById('auth-panel').hidden = Boolean(user);
        document.getElementById('post-form').hidden = !user;
    }

    function loading(container, text) {
        container.replaceChildren(Loader.spinner(text));
    }

    function postList(posts) {
        const list = document.getElementById('posts');
        if (!posts.length) {
            list.replaceChildren(el('li', { className: 'muted' }, 'Ierakstu nav.'));
            return;
        }
        list.replaceChildren(...posts.map(function (post) {
            return el('li', { className: 'list__item', dataset: { id: post.id } },
                el('div', { className: 'list__title' }, post.title),
                el('div', { className: 'muted small' },
                    '#' + post.id + ' · ' + (STATUSES[post.post_status_id] || '—') + ' · ' + formatDate(post.created_at))
            );
        }));
    }

    function markSelected(id) {
        document.querySelectorAll('#posts .list__item').forEach(function (li) {
            li.classList.toggle('selected', li.dataset.id === String(id));
        });
    }

    function postDetail(post) {
        const box = document.getElementById('post-detail');
        const owner = isOwner(post);

        let actions = null;
        if (owner) {
            const select = el('select', { id: 'post-status' },
                ...Object.entries(STATUSES).map(([id, name]) =>
                    el('option', { value: id, selected: Number(id) === post.post_status_id }, name)));
            actions = el('div', { className: 'row' },
                el('button', { type: 'button', dataset: { action: 'edit-post' } }, 'Rediģēt'),
                el('button', { type: 'button', className: 'danger', dataset: { action: 'delete-post' } }, 'Dzēst'),
                el('label', { className: 'inline' }, 'Statuss ', select)
            );
        }

        box.dataset.id = post.id;
        box.replaceChildren(
            el('h2', {}, post.title),
            el('p', { className: 'muted small' },
                '#' + post.id + ' · ' + (STATUSES[post.post_status_id] || '—') + ' · atjaunots ' + formatDate(post.updated_at)),
            el('p', { className: 'post-body' }, post.body),
            actions,
            el('h3', {}, 'Komentāri'),
            el('ul', { id: 'comments', className: 'list' }),
            Api.state.user
                ? el('form', { id: 'comment-form', className: 'form' },
                    el('textarea', { name: 'content', rows: 2, placeholder: 'Jūsu komentārs', required: true }),
                    el('button', { type: 'submit' }, 'Pievienot komentāru'))
                : el('p', { className: 'muted small' }, 'Piesakieties, lai komentētu.')
        );
    }

    function comments(list) {
        const ul = document.getElementById('comments');
        if (!ul) return;
        if (!list.length) {
            ul.replaceChildren(el('li', { className: 'muted' }, 'Komentāru vēl nav.'));
            return;
        }
        ul.replaceChildren(...list.map(function (c) {
            return el('li', { className: 'list__item static', dataset: { id: c.id } },
                el('div', {}, c.content),
                el('div', { className: 'muted small row' },
                    'lietotājs #' + c.user_id + ' · ' + formatDate(c.created_at),
                    isOwner(c)
                        ? el('button', { type: 'button', className: 'link danger', dataset: { action: 'delete-comment', id: c.id } }, 'dzēst')
                        : null)
            );
        }));
    }

    function emptyDetail() {
        const box = document.getElementById('post-detail');
        delete box.dataset.id;
        box.replaceChildren(el('p', { className: 'muted' }, 'Izvēlieties ierakstu no saraksta.'));
    }

    function logEntry(transport, method, path, status, ms) {
        const ok = status >= 200 && status < 300;
        document.getElementById('log').prepend(
            el('li', { className: ok ? 'ok' : 'fail' },
                el('code', {}, method + ' ' + path),
                ' → ' + (status || 'nav savienojuma') + ' · ' + Math.round(ms) + ' ms · ',
                el('em', {}, transport))
        );
    }

    // Laravel kļūdas: { message, errors: { lauks: [..] } }
    function errorText(error) {
        const data = (error && error.data) || {};
        if (data.errors) return Object.values(data.errors).flat().join(' ');
        if (error.status === 401) return 'Nepieciešams pieteikties.';
        if (error.status === 403) return 'Jums nav tiesību veikt šo darbību.';
        if (error.status === 404) return 'Nav atrasts.';
        return data.message || 'Neizdevās izpildīt pieprasījumu.';
    }

    let toastTimer = null;
    function toast(message, isError) {
        const t = document.getElementById('toast');
        t.textContent = message;
        t.classList.toggle('error', Boolean(isError));
        t.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
    }

    return { authStatus, loading, postList, markSelected, postDetail, comments, emptyDetail, logEntry, errorText, toast };
})();
