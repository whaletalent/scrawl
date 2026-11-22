/**
 * Split Body characters. One player draws head and torso (y < 300), the other
 * legs and feet (y > 300); neither sees the other's half, so the two are
 * deliberately unrelated and only roughly meet at the waist (x ≈ 300–500).
 *
 * Lines that should reach the waist are aimed past it (y = 312 from above,
 * 288 from below): the game stops them at the border, which is what keeps a
 * shape closed for the bucket.
 */
import { INK, type Pen } from "../lib/pen";

const {
  black: K,
  white: W,
  red: R,
  orange: O,
  yellow: Y,
  green: G,
  blue: B,
  grey: GR,
  brown: BR,
  teal: T,
} = INK;

export interface SplitDesign {
  top: string;
  bottom: string;
  drawTop: (p: Pen) => Promise<void>;
  drawBottom: (p: Pen) => Promise<void>;
}

async function pirate(p: Pen) {
  await p.ink(K, 8);
  await p.o(400, 110, 88, 80);
  await p.l(304, 92, 496, 84);
  await p.fill(400, 55, R);
  await p.ink(K, 8);
  await p.o(506, 78, 17, 13);
  await p.s(518, 86, 545, 110, 540, 135);
  await p.s(512, 90, 520, 120, 505, 140);
  await p.fill(506, 78, R);
  // eye patch, good eye, grin
  await p.ink(K, 4);
  await p.l(322, 100, 478, 138);
  await p.ink(K, 16);
  await p.dot(362, 120, 12);
  await p.ink(K, 8);
  await p.dot(436, 118, 5);
  await p.s(352, 150, 398, 170, 448, 146);
  await p.ink(BR, 8);
  await p.l(330, 158, 345, 190, 362, 168, 380, 196, 400, 174);
  await p.l(400, 174, 420, 196, 438, 168, 455, 190, 470, 156);
  // striped shirt
  await p.ink(K, 8);
  await p.s(345, 186, 312, 200, 304, 250, 298, 312);
  await p.s(455, 186, 488, 200, 498, 250, 503, 312);
  await p.ink(B, 16);
  await p.l(318, 222, 484, 220);
  await p.l(312, 258, 490, 256);
  await p.l(308, 290, 494, 288);
  await p.mark();
  // arms: one waving, one with a sword
  await p.ink(B, 16);
  await p.s(308, 215, 235, 252, 172, 208);
  await p.s(494, 215, 565, 250, 628, 205);
  await p.ink(K, 8);
  await p.o(152, 196, 19, 18);
  await p.o(646, 194, 19, 18);
  await p.ink(GR, 8);
  await p.l(652, 176, 716, 52);
  await p.l(664, 180, 726, 60, 716, 52);
  await p.ink(Y, 8);
  await p.l(628, 160, 682, 190);
}

async function robot(p: Pen) {
  await p.ink(K, 8);
  await p.l(398, 40, 396, 14);
  await p.l(318, 42, 482, 38, 486, 170, 316, 174, 318, 42);
  await p.fill(400, 150, GR);
  await p.ink(R, 16);
  await p.dot(396, 12, 6);
  await p.ink(Y, 16);
  await p.dot(362, 92, 14);
  await p.dot(440, 90, 11);
  await p.ink(K, 8);
  await p.dot(365, 94, 3);
  await p.dot(438, 92, 3);
  await p.ink(W, 16);
  await p.l(352, 142, 450, 140);
  await p.ink(K, 4);
  await p.l(372, 132, 372, 152);
  await p.l(398, 131, 399, 151);
  await p.l(426, 130, 427, 150);
  await p.mark();
  // boxy chest
  await p.ink(K, 8);
  await p.l(386, 174, 385, 192);
  await p.l(416, 174, 417, 192);
  await p.l(296, 312, 288, 192, 512, 188, 506, 312);
  await p.fill(400, 250, B);
  await p.ink(Y, 16);
  await p.dot(346, 232, 9);
  await p.ink(R, 16);
  await p.dot(400, 230, 9);
  await p.ink(G, 16);
  await p.dot(454, 232, 9);
  await p.ink(W, 8);
  await p.l(340, 272, 462, 270);
  // bendy arms with claws
  await p.ink(GR, 16);
  await p.l(286, 212, 218, 218, 212, 150);
  await p.l(514, 210, 584, 214, 590, 146);
  await p.ink(K, 8);
  await p.s(212, 140, 186, 118, 196, 92);
  await p.s(212, 140, 238, 118, 230, 92);
  await p.s(590, 136, 564, 114, 572, 88);
  await p.s(590, 136, 616, 114, 608, 88);
  await p.ink(Y, 8);
  await p.l(96, 60, 120, 90, 92, 96, 122, 128);
  await p.l(700, 50, 676, 82, 706, 88, 680, 120);
}

async function king(p: Pen) {
  await p.ink(K, 8);
  await p.l(322, 88, 314, 22, 360, 56, 400, 12, 440, 56, 487, 22, 478, 88);
  await p.l(316, 88, 484, 86);
  await p.fill(400, 60, Y);
  await p.ink(K, 8);
  await p.s(322, 88, 316, 135, 350, 186, 400, 198, 450, 186, 484, 135, 478, 88);
  await p.ink(R, 16);
  await p.dot(400, 62, 6);
  await p.ink(B, 16);
  await p.dot(346, 68, 4);
  await p.dot(454, 68, 4);
  await p.ink(K, 8);
  await p.dot(368, 114, 5);
  await p.dot(432, 112, 5);
  await p.ink(BR, 16);
  await p.s(400, 150, 360, 142, 326, 166);
  await p.s(400, 150, 440, 142, 474, 166);
  await p.ink(O, 8);
  await p.o(400, 134, 10, 9);
  await p.mark();
  // robe
  await p.ink(K, 8);
  await p.s(350, 188, 316, 202, 306, 250, 299, 312);
  await p.s(450, 188, 484, 202, 494, 250, 501, 312);
  await p.fill(400, 255, R);
  await p.ink(W, 16);
  await p.l(400, 206, 401, 296);
  await p.ink(K, 4);
  await p.dot(400, 222, 2);
  await p.dot(401, 250, 2);
  await p.dot(400, 278, 2);
  // arms and sceptre
  await p.ink(R, 16);
  await p.s(310, 218, 245, 252, 190, 218);
  await p.s(492, 218, 556, 252, 612, 220);
  await p.ink(K, 8);
  await p.o(172, 208, 18, 17);
  await p.o(630, 210, 18, 17);
  await p.ink(Y, 8);
  await p.l(634, 248, 646, 104);
  await p.ink(K, 8);
  await p.o(648, 78, 24, 24);
  await p.fill(648, 78, T);
}

async function alien(p: Pen) {
  await p.ink(K, 4);
  await p.l(356, 40, 322, 10);
  await p.l(444, 40, 480, 8);
  await p.ink(K, 8);
  await p.s(
    400,
    24,
    478,
    40,
    508,
    100,
    462,
    168,
    400,
    196,
    338,
    168,
    292,
    100,
    322,
    40,
    400,
    24,
  );
  await p.fill(400, 160, G);
  await p.ink(Y, 16);
  await p.dot(320, 10, 5);
  await p.dot(482, 8, 5);
  await p.ink(K, 8);
  await p.o(344, 104, 20, 26);
  await p.o(400, 76, 19, 24);
  await p.o(456, 104, 20, 26);
  await p.fill(344, 104, W);
  await p.fill(400, 76, W);
  await p.fill(456, 104, W);
  await p.ink(K, 8);
  await p.dot(348, 110, 5);
  await p.dot(402, 82, 5);
  await p.dot(452, 108, 5);
  await p.ink(K, 4);
  await p.s(372, 158, 400, 170, 430, 154);
  await p.mark();
  // space suit
  await p.ink(K, 8);
  await p.s(346, 178, 318, 230, 300, 312);
  await p.s(454, 178, 482, 230, 500, 312);
  await p.fill(400, 260, T);
  await p.ink(Y, 8);
  await p.l(400, 228, 410, 250, 432, 252, 414, 266, 420, 288);
  await p.l(
    420,
    288,
    400,
    274,
    380,
    288,
    386,
    266,
    368,
    252,
    390,
    250,
    400,
    228,
  );
  // noodle arms
  await p.ink(G, 8);
  await p.s(322, 238, 262, 216, 222, 258, 168, 226);
  await p.s(478, 238, 540, 268, 588, 226, 640, 246);
  await p.l(168, 226, 140, 204);
  await p.l(168, 226, 136, 232);
  await p.l(168, 226, 148, 254);
  await p.l(640, 246, 668, 222);
  await p.l(640, 246, 674, 250);
  await p.l(640, 246, 660, 274);
  await p.ink(Y, 8);
  await p.l(110, 70, 110, 110);
  await p.l(90, 90, 130, 90);
  await p.l(690, 100, 690, 140);
  await p.l(670, 120, 710, 120);
  await p.ink(R, 8);
  await p.o(210, 70, 26, 24);
  await p.ink(O, 4);
  await p.s(172, 78, 210, 62, 250, 66);
}

async function pigtails(p: Pen) {
  await p.ink(K, 8);
  await p.o(400, 116, 82, 76);
  await p.ink(O, 16);
  await p.l(326, 82, 344, 48, 362, 80, 382, 40, 400, 78, 420, 40, 440, 80);
  await p.l(440, 80, 458, 48, 474, 84);
  await p.s(318, 96, 262, 70, 224, 104, 236, 150, 276, 162, 300, 134, 268, 112);
  await p.s(482, 96, 538, 70, 576, 104, 564, 150, 524, 162, 500, 134, 532, 112);
  await p.z(236, 92, 296, 148, 16);
  await p.z(506, 92, 566, 148, 16);
  await p.ink(R, 8);
  await p.l(306, 84, 286, 100, 306, 112, 306, 84);
  await p.l(494, 84, 514, 100, 494, 112, 494, 84);
  await p.ink(K, 8);
  await p.o(370, 112, 9, 13);
  await p.o(430, 110, 9, 13);
  await p.ink(R, 8);
  await p.s(352, 142, 400, 176, 448, 140);
  await p.ink(O, 4);
  await p.dot(346, 132, 2);
  await p.dot(360, 138, 2);
  await p.dot(442, 136, 2);
  await p.dot(456, 130, 2);
  await p.mark();
  // dress
  await p.ink(K, 8);
  await p.s(354, 186, 322, 240, 300, 312);
  await p.s(446, 186, 478, 240, 500, 312);
  await p.fill(400, 255, Y);
  await p.ink(R, 16);
  await p.dot(366, 236, 5);
  await p.dot(430, 228, 5);
  await p.dot(398, 270, 5);
  await p.dot(456, 276, 5);
  await p.dot(340, 280, 5);
  // arms up, one balloon
  await p.ink(K, 8);
  await p.s(328, 236, 254, 204, 204, 136);
  await p.s(472, 236, 546, 206, 600, 140);
  await p.o(196, 122, 15, 15);
  await p.o(608, 126, 15, 15);
  await p.ink(K, 4);
  await p.s(616, 112, 640, 90, 664, 104);
  await p.ink(K, 8);
  await p.o(676, 62, 36, 42);
  await p.fill(676, 62, B);
  await p.ink(W, 8);
  await p.s(660, 44, 656, 56, 660, 68);
}

async function bear(p: Pen) {
  await p.ink(K, 8);
  await p.o(326, 52, 28, 27);
  await p.o(474, 50, 28, 27);
  await p.o(400, 116, 92, 80);
  await p.fill(400, 180, BR);
  await p.fill(312, 38, BR);
  await p.fill(488, 36, BR);
  await p.ink(K, 8);
  await p.o(400, 142, 38, 29);
  await p.fill(400, 160, W);
  await p.ink(K, 16);
  await p.dot(400, 130, 6);
  await p.dot(364, 96, 4);
  await p.dot(436, 94, 4);
  await p.ink(K, 4);
  await p.s(382, 152, 400, 160, 400, 142);
  await p.s(400, 160, 418, 152);
  await p.mark();
  // sweater
  await p.ink(K, 8);
  await p.s(338, 180, 312, 236, 298, 312);
  await p.s(462, 180, 488, 236, 503, 312);
  await p.fill(400, 255, G);
  await p.ink(Y, 16);
  await p.l(322, 236, 478, 234);
  await p.l(314, 274, 488, 272);
  await p.ink(G, 16);
  await p.s(318, 216, 246, 240, 204, 276);
  await p.s(484, 214, 556, 214, 598, 160);
  await p.ink(K, 8);
  await p.o(190, 278, 19, 15);
  await p.fill(190, 278, BR);
  // honey pot
  await p.ink(K, 8);
  await p.l(572, 150, 578, 92, 652, 90, 658, 150, 572, 150);
  await p.fill(615, 125, Y);
  await p.ink(O, 8);
  await p.s(580, 92, 596, 110, 606, 96, 622, 118, 636, 96, 650, 106);
  await p.ink(K, 4);
  await p.o(700, 60, 8, 6);
  await p.s(690, 54, 700, 44, 710, 54);
  await p.o(730, 120, 8, 6);
  await p.s(720, 114, 730, 104, 740, 114);
}

async function chickenLegs(p: Pen) {
  await p.ink(K, 8);
  await p.l(296, 288, 288, 378);
  await p.l(504, 288, 512, 378);
  await p.l(
    288,
    378,
    316,
    402,
    344,
    376,
    372,
    404,
    400,
    378,
    428,
    404,
    456,
    376,
  );
  await p.l(456, 376, 484, 402, 512, 378);
  await p.fill(400, 340, Y);
  await p.ink(O, 4);
  await p.s(330, 330, 340, 344, 352, 330);
  await p.s(420, 350, 432, 364, 444, 350);
  await p.s(380, 320, 390, 332, 402, 320);
  await p.s(450, 322, 460, 334, 472, 322);
  await p.mark();
  await p.ink(O, 8);
  await p.l(350, 398, 344, 538);
  await p.l(450, 398, 458, 538);
  await p.l(344, 538, 298, 572);
  await p.l(344, 538, 346, 584);
  await p.l(344, 538, 392, 572);
  await p.l(458, 538, 412, 574);
  await p.l(458, 538, 460, 584);
  await p.l(458, 538, 506, 570);
  await p.ink(O, 4);
  await p.l(336, 440, 356, 440);
  await p.l(336, 470, 356, 470);
  await p.l(336, 500, 356, 500);
  await p.l(448, 440, 468, 440);
  await p.l(448, 470, 468, 470);
  await p.l(448, 500, 468, 500);
  // an egg and some grass
  await p.ink(K, 8);
  await p.o(640, 530, 44, 54);
  await p.ink(BR, 8);
  await p.dot(626, 512, 3);
  await p.dot(656, 540, 3);
  await p.dot(632, 556, 3);
  await p.ink(G, 8);
  await p.l(40, 590, 60, 548, 78, 588, 96, 552, 116, 590, 136, 556, 152, 590);
  await p.l(170, 592, 188, 560, 206, 590, 226, 562, 244, 592);
  await p.l(540, 592, 556, 566, 572, 592);
  await p.l(700, 592, 718, 556, 736, 590, 754, 560, 772, 592);
}

async function mermaidTail(p: Pen) {
  await p.ink(K, 8);
  await p.s(300, 288, 312, 400, 362, 478, 392, 518);
  await p.s(500, 288, 490, 400, 440, 478, 410, 518);
  await p.l(388, 520, 414, 518);
  await p.fill(400, 380, G);
  await p.ink(K, 8);
  await p.s(392, 518, 330, 548, 290, 590, 366, 578, 402, 552);
  await p.s(410, 518, 472, 548, 512, 590, 438, 578, 402, 552);
  await p.fill(350, 566, T);
  await p.fill(452, 566, T);
  await p.mark();
  await p.ink(K, 4);
  await p.s(330, 330, 352, 350, 374, 330);
  await p.s(380, 330, 402, 350, 424, 330);
  await p.s(430, 330, 452, 350, 474, 330);
  await p.s(350, 372, 372, 392, 394, 372);
  await p.s(402, 372, 424, 392, 446, 372);
  await p.s(366, 414, 388, 434, 410, 414);
  await p.s(404, 414, 424, 432, 440, 414);
  await p.s(382, 456, 402, 474, 422, 456);
  // sea
  await p.ink(B, 8);
  await p.s(30, 380, 70, 360, 110, 380, 150, 360, 190, 380, 230, 360, 262, 376);
  await p.s(
    540,
    376,
    580,
    358,
    620,
    378,
    660,
    358,
    700,
    378,
    740,
    358,
    772,
    374,
  );
  await p.s(40, 460, 80, 440, 120, 460, 160, 440, 200, 460, 240, 440, 280, 458);
  await p.s(
    520,
    458,
    560,
    440,
    600,
    460,
    640,
    440,
    680,
    460,
    720,
    440,
    764,
    458,
  );
  await p.s(60, 540, 100, 520, 140, 540, 180, 520, 220, 540, 252, 524);
  await p.s(550, 536, 590, 520, 630, 540, 670, 520, 710, 540, 750, 522);
  await p.ink(O, 8);
  await p.s(610, 490, 640, 474, 670, 490, 640, 506, 610, 490);
  await p.l(670, 490, 692, 474, 690, 506, 670, 490);
  await p.ink(K, 4);
  await p.dot(628, 488, 2);
}

async function socksAndSandals(p: Pen) {
  await p.ink(K, 8);
  await p.l(296, 288, 280, 402, 394, 404, 400, 352);
  await p.l(400, 352, 406, 404, 520, 402, 504, 288);
  await p.fill(340, 350, T);
  await p.ink(Y, 8);
  await p.dot(320, 340, 4);
  await p.dot(366, 372, 4);
  await p.dot(440, 338, 4);
  await p.dot(480, 376, 4);
  await p.dot(410, 320, 4);
  await p.mark();
  // knobbly hairy legs
  await p.ink(K, 8);
  await p.s(304, 404, 314, 440, 304, 482);
  await p.s(374, 404, 362, 442, 370, 482);
  await p.s(428, 404, 438, 442, 430, 482);
  await p.s(498, 404, 486, 440, 496, 482);
  await p.ink(K, 2);
  for (const [x, y] of [
    [322, 420],
    [340, 444],
    [326, 464],
    [352, 418],
    [446, 422],
    [466, 446],
    [452, 466],
    [476, 420],
  ]) {
    await p.l(x, y, x + 6, y + 14);
  }
  // white socks with red bands, sandals
  await p.ink(K, 8);
  await p.l(302, 482, 300, 552, 376, 552, 372, 482, 302, 482);
  await p.l(428, 482, 426, 552, 502, 552, 498, 482, 428, 482);
  await p.ink(R, 8);
  await p.l(308, 498, 368, 498);
  await p.l(308, 514, 368, 514);
  await p.l(434, 498, 494, 498);
  await p.l(434, 514, 494, 514);
  await p.ink(BR, 16);
  await p.l(280, 566, 392, 566);
  await p.l(410, 566, 522, 566);
  await p.ink(O, 8);
  await p.s(300, 558, 336, 532, 376, 558);
  await p.s(426, 558, 464, 532, 502, 558);
  // beach
  await p.ink(Y, 8);
  await p.s(20, 584, 150, 574, 262, 588);
  await p.s(540, 588, 660, 574, 780, 584);
  await p.ink(R, 8);
  await p.o(660, 500, 40, 40);
  await p.ink(B, 8);
  await p.s(626, 480, 660, 500, 694, 480);
  await p.s(626, 520, 660, 500, 694, 520);
  await p.ink(O, 8);
  await p.l(110, 560, 132, 520, 154, 560, 110, 534, 156, 534, 110, 560);
}

async function cowboyLegs(p: Pen) {
  await p.ink(K, 8);
  await p.s(296, 288, 254, 400, 280, 494);
  await p.s(504, 288, 546, 400, 520, 494);
  await p.s(400, 336, 346, 410, 352, 494);
  await p.s(400, 336, 454, 410, 448, 494);
  await p.l(276, 494, 356, 494);
  await p.l(444, 494, 524, 494);
  await p.fill(400, 318, B);
  await p.ink(BR, 16);
  await p.l(300, 312, 500, 312);
  await p.ink(Y, 8);
  await p.o(400, 312, 15, 11);
  await p.mark();
  // boots
  await p.ink(K, 8);
  await p.l(280, 498, 276, 560, 228, 566, 228, 586, 356, 586, 352, 498);
  await p.l(448, 498, 444, 586, 572, 586, 572, 566, 524, 560, 520, 498);
  await p.fill(318, 540, BR);
  await p.fill(482, 540, BR);
  await p.ink(Y, 8);
  await p.l(362, 566, 386, 566);
  await p.o(392, 566, 8, 8);
  await p.l(438, 566, 414, 566);
  await p.ink(W, 4);
  await p.s(290, 516, 316, 526, 342, 516);
  await p.s(458, 516, 484, 526, 510, 516);
  // cactus and sun
  await p.ink(G, 16);
  await p.l(668, 588, 666, 430);
  await p.s(666, 520, 626, 516, 622, 470);
  await p.s(666, 490, 708, 486, 712, 446);
  await p.ink(O, 8);
  await p.o(110, 370, 38, 36);
  await p.l(110, 320, 110, 302);
  await p.l(160, 370, 184, 370);
  await p.l(60, 370, 36, 370);
  await p.l(146, 334, 162, 318);
  await p.l(74, 334, 58, 318);
  await p.l(146, 406, 162, 422);
  await p.l(74, 406, 58, 422);
  await p.ink(BR, 4);
  await p.s(20, 590, 130, 580, 220, 590);
  await p.s(580, 590, 700, 584, 790, 590);
}

async function tentacles(p: Pen) {
  await p.ink(O, 16);
  await p.s(322, 304, 252, 380, 152, 400, 108, 478, 160, 540);
  await p.s(334, 310, 262, 392, 166, 412, 124, 478, 168, 528);
  await p.s(362, 304, 330, 420, 260, 498, 282, 566);
  await p.s(376, 306, 344, 426, 276, 500, 296, 560);
  await p.s(398, 304, 400, 440, 380, 520, 422, 578);
  await p.s(412, 306, 414, 440, 396, 516, 434, 568);
  await p.mark();
  await p.s(440, 304, 480, 420, 540, 498, 512, 566);
  await p.s(426, 306, 466, 426, 524, 500, 500, 558);
  await p.s(478, 304, 558, 380, 650, 400, 692, 478, 640, 540);
  await p.s(466, 310, 546, 392, 636, 412, 676, 478, 632, 528);
  await p.ink(O, 16);
  await p.l(312, 306, 490, 306);
  // suckers
  await p.ink(R, 8);
  for (const [x, y] of [
    [270, 372],
    [200, 398],
    [136, 440],
    [124, 492],
    [338, 400],
    [300, 460],
    [276, 520],
    [404, 380],
    [402, 450],
    [392, 512],
    [468, 400],
    [506, 460],
    [524, 520],
    [530, 372],
    [600, 398],
    [664, 440],
    [676, 492],
  ]) {
    await p.dot(x, y, 3);
  }
  // sea floor
  await p.ink(T, 8);
  await p.s(20, 380, 50, 366, 80, 380);
  await p.s(700, 340, 730, 326, 760, 340);
  await p.ink(T, 4);
  await p.o(60, 470, 10, 10);
  await p.o(84, 430, 6, 6);
  await p.o(740, 420, 10, 10);
  await p.o(720, 470, 6, 6);
  await p.ink(Y, 8);
  await p.s(20, 590, 200, 582, 400, 592, 600, 582, 780, 590);
}

async function rocket(p: Pen) {
  await p.ink(K, 8);
  await p.l(300, 288, 290, 470, 510, 470, 500, 288);
  await p.fill(400, 330, GR);
  await p.ink(K, 8);
  await p.l(304, 392, 220, 502, 298, 468);
  await p.l(496, 392, 580, 502, 502, 468);
  await p.fill(268, 462, R);
  await p.fill(532, 462, R);
  await p.ink(K, 8);
  await p.o(400, 372, 36, 34);
  await p.fill(400, 372, T);
  await p.ink(W, 4);
  await p.s(382, 362, 388, 352, 400, 350);
  await p.ink(R, 8);
  await p.l(300, 440, 500, 440);
  await p.mark();
  // flames
  await p.ink(O, 8);
  await p.l(
    312,
    474,
    330,
    560,
    364,
    512,
    400,
    592,
    436,
    512,
    470,
    560,
    488,
    474,
  );
  await p.fill(400, 500, O);
  await p.ink(Y, 8);
  await p.l(362, 476, 380, 522, 400, 548, 420, 522, 440, 476);
  await p.fill(400, 500, Y);
  // smoke and stars
  await p.ink(GR, 4);
  await p.o(210, 560, 34, 26);
  await p.o(160, 540, 28, 22);
  await p.o(250, 580, 22, 16);
  await p.o(590, 560, 34, 26);
  await p.o(640, 540, 28, 22);
  await p.o(550, 580, 22, 16);
  await p.ink(Y, 8);
  await p.l(90, 360, 90, 400);
  await p.l(70, 380, 110, 380);
  await p.l(710, 350, 710, 390);
  await p.l(690, 370, 730, 370);
  await p.l(140, 440, 140, 464);
  await p.l(128, 452, 152, 452);
  await p.l(660, 440, 660, 464);
  await p.l(648, 452, 672, 452);
}

export const SPLIT_DESIGNS: SplitDesign[] = [
  {
    top: "pirata",
    bottom: "pernas de galinha",
    drawTop: pirate,
    drawBottom: chickenLegs,
  },
  {
    top: "robô",
    bottom: "cauda de sereia",
    drawTop: robot,
    drawBottom: mermaidTail,
  },
  {
    top: "rei bigodudo",
    bottom: "meia com sandália",
    drawTop: king,
    drawBottom: socksAndSandals,
  },
  {
    top: "alienígena",
    bottom: "pernas de caubói",
    drawTop: alien,
    drawBottom: cowboyLegs,
  },
  {
    top: "menina de maria-chiquinha",
    bottom: "tentáculos de polvo",
    drawTop: pigtails,
    drawBottom: tentacles,
  },
  {
    top: "urso de suéter",
    bottom: "foguete",
    drawTop: bear,
    drawBottom: rocket,
  },
];
