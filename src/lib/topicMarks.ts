const sectionMarks: Record<string, string> = {
  mechanics: 'ME',
  electromagnetism: 'EM',
  thermodynamics: 'TH',
  optics: 'OP',
  modern: 'QM',
};

const categoryMarks: Record<string, string> = {
  kinematics: 'KIN',
  dynamics: 'DYN',
  'energy-momentum': 'ENE',
  'vibration-wave': 'WAV',
  efield: 'E',
  circuit: 'R',
  bfield: 'B',
  'em-induction': 'IND',
  molecular: 'MOL',
  'geo-optics': 'LENS',
  quantum: 'Q',
};

const topicMarks: Record<string, string> = {
  projectile: '抛',
  spring: '简',
  collision: '碰',
  pendulum: '摆',
  wave: '波',
  interference: '涉',
  'uniform-accel': '匀',
  circular: '圆',
  newton: '牛',
  gravity: '引',
  energy: '能',
  coulomb: '场',
  ohm: '欧',
  lorentz: '洛',
  faraday: '感',
  brownian: '分',
  refraction: '折',
  photoelectric: '光',
};

export function getSectionMark(id: string, title: string): string {
  return sectionMarks[id] ?? title.slice(0, 1);
}

export function getCategoryMark(id: string, title: string): string {
  return categoryMarks[id] ?? title.slice(0, 2).toUpperCase();
}

export function getTopicMark(id: string, title: string): string {
  return topicMarks[id] ?? title.slice(0, 1);
}

export function hexToRgbString(hex: string, alpha = 1): string {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map(part => `${part}${part}`)
          .join('')
      : normalized;

  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
