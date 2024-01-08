# refine

> Note-taking app for multiple distributions (desktop, web, mobile and browser extension)

[![blocksuite](https://img.shields.io/github/package-json/dependency-version/himself65/refine/%40blocksuite%2Feditor?filename=.%2Fpackages%2Fcore%2Fpackage.json&label=blocksuite&color=black)](https://github.com/toeverything/blocksuite)
[![codecov](https://codecov.io/gh/himself65/refine/graph/badge.svg?token=e6W0BtXKbw)](https://codecov.io/gh/himself65/refine)

> [!CAUTION]  
> This repo has been **deprecated**. I just wanted to let you know that there's no further update.

I thought months later that there was no need to develop a local-first note-taking app.
Years ago, I read the paper https://martin.kleppmann.com/papers/local-first.pdf and realized that the local first idea is crazy cool.
I tried to develop some apps (in a startup and another startup).
And the experience that gave me is that there is no free lunch.

Now, I think CRDT can only be used in some note-taking or drawing apps. Just like blockchain, will can be only used in wallet.
People might say, Alex, you're mistaken; you can put blockchain into a game (like some startups).

But still, there is no free lunch; if you do that, your game can only do some boring and basic experience, so why not open Unity and do some fast MVP using C#. Ideally, CRDT can be put into any situation, like a database, even rendering the DOM. But so what? Why will I put butter on bacon? Everything looks like a nail to someone with a hammer for many startups.

More specifically, DX for the CRDT is worse than other technology. Other technologies like server-side rendering or server components in React. At least you can see some errors before publishing to the client; then you can post a new tweet that says haha next.js then keep working. But for such a local-first app, after you publish the app to the client, then everything will be unknown. You can never think up an edge case from some client that crashes the whole app. This might be because the traditional local first app (like PWA) runs the code on the client, but the data is still on the server; the developer will still know what is going on in such data (if you believe `UI=f(data)`). But for CRDT, the thing of truth is on client, even `UI = f(data)` is true, you have f, but you don't know the input, and you get an error UI. How should we enumerate the errors? 

But there are still some workarounds for this: do more logging, do more backup, do more monitors... Then we might encounter performance issues, So that is what I said no more free lunch.

However, I still believe CRDT in many cases is pretty cool and more sense (like drawing, note-taking). But this doesn't relate to more general, doesn't mean that users will care about it.

## Packages

> [!WARNING]  
> Packages are not stable yet, **use them at your own risk**.

- [@refine/core](./packages/core): Core package for multiple distributions (desktop, web, mobile, and browser extension).
- [jotai-inject](./packages/jotai-inject): Dependency injection for multiple environments with Jotai.
- [y-io](./packages/y-io): Socket.io provider for Yjs in both client and server side.
- [y-utils](./packages/y-utils): Utilities for Yjs.

## LICENSE

[MIT](LICENSE)

[blocksuite]: https://github.com/toeverything/blocksuite
