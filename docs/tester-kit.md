# Tester Onboarding Kit

Copy this whole thing into a WhatsApp message, email, or Notion page and send to your 5 first testers.

---

## Hi, thanks for trying Livong 🏠

Livong helps you find compatible roommates and shared rooms in India. We're at the stage where we want **5 people to use it for real**, find every awkward thing, and tell us. Your time is worth more than any feature in the backlog right now.

**Time commitment:** ~15 min for the walkthrough, plus however long you naturally use it.

---

## Step 1 — Open it

[Insert your URL here once deployed — e.g. `https://livong.in` or `https://livong.vercel.app`]

If we're not live yet, the URL will be a Cloudflare Tunnel link the founder shares directly.

---

## Step 2 — Sign in

You'll need a phone number. We use OTP sign-in (no password, no email).

> **⚠️ Pre-launch note:** OTP delivery via SMS isn't wired up yet. To log in during testing, just message Rohit your phone number and he'll text you the OTP from the dev console. (Once we go live, real OTPs will fire automatically.)

If you'd rather skip OTP entirely for testing, paste this in your browser console (Cmd+Option+J on Mac, Ctrl+Shift+J on Windows) on the Livong tab:

```js
fetch('https://[BACKEND_URL]/auth/_dev-login', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({phone: '+91YOUR_NUMBER_HERE'})
}).then(r=>r.json()).then(d=>{
  localStorage.setItem('token', d.token);
  localStorage.setItem('userId', d.userId);
  location.href = '/explore';
});
```

(Bypass is dev-only, removed before public launch.)

---

## Step 3 — Try this flow

Don't read ahead — let it feel weird where it feels weird.

1. **Set up your profile** — fill in just enough that it feels honest.
2. **Browse `/explore`** — pick a listing that looks interesting.
3. **Send "interest"** on it.
4. **Use a different phone** to log in as someone else, accept your interest.
5. **Open the chat**, say hi, share your contact info.
6. **Try posting your own listing** at `/create-listing`.
7. **Make a Rent Group** at `/rent` — track who pays whose share.
8. **Hit Report** on someone else's listing to see what that's like.
9. **Edit your profile**, change your city.
10. **Walk through `/plans`** — would you pay ₹99/mo for the Basic tier?

---

## Step 4 — Tell us

Specifically these 5 things:

1. **What's the first moment you got confused?** (Page name + what was confusing.)
2. **What did you expect that wasn't there?**
3. **What felt slow, broken, or fake?**
4. **What surprised you in a good way?**
5. **Would you actually use this to find a roommate?** Yes / no — one-line why.

Send to: **[insert your email or WhatsApp]**

Also fine: take screenshots when something's off. Voice note works.

---

## Things you don't need to mention

We already know about these — saves you time:

- The OTP doesn't actually SMS yet (mentioned above)
- Real images for listings — none uploaded; placeholder grey boxes
- Verified badges aren't shown — verification provider isn't wired yet
- Some pages have generic loading spinners — coming
- We have free hosting; if it's slow at 3am India time it's because the Mac is asleep 😅

---

## What we'll do with your feedback

- Read every single thing within 24 hours
- The two most-mentioned issues get fixed in the next week
- We'll DM you when your specific issue is fixed
- Your name in the credits if you want it (or anonymous if you don't)

Thank you. Genuinely — at this stage 5 honest critiques beats 50 strangers' page views.

— Rohit
