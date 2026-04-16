export const sampleFamilyTree = {
  id: 'root-ancestor',
  name: 'الجد المؤسس',
  parentId: null,
  children: [
    {
      id: 'branch-a',
      name: 'سالم',
      parentId: 'root-ancestor',
      children: [
        {
          id: 'branch-a-1',
          name: 'محمود',
          parentId: 'branch-a',
          children: [
            { id: 'branch-a-1-1', name: 'أحمد', parentId: 'branch-a-1', children: [] },
            { id: 'branch-a-1-2', name: 'ليث', parentId: 'branch-a-1', children: [] },
            { id: 'branch-a-1-3', name: 'نور', parentId: 'branch-a-1', children: [] }
          ]
        },
        {
          id: 'branch-a-2',
          name: 'خالد',
          parentId: 'branch-a',
          children: [
            { id: 'branch-a-2-1', name: 'يزن', parentId: 'branch-a-2', children: [] },
            { id: 'branch-a-2-2', name: 'راما', parentId: 'branch-a-2', children: [] }
          ]
        }
      ]
    },
    {
      id: 'branch-b',
      name: 'يوسف',
      parentId: 'root-ancestor',
      children: [
        {
          id: 'branch-b-1',
          name: 'ماهر',
          parentId: 'branch-b',
          children: [
            {
              id: 'branch-b-1-1',
              name: 'جمال',
              parentId: 'branch-b-1',
              children: [
                { id: 'branch-b-1-1-1', name: 'سيف', parentId: 'branch-b-1-1', children: [] },
                { id: 'branch-b-1-1-2', name: 'قيس', parentId: 'branch-b-1-1', children: [] }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'branch-c',
      name: 'إبراهيم',
      parentId: 'root-ancestor',
      children: [
        {
          id: 'branch-c-1',
          name: 'حسن',
          parentId: 'branch-c',
          children: [
            { id: 'branch-c-1-1', name: 'فارس', parentId: 'branch-c-1', children: [] },
            { id: 'branch-c-1-2', name: 'ميس', parentId: 'branch-c-1', children: [] },
            { id: 'branch-c-1-3', name: 'ديمة', parentId: 'branch-c-1', children: [] }
          ]
        },
        {
          id: 'branch-c-2',
          name: 'نادر',
          parentId: 'branch-c',
          children: [
            { id: 'branch-c-2-1', name: 'عمر', parentId: 'branch-c-2', children: [] }
          ]
        }
      ]
    }
  ]
}

export default sampleFamilyTree
