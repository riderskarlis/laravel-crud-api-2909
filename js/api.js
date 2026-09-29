// Kopīgs slānis: izvēlas vienu no trim metodēm, pievieno tokenu, rāda ielādi un raksta žurnālā.
const Api = (function () {
    const transports = {
        xhr: { label: 'XMLHttpRequest', send: xhrRequest },
        promise: { label: 'fetch + Promises', send: fetchPromiseRequest },
        async: { label: 'fetch + async/await', send: fetchAsyncRequest },
    };

    const state = {
        token: readStorage('token'),
        user: JSON.parse(readStorage('user') || 'null'),
    };

    function readStorage(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function writeStorage(key, value) {
        try {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        } catch (e) { /* privātais režīms u.c. — vienkārši neatceramies */ }
    }

    function setSession(user, token) {
        state.user = user;
        state.token = token;
        writeStorage('user', user ? JSON.stringify(user) : null);
        writeStorage('token', token);
    }

    function currentMethod() {
        return document.querySelector('input[name="method"]:checked').value;
    }

    function baseUrl() {
        return document.getElementById('api-base').value.replace(/\/+$/, '');
    }

    function delay(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    async function request(method, path, body) {
        const transport = transports[currentMethod()];
        const url = baseUrl() + path;
        const started = performance.now();
        Loader.start();
        try {
            if (document.getElementById('slow').checked) await delay(1000);
            const result = await transport.send(method, url, {
                body,
                token: state.token,
                onProgress: Loader.progress,
            });
            Render.logEntry(transport.label, method, path, result.status, performance.now() - started);
            return result.data;
        } catch (error) {
            Render.logEntry(transport.label, method, path, error.status, performance.now() - started);
            throw error;
        } finally {
            Loader.done();
        }
    }

    return {
        state,
        setSession,

        login: (fields) => request('POST', '/login', fields),
        register: (fields) => request('POST', '/register', fields),
        logout: () => request('POST', '/logout'),

        getPosts: () => request('GET', '/posts'),
        getPost: (id) => request('GET', '/posts/' + id),
        createPost: (fields) => request('POST', '/posts', fields),
        updatePost: (id, fields) => request('PUT', '/posts/' + id, fields),
        deletePost: (id) => request('DELETE', '/posts/' + id),
        updatePostStatus: (id, statusId) => request('PATCH', '/posts/' + id + '/status', { post_status_id: statusId }),

        getComments: (postId) => request('GET', '/posts/' + postId + '/comments'),
        createComment: (postId, content) => request('POST', '/posts/' + postId + '/comments', { content }),
        deleteComment: (postId, id) => request('DELETE', '/posts/' + postId + '/comments/' + id),
    };
})();
