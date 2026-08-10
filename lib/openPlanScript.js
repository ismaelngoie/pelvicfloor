// The inline script that lib/openPlan.js describes, kept in its own file.
//
// SPLIT FROM lib/openPlan.js FOR ONE REASON: the source below is about 900
// bytes of text, and lib/openPlan.js is reached from the client bundle (the
// checkout writes an entitlement, and lib/entitlement.js clears the flag). So
// leaving the string there shipped it TWICE to every ad click: once as the
// script in the HTML, and once again as a dead string inside a JavaScript
// chunk that can never use it. This module is imported by app/layout.js and by
// nothing else, and app/layout.js is a server component, so the string is
// inlined into the exported HTML at build time and never reaches a bundle.
//
// Everything about WHY it does what it does is in lib/openPlan.js. Read that
// first.

import { MEMBER_HOME, STAY_KEY, SUPPRESS_KEY } from "./openPlan";

// The source of the inline script, as text, because that is the only form a
// static export can put in front of the first paint.
//
// Deliberately ES5 and deliberately defensive. It runs before any bundle, on
// whatever browser turned up, and it is wrapped so that a failure anywhere in
// it is a no-op that leaves the marketing page exactly as it was. There is no
// state in the world it can damage: it reads three keys and either navigates or
// does not.
//
// Kept on one line per statement rather than minified, because this ships as
// readable text in the HTML of every page and the next person to open View
// Source on pelvi.health should be able to see what it does.
export const OPEN_PLAN_SCRIPT = `(function(){
try{
var w=window,p=w.location.pathname,q=w.location.search||"";
var home=p==="/"||p==="/index.html";
var welcome=p==="/welcome"||p==="/welcome/"||p==="/welcome.html";
if(!home&&!welcome)return;
if(/[?&]stay=1(&|$)/.test(q)){try{w.sessionStorage.setItem("${STAY_KEY}","1")}catch(e){}return}
try{if(w.sessionStorage.getItem("${STAY_KEY}"))return}catch(e){}
if(welcome&&q.length>1)return;
var ls=w.localStorage,n=ls.length,i,k,v,found=false;
if(ls.getItem("${SUPPRESS_KEY}"))return;
for(i=0;i<n;i++){
k=ls.key(i);
if(k&&k.indexOf("firebase:authUser:")===0){v=ls.getItem(k);if(v&&v.indexOf("refreshToken")>-1){found=true;break}}
}
if(!found)return;
w.location.replace("${MEMBER_HOME}"+q);
}catch(e){}
})();`;

// WHY THE QUERY STRING COMES WITH HER, which is the one line above that is not
// obvious.
//
// It is for Google Ads attribution and nothing else. gtag reads ?gclid off the
// landing URL and writes the _gcl_aw cookie; that cookie is what ties a click
// to a purchase weeks later. The tag is `afterInteractive`, so on a redirected
// arrival it never runs on "/" at all, and dropping the parameter here would
// throw the click away.
//
// It matters for one real person: a member who cancelled, is still signed in,
// and clicks a remarketing ad. She lands here, is sent to /app, finds the
// recovery screen, takes the one link back to the funnel and buys again. That
// is a conversion the campaign earned, and without the parameter it would be
// recorded as coming from nowhere.
//
// Nothing private travels. This only ever runs on "/", which never carries a
// payment secret, and /welcome is left alone the moment it has any query string
// at all. /app is in BLOCKED_PREFIXES in lib/analytics.js, so Microsoft Clarity
// is not injected there whatever the URL says, and the page is noindex.
//
// `replace`, not `assign`: the back button should take her to wherever she came
// from, not bounce her between "/" and /app.
