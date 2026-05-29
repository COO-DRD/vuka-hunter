# Hunter 30s Ad — Production Guide

## Script: `hunter_30s_ad.jsx`

Run via **File → Scripts → Run Script File** in After Effects (CC 2019+).
Creates composition `Hunter_30s_Ad_v1` — 1920×1080 · 30fps · 30 seconds.

---

## Scene-by-Scene Breakdown

| Time        | Scene           | Copy / Action                                             | Emotion       |
|-------------|-----------------|-----------------------------------------------------------|---------------|
| 00:00–00:03 | **HOOK**        | "Your leads are chosen by guesswork."                     | Recognition   |
| 00:03–00:06 | **PAIN**        | 3 wasted activities struck through one by one             | Frustration   |
| 00:06–00:09 | **BRAND**       | HUNTER wordmark slams in with red glow                    | Curiosity      |
| 00:09–00:14 | **DISCOVER**    | Leads table: 127 businesses, ratings, scores              | Excitement    |
| 00:14–00:18 | **ENRICH**      | 6 data cards animate in: tech, email, WhatsApp, signals   | Confidence    |
| 00:18–00:22 | **SCORE**       | Big 94/100 with green bar + AI reasoning snippet          | Trust         |
| 00:22–00:25 | **CONTACTS**    | Dr. Amina Hassan + James Mwangi cards — source-verified   | Advantage     |
| 00:25–00:28 | **OUTREACH**    | WhatsApp bubble + email tab + Send button pops in         | Action ready  |
| 00:28–00:30 | **CTA**         | "Start closing better deals. Today. Free."                | Convert       |

---

## Font Setup

Download **Inter** (free): https://rsms.me/inter

Required weights: **Black**, **Bold**, **Regular**, **Light**

Install before running the script. If Inter is unavailable, AE will substitute
the default sans-serif and font names will need to be updated manually.

---

## Post-Script Polish (in order)

### 1. Motion Blur
Select all animated layers → Layer → Enable Motion Blur (shutter angle: 180°)

### 2. Sound Design
| Frame | SFX                                  |
|-------|--------------------------------------|
| 0     | Silence, then subtle low rumble rise |
| 90    | Hard whoosh + impact (scene cut)     |
| 180   | Whoosh                               |
| 270   | Deep bass thump (brand reveal)       |
| 420   | Swoosh + data-pop ticks              |
| 540   | Swoosh                               |
| 660   | Swoosh                               |
| 750   | Swoosh                               |
| 840   | Orchestral hit / stab                |

**Background music**: lo-fi punchy electronic, 110 BPM, low in mix (–18dB).
Good free source: Pixabay Royalty-Free Music, search "corporate upbeat".

### 3. Grain + Film Texture
Add adjustment layer above all → Effect → Noise & Grain → Add Grain
- Intensity: 1.5–2.5%
- Size: 0.6–0.8
- Softness: 0.5

### 4. Vignette
Add black solid, radial gradient mask, blending mode Multiply, opacity 40%.

### 5. Replace Placeholder UI with Real Screenshots
Take browser screenshots of:
- `/leads` page (leads table with real data)
- `/leads/[id]` enrichment tab (data cards)
- `/leads/[id]` score card
- `/leads/[id]` contacts tab (Dr. Amina etc.)
- `/leads/[id]` opener tab (WhatsApp copy)

Import as footage, parent to the relevant shape layers, use Track Matte or
simply replace the shape layer colors with the screenshot.

### 6. Colour Grade
Add adjustment layer at top:
- Lumetri Color: Contrast +15, Highlights –10, Blacks –20, Vibrance +8
- Optional: subtle Curves S-curve for more punch

---

## Render Settings

**Format**: H.264  
**Preset**: YouTube 1080p Full HD  
**Output module**: `[comp name].mp4`  
**Audio**: Stereo 48kHz 320kbps  

---

## Ad Platform Specs

| Platform          | Spec               | Notes                                     |
|-------------------|--------------------|-------------------------------------------|
| YouTube Pre-roll  | 1920×1080 · H.264  | Skip after 5s — hook must land in 3s      |
| Instagram Reel    | 1080×1920          | Export vertical crop (reframe for 9:16)   |
| Facebook Feed     | 1080×1080 or 16:9  | Add captions (85% watch muted)            |
| LinkedIn Video    | 1920×1080          | B2B — leave as 16:9                       |
| WhatsApp Status   | 1080×1920 · 30s    | Re-export vertical with burn-in captions  |

---

## Captions / Subtitles (for muted viewers)

Export as SRT or burn in using:
```
After Effects → File → Export → Add to Media Encoder Queue
Media Encoder → Format: H.264, Captions: Burn In
```

Key caption timings:
```
00:00 - Your leads are chosen by guesswork.
00:03 - Manually combing Google Maps
00:04 - Cold-calling the wrong people
00:05 - Writing the same message 50x a day
00:06 - There's a better way.
00:09 - 01 DISCOVER — 127 businesses found
00:14 - 02 ENRICH — Website intelligence
00:18 - 03 SCORE — AI scores every lead
00:22 - 04 CONTACTS — Reach decision makers
00:25 - 05 OUTREACH — AI writes the opener
00:28 - Start closing better deals. Today. Free.
00:29 - hunter.dullugroup.co.ke
```

---

## Conversion Hooks (by second)

- **0–3s**: Pain recognition — "that's me, keep watching"
- **6–9s**: Brand reveal — curiosity about what Hunter is
- **9–22s**: Feature proof — the product visually solves the pain
- **22–28s**: Contact + copy generation = the "wow moment"
- **28–30s**: CTA lands on someone already sold
