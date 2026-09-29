// 1. metode: XMLHttpRequest (klasiskais AJAX ar notikumu apstrādātājiem).
// Promise ietinums vajadzīgs tikai tāpēc, lai visas trīs metodes app.js varētu izsaukt vienādi —
// pats tīkla pieprasījums notiek ar XHR un tā callback funkcijām.
function xhrRequest(method, url, { body, token, onProgress } = {}) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Accept', 'application/json');
        if (body !== undefined) {
            xhr.setRequestHeader('Content-Type', 'application/json');
        }
        if (token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }

        // XHR ļauj sekot reālam lejupielādes progresam
        xhr.onprogress = function (event) {
            if (event.lengthComputable && onProgress) {
                onProgress(event.loaded / event.total);
            }
        };

        xhr.onload = function () {
            let data = null;
            if (xhr.responseText) {
                try {
                    data = JSON.parse(xhr.responseText);
                } catch (e) {
                    data = { message: xhr.responseText };
                }
            }
            const result = { status: xhr.status, data: data };
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(result);
            } else {
                reject(result);
            }
        };

        xhr.onerror = function () {
            reject({ status: 0, data: { message: 'Tīkla kļūda — vai API serveris ir palaists?' } });
        };

        xhr.send(body !== undefined ? JSON.stringify(body) : null);
    });
}
