# Web app installation and TV playback

The member app remains a web product. App Store offers stay disabled. The
welcome, public home, payment, Stripe checkout, billing controls, and shared
protected dependencies are unchanged.

## Member experience

- The existing video player has one TV button. Its optional sheet uses the
  existing typography, colors, rounded controls, and spacing.
- Safari's AirPlay picker sends the HTML video to an Apple TV or compatible
  television. The video element explicitly allows AirPlay.
- Supported Chrome browsers on Android and computers use Google's Web Sender
  SDK and Default Media Receiver. The SDK loads only after opening TV options.
  No custom receiver registration or native app is required.
- Chrome on iOS does not support Google's Web Sender SDK. The sheet directs
  iPhone users to AirPlay instead of offering a nonfunctional Cast button.
- The receiver gets the selected exercise URL/title and generic Pelvi branding.
  It does not get member identity, goals, check-ins, or Coach conversations.
- TV controls preserve clip position on transfer and return paused to the
  phone on disconnect. Pause, seek, sound, replay, clip changes, and close target
  the active transport. Closing or switching accounts stops owned casting.
- Receiver observations use separate watch-time accounting. Seeks, buffering,
  unrelated media, suspended observation gaps, and stale callbacks cannot add
  watch time. Receiver FINISHED enters the existing exercise/practice flow;
  explicit session finish remains the only path that credits a program day.
- Keep the member page open for observed progress, guided-practice timers, and
  the next exercise. A screen wake lock is requested where supported. Only the
  exercise video appears on the television; practice/Coach overlays stay on
  the phone. Local CSS mirroring cannot transform a receiver's video.

## Media/device limits

The native-authored catalog contains 418 MP4 files and 115 QuickTime MOV files.
Google does not list QuickTime as a supported Cast container. MOV files retain
local/AirPlay playback and show an honest screen-mirroring fallback. A mixed
playlist returns to the phone when the next file is unsupported. We never
relabel a MOV file as MP4.

Sample source files use H.264 High level 5.0 at 1080p with AAC audio. Some older
Cast receivers support lower H.264 levels; successful playback also depends on
the receiver. Failed loads leave local playback available. Universal Cast
compatibility requires separately encoded MP4/H.264 level 4.1/AAC derivatives;
this release does not alter or transcode the native source media.

## Home-screen and offline behavior

You contains an optional Add to Home Screen row. A member-layout provider
preserves Chrome's one-use install prompt across tabs. Safari, Chrome Android,
and desktop Chrome also have manual setup instructions. No setup dialog opens
automatically, and no flow links to an app store.

The production service worker caches only content-hashed same-origin build
assets. It never caches account pages, APIs, Firebase traffic, health records,
payment returns, workout videos, or automatic audio downloads. A network
navigation failure shows a neutral offline recovery page. Member sessions and
videos still require internet; this is not a claim of full offline operation.
Existing explicitly saved recordings retain their separate cache. Worker
updates wait until existing tabs close rather than interrupting a session.

## Validation

Run `npm test` and `npm run build`. Transport tests use a fake SDK to exercise
real asynchronous ordering, pending loads/commands, clip ownership, transfer,
sound preferences, disconnects, and retries. Worker tests execute its actual
event handlers against simulated Cache Storage and network responses. Install
tests dispatch browser events before the You sheet mounts and across tab
changes. Protected-surface hashes must stay unchanged.

Browser QA covers desktop and phone-sized player/TV/setup sheets, ordinary
playback, control focus, and graceful unavailable-device behavior. No physical
AirPlay or Chromecast receiver is attached to the development environment;
physical TV acceptance remains a hardware check, not a simulated test result.

Sources: [Apple AirPlay controls](https://developer.apple.com/documentation/webkitjs/adding_an_airplay_button_to_your_safari_media_controls),
[Google Cast integration](https://developers.google.com/cast/docs/web_sender/integrate),
[Cast browser requirements](https://developers.google.com/cast/docs/web_sender),
[supported receiver media](https://developers.google.com/cast/docs/media),
[Apple home-screen setup](https://support.apple.com/guide/iphone/iphea86e5236/ios),
[Chrome installation](https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DAndroid).
