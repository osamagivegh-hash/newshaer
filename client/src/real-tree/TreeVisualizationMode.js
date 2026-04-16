export const TreeVisualizationMode = Object.freeze({
  PROGRESSIVE: 'PROGRESSIVE',
  ORGANIC: 'ORGANIC',
  REAL_TREE: 'REAL_TREE'
})

export const TREE_VISUALIZATION_MODE_META = {
  [TreeVisualizationMode.PROGRESSIVE]: {
    label: 'العرض التدريجي',
    shortLabel: 'التدريجي',
    route: '/family-tree-test',
    description: 'العرض المتدرج الحالي للأجيال والفروع.'
  },
  [TreeVisualizationMode.ORGANIC]: {
    label: 'العرض العضوي',
    shortLabel: 'العضوي',
    route: '/family-tree-organic-test',
    description: 'العرض العضوي الحالي للشجرة بصورة بصرية دائرية.'
  },
  [TreeVisualizationMode.REAL_TREE]: {
    label: 'Real Tree',
    shortLabel: 'الشجرة الحقيقية',
    route: '/family-tree-real-test',
    description: 'نمط جديد مستقل لكل فرع رئيسي بتوزيع شجري طبيعي.'
  }
}

export const TREE_VISUALIZATION_MODE_LIST = [
  TreeVisualizationMode.PROGRESSIVE,
  TreeVisualizationMode.ORGANIC,
  TreeVisualizationMode.REAL_TREE
]
