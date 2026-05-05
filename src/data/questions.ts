import type { Question } from '../types';

export const questions: Question[] = [
  // === 第一阶段：基础信息 ===
  {
    id: 'relationship',
    title: '你和收礼人是什么关系？',
    subtitle: '关系决定了礼物的方向和边界',
    type: 'single',
    options: [
      { value: '恋人', label: '恋人/伴侣', icon: '❤️' },
      { value: '家人', label: '家人/亲戚', icon: '🏠' },
      { value: '朋友', label: '朋友/同学', icon: '👋' },
      { value: '同事', label: '同事/合作伙伴', icon: '🤝' },
      { value: '长辈', label: '长辈/老师', icon: '👴' },
      { value: '晚辈', label: '晚辈/学生', icon: '👧' },
    ],
  },
  {
    id: 'budget',
    title: '你的预算范围是多少？',
    subtitle: '可以是大概范围，AI会帮你把关',
    type: 'budget',
    budgetMin: 50,
    budgetMax: 3000,
    budgetStep: 50,
    budgetUnit: '元',
    flexMin: 0,
    flexMax: 50,
    flexStep: 5,
  },
  {
    id: 'ageRange',
    title: '收礼人的年龄是多少？',
    subtitle: '年龄影响礼物的风格和实用性',
    type: 'slider',
    sliderMin: 0,
    sliderMax: 100,
    sliderStep: 1,
    sliderUnit: '岁',
  },
  {
    id: 'occasion',
    title: '送礼的场合是什么？',
    subtitle: '不同场合，礼物的意义不同',
    type: 'single',
    options: [
      { value: '生日', label: '生日', icon: '🎂' },
      { value: '纪念日', label: '纪念日', icon: '💑' },
      { value: '节日', label: '节日礼物', icon: '🎄' },
      { value: '毕业', label: '毕业/升学', icon: '🎓' },
      { value: '搬家', label: '乔迁/搬家', icon: '🏠' },
      { value: '婚礼', label: '婚礼/订婚', icon: '💍' },
      { value: '求职', label: '求职/升职', icon: '💼' },
      { value: '感谢', label: '感谢/回报', icon: '🙏' },
      { value: '道歉', label: '道歉/和解', icon: '🤝' },
      { value: '其他', label: '其他场合', icon: '🎁' },
    ],
  },

  // === 第二阶段：偏好表达 ===
  {
    id: 'specificWants',
    title: '你心目中有具体的礼物想法吗？',
    subtitle: '如果有具体想法，AI会优先考虑。没有也没关系',
    type: 'text',
    placeholder: '例如：跑鞋、蓝牙耳机、护肤套装…',
    allowEmpty: true,
  },
  {
    id: 'interests',
    title: '收礼人有什么兴趣爱好和性格特点？',
    subtitle: '帮助AI更好地个性化推荐',
    type: 'mixed',
    tagGroups: [
      {
        title: '兴趣爱好',
        tags: [
          { value: '运动健身', label: '运动健身' },
          { value: '阅读写作', label: '阅读写作' },
          { value: '音乐', label: '音乐' },
          { value: '游戏', label: '游戏/电竞' },
          { value: '美食', label: '美食/烹饪' },
          { value: '旅行', label: '旅行/户外' },
          { value: '科技', label: '科技数码' },
          { value: '手工', label: '艺术手工' },
          { value: '美妆', label: '美妆护肤' },
          { value: '宠物', label: '宠物' },
          { value: '电影', label: '电影/追剧' },
          { value: '二次元', label: '二次元/动漫' },
        ],
      },
      {
        title: '性格特点',
        tags: [
          { value: '务实理性', label: '务实理性' },
          { value: '感性浪漫', label: '感性浪漫' },
          { value: '文艺气质', label: '文艺气质' },
          { value: '运动活力', label: '运动活力' },
          { value: '宅家内向', label: '宅家内向' },
          { value: '社交达人', label: '社交达人' },
        ],
      },
    ],
    allowFreeInput: true,
    freeInputPlaceholder: '补充其他爱好或性格特点…',
  },

  // === 第三阶段：排除偏好 ===
  {
    id: 'exclusions',
    title: '有什么不想收到的？',
    subtitle: '帮助AI避免踩雷，也可以写之前送过的礼物',
    type: 'mixed',
    tagGroups: [
      {
        title: '排除选项',
        tags: [
          { value: '不要食品', label: '不要食品/零食' },
          { value: '不要衣物', label: '不要衣物/配饰' },
          { value: '不要电子产品', label: '不要电子产品' },
          { value: '不要DIY', label: '不要DIY/拼装类' },
          { value: '不要摄影', label: '不要相机/摄影器材' },
          { value: '不要摆件', label: '不要摆件/收藏品' },
          { value: '不要书籍', label: '不要书籍/阅读器' },
          { value: '不要化妆品', label: '不要化妆品/护肤品' },
        ],
      },
    ],
    allowFreeInput: true,
    freeInputPlaceholder: '其他不想收到的，或之前送过的礼物…',
    allowEmpty: true,
  },

  // === 第四阶段：补充信息 ===
  {
    id: 'additionalNotes',
    title: '还有什么想让AI知道的？',
    subtitle: '可选，任何额外信息都能帮助AI更好地推荐',
    type: 'textarea',
    placeholder: '例如：对方最近开始学摄影、这是我们一起过的第一个生日、他平时穿运动装比较多…',
    allowEmpty: true,
  },
];
