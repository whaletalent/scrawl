/**
 * Face Builder faces. The game deals the six regions three-and-three at
 * random, so each region is its own little drawing and whoever gets it draws
 * it. Coordinates must stay inside the region (apps/web/src/lib/face-regions.ts):
 * eyes 215–585 × 200–280, nose 320–480 × 280–380, mouth 270–530 × 380–470,
 * ears 165–215 and 585–635 × 200–320, shoulders 120–680 × 520–590, and hair is
 * everything above y = 200 or outside the face.
 */
import { INK, type FaceRegion, type Pen } from "../lib/pen";

const {
  black: K,
  white: W,
  red: R,
  yellow: Y,
  blue: B,
  grey: GR,
  brown: BR,
  teal: T,
} = INK;

export interface FaceDesign {
  name: string;
  faceTemplate: "masculine" | "feminine" | "monster" | "robot-face";
  skinTone: string;
  regions: Record<FaceRegion, (p: Pen) => Promise<void>>;
}

const goof: FaceDesign = {
  name: "sujeito de nariz de palhaço",
  faceTemplate: "masculine",
  skinTone: "#E8B88A",
  regions: {
    async hair(p) {
      await p.ink(BR, 16);
      await p.l(
        232,
        150,
        250,
        88,
        280,
        130,
        300,
        50,
        335,
        105,
        365,
        25,
        400,
        95,
      );
      await p.l(
        400,
        95,
        432,
        22,
        465,
        100,
        500,
        48,
        520,
        125,
        550,
        88,
        570,
        150,
      );
      await p.z(262, 44, 540, 104, 16);
      await p.s(196, 196, 184, 260, 190, 330);
      await p.s(604, 196, 616, 260, 610, 330);
      await p.ink(K, 16);
      await p.l(268, 186, 352, 172);
      await p.l(448, 172, 532, 188);
    },
    async ears(p) {
      await p.ink(K, 8);
      await p.s(212, 216, 174, 232, 174, 288, 212, 304);
      await p.s(588, 216, 626, 232, 626, 288, 588, 304);
      await p.ink(Y, 8);
      await p.dot(182, 308, 4);
    },
    async eyes(p) {
      await p.ink(K, 8);
      await p.o(305, 240, 40, 30);
      await p.o(495, 241, 33, 33);
      await p.fill(290, 240, W, { max: 6000 });
      await p.fill(505, 250, W, { max: 6000 });
      await p.ink(K, 16);
      await p.dot(322, 246, 6);
      await p.dot(480, 236, 6);
    },
    async nose(p) {
      await p.ink(R, 8);
      await p.o(400, 330, 36, 34);
      await p.fill(400, 340, R, { max: 6000 });
      await p.ink(W, 8);
      await p.s(386, 314, 380, 324, 384, 334);
    },
    async mouth(p) {
      await p.ink(K, 8);
      await p.l(288, 394, 512, 392);
      await p.s(288, 394, 330, 448, 400, 461, 470, 448, 512, 392);
      await p.fill(400, 420, W, { max: 14000 });
      await p.ink(K, 4);
      await p.l(330, 398, 332, 438);
      await p.l(365, 398, 366, 452);
      await p.l(400, 398, 400, 456);
      await p.l(435, 398, 436, 452);
      await p.l(470, 398, 470, 438);
    },
    async shoulders(p) {
      await p.ink(K, 8);
      await p.s(124, 542, 250, 532, 400, 548, 550, 532, 676, 542);
      await p.fill(200, 575, B, { max: 40000 });
      await p.ink(R, 16);
      await p.l(400, 556, 400, 584);
    },
  },
};

const ogre: FaceDesign = {
  name: "monstro de um olho só",
  faceTemplate: "monster",
  skinTone: "#6B8E23",
  regions: {
    async hair(p) {
      await p.ink(K, 8);
      await p.l(262, 104, 204, 14, 312, 62, 262, 104);
      await p.fill(250, 56, Y, { max: 8000 });
      await p.ink(K, 8);
      await p.l(538, 104, 596, 14, 488, 62, 538, 104);
      await p.fill(550, 56, Y, { max: 8000 });
      await p.ink(K, 16);
      await p.l(326, 70, 340, 24, 360, 60, 382, 12, 406, 58, 430, 14, 452, 60);
      await p.l(452, 60, 468, 26, 478, 68);
      await p.s(292, 176, 400, 190, 508, 174);
      await p.ink(R, 16);
      await p.dot(300, 132, 5);
      await p.dot(520, 140, 4);
      await p.dot(470, 110, 3);
    },
    async ears(p) {
      await p.ink(K, 8);
      await p.l(212, 214, 172, 208, 210, 300);
      await p.l(588, 214, 628, 208, 590, 300);
    },
    async eyes(p) {
      await p.ink(K, 8);
      await p.o(400, 240, 62, 33);
      await p.fill(360, 240, W, { max: 9000 });
      await p.ink(R, 16);
      await p.dot(404, 240, 12);
      await p.ink(K, 8);
      await p.dot(404, 240, 4);
      await p.ink(K, 4);
      await p.o(264, 242, 15, 13);
      await p.o(536, 242, 15, 13);
      await p.ink(Y, 8);
      await p.dot(264, 242, 4);
      await p.dot(536, 242, 4);
    },
    async nose(p) {
      await p.ink(K, 16);
      await p.dot(378, 335, 5);
      await p.dot(424, 333, 5);
      await p.ink(K, 4);
      await p.s(350, 322, 400, 300, 450, 322);
    },
    async mouth(p) {
      await p.ink(K, 8);
      await p.l(284, 398, 516, 396);
      await p.s(284, 398, 340, 452, 400, 462, 460, 452, 516, 396);
      await p.fill(400, 440, R, { max: 14000 });
      await p.ink(W, 16);
      await p.l(314, 408, 315, 420);
      await p.l(357, 408, 358, 428);
      await p.l(400, 408, 400, 430);
      await p.l(443, 408, 444, 428);
      await p.l(486, 408, 485, 420);
    },
    async shoulders(p) {
      await p.ink(K, 8);
      await p.s(124, 540, 260, 548, 400, 534, 540, 548, 676, 540);
      await p.fill(200, 578, BR, { max: 40000 });
      await p.ink(Y, 16);
      for (const x of [180, 290, 400, 510, 620]) await p.dot(x, 572, 4);
    },
  },
};

const tin: FaceDesign = {
  name: "robô de dente quadrado",
  faceTemplate: "robot-face",
  skinTone: "#4682B4",
  regions: {
    async hair(p) {
      await p.ink(K, 8);
      await p.l(400, 48, 398, 16);
      await p.ink(R, 16);
      await p.dot(398, 14, 6);
      await p.ink(Y, 8);
      await p.l(312, 6, 292, 24, 314, 28, 296, 46);
      await p.l(488, 6, 508, 24, 486, 28, 504, 46);
      await p.ink(K, 4);
      await p.l(222, 130, 578, 126);
      await p.ink(GR, 16);
      await p.dot(244, 84, 6);
      await p.dot(556, 84, 6);
      await p.dot(244, 168, 6);
      await p.dot(556, 168, 6);
      await p.ink(W, 8);
      await p.l(330, 84, 470, 82);
      await p.l(350, 102, 450, 100);
    },
    async ears(p) {
      await p.ink(GR, 16);
      await p.l(172, 232, 208, 232);
      await p.l(172, 262, 208, 262);
      await p.l(172, 292, 208, 292);
      await p.l(592, 232, 628, 232);
      await p.l(592, 262, 628, 262);
      await p.l(592, 292, 628, 292);
    },
    async eyes(p) {
      await p.ink(K, 8);
      await p.l(238, 214, 352, 212, 354, 270, 236, 270, 238, 214);
      await p.fill(260, 240, Y, { max: 8000 });
      await p.ink(K, 8);
      await p.l(448, 212, 562, 214, 564, 270, 446, 270, 448, 212);
      await p.fill(540, 240, Y, { max: 8000 });
      await p.ink(K, 16);
      await p.dot(304, 244, 8);
      await p.dot(494, 240, 8);
    },
    async nose(p) {
      await p.ink(K, 8);
      await p.l(400, 292, 366, 364, 434, 366, 400, 292);
      await p.fill(400, 345, R, { max: 5000 });
    },
    async mouth(p) {
      await p.ink(K, 8);
      await p.l(284, 394, 516, 392, 516, 458, 286, 460, 284, 394);
      await p.fill(300, 410, W, { max: 16000 });
      await p.ink(K, 4);
      for (const x of [322, 360, 400, 440, 478]) await p.l(x, 398, x + 1, 454);
      await p.l(288, 426, 512, 426);
    },
    async shoulders(p) {
      await p.ink(K, 8);
      await p.l(124, 538, 676, 536);
      await p.fill(200, 575, GR, { max: 40000 });
      await p.ink(Y, 16);
      await p.dot(200, 566, 5);
      await p.dot(600, 566, 5);
      await p.ink(R, 16);
      await p.dot(400, 568, 5);
    },
  },
};

const diva: FaceDesign = {
  name: "diva de cabelão",
  faceTemplate: "feminine",
  skinTone: "#C68642",
  regions: {
    async hair(p) {
      await p.ink(Y, 16);
      await p.s(400, 22, 280, 30, 190, 110, 150, 250, 140, 400, 170, 500);
      await p.s(400, 22, 520, 30, 610, 110, 650, 250, 660, 400, 630, 500);
      await p.s(360, 10, 220, 22, 130, 120, 100, 280, 100, 420, 132, 498);
      await p.s(440, 10, 580, 22, 670, 120, 700, 280, 700, 420, 668, 498);
      await p.s(380, 50, 270, 70, 200, 160, 174, 300, 162, 420, 186, 500);
      await p.s(420, 50, 530, 70, 600, 160, 626, 300, 638, 420, 614, 500);
      await p.s(150, 160, 122, 300, 122, 440, 150, 500);
      await p.s(650, 160, 678, 300, 678, 440, 650, 500);
      await p.l(
        250,
        150,
        270,
        90,
        300,
        160,
        330,
        84,
        365,
        165,
        400,
        80,
        435,
        165,
      );
      await p.l(435, 165, 470, 84, 500, 160, 530, 90, 550, 150);
      await p.z(268, 46, 532, 92, 16);
      await p.ink(R, 16);
      await p.l(540, 70, 500, 44, 500, 96, 540, 70, 580, 44, 580, 96, 540, 70);
    },
    async ears(p) {
      await p.ink(R, 8);
      await p.o(190, 288, 14, 20);
      await p.o(610, 288, 14, 20);
    },
    async eyes(p) {
      await p.ink(K, 8);
      await p.o(310, 248, 32, 21);
      await p.o(490, 248, 32, 21);
      await p.fill(292, 248, W, { max: 4000 });
      await p.fill(508, 248, W, { max: 4000 });
      await p.ink(B, 16);
      await p.dot(314, 249, 6);
      await p.dot(486, 249, 6);
      await p.ink(K, 4);
      await p.l(284, 230, 274, 212);
      await p.l(302, 224, 298, 206);
      await p.l(322, 224, 328, 206);
      await p.l(516, 230, 526, 212);
      await p.l(498, 224, 502, 206);
      await p.l(478, 224, 472, 206);
    },
    async nose(p) {
      await p.ink(K, 4);
      await p.s(396, 296, 384, 348, 402, 362, 420, 350);
    },
    async mouth(p) {
      await p.ink(R, 8);
      await p.s(302, 420, 350, 400, 400, 414, 450, 400, 498, 420);
      await p.s(302, 420, 350, 454, 400, 462, 450, 454, 498, 420);
      await p.fill(400, 445, R, { max: 9000 });
      await p.fill(350, 412, R, { max: 9000 });
      await p.ink(K, 4);
      await p.s(310, 422, 400, 432, 490, 422);
    },
    async shoulders(p) {
      await p.ink(K, 8);
      await p.s(124, 544, 260, 534, 400, 562, 540, 534, 676, 544);
      await p.fill(200, 580, T, { max: 40000 });
      await p.ink(W, 16);
      await p.dot(300, 574, 4);
      await p.dot(500, 574, 4);
    },
  },
};

export const FACE_DESIGNS: FaceDesign[] = [goof, ogre, tin, diva];
