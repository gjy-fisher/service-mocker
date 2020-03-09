/*
* desc: 'service-mocker'
*/
/* eslint-disable */
importScripts('https://cdn.bootcss.com/dexie/2.0.4/dexie.min.js');

// Listen to fetch requests
self.addEventListener('fetch', function (event) {
    // match api domain
    if (/xxx.api.domain/.test(event.request.url)) {
        // create IndexedDB of api.
        var db = new Dexie("api_cache");
        db.version(1).stores({
            touchtv_api_cache: 'key,response,timestamp'
        })
        event.respondWith(
            getResponse(event, db)
        );
    }
})

/**
 * save response when online or get cache from indexdb when offline
 */
function getResponse(event, db) {
    if (navigator.onLine) {
        return fetch(event.request.clone())
            .then(function (response) {
                cachePut(event.request.clone(), response.clone(), db.touchtv_api_cache);
                return response;
            })
            .catch(function () {
                return cacheMatch(event.request.clone(), db.touchtv_api_cache);
            })
    } else {
        return cacheMatch(event.request.clone(), db.touchtv_api_cache);
    }
}

/**
* Serializes a Request
* @param request
* @returns Promise
*/
function serializeRequest(request) {
    var serialized = {
        url: request.url,
        method: request.method,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return request.clone().text().then(function (body) {
            serialized.body = body;
            return Promise.resolve(serialized);
        });
    }
    return Promise.resolve(serialized);
}

/**
* Serializes a Response
* @param response
* @returns Promise
*/
function serializeResponse(response) {
    var serialized = {
        headers: serializeHeaders(response.headers),
        status: response.status,
        statusText: response.statusText
    };

    return response.clone().text().then(function (body) {
        serialized.body = body;
        return Promise.resolve(serialized);
    });
}

/**
* Serializes headers
* @param headers
* @returns object
*/
function serializeHeaders(headers) {
    var serialized = {};
    for (var entry of headers.entries()) {
        serialized[entry[0]] = entry[1];
    }
    return serialized;
}

/**
* Serializes a new Response
* @param data
* @returns Promise
*/
function deserializeResponse(data) {
    return Promise.resolve(new Response(data.body, data));
}

/**
* Saves the response for the given request eventually overriding the previous version
* @param data
* @returns Promise
*/
function cachePut(request, response, store) {
    var key, data;
    getRequestId(request.clone())
        .then(function (id) {
            key = id;
            return serializeResponse(response.clone());
        }).then(function (serializedResponse) {
            data = serializedResponse;
            var entry = {
                key: key,
                response: data,
                timestamp: Date.now()
            };
            store
                .add(entry)
                .catch(function (error) {
                    store.update(entry.key, entry);
                });
        });
}

/**
* Returns the cached response for the given request or an empty 503-response for a cache miss.
* @param request
* @return Promise
*/
function cacheMatch(request, store) {
    return getRequestId(request.clone())
        .then(function (id) {
            return store.get(id);
        }).then(function (data) {
            if (data) {
                return deserializeResponse(data.response);
            } else {
                return new Response('', { status: 503, statusText: 'Service Unavailable' });
            }
        });
}

/**
* Returns a string identifier for our api request.
* @param request
* @return string
*/
function getRequestId(request) {
    return new Promise((resolve, reject) => {
        serializeRequest(request.clone()).then(function (serializereq) {
            resolve(JSON.stringify(serializereq));
        })
    });
}
self.addEventListener('error', function (event) {
    console.error('go wrong');
    console.dir(event);
});
self.addEventListener('unhandledrejection', function (event) {
    console.error('Promise with error');
    console.dir(event);
});
self.addEventListener('message', function (e) {
    console.error(e.data);
});
