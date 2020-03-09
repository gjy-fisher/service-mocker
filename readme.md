# service-mocker

开发背景： 因为项目组开发时是前后端分离的模式，在开发前端页面的很多时候会遇到后端接口部署或者其他不知名原因而挂了，导致开发的时候突然调不了接口调试页面，所以需要做数据的 mocker，但是很多时候一个一个接口的做数据 mocker 会很耗时间，效率不高，于是就想起了用 service-worker 来代理 h5 的网络请求，根据请求域名过滤需要缓存的请求，利用 indexdb 存储返回报文跟请求报文，在断网或者后台接口崩溃的时候去 indexdb 匹配之前缓存的请求，返回存储的报文以达到 mocker 的目的

---

## Usage

```javascript
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        const swUrl = "/service-worker.js";
        registerValidSW(swUrl);
        navigator.serviceWorker
            .register(swUrl)
            .then(registration => {
                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === "installed") {
                            if (navigator.serviceWorker.controller) {
                                console.log(
                                    "New content is available; please refresh."
                                );
                            } else {
                                console.log(
                                    "Content is cached for offline use."
                                );
                            }
                        }
                        if (installingWorker.state === "waiting") {
                            console.log("skipWaiting");
                        }
                    };
                };
            })
            .catch(error => {
                console.error(
                    "Error during service worker registration:",
                    error
                );
            });
    });
}
```

## how to design

1. Listen to fetch requests and filter which request will cached;
2. save response when online or get cache from indexdb when offline;
3. when network is online and then save the response for the given request eventually overriding the previous version;
4. Serializes a Request to get a unique string used to be a store id;
5. Serializes a Response used to be a store data;
6. indexdb add store with id, data, Date.now();
7. when network is offline and then return the cached response for the given request or an empty 503-response for a cache miss;
