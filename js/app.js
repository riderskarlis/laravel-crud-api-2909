// Notikumu apstrāde: katra darbība izsauc API fonā un atjauno tikai vajadzīgo lapas daļu.
(function () {
    const postForm = document.getElementById('post-form');
    const detail = document.getElementById('post-detail');
    let currentPost = null;

    // Atspējo pogu pieprasījuma laikā un parāda kļūdu, ja tāda rodas
    async function run(button, action) {
        if (button) button.disabled = true;
        try {
            return await action();
        } catch (error) {
            Render.toast(Render.errorText(error), true);
        } finally {
            if (button) button.disabled = false;
        }
    }

    function formData(form) {
        return Object.fromEntries(new FormData(form).entries());
    }

    // --- Autentifikācija ---

    document.querySelectorAll('.tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
            document.getElementById('login-form').hidden = tab.dataset.tab !== 'login';
            document.getElementById('register-form').hidden = tab.dataset.tab !== 'register';
        });
    });

    async function authenticate(form, call, successText) {
        await run(form.querySelector('button'), async function () {
            const data = await call(formData(form));
            // /login ar nepareizu paroli atgriež 200 ar "errors", tāpēc pārbaudām arī to
            if (data.errors) throw { data };
            Api.setSession(data.user, data.token);
            form.reset();
            Render.authStatus();
            if (currentPost) showPost(currentPost.id);
            Render.toast(successText + ', ' + data.user.name + '!');
        });
    }

    document.getElementById('login-form').addEventListener('submit', function (e) {
        e.preventDefault();
        authenticate(this, Api.login, 'Sveiki');
    });

    document.getElementById('register-form').addEventListener('submit', function (e) {
        e.preventDefault();
        authenticate(this, Api.register, 'Konts izveidots');
    });

    document.getElementById('auth-status').addEventListener('click', async function (e) {
        if (e.target.id !== 'logout') return;
        try {
            await Api.logout();
        } catch (error) {
            // ja tokens jau nederīgs, tik un tā izrakstāmies lokāli
        }
        Api.setSession(null, null);
        Render.authStatus();
        resetPostForm();
        if (currentPost) showPost(currentPost.id);
        Render.toast('Jūs esat izrakstījies.');
    });

    // --- Ieraksti ---

    async function loadPosts() {
        const list = document.getElementById('posts');
        Render.loading(list, 'Ielādē ierakstus…');
        await run(document.getElementById('load-posts'), async function () {
            Render.postList(await Api.getPosts());
            if (currentPost) Render.markSelected(currentPost.id);
        });
        // kļūdas gadījumā noņemam spinneri
        if (list.querySelector('.spinner-wrap')) list.replaceChildren();
    }

    async function showPost(id) {
        Render.markSelected(id);
        Render.loading(detail, 'Ielādē ierakstu…');
        const post = await run(null, () => Api.getPost(id));
        if (!post) {
            currentPost = null;
            Render.emptyDetail();
            return;
        }
        currentPost = post;
        Render.postDetail(post);

        const ul = document.getElementById('comments');
        Render.loading(ul, 'Ielādē komentārus…');
        const comments = await run(null, () => Api.getComments(id));
        if (comments) Render.comments(comments);
        else ul.replaceChildren();
    }

    function resetPostForm() {
        postForm.reset();
        postForm.elements.id.value = '';
        document.getElementById('post-form-title').textContent = 'Jauns ieraksts';
        document.getElementById('post-form-cancel').hidden = true;
    }

    document.getElementById('load-posts').addEventListener('click', loadPosts);

    document.getElementById('posts').addEventListener('click', function (e) {
        const item = e.target.closest('.list__item');
        if (item) showPost(item.dataset.id);
    });

    postForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const { id, title, body } = formData(postForm);
        run(postForm.querySelector('button[type="submit"]'), async function () {
            const post = id ? await Api.updatePost(id, { title, body }) : await Api.createPost({ title, body });
            Render.toast(id ? 'Ieraksts atjaunots.' : 'Ieraksts izveidots.');
            resetPostForm();
            await loadPosts();
            await showPost(post.id);
        });
    });

    document.getElementById('post-form-cancel').addEventListener('click', resetPostForm);

    // --- Izvēlētā ieraksta darbības (notikumu deleģēšana, jo saturs tiek pārzīmēts) ---

    detail.addEventListener('click', function (e) {
        const button = e.target.closest('button[data-action]');
        if (!button || !currentPost) return;

        if (button.dataset.action === 'edit-post') {
            postForm.elements.id.value = currentPost.id;
            postForm.elements.title.value = currentPost.title;
            postForm.elements.body.value = currentPost.body;
            document.getElementById('post-form-title').textContent = 'Rediģēt ierakstu #' + currentPost.id;
            document.getElementById('post-form-cancel').hidden = false;
            postForm.elements.title.focus();
        }

        if (button.dataset.action === 'delete-post') {
            // divu klikšķu apstiprinājums confirm() vietā
            if (button.dataset.confirm !== 'yes') {
                button.dataset.confirm = 'yes';
                button.textContent = 'Tiešām dzēst?';
                return;
            }
            run(button, async function () {
                await Api.deletePost(currentPost.id);
                currentPost = null;
                Render.emptyDetail();
                Render.toast('Ieraksts izdzēsts.');
                await loadPosts();
            });
        }

        if (button.dataset.action === 'delete-comment') {
            const postId = currentPost.id;
            run(button, async function () {
                await Api.deleteComment(postId, button.dataset.id);
                Render.toast('Komentārs izdzēsts.');
                Render.comments(await Api.getComments(postId));
            });
        }
    });

    detail.addEventListener('change', function (e) {
        if (e.target.id !== 'post-status' || !currentPost) return;
        run(e.target, async function () {
            await Api.updatePostStatus(currentPost.id, Number(e.target.value));
            Render.toast('Statuss nomainīts.');
            await showPost(currentPost.id);
            await loadPosts();
        });
    });

    detail.addEventListener('submit', function (e) {
        if (e.target.id !== 'comment-form' || !currentPost) return;
        e.preventDefault();
        const form = e.target;
        const postId = currentPost.id;
        run(form.querySelector('button'), async function () {
            await Api.createComment(postId, form.elements.content.value);
            form.reset();
            Render.toast('Komentārs pievienots.');
            Render.comments(await Api.getComments(postId));
        });
    });

    document.getElementById('clear-log').addEventListener('click', function () {
        document.getElementById('log').replaceChildren();
    });

    // --- Starts ---
    Render.authStatus();
    loadPosts();
})();
