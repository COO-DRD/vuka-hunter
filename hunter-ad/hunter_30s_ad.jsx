// ============================================================
// HUNTER — 30-Second Ad  |  After Effects JSX Generation Script
// Run via: File > Scripts > Run Script File
//
// Output: 1920×1080 · 30fps · 30s · "Hunter_30s_Ad_v1" comp
//
// FONTS NEEDED (substitute any modern sans-serif if not installed):
//   Inter-Black, Inter-Bold, Inter-Regular, Inter-Light
//   Download free at rsms.me/inter
//
// POST-SCRIPT CHECKLIST:
//   1. Replace placeholder text layers with Hunter UI screenshots
//      (use them as textures on shape layers or as comp items)
//   2. Add a sound track (recommended: lo-fi punchy 110bpm)
//   3. Add whoosh SFX at each scene transition (frames 90,180,270,420,540,660,750,840)
//   4. Add motion blur to all animated text layers (Layer > Switches > Motion Blur)
//   5. Add a subtle film grain layer (Effect > Noise > Add Grain, ~2%)
//   6. Render via Composition > Add to Render Queue · H.264 · Best Quality
// ============================================================

(function hunterAd() {
  "use strict";

  app.beginUndoGroup("Hunter 30s Ad");

  // ── Composition ──────────────────────────────────────────────
  var W = 1920, H = 1080, FPS = 30, DUR = 30;
  var comp = app.project.items.addComp("Hunter_30s_Ad_v1", W, H, 1, DUR, FPS);
  comp.displayStartTime = 0;

  // ── Color Palette (linear 0-1 RGB) ───────────────────────────
  var C = {
    bg:    [0.035, 0.035, 0.043],   // #09090b
    red:   [0.863, 0.149, 0.149],   // #dc2626
    red2:  [0.451, 0.051, 0.051],   // #730808
    white: [1.000, 1.000, 1.000],
    z100:  [0.961, 0.961, 0.965],
    z300:  [0.827, 0.827, 0.835],
    z400:  [0.631, 0.631, 0.647],
    z600:  [0.388, 0.388, 0.416],
    z700:  [0.247, 0.247, 0.267],
    z800:  [0.161, 0.161, 0.173],
    z900:  [0.098, 0.098, 0.110],
    green: [0.133, 0.773, 0.369],   // #22c55e
    amber: [0.961, 0.659, 0.110],   // #f59e1c
    wa:    [0.106, 0.388, 0.267],   // WhatsApp dark green
  };

  // ── Helpers ───────────────────────────────────────────────────
  function t(frame)  { return frame / FPS; }
  var CX = W / 2, CY = H / 2;

  // Apply easy ease to all keys on a property
  function ez(prop) {
    var ease = new KeyframeEase(0.5, 33.3);
    for (var i = 1; i <= prop.numKeys; i++) {
      try { prop.setTemporalEaseAtKey(i, [ease], [ease]); } catch (e) {}
    }
  }

  // Create a solid (full-comp colored plane)
  function solid(name, color, inF, outF) {
    var s = comp.layers.addSolid(color, name, W, H, 1);
    s.inPoint = t(inF); s.outPoint = t(outF);
    return s;
  }

  // Create a shape layer with a filled rectangle
  function rect(name, x, y, w, h, color, radius, inF, outF) {
    var sl = comp.layers.addShape();
    sl.name = name;
    sl.inPoint = t(inF); sl.outPoint = t(outF);

    var content = sl.property("Contents");
    var grp     = content.addProperty("ADBE Vector Group");
    grp.name    = "Rect";
    var shapes  = grp.property("Contents");

    var rp = shapes.addProperty("ADBE Vector Shape - Rect");
    rp.property("ADBE Vector Rect Size").setValue([w, h]);
    rp.property("ADBE Vector Rect Position").setValue([0, 0]);
    rp.property("ADBE Vector Rect Roundness").setValue(radius || 0);

    var fill = shapes.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(color);

    sl.transform.position.setValue([x, y]);
    return sl;
  }

  // Text layer with TextDocument
  function txt(content, size, color, x, y, inF, outF, weight, tracking) {
    var tl  = comp.layers.addText(content);
    tl.inPoint = t(inF); tl.outPoint = t(outF);

    var tp  = tl.property("ADBE Text Properties").property("ADBE Text Document");
    var td  = tp.value;
    td.text = content;
    td.fontSize   = size;
    td.fillColor  = color;
    td.font       = (weight === "black")  ? "Inter-Black"  :
                    (weight === "bold")   ? "Inter-Bold"   :
                    (weight === "light")  ? "Inter-Light"  : "Inter-Regular";
    td.justification = ParagraphJustification.LEFT_JUSTIFY;
    if (tracking) td.trackingAmount = tracking;
    tp.setValue(td);

    tl.transform.position.setValue([x, y]);
    tl.transform.anchorPoint.setValue([0, 0]);
    return tl;
  }

  function txtC(content, size, color, cx_, cy_, inF, outF, weight, tracking) {
    var tl = txt(content, size, color, cx_, cy_, inF, outF, weight, tracking);
    var tp = tl.property("ADBE Text Properties").property("ADBE Text Document");
    var td = tp.value;
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    tp.setValue(td);
    return tl;
  }

  // Fade in
  function fadeIn(layer, inF, dur) {
    var op = layer.transform.opacity;
    op.setValueAtTime(t(inF), 0);
    op.setValueAtTime(t(inF + dur), 100);
    ez(op);
  }

  // Fade out
  function fadeOut(layer, outF, dur) {
    var op = layer.transform.opacity;
    op.setValueAtTime(t(outF - dur), 100);
    op.setValueAtTime(t(outF), 0);
    ez(op);
  }

  // Slide up on entry
  function slideUp(layer, inF, dur, dist) {
    dist = dist || 35;
    var pos = layer.transform.position;
    var v   = pos.value;
    pos.setValueAtTime(t(inF),       [v[0], v[1] + dist]);
    pos.setValueAtTime(t(inF + dur), [v[0], v[1]]);
    ez(pos);
  }

  // Slide in from right
  function slideLeft(layer, inF, dur, dist) {
    dist = dist || 80;
    var pos = layer.transform.position;
    var v   = pos.value;
    pos.setValueAtTime(t(inF),       [v[0] + dist, v[1]]);
    pos.setValueAtTime(t(inF + dur), [v[0],        v[1]]);
    ez(pos);
  }

  // Scale pop
  function popIn(layer, inF, dur) {
    var sc = layer.transform.scale;
    sc.setValueAtTime(t(inF),           [0, 0]);
    sc.setValueAtTime(t(inF + dur * 0.75), [108, 108]);
    sc.setValueAtTime(t(inF + dur),     [100, 100]);
    ez(sc);
  }

  // Counter-style scale: comes in small
  function scaleUp(layer, inF, dur) {
    var sc = layer.transform.scale;
    sc.setValueAtTime(t(inF),       [82, 82]);
    sc.setValueAtTime(t(inF + dur), [100, 100]);
    ez(sc);
  }

  // ─────────────────────────────────────────────────────────────
  // PERSISTENT LAYERS (visible throughout multiple scenes)
  // ─────────────────────────────────────────────────────────────

  // Master background
  solid("MASTER_BG", C.bg, 0, 900);

  // Red hairline at very top — brand accent (appears at frame 12, stays forever)
  var hairline = rect("hairline", CX, 24, 280, 3, C.red, 2, 12, 900);
  fadeIn(hairline, 12, 15);
  hairline.transform.scale.setValueAtTime(t(12), [0, 100]);
  hairline.transform.scale.setValueAtTime(t(28), [100, 100]);
  ez(hairline.transform.scale);

  // Scene number badge (bottom-left, changes per scene)
  // We use separate layers per scene for clean transitions

  // ─────────────────────────────────────────────────────────────
  // SCENE 1: HOOK  (0–90f = 0–3s)
  // "Your leads are chosen by guesswork."
  // ─────────────────────────────────────────────────────────────

  var h1a = txt("Your leads are", 100, C.z400, 130, CY - 110, 0, 90, "black");
  var h1b = txt("chosen by guesswork.", 100, C.white, 130, CY - 0, 8, 90, "black");
  var h1c = txt("EVERY COLD CALL IS A GAMBLE.", 30, C.red, 132, CY + 90, 22, 90, "regular", 350);

  fadeIn(h1a, 0, 14); slideUp(h1a, 0, 18);
  fadeIn(h1b, 8, 14); slideUp(h1b, 8, 18);
  fadeIn(h1c, 22, 10);

  fadeOut(h1a, 86, 12); fadeOut(h1b, 86, 12); fadeOut(h1c, 86, 12);

  // ─────────────────────────────────────────────────────────────
  // SCENE 2: PAIN  (90–180f = 3–6s)
  // Three wasted activities animate in
  // ─────────────────────────────────────────────────────────────

  var pains = [
    "Manually combing Google Maps",
    "Cold-calling the wrong people",
    "Writing the same message 50× a day",
  ];

  for (var i = 0; i < 3; i++) {
    // Red dot
    var dot = rect("pain-dot-" + i, 140, CY - 60 + i * 105, 10, 10, C.red, 5, 90 + i * 18, 180);
    fadeIn(dot, 90 + i * 18, 8);
    popIn(dot, 90 + i * 18, 8);

    // Strike-through rect (animates width 0→text width after dot appears)
    var strike = rect("strike-" + i, 620, CY - 55 + i * 105, 0, 3, C.z600, 2, 105 + i * 18, 180);
    strike.transform.scale.setValueAtTime(t(108 + i * 18), [0, 100]);
    strike.transform.scale.setValueAtTime(t(122 + i * 18), [100, 100]);
    ez(strike.transform.scale);
    // Reposition anchor so it scales left→right
    strike.transform.anchorPoint.setValue([-480, 0]);
    strike.transform.position.setValue([140, CY - 55 + i * 105]);

    var pl = txt(pains[i], 58, C.z400, 170, CY - 75 + i * 105, 90 + i * 18, 180, "light");
    fadeIn(pl, 90 + i * 18, 8);
    slideLeft(pl, 90 + i * 18, 12, 50);
    fadeOut(pl, 175, 8);
    fadeOut(dot, 175, 8);
  }

  // Outro text
  var p2out = txt("There's a better way.", 72, C.white, 130, CY + 60, 155, 180, "bold");
  fadeIn(p2out, 155, 14);
  slideUp(p2out, 155, 16);
  fadeOut(p2out, 178, 8);

  // ─────────────────────────────────────────────────────────────
  // SCENE 3: BRAND REVEAL  (180–270f = 6–9s)
  // Hunter wordmark slams in
  // ─────────────────────────────────────────────────────────────

  // Red glow plane (low opacity)
  var glow = solid("brand-glow", C.red, 180, 270);
  glow.transform.opacity.setValueAtTime(t(180), 0);
  glow.transform.opacity.setValueAtTime(t(192), 14);
  glow.transform.opacity.setValueAtTime(t(260), 0);
  ez(glow.transform.opacity);

  // HUNTER wordmark
  var brand = txtC("HUNTER", 192, C.white, CX, CY - 60, 180, 270, "black", 120);
  scaleUp(brand, 180, 18); fadeIn(brand, 180, 10);
  brand.transform.anchorPoint.setValue([brand.sourceRectAtTime(t(182), false).width / 2, 0]);

  // Red underbar under HUNTER
  var brandLine = rect("brand-underbar", CX, CY + 10, 580, 4, C.red, 2, 190, 270);
  brandLine.transform.scale.setValueAtTime(t(190), [0, 100]);
  brandLine.transform.scale.setValueAtTime(t(208), [100, 100]);
  ez(brandLine.transform.scale);

  // Tagline
  var tagline = txtC("AI LEAD INTELLIGENCE · KENYA", 30, C.red, CX, CY + 42, 200, 270, "regular", 400);
  fadeIn(tagline, 200, 12);
  tagline.transform.anchorPoint.setValue([tagline.sourceRectAtTime(t(202), false).width / 2, 0]);

  fadeOut(brand,     268, 10); fadeOut(brandLine, 268, 10); fadeOut(tagline, 268, 10);

  // ─────────────────────────────────────────────────────────────
  // SCENE 4: DISCOVER  (270–420f = 9–14s)
  // Hunter finds leads from Google Maps · shows leads table
  // ─────────────────────────────────────────────────────────────

  // Scene label
  var lbl4 = txt("01  DISCOVER", 24, C.red, 130, 68, 270, 420, "regular", 350);
  fadeIn(lbl4, 270, 10); fadeOut(lbl4, 416, 8);

  // Headline (left column)
  var d_head = txt("Find every qualified\nlead in Nairobi.\nAutomatically.", 82, C.white, 130, CY - 185, 280, 420, "black");
  fadeIn(d_head, 280, 14); slideUp(d_head, 280, 16, 30);

  var d_sub = txt("127 businesses matched your criteria.\nRated 4.5+ · Active · Reachable.", 32, C.z400, 130, CY + 110, 298, 420, "regular");
  fadeIn(d_sub, 298, 12);

  // Right: UI panel
  var panelBg = rect("d-panel", 1390, CY + 20, 860, 660, C.z900, 16, 292, 420);
  fadeIn(panelBg, 292, 12); slideLeft(panelBg, 292, 16, 100);

  // Panel header bar
  var panelHdr = rect("d-panel-hdr", 1390, CY - 295, 860, 52, C.z800, 0, 292, 420);
  fadeIn(panelHdr, 294, 10);

  var panelTtl = txt("Hunter Leads — Nairobi", 22, C.z300, 980, CY - 310, 296, 420, "regular");
  fadeIn(panelTtl, 296, 8);

  // Lead rows
  var leadsData = [
    { name: "Dental Smiles Clinic",    meta: "4.9★ · 312 reviews · Westlands",     score: 94, sc: C.green },
    { name: "Apex Logistics Ltd.",     meta: "4.7★ · 188 reviews · Industrial Area", score: 87, sc: C.green },
    { name: "Serene Hotel & Spa",      meta: "4.8★ · 541 reviews · Karen",          score: 91, sc: C.green },
    { name: "Pioneer Solar Kenya",     meta: "4.6★ · 97 reviews · Kilimani",        score: 83, sc: C.amber },
    { name: "TrustLaw Advocates",      meta: "4.9★ · 64 reviews · CBD",             score: 89, sc: C.green },
    { name: "Kenya Breweries Sup...",  meta: "4.5★ · 433 reviews · Ruiru",          score: 78, sc: C.amber },
  ];

  for (var r = 0; r < leadsData.length; r++) {
    var ry = CY - 238 + r * 88 + 52;
    var ri = 306 + r * 7;
    var ld = leadsData[r];

    // Row background (alternating)
    var rowCol = r % 2 === 0 ? C.z900 : C.z800;
    var rowBg = rect("row-bg-" + r, 1390, ry, 858, 82, rowCol, 0, ri, 420);
    fadeIn(rowBg, ri, 5);

    // Business name
    var rName = txt(ld.name, 24, C.z100, 984, ry - 18, ri, 420, "bold");
    fadeIn(rName, ri, 5);

    // Meta (rating + location)
    var rMeta = txt(ld.meta, 19, C.z400, 984, ry + 8, ri, 420, "regular");
    fadeIn(rMeta, ri, 5);

    // Score pill
    var pillW = 68;
    var pill  = rect("score-pill-" + r, 1788, ry, pillW, 30, ld.sc, 14, ri + 3, 420);
    fadeIn(pill, ri + 3, 5);
    popIn(pill, ri + 3, 7);

    var pillTxt = txt(ld.score + "", 18, C.bg, 1768, ry - 12, ri + 3, 420, "black");
    fadeIn(pillTxt, ri + 3, 5);
  }

  // Paging indicator
  var pageInfo = txt("Showing 1–6 of 127", 18, C.z600, 984, CY + 298, 330, 420, "regular");
  fadeIn(pageInfo, 330, 8);

  // Transition out
  fadeOut(d_head, 415, 10); fadeOut(d_sub, 415, 10);

  // ─────────────────────────────────────────────────────────────
  // SCENE 5: ENRICH  (420–540f = 14–18s)
  // We crawl their site. You get the intelligence.
  // ─────────────────────────────────────────────────────────────

  var lbl5 = txt("02  ENRICH", 24, C.red, 130, 68, 420, 540, "regular", 350);
  fadeIn(lbl5, 420, 10); fadeOut(lbl5, 536, 8);

  var e_head = txt("We crawl their site.\nYou get the\nintelligence.", 82, C.white, 130, CY - 185, 430, 540, "black");
  fadeIn(e_head, 430, 14); slideUp(e_head, 430, 16, 30);

  // Data cards grid (3 col × 2 row)
  var dataCards = [
    { label: "Tech Stack",     value: "WordPress · No Analytics",        vc: C.amber },
    { label: "Booking System", value: "Not found — gap detected",         vc: C.red   },
    { label: "Live Chat",      value: "None — losing leads at night",     vc: C.red   },
    { label: "Email",          value: "info@dentalsmiles.co.ke",          vc: C.green },
    { label: "WhatsApp",       value: "wa.me/254722xxxxxx",               vc: C.green },
    { label: "Custom Signal",  value: "Expanding — 2nd branch opening",  vc: C.amber },
  ];

  var cols = [988, 1242, 1496];
  var rows = [CY - 80, CY + 80];

  for (var dc = 0; dc < dataCards.length; dc++) {
    var dcX   = cols[dc % 3];
    var dcY   = rows[Math.floor(dc / 3)];
    var dcIn  = 440 + dc * 9;
    var dci   = dataCards[dc];

    var dcBg = rect("dc-bg-" + dc, dcX, dcY, 228, 104, C.z800, 12, dcIn, 540);
    fadeIn(dcBg, dcIn, 8); popIn(dcBg, dcIn, 10);

    var dcLabel = txt(dci.label, 18, C.z400, dcX - 105, dcY - 30, dcIn, 540, "regular");
    fadeIn(dcLabel, dcIn + 2, 6);

    var dcVal = txt(dci.value, 21, dci.vc, dcX - 105, dcY - 6, dcIn + 2, 540, "bold");
    fadeIn(dcVal, dcIn + 4, 6);
  }

  // Scanning progress bar
  var scanBarBg  = rect("scan-bar-bg", 880, CY + 200, 820, 6, C.z700, 3, 435, 540);
  var scanBarFg  = rect("scan-bar-fg", 470, CY + 200, 820, 6, C.red, 3, 435, 540);
  scanBarFg.transform.anchorPoint.setValue([-410, 0]);
  scanBarFg.transform.scale.setValueAtTime(t(435), [0, 100]);
  scanBarFg.transform.scale.setValueAtTime(t(530), [100, 100]);
  ez(scanBarFg.transform.scale);
  fadeIn(scanBarBg, 435, 8);

  var scanLabel = txt("Scanning dentalsmiles.co.ke...", 20, C.z400, 470, CY + 218, 435, 540, "regular");
  fadeIn(scanLabel, 435, 8); fadeOut(scanLabel, 534, 8);

  fadeOut(e_head, 535, 10);

  // ─────────────────────────────────────────────────────────────
  // SCENE 6: SCORE  (540–660f = 18–22s)
  // AI scores every lead. You focus on the 90s.
  // ─────────────────────────────────────────────────────────────

  var lbl6 = txt("03  SCORE", 24, C.red, 130, 68, 540, 660, "regular", 350);
  fadeIn(lbl6, 540, 10); fadeOut(lbl6, 656, 8);

  var s_head = txt("AI scores every lead.\nYou focus on\nthe 90s.", 82, C.white, 130, CY - 185, 550, 660, "black");
  fadeIn(s_head, 550, 14); slideUp(s_head, 550, 16, 30);

  // Score card
  var scoreCard = rect("score-card", 1400, CY + 20, 740, 520, C.z900, 20, 560, 660);
  fadeIn(scoreCard, 560, 12); slideLeft(scoreCard, 560, 16, 80);

  // Big score number
  var scoreNum = txtC("94", 220, C.green, 1400, CY - 150, 572, 660, "black");
  scoreNum.transform.anchorPoint.setValue([90, 0]);
  popIn(scoreNum, 572, 18);

  var scoreOf = txt("/ 100", 44, C.z600, 1460, CY - 85, 580, 660, "light");
  fadeIn(scoreOf, 580, 10);

  // Score bar bg + fill
  var sBarBg = rect("s-bar-bg", 1400, CY - 10, 640, 10, C.z700, 5, 576, 660);
  var sBarFg = rect("s-bar-fg", 1083, CY - 10, 640, 10, C.green, 5, 580, 660);
  sBarFg.transform.anchorPoint.setValue([-320, 0]);
  sBarFg.transform.scale.setValueAtTime(t(580), [0, 100]);
  sBarFg.transform.scale.setValueAtTime(t(614), [94, 100]);
  ez(sBarFg.transform.scale);
  fadeIn(sBarBg, 576, 8);

  // Score signals chips
  var signals = [
    { text: "Booking gap",         col: C.red   },
    { text: "High review volume",  col: C.green },
    { text: "Established 2014",    col: C.amber },
    { text: "Expanding",           col: C.amber },
  ];

  for (var sg = 0; sg < signals.length; sg++) {
    var sgX   = sg < 2 ? 1217 + sg * 200 : 1217 + (sg - 2) * 200;
    var sgY   = sg < 2 ? CY + 50          : CY + 110;
    var sgIn  = 590 + sg * 8;
    var s_    = signals[sg];

    var sgBg = rect("sig-bg-" + sg, sgX, sgY, 170, 32, C.z800, 16, sgIn, 660);
    fadeIn(sgBg, sgIn, 6); popIn(sgBg, sgIn, 8);

    var sgTxt = txt(s_.text, 17, s_.col, sgX - 77, sgY - 12, sgIn, 660, "bold");
    fadeIn(sgTxt, sgIn + 2, 6);
  }

  // AI reasoning snippet
  var reasonBox = rect("reason-box", 1400, CY + 210, 640, 130, C.z800, 10, 600, 660);
  fadeIn(reasonBox, 600, 10);

  var reasonTxt = txt("4.9★ with 312 reviews — very busy.\nNo booking system = appointments lost every\nnight. Established 10 years. Strong candidate.", 20, C.z300, 1100, CY + 162, 604, 660, "regular");
  fadeIn(reasonTxt, 604, 10);

  fadeOut(s_head, 655, 10);

  // ─────────────────────────────────────────────────────────────
  // SCENE 7: CONTACTS  (660–750f = 22–25s)
  // Skip the front desk. Reach the decision maker.
  // ─────────────────────────────────────────────────────────────

  var lbl7 = txt("04  CONTACTS", 24, C.red, 130, 68, 660, 750, "regular", 350);
  fadeIn(lbl7, 660, 10); fadeOut(lbl7, 746, 8);

  var c_head = txt("Skip the front desk.\nReach the decision\nmaker directly.", 82, C.white, 130, CY - 185, 670, 750, "black");
  fadeIn(c_head, 670, 14); slideUp(c_head, 670, 16, 30);

  // Contact cards
  var contacts = [
    { name: "Dr. Amina Hassan", title: "Clinical Director",  src: "About Page",  conf: "HIGH",   initial: "AH", confC: C.green },
    { name: "James Mwangi",     title: "Practice Manager",   src: "Instagram",   conf: "MEDIUM", initial: "JM", confC: C.amber },
  ];

  for (var ci = 0; ci < contacts.length; ci++) {
    var cX   = 1140 + ci * 480;
    var cIn  = 680 + ci * 18;
    var con  = contacts[ci];

    var cCard = rect("c-card-" + ci, cX, CY + 20, 420, 200, C.z800, 16, cIn, 750);
    fadeIn(cCard, cIn, 10);
    cCard.transform.position.setValueAtTime(t(cIn),      [cX, CY + 60]);
    cCard.transform.position.setValueAtTime(t(cIn + 14), [cX, CY + 20]);
    ez(cCard.transform.position);

    // Avatar circle
    var avBg = rect("av-bg-" + ci, cX - 155, CY - 52, 50, 50, C.z700, 25, cIn, 750);
    fadeIn(avBg, cIn, 8);

    var avTxt = txtC(con.initial, 20, C.z300, cX - 155, CY - 68, cIn, 750, "bold");
    avTxt.transform.anchorPoint.setValue([16, 0]);
    fadeIn(avTxt, cIn, 8);

    var cName = txt(con.name, 28, C.z100, cX - 122, CY - 68, cIn + 4, 750, "bold");
    var cTitle = txt(con.title, 21, C.z400, cX - 122, CY - 38, cIn + 4, 750, "regular");
    fadeIn(cName, cIn + 4, 8); fadeIn(cTitle, cIn + 4, 8);

    // Source badge
    var srcBadge = rect("src-bdg-" + ci, cX - 85, CY + 50, 190, 28, C.z700, 14, cIn + 6, 750);
    fadeIn(srcBadge, cIn + 6, 6);
    var srcTxt = txt("From: " + con.src, 17, con.confC, cX - 177, CY + 40, cIn + 6, 750, "regular");
    fadeIn(srcTxt, cIn + 6, 6);

    // Confidence badge
    var confBadge = rect("conf-bdg-" + ci, cX + 155, CY - 76, 70, 24, con.confC, 4, cIn + 8, 750);
    fadeIn(confBadge, cIn + 8, 6);
    popIn(confBadge, cIn + 8, 8);
    var confTxt = txtC(con.conf, 13, C.bg, cX + 155, CY - 87, cIn + 8, 750, "black", 200);
    confTxt.transform.anchorPoint.setValue([20, 0]);
    fadeIn(confTxt, cIn + 8, 6);
  }

  // Corroboration notice
  var corrNote = txt("⚡ Same name found on About Page + Instagram — confidence upgraded to HIGH", 22, C.green, 900, CY + 175, 716, 750, "regular");
  fadeIn(corrNote, 716, 10);

  fadeOut(c_head, 745, 8);

  // ─────────────────────────────────────────────────────────────
  // SCENE 8: OUTREACH  (750–840f = 25–28s)
  // AI writes the opener — personalised, instant.
  // ─────────────────────────────────────────────────────────────

  var lbl8 = txt("05  OUTREACH", 24, C.red, 130, 68, 750, 840, "regular", 350);
  fadeIn(lbl8, 750, 10); fadeOut(lbl8, 836, 8);

  var o_head = txt("AI writes the perfect\nopener. Personalised.\nInstant.", 82, C.white, 130, CY - 185, 760, 840, "black");
  fadeIn(o_head, 760, 14); slideUp(o_head, 760, 16, 30);

  // WhatsApp UI chrome
  var waChrome = rect("wa-chrome", 1380, CY - 30, 780, 420, C.z900, 18, 768, 840);
  fadeIn(waChrome, 768, 12); slideLeft(waChrome, 768, 15, 70);

  // WA header bar
  var waHdr = rect("wa-hdr", 1380, CY - 218, 780, 60, C.z800, 0, 770, 840);
  fadeIn(waHdr, 770, 8);
  var waContact = txt("Dr. Amina Hassan  •  Clinical Director", 22, C.z100, 1010, CY - 236, 772, 840, "bold");
  fadeIn(waContact, 772, 8);

  // Message bubble
  var waBubble = rect("wa-bubble", 1380, CY - 40, 700, 200, C.wa, 18, 778, 840);
  fadeIn(waBubble, 778, 10);
  popIn(waBubble, 778, 14);

  var waText = txt("Hi Dr. Amina, noticed Dental Smiles\ndoesn't have online booking — your\n4.9★ rating is losing appointments\nevery night. 2 minutes to fix that?", 26, C.white, 1000, CY - 124, 782, 840, "regular");
  fadeIn(waText, 782, 10);

  // Timestamp + ticks
  var waMeta = txt("10:42 AM  ✓✓", 16, [0.4, 1.0, 0.5], 1690, CY + 52, 790, 840, "regular");
  fadeIn(waMeta, 790, 8);

  // Email tab below
  var emailTab = rect("email-tab", 1380, CY + 155, 780, 76, C.z800, 0, 796, 840);
  fadeIn(emailTab, 796, 8);
  var emailSubj = txt("Missing booking system at Dental Smiles?", 20, C.z300, 1008, CY + 135, 798, 840, "bold");
  var emailPrev = txt("Hi Dr. Hassan, your 4.9★ rating with 312 patients means you’re...", 18, C.z600, 1008, CY + 157, 798, 840, "regular");
  fadeIn(emailSubj, 798, 8); fadeIn(emailPrev, 798, 8);

  // Action buttons
  var copyBtn = rect("copy-btn", 1228, CY + 260, 120, 38, C.z700, 8, 806, 840);
  var copyTxt = txt("Copy", 18, C.z300, 1176, CY + 246, 806, 840, "regular");
  var sendBtn = rect("send-btn", 1468, CY + 260, 180, 38, C.red, 8, 806, 840);
  var sendTxt = txt("Send via WA", 18, C.white, 1386, CY + 246, 806, 840, "bold");
  fadeIn(copyBtn, 806, 8); fadeIn(copyTxt, 806, 8);
  fadeIn(sendBtn, 806, 8); popIn(sendBtn, 806, 10);
  fadeIn(sendTxt, 808, 6);

  fadeOut(o_head, 836, 8);

  // ─────────────────────────────────────────────────────────────
  // SCENE 9: CTA  (840–900f = 28–30s)
  // Start free today.
  // ─────────────────────────────────────────────────────────────

  // Red gradient wash
  var ctaWash = solid("cta-wash", C.red, 840, 900);
  ctaWash.transform.opacity.setValueAtTime(t(840), 0);
  ctaWash.transform.opacity.setValueAtTime(t(852), 12);
  ez(ctaWash.transform.opacity);

  var cta1 = txtC("Start closing better deals.", 108, C.white, CX, CY - 115, 840, 900, "black");
  cta1.transform.anchorPoint.setValue([cta1.sourceRectAtTime(t(842), false).width / 2, 0]);
  scaleUp(cta1, 840, 16);
  fadeIn(cta1, 840, 12);

  var cta2 = txtC("Today. Free.", 108, C.red, CX, CY - 5, 848, 900, "black");
  cta2.transform.anchorPoint.setValue([cta2.sourceRectAtTime(t(850), false).width / 2, 0]);
  scaleUp(cta2, 848, 16);
  fadeIn(cta2, 848, 10);

  // Divider
  var ctaDivider = rect("cta-div", CX, CY + 70, 560, 2, C.z700, 1, 856, 900);
  ctaDivider.transform.scale.setValueAtTime(t(856), [0, 100]);
  ctaDivider.transform.scale.setValueAtTime(t(870), [100, 100]);
  ez(ctaDivider.transform.scale);

  var ctaUrl = txtC("hunter.dullugroup.co.ke", 52, C.white, CX, CY + 96, 860, 900, "bold", 40);
  ctaUrl.transform.anchorPoint.setValue([ctaUrl.sourceRectAtTime(t(862), false).width / 2, 0]);
  fadeIn(ctaUrl, 860, 12);

  // Pipeline pills
  var pills = ["DISCOVER", "ENRICH", "SCORE", "OUTREACH"];
  var pillStartX = CX - 280;
  for (var pp = 0; pp < pills.length; pp++) {
    var ppX  = pillStartX + pp * 200;
    var ppIn = 868 + pp * 6;

    var ppBg = rect("pp-bg-" + pp, ppX, CY + 175, 170, 32, C.z800, 16, ppIn, 900);
    fadeIn(ppBg, ppIn, 6); popIn(ppBg, ppIn, 8);

    var ppTxt = txtC(pills[pp], 16, C.z400, ppX, CY + 163, ppIn, 900, "regular", 250);
    ppTxt.transform.anchorPoint.setValue([ppTxt.sourceRectAtTime(t(ppIn + 2), false).width / 2, 0]);
    fadeIn(ppTxt, ppIn + 2, 6);
  }

  // Final hairline pulse (scale to 0 to give a "blink" feel at the end)
  hairline.transform.scale.setValueAtTime(t(894), [100, 100]);
  hairline.transform.scale.setValueAtTime(t(897), [0, 100]);
  hairline.transform.scale.setValueAtTime(t(900), [100, 100]);

  // ─────────────────────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────────────────────

  app.endUndoGroup();

  comp.openInViewer();

  alert(
    "Hunter_30s_Ad_v1 created successfully!\n\n" +
    "30 seconds  ·  1920×1080  ·  30fps\n\n" +
    "SCENES:\n" +
    "  00:00–00:03  Hook — Pain statement\n" +
    "  00:03–00:06  Pain — 3 wasted activities\n" +
    "  00:06–00:09  Brand reveal — HUNTER wordmark\n" +
    "  00:09–00:14  Discover — Leads table\n" +
    "  00:14–00:18  Enrich — Data extraction\n" +
    "  00:18–00:22  Score — AI scoring card\n" +
    "  00:22–00:25  Contacts — Decision maker cards\n" +
    "  00:25–00:28  Outreach — WhatsApp + Email\n" +
    "  00:28–00:30  CTA — hunter.dullugroup.co.ke\n\n" +
    "NEXT STEPS:\n" +
    "  1. Install Inter font (rsms.me/inter)\n" +
    "  2. Add background music + scene whooshes\n" +
    "  3. Enable Motion Blur on all animated layers\n" +
    "  4. Add a subtle grain effect (2–3%)\n" +
    "  5. Render: H.264 · Best Quality\n"
  );

})();
