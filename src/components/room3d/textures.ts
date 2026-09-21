/**
 * Vân gỗ và vân đá sinh bằng canvas.
 *
 * Vẽ tại chỗ thay vì tải ảnh: không thêm file vào gói, không chờ mạng, và
 * đổi màu chỉ là đổi tham số. Phòng này chỉ cần ba chất liệu nên không đáng
 * để kéo theo ảnh thật.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

function surface(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function finish(c: HTMLCanvasElement, repeatX = 1, repeatY = 1): Texture {
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

/** Ván sàn xương cá, nhìn từ trên xuống. */
export function herringboneFloor(): Texture {
  const { c, ctx } = surface(512, 512);
  ctx.fillStyle = "#3f2c1d";
  ctx.fillRect(0, 0, 512, 512);

  const plank = (x: number, y: number, w: number, h: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const base = 0.82 + Math.random() * 0.3;
    const r = Math.round(122 * base);
    const g = Math.round(88 * base);
    const b = Math.round(58 * base);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    // Vài đường vân chạy dọc thớ
    ctx.strokeStyle = `rgba(0,0,0,0.13)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const gy = -h / 2 + ((i + 1) * h) / 4;
      ctx.beginPath();
      ctx.moveTo(-w / 2, gy);
      ctx.lineTo(w / 2, gy + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  };

  const L = 66;
  const W = 21;
  for (let row = -2; row < 10; row++) {
    for (let col = -2; col < 10; col++) {
      const x = col * L * 0.72;
      const y = row * L * 0.72 + (col % 2 ? L * 0.36 : 0);
      plank(x, y, L, W, Math.PI / 4);
      plank(x + L * 0.36, y + L * 0.36, L, W, -Math.PI / 4);
    }
  }
  return finish(c, 2.4, 2.4);
}

/** Gỗ sáng cho mặt quầy và ghế, thớ chạy theo chiều dài. */
export function lightWood(tint = "#c9a877"): Texture {
  const { c, ctx } = surface(512, 128);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * 128;
    ctx.strokeStyle = `rgba(90,60,30,${0.04 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      ctx.lineTo(x, y + Math.sin(x / 70 + i) * 1.8);
    }
    ctx.stroke();
  }
  return finish(c, 1, 1);
}

/** Đá đen mảng lớn cho tường sau lưng bếp trưởng. */
export function darkStone(): Texture {
  const { c, ctx } = surface(512, 512);
  ctx.fillStyle = "#34322f";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = Math.random();
    ctx.fillStyle =
      v > 0.5
        ? `rgba(255,255,255,${Math.random() * 0.05})`
        : `rgba(0,0,0,${Math.random() * 0.22})`;
    ctx.fillRect(x, y, 1 + Math.random() * 6, 1 + Math.random() * 3);
  }
  // Mạch đá ngang, chia mảng
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  for (let y = 64; y < 512; y += 88) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 24) ctx.lineTo(x, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }
  return finish(c, 2, 1.4);
}

/** Giấy washi cho các khoang đèn. */
export function washi(): Texture {
  const { c, ctx } = surface(256, 256);
  ctx.fillStyle = "#f6e6bd";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    ctx.strokeStyle = `rgba(190,160,100,${Math.random() * 0.14})`;
    ctx.lineWidth = 0.5;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }
  return finish(c, 1, 1);
}
