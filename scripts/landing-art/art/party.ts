/**
 * Party drawings. A pair shares one theme: one player gets the left half of
 * the sheet (x < 400), the other the right half, and neither sees the other's
 * side until the reveal. So each theme is two drawings by two different
 * hands — different colours, different care — that only roughly line up.
 *
 * Lines that should reach the middle are aimed past it (x = 414 from the left,
 * 386 from the right): the game stops them at the border, which is what keeps
 * a shape closed for the bucket.
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

export interface PartyDesign {
  theme: string;
  left: (p: Pen) => Promise<void>;
  right: (p: Pen) => Promise<void>;
}

async function star(p: Pen, x: number, y: number, r = 16) {
  await p.l(x, y - r, x, y + r);
  await p.l(x - r, y, x + r, y);
}

const astronautCat: PartyDesign = {
  theme: "gato astronauta",
  async left(p) {
    await p.ink(K, 8);
    await p.o(215, 290, 120, 112);
    await p.l(128, 214, 110, 128, 192, 184);
    await p.l(244, 182, 320, 128, 306, 216);
    await p.fill(215, 370, O);
    await p.fill(132, 168, O);
    await p.fill(296, 164, O);
    await p.ink(K, 8);
    await p.o(170, 270, 17, 23);
    await p.o(256, 268, 17, 23);
    await p.fill(170, 280, W, { max: 3000 });
    await p.fill(256, 278, W, { max: 3000 });
    await p.ink(K, 8);
    await p.dot(174, 274, 4);
    await p.dot(252, 272, 4);
    await p.ink(R, 8);
    await p.dot(213, 310, 5);
    await p.ink(K, 4);
    await p.s(188, 326, 202, 340, 213, 322);
    await p.s(213, 322, 226, 340, 240, 326);
    await p.l(150, 316, 66, 300);
    await p.l(150, 330, 68, 338);
    await p.l(278, 316, 360, 298);
    await p.l(278, 330, 360, 340);
    // helmet and the start of the suit
    await p.ink(T, 8);
    await p.o(215, 282, 168, 162);
    await p.ink(T, 4);
    await p.s(296, 160, 340, 200, 356, 250);
    await p.mark();
    await p.ink(K, 8);
    await p.l(376, 332, 414, 330);
    await p.l(350, 396, 414, 432);
    await p.ink(Y, 8);
    await star(p, 56, 66);
    await star(p, 340, 56, 12);
    await star(p, 60, 510, 12);
    await star(p, 300, 530);
    await p.ink(R, 8);
    await p.o(150, 540, 26, 24);
  },
  async right(p) {
    await p.ink(K, 8);
    await p.s(
      386,
      328,
      480,
      300,
      600,
      318,
      652,
      380,
      600,
      440,
      480,
      452,
      386,
      442,
    );
    await p.l(482, 302, 486, 238, 592, 244, 586, 316);
    await p.fill(536, 276, R, { max: 12000 });
    await p.ink(K, 8);
    await p.s(450, 448, 444, 512, 472, 516, 480, 452);
    await p.s(560, 446, 560, 512, 590, 514, 592, 442);
    await p.fill(462, 490, O, { max: 5000 });
    await p.fill(576, 490, O, { max: 5000 });
    await p.mark();
    await p.ink(B, 16);
    await p.l(420, 384, 630, 380);
    await p.ink(Y, 16);
    await p.dot(520, 382, 6);
    await p.ink(O, 16);
    await p.s(650, 380, 722, 360, 742, 290, 700, 250, 730, 208);
    // jet flame, moon, planet
    await p.ink(O, 8);
    await p.l(592, 256, 660, 240, 630, 268, 676, 282, 592, 296);
    await p.ink(K, 8);
    await p.o(704, 96, 52, 50);
    await p.fill(704, 96, Y, { max: 12000 });
    await p.ink(K, 4);
    await p.o(690, 80, 10, 9);
    await p.o(722, 112, 13, 11);
    await p.o(700, 124, 6, 6);
    await p.ink(R, 8);
    await p.o(480, 120, 34, 32);
    await p.ink(T, 4);
    await p.s(424, 138, 480, 118, 540, 96);
    await p.ink(Y, 8);
    await star(p, 580, 60, 12);
    await star(p, 440, 540);
    await star(p, 740, 480, 12);
    await star(p, 660, 540, 10);
  },
};

const pizzaWithLegs: PartyDesign = {
  theme: "pizza com pernas",
  async left(p) {
    await p.ink(BR, 16);
    await p.s(
      414,
      52,
      300,
      70,
      225,
      150,
      208,
      240,
      225,
      330,
      300,
      410,
      414,
      430,
    );
    await p.fill(320, 240, Y);
    await p.ink(R, 16);
    await p.dot(290, 150, 12);
    await p.dot(262, 268, 12);
    await p.dot(340, 350, 12);
    await p.mark();
    await p.ink(K, 8);
    await p.o(250, 200, 8, 8);
    await p.o(300, 380, 8, 8);
    await p.o(366, 110, 8, 8);
    await p.ink(W, 16);
    await p.dot(338, 216, 14);
    await p.ink(K, 8);
    await p.o(338, 216, 23, 27);
    await p.dot(344, 224, 5);
    await p.s(318, 296, 358, 328, 414, 338);
    // arm, leg, sneaker
    await p.s(214, 250, 150, 232, 110, 182);
    await p.o(100, 166, 16, 16);
    await p.l(330, 424, 326, 538);
    await p.l(362, 430, 360, 538);
    await p.l(326, 538, 270, 548, 268, 576, 366, 576, 360, 538, 326, 538);
    await p.fill(310, 560, R, { max: 6000 });
    await p.ink(W, 4);
    await p.l(300, 552, 316, 566);
    await p.l(316, 550, 332, 564);
    await p.ink(G, 8);
    await p.s(16, 588, 140, 580, 262, 590);
    await p.ink(K, 4);
    await p.s(120, 60, 110, 40, 124, 22);
    await p.s(160, 70, 150, 48, 164, 30);
  },
  async right(p) {
    await p.ink(O, 16);
    await p.s(
      386,
      40,
      500,
      62,
      580,
      140,
      606,
      240,
      586,
      340,
      510,
      420,
      386,
      448,
    );
    await p.ink(Y, 16);
    await p.z(414, 84, 524, 130, 22);
    await p.z(414, 150, 574, 330, 22);
    await p.z(414, 350, 520, 400, 22);
    await p.mark();
    await p.ink(G, 8);
    await p.o(480, 130, 16, 14);
    await p.o(536, 300, 16, 14);
    await p.ink(R, 16);
    await p.dot(520, 220, 11);
    await p.dot(452, 372, 10);
    await p.ink(W, 16);
    await p.dot(456, 206, 24);
    await p.ink(K, 8);
    await p.o(456, 206, 33, 37);
    await p.ink(K, 16);
    await p.dot(448, 212, 6);
    await p.ink(K, 8);
    await p.s(386, 330, 444, 334, 484, 300);
    await p.ink(R, 16);
    await p.dot(446, 352, 7);
    // arm, a longer hairy leg, a boot
    await p.ink(K, 8);
    await p.s(602, 262, 662, 302, 704, 280);
    await p.o(720, 270, 17, 17);
    await p.l(440, 444, 446, 552);
    await p.l(478, 438, 482, 552);
    await p.ink(K, 2);
    await p.l(452, 470, 462, 480);
    await p.l(456, 496, 468, 504);
    await p.l(450, 520, 462, 530);
    await p.ink(B, 16);
    await p.l(446, 566, 536, 568);
    await p.l(448, 552, 482, 554);
    await p.ink(T, 8);
    await p.s(560, 580, 680, 570, 790, 582);
    await p.ink(R, 8);
    await p.s(
      700,
      90,
      680,
      60,
      700,
      50,
      714,
      70,
      728,
      50,
      748,
      60,
      728,
      92,
      714,
      110,
      700,
      90,
    );
  },
};

const skatingDino: PartyDesign = {
  theme: "dinossauro de patins",
  async left(p) {
    await p.ink(K, 8);
    await p.s(
      60,
      200,
      90,
      130,
      200,
      108,
      300,
      138,
      332,
      200,
      300,
      252,
      180,
      264,
      80,
      250,
      60,
      200,
    );
    await p.fill(200, 150, G);
    await p.ink(K, 8);
    await p.s(318, 152, 362, 162, 414, 198);
    await p.s(296, 256, 332, 330, 414, 402);
    await p.fill(360, 280, G);
    await p.mark();
    await p.ink(K, 8);
    await p.o(240, 166, 19, 21);
    await p.fill(240, 176, W, { max: 3000 });
    await p.ink(K, 8);
    await p.dot(236, 170, 4);
    await p.dot(86, 190, 3);
    await p.s(72, 226, 150, 234, 252, 214);
    await p.ink(W, 8);
    await p.l(100, 236, 101, 246);
    await p.l(130, 238, 131, 248);
    await p.l(160, 238, 161, 248);
    await p.l(190, 236, 191, 246);
    await p.l(220, 230, 221, 240);
    await p.ink(O, 8);
    await p.l(322, 146, 336, 116, 352, 154, 370, 126, 386, 176);
    // little arm, clouds, ground
    await p.ink(K, 8);
    await p.s(334, 334, 284, 352, 252, 332);
    await p.l(252, 332, 236, 318);
    await p.l(252, 332, 234, 340);
    await p.ink(B, 4);
    await p.s(
      70,
      70,
      90,
      40,
      130,
      44,
      150,
      60,
      180,
      62,
      176,
      84,
      80,
      86,
      70,
      70,
    );
    await p.s(270, 50, 290, 28, 330, 34, 350, 56, 280, 62, 270, 50);
    await p.ink(GR, 8);
    await p.s(10, 562, 200, 554, 414, 560);
    await p.ink(G, 8);
    await p.l(60, 556, 74, 520, 88, 554);
    await p.l(150, 552, 164, 516, 178, 552);
  },
  async right(p) {
    await p.ink(K, 8);
    await p.s(386, 190, 480, 170, 560, 210, 640, 290, 720, 326, 782, 318);
    await p.s(386, 410, 470, 430, 540, 420, 600, 380, 680, 368, 782, 342);
    await p.l(780, 316, 792, 330, 780, 344);
    await p.fill(480, 300, T, { max: 90000 });
    await p.mark();
    await p.ink(R, 8);
    await p.l(
      420,
      186,
      440,
      150,
      462,
      174,
      486,
      138,
      510,
      180,
      540,
      158,
      560,
      204,
    );
    await p.l(560, 204, 592, 198, 604, 244, 636, 250, 644, 288);
    await p.ink(Y, 16);
    await p.dot(450, 330, 8);
    await p.dot(506, 276, 8);
    await p.dot(524, 364, 8);
    await p.dot(580, 320, 6);
    // legs and roller skates
    await p.ink(K, 8);
    await p.l(440, 430, 436, 498);
    await p.l(476, 434, 478, 498);
    await p.l(540, 424, 544, 498);
    await p.l(578, 404, 582, 498);
    await p.l(424, 498, 420, 534, 494, 534, 490, 498, 424, 498);
    await p.fill(456, 516, R, { max: 5000 });
    await p.ink(K, 8);
    await p.l(530, 498, 528, 534, 600, 534, 596, 498, 530, 498);
    await p.fill(562, 516, R, { max: 5000 });
    await p.ink(Y, 16);
    await p.dot(438, 552, 5);
    await p.dot(478, 552, 5);
    await p.dot(544, 552, 5);
    await p.dot(586, 552, 5);
    await p.ink(K, 4);
    await p.l(630, 470, 720, 468);
    await p.l(640, 500, 750, 498);
    await p.l(630, 530, 700, 528);
    await p.ink(GR, 8);
    await p.s(386, 576, 600, 570, 790, 578);
    await p.ink(K, 8);
    await p.o(700, 92, 46, 44);
    await p.fill(700, 92, Y, { max: 10000 });
    await p.ink(O, 8);
    await p.l(700, 30, 700, 12);
    await p.l(760, 92, 784, 92);
    await p.l(640, 92, 618, 92);
    await p.l(744, 50, 760, 34);
    await p.l(656, 50, 640, 34);
    await p.l(744, 136, 760, 152);
    await p.l(656, 136, 640, 152);
  },
};

const waiterOctopus: PartyDesign = {
  theme: "polvo garçom",
  async left(p) {
    await p.ink(K, 8);
    await p.s(414, 60, 300, 76, 246, 150, 236, 240, 250, 302);
    await p.l(248, 302, 414, 310);
    await p.fill(320, 220, R);
    await p.ink(K, 8);
    await p.o(330, 180, 25, 31);
    await p.fill(330, 196, W, { max: 4000 });
    await p.ink(K, 16);
    await p.dot(336, 188, 5);
    await p.ink(K, 8);
    await p.l(298, 138, 356, 150);
    await p.s(338, 250, 370, 268, 414, 270);
    await p.mark();
    await p.l(414, 320, 350, 300, 352, 352, 414, 334);
    await p.fill(372, 326, K, { max: 3000 });
    await p.ink(R, 16);
    await p.s(266, 308, 200, 330, 150, 284, 112, 216);
    await p.s(300, 316, 260, 402, 180, 432, 130, 502);
    await p.s(350, 362, 330, 440, 280, 508, 302, 574);
    await p.s(388, 350, 380, 440, 350, 530);
    // tray with a glass and a bottle
    await p.ink(GR, 8);
    await p.l(40, 204, 180, 206);
    await p.ink(K, 4);
    await p.l(70, 198, 62, 138, 104, 138, 98, 198, 70, 198);
    await p.fill(82, 180, T, { max: 3000 });
    await p.ink(G, 8);
    await p.l(
      132,
      196,
      132,
      150,
      140,
      120,
      150,
      120,
      158,
      150,
      158,
      196,
      132,
      196,
    );
    await p.ink(Y, 8);
    await p.dot(232, 322, 3);
    await p.dot(176, 308, 3);
    await p.dot(134, 250, 3);
    await p.dot(282, 366, 3);
    await p.dot(220, 420, 3);
    await p.dot(160, 462, 3);
    await p.dot(322, 468, 3);
    await p.dot(290, 530, 3);
    await p.dot(376, 470, 3);
    await p.ink(K, 4);
    await p.s(16, 590, 200, 584, 414, 590);
  },
  async right(p) {
    await p.ink(K, 8);
    await p.s(386, 46, 510, 70, 572, 150, 576, 250, 556, 300);
    await p.l(558, 300, 386, 296);
    await p.fill(480, 120, O);
    await p.ink(K, 8);
    await p.o(470, 176, 31, 37);
    await p.fill(486, 190, W, { max: 5000 });
    await p.ink(K, 16);
    await p.dot(462, 180, 6);
    await p.s(404, 240, 440, 228, 476, 244, 500, 228);
    await p.ink(K, 8);
    await p.s(386, 272, 440, 278, 472, 262);
    await p.mark();
    await p.l(386, 310, 456, 290, 452, 348, 386, 328);
    await p.fill(430, 318, B, { max: 3500 });
    await p.ink(O, 16);
    await p.s(542, 304, 610, 330, 660, 272, 692, 204);
    await p.s(510, 308, 560, 402, 640, 432, 692, 502);
    await p.s(462, 356, 480, 430, 530, 504, 506, 572);
    await p.s(416, 350, 424, 440, 456, 524);
    // a plate with a fish, steam
    await p.ink(GR, 8);
    await p.l(626, 192, 770, 188);
    await p.ink(B, 8);
    await p.s(656, 170, 690, 148, 728, 170, 690, 186, 656, 170);
    await p.l(728, 170, 752, 152, 750, 186, 728, 170);
    await p.ink(K, 4);
    await p.dot(672, 166, 2);
    await p.s(680, 136, 672, 116, 684, 100);
    await p.s(710, 136, 702, 116, 714, 100);
    await p.ink(R, 8);
    await p.dot(580, 322, 3);
    await p.dot(640, 300, 3);
    await p.dot(674, 240, 3);
    await p.dot(540, 366, 3);
    await p.dot(600, 420, 3);
    await p.dot(662, 462, 3);
    await p.dot(486, 462, 3);
    await p.dot(520, 530, 3);
    await p.dot(430, 470, 3);
    await p.ink(K, 4);
    await p.s(386, 586, 600, 580, 786, 588);
  },
};

async function wheel(p: Pen, x: number, y: number) {
  await p.ink(K, 8);
  await p.o(x, y, 94, 91);
  await p.ink(K, 4);
  await p.l(x, y - 88, x, y + 88);
  await p.l(x - 90, y, x + 90, y);
  await p.l(x - 64, y - 62, x + 64, y + 62);
  await p.l(x + 64, y - 62, x - 64, y + 62);
}

const cyclingShark: PartyDesign = {
  theme: "tubarão de bicicleta",
  async left(p) {
    await p.ink(K, 8);
    await p.s(
      414,
      140,
      300,
      126,
      190,
      160,
      80,
      236,
      160,
      272,
      260,
      282,
      414,
      286,
    );
    await p.fill(300, 210, GR);
    await p.ink(W, 16);
    await p.dot(212, 196, 8);
    await p.ink(K, 8);
    await p.dot(214, 198, 3);
    await p.l(188, 170, 238, 186);
    await p.s(112, 246, 180, 256, 248, 236);
    await p.ink(W, 8);
    await p.l(
      126,
      250,
      136,
      262,
      146,
      252,
      156,
      264,
      166,
      254,
      176,
      266,
      186,
      256,
    );
    await p.l(186, 256, 196, 266, 206, 252, 216, 262, 226, 248);
    await p.ink(K, 4);
    await p.l(292, 176, 286, 232);
    await p.l(312, 176, 308, 234);
    await p.l(332, 178, 330, 234);
    await p.mark();
    await wheel(p, 200, 440);
    await p.ink(R, 8);
    await p.l(200, 440, 272, 300);
    await p.l(272, 318, 414, 330);
    await p.l(262, 330, 414, 462);
    await p.l(240, 296, 304, 290);
    await p.ink(GR, 16);
    await p.s(330, 276, 300, 292, 262, 290);
    await p.ink(K, 4);
    await p.s(10, 540, 100, 536, 414, 540);
    await p.l(20, 300, 70, 300);
    await p.l(10, 330, 80, 330);
    await p.l(24, 360, 70, 360);
  },
  async right(p) {
    await p.ink(K, 8);
    await p.s(386, 130, 500, 140, 600, 190, 680, 230);
    await p.s(386, 300, 500, 300, 600, 270, 680, 242);
    await p.l(676, 228, 762, 150, 738, 236, 768, 312, 676, 244);
    await p.l(430, 136, 470, 50, 532, 148);
    await p.fill(500, 220, B);
    await p.fill(730, 230, B, { max: 8000 });
    await p.fill(476, 110, B, { max: 8000 });
    await p.mark();
    await p.ink(W, 8);
    await p.s(420, 270, 500, 276, 580, 250);
    await wheel(p, 600, 440);
    await p.ink(O, 8);
    await p.l(386, 322, 520, 330, 600, 440);
    await p.l(386, 462, 600, 440);
    await p.ink(B, 16);
    await p.s(470, 298, 452, 380, 424, 450);
    await p.ink(K, 8);
    await p.l(404, 458, 444, 456);
    await p.o(712, 74, 40, 38);
    await p.fill(712, 74, Y, { max: 8000 });
    await p.ink(K, 4);
    await p.s(386, 538, 600, 534, 790, 540);
    await p.l(720, 400, 780, 400);
    await p.l(730, 430, 790, 430);
    await p.ink(T, 8);
    await p.s(560, 100, 580, 86, 600, 100);
    await p.s(600, 60, 620, 46, 640, 60);
  },
};

const barberCactus: PartyDesign = {
  theme: "cacto cabeleireiro",
  async left(p) {
    await p.ink(K, 8);
    await p.l(150, 480, 330, 480, 312, 586, 170, 586, 150, 480);
    await p.s(
      190,
      478,
      180,
      300,
      188,
      190,
      240,
      140,
      292,
      190,
      300,
      300,
      292,
      478,
    );
    await p.fill(240, 300, G);
    await p.fill(240, 540, BR, { max: 22000 });
    await p.ink(K, 8);
    await p.s(182, 330, 122, 330, 112, 262, 114, 222);
    await p.s(182, 372, 86, 372, 74, 262, 82, 216);
    await p.s(82, 216, 98, 198, 114, 222);
    await p.fill(100, 300, G, { max: 9000 });
    await p.ink(K, 8);
    await p.s(298, 280, 350, 270, 386, 238);
    await p.s(300, 322, 364, 310, 396, 262);
    await p.l(386, 238, 397, 250, 396, 262);
    await p.fill(340, 296, G, { max: 9000 });
    await p.mark();
    await p.ink(K, 8);
    await p.dot(216, 232, 4);
    await p.dot(266, 230, 4);
    await p.s(210, 264, 240, 286, 274, 262);
    await p.ink(K, 2);
    await p.l(200, 180, 190, 168);
    await p.l(280, 180, 292, 168);
    await p.l(220, 330, 212, 340);
    await p.l(262, 360, 270, 370);
    await p.l(230, 420, 222, 430);
    await p.l(270, 430, 278, 440);
    await p.l(100, 340, 92, 350);
    await p.ink(R, 16);
    await p.dot(240, 124, 9);
    await p.ink(Y, 8);
    await p.dot(240, 124, 3);
    // scissors up high, comb towards the client
    await p.ink(GR, 8);
    await p.l(92, 196, 60, 96);
    await p.l(104, 196, 136, 98);
    await p.ink(R, 8);
    await p.o(82, 210, 10, 10);
    await p.o(112, 212, 10, 10);
    await p.ink(K, 8);
    await p.l(352, 206, 398, 192);
    await p.ink(K, 4);
    await p.l(358, 206, 362, 226);
    await p.l(370, 202, 374, 222);
    await p.l(382, 198, 386, 218);
    await p.ink(O, 8);
    await p.s(40, 560, 54, 548, 66, 562);
    await p.s(90, 580, 104, 568, 118, 580);
    await p.s(350, 572, 364, 560, 378, 574);
  },
  async right(p) {
    await p.ink(O, 16);
    await p.s(530, 222, 480, 150, 430, 160, 408, 232);
    await p.s(546, 196, 520, 110, 470, 70, 430, 92);
    await p.s(580, 184, 570, 90, 600, 40, 640, 60);
    await p.s(620, 190, 660, 100, 720, 70, 742, 120);
    await p.s(650, 216, 720, 180, 770, 220, 750, 282);
    await p.s(658, 262, 730, 292, 742, 360);
    await p.s(560, 190, 540, 60, 500, 30);
    await p.s(600, 186, 640, 130, 690, 150);
    await p.ink(K, 8);
    await p.o(590, 252, 70, 66);
    await p.o(565, 246, 13, 15);
    await p.o(613, 244, 13, 15);
    await p.dot(566, 248, 2);
    await p.dot(612, 246, 2);
    await p.ink(K, 4);
    await p.s(560, 288, 575, 280, 590, 290, 605, 280, 620, 288);
    await p.mark();
    // cape and chair
    await p.ink(K, 8);
    await p.l(552, 290, 470, 520, 722, 520, 630, 290);
    await p.fill(590, 420, B, { max: 60000 });
    await p.ink(W, 8);
    await p.l(540, 380, 512, 512);
    await p.l(590, 330, 590, 512);
    await p.l(644, 380, 672, 512);
    await p.ink(R, 16);
    await p.l(482, 534, 480, 584);
    await p.l(710, 534, 712, 584);
    await p.l(744, 524, 748, 330);
    await p.l(728, 336, 772, 334);
    await p.ink(T, 8);
    await p.s(676, 216, 668, 232, 678, 240, 686, 230, 676, 216);
    await p.ink(O, 8);
    await p.s(420, 560, 434, 548, 446, 562);
    await p.s(446, 536, 460, 524, 472, 538);
    await p.s(756, 566, 770, 554, 782, 568);
    await p.s(520, 580, 534, 568, 548, 582);
  },
};

export const PARTY_DESIGNS: PartyDesign[] = [
  astronautCat,
  pizzaWithLegs,
  skatingDino,
  waiterOctopus,
  cyclingShark,
  barberCactus,
];
