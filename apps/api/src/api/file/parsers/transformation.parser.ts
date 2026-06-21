import { Injectable } from '@nestjs/common';
import {
  ImageTransformOptions,
  VideoTransformOptions,
} from '../types/upload.types';

@Injectable()
export class TransformationParser {
  parse(
    params: string,
    presetTransformations: string[] = [],
  ): ImageTransformOptions & VideoTransformOptions {
    const arr = params.split(',').map((x) => x.trim());
    const allParams = [...presetTransformations, ...arr];

    const data: ImageTransformOptions & VideoTransformOptions = {
      width: null,
      height: null,
      crop: null,
      gravity: null,
      format: null,
      quality: null,
      aspectRatio: null,
      overlay: null,
      effect: null,
      autoOrient: false,
      background: null,

      // Video
      bitrate: null,
      fps: null,
      start: null,
      duration: null,

      // root
      rotate: null,
      flip: null,
    };

    for (const p of allParams) {
      // WIDTH w_100
      let m = p.match(/^w_(\d+)$/);
      if (m) {
        data.width = parseInt(m[1], 10);
        continue;
      }

      // HEIGHT h_200
      m = p.match(/^h_(\d+)$/);
      if (m) {
        data.height = parseInt(m[1], 10);
        continue;
      }

      // CROP c_fill, c_cover, c_fit
      m = p.match(/^c_(\w+)$/);
      if (
        m &&
        [
          'fill',
          'cover',
          'fit',
          'crop',
          'limit',
          'pad',
          'lfill',
          'thumb',
        ].includes(m[1])
      ) {
        data.crop = m[1] as ImageTransformOptions['crop'];
        continue;
      }

      // GRAVITY g_face
      m = p.match(/^g_(\w+)$/);
      if (m) {
        data.gravity = m[1];
        continue;
      }

      // FORMAT f_png, f_webp, f_jpg, f_jpeg
      m = p.match(/^f_(\w+)$/);
      if (m) {
        data.format = m[1];
        continue;
      }

      // QUALITY q_80
      m = p.match(/^q_(\d{1,3})$/);
      if (m) {
        const q = Math.max(1, Math.min(100, parseInt(m[1], 10)));
        data.quality = q;
        continue;
      }

      // OVERLAY l_logo, l_text
      m = p.match(/^l_(.+)$/);
      if (m) {
        data.overlay = m[1];
        continue;
      }

      // EFFECT e_blur:200, e_sharpen:200
      m = p.match(/^e_(\w+)(?::([\w.]+))?$/);
      if (m) {
        data.effect = {
          type: m[1],
          value: m[2] ?? null,
        };
        continue;
      }

      // ROTATION: a_90, a_180, a_270, a_360
      m = p.match(/^a_(\d{2,3})$/);
      if (m) {
        data.rotate = parseInt(m[1], 10);
        continue;
      }

      // FLIP: a_vflip, a_hflip
      if (p === 'a_vflip') {
        data.flip = 'vertical';
        continue;
      }
      if (p === 'a_hflip') {
        data.flip = 'horizontal';
        continue;
      }

      // AUTO-ORIENT: a_auto
      if (p === 'a_auto') {
        data.autoOrient = true;
        continue;
      }

      // BACKGROUND: b_black OR b_rgb:ff00aa
      if (p.startsWith('b_')) {
        const bg = p.substring(2);

        if (bg === 'auto') {
          data.background = 'auto';
        } else if (bg.startsWith('rgb:')) {
          data.background = '#' + bg.substring(4);
        } else {
          data.background = bg;
        }
        continue;
      }

      // ASPECT RATIO: ar_16:9 or ar_1.77
      m = p.match(/^ar_([\d.]+|\d+:\d+)$/);
      if (m) {
        data.aspectRatio = m[1];
        continue;
      }

      /** Video Transformer Coming Soon... */

      // BITRATE br_500k
      m = p.match(/^br_(\d+[kKmM]?)$/);
      if (m) {
        data.bitrate = Number(m[1].toLowerCase());
        continue;
      }

      // FPS fps_30
      m = p.match(/^fps_(\d+)$/);
      if (m) {
        data.fps = parseInt(m[1], 10);
        continue;
      }

      // START start_1.23
      m = p.match(/^start_(\d+(?:\.\d+)?)$/);
      if (m) {
        data.start = parseFloat(m[1]);
        continue;
      }

      // DURATION dur_2.5
      m = p.match(/^dur_(\d+(?:\.\d+)?)$/);
      if (m) {
        data.duration = parseFloat(m[1]);
        continue;
      }
    }

    return data;
  }
}
