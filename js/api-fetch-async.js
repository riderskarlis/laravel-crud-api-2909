// 3. metode: fetch API ar async/await.
async function fetchAsyncRequest(method, url, { body, token } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let response;
    try {
        response = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch (e) {
        throw { status: 0, data: { message: 'Tīkla kļūda — vai API serveris ir palaists?' } };
    }

    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { message: text };
        }
    }

    const result = { status: response.status, data };
    if (!response.ok) throw result;
    return result;
}
