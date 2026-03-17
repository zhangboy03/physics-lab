export interface Topic {
  id: string;
  title: string;
  available: boolean;
  icon: string;
  color: string;
  description: string;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  topics: Topic[];
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  categories: Category[];
}

export const curriculum: Section[] = [
  {
    id: 'mechanics',
    title: '力学',
    icon: '⚙️',
    categories: [
      {
        id: 'kinematics',
        title: '运动学',
        icon: '🏃',
        topics: [
          { id: 'uniform-accel', title: '匀变速直线运动', available: false, icon: '📏', color: '#8E8E93', description: '速度-时间图像、位移公式、自由落体' },
          { id: 'projectile', title: '抛体运动', available: true, icon: '🎯', color: '#FF9500', description: '斜抛、平抛、运动分解与合成' },
          { id: 'circular', title: '圆周运动', available: false, icon: '🔄', color: '#8E8E93', description: '向心加速度、角速度、线速度' },
        ],
      },
      {
        id: 'dynamics',
        title: '动力学',
        icon: '💪',
        topics: [
          { id: 'newton', title: '牛顿运动定律', available: false, icon: '📐', color: '#8E8E93', description: '惯性、F=ma、作用与反作用' },
          { id: 'gravity', title: '万有引力', available: false, icon: '🌍', color: '#8E8E93', description: '开普勒定律、卫星运动、宇宙速度' },
          { id: 'spring', title: '弹簧振子（简谐运动）', available: true, icon: '🔩', color: '#AF52DE', description: '胡克定律、简谐运动、能量转换' },
        ],
      },
      {
        id: 'energy-momentum',
        title: '能量与动量',
        icon: '⚡',
        topics: [
          { id: 'energy', title: '功和能量守恒', available: false, icon: '🔋', color: '#8E8E93', description: '动能定理、机械能守恒' },
          { id: 'collision', title: '碰撞与动量守恒', available: true, icon: '💥', color: '#FF2D55', description: '弹性碰撞、完全非弹性碰撞' },
        ],
      },
      {
        id: 'vibration-wave',
        title: '振动与波',
        icon: '🌊',
        topics: [
          { id: 'pendulum', title: '单摆', available: true, icon: '🕐', color: '#007AFF', description: '等时性、周期公式、大角度非线性' },
          { id: 'wave', title: '机械波', available: true, icon: '〰️', color: '#5856D6', description: '横波、纵波、波速与波长频率关系' },
          { id: 'interference', title: '波的干涉与衍射', available: true, icon: '🌈', color: '#30B0C7', description: '双缝干涉、明暗条纹、路程差' },
        ],
      },
    ],
  },
  {
    id: 'electromagnetism',
    title: '电磁学',
    icon: '⚡',
    categories: [
      {
        id: 'efield',
        title: '电场',
        icon: '🔌',
        topics: [
          { id: 'coulomb', title: '库仑定律与电场', available: false, icon: '⚡', color: '#8E8E93', description: '点电荷电场、电场线、等势线' },
        ],
      },
      {
        id: 'circuit',
        title: '电路',
        icon: '🔋',
        topics: [
          { id: 'ohm', title: '欧姆定律', available: false, icon: '🔌', color: '#8E8E93', description: '串并联、内阻、功率' },
        ],
      },
      {
        id: 'bfield',
        title: '磁场',
        icon: '🧲',
        topics: [
          { id: 'lorentz', title: '洛伦兹力', available: false, icon: '🧲', color: '#8E8E93', description: '带电粒子在磁场中的运动' },
        ],
      },
      {
        id: 'em-induction',
        title: '电磁感应',
        icon: '🔁',
        topics: [
          { id: 'faraday', title: '法拉第电磁感应', available: false, icon: '🔁', color: '#8E8E93', description: '磁通量变化、感应电动势' },
        ],
      },
    ],
  },
  {
    id: 'thermodynamics',
    title: '热学',
    icon: '🌡️',
    categories: [
      {
        id: 'molecular',
        title: '分子动理论',
        icon: '🔬',
        topics: [
          { id: 'brownian', title: '分子运动', available: false, icon: '🔬', color: '#8E8E93', description: '布朗运动、分子力、内能' },
        ],
      },
    ],
  },
  {
    id: 'optics',
    title: '光学',
    icon: '💡',
    categories: [
      {
        id: 'geo-optics',
        title: '几何光学',
        icon: '🔍',
        topics: [
          { id: 'refraction', title: '折射与全反射', available: false, icon: '🔍', color: '#8E8E93', description: '折射定律、全反射、光纤' },
        ],
      },
    ],
  },
  {
    id: 'modern',
    title: '近代物理',
    icon: '⚛️',
    categories: [
      {
        id: 'quantum',
        title: '量子初步',
        icon: '⚛️',
        topics: [
          { id: 'photoelectric', title: '光电效应', available: false, icon: '⚛️', color: '#8E8E93', description: '爱因斯坦方程、逸出功、截止频率' },
        ],
      },
    ],
  },
];

export function getAllTopics(): Topic[] {
  return curriculum.flatMap(s => s.categories.flatMap(c => c.topics));
}

export function getAvailableTopics(): Topic[] {
  return getAllTopics().filter(t => t.available);
}
