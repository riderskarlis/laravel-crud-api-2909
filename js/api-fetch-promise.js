// 2. metode: fetch API ar Promise ķēdi (.then / .catch).
function fetchPromiseRequest(method, url, { body, token } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = 'Bearer ' + token;

    return fetch(url, {
        method: method,
        headers: headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })
        .catch(function () {
            throw { status: 0, data: { message: 'Tīkla kļūda — vai API serveris ir palaists?' } };
        })
        .then(function (response) {
            return response.text().then(function (text) {
                let data = null;
                if (text) {
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        data = { message: text };
                    }
                }
                const result = { status: response.status, data: data };
                if (!response.ok) throw result;
                return result;
            });
        });
}
